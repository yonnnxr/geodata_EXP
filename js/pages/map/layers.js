// Camadas – processamento e estilo das features do mapa
// TODO: remover dependências de variáveis globais quando o script legado for eliminado.

/* eslint-disable no-console */

// Se já existir um cache global reutilizamos, caso contrário criamos um novo
export const featuresCache = window.featuresCache ?? (window.featuresCache = new Map());

// ------------------------------ Helpers ------------------------------
export function formatDate(value) {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch (_) {
    return value;
  }
}

export function formatNumber(value, decimals = 2) {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Converte para 32-bits
  }
  return Math.abs(hash);
}

export function formatValue(key, value) {
  switch (key) {
    case 'ext':
      return `${formatNumber(value)} m`;
    case 'dia':
      return `${formatNumber(value, 0)} mm`;
    case 'consumo_medio':
      return `${formatNumber(value)} m³`;
    case 'data_ocorrencia':
      return value ? formatDate(value) : 'N/A';
    default:
      return value ?? 'N/A';
  }
}

export function isMobileDevice() {
  return window.innerWidth <= 768 ||
         navigator.maxTouchPoints > 0 ||
         navigator.msMaxTouchPoints > 0 ||
         /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function createFeaturePopup(feature, metadata) {
  const props = feature.properties;
  const layerType = metadata?.file_type ?? 'file';
  const config = window.LAYER_CONFIGS?.[layerType];

  if (!config) return '<div class="feature-popup">Informações não disponíveis</div>';

  let content = '<div class="feature-popup">';

  // Para economias/ocorrências, exibe se existir feature na mesma coordenada do outro tipo
  if (layerType === 'file-1' || layerType === 'file-2') {
    const coords = feature.geometry.coordinates;
    const otherType = layerType === 'file-1' ? 'file-2' : 'file-1';
    const otherLayer = window.layerGroups?.[otherType];
    let foundFeature = null;

    if (otherLayer) {
      otherLayer.eachLayer(l => {
        if (l.feature) {
          const c = l.feature.geometry.coordinates;
          if (c[0] === coords[0] && c[1] === coords[1]) foundFeature = l.feature;
        }
      });
    }

    const addSection = (f, sectionType) => {
      const conf = window.LAYER_CONFIGS?.[sectionType];
      if (!conf) return;
      content += `<div class="popup-section ${sectionType === 'file-1' ? 'economia' : 'ocorrencia'}">`;
      content += `<h4 class="popup-title ${sectionType}">${conf.title}</h4>`;

      if (localStorage.getItem('userCity') === 'global') {
        content += `<p class="locality"><strong>Localidade:</strong> ${f.properties.locality || 'Desconhecida'}</p>`;
      }

      if (sectionType === 'file-1' && typeof conf.formatAddress === 'function') {
        const address = conf.formatAddress(f.properties);
        if (address) content += `<p class="address"><strong>Endereço:</strong> ${address}</p>`;
      }

      conf.fields?.forEach(({ key, label }) => {
        if (['logradouro', 'numero', 'bairro', 'complemento'].includes(key) && sectionType === 'file-1') return;
        const val = f.properties[key];
        if (val !== undefined && val !== null && val !== '') {
          content += `<p class="field ${key}"><strong>${label}:</strong> ${formatValue(key, val)}</p>`;
        }
      });

      content += '</div>';
    };

    if (layerType === 'file-1') addSection(feature, 'file-1');
    if (layerType === 'file-2') addSection(feature, 'file-2');
    if (foundFeature && otherType === 'file-1') addSection(foundFeature, 'file-1');
    if (foundFeature && otherType === 'file-2') addSection(foundFeature, 'file-2');
  } else {
    // Rede de água
    content += `<h4 class="popup-title ${layerType}">${config.title}</h4>`;
    if (localStorage.getItem('userCity') === 'global') {
      content += `<p class="locality"><strong>Localidade:</strong> ${props.locality || 'Desconhecida'}</p>`;
    }
    config.fields?.forEach(({ key, label }) => {
      const val = props[key];
      if (val !== undefined && val !== null && val !== '') {
        content += `<p class="field ${key}"><strong>${label}:</strong> ${formatValue(key, val)}</p>`;
      }
    });
  }

  // Botões mobile
  if (isMobileDevice() && (layerType === 'file-1' || layerType === 'file-2')) {
    const [lng, lat] = feature.geometry.coordinates;
    content += `
      <div class="popup-actions">
        <button onclick="zoomToFeature(${lat}, ${lng})" class="popup-button">
          <i class="fas fa-search-plus"></i> Zoom
        </button>
      </div>`;
  }

  content += '</div>';
  return content;
}

// ------------------------------ Estilo ------------------------------
export function getFeatureStyle(feature, layerType) {
  const config = window.LAYER_CONFIGS?.[layerType];
  if (!config) return {};

  if (localStorage.getItem('userCity') === 'global') {
    const locality = feature.properties.locality || 'Desconhecida';
    const hash = hashString(locality);
    return {
      ...config.style,
      color: `#${hash.toString(16).substr(0, 6)}`
    };
  }
  return config.style;
}

// ------------------------------ Processamento ------------------------------
export async function processFeatures(features, layerType, metadata) {
  console.log(`processFeatures: ${features.length} features (${layerType})`);
  const config = window.LAYER_CONFIGS?.[layerType] ?? { style: { color: '#2196F3', weight: 2 } };

  try {
    const batchSize = layerType === 'file' ? 1_000_000 : (layerType === 'file-1' ? 50_000 : 200);
    const totalBatches = Math.ceil(features.length / batchSize);
    const allLayers = [];

    const createCircleMarker = (coords, color) => L.circleMarker([coords[1], coords[0]], {
      radius: 1.5,
      color,
      weight: 1,
      opacity: 0.6,
      fillOpacity: 0.4,
      fillColor: color
    });

    const loadingMessage = document.getElementById('loadingMessage');

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, features.length);
      const batch = features.slice(start, end);

      batch.forEach(feature => {
        try {
          let cacheKey;
          if (feature.geometry.type === 'Point') {
            const [lon, lat] = feature.geometry.coordinates;
            cacheKey = `${lon.toFixed(5)},${lat.toFixed(5)}`;
          } else {
            cacheKey = JSON.stringify(feature.geometry.coordinates[0]);
          }
          if (featuresCache.has(cacheKey)) return;

          let layer;
          if (feature.geometry.type === 'Point') {
            layer = createCircleMarker(feature.geometry.coordinates, config.style.color);
          } else if (feature.geometry.type === 'LineString') {
            layer = L.polyline(feature.geometry.coordinates.map(c => [c[1], c[0]]), { ...config.style, interactive: true });
          } else {
            console.warn('Geometria não suportada', feature.geometry.type);
            return;
          }

          layer.feature = feature;
          layer.on('click', function () {
            if (!this._popup) this.bindPopup(createFeaturePopup(feature, { file_type: layerType }));
            this.openPopup();
          });

          allLayers.push(layer);
          featuresCache.set(cacheKey, true);
        } catch (err) {
          console.error('Erro ao processar feature', err);
        }
      });

      if (loadingMessage) {
        const progress = ((batchIndex + 1) / totalBatches * 100).toFixed(1);
        loadingMessage.querySelector('span').textContent = `Carregando ${window.LAYER_CONFIGS?.[layerType]?.description ?? layerType}... ${progress}%`;
      }
    }

    const layerGroup = window.layerGroups?.[layerType];
    if (layerGroup) {
      const addBatchSize = (layerType === 'file') ? 5000 : (layerType === 'file-1' ? 5000 : allLayers.length);
      for (let i = 0; i < allLayers.length; i += addBatchSize) {
        const slice = allLayers.slice(i, i + addBatchSize);
        if (layerType === 'file') {
          const group = L.layerGroup(slice);
          layerGroup.addLayer(group);
        } else {
          layerGroup.addLayers(slice);
        }
        if (addBatchSize < allLayers.length) await new Promise(r => setTimeout(r, 10));
      }
      if (!window.map.hasLayer(layerGroup)) window.map.addLayer(layerGroup);
    }
  } catch (err) {
    console.error('processFeatures error:', err);
    throw err;
  }
}

// ------------------------------ Compatibilidade global ------------------------------
window.formatDate = window.formatDate || formatDate;
window.formatNumber = window.formatNumber || formatNumber;
window.formatValue = window.formatValue || formatValue;
window.getFeatureStyle = window.getFeatureStyle || getFeatureStyle;
window.processFeatures = window.processFeatures || processFeatures;

// ------------------------------ UI Helpers ------------------------------
export function clearHighlight() {
  if (window.highlightedLayer) {
    if (window.highlightedLayer.setStyle && window.highlightedLayer.originalStyle) {
      window.highlightedLayer.setStyle(window.highlightedLayer.originalStyle);
      window.highlightedLayer.originalStyle = null;
    }
    window.highlightedLayer = null;
  }
}

export function showError(message) {
  const container = document.createElement('div');
  container.className = 'error-message';
  container.innerHTML = `
    <div class="error-content">
      <i class="fas fa-exclamation-circle"></i>
      <div class="error-text">
        <p>Erro</p>
        <p class="error-details">${message}</p>
      </div>
      <button class="close-button" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>`;
  document.getElementById('map')?.appendChild(container);
  setTimeout(() => container.remove(), 10_000);
}

export function showStatus(message, type = 'info') {
  const container = document.createElement('div');
  container.className = `status-message ${type}`;
  container.innerHTML = `<span>${message}</span>`;
  document.getElementById('map')?.appendChild(container);
  setTimeout(() => container.remove(), 5_000);
}

export function showWarning(message) {
  const container = document.createElement('div');
  container.className = 'warning-message';
  container.innerHTML = `
    <div class="warning-content">
      <i class="fas fa-exclamation-triangle"></i>
      <div class="warning-text"><p>${message}</p></div>
      <button class="close-button" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>`;
  document.getElementById('map')?.appendChild(container);
  setTimeout(() => container.remove(), 10_000);
}

// Expor no escopo global
window.clearHighlight = window.clearHighlight || clearHighlight;
window.showError = window.showError || showError;
window.showWarning = window.showWarning || showWarning;
window.showStatus = window.showStatus || showStatus; 
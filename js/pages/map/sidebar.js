// sidebar.js – módulo responsável pelo painel lateral do mapa

import { showWarning, clearHighlight } from './layers.js';

/* eslint-disable no-console */

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatCityName(city) {
  return city.split('_').map(capitalize).join(' ');
}

function applyFilters() {
  const filterConsumo = document.getElementById('filterConsumo');
  const filterStatus = document.getElementById('filterStatus');
  const filterTipoOcorrencia = document.getElementById('filterTipoOcorrencia');
  const filterPrioridade = document.getElementById('filterPrioridade');

  const consumoValue = filterConsumo?.value;
  const statusValue = filterStatus?.value;
  const tipoOcorrenciaValue = filterTipoOcorrencia?.value;
  const prioridadeValue = filterPrioridade?.value;

  const economiasGroup = window.layerGroups?.['file-1'];
  const ocorrenciasGroup = window.layerGroups?.['file-2'];

  if (economiasGroup?.eachLayer) {
    economiasGroup.eachLayer(layer => {
      let visible = true;
      const props = layer.feature?.properties ?? {};
      if (consumoValue) {
        const consumo = parseFloat(props.consumo_medio || 0);
        if (consumoValue === '0' && consumo !== 0) visible = false;
        else if (consumoValue === '1-10' && (consumo < 1 || consumo > 10)) visible = false;
        else if (consumoValue === '11-20' && (consumo < 11 || consumo > 20)) visible = false;
        else if (consumoValue === '>20' && consumo <= 20) visible = false;
      }
      if (statusValue && props.status !== statusValue) visible = false;
      layer.setStyle?.({ opacity: visible ? 1 : 0, fillOpacity: visible ? 0.6 : 0 });
      layer.options.interactive = visible;
    });
  }

  if (ocorrenciasGroup?.eachLayer) {
    ocorrenciasGroup.eachLayer(layer => {
      let visible = true;
      const props = layer.feature?.properties ?? {};
      if (tipoOcorrenciaValue && props.tipo_ocorrencia !== tipoOcorrenciaValue) visible = false;
      if (prioridadeValue && props.prioridade !== prioridadeValue) visible = false;
      layer.setStyle?.({ opacity: visible ? 1 : 0, fillOpacity: visible ? 0.6 : 0 });
      layer.options.interactive = visible;
    });
  }
}

function searchMatricula() {
  const searchInput = document.getElementById('searchMatricula');
  const searchResults = document.getElementById('searchResults');
  const matricula = searchInput.value.trim();
  if (!matricula) {
    showWarning('Digite uma matrícula para buscar');
    return;
  }
  (async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userCity = localStorage.getItem('userCity')?.toLowerCase();
      if (!token || !userCity) throw new Error('Dados de autenticação incompletos');

      const resp = await window.fetchWithRetry(`${window.API_BASE_URL}/api/geodata/${userCity}/search?matricula=${matricula}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!resp.ok) throw new Error(`Erro na busca: ${resp.status}`);
      const data = await resp.json();
      if (!data?.features?.length) {
        searchResults.innerHTML = '<p class="no-results">Nenhum resultado encontrado</p>';
        return;
      }
      searchResults.innerHTML = data.features.map(f => `
        <div class="search-result" data-lat="${f.geometry.coordinates[1]}" data-lng="${f.geometry.coordinates[0]}">
          <i class="fas fa-map-marker-alt"></i>
          <div class="result-info"><strong>Matrícula: ${f.properties.matricula}</strong><small>${f.properties.endereco || ''}</small></div>
        </div>`).join('');
      // adiciona listeners
      searchResults.querySelectorAll('.search-result').forEach(el => {
        el.addEventListener('click', () => {
          const lat = parseFloat(el.dataset.lat);
          const lng = parseFloat(el.dataset.lng);
          window.zoomToFeature?.(lat, lng);
        });
      });
      const first = data.features[0];
      window.zoomToFeature?.(first.geometry.coordinates[1], first.geometry.coordinates[0]);
    } catch (err) {
      console.error(err);
      showWarning(err.message);
    }
  })();
}

function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const closeBtn = document.getElementById('close-btn');
  if (!sidebar || !menuToggle || !closeBtn) return;

  const userCity = localStorage.getItem('userCity');
  if (userCity) sidebar.querySelector('h2').textContent = `Controle de Camadas - ${formatCityName(userCity)}`;

  const openSidebar = () => { sidebar.classList.add('active'); menuToggle.style.display = 'none'; };
  const closeSidebar = () => { sidebar.classList.remove('active'); menuToggle.style.display = 'block'; };

  menuToggle.addEventListener('click', e => { e.preventDefault(); openSidebar(); });
  closeBtn.addEventListener('click', e => { e.preventDefault(); closeSidebar(); });
  document.addEventListener('click', e => { if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && sidebar.classList.contains('active')) closeSidebar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sidebar.classList.contains('active')) closeSidebar(); });
  window.addEventListener('resize', () => { if (window.innerWidth <= 768) closeSidebar(); });

  // Toggles de camadas
  const toggleRedes = document.getElementById('toggleRedes');
  const toggleEconomias = document.getElementById('toggleEconomias');
  const toggleOcorrencias = document.getElementById('toggleOcorrencias');
  
  toggleRedes?.addEventListener('change', e => { 
    const g = window.layerGroups?.['file']; 
    console.log('Toggle Redes:', e.target.checked, 'LayerGroup:', g);
    if (g) {
      if (e.target.checked) {
        window.map.addLayer(g);
        console.log('Rede adicionada ao mapa');
      } else {
        window.map.removeLayer(g);
        console.log('Rede removida do mapa');
      }
    }
  });
  
  toggleEconomias?.addEventListener('change', e => { 
    const g = window.layerGroups?.['file-1']; 
    console.log('Toggle Economias:', e.target.checked, 'LayerGroup:', g, 'Layers count:', g?._layers ? Object.keys(g._layers).length : 0);
    if (g) {
      if (e.target.checked) {
        window.map.addLayer(g);
        console.log('Economias adicionadas ao mapa');
      } else {
        window.map.removeLayer(g);
        console.log('Economias removidas do mapa');
      }
    }
  });
  
  toggleOcorrencias?.addEventListener('change', e => { 
    const g = window.layerGroups?.['file-2']; 
    console.log('Toggle Ocorrências:', e.target.checked, 'LayerGroup:', g);
    if (g) {
      if (e.target.checked) {
        window.map.addLayer(g);
        console.log('Ocorrências adicionadas ao mapa');
      } else {
        window.map.removeLayer(g);
        console.log('Ocorrências removidas do mapa');
      }
    }
  });

  // Filtros
  ['filterConsumo','filterStatus','filterTipoOcorrencia','filterPrioridade'].forEach(id => document.getElementById(id)?.addEventListener('change', applyFilters));

  // Busca matrícula
  const searchInput = document.getElementById('searchMatricula');
  searchInput?.addEventListener('keypress', e => { if (e.key === 'Enter') searchMatricula(); });
  window.searchMatricula = searchMatricula; // compatibilidade global
}

document.addEventListener('DOMContentLoaded', () => {
  // Aguarda mapa criado
  const interval = setInterval(() => {
    if (window.map && window.layerGroups) {
      clearInterval(interval);
      setupSidebar();
    }
  }, 100);
}); 
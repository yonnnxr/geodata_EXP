window.map = null;
window.layers = {
    'file': null,      // Rede de Distribuição
    'file-1': null,    // Economias Zero
    'file-2': null     // Ocorrências
};
window.markerClusters = {
    'file': null,
    'file-1': null,
    'file-2': null
};
let dadosCarregados = false;
const API_BASE_URL = 'https://api-geodata-exp.onrender.com';
const BATCH_SIZE = 1000; // Aumentado para melhor performance
let featuresCache = new Map();

console.log('API URL configurada:', API_BASE_URL);

// Função para inicializar o mapa
async function initMap() {
    window.map = L.map('map').setView([-20.4697, -54.6201], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(window.map);

    // Inicializa clusters para cada camada
    Object.keys(window.layers).forEach(layerType => {
        window.markerClusters[layerType] = L.markerClusterGroup({
            chunkedLoading: true,
            chunkInterval: 100,
            chunkDelay: 50,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            removeOutsideVisibleBounds: true
        });
        window.map.addLayer(window.markerClusters[layerType]);
    });

    await loadMapData();
}

// Função para estilizar as features
function getFeatureStyle(feature, layerType) {
    const styles = {
        'file': {
            color: '#3388ff',
            weight: 2,
            opacity: 0.7
        },
        'file-1': {
            color: '#ff3333',
            weight: 2,
            opacity: 0.7
        },
        'file-2': {
            color: '#33ff33',
            weight: 2,
            opacity: 0.7
        }
    };

    if (localStorage.getItem('userCity') === 'global') {
        const locality = feature.properties.locality || 'Desconhecida';
        const hash = hashString(locality);
        return {
            ...styles[layerType],
            color: `#${hash.toString(16).substr(0, 6)}`
        };
    }

    return styles[layerType] || styles['file'];
}

// Função para gerar hash de string para cores
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// Função para criar popup com informações da feature
function createFeaturePopup(feature, metadata) {
    const props = feature.properties;
    let content = '<div class="feature-popup">';
    
    // Adiciona informação da localidade se for visualização global
    if (localStorage.getItem('userCity') === 'global') {
        content += `<p><strong>Localidade:</strong> ${props.locality || 'Desconhecida'}</p>`;
    }
    
    content += `
        <p><strong>Tipo:</strong> ${props.tipo || 'Não especificado'}</p>
        <p><strong>Material:</strong> ${props.mat || 'Não especificado'}</p>
        <p><strong>Diâmetro:</strong> ${props.dia || 'Não especificado'} mm</p>
        <p><strong>Extensão:</strong> ${props.ext || 'Não especificada'} m</p>
        <p><strong>Status:</strong> ${props.status || 'Não especificado'}</p>
    </div>`;
    
    return content;
}

async function loadMapData() {
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity');
    
    if (!token || !userCity) {
        handleAuthError();
        return;
    }

    const loadingMessage = document.getElementById('loadingMessage');
    loadingMessage.style.display = 'flex';

    try {
        const layersResponse = await fetch(`${API_BASE_URL}/api/geodata/${userCity}/layers`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!layersResponse.ok) throw new Error('Erro ao carregar informações das camadas');

        const layersData = await layersResponse.json();
        console.log('Camadas disponíveis:', layersData);

        // Limpa clusters existentes
        Object.values(window.markerClusters).forEach(cluster => {
            if (cluster) cluster.clearLayers();
        });

        // Carrega cada camada em lotes
        for (const layer of layersData.layers) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/geodata/${userCity}/map?type=${layer.type}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    console.error(`Erro ao carregar camada ${layer.type}`);
                    continue;
                }

                const data = await response.json();
                if (data?.features?.length > 0) {
                    await processFeatures(data.features, layer.type, data.metadata);
                    updateLayerControl(layer.type, data.metadata.description);
                }
            } catch (error) {
                console.error(`Erro ao carregar camada ${layer.type}:`, error);
            }
        }

        fitMapToBounds();
        dadosCarregados = true;
        loadingMessage.style.display = 'none';

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        loadingMessage.style.display = 'none';
        showError(error.message);
    }
}

async function processFeatures(features, layerType, metadata) {
    const cluster = window.markerClusters[layerType];
    const total = features.length;
    let processed = 0;

    while (processed < total) {
        const batch = features.slice(processed, processed + BATCH_SIZE);
        const layers = batch.map(feature => {
            const layer = L.geoJSON(feature, {
                style: () => getFeatureStyle(feature, layerType),
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(createFeaturePopup(feature, metadata));
                }
            });
            return layer;
        });

        cluster.addLayers(layers);
        processed += batch.length;

        // Permite que a UI responda entre os lotes
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    window.layers[layerType] = cluster;
}

function updateLayerControl(layerType, description) {
    const layerControl = document.getElementById('layerControl');
    if (!layerControl) return;

    const existingToggle = document.getElementById(`toggle-${layerType}`);
    if (existingToggle) return;

    const div = document.createElement('div');
    div.className = 'layer-toggle';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `toggle-${layerType}`;
    checkbox.checked = true;

    const label = document.createElement('label');
    label.htmlFor = `toggle-${layerType}`;
    label.textContent = description;

    div.appendChild(checkbox);
    div.appendChild(label);
    layerControl.appendChild(div);

    checkbox.addEventListener('change', (e) => {
        const cluster = window.markerClusters[layerType];
        if (cluster) {
            if (e.target.checked) {
                window.map.addLayer(cluster);
            } else {
                window.map.removeLayer(cluster);
            }
        }
    });
}

function fitMapToBounds() {
    const bounds = [];
    Object.values(window.markerClusters).forEach(cluster => {
        if (cluster && cluster.getBounds().isValid()) {
            bounds.push(cluster.getBounds());
        }
    });

    if (bounds.length > 0) {
        const fullBounds = bounds[0];
        bounds.slice(1).forEach(b => fullBounds.extend(b));
        window.map.fitBounds(fullBounds);
    }
}

function handleAuthError() {
    console.error('Erro de autenticação');
    window.location.href = 'Login.html';
}

// Função para atualizar estatísticas
function updateStatistics(stats) {
    const statsContainer = document.getElementById('mapStats');
    if (!statsContainer) return;

    let html = '<h3>Estatísticas</h3>';
    html += `<p>Total de elementos: ${stats.total_features}</p>`;
    html += `<p>Extensão total: ${stats.total_length.toFixed(2)} m</p>`;

    if (stats.by_type) {
        html += '<h4>Por Tipo</h4><ul>';
        Object.entries(stats.by_type).forEach(([type, count]) => {
            html += `<li>${type}: ${count}</li>`;
        });
        html += '</ul>';
    }

    if (stats.by_material) {
        html += '<h4>Por Material</h4><ul>';
        Object.entries(stats.by_material).forEach(([material, count]) => {
            html += `<li>${material}: ${count}</li>`;
        });
        html += '</ul>';
    }

    statsContainer.innerHTML = html;
}

// Função para mostrar mensagens de erro
function showError(message) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>Não foi possível carregar os dados do mapa.</p>
        <p>${message}</p>
        <button onclick="loadMapData()">Tentar Novamente</button>
    `;
    document.getElementById('map').appendChild(errorMessage);
}

// Inicializa o mapa quando a página carregar
document.addEventListener('DOMContentLoaded', initMap);

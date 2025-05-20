window.map = null;
window.layers = {
    'file': null,      // Rede de Distribuição
    'file-1': null,    // Economias Zero
    'file-2': null     // Ocorrências
};
let dadosCarregados = false;
const API_BASE_URL = 'https://api-geodata-exp.onrender.com';
const BATCH_SIZE = 100; // Número de features a serem processadas por vez
let featuresCache = new Map(); // Cache para features já processadas

console.log('API URL configurada:', API_BASE_URL);

// Função para inicializar o mapa
async function initMap() {
    // Configuração inicial do mapa
    window.map = L.map('map').setView([-20.4697, -54.6201], 12);

    // Adiciona camada base do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(window.map);

    // Carrega dados do mapa
    await loadMapData();
}

// Função para estilizar as features
function getFeatureStyle(feature, layerType) {
    const defaultStyle = {
        color: '#3388ff',
        weight: 3,
        opacity: 0.8
    };

    // Estilos específicos por tipo de camada
    const styles = {
        'file': {
            color: '#3388ff',
            weight: 3,
            opacity: 0.8
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

    // Se for visualização global, usa cores diferentes para cada localidade
    if (localStorage.getItem('userCity') === 'global') {
        const locality = feature.properties.locality || 'Desconhecida';
        const hash = hashString(locality);
        return {
            ...defaultStyle,
            color: `#${hash.toString(16).substr(0, 6)}`
        };
    }

    return styles[layerType] || defaultStyle;
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
    
    if (!token) {
        console.error('Token não encontrado');
        window.location.href = 'Login.html';
        return;
    }

    if (!userCity) {
        console.error('Cidade não definida');
        showError('É necessário definir uma cidade válida. Por favor, faça login novamente.');
        setTimeout(() => {
            window.location.href = 'Login.html';
        }, 3000);
        return;
    }

    const loadingMessage = document.getElementById('loadingMessage');
    loadingMessage.style.display = 'flex';

    try {
        // Primeiro, carrega as camadas disponíveis
        const layersResponse = await fetch(`${API_BASE_URL}/api/geodata/${userCity}/layers`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!layersResponse.ok) {
            throw new Error('Erro ao carregar informações das camadas');
        }

        const layersData = await layersResponse.json();
        console.log('Camadas disponíveis:', layersData);

        // Carrega cada camada disponível
        for (const layer of layersData.layers) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/geodata/${userCity}/map?type=${layer.type}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    console.error(`Erro ao carregar camada ${layer.type}`);
                    continue;
                }

                const data = await response.json();
                if (data && data.features && Array.isArray(data.features)) {
                    // Cria camada GeoJSON
                    const geoJsonLayer = L.geoJSON(data.features, {
                        style: (feature) => getFeatureStyle(feature, layer.type),
                        onEachFeature: (feature, layer) => {
                            layer.bindPopup(createFeaturePopup(feature, data.metadata));
                        }
                    });

                    // Adiciona ao mapa e armazena a referência
                    window.layers[layer.type] = geoJsonLayer;
                    geoJsonLayer.addTo(window.map);

                    // Atualiza o controle de camadas
                    updateLayerControl(layer.type, data.metadata.description);
                }
            } catch (error) {
                console.error(`Erro ao carregar camada ${layer.type}:`, error);
            }
        }

        // Ajusta a visualização para mostrar todas as features
        const allLayers = Object.values(window.layers).filter(layer => layer !== null);
        if (allLayers.length > 0) {
            const group = L.featureGroup(allLayers);
            window.map.fitBounds(group.getBounds());
        }

        dadosCarregados = true;
        loadingMessage.style.display = 'none';

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        loadingMessage.style.display = 'none';
        showError(error.message);
    }
}

function updateLayerControl(layerType, description) {
    const layerControl = document.getElementById('layerControl');
    if (!layerControl) return;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `toggle-${layerType}`;
    checkbox.checked = true;

    const label = document.createElement('label');
    label.htmlFor = `toggle-${layerType}`;
    label.textContent = description;

    const div = document.createElement('div');
    div.className = 'layer-toggle';
    div.appendChild(checkbox);
    div.appendChild(label);

    layerControl.appendChild(div);

    checkbox.addEventListener('change', (e) => {
        const layer = window.layers[layerType];
        if (layer) {
            if (e.target.checked) {
                window.map.addLayer(layer);
            } else {
                window.map.removeLayer(layer);
            }
        }
    });
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

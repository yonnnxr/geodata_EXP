// Variáveis globais
let map, redesLayer;
let dadosCarregados = false;
const API_BASE_URL = 'https://api-geodata-exp.onrender.com';

// Inicialização do mapa com opções responsivas
function initializeMap() {
    map = L.map('map', {
        zoomControl: false,  // Vamos reposicionar os controles de zoom
        minZoom: 10,
        maxZoom: 19
    });

    // Adicionar controle de zoom em uma posição personalizada
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Camada base OpenStreetMap
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        className: 'map-tiles'
    }).addTo(map);

    // Camada de satélite do Google
    const satelliteLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // Camada híbrida do Google
    const hybridLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // Controle de camadas
    const baseLayers = {
        "OpenStreetMap": osmLayer,
        "Satélite": satelliteLayer,
        "Híbrido": hybridLayer
    };

    L.control.layers(baseLayers, null, {
        position: 'topright'
    }).addTo(map);

    // Criar camada para as redes
    redesLayer = L.layerGroup().addTo(map);

    // Centralizar inicialmente em uma posição padrão
    map.setView([-20.4695, -54.6052], 13);

    return map;
}

// Sistema de notificações
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

// Função para formatar distância
function formatDistance(meters) {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(2)} m`;
}

// Estilo das redes
function getFeatureStyle(feature) {
    return {
        color: feature.properties?.tipo === 'agua' ? '#2196F3' : '#FF5252',
        weight: 3,
        opacity: 0.8
    };
}

// Carregar dados da API
async function loadMapData() {
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity');
    
    if (!token || !userCity) {
        window.location.href = 'Login.html';
        return;
    }

    const loadingMessage = document.getElementById('loadingMessage');
    loadingMessage.style.display = 'flex';

    try {
        const response = await fetch(`${API_BASE_URL}/geodata/${userCity}/map`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar dados do mapa');
        }

        const data = await response.json();

        if (!data.features || !Array.isArray(data.features)) {
            throw new Error('Dados inválidos recebidos da API');
        }

        // Limpar camada existente
        redesLayer.clearLayers();

        // Adicionar features ao mapa
        data.features.forEach(feature => {
            if (!feature.geometry) return;

            const geojsonLayer = L.geoJSON(feature, {
                style: getFeatureStyle,
                onEachFeature: (feature, layer) => {
                    // Popup personalizado
                    const popupContent = `
                        <div class="popup-content">
                            <h3>${feature.properties?.nome || 'Rede'}</h3>
                            <p>Tipo: ${feature.properties?.tipo || 'Não especificado'}</p>
                            ${feature.properties?.length ? `<p>Extensão: ${formatDistance(feature.properties.length)}</p>` : ''}
                            <div class="popup-actions">
                                <button class="popup-button" onclick="showStreetView(${feature.geometry.coordinates[0][1]}, ${feature.geometry.coordinates[0][0]})">
                                    Street View
                                </button>
                            </div>
                        </div>
                    `;
                    layer.bindPopup(popupContent);
                }
            }).addTo(redesLayer);
        });

        // Ajustar visualização para os dados
        const bounds = redesLayer.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds);
        }

        dadosCarregados = true;

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showError('Erro ao carregar dados do mapa. Por favor, tente novamente.');
    } finally {
        loadingMessage.style.display = 'none';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity');

    if (!token || !userCity) {
        window.location.href = 'Login.html';
        return;
    }

    // Inicializar mapa
    initializeMap();

    // Toggle da camada de redes
    document.getElementById('toggleRedes').addEventListener('change', (e) => {
        if (e.target.checked) {
            map.addLayer(redesLayer);
        } else {
            map.removeLayer(redesLayer);
        }
    });

    // Carregar dados iniciais
    await loadMapData();

    // Recarregar dados quando o mapa ficar visível novamente
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && dadosCarregados) {
            loadMapData();
        }
    });
});

// Variáveis globais
window.map = null;
window.redesLayer = null;
let dadosCarregados = false;
const API_BASE_URL = 'https://api-geodata-exp.onrender.com';

// Debug log for API URL
console.log('API URL configurada:', API_BASE_URL);

// Inicialização do mapa com opções responsivas
function initializeMap() {
    if (window.map) {
        return window.map; // Retorna o mapa existente se já estiver inicializado
    }

    try {
        window.map = L.map('map', {
            zoomControl: false,  // Vamos reposicionar os controles de zoom
            minZoom: 10,
            maxZoom: 19
        });

        // Adicionar controle de zoom em uma posição personalizada
        L.control.zoom({
            position: 'topright'
        }).addTo(window.map);

        // Camada base OpenStreetMap
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            className: 'map-tiles'
        }).addTo(window.map);

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
        }).addTo(window.map);

        // Criar camada para as redes
        window.redesLayer = L.layerGroup().addTo(window.map);

        // Centralizar inicialmente em uma posição padrão
        // Get city coordinates based on stored city
        const cityCoordinates = getCityCoordinates(localStorage.getItem('userCity'));
        window.map.setView(cityCoordinates, 13);

        console.log('Mapa inicializado com sucesso');
        return window.map;
    } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
        showError('Erro ao inicializar o mapa');
        return null;
    }
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
        console.log('Iniciando requisição para:', `${API_BASE_URL}/geodata/${userCity}/map`);
        const response = await fetch(`${API_BASE_URL}/geodata/${userCity}/map`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Erro na resposta da API:', errorData);
            throw new Error(errorData.message || 'Erro ao carregar dados do mapa');
        }

        const data = await response.json();
        console.log('Dados recebidos da API:', data);

        if (!data.features || !Array.isArray(data.features)) {
            console.error('Estrutura de dados inválida:', data);
            throw new Error('Dados inválidos recebidos da API');
        }

        // Limpar camada existente
        window.redesLayer.clearLayers();
        console.log('Número de features recebidas:', data.features.length);

        // Adicionar features ao mapa
        data.features.forEach((feature, index) => {
            if (!feature.geometry) {
                console.warn(`Feature ${index} sem geometria:`, feature);
                return;
            }

            try {
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
                }).addTo(window.redesLayer);
                console.log(`Feature ${index} adicionada com sucesso`);
            } catch (featureError) {
                console.error(`Erro ao adicionar feature ${index}:`, featureError);
            }
        });

        // Ajustar visualização para os dados
        const bounds = window.redesLayer.getBounds();
        if (bounds.isValid()) {
            window.map.fitBounds(bounds);
            console.log('Mapa ajustado para os limites das redes');
        } else {
            console.warn('Não foi possível calcular os limites das redes');
        }

        dadosCarregados = true;
        console.log('Carregamento de dados concluído com sucesso');

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showError('Erro ao carregar dados do mapa. Por favor, tente novamente.');
    } finally {
        loadingMessage.style.display = 'none';
    }
}

// Função auxiliar para debug do GeoJSON
function validateGeoJSON(feature) {
    if (!feature.type) {
        console.error('Feature sem tipo:', feature);
        return false;
    }
    if (!feature.geometry) {
        console.error('Feature sem geometria:', feature);
        return false;
    }
    if (!feature.geometry.coordinates || !Array.isArray(feature.geometry.coordinates)) {
        console.error('Feature com coordenadas inválidas:', feature);
        return false;
    }
    return true;
}

// Verificar token diretamente
function isValidToken() {
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity');

    if (!token || !userCity) {
        console.error('Token ou cidade não encontrados');
        return false;
    }

    // Verificar se o token está no formato JWT válido
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
        console.error('Formato de token inválido');
        return false;
    }

    try {
        // Verificar expiração do token
        const payload = JSON.parse(atob(tokenParts[1]));
        const expirationTime = payload.exp * 1000; // Converter para milissegundos
        if (Date.now() >= expirationTime) {
            console.error('Token expirado');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Erro ao validar token:', error);
        return false;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar autenticação localmente
        if (!isValidToken()) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userCity');
            window.location.href = 'Login.html';
            return;
        }

        // Inicializar mapa
        const mapInstance = initializeMap();
        if (!mapInstance) {
            throw new Error('Falha ao inicializar o mapa');
        }

        // Toggle da camada de redes
        const toggleRedes = document.getElementById('toggleRedes');
        if (toggleRedes) {
            toggleRedes.addEventListener('change', (e) => {
                if (window.map && window.redesLayer) {
                    if (e.target.checked) {
                        window.map.addLayer(window.redesLayer);
                    } else {
                        window.map.removeLayer(window.redesLayer);
                    }
                }
            });
        }

        // Carregar dados iniciais
        await loadMapData();

        // Recarregar dados quando o mapa ficar visível novamente
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && dadosCarregados) {
                loadMapData();
            }
        });
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar o mapa. Por favor, recarregue a página.');
    }
});

// Add this function to get city coordinates
function getCityCoordinates(city) {
    const coordinates = {
        'dourados': [-22.2234, -54.8064],
        'tres_lagoas': [-20.7516, -51.6795],
        'coxim': [-18.5013, -54.7603],
        'jardim': [-21.4799, -56.1489],
        'navirai': [-23.0616, -54.1995],
        'ponta_pora': [-22.5361, -55.7256],
        'nova_andradina': [-22.2333, -53.3437],
        'paranaiba': [-19.6746, -51.1909],
        'aquidauana': [-20.4666, -55.7868],
        'corumba': [-19.0077, -57.6511]
    };
    return coordinates[city] || [-20.4695, -54.6052]; // Default to Campo Grande if city not found

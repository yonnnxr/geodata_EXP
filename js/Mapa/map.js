window.map = null;
window.redesLayer = null;
let dadosCarregados = false;
const API_BASE_URL = 'https://api-geodata-exp.onrender.com';
const BATCH_SIZE = 100; // Número de features a serem processadas por vez
let featuresCache = new Map(); // Cache para features já processadas

console.log('API URL configurada:', API_BASE_URL);

// Função para verificar autenticação
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity');
    const userType = localStorage.getItem('userType');

    console.log('Verificando autenticação:', {
        token: token ? 'presente' : 'ausente',
        userCity,
        userType
    });

    if (!token || !userCity) {
        console.error('Dados de autenticação incompletos');
        window.location.href = 'Login.html';
        return false;
    }

    return true;
}

function initializeMap() {
    if (!checkAuth()) return null;

    if (window.map) {
        return window.map;
    }

    try {
        window.map = L.map('map', {
            zoomControl: false,
            maxZoom: 19,
            preferCanvas: true // Usar Canvas renderer para melhor performance
        });

        L.control.zoom({
            position: 'topright'
        }).addTo(window.map);

        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            className: 'map-tiles'
        }).addTo(window.map);

        const satelliteLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={y}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });

        const hybridLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });

        const baseLayers = {
            "OpenStreetMap": osmLayer,
            "Satélite": satelliteLayer,
            "Híbrido": hybridLayer
        };

        L.control.layers(baseLayers, null, {
            position: 'topright'
        }).addTo(window.map);

        window.redesLayer = L.layerGroup().addTo(window.map);

        const userCity = localStorage.getItem('userCity');
        const cityCoordinates = getCityCoordinates(userCity);
        window.map.setView(cityCoordinates, 13);

        // Otimizar eventos de zoom/pan
        window.map.on('zoomstart movestart', () => {
            window.map.getPane('overlayPane').style.display = 'none';
        });

        window.map.on('zoomend moveend', () => {
            window.map.getPane('overlayPane').style.display = 'block';
        });

        console.log('Mapa inicializado para cidade:', userCity);
        return window.map;
    } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
        showError('Erro ao inicializar o mapa');
        return null;
    }
}

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

function formatDistance(meters) {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(2)} m`;
}

function getFeatureStyle(feature) {
    return {
        color: feature.properties?.tipo === 'agua' ? '#2196F3' : '#FF5252',
        weight: 3,
        opacity: 0.8
    };
}

async function loadMapData() {
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity');
    const userType = localStorage.getItem('userType');

    console.log('Dados do usuário para carregamento do mapa:', {
        token: token ? 'presente' : 'ausente',
        userCity,
        userType
    });

    if (!token) {
        console.error('Token não encontrado');
        window.location.href = 'Login.html';
        return;
    }

    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.style.display = 'flex';
    }

    try {
        // Para admin, primeiro carrega a lista de cidades se não houver cidade específica
        let url;
        if ((userType === 'admin' || userType === 'admin_central') && !userCity) {
            url = `${API_BASE_URL}/api/geodata/list`;
        } else {
            if (!userCity) {
                throw new Error('Cidade não definida');
            }
            url = `${API_BASE_URL}/api/geodata/${userCity}/map`;
        }

        console.log('Iniciando requisição para:', url);
        console.log('Headers:', {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': window.location.origin
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Erro na resposta da API:', {
                status: response.status,
                statusText: response.statusText,
                errorData
            });
            
            if (response.status === 401) {
                console.error('Token expirado ou inválido');
                localStorage.clear();
                window.location.href = 'Login.html';
                return;
            }
            
            throw new Error(errorData.message || `Erro ao carregar dados do mapa`);
        }

        const data = await response.json();
        console.log('Dados recebidos:', {
            type: data.type,
            featuresCount: data.features?.length || data.cities?.length || 0
        });

        // Se for lista de cidades para admin
        if (data.type === 'CityList') {
            await handleCityList(data.cities);
            return;
        }

        // Se for dados do mapa
        if (!data.features || !Array.isArray(data.features)) {
            console.error('Estrutura de dados inválida:', data);
            throw new Error('Dados inválidos recebidos da API');
        }

        window.redesLayer.clearLayers();
        console.log('Número de features recebidas:', data.features.length);

        if (data.features.length === 0) {
            console.warn('Nenhuma feature encontrada para esta cidade');
            showError('Nenhum dado encontrado para esta cidade');
        } else {
            await processFeatures(data.features, 0);
        }

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showError('Erro ao carregar dados do mapa. Por favor, tente novamente.');
    } finally {
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
    }
}

// Função auxiliar para processar features em lotes
async function processFeatures(features, startIndex) {
    const batch = features.slice(startIndex, startIndex + BATCH_SIZE);
    if (batch.length === 0) return;

    const validFeatures = batch.filter(feature => feature.geometry);
    const featureGroup = L.featureGroup();

    validFeatures.forEach((feature, index) => {
        try {
            const geojsonLayer = L.geoJSON(feature, {
                style: getFeatureStyle,
                onEachFeature: (feature, layer) => {
                    layer.on('click', () => {
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
                        layer.bindPopup(popupContent).openPopup();
                    });
                }
            });
            featureGroup.addLayer(geojsonLayer);
        } catch (featureError) {
            console.error(`Erro ao adicionar feature ${startIndex + index}:`, featureError);
        }
    });

    window.redesLayer.addLayer(featureGroup);

    // Processar próximo lote
    if (startIndex + BATCH_SIZE < features.length) {
        setTimeout(() => processFeatures(features, startIndex + BATCH_SIZE), 0);
    } else {
        // Ajustar visualização após processar todas as features
        const bounds = window.redesLayer.getBounds();
        if (bounds.isValid()) {
            window.map.fitBounds(bounds);
        } else {
            const userCity = localStorage.getItem('userCity');
            const cityCoordinates = getCityCoordinates(userCity);
            window.map.setView(cityCoordinates, 13);
        }
        dadosCarregados = true;
    }
}

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

function isValidToken() {
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity');

    if (!token || !userCity) {
        console.error('Token ou cidade não encontrados');
        return false;
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
        console.error('Formato de token inválido');
        return false;
    }

    try {
        const payload = JSON.parse(atob(tokenParts[1]));
        const expirationTime = payload.exp * 1000;
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
    return coordinates[city] || [-20.4695, -54.6052];
}

// Função para lidar com a lista de cidades (para admin)
async function handleCityList(cities) {
    // Limpar camadas existentes
    window.redesLayer.clearLayers();

    // Criar marcadores para cada cidade
    cities.forEach(city => {
        const marker = L.marker(city.coordinates, {
            title: city.name
        }).bindPopup(`
            <div class="city-popup">
                <h3>${city.name}</h3>
                <p>Estado: ${city.state}</p>
                <button onclick="loadCityData('${city.id}')" class="btn-load-city">
                    Carregar Dados
                </button>
            </div>
        `);
        window.redesLayer.addLayer(marker);
    });

    // Ajustar visualização para mostrar todas as cidades
    const bounds = window.redesLayer.getBounds();
    if (bounds.isValid()) {
        window.map.fitBounds(bounds);
    }
}

// Função para carregar dados de uma cidade específica
async function loadCityData(cityId) {
    localStorage.setItem('selectedCity', cityId);
    await loadMapData();
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isValidToken()) {
        window.location.href = 'Login.html';
        return;
    }

    const map = initializeMap();
    if (map) {
        loadMapData();
    }
});

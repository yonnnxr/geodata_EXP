// Inicialização do mapa com opções responsivas
const map = L.map('map', {
    zoomControl: false,  // Vamos reposicionar os controles de zoom
    attributionControl: false  // Vamos reposicionar os créditos
}).setView([-20.4695, -54.6052], 13); // Definindo uma visualização inicial padrão

console.log('Mapa inicializado:', map);

// Adiciona controles de zoom em uma posição melhor para mobile
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// Adiciona atribuição em uma posição melhor para mobile
L.control.attribution({
    position: 'bottomleft'
}).addTo(map);

// Camadas base com melhor contraste
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
    className: 'map-tiles'  // Para estilização CSS
}).addTo(map);

console.log('Camada OSM adicionada:', osmLayer);

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri',
    maxZoom: 19,
    className: 'map-tiles'
});

const googleHybridLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    attribution: '© Google',
    maxZoom: 19,
    className: 'map-tiles'
});

// Controle de camadas com posição otimizada
const layerControl = L.control.layers({
    "OpenStreetMap": osmLayer,
    "Satélite": satelliteLayer,
    "Google Hybrid": googleHybridLayer
}, null, {
    position: 'topright',
    collapsed: true
}).addTo(map);

let redesLayer;
const API_BASE_URL = 'https://api-geodata-exp.onrender.com';

// Sistema de notificações melhorado
const notifications = {
    show: function(message, type = 'info') {
        const messageBox = document.getElementById('message-box');
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`;
        messageBox.style.display = 'block';
        
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, 3000);
    },
    error: function(message) {
        this.show(message, 'error');
    },
    success: function(message) {
        this.show(message, 'success');
    }
};

// Estilo das redes com melhor visibilidade
function getFeatureStyle(feature) {
    const defaultStyle = {
        weight: 3,
        opacity: 0.8,
        color: '#3388ff',
        dashArray: null
    };

    if (!feature.properties) return defaultStyle;

    switch (feature.properties.tipo?.toLowerCase()) {
        case 'agua':
            return {
                color: '#2196F3',
                weight: 4,
                opacity: 0.8,
                dashArray: null,
                lineCap: 'round',
                lineJoin: 'round'
            };
        default:
            return {
                ...defaultStyle,
                color: '#FF5252'
            };
    }
}

// Validação de GeoJSON melhorada
function isValidGeoJSON(data) {
    try {
        // Verificações básicas
        if (!data || typeof data !== 'object') {
            console.error('GeoJSON inválido: dados vazios ou não é um objeto', data);
            return false;
        }

        // Verifica o tipo principal
        if (!data.type) {
            console.error('GeoJSON inválido: propriedade type não encontrada', data);
            return false;
        }

        // Verifica se é uma FeatureCollection
        if (data.type === 'FeatureCollection') {
            if (!data.features) {
                console.error('GeoJSON inválido: FeatureCollection sem propriedade features', data);
                return false;
            }
            
            if (!Array.isArray(data.features)) {
                console.error('GeoJSON inválido: features não é um array', typeof data.features);
                return false;
            }

            if (data.features.length === 0) {
                console.warn('GeoJSON aviso: FeatureCollection vazia');
                return true; // Permitimos coleções vazias
            }
            
            // Verifica cada feature
            const invalidFeatures = data.features.map((feature, index) => {
                if (!feature || typeof feature !== 'object') {
                    return `Feature ${index}: não é um objeto válido`;
                }
                if (!feature.type || feature.type !== 'Feature') {
                    return `Feature ${index}: type inválido ou ausente (${feature.type})`;
                }
                if (!feature.geometry || typeof feature.geometry !== 'object') {
                    return `Feature ${index}: geometry inválida ou ausente`;
                }
                if (!feature.geometry.type) {
                    return `Feature ${index}: geometry.type ausente`;
                }
                if (!feature.geometry.coordinates) {
                    return `Feature ${index}: coordinates ausentes`;
                }
                if (!Array.isArray(feature.geometry.coordinates)) {
                    return `Feature ${index}: coordinates não é um array`;
                }
                
                // Validação específica por tipo de geometria
                switch (feature.geometry.type) {
                    case 'Point':
                        if (feature.geometry.coordinates.length !== 2) {
                            return `Feature ${index}: Point deve ter exatamente 2 coordenadas`;
                        }
                        break;
                    case 'LineString':
                        if (!Array.isArray(feature.geometry.coordinates[0])) {
                            return `Feature ${index}: LineString deve ter array de coordenadas`;
                        }
                        break;
                    case 'Polygon':
                        if (!Array.isArray(feature.geometry.coordinates[0]) || 
                            !Array.isArray(feature.geometry.coordinates[0][0])) {
                            return `Feature ${index}: Polygon deve ter array de arrays de coordenadas`;
                        }
                        break;
                    default:
                        return `Feature ${index}: Tipo de geometria não suportado (${feature.geometry.type})`;
                }
                return null;
            }).filter(error => error !== null);

            if (invalidFeatures.length > 0) {
                console.error('GeoJSON inválido: Features com problemas:', invalidFeatures);
                return false;
            }

            return true;
        }

        // Se for uma única feature
        if (data.type === 'Feature') {
            if (!data.geometry || typeof data.geometry !== 'object') {
                console.error('GeoJSON inválido: Feature sem geometry válida', data);
                return false;
            }
            if (!data.geometry.type) {
                console.error('GeoJSON inválido: geometry sem type', data.geometry);
                return false;
            }
            if (!data.geometry.coordinates) {
                console.error('GeoJSON inválido: geometry sem coordinates', data.geometry);
                return false;
            }
            if (!Array.isArray(data.geometry.coordinates)) {
                console.error('GeoJSON inválido: coordinates não é um array', data.geometry.coordinates);
                return false;
            }

            // Validação específica por tipo de geometria
            switch (data.geometry.type) {
                case 'Point':
                    if (data.geometry.coordinates.length !== 2) {
                        console.error('GeoJSON inválido: Point deve ter exatamente 2 coordenadas', data.geometry.coordinates);
                        return false;
                    }
                    break;
                case 'LineString':
                    if (!Array.isArray(data.geometry.coordinates[0])) {
                        console.error('GeoJSON inválido: LineString deve ter array de coordenadas', data.geometry.coordinates);
                        return false;
                    }
                    break;
                case 'Polygon':
                    if (!Array.isArray(data.geometry.coordinates[0]) || 
                        !Array.isArray(data.geometry.coordinates[0][0])) {
                        console.error('GeoJSON inválido: Polygon deve ter array de arrays de coordenadas', data.geometry.coordinates);
                        return false;
                    }
                    break;
                default:
                    console.error('GeoJSON inválido: Tipo de geometria não suportado', data.geometry.type);
                    return false;
            }

            return true;
        }

        console.error('GeoJSON inválido: tipo não suportado:', data.type);
        return false;
    } catch (e) {
        console.error('Erro na validação do GeoJSON:', e);
        console.error('Dados que causaram o erro:', JSON.stringify(data, null, 2));
        return false;
    }
}

// Função de inicialização do Google Maps
function initMap() {
    console.log('Google Maps API inicializada com sucesso');
}

// Carregamento de dados com retry e melhor validação
async function loadMapData(retryCount = 0) {
    console.log('Iniciando loadMapData, tentativa:', retryCount + 1);
    
    const token = localStorage.getItem('authToken');
    const cidade = localStorage.getItem('userCity');
    console.log('Dados do usuário:', { cidade, temToken: !!token });

    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 8000);
    
    if (!token) {
        notifications.error('Sessão expirada. Redirecionando...');
        setTimeout(() => window.location.href = 'Login.html', 2000);
        return;
    }

    if (!cidade) {
        notifications.error('Cidade não identificada. Por favor, faça login novamente.');
        setTimeout(() => window.location.href = 'Login.html', 2000);
        return;
    }

    document.getElementById('loadingMessage').style.display = 'block';

    try {
        console.log('Fazendo requisição para:', `${API_BASE_URL}/geodata/${cidade}/map`);
        const response = await fetch(`${API_BASE_URL}/geodata/${cidade}/map`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta da API:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries([...response.headers]),
                body: errorText
            });
            throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
        }

        const textData = await response.text();
        console.log('Dados brutos recebidos:', textData.substring(0, 200));

        let data;
        try {
            data = JSON.parse(textData);
            console.log('Estrutura dos dados recebidos:', {
                tipo: typeof data,
                propriedades: Object.keys(data),
                conteudo: data
            });

            // Tenta converter os dados para o formato GeoJSON esperado
            if (typeof data === 'object' && data !== null) {
                // Se for um array de features
                if (Array.isArray(data)) {
                    data = {
                        type: 'FeatureCollection',
                        features: data.map(feature => {
                            if (!feature.type) feature.type = 'Feature';
                            return feature;
                        })
                    };
                }
                // Se for uma feature única
                else if (data.geometry) {
                    if (!data.type) data.type = 'Feature';
                    data = {
                        type: 'FeatureCollection',
                        features: [data]
                    };
                }
                // Se já for uma FeatureCollection
                else if (data.features && Array.isArray(data.features)) {
                    if (!data.type) data.type = 'FeatureCollection';
                }
                else {
                    console.error('Estrutura de dados não reconhecida:', data);
                    throw new Error('Formato de dados não reconhecido');
                }
            }

            console.log('Dados após normalização:', {
                tipo: data.type,
                quantidadeFeatures: data.features?.length,
                primeiraFeature: data.features?.[0]
            });

        } catch (e) {
            console.error('Erro ao processar dados:', e);
            console.error('Dados recebidos:', textData);
            throw new Error(`Erro ao processar dados: ${e.message}`);
        }

        if (!isValidGeoJSON(data)) {
            throw new Error('Formato GeoJSON inválido recebido da API');
        }

        // Remove camada anterior se existir
        if (redesLayer && map.hasLayer(redesLayer)) {
            map.removeLayer(redesLayer);
        }

        // Cria nova camada com popup responsivo
        console.log('Criando camada GeoJSON com os dados:', data);
        redesLayer = L.geoJSON(data, {
            style: getFeatureStyle,
            onEachFeature: (feature, layer) => {
                const props = feature.properties || {};
                const popupContent = `
                    <div class="popup-content">
                        <h3>${props.nome || 'Sem nome'}</h3>
                        <p>Tipo: ${props.tipo || 'Não especificado'}</p>
                        ${props.length ? `<p>Extensão: ${(props.length / 1000).toFixed(2)} km</p>` : ''}
                        ${props.descricao ? `<p>Descrição: ${props.descricao}</p>` : ''}
                    </div>
                `;
                layer.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: 'custom-popup'
                });
            }
        }).addTo(map);

        console.log('Camada GeoJSON adicionada ao mapa:', redesLayer);

        // Define a visualização inicial
        if (data.features && data.features.length > 0) {
            try {
                const bounds = redesLayer.getBounds();
                console.log('Bounds calculados:', bounds);
                map.fitBounds(bounds, {
                    padding: [50, 50],
                    maxZoom: 18
                });
            } catch (e) {
                console.warn('Erro ao ajustar visualização:', e);
                map.setView([-20.4695, -54.6052], 13);
            }
        } else {
            console.log('Nenhuma feature encontrada, usando visualização padrão');
            map.setView([-20.4695, -54.6052], 13);
        }

        notifications.success('Dados carregados com sucesso!');
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        
        if (retryCount < maxRetries) {
            notifications.show('Tentando reconectar...');
            setTimeout(() => loadMapData(retryCount + 1), retryDelay);
        } else {
            notifications.error(error.message);
        }
    } finally {
        document.getElementById('loadingMessage').style.display = 'none';
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

    const API_BASE_URL = 'https://api-geodata-exp.onrender.com';
    let map, redesLayer;
    let dadosCarregados = false;

    // Inicializar mapa
    function initializeMap() {
        map = L.map('map', {
            zoomControl: false,
            minZoom: 10,
            maxZoom: 19
        });

        // Adicionar controle de zoom em uma posição personalizada
        L.control.zoom({
            position: 'topright'
        }).addTo(map);

        // Camada base OpenStreetMap
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
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
    }

    // Carregar dados da API
    async function loadMapData() {
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
                    style: (feature) => ({
                        color: feature.properties.tipo === 'agua' ? '#2196F3' : '#FF5252',
                        weight: 3,
                        opacity: 0.8
                    }),
                    onEachFeature: (feature, layer) => {
                        // Popup personalizado
                        const popupContent = `
                            <div class="popup-content">
                                <h3>${feature.properties.nome || 'Rede'}</h3>
                                <p>Tipo: ${feature.properties.tipo || 'Não especificado'}</p>
                                ${feature.properties.length ? `<p>Extensão: ${formatDistance(feature.properties.length)}</p>` : ''}
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
            } else {
                // Centralizar no Brasil se não houver dados
                map.setView([-20.4810, -54.6352], 12);
            }

            dadosCarregados = true;

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showError('Erro ao carregar dados do mapa. Por favor, tente novamente.');
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    // Função para formatar distância
    function formatDistance(meters) {
        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(2)} km`;
        }
        return `${meters.toFixed(2)} m`;
    }

    // Função para mostrar mensagens de erro
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

    // Toggle da camada de redes
    document.getElementById('toggleRedes').addEventListener('change', (e) => {
        if (e.target.checked) {
            map.addLayer(redesLayer);
        } else {
            map.removeLayer(redesLayer);
        }
    });

    // Inicializar mapa e carregar dados
    initializeMap();
    await loadMapData();

    // Recarregar dados quando o mapa ficar visível novamente
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && dadosCarregados) {
            loadMapData();
        }
    });
});

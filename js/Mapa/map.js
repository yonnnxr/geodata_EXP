// Inicialização do mapa com opções responsivas
const map = L.map('map', {
    zoomControl: false,  // Vamos reposicionar os controles de zoom
    attributionControl: false  // Vamos reposicionar os créditos
});

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
        color: '#3388ff'
    };

    if (!feature.properties) return defaultStyle;

    switch (feature.properties.tipo?.toLowerCase()) {
        case 'agua':
            return {
                ...defaultStyle,
                color: '#2196F3',
                weight: 4
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

// Carregamento de dados com retry e melhor validação
async function loadMapData(retryCount = 0) {
    const token = localStorage.getItem('authToken');
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 8000); // Backoff exponencial
    
    if (!token) {
        notifications.error('Sessão expirada. Redirecionando...');
        setTimeout(() => window.location.href = 'Login.html', 2000);
        return;
    }

    document.getElementById('loadingMessage').style.display = 'block';

    try {
        const response = await fetch(`${API_BASE_URL}/geodata_regional`, {
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

        const contentType = response.headers.get('Content-Type');
        if (!contentType?.includes('application/json')) {
            console.warn('Aviso: Content-Type não é application/json:', contentType);
        }

        let data;
        const textData = await response.text();
        
        // Validação inicial dos dados
        if (!textData?.trim()) {
            throw new Error('Dados vazios recebidos da API');
        }

        try {
            // Verifica formato básico do JSON
            const firstChar = textData.trim()[0];
            if (firstChar !== '{' && firstChar !== '[') {
                console.error('Dados recebidos não estão no formato JSON esperado');
                throw new Error('Formato de dados inválido');
            }
            
            data = JSON.parse(textData);
            
            // Log seguro da estrutura dos dados
            console.log('Estrutura dos dados:', {
                type: data?.type,
                isArray: Array.isArray(data),
                hasFeatures: Array.isArray(data?.features),
                featuresCount: data?.features?.length || 0,
                firstFeatureType: data?.features?.[0]?.type,
                firstGeometryType: data?.features?.[0]?.geometry?.type
            });
        } catch (parseError) {
            console.error('Erro detalhado no parse JSON:', {
                name: parseError.name,
                message: parseError.message,
                stack: parseError.stack,
                dataPreview: textData.substring(0, 200)
            });
            throw new Error(`Erro ao processar dados do servidor: ${parseError.message}`);
        }

        // Normalização dos dados para GeoJSON
        if (Array.isArray(data)) {
            if (data.length === 0) {
                throw new Error('Array de features vazio recebido da API');
            }
            data = {
                type: 'FeatureCollection',
                features: data
            };
        } else if (data.type === 'Feature') {
            data = {
                type: 'FeatureCollection',
                features: [data]
            };
        } else if (!data.type || data.type !== 'FeatureCollection') {
            throw new Error(`Tipo de GeoJSON não suportado: ${data.type || 'indefinido'}`);
        }

        // Validação do GeoJSON
        if (!isValidGeoJSON(data)) {
            console.error('Estrutura GeoJSON inválida:', JSON.stringify(data, null, 2));
            throw new Error('Formato GeoJSON inválido recebido da API');
        }

        // Remove camada anterior se existir
        if (redesLayer && map.hasLayer(redesLayer)) {
            map.removeLayer(redesLayer);
        }

        // Cria nova camada com popup responsivo
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

        // Ajusta visualização
        if (data.features && data.features.length > 0) {
            map.fitBounds(redesLayer.getBounds(), {
                padding: [50, 50]
            });
        } else {
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
document.addEventListener('DOMContentLoaded', () => {
    loadMapData();
    
    // Atualiza o mapa quando a janela é redimensionada
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            map.invalidateSize();
            if (redesLayer) {
                map.fitBounds(redesLayer.getBounds(), {
                    padding: [50, 50]
                });
            }
        }, 250);
    });

    // Garante que o botão de voltar está visível
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.style.display = 'flex';
    }
});

// Toggle de camadas
document.getElementById('toggleRedes')?.addEventListener('change', function(e) {
    if (redesLayer) {
        if (e.target.checked) {
            map.addLayer(redesLayer);
        } else {
            map.removeLayer(redesLayer);
        }
    }
});

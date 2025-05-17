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
            console.error('GeoJSON inválido: dados vazios ou não é um objeto');
            return false;
        }

        // Verifica o tipo principal
        if (!data.type) {
            console.error('GeoJSON inválido: propriedade type não encontrada');
            return false;
        }

        // Verifica se é uma FeatureCollection
        if (data.type === 'FeatureCollection') {
            if (!Array.isArray(data.features)) {
                console.error('GeoJSON inválido: features não é um array');
                return false;
            }
            
            // Verifica cada feature
            return data.features.every((feature, index) => {
                if (!feature.type || feature.type !== 'Feature') {
                    console.error(`GeoJSON inválido: feature ${index} não tem type correto`);
                    return false;
                }
                if (!feature.geometry || typeof feature.geometry !== 'object') {
                    console.error(`GeoJSON inválido: feature ${index} não tem geometry válida`);
                    return false;
                }
                if (!feature.geometry.type || !feature.geometry.coordinates) {
                    console.error(`GeoJSON inválido: feature ${index} tem geometry incompleta`);
                    return false;
                }
                if (!Array.isArray(feature.geometry.coordinates)) {
                    console.error(`GeoJSON inválido: feature ${index} tem coordinates inválidas`);
                    return false;
                }
                return true;
            });
        }

        // Se for uma única feature
        if (data.type === 'Feature') {
            if (!data.geometry || typeof data.geometry !== 'object') {
                console.error('GeoJSON inválido: geometry não é um objeto válido');
                return false;
            }
            if (!data.geometry.type || !data.geometry.coordinates) {
                console.error('GeoJSON inválido: geometry está incompleta');
                return false;
            }
            if (!Array.isArray(data.geometry.coordinates)) {
                console.error('GeoJSON inválido: coordinates não é um array');
                return false;
            }
            return true;
        }

        console.error('GeoJSON inválido: tipo não suportado:', data.type);
        return false;
    } catch (e) {
        console.error('Erro na validação do GeoJSON:', e);
        return false;
    }
}

// Carregamento de dados com retry e melhor validação
async function loadMapData(retryCount = 0) {
    const token = localStorage.getItem('authToken');
    const maxRetries = 3;
    
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
            throw new Error(`Erro na requisição: ${response.status}`);
        }

        let data;
        const textData = await response.text();
        
        try {
            console.log('Tentando fazer parse dos dados brutos...');
            console.log('Primeiros 200 caracteres dos dados:', textData.substring(0, 200));
            data = JSON.parse(textData);
            console.log('Parse JSON realizado com sucesso. Estrutura:', {
                tipo: data.type,
                quantidadeFeatures: data.features?.length,
                primeiraFeature: data.features?.[0]
            });
        } catch (e) {
            console.error('Erro ao fazer parse do JSON:', e);
            throw new Error('Erro ao processar dados do servidor: ' + e.message);
        }

        // Verifica se é um objeto
        if (!data || typeof data !== 'object') {
            console.error('Dados inválidos:', data);
            throw new Error('Dados recebidos não são um objeto válido');
        }

        // Se os dados estiverem em uma propriedade específica
        if (data.data) {
            data = data.data;
        }

        // Garante que é um GeoJSON válido
        if (!isValidGeoJSON(data)) {
            console.error('Estrutura dos dados:', JSON.stringify(data, null, 2));
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
            setTimeout(() => loadMapData(retryCount + 1), 2000);
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

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

// Validação de GeoJSON melhorada
function isValidGeoJSON(data) {
    try {
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }
        
        if (!data || typeof data !== 'object') return false;
        if (!data.type) return false;
        if (!data.features && data.type !== 'Feature') return false;
        
        if (data.type === 'FeatureCollection' && !Array.isArray(data.features)) {
            return false;
        }
        
        // Validação adicional para propriedades necessárias
        if (data.features) {
            return data.features.every(feature => 
                feature.type === 'Feature' &&
                feature.geometry &&
                feature.properties
            );
        }
        
        return true;
    } catch (e) {
        console.error('Erro na validação do GeoJSON:', e);
        return false;
    }
}

// Estilo das redes com melhor visibilidade
function getFeatureStyle(feature) {
    const defaultStyle = {
        weight: 3,
        opacity: 0.8,
        color: '#3388ff'
    };

    if (!feature.properties) return defaultStyle;

    switch (feature.properties.tipo) {
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

// Carregamento de dados com retry
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

        const data = await response.json();
        
        if (!isValidGeoJSON(data)) {
            throw new Error('Dados GeoJSON inválidos recebidos da API');
        }

        // Remove camada anterior se existir
        if (redesLayer && map.hasLayer(redesLayer)) {
            map.removeLayer(redesLayer);
        }

        // Cria nova camada com popup responsivo
        redesLayer = L.geoJSON(data, {
            style: getFeatureStyle,
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
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
            notifications.error('Erro ao carregar dados. Tente novamente mais tarde.');
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
});

// Toggle de camadas
document.getElementById('toggleRedes').addEventListener('change', function(e) {
    if (redesLayer) {
        if (e.target.checked) {
            map.addLayer(redesLayer);
        } else {
            map.removeLayer(redesLayer);
        }
    }
});

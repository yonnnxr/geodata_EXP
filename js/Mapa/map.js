window.map = null;
window.layers = {
    'file': null,      // Rede de Distribuição
    'file-1': null,    // Economias Zero
    'file-2': null     // Ocorrências
};
window.layerGroups = {
    'file': L.layerGroup(),
    'file-1': L.layerGroup(),
    'file-2': L.layerGroup()
};
let dadosCarregados = false;
const BATCH_SIZE = 1000; // Para processamento em lotes geral
const ECONOMIA_PAGE_SIZE = 10000; // Tamanho da página específico para economias
let featuresCache = new Map();
let currentEconomiaPage = 1; // Página atual apenas para economias
let isLoadingMore = false;
let hasMoreEconomias = true; // Controle apenas para economias
let isMapInitialized = false;

// Variáveis globais para pesquisa
window.searchResults = [];
window.selectedFeature = null;
window.highlightedLayer = null;

// Função para verificar se o Leaflet está carregado
function isLeafletLoaded() {
    return typeof L !== 'undefined';
}

// Função para verificar autenticação
function checkAuthentication() {
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity');
    
    if (!token || !userCity) {
        console.error('Token ou cidade não encontrados');
        showError('Sessão expirada ou inválida. Por favor, faça login novamente.');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
    return true;
}

// Aguarda o carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando verificações...');
    
    if (!isLeafletLoaded()) {
        console.error('Leaflet não está carregado');
        showError('Erro ao carregar biblioteca de mapas. Por favor, recarregue a página.');
        return;
    }
    
    if (!checkAuthentication()) {
        return;
    }

    console.log('Iniciando mapa...');
    initializeLeafletMap();
});

// Função para inicializar o mapa Leaflet
async function initializeLeafletMap() {
    if (isMapInitialized) {
        console.log('Mapa já inicializado');
        return true;
    }

    console.log('Iniciando inicialização do mapa Leaflet');
    
    try {
        const isMobile = window.innerWidth <= 768;
        
        // Esconde mensagem de carregamento se existir
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        
        // Verifica se o elemento do mapa existe
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            throw new Error('Elemento do mapa não encontrado');
        }

        console.log('Elemento do mapa encontrado, criando instância...');
        
        // Cria o mapa
        window.map = L.map('map', {
            zoomControl: !isMobile,
            tap: true,
            bounceAtZoomLimits: false,
            maxZoom: 19,
            minZoom: 4
        });

        console.log('Instância do mapa criada, adicionando tile layer...');

        // Adiciona o tile layer do OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(window.map);

        // Define a visualização inicial
        window.map.setView([-20.4697, -54.6201], isMobile ? 11 : 12);

        console.log('Tile layer adicionado, mapa base criado com sucesso');
        
        isMapInitialized = true;

        // Inicializa os controles e eventos do mapa
        window.map.on('moveend', onMapMoveEnd);
        
        console.log('Carregando dados iniciais...');
        
        // Carrega os dados iniciais
        await loadMapData();

        return true;
    } catch (error) {
        console.error('Erro ao inicializar o mapa:', error);
        showError('Erro ao inicializar o mapa: ' + error.message);
        return false;
    }
}

// Função para formatar datas
function formatDate(value) {
    if (!value) return 'N/A';
    try {
        return new Date(value).toLocaleDateString('pt-BR');
    } catch (e) {
        return value;
    }
}

// Função para formatar números
function formatNumber(value, decimals = 2) {
    if (!value || isNaN(value)) return 'N/A';
    return Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
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

// Função para formatar rótulos
function formatLabel(key, value) {
    const labels = {
        'tipo': 'Tipo',
        'mat': 'Material',
        'dia': 'Diâmetro',
        'ext': 'Extensão',
        'status': 'Status',
        'economias': 'Economias',
        'consumo_medio': 'Consumo Médio',
        'data_ocorrencia': 'Data da Ocorrência',
        'tipo_ocorrencia': 'Tipo de Ocorrência',
        'descricao': 'Descrição',
        'solucao': 'Solução',
        'prioridade': 'Prioridade'
    };

    // Formatação específica por tipo de dado
    if (key === 'ext') {
        return `${formatNumber(value)} m`;
    } else if (key === 'dia') {
        return `${formatNumber(value, 0)} mm`;
    } else if (key === 'consumo_medio') {
        return `${formatNumber(value)} m³`;
    } else if (key === 'data_ocorrencia' && value) {
        return new Date(value).toLocaleDateString('pt-BR');
    }

    return value || 'N/A';
}

// Função para criar popup com informações da feature (otimizada para mobile)
function createFeaturePopup(feature, metadata) {
    const props = feature.properties;
    const layerType = metadata?.file_type || 'file';
    const config = LAYER_CONFIGS[layerType];
    const isMobile = isMobileDevice();
    
    let content = '<div class="feature-popup">';
    
    content += `<h4 class="popup-title ${layerType}">${config.title}</h4>`;
    
    if (localStorage.getItem('userCity') === 'global') {
        content += `<p class="locality"><strong>Localidade:</strong> ${props.locality || 'Desconhecida'}</p>`;
    }

    if (layerType === 'file-1' && config.formatAddress) {
        const address = config.formatAddress(props);
        if (address) {
            content += `<p class="address"><strong>Endereço:</strong> ${address}</p>`;
        }
    }
    
    config.fields.forEach(field => {
        if (layerType === 'file-1' && ['logradouro', 'numero', 'bairro', 'complemento'].includes(field.key)) {
            return;
        }

        const value = props[field.key];
        if (value !== undefined && value !== null && value !== '') {
            const formattedValue = field.format ? field.format(value) : value;
            content += `<p class="field ${field.key}"><strong>${field.label}:</strong> ${formattedValue}</p>`;
        }
    });

    // Adiciona botões de ação para mobile
    if (isMobile && layerType === 'file-1') {
        // Obtém as coordenadas do feature
        const coordinates = feature.geometry.coordinates;
        const lat = coordinates[1]; // Latitude é o segundo elemento
        const lng = coordinates[0]; // Longitude é o primeiro elemento
        
        content += `
            <div class="popup-actions">
                <button onclick="zoomToFeature(${lat}, ${lng})" class="popup-button">
                    <i class="fas fa-search-plus"></i> Zoom
                </button>
            </div>
        `;
    }
    
    content += '</div>';
    return content;
}

// Função para estilizar as features
function getFeatureStyle(feature, layerType) {
    const config = LAYER_CONFIGS[layerType];
    
    if (localStorage.getItem('userCity') === 'global') {
        const locality = feature.properties.locality || 'Desconhecida';
        const hash = hashString(locality);
        return {
            ...config.style,
            color: `#${hash.toString(16).substr(0, 6)}`
        };
    }
    
    return config.style;
}

// Atualiza os estilos do CSS para os popups
const style = document.createElement('style');
style.textContent = `
    .feature-popup {
        padding: 12px;
        max-width: 300px;
        font-family: Arial, sans-serif;
    }
    
    .popup-title {
        margin: 0 0 10px 0;
        padding-bottom: 5px;
        border-bottom: 2px solid #eee;
        font-size: 14px;
        font-weight: bold;
    }
    
    .popup-title.file { color: #3388ff; border-color: #3388ff; }
    .popup-title.file-1 { color: #ff3333; border-color: #ff3333; }
    .popup-title.file-2 { color: #33ff33; border-color: #33ff33; }
    
    .feature-popup p {
        margin: 5px 0;
        font-size: 13px;
        line-height: 1.4;
    }
    
    .feature-popup .locality {
        font-style: italic;
        color: #666;
    }
    
    .feature-popup .address {
        margin: 10px 0;
        padding: 5px;
        background: #f5f5f5;
        border-radius: 4px;
        font-weight: 500;
    }
    
    .feature-popup strong {
        color: #444;
        font-weight: 600;
    }
`;
document.head.appendChild(style);

// Função para mostrar/ocultar indicador de carregamento de mais dados
function toggleLoadMoreIndicator(show) {
    const indicator = document.getElementById('loadMoreIndicator');
    if (!indicator) return;

    if (show) {
        indicator.style.display = 'flex';
        indicator.innerHTML = `
            <div class="spinner"></div>
            <span>Carregando mais dados...</span>
        `;
    } else {
        indicator.style.display = 'none';
    }
}

// Função para limpar camadas
function clearLayers() {
    Object.values(window.layerGroups).forEach(group => {
        if (group) {
            group.clearLayers();
            window.map.removeLayer(group);
        }
    });
    
    window.layerGroups = {
        'file': L.layerGroup(),
        'file-1': L.layerGroup(),
        'file-2': L.layerGroup()
    };
    
    window.layers = {
        'file': null,
        'file-1': null,
        'file-2': null
    };
}

// Função para carregar dados do mapa com paginação
async function loadMapData(page = 1) {
    console.log(`Iniciando carregamento de dados - Página ${page}`);
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity');
    
    if (!token || !userCity) {
        console.error('Token ou cidade não encontrados');
        handleAuthError();
        return;
    }

    const loadingMessage = document.getElementById('loadingMessage');
    if (page === 1) {
        loadingMessage.style.display = 'flex';
        clearLayers();
    } else {
        toggleLoadMoreIndicator(true);
    }

    try {
        console.log(`Carregando camadas para ${userCity}`);
        const layersResponse = await window.fetchWithRetry(`${API_BASE_URL}/api/geodata/${userCity}/layers`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!layersResponse.ok) {
            throw new Error(`Erro ao carregar camadas: ${layersResponse.status}`);
        }

        const layersData = await layersResponse.json();
        console.log('Camadas disponíveis:', layersData);

        let hasAnyData = false;
        let errors = [];

        for (const layer of layersData.layers) {
            try {
                const layerData = await loadLayerData(layer, page, userCity, token);
                if (layerData && layerData.success) {
                    hasAnyData = true;
                }
            } catch (error) {
                console.error(`Erro ao carregar camada ${layer.type}:`, error);
                errors.push(`${layer.type}: ${error.message}`);
            }
        }

        if (!hasAnyData) {
            throw new Error(`Não foram encontrados dados para a cidade ${userCity}. Por favor, contate o administrador.`);
        }

        if (page === 1) {
            fitMapToBounds();
        }
        
        dadosCarregados = true;
        loadingMessage.style.display = 'none';
        toggleLoadMoreIndicator(false);
        isLoadingMore = false;

        // Se houver erros em algumas camadas mas outras funcionaram
        if (errors.length > 0 && hasAnyData) {
            showWarning(`Alguns dados não puderam ser carregados:\n${errors.join('\n')}`);
        }

        console.log('Carregamento concluído com sucesso');

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showError(`Erro ao carregar dados: ${error.message}`);
        loadingMessage.style.display = 'none';
        toggleLoadMoreIndicator(false);
        isLoadingMore = false;

        // Adiciona um botão para tentar novamente
        const mapElement = document.getElementById('map');
        const retryButton = document.createElement('button');
        retryButton.className = 'retry-button-large';
        retryButton.innerHTML = '<i class="fas fa-sync-alt"></i> Tentar Novamente';
        retryButton.onclick = () => {
            retryButton.remove();
            loadMapData(page);
        };
        mapElement.appendChild(retryButton);
    }
}

// Função para carregar dados de uma camada específica
async function loadLayerData(layer, page, userCity, token) {
    try {
        const isEconomia = layer.type === 'file-1';
        console.log(`Iniciando carregamento da camada ${layer.type} para ${userCity}`);

        const url = `${API_BASE_URL}/api/geodata/${userCity}/map?type=${layer.type}${isEconomia ? `&page=${page}&per_page=${ECONOMIA_PAGE_SIZE}` : ''}`;
        console.log(`Fazendo requisição para: ${url}`);

        const response = await window.fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Resposta não ok (${response.status}) para camada ${layer.type}`);
            if (response.status === 404) {
                console.warn(`Dados não encontrados para camada ${layer.type}`);
                return { success: false, error: 'Dados não encontrados' };
            }
            throw new Error(`Erro ao carregar camada ${layer.type}: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Dados recebidos para ${layer.type}:`, {
            featuresCount: data?.features?.length || 0,
            metadata: data?.metadata
        });

        if (data?.features?.length > 0) {
            await processFeatures(data.features, layer.type, data.metadata);
            updateLayerControl(layer.type, data.metadata.description);
            
            if (isEconomia) {
                hasMoreEconomias = data.metadata?.has_more || false;
                currentEconomiaPage = page;
            }
            
            return { success: true };
        } else {
            console.warn(`Nenhum dado encontrado para camada ${layer.type}`);
            return { success: false, error: 'Nenhum dado encontrado' };
        }
    } catch (error) {
        console.error(`Erro ao processar camada ${layer.type}:`, error);
        throw error;
    }
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
        const layerGroup = window.layerGroups[layerType];
        if (layerGroup) {
            if (e.target.checked) {
                window.map.addLayer(layerGroup);
            } else {
                window.map.removeLayer(layerGroup);
            }
        }
    });
}

function fitMapToBounds() {
    const bounds = [];
    Object.values(window.layerGroups).forEach(group => {
        if (group && group.getLayers().length > 0) {
            const layer = group.getLayers()[0];
            if (layer.getBounds().isValid()) {
                bounds.push(layer.getBounds());
            }
        }
    });

    if (bounds.length > 0) {
        const fullBounds = bounds[0];
        bounds.slice(1).forEach(b => fullBounds.extend(b));
        window.map.fitBounds(fullBounds);
    }
}

// Função para mostrar mensagens de erro
function showError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-circle"></i>
            <div class="error-text">
                <p>Erro ao carregar dados</p>
                <p class="error-details">${message}</p>
            </div>
            <button class="retry-button" onclick="retryLastOperation()">
                <i class="fas fa-sync-alt"></i> Tentar Novamente
            </button>
            <button class="close-button" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.getElementById('map').appendChild(errorContainer);

    // Auto-remove após 10 segundos
    setTimeout(() => {
        if (errorContainer.parentElement) {
            errorContainer.remove();
        }
    }, 10000);
}

// Função para mostrar mensagens de status
function showStatus(message, type = 'info') {
    const statusContainer = document.createElement('div');
    statusContainer.className = `status-message ${type}`;
    statusContainer.innerHTML = `
        <div class="status-content">
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        </div>
    `;
    document.getElementById('map').appendChild(statusContainer);

    setTimeout(() => {
        if (statusContainer.parentElement) {
            statusContainer.remove();
        }
    }, 5000);
}

// Variáveis para controle de operações
let lastOperation = null;
let lastOperationParams = null;

// Função para armazenar última operação
function setLastOperation(operation, params) {
    lastOperation = operation;
    lastOperationParams = params;
}

// Função para repetir última operação
async function retryLastOperation() {
    if (lastOperation && typeof lastOperation === 'function') {
        try {
            showStatus('Tentando novamente...', 'info');
            await lastOperation(...(lastOperationParams || []));
        } catch (error) {
            console.error('Erro ao repetir operação:', error);
            showError('Falha ao tentar novamente: ' + error.message);
        }
    }
}

// Função para lidar com erros de autenticação
function handleAuthError() {
    showError('Sessão expirada. Redirecionando para login...');
    setTimeout(() => {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }, 2000);
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

// Função para zoom em feature específica
function zoomToFeature(lat, lng) {
    if (window.map) {
        window.map.setView([lat, lng], 19, {
            animate: true,
            duration: 1
        });
    }
}

// Função para pesquisar matrícula
async function searchMatricula() {
    const searchInput = document.getElementById('searchMatricula');
    const searchValue = searchInput.value.trim();
    const resultsContainer = document.getElementById('searchResults');
    const isMobile = isMobileDevice();
    
    if (!searchValue) {
        resultsContainer.innerHTML = '';
        return;
    }

    clearHighlight();
    resultsContainer.innerHTML = '';
    window.searchResults = [];

    Object.entries(window.layers).forEach(([layerType, layer]) => {
        if (layerType === 'file-1' && layer) {
            layer.eachLayer(function(featureLayer) {
                const feature = featureLayer.feature;
                const matricula = feature.properties.matricula;
                
                if (matricula && matricula.toString().includes(searchValue)) {
                    window.searchResults.push({
                        feature: feature,
                        layer: featureLayer,
                        matricula: matricula,
                        endereco: LAYER_CONFIGS['file-1'].formatAddress(feature.properties)
                    });
                }
            });
        }
    });

    if (window.searchResults.length > 0) {
        window.searchResults.forEach((result, index) => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <strong>${result.matricula}</strong><br>
                <small>${result.endereco}</small>
            `;
            
            // Ajusta o comportamento do clique para mobile
            if (isMobile) {
                div.addEventListener('touchstart', () => {
                    div.style.backgroundColor = '#e3f2fd';
                });
            }
            
            div.onclick = () => selectSearchResult(index);
            resultsContainer.appendChild(div);
        });
    } else {
        resultsContainer.innerHTML = '<div class="search-result-item">Nenhum resultado encontrado</div>';
    }

    // Em mobile, fecha o teclado após a pesquisa
    if (isMobile) {
        searchInput.blur();
    }
}

// Função para selecionar um resultado da pesquisa
function selectSearchResult(index) {
    const result = window.searchResults[index];
    if (!result) return;

    // Limpa seleção anterior
    clearHighlight();
    
    // Atualiza seleção visual na lista
    document.querySelectorAll('.search-result-item').forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });

    // Destaca a feature no mapa
    const layer = result.layer;
    window.highlightedLayer = layer;
    
    // Aplica estilo de destaque
    if (layer.setStyle) {
        const originalStyle = layer.options;
        layer.setStyle({
            color: '#ff0000',
            weight: 4,
            opacity: 1,
            className: 'highlight-feature'
        });
        layer.originalStyle = originalStyle;
    }

    // Centraliza o mapa na feature
    const bounds = layer.getBounds ? layer.getBounds() : layer.getLatLng();
    window.map.fitBounds(bounds, { padding: [50, 50] });

    // Abre o popup
    layer.openPopup();
}

// Função para limpar destaque
function clearHighlight() {
    if (window.highlightedLayer) {
        if (window.highlightedLayer.setStyle && window.highlightedLayer.originalStyle) {
            window.highlightedLayer.setStyle(window.highlightedLayer.originalStyle);
            window.highlightedLayer.originalStyle = null;
        }
        window.highlightedLayer = null;
    }
}

// Adiciona evento de tecla Enter no campo de pesquisa
document.getElementById('searchMatricula')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchMatricula();
    }
});

// Função para carregar mais dados quando o usuário move o mapa
function onMapMoveEnd() {
    if (!dadosCarregados || isLoadingMore || !hasMoreEconomias) return;
    
    const zoom = window.map.getZoom();
    // Só carrega mais dados se o zoom for suficiente para visualizar detalhes
    if (zoom >= 14) {
        isLoadingMore = true;
        loadMapData(currentEconomiaPage + 1);
    }
}

// Função para mostrar avisos (warnings)
function showWarning(message) {
    const warningContainer = document.createElement('div');
    warningContainer.className = 'warning-message';
    warningContainer.innerHTML = `
        <div class="warning-content">
            <i class="fas fa-exclamation-triangle"></i>
            <div class="warning-text">
                <p>Atenção</p>
                <p class="warning-details">${message}</p>
            </div>
            <button class="close-button" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.getElementById('map').appendChild(warningContainer);

    // Auto-remove após 10 segundos
    setTimeout(() => {
        if (warningContainer.parentElement) {
            warningContainer.remove();
        }
    }, 10000);
}

async function processFeatures(features, layerType, metadata) {
    console.log(`Processando ${features.length} features do tipo ${layerType}`);
    
    const config = LAYER_CONFIGS[layerType] || {
        style: {
            color: '#2196F3',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.6
        }
    };

    try {
        for (let i = 0; i < features.length; i += BATCH_SIZE) {
            const batch = features.slice(i, i + BATCH_SIZE);
            console.log(`Processando lote ${i/BATCH_SIZE + 1} com ${batch.length} features`);
            
            batch.forEach(feature => {
                try {
                    const layer = L.geoJSON(feature, {
                        style: () => getFeatureStyle(feature, layerType),
                        onEachFeature: (feature, layer) => {
                            if (feature.properties) {
                                layer.bindPopup(createPopupContent(feature.properties));
                            }
                        }
                    });
                    
                    window.layerGroups[layerType].addLayer(layer);
                } catch (error) {
                    console.error(`Erro ao processar feature:`, error);
                }
            });
        }

        console.log(`Adicionando grupo de camadas ${layerType} ao mapa`);
        window.map.addLayer(window.layerGroups[layerType]);
        
    } catch (error) {
        console.error(`Erro ao processar features do tipo ${layerType}:`, error);
        throw error;
    }
}

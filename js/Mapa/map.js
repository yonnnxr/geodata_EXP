// Variáveis globais do mapa
window.map = null;
window.layers = {
    'file': null,      // Rede de Distribuição
    'file-1': null,    // Economias Zero
    'file-2': null     // Ocorrências
};

window.layerGroups = {
    'file': null,
    'file-1': null,
    'file-2': null
};

window.dadosCarregados = false;
window.isMapInitialized = false;

// Constantes
const BATCH_SIZE = 200000;
const ECONOMIA_PAGE_SIZE = 1000000;

// Variáveis de controle
let featuresCache = new Map();
let currentEconomiaPage = 1;
let isLoadingMore = false;
let hasMoreEconomias = true;
let isLoadingFeatures = false;
let loadingQueue = [];
let currentLoadingTask = null;

// Função para verificar se o Leaflet está carregado
function isLeafletLoaded() {
    return typeof L !== 'undefined' && typeof L.markerClusterGroup === 'function';
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

// Função para configurar os controles das camadas
function setupLayerControls() {
    console.log('Configurando controles das camadas...');

    // Controle da Rede de Água
    const toggleRedes = document.getElementById('toggleRedes');
    if (toggleRedes) {
        toggleRedes.addEventListener('change', function() {
            console.log('Toggle Redes:', this.checked);
            const layer = window.layerGroups['file'];
            if (layer) {
                if (this.checked) {
                    window.map.addLayer(layer);
                } else {
                    window.map.removeLayer(layer);
                }
            }
        });
    }

    // Controle das Economias
    const toggleEconomias = document.getElementById('toggleEconomias');
    if (toggleEconomias) {
        toggleEconomias.addEventListener('change', function() {
            console.log('Toggle Economias:', this.checked);
            const layer = window.layerGroups['file-1'];
            if (layer) {
                if (this.checked) {
                    window.map.addLayer(layer);
                } else {
                    window.map.removeLayer(layer);
                }
            }
        });
    }

    // Controle das Ocorrências
    const toggleOcorrencias = document.getElementById('toggleOcorrencias');
    if (toggleOcorrencias) {
        toggleOcorrencias.addEventListener('change', function() {
            console.log('Toggle Ocorrências:', this.checked);
            const layer = window.layerGroups['file-2'];
            if (layer) {
                if (this.checked) {
                    window.map.addLayer(layer);
                } else {
                    window.map.removeLayer(layer);
                }
            }
        });
    }
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
    initializeLeafletMap().then(() => {
        // Configura os controles das camadas após o mapa estar inicializado
        setupLayerControls();
        
        // Carrega os dados do mapa
        console.log('Iniciando carregamento dos dados...');
        loadMapData().then(() => {
            console.log('Dados carregados com sucesso');
            window.dadosCarregados = true;
        }).catch(error => {
            console.error('Erro ao carregar dados:', error);
            showError('Erro ao carregar dados do mapa: ' + error.message);
        });
    });
});

// Função para inicializar o mapa Leaflet
async function initializeLeafletMap() {
    if (window.isMapInitialized) {
        console.log('Mapa já inicializado');
        return true;
    }

    console.log('Iniciando inicialização do mapa Leaflet');
    
    try {
        if (!isLeafletLoaded()) {
            throw new Error('Leaflet ou MarkerCluster não estão carregados corretamente');
        }

        const isMobile = window.innerWidth <= 768;
        
        // Inicializa os layer groups
        window.layerGroups = {
            'file': L.layerGroup(),
            'file-1': L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 200,
                spiderfyOnMaxZoom: false,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                disableClusteringAtZoom: 15,
                animate: false,
                maxZoom: 19,
                singleMarkerMode: false,
                chunkInterval: 200,
                chunkDelay: 0,
                removeOutsideVisibleBounds: true,
                maxClusters: 1000
            }),
            'file-2': L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 100,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                disableClusteringAtZoom: 19,
                animate: false,
                maxZoom: 19,
                singleMarkerMode: false
            })
        };
        
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

        console.log('Instância do mapa criada, adicionando tile layers...');

        // Cria as camadas base
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        });

        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19
        });

        // Define as camadas base
        const baseLayers = {
            "OpenStreetMap": osm,
            "Satélite": satellite
        };

        // Adiciona o controle de camadas
        L.control.layers(baseLayers, null, {
            position: 'topright'
        }).addTo(window.map);

        // Adiciona a camada OSM por padrão
        osm.addTo(window.map);

        // Define a visualização inicial
        window.map.setView([-20.4697, -54.6201], isMobile ? 11 : 12);

        console.log('Tile layers adicionados, mapa base criado com sucesso');
        
        window.isMapInitialized = true;

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

// Função para verificar se é dispositivo móvel
function isMobileDevice() {
    return window.innerWidth <= 768 || 
           navigator.maxTouchPoints > 0 || 
           navigator.msMaxTouchPoints > 0 ||
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Função para criar popup com informações da feature
function createFeaturePopup(feature, metadata) {
    const props = feature.properties;
    const layerType = metadata?.file_type || 'file';
    const config = LAYER_CONFIGS[layerType];
    
    if (!config) {
        console.error(`Configuração não encontrada para o tipo: ${layerType}`);
        return '<div class="feature-popup">Informações não disponíveis</div>';
    }

    let content = '<div class="feature-popup">';

    // Se for economia ou ocorrência, verifica se há outra feature no mesmo local
    if (layerType === 'file-1' || layerType === 'file-2') {
        const coords = feature.geometry.coordinates;
        const otherType = layerType === 'file-1' ? 'file-2' : 'file-1';
        const otherLayer = window.layerGroups[otherType];
        let foundFeature = null;

        if (otherLayer) {
            otherLayer.eachLayer((layer) => {
                if (layer.feature) {
                    const otherCoords = layer.feature.geometry.coordinates;
                    if (coords[0] === otherCoords[0] && coords[1] === otherCoords[1]) {
                        foundFeature = layer.feature;
                    }
                }
            });
        }

        // Adiciona informações da economia
        if (layerType === 'file-1' || (foundFeature && otherType === 'file-1')) {
            const economiaFeature = layerType === 'file-1' ? feature : foundFeature;
            content += `<div class="popup-section economia">
                <h4 class="popup-title file-1">Informações da Economia</h4>`;
            
            if (localStorage.getItem('userCity') === 'global') {
                content += `<p class="locality"><strong>Localidade:</strong> ${economiaFeature.properties.locality || 'Desconhecida'}</p>`;
            }

            if (LAYER_CONFIGS['file-1'].formatAddress) {
                const address = LAYER_CONFIGS['file-1'].formatAddress(economiaFeature.properties);
                if (address) {
                    content += `<p class="address"><strong>Endereço:</strong> ${address}</p>`;
                }
            }

            LAYER_CONFIGS['file-1'].fields?.forEach(field => {
                if (!['logradouro', 'numero', 'bairro', 'complemento'].includes(field.key)) {
                    const value = economiaFeature.properties[field.key];
                    if (value !== undefined && value !== null && value !== '') {
                        const formattedValue = formatValue(field.key, value);
                        content += `<p class="field ${field.key}"><strong>${field.label}:</strong> ${formattedValue}</p>`;
                    }
                }
            });
            content += '</div>';
        }

        // Adiciona informações da ocorrência
        if (layerType === 'file-2' || (foundFeature && otherType === 'file-2')) {
            const ocorrenciaFeature = layerType === 'file-2' ? feature : foundFeature;
            content += `<div class="popup-section ocorrencia">
                <h4 class="popup-title file-2">Informações da Ocorrência</h4>`;

            LAYER_CONFIGS['file-2'].fields?.forEach(field => {
                const value = ocorrenciaFeature.properties[field.key];
                if (value !== undefined && value !== null && value !== '') {
                    const formattedValue = formatValue(field.key, value);
                    content += `<p class="field ${field.key}"><strong>${field.label}:</strong> ${formattedValue}</p>`;
                }
            });
            content += '</div>';
        }
    } else {
        // Para rede de água, mantém o popup original
        content += `<h4 class="popup-title ${layerType}">${config.title || 'Informações'}</h4>`;
        
        if (localStorage.getItem('userCity') === 'global') {
            content += `<p class="locality"><strong>Localidade:</strong> ${props.locality || 'Desconhecida'}</p>`;
        }

        if (config.fields) {
            config.fields.forEach(field => {
                const value = props[field.key];
                if (value !== undefined && value !== null && value !== '') {
                    const formattedValue = formatValue(field.key, value);
                    content += `<p class="field ${field.key}"><strong>${field.label}:</strong> ${formattedValue}</p>`;
                }
            });
        }
    }

    // Adiciona botões de ação para mobile
    if (isMobileDevice() && (layerType === 'file-1' || layerType === 'file-2')) {
        const coordinates = feature.geometry.coordinates;
        const lat = coordinates[1];
        const lng = coordinates[0];
        
        content += `
            <div class="popup-actions">
                <button onclick="zoomToFeature(${lat}, ${lng})" class="popup-button">
                    <i class="fas fa-search-plus"></i> Zoom
                </button>
            </div>
        `;
    }
    
    content += '</div>';

    // Adiciona estilos específicos para popups com múltiplas seções
    const style = document.createElement('style');
    style.textContent = `
        .popup-section {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        .popup-section:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        .popup-section.economia .popup-title {
            color: #FF5252;
            border-color: #FF5252;
        }
        .popup-section.ocorrencia .popup-title {
            color: #FFC107;
            border-color: #FFC107;
        }
    `;
    document.head.appendChild(style);

    return content;
}

// Função para formatar valores específicos
function formatValue(key, value) {
    switch (key) {
        case 'ext':
            return `${formatNumber(value)} m`;
        case 'dia':
            return `${formatNumber(value, 0)} mm`;
        case 'consumo_medio':
            return `${formatNumber(value)} m³`;
        case 'data_ocorrencia':
            return value ? formatDate(value) : 'N/A';
        default:
            return value || 'N/A';
    }
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

// Atualiza os estilos do CSS para os popups e indicadores de carregamento
const style = document.createElement('style');
style.textContent = `
    .feature-popup {
        padding: 12px;
        max-width: 300px;
        font-family: Arial, sans-serif;
    }
    
    /* Estilos para os clusters */
    .marker-cluster-small {
        background-color: rgba(181, 226, 140, 0.6);
    }
    .marker-cluster-small div {
        background-color: rgba(110, 204, 57, 0.6);
    }
    .marker-cluster-medium {
        background-color: rgba(241, 211, 87, 0.6);
    }
    .marker-cluster-medium div {
        background-color: rgba(240, 194, 12, 0.6);
    }
    .marker-cluster-large {
        background-color: rgba(253, 156, 115, 0.6);
    }
    .marker-cluster-large div {
        background-color: rgba(241, 128, 23, 0.6);
    }
    .marker-cluster {
        background-clip: padding-box;
        border-radius: 20px;
    }
    .marker-cluster div {
        width: 30px;
        height: 30px;
        margin-left: 5px;
        margin-top: 5px;
        text-align: center;
        border-radius: 15px;
        font: 12px "Helvetica Neue", Arial, Helvetica, sans-serif;
        color: #fff;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .marker-cluster span {
        line-height: 30px;
    }
    
    .popup-title {
        margin: 0 0 10px 0;
        padding-bottom: 5px;
        border-bottom: 2px solid #eee;
        font-size: 14px;
        font-weight: bold;
    }
    
    .popup-title.file { color: #3388ff; border-color: #3388ff; }
    .popup-title.file-1 { 
        color: #ff3333; 
        border-color: #ff3333;
    }
    .popup-title.file-2 { 
        color: #33ff33; 
        border-color: #33ff33;
    }
    
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

    /* Estilos para indicadores de carregamento */
    .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .loading-content p {
        margin: 10px 0 5px;
        font-size: 16px;
        color: #333;
    }

    .loading-content small {
        color: #666;
        font-size: 12px;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Estilos para mensagens de status */
    .status-message {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 4px;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    }

    .status-message.success {
        border-left: 4px solid #4caf50;
    }

    .status-message.info {
        border-left: 4px solid #2196f3;
    }

    .status-message.warning {
        border-left: 4px solid #ff9800;
    }

    .status-message.error {
        border-left: 4px solid #f44336;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    /* Estilos para o indicador de carregamento de mais dados */
    #loadMoreIndicator {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 10px 20px;
        border-radius: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        display: none;
        align-items: center;
        gap: 10px;
        z-index: 1000;
    }

    #loadMoreIndicator .spinner {
        width: 20px;
        height: 20px;
        border-width: 2px;
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
        'file-1': L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            disableClusteringAtZoom: 19,
            animate: false,
            maxZoom: 19,
            singleMarkerMode: false
        }),
        'file-2': L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            disableClusteringAtZoom: 19,
            animate: false,
            maxZoom: 19,
            singleMarkerMode: false
        })
    };
    
    window.layers = {
        'file': null,
        'file-1': null,
        'file-2': null
    };
}

// Função para processar a fila de carregamento
async function processLoadingQueue() {
    if (isLoadingFeatures || loadingQueue.length === 0) return;
    
    isLoadingFeatures = true;
    currentLoadingTask = loadingQueue.shift();
    
    try {
        await currentLoadingTask();
    } catch (error) {
        console.error('Erro ao processar fila de carregamento:', error);
    } finally {
        isLoadingFeatures = false;
        currentLoadingTask = null;
        
        // Continua processando a fila se houver mais itens
        if (loadingQueue.length > 0) {
            setTimeout(processLoadingQueue, 100);
        }
    }
}

// Função para atualizar o indicador de progresso
function updateLoadingProgress(layerType, page, total, description) {
    const loadingMessage = document.getElementById('loadingMessage');
    if (!loadingMessage) return;

    const progressText = total ? ` (${page}/${total})` : ` (Página ${page})`;
    loadingMessage.querySelector('span').textContent = 
        `Carregando ${description || layerType}${progressText}...`;
}

// Função para carregar dados de uma camada específica
async function loadLayerData(layer, page, userCity, token) {
    try {
        const isEconomia = layer.type === 'file-1';
        const layerDescription = LAYER_CONFIGS[layer.type]?.description || layer.type;
        
        console.log(`Iniciando carregamento da camada ${layer.type} para ${userCity} (página ${page})`);
        updateLoadingProgress(layer.type, page, null, layerDescription);

        // Ajusta o tamanho da página com base no tipo de camada
        const perPage = isEconomia ? 5000 : 10000;

        const url = `${API_BASE_URL}/api/geodata/${userCity}/map?type=${layer.type}&page=${page}&per_page=${perPage}`;
        console.log(`Fazendo requisição para: ${url}`);

        const response = await window.fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }, 3, 2000, 60000);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Erro na resposta (${response.status}) para camada ${layer.type}:`, errorText);
            
            if (response.status === 404) {
                console.warn(`Dados não encontrados para camada ${layer.type}`);
                return { success: false, error: 'Dados não encontrados' };
            }
            
            if (response.status === 401) {
                console.error('Erro de autenticação');
                window.location.href = '/login.html';
                return { success: false, error: 'Erro de autenticação' };
            }
            
            throw new Error(`Erro ao carregar camada ${layer.type}: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Dados recebidos para ${layer.type} (página ${page}):`, {
            featuresCount: data?.features?.length || 0,
            metadata: data?.metadata,
            hasMore: data?.metadata?.has_more
        });

        if (!data || !data.features) {
            console.error('Resposta inválida:', data);
            throw new Error('Formato de resposta inválido');
        }

        if (data.features.length > 0) {
            // Atualiza o progresso antes de processar
            const totalFeatures = data.metadata?.total_features;
            const processedFeatures = (page - 1) * perPage + data.features.length;
            const percentComplete = totalFeatures ? 
                Math.round((processedFeatures / totalFeatures) * 100) : null;
            
            if (percentComplete !== null) {
                updateLoadingProgress(
                    layer.type, 
                    processedFeatures.toLocaleString(), 
                    totalFeatures.toLocaleString(),
                    layerDescription
                );
            }

            await processFeatures(data.features, layer.type, data.metadata);
            
            // Atualiza o controle de camadas apenas na primeira página
            if (page === 1) {
                updateLayerControl(layer.type, data.metadata?.description || layer.type);
            }
            
            // Se houver mais dados, carrega a próxima página
            if (data.metadata?.has_more) {
                console.log(`Carregando próxima página para ${layer.type}`);
                await loadLayerData(layer, page + 1, userCity, token);
            }
            
            return { success: true };
        } else {
            console.warn(`Nenhum dado encontrado para camada ${layer.type} na página ${page}`);
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

// Função para zoom em feature específica
function zoomToFeature(lat, lng) {
    if (window.map) {
        window.map.setView([lat, lng], 19, {
            animate: true,
            duration: 1
        });
    }
}

// Função para carregar mais dados quando o usuário move o mapa
function onMapMoveEnd() {
    if (!dadosCarregados || isLoadingMore || !hasMoreEconomias) return;
    
    const zoom = window.map.getZoom();
    const bounds = window.map.getBounds();
    
    // Só carrega mais dados se o zoom for suficiente e houver área visível significativa
    if (zoom >= 14 && bounds.getNorth() - bounds.getSouth() < 0.1) {
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

// Função para processar features com melhor gerenciamento de memória
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
        // Aumenta o tamanho do lote para redes de água
        const batchSize = layerType === 'file' ? 1000000 : (layerType === 'file-1' ? 50000 : 200);
        const totalBatches = Math.ceil(features.length / batchSize);
        
        console.log(`Processando em ${totalBatches} lotes de ${batchSize} features`);
        
        // Criar array para armazenar todas as layers antes de adicionar
        const allLayers = [];
        
        // Otimização: Criar função de layer uma vez fora do loop
        const createCircleMarker = (coords, color) => L.circleMarker([coords[1], coords[0]], {
            radius: 1.5,
            color: color,
            weight: 1,
            opacity: 0.6,
            fillOpacity: 0.4,
            fillColor: color
        });
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * batchSize;
            const end = Math.min(start + batchSize, features.length);
            const batch = features.slice(start, end);
            
            console.log(`Processando lote ${batchIndex + 1}/${totalBatches} (${batch.length} features)`);
            
            // Processamento em lote sem pausas
            batch.forEach(feature => {
                try {
                    let layer;
                    
                    if (feature.geometry.type === 'Point') {
                        layer = createCircleMarker(feature.geometry.coordinates, config.style.color);
                        layer.feature = feature;
                        
                        // Lazy loading de popup
                        layer.on('click', function() {
                            if (!this._popup) {
                                this.bindPopup(createFeaturePopup(feature, { file_type: layerType }));
                            }
                            this.openPopup();
                        });
                    } else if (feature.geometry.type === 'LineString') {
                        layer = L.polyline(feature.geometry.coordinates.map(coord => [coord[1], coord[0]]), {
                            ...config.style,
                            interactive: true
                        });
                        layer.feature = feature;
                        
                        // Lazy loading de popup
                        layer.on('click', function() {
                            if (!this._popup) {
                                this.bindPopup(createFeaturePopup(feature, { file_type: layerType }));
                            }
                            this.openPopup();
                        });
                    } else {
                        console.warn(`Tipo de geometria não suportado: ${feature.geometry.type}`);
                        return;
                    }
                    
                    allLayers.push(layer);
                } catch (error) {
                    console.error(`Erro ao processar feature:`, error);
                }
            });
            
            // Atualiza o status de carregamento
            if (loadingMessage) {
                const progress = ((batchIndex + 1) / totalBatches * 100).toFixed(1);
                loadingMessage.querySelector('span').textContent = 
                    `Carregando ${LAYER_CONFIGS[layerType]?.description || layerType}... ${progress}%`;
            }
        }

        console.log(`Total de layers criadas: ${allLayers.length}`);

        // Adiciona as layers de acordo com o tipo
        const layerGroup = window.layerGroups[layerType];
        if (layerGroup) {
            if (layerType === 'file') {
                // Adiciona em lotes menores para redes de água para evitar travamento
                const addBatchSize = 5000;
                const totalAddBatches = Math.ceil(allLayers.length / addBatchSize);
                
                console.log(`Adicionando layers em ${totalAddBatches} lotes de ${addBatchSize}`);
                
                for (let i = 0; i < allLayers.length; i += addBatchSize) {
                    const batch = allLayers.slice(i, i + addBatchSize);
                    const layersToAdd = L.layerGroup(batch);
                    layerGroup.addLayer(layersToAdd);
                    
                    // Atualiza o status
                    if (loadingMessage) {
                        const progress = ((i + batch.length) / allLayers.length * 100).toFixed(1);
                        loadingMessage.querySelector('span').textContent = 
                            `Adicionando ao mapa... ${progress}%`;
                    }
                    
                    // Pequena pausa para permitir que a UI responda
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            } else {
                // Adiciona todos de uma vez para economias e ocorrências
                layerGroup.addLayers(allLayers);
            }

            if (!window.map.hasLayer(layerGroup)) {
                window.map.addLayer(layerGroup);
            }
            
            console.log(`Camada ${layerType} adicionada ao mapa`);
        }
        
    } catch (error) {
        console.error(`Erro ao processar features do tipo ${layerType}:`, error);
        throw error;
    }
}

// Remove as funções de busca
function clearHighlight() {
    if (window.highlightedLayer) {
        if (window.highlightedLayer.setStyle && window.highlightedLayer.originalStyle) {
            window.highlightedLayer.setStyle(window.highlightedLayer.originalStyle);
            window.highlightedLayer.originalStyle = null;
        }
        window.highlightedLayer = null;
    }
}

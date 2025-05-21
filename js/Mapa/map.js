// Variáveis globais do mapa
if (typeof window.map === 'undefined') {
    window.map = null;
}

if (typeof window.layers === 'undefined') {
    window.layers = {
        'file': null,      // Rede de Distribuição
        'file-1': null,    // Economias Zero
        'file-2': null     // Ocorrências
    };
}

// Variável de controle de inicialização
if (typeof window.isMapInitialized === 'undefined') {
    window.isMapInitialized = false;
}

if (typeof window.layerGroups === 'undefined') {
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
}

if (typeof window.dadosCarregados === 'undefined') {
    window.dadosCarregados = false;
}

// Constantes
const BATCH_SIZE = 1000; // Para processamento em lotes geral
const ECONOMIA_PAGE_SIZE = 10000; // Tamanho da página específico para economias

// Variáveis de controle
let featuresCache = new Map();
let currentEconomiaPage = 1; // Página atual apenas para economias
let isLoadingMore = false;
let hasMoreEconomias = true; // Controle apenas para economias

// Variáveis globais para pesquisa
if (typeof window.searchResults === 'undefined') {
    window.searchResults = [];
}
if (typeof window.selectedFeature === 'undefined') {
    window.selectedFeature = null;
}
if (typeof window.highlightedLayer === 'undefined') {
    window.highlightedLayer = null;
}

// Variáveis de controle de carregamento
let isLoadingFeatures = false;
let loadingQueue = [];
let currentLoadingTask = null;

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
    if (window.isMapInitialized) {
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
    content += `<h4 class="popup-title ${layerType}">${config.title || 'Informações'}</h4>`;
    
    if (localStorage.getItem('userCity') === 'global') {
        content += `<p class="locality"><strong>Localidade:</strong> ${props.locality || 'Desconhecida'}</p>`;
    }

    if (layerType === 'file-1' && config.formatAddress) {
        const address = config.formatAddress(props);
        if (address) {
            content += `<p class="address"><strong>Endereço:</strong> ${address}</p>`;
        }
    }
    
    if (config.fields) {
        config.fields.forEach(field => {
            if (layerType === 'file-1' && ['logradouro', 'numero', 'bairro', 'complemento'].includes(field.key)) {
                return;
            }

            const value = props[field.key];
            if (value !== undefined && value !== null && value !== '') {
                const formattedValue = formatValue(field.key, value);
                content += `<p class="field ${field.key}"><strong>${field.label}:</strong> ${formattedValue}</p>`;
            }
        });
    }

    // Adiciona botões de ação para mobile
    if (isMobileDevice() && layerType === 'file-1') {
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
        loadingMessage.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>Carregando dados do mapa...</p>
                <small>Isso pode levar alguns minutos</small>
            </div>
        `;
        clearLayers();
        
        // Limpa a fila de carregamento
        loadingQueue = [];
        isLoadingFeatures = false;
        currentLoadingTask = null;
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

        // Primeiro carrega as camadas mais leves (file e file-2)
        if (page === 1) {
            const lightLayers = layersData.layers.filter(layer => layer.type !== 'file-1');
            for (const layer of lightLayers) {
                loadingQueue.push(async () => {
                    try {
                        if (loadingMessage) {
                            loadingMessage.querySelector('p').textContent = `Carregando ${LAYER_CONFIGS[layer.type]?.description || layer.type}...`;
                        }
                        
                        const layerData = await loadLayerData(layer, 1, userCity, token);
                        if (layerData && layerData.success) {
                            hasAnyData = true;
                            showStatus(`${LAYER_CONFIGS[layer.type]?.description || layer.type} carregado com sucesso`, 'success');
                        }
                    } catch (error) {
                        console.error(`Erro ao carregar camada ${layer.type}:`, error);
                        errors.push(`${layer.type}: ${error.message}`);
                        showWarning(`Erro ao carregar ${LAYER_CONFIGS[layer.type]?.description || layer.type}`);
                    }
                });
            }
        }

        // Depois carrega as economias
        const economiaLayer = layersData.layers.find(layer => layer.type === 'file-1');
        if (economiaLayer) {
            if (page === 1) {
                // Na primeira página, adiciona o carregamento de economias à fila
                loadingQueue.push(async () => {
                    try {
                        if (loadingMessage) {
                            loadingMessage.querySelector('p').textContent = 'Carregando economias...';
                            loadingMessage.querySelector('small').textContent = 'Esta operação pode levar alguns minutos';
                        }
                        
                        await loadLayerData(economiaLayer, page, userCity, token);
                        console.log('Carregamento inicial de economias concluído');
                        showStatus('Carregamento inicial de economias concluído', 'success');
                    } catch (error) {
                        console.error('Erro ao carregar economias:', error);
                        errors.push(`Economias: ${error.message}`);
                        showWarning('Erro ao carregar economias. O mapa pode estar incompleto.');
                    }
                });
            } else {
                // Para páginas subsequentes, carrega apenas economias
                loadingQueue.push(async () => {
                    try {
                        await loadLayerData(economiaLayer, page, userCity, token);
                        showStatus(`Mais ${ECONOMIA_PAGE_SIZE} economias carregadas`, 'success');
                    } catch (error) {
                        console.error('Erro ao carregar mais economias:', error);
                        errors.push(`Economias (página ${page}): ${error.message}`);
                        showWarning('Erro ao carregar mais economias');
                    }
                });
            }
        }

        // Inicia o processamento da fila
        if (!isLoadingFeatures) {
            processLoadingQueue();
        }

        if (page === 1) {
            fitMapToBounds();
        }
        
        window.dadosCarregados = true;
        
        if (loadingMessage && page === 1) {
            // Mantém a mensagem de carregamento até que todas as tarefas sejam concluídas
            const checkQueue = setInterval(() => {
                if (loadingQueue.length === 0 && !isLoadingFeatures) {
                    loadingMessage.style.display = 'none';
                    clearInterval(checkQueue);
                }
            }, 1000);
        }
        
        toggleLoadMoreIndicator(false);
        isLoadingMore = false;

        // Se houver erros em algumas camadas mas outras funcionaram
        if (errors.length > 0 && hasAnyData) {
            showWarning(`Alguns dados não puderam ser carregados:\n${errors.join('\n')}`);
        }

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showError(`Erro ao carregar dados: ${error.message}`);
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        toggleLoadMoreIndicator(false);
        isLoadingMore = false;
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
            // Para economias, processa em lotes menores
            if (isEconomia) {
                const batchSize = 500; // Lote menor para economias
                for (let i = 0; i < data.features.length; i += batchSize) {
                    const batch = data.features.slice(i, i + batchSize);
                    await new Promise(resolve => setTimeout(resolve, 100)); // Pequena pausa entre lotes
                    await processFeatures(batch, layer.type, data.metadata);
                }
            } else {
                await processFeatures(data.features, layer.type, data.metadata);
            }
            
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
        // Tamanho do lote ainda menor para economias
        const batchSize = layerType === 'file-1' ? 100 : 500;
        const totalBatches = Math.ceil(features.length / batchSize);
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * batchSize;
            const end = Math.min(start + batchSize, features.length);
            const batch = features.slice(start, end);
            
            console.log(`Processando lote ${batchIndex + 1}/${totalBatches} com ${batch.length} features`);
            
            // Cria um grupo temporário para o lote
            const tempGroup = L.layerGroup();
            
            batch.forEach(feature => {
                try {
                    let layer;
                    
                    // Se for um ponto (economia ou ocorrência), usa círculo
                    if (feature.geometry.type === 'Point') {
                        const coords = feature.geometry.coordinates;
                        layer = L.circleMarker([coords[1], coords[0]], {
                            radius: 1,
                            color: config.style.color,
                            weight: 0.25,
                            opacity: 0.8,
                            fillOpacity: 0.6,
                            fillColor: config.style.color
                        });
                    } else {
                        // Para outros tipos (linhas, polígonos), usa GeoJSON normal
                        layer = L.geoJSON(feature, {
                            style: () => getFeatureStyle(feature, layerType)
                        });
                    }

                    // Adiciona o popup
                    if (feature.properties) {
                        layer.bindPopup(() => createFeaturePopup(feature, { file_type: layerType }));
                    }
                    
                    tempGroup.addLayer(layer);
                } catch (error) {
                    console.error(`Erro ao processar feature:`, error);
                }
            });
            
            // Adiciona o grupo temporário ao grupo principal
            window.layerGroups[layerType].addLayer(tempGroup);
            
            // Força a liberação de memória
            if (window.gc) window.gc();
            
            // Pausa maior entre os lotes
            if (batchIndex < totalBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        // Adiciona o grupo ao mapa se ainda não estiver adicionado
        if (!window.map.hasLayer(window.layerGroups[layerType])) {
            window.map.addLayer(window.layerGroups[layerType]);
        }
        
    } catch (error) {
        console.error(`Erro ao processar features do tipo ${layerType}:`, error);
        throw error;
    }
}

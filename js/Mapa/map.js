window.map = null;
window.redesLayer = null;
let dadosCarregados = false;
const API_BASE_URL = 'https://api-geodata-exp.onrender.com';
const BATCH_SIZE = 100; // Número de features a serem processadas por vez
let featuresCache = new Map(); // Cache para features já processadas

console.log('API URL configurada:', API_BASE_URL);

// Função para inicializar o mapa
async function initMap() {
    // Configuração inicial do mapa
    window.map = L.map('map').setView([-20.4697, -54.6201], 12);

    // Adiciona camada base do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(window.map);

    // Carrega dados do mapa
    await loadMapData();
}

// Função para estilizar as features
function getFeatureStyle(feature) {
    const defaultStyle = {
        color: '#3388ff',
        weight: 3,
        opacity: 0.8
    };

    // Se for visualização global, usa cores diferentes para cada localidade
    if (localStorage.getItem('userCity') === 'global') {
        const locality = feature.properties.locality || 'Desconhecida';
        const hash = hashString(locality);
        return {
            ...defaultStyle,
            color: `#${hash.toString(16).substr(0, 6)}`
        };
    }

    return defaultStyle;
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

// Função para criar popup com informações da feature
function createFeaturePopup(feature) {
    const props = feature.properties;
    let content = '<div class="feature-popup">';
    
    // Adiciona informação da localidade se for visualização global
    if (localStorage.getItem('userCity') === 'global') {
        content += `<p><strong>Localidade:</strong> ${props.locality || 'Desconhecida'}</p>`;
    }
    
    content += `
        <p><strong>Tipo:</strong> ${props.tipo || 'Não especificado'}</p>
        <p><strong>Material:</strong> ${props.mat || 'Não especificado'}</p>
        <p><strong>Diâmetro:</strong> ${props.dia || 'Não especificado'} mm</p>
        <p><strong>Extensão:</strong> ${props.ext || 'Não especificada'} m</p>
        <p><strong>Status:</strong> ${props.status || 'Não especificado'}</p>
    </div>`;
    
    return content;
}

async function loadMapData() {
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity');
    
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    const loadingMessage = document.getElementById('loadingMessage');
    loadingMessage.style.display = 'flex';

    try {
        // Se for acesso global, carrega todas as localidades
        if (userCity === 'global') {
            // Primeiro, busca a lista de localidades disponíveis
            const response = await fetch(`${API_BASE_URL}/api/localities`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Erro na resposta da API:', errorData);
                throw new Error(errorData.message || 'Erro ao carregar lista de localidades');
            }

            const data = await response.json();
            console.log('Resposta da API de localidades:', data);
            
            // Verifica se é uma lista de localidades
            if (data && data.localities && Array.isArray(data.localities)) {
                // Carrega dados para cada localidade
                let allFeatures = [];
                for (const locality of data.localities) {
                    try {
                        console.log('Carregando dados para:', locality.name);
                        const cityResponse = await fetch(`${API_BASE_URL}/api/geodata/${locality.id}/map`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            credentials: 'include'
                        });

                        if (cityResponse.ok) {
                            const cityData = await cityResponse.json();
                            console.log('Dados recebidos para', locality.name, ':', cityData);
                            
                            if (cityData && cityData.features && Array.isArray(cityData.features)) {
                                // Adiciona informação da localidade em cada feature
                                cityData.features.forEach(feature => {
                                    feature.properties.locality = locality.name;
                                });
                                allFeatures = allFeatures.concat(cityData.features);
                            } else {
                                console.warn(`Formato inválido de dados para ${locality.name}:`, cityData);
                            }
                        } else {
                            const errorData = await cityResponse.json().catch(() => ({}));
                            console.warn(`Erro ao carregar dados para ${locality.name}:`, errorData);
                        }
                    } catch (error) {
                        console.warn(`Erro ao carregar dados para ${locality.name}:`, error);
                    }
                }

                // Processa todas as features juntas
                if (allFeatures.length > 0) {
                    console.log('Total de features carregadas:', allFeatures.length);
                    await processFeatures(allFeatures);
                } else {
                    throw new Error('Nenhum dado encontrado para as localidades');
                }
            } else {
                console.error('Formato inválido de resposta:', data);
                throw new Error('Formato de resposta inválido ao carregar localidades');
            }
        } else {
            // Carrega dados para uma cidade específica
            const cacheKey = `${userCity}_mapData`;
            const cachedData = localStorage.getItem(cacheKey);
            let data;

            if (cachedData) {
                try {
                    data = JSON.parse(cachedData);
                    // Valida os dados do cache
                    if (!data || !data.features || !Array.isArray(data.features)) {
                        console.warn('Dados do cache inválidos, buscando dados novos');
                        localStorage.removeItem(cacheKey);
                        data = null;
                    } else {
                        console.log('Usando dados do cache');
                    }
                } catch (e) {
                    console.warn('Cache inválido, buscando dados novos');
                    localStorage.removeItem(cacheKey);
                    data = null;
                }
            }

            if (!data) {
                console.log('Iniciando requisição para:', `${API_BASE_URL}/api/geodata/${userCity}/map`);
                const response = await fetch(`${API_BASE_URL}/api/geodata/${userCity}/map`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Erro na resposta da API:', errorData);
                    throw new Error(errorData.message || 'Erro ao carregar dados do mapa');
                }

                data = await response.json();
                console.log('Dados recebidos da API:', data);
                
                // Valida os dados antes de salvar no cache
                if (data && data.features && Array.isArray(data.features)) {
                    // Salvar no cache
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(data));
                    } catch (e) {
                        console.warn('Não foi possível salvar no cache:', e);
                    }
                } else {
                    console.error('Formato inválido de dados:', data);
                    throw new Error('Dados recebidos da API em formato inválido');
                }
            }

            if (data && data.features && Array.isArray(data.features)) {
                await processFeatures(data.features);
            } else {
                throw new Error('Dados do mapa não encontrados ou em formato inválido');
            }
        }

        dadosCarregados = true;
        loadingMessage.style.display = 'none';

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        loadingMessage.style.display = 'none';
        showError(error.message);
    }
}

// Função auxiliar para processar features
async function processFeatures(features) {
    const totalFeatures = features.length;
    let processedFeatures = 0;
    const loadingMessage = document.getElementById('loadingMessage');

    while (processedFeatures < totalFeatures) {
        const batch = features.slice(processedFeatures, processedFeatures + BATCH_SIZE);
        
        // Cria camada GeoJSON para o lote
        const layer = L.geoJSON(batch, {
            style: getFeatureStyle,
            onEachFeature: (feature, layer) => {
                layer.bindPopup(createFeaturePopup(feature));
            }
        });

        // Adiciona ao mapa
        layer.addTo(window.map);
        
        // Atualiza contador
        processedFeatures += batch.length;
        
        // Atualiza mensagem de carregamento
        const progress = Math.round((processedFeatures / totalFeatures) * 100);
        loadingMessage.textContent = `Carregando dados... ${progress}%`;
        
        // Pequena pausa para não bloquear a UI
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Ajusta a visualização do mapa para mostrar todas as features
    if (window.map && processedFeatures > 0) {
        const layer = L.geoJSON(features);
        window.map.fitBounds(layer.getBounds());
    }
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

// Função para mostrar mensagens de erro
function showError(message) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>Não foi possível carregar os dados do mapa.</p>
        <p>${message}</p>
        <button onclick="loadMapData()">Tentar Novamente</button>
    `;
    document.getElementById('map').appendChild(errorMessage);
}

// Inicializa o mapa quando a página carregar
document.addEventListener('DOMContentLoaded', initMap);

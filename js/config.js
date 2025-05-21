// Configurações da API
if (typeof window.API_BASE_URL === 'undefined') {
    const API_BASE_URL = 'https://api-geodata-exp.onrender.com';
    window.API_BASE_URL = API_BASE_URL;
}

// Configurações de autenticação
if (typeof window.AUTH_CONFIG === 'undefined') {
    const AUTH_CONFIG = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        mode: 'cors'
    };
    window.AUTH_CONFIG = AUTH_CONFIG;
}

// Configurações do Google Maps
if (typeof window.GOOGLE_MAPS_CONFIG === 'undefined') {
    const GOOGLE_MAPS_CONFIG = {
        center: { lat: -20.4697, lng: -54.6201 },
        zoom: 12,
        mapTypeId: 'roadmap'
    };
    window.GOOGLE_MAPS_CONFIG = GOOGLE_MAPS_CONFIG;
}

// Configurações de timeout para requisições
if (typeof window.API_TIMEOUT === 'undefined') {
    const API_TIMEOUT = 30000; // 30 segundos
    window.API_TIMEOUT = API_TIMEOUT;
}

// Configurações de retry para requisições
if (typeof window.API_RETRY_ATTEMPTS === 'undefined') {
    const API_RETRY_ATTEMPTS = 3;
    window.API_RETRY_ATTEMPTS = API_RETRY_ATTEMPTS;
}

if (typeof window.API_RETRY_DELAY === 'undefined') {
    const API_RETRY_DELAY = 1000; // 1 segundo
    window.API_RETRY_DELAY = API_RETRY_DELAY;
}

// Configurações de estilo das camadas
if (typeof window.LAYER_CONFIGS === 'undefined') {
    const LAYER_CONFIGS = {
        'file': {
            style: {
                color: '#2196F3',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.6
            },
            description: 'Rede de Distribuição',
            title: 'Rede de Distribuição',
            fields: [
                { key: 'tipo', label: 'Tipo' },
                { key: 'mat', label: 'Material' },
                { key: 'dia', label: 'Diâmetro (mm)' },
                { key: 'ext', label: 'Extensão (m)' }
            ]
        },
        'file-1': {
            style: {
                color: '#FF5252',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.6
            },
            description: 'Economias Zero',
            title: 'Economia',
            fields: [
                { key: 'matricula', label: 'Matrícula' },
                { key: 'status', label: 'Status' },
                { key: 'consumo_medio', label: 'Consumo Médio (m³)' },
                { key: 'logradouro', label: 'Logradouro' },
                { key: 'numero', label: 'Número' },
                { key: 'bairro', label: 'Bairro' },
                { key: 'complemento', label: 'Complemento' }
            ],
            formatAddress: (props) => {
                const parts = [];
                if (props.logradouro) parts.push(props.logradouro);
                if (props.numero) parts.push(props.numero);
                if (props.complemento) parts.push(props.complemento);
                if (props.bairro) parts.push(props.bairro);
                return parts.join(', ');
            }
        },
        'file-2': {
            style: {
                color: '#FFC107',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.6
            },
            description: 'Ocorrências',
            title: 'Ocorrência',
            fields: [
                { key: 'tipo_ocorrencia', label: 'Tipo' },
                { key: 'data_ocorrencia', label: 'Data' },
                { key: 'descricao', label: 'Descrição' },
                { key: 'solucao', label: 'Solução' },
                { key: 'prioridade', label: 'Prioridade' }
            ]
        }
    };
    window.LAYER_CONFIGS = LAYER_CONFIGS;
}

console.log('Configurações carregadas com sucesso');

// Função para fazer requisições com retry
if (typeof window.fetchWithRetry === 'undefined') {
    window.fetchWithRetry = async function(url, options = {}) {
        let attempts = 0;
        
        while (attempts < window.API_RETRY_ATTEMPTS) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), window.API_TIMEOUT);
                
                const token = localStorage.getItem('authToken');
                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    ...(options.headers || {})
                };
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    headers,
                    mode: 'cors'
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    if (response.status === 401 || response.status === 422) {
                        localStorage.removeItem('authToken');
                        window.location.href = 'login.html';
                        return;
                    }
                    
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return response;
                
            } catch (error) {
                attempts++;
                console.error(`Tentativa ${attempts} falhou:`, error);
                
                if (attempts === window.API_RETRY_ATTEMPTS) {
                    throw error;
                }
                
                await new Promise(resolve => setTimeout(resolve, window.API_RETRY_DELAY * attempts));
            }
        }
    };
}
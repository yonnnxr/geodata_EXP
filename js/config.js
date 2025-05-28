// Configurações da API
window.API_BASE_URL = 'https://api-geodata-exp.onrender.com';
console.log('API_BASE_URL definida:', window.API_BASE_URL);

// Função para fazer requisições com retry
window.fetchWithRetry = async function(url, options = {}, maxRetries = 3, retryDelay = 1000, timeout = 15000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const fetchOptions = {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                },
                mode: 'cors',
                signal: controller.signal
            };

            console.log(`Tentando requisição ${options.method || 'GET'}:`, url);
            
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
        } catch (error) {
            console.warn(`Tentativa ${i + 1} falhou:`, error);
            lastError = error;
            
            if (error.name === 'AbortError') {
                console.warn('Requisição abortada por timeout');
            }
            
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
    
    throw lastError;
}

// Função para renovar o token
async function refreshToken() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refreshToken: localStorage.getItem('refreshToken')
            })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('authToken', data.token);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Erro ao renovar token:', error);
        return false;
    }
}

// Configurações das camadas
const LAYER_CONFIGS = {
    'file': {
        title: 'Rede de Distribuição',
        description: 'Rede de Distribuição de Água',
        style: {
            color: '#2196F3',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.6
        },
        fields: [
            { key: 'tipo', label: 'Tipo' },
            { key: 'mat', label: 'Material' },
            { key: 'dia', label: 'Diâmetro' },
            { key: 'ext', label: 'Extensão' }
        ]
    },
    'file-1': {
        title: 'Economia',
        description: 'Economias',
        style: {
            color: '#FF5252',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.6
        },
        fields: [
            { key: 'matricula', label: 'Matrícula' },
            { key: 'status', label: 'Status' },
            { key: 'consumo_medio', label: 'Consumo Médio' }
        ],
        formatAddress: (props) => {
            const parts = [];
            if (props.logradouro) parts.push(props.logradouro);
            if (props.numero) parts.push(props.numero);
            if (props.bairro) parts.push(props.bairro);
            if (props.complemento) parts.push(props.complemento);
            return parts.join(', ');
        }
    },
    'file-2': {
        title: 'Ocorrência',
        description: 'Ocorrências',
        style: {
            color: '#FFC107',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.6
        },
        fields: [
            { key: 'tipo_ocorrencia', label: 'Tipo' },
            { key: 'data_ocorrencia', label: 'Data' },
            { key: 'prioridade', label: 'Prioridade' },
            { key: 'status', label: 'Status' }
        ]
    }
};

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
    const API_TIMEOUT = 15000; // 15 segundos
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
    window.LAYER_CONFIGS = LAYER_CONFIGS;
}

console.log('Configurações carregadas com sucesso');
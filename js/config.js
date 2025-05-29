// Configurações da API
window.API_BASE_URL = 'https://api-geodata-exp.onrender.com';
console.log('API_BASE_URL definida:', window.API_BASE_URL);

// Configurações das camadas
window.LAYER_CONFIGS = {
    'file': {
        description: 'Rede de Água',
        title: 'Informações da Rede',
        style: {
            color: '#2196F3',
            weight: 2,
            opacity: 1
        },
        fields: [
            { key: 'tipo', label: 'Tipo' },
            { key: 'mat', label: 'Material' },
            { key: 'dia', label: 'Diâmetro' },
            { key: 'ext', label: 'Extensão' },
            { key: 'status', label: 'Status' }
        ]
    },
    'file-1': {
        description: 'Economias',
        title: 'Informações da Economia',
        style: {
            color: '#FF5252',
            radius: 4,
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.6
        },
        fields: [
            { key: 'matricula', label: 'Matrícula' },
            { key: 'logradouro', label: 'Logradouro' },
            { key: 'numero', label: 'Número' },
            { key: 'bairro', label: 'Bairro' },
            { key: 'complemento', label: 'Complemento' },
            { key: 'economias', label: 'Economias' },
            { key: 'consumo_medio', label: 'Consumo Médio' }
        ],
        formatAddress: (props) => {
            const parts = [];
            if (props.logradouro) parts.push(props.logradouro);
            if (props.numero) parts.push(`Nº ${props.numero}`);
            if (props.complemento) parts.push(props.complemento);
            if (props.bairro) parts.push(props.bairro);
            return parts.join(', ');
        }
    },
    'file-2': {
        description: 'Ocorrências',
        title: 'Informações da Ocorrência',
        style: {
            color: '#FFC107',
            radius: 6,
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.6
        },
        fields: [
            { key: 'data_ocorrencia', label: 'Data' },
            { key: 'tipo_ocorrencia', label: 'Tipo' },
            { key: 'descricao', label: 'Descrição' },
            { key: 'solucao', label: 'Solução' },
            { key: 'prioridade', label: 'Prioridade' }
        ]
    }
};

// Função para fazer requisições com retry
window.fetchWithRetry = async function(url, options = {}, maxRetries = 3, retryDelay = 2000, timeout = 30000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            // Obter o token de autenticação
            const authToken = localStorage.getItem('authToken');
            
            const fetchOptions = {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
                    ...options.headers
                },
                mode: 'cors',
                credentials: 'include',
                signal: controller.signal
            };

            // Log para debug
            console.log('Fazendo requisição com opções:', {
                url,
                method: fetchOptions.method || 'GET',
                headers: fetchOptions.headers
            });
            
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401) {
                    // Se o token expirou, tentar renovar
                    const tokenRenewed = await refreshToken();
                    if (tokenRenewed && i < maxRetries - 1) {
                        continue; // Tentar novamente com o novo token
                    }
                }
                const errorText = await response.text();
                console.error('Erro na resposta:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
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
                // Aumenta o delay exponencialmente
                const currentDelay = retryDelay * Math.pow(2, i);
                console.log(`Aguardando ${currentDelay}ms antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
            }
        }
    }
    
    throw lastError;
}

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
    const API_TIMEOUT = 60000; // 60 segundos
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
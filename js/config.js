// Configurações da API
const API_BASE_URL = 'https://api-geodata-exp.onrender.com';

// Configurações de autenticação
const AUTH_CONFIG = {
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    mode: 'cors'
};

// Exportar configurações
window.API_BASE_URL = API_BASE_URL;
window.AUTH_CONFIG = AUTH_CONFIG;

// Configurações de timeout para requisições
window.API_TIMEOUT = 30000; // 30 segundos

// Configurações de retry para requisições
window.API_RETRY_ATTEMPTS = 3;
window.API_RETRY_DELAY = 1000; // 1 segundo

// Função para fazer requisições com retry
window.fetchWithRetry = async function(url, options = {}) {
    let attempts = 0;
    
    while (attempts < window.API_RETRY_ATTEMPTS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), window.API_TIMEOUT);
            
            // Adiciona o token JWT ao header Authorization
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
                    // Token expirado ou inválido
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
            
            // Espera um tempo antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, window.API_RETRY_DELAY * attempts));
        }
    }
};
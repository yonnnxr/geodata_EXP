// Configurações globais da aplicação
window.API_BASE_URL = 'https://api-geodata-exp.onrender.com';

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
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': window.location.origin,
                    ...(options.headers || {})
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }
            
            return response;
            
        } catch (error) {
            attempts++;
            
            if (attempts === window.API_RETRY_ATTEMPTS) {
                throw error;
            }
            
            // Esperar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, window.API_RETRY_DELAY));
        }
    }
};
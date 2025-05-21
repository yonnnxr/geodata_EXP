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

// Configurações do Google Maps
const GOOGLE_MAPS_CONFIG = {
    apiKey: 'AIzaSyAeq2olKPH1UlTKxuOvW7WXpbhdATQ1jG8',
    libraries: ['geometry']
};

// Configurações de timeout para requisições
const API_TIMEOUT = 30000; // 30 segundos

// Configurações de retry para requisições
const API_RETRY_ATTEMPTS = 3;
const API_RETRY_DELAY = 1000; // 1 segundo

// Exportar configurações
window.API_BASE_URL = API_BASE_URL;
window.AUTH_CONFIG = AUTH_CONFIG;
window.API_TIMEOUT = API_TIMEOUT;
window.API_RETRY_ATTEMPTS = API_RETRY_ATTEMPTS;
window.API_RETRY_DELAY = API_RETRY_DELAY;

// Função para carregar o Google Maps
window.loadGoogleMaps = function() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            resolve();
            return;
        }

        window._googleMapsCallback = function() {
            resolve();
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&callback=_googleMapsCallback&libraries=${GOOGLE_MAPS_CONFIG.libraries.join(',')}`;
        script.async = true;
        script.defer = true;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

// Função para fazer requisições com retry
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
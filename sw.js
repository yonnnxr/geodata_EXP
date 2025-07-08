// Service Worker para SisGeti - Cache Offline e PWA
const CACHE_NAME = 'sisgeti-v1.2.0';
const STATIC_CACHE = 'sisgeti-static-v1.2.0';
const DYNAMIC_CACHE = 'sisgeti-dynamic-v1.2.0';
const API_CACHE = 'sisgeti-api-v1.2.0';

// Recursos essenciais para cache estático
const STATIC_ASSETS = [
    '/',
    '/login.html',
    '/pagina_inicial.html',
    '/map.html',
    '/admin.html',
    '/configuracoes.html',
    '/estatisticas.html',
    
    // CSS
    '/css/global.css',
    '/css/responsive-improvements.css',
    '/css/login.css',
    '/css/home/layout.css',
    '/css/home/cards.css',
    '/css/home/animations.css',
    '/css/map/base.css',
    '/css/map/controls.css',
    '/css/admin/dashboard.css',
    
    // JavaScript essencial
    '/js/utils/notifications.js',
    '/js/utils/cache.js',
    '/js/core/auth.js',
    '/js/config.js',
    '/js/login.js',
    '/js/pagina_inicial.js',
    
    // Recursos externos críticos
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    
    // Imagens
    '/img/favicon-32x32.png',
    '/img/streetview-icon.png'
];

// APIs que devem ser cacheadas
const API_ENDPOINTS = [
    '/api/statistics/',
    '/api/localities',
    '/api/permissions'
];

// Configurações de cache por tipo
const CACHE_STRATEGIES = {
    static: 'cache-first',
    api: 'network-first',
    dynamic: 'stale-while-revalidate'
};

// Cache TTL (Time To Live) em milissegundos
const CACHE_TTL = {
    static: 7 * 24 * 60 * 60 * 1000,    // 7 dias
    api: 5 * 60 * 1000,                 // 5 minutos
    dynamic: 24 * 60 * 60 * 1000        // 1 dia
};

// === Event Listeners ===

// Instalação do Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Installing Service Worker');
    
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            self.skipWaiting()
        ])
    );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Activating Service Worker');
    
    event.waitUntil(
        Promise.all([
            // Limpar caches antigos
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(cacheName)) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            self.clients.claim()
        ])
    );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requisições não-HTTP
    if (!request.url.startsWith('http')) return;
    
    // Estratégia baseada no tipo de recurso
    if (isStaticAsset(request)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(request)) {
        event.respondWith(handleAPIRequest(request));
    } else {
        event.respondWith(handleDynamicRequest(request));
    }
});

// Mensagens do cliente
self.addEventListener('message', event => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'CACHE_API_RESPONSE':
            cacheAPIResponse(data.url, data.response);
            break;
            
        case 'CLEAR_CACHE':
            clearCache(data.cacheType);
            break;
            
        case 'GET_CACHE_INFO':
            getCacheInfo().then(info => {
                event.ports[0].postMessage(info);
            });
            break;
            
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
    }
});

// Sync em background para dados offline
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-offline-actions') {
        event.waitUntil(syncOfflineActions());
    }
});

// === Estratégias de Cache ===

// Cache-first para recursos estáticos
async function handleStaticAsset(request) {
    try {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Verificar se o cache não expirou
            const dateHeader = cachedResponse.headers.get('sw-cache-date');
            if (dateHeader) {
                const cacheDate = new Date(dateHeader);
                const now = new Date();
                if (now.getTime() - cacheDate.getTime() < CACHE_TTL.static) {
                    return cachedResponse;
                }
            }
        }
        
        // Buscar da rede e atualizar cache
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            
            // Adicionar timestamp ao cache
            const responseWithDate = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: {
                    ...Object.fromEntries(responseClone.headers.entries()),
                    'sw-cache-date': new Date().toISOString()
                }
            });
            
            cache.put(request, responseWithDate);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, serving from cache:', error);
        const cache = await caches.open(STATIC_CACHE);
        return cache.match(request) || createOfflineResponse();
    }
}

// Network-first para APIs
async function handleAPIRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache apenas GETs de APIs específicas
            if (request.method === 'GET' && shouldCacheAPI(request.url)) {
                const cache = await caches.open(API_CACHE);
                const responseWithDate = new Response(networkResponse.clone().body, {
                    status: networkResponse.status,
                    statusText: networkResponse.statusText,
                    headers: {
                        ...Object.fromEntries(networkResponse.headers.entries()),
                        'sw-cache-date': new Date().toISOString()
                    }
                });
                cache.put(request, responseWithDate);
            }
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] API request failed, trying cache:', error);
        
        if (request.method === 'GET') {
            const cache = await caches.open(API_CACHE);
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
                // Verificar TTL da API
                const dateHeader = cachedResponse.headers.get('sw-cache-date');
                if (dateHeader) {
                    const cacheDate = new Date(dateHeader);
                    const now = new Date();
                    if (now.getTime() - cacheDate.getTime() < CACHE_TTL.api) {
                        return cachedResponse;
                    }
                }
                
                // Retornar cache expirado com header de aviso
                const expiredResponse = new Response(cachedResponse.body, {
                    status: cachedResponse.status,
                    statusText: cachedResponse.statusText,
                    headers: {
                        ...Object.fromEntries(cachedResponse.headers.entries()),
                        'X-Cache-Status': 'stale'
                    }
                });
                return expiredResponse;
            }
        }
        
        return createAPIOfflineResponse();
    }
}

// Stale-while-revalidate para conteúdo dinâmico
async function handleDynamicRequest(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Servir do cache se disponível
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            const responseWithDate = new Response(networkResponse.clone().body, {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: {
                    ...Object.fromEntries(networkResponse.headers.entries()),
                    'sw-cache-date': new Date().toISOString()
                }
            });
            cache.put(request, responseWithDate);
        }
        return networkResponse;
    }).catch(() => null);
    
    return cachedResponse || fetchPromise || createOfflineResponse();
}

// === Utilitários ===

function isStaticAsset(request) {
    const url = new URL(request.url);
    return STATIC_ASSETS.some(asset => url.pathname.includes(asset)) ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.png') ||
           url.pathname.endsWith('.jpg') ||
           url.pathname.endsWith('.svg') ||
           url.hostname.includes('fonts.googleapis.com') ||
           url.hostname.includes('cdnjs.cloudflare.com');
}

function isAPIRequest(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api/') ||
           url.hostname.includes('api-geodata-exp.onrender.com');
}

function shouldCacheAPI(url) {
    return API_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

function createOfflineResponse() {
    return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SisGeti - Offline</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 50px;
                    background: #f5f5f5;
                }
                .offline-container {
                    background: white;
                    border-radius: 8px;
                    padding: 40px;
                    max-width: 400px;
                    margin: 0 auto;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .icon { font-size: 64px; margin-bottom: 20px; }
                .retry-btn {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="icon">📡</div>
                <h2>Você está offline</h2>
                <p>Verifique sua conexão com a internet e tente novamente.</p>
                <button class="retry-btn" onclick="window.location.reload()">
                    Tentar Novamente
                </button>
            </div>
        </body>
        </html>
    `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
    });
}

function createAPIOfflineResponse() {
    return new Response(JSON.stringify({
        error: 'offline',
        message: 'Recurso indisponível offline',
        cached: false
    }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function cacheAPIResponse(url, response) {
    try {
        const cache = await caches.open(API_CACHE);
        await cache.put(url, new Response(JSON.stringify(response)));
    } catch (error) {
        console.error('[SW] Error caching API response:', error);
    }
}

async function clearCache(cacheType = 'all') {
    try {
        if (cacheType === 'all') {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        } else {
            await caches.delete(cacheType);
        }
        console.log(`[SW] Cache ${cacheType} cleared`);
    } catch (error) {
        console.error('[SW] Error clearing cache:', error);
    }
}

async function getCacheInfo() {
    try {
        const cacheNames = await caches.keys();
        const info = {};
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            info[cacheName] = {
                size: keys.length,
                keys: keys.map(req => req.url)
            };
        }
        
        return info;
    } catch (error) {
        console.error('[SW] Error getting cache info:', error);
        return {};
    }
}

async function syncOfflineActions() {
    try {
        // Implementar sincronização de ações offline
        console.log('[SW] Syncing offline actions...');
        
        // Aqui você pode implementar lógica para sincronizar
        // dados que foram salvos enquanto offline
        
        return Promise.resolve();
    } catch (error) {
        console.error('[SW] Error syncing offline actions:', error);
        throw error;
    }
}

// Notificar clientes sobre atualizações
function notifyClients(message) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage(message);
        });
    });
}

console.log('[SW] Service Worker loaded successfully'); 
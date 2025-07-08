// Gerenciador do Service Worker
class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.isOnline = navigator.onLine;
        this.updateAvailable = false;
        
        this.init();
        this.setupEventListeners();
    }

    async init() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker não suportado neste navegador');
            return;
        }

        try {
            await this.registerServiceWorker();
            this.setupUpdateCheck();
            this.monitorConnectivity();
        } catch (error) {
            console.error('Erro ao inicializar Service Worker:', error);
        }
    }

    async registerServiceWorker() {
        try {
            this.registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('Service Worker registrado com sucesso:', this.registration);

            // Verificar atualizações
            this.registration.addEventListener('updatefound', () => {
                const newWorker = this.registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.updateAvailable = true;
                        this.showUpdateNotification();
                    }
                });
            });

        } catch (error) {
            console.error('Falha no registro do Service Worker:', error);
        }
    }

    setupEventListeners() {
        // Escutar mensagens do Service Worker
        navigator.serviceWorker.addEventListener('message', event => {
            this.handleServiceWorkerMessage(event.data);
        });

        // Monitorar mudanças de conectividade
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleConnectivityChange(true);
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleConnectivityChange(false);
        });
    }

    setupUpdateCheck() {
        // Verificar atualizações a cada 30 minutos
        setInterval(() => {
            if (this.registration) {
                this.registration.update();
            }
        }, 30 * 60 * 1000);
    }

    monitorConnectivity() {
        // Mostrar status de conectividade
        if (!this.isOnline) {
            this.showOfflineNotification();
        }
    }

    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'CACHE_UPDATED':
                console.log('Cache atualizado:', data.cacheName);
                break;
                
            case 'OFFLINE_READY':
                console.log('Aplicação pronta para uso offline');
                if (window.notifications) {
                    window.notifications.info('Aplicação configurada para uso offline', 3000);
                }
                break;
                
            case 'UPDATE_AVAILABLE':
                this.updateAvailable = true;
                this.showUpdateNotification();
                break;
        }
    }

    handleConnectivityChange(isOnline) {
        if (isOnline) {
            console.log('Conexão restaurada');
            if (window.notifications) {
                window.notifications.success('Conexão com internet restaurada');
            }
            this.syncOfflineActions();
        } else {
            console.log('Conexão perdida - modo offline');
            this.showOfflineNotification();
        }
    }

    showUpdateNotification() {
        if (window.notifications) {
            const notification = window.notifications.info(
                'Nova versão disponível. Clique para atualizar.',
                0 // Não remove automaticamente
            );
            
            // Adicionar botão de atualização
            const updateBtn = document.createElement('button');
            updateBtn.textContent = 'Atualizar Agora';
            updateBtn.className = 'btn btn-primary btn-sm';
            updateBtn.style.marginTop = '8px';
            updateBtn.onclick = () => {
                this.applyUpdate();
                window.notifications.manager.remove(notification);
            };
            
            notification.querySelector('.notification-body').appendChild(updateBtn);
        }
    }

    showOfflineNotification() {
        if (window.notifications) {
            window.notifications.warning(
                'Você está offline. Algumas funcionalidades podem estar limitadas.',
                5000
            );
        }
    }

    async applyUpdate() {
        if (!this.registration || !this.updateAvailable) return;

        try {
            // Instruir o novo SW a assumir o controle
            await this.sendMessage({ type: 'SKIP_WAITING' });
            
            // Recarregar a página após um breve delay
            setTimeout(() => {
                window.location.reload();
            }, 500);
            
        } catch (error) {
            console.error('Erro ao aplicar atualização:', error);
        }
    }

    async sendMessage(message) {
        if (!this.registration) return;

        const messageChannel = new MessageChannel();
        
        return new Promise((resolve, reject) => {
            messageChannel.port1.onmessage = event => {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    resolve(event.data);
                }
            };

            const sw = this.registration.active || this.registration.waiting || this.registration.installing;
            if (sw) {
                sw.postMessage(message, [messageChannel.port2]);
            } else {
                reject(new Error('Service Worker não disponível'));
            }
        });
    }

    async syncOfflineActions() {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;

        try {
            // Registrar sync para ações offline
            if ('sync' in window.ServiceWorkerRegistration.prototype) {
                await this.registration.sync.register('sync-offline-actions');
                console.log('Sync de ações offline registrado');
            }
        } catch (error) {
            console.error('Erro ao registrar sync offline:', error);
        }
    }

    async getCacheInfo() {
        try {
            return await this.sendMessage({ type: 'GET_CACHE_INFO' });
        } catch (error) {
            console.error('Erro ao obter informações do cache:', error);
            return {};
        }
    }

    async clearCache(cacheType = 'all') {
        try {
            await this.sendMessage({ 
                type: 'CLEAR_CACHE', 
                data: { cacheType } 
            });
            
            if (window.notifications) {
                window.notifications.success('Cache limpo com sucesso');
            }
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
            if (window.notifications) {
                window.notifications.error('Erro ao limpar cache');
            }
        }
    }

    async preloadCriticalResources() {
        const criticalResources = [
            '/css/global.css',
            '/css/responsive-improvements.css',
            '/js/core/auth.js',
            '/js/utils/notifications.js'
        ];

        try {
            const cache = await caches.open('sisgeti-critical-v1.0.0');
            await cache.addAll(criticalResources);
            console.log('Recursos críticos pré-carregados');
        } catch (error) {
            console.error('Erro ao pré-carregar recursos:', error);
        }
    }

    // Método para instalar PWA
    promptInstallPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            
            this.deferredPrompt.userChoice.then(choiceResult => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('PWA instalado');
                    if (window.notifications) {
                        window.notifications.success('Aplicativo instalado com sucesso!');
                    }
                }
                this.deferredPrompt = null;
            });
        }
    }

    // Verificar se a aplicação é executada como PWA
    isPWA() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    // Obter estatísticas de uso offline
    async getOfflineStats() {
        try {
            const cacheInfo = await this.getCacheInfo();
            const totalCacheSize = Object.values(cacheInfo).reduce((total, cache) => total + cache.size, 0);
            
            return {
                isOnline: this.isOnline,
                isPWA: this.isPWA(),
                cacheInfo: cacheInfo,
                totalCachedResources: totalCacheSize,
                updateAvailable: this.updateAvailable
            };
        } catch (error) {
            console.error('Erro ao obter estatísticas offline:', error);
            return null;
        }
    }
}

// Event listener para prompt de instalação PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    
    // Mostrar botão de instalação personalizado
    const installButton = document.getElementById('install-pwa-btn');
    if (installButton) {
        installButton.style.display = 'block';
        installButton.addEventListener('click', () => {
            if (window.swManager) {
                window.swManager.deferredPrompt = deferredPrompt;
                window.swManager.promptInstallPWA();
            }
        });
    }
});

// Evento quando PWA é instalado
window.addEventListener('appinstalled', () => {
    console.log('PWA foi instalado');
    deferredPrompt = null;
    
    if (window.notifications) {
        window.notifications.success('Aplicativo instalado! Agora você pode acessá-lo diretamente da tela inicial.');
    }
});

// Inicializar o gerenciador do Service Worker
window.swManager = new ServiceWorkerManager();

// Função global para limpar cache (para uso em configurações)
window.clearAppCache = (type) => {
    if (window.swManager) {
        return window.swManager.clearCache(type);
    }
};

// Função global para obter estatísticas offline
window.getOfflineStats = () => {
    if (window.swManager) {
        return window.swManager.getOfflineStats();
    }
    return null;
};

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServiceWorkerManager;
} 
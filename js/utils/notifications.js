// Sistema unificado de notificações
class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Criar container de notificações se não existir
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }

        // Adicionar estilos CSS se não existirem
        this.addStyles();
    }

    addStyles() {
        if (document.getElementById('notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            }

            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 10px;
                padding: 16px;
                position: relative;
                transform: translateX(100%);
                transition: all 0.3s ease;
                pointer-events: auto;
                border-left: 4px solid;
            }

            .notification.show {
                transform: translateX(0);
            }

            .notification.success {
                border-left-color: #28a745;
                background: #f8fff9;
            }

            .notification.error {
                border-left-color: #dc3545;
                background: #fff8f8;
            }

            .notification.warning {
                border-left-color: #ffc107;
                background: #fffef8;
            }

            .notification.info {
                border-left-color: #17a2b8;
                background: #f8fcff;
            }

            .notification-header {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                font-weight: 600;
            }

            .notification-icon {
                margin-right: 8px;
                font-size: 18px;
            }

            .notification.success .notification-icon {
                color: #28a745;
            }

            .notification.error .notification-icon {
                color: #dc3545;
            }

            .notification.warning .notification-icon {
                color: #ffc107;
            }

            .notification.info .notification-icon {
                color: #17a2b8;
            }

            .notification-body {
                color: #333;
                line-height: 1.4;
            }

            .notification-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 18px;
                color: #999;
                cursor: pointer;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .notification-close:hover {
                background: rgba(0, 0, 0, 0.1);
                color: #333;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 0 0 8px 8px;
                animation: progress linear;
            }

            @keyframes progress {
                from { width: 100%; }
                to { width: 0%; }
            }

            @media (max-width: 480px) {
                .notification-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }

                .notification {
                    margin-bottom: 8px;
                    padding: 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    show(message, type = 'info', duration = 5000) {
        const notification = this.createNotification(message, type, duration);
        this.container.appendChild(notification);

        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto-remover
        if (duration > 0) {
            setTimeout(() => this.remove(notification), duration);
        }

        return notification;
    }

    createNotification(message, type, duration) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const titles = {
            success: 'Sucesso',
            error: 'Erro',
            warning: 'Aviso',
            info: 'Informação'
        };

        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-icon">${icons[type] || icons.info}</span>
                <span>${titles[type] || titles.info}</span>
            </div>
            <div class="notification-body">${message}</div>
            <button class="notification-close" aria-label="Fechar">&times;</button>
            ${duration > 0 ? `<div class="notification-progress" style="animation-duration: ${duration}ms;"></div>` : ''}
        `;

        // Evento de fechar
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.remove(notification);
        });

        return notification;
    }

    remove(notification) {
        if (!notification || !notification.parentNode) return;

        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 8000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }

    clear() {
        const notifications = this.container.querySelectorAll('.notification');
        notifications.forEach(notification => this.remove(notification));
    }
}

// Instância global
window.notifications = new NotificationSystem();

// Funções de conveniência para compatibilidade
window.showError = (message) => window.notifications.error(message);
window.showSuccess = (message) => window.notifications.success(message);
window.showWarning = (message) => window.notifications.warning(message);
window.showInfo = (message) => window.notifications.info(message);

// Sistema de loading global
class LoadingSystem {
    constructor() {
        this.overlay = null;
        this.activeLoaders = new Set();
        this.init();
    }

    init() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'loading-overlay';
        this.overlay.className = 'loading-overlay';
        this.overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-text">Carregando...</div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        // Adicionar estilos
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(2px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }

                .loading-overlay.show {
                    opacity: 1;
                    visibility: visible;
                }

                .loading-spinner {
                    text-align: center;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                }

                .loading-text {
                    color: #333;
                    font-size: 16px;
                    font-weight: 500;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    show(text = 'Carregando...') {
        const loaderId = Date.now().toString();
        this.activeLoaders.add(loaderId);
        
        this.overlay.querySelector('.loading-text').textContent = text;
        this.overlay.classList.add('show');
        
        return loaderId;
    }

    hide(loaderId) {
        if (loaderId) {
            this.activeLoaders.delete(loaderId);
        }
        
        if (this.activeLoaders.size === 0) {
            this.overlay.classList.remove('show');
        }
    }

    hideAll() {
        this.activeLoaders.clear();
        this.overlay.classList.remove('show');
    }
}

// Instância global do loading
window.loading = new LoadingSystem();

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationSystem, LoadingSystem };
} 
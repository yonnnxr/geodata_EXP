// Sistema de Resiliência de API
class APIResilience {
    constructor(options = {}) {
        this.options = {
            maxRetries: options.maxRetries || 2,
            baseTimeout: options.baseTimeout || 12000,
            maxTimeout: options.maxTimeout || 20000,
            retryDelay: options.retryDelay || 1500,
            healthCheckInterval: options.healthCheckInterval || 60000, // 1 minuto
            circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
            circuitBreakerTimeout: options.circuitBreakerTimeout || 30000, // 30 segundos
            debug: options.debug || false
        };

        this.apiHealth = {
            status: 'unknown', // unknown, healthy, degraded, down
            failures: 0,
            lastCheck: null,
            responseTime: null,
            circuitOpen: false,
            circuitOpenSince: null
        };

        this.requestStats = {
            total: 0,
            successful: 0,
            failed: 0,
            timeouts: 0,
            networkErrors: 0
        };

        this.retryQueue = [];
        this.healthCheckTimer = null;
        
        this.init();
    }

    init() {
        this.startHealthCheck();
        this.setupConnectionMonitoring();
        this.setupNotificationHandlers();
        
        console.log('[APIResilience] Sistema de resiliência inicializado');
    }

    // === Health Check ===

    startHealthCheck() {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.options.healthCheckInterval);

        // Verificação inicial
        this.performHealthCheck();
    }

    async performHealthCheck() {
        const startTime = performance.now();
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s para health check

            const response = await fetch(`${window.API_BASE_URL}/health`, {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-cache'
            });

            clearTimeout(timeoutId);
            const responseTime = performance.now() - startTime;

            if (response.ok) {
                this.updateApiHealth('healthy', responseTime);
                this.resetCircuitBreaker();
            } else {
                this.updateApiHealth('degraded', responseTime);
                this.incrementFailures();
            }

        } catch (error) {
            this.updateApiHealth('down', null);
            this.incrementFailures();
            
            if (this.options.debug) {
                console.warn('[APIResilience] Health check failed:', error.message);
            }
        }
    }

    updateApiHealth(status, responseTime) {
        const previousStatus = this.apiHealth.status;
        
        this.apiHealth = {
            ...this.apiHealth,
            status,
            responseTime,
            lastCheck: Date.now()
        };

        // Notificar mudanças de status
        if (previousStatus !== status) {
            this.notifyStatusChange(previousStatus, status);
        }

        // Ajustar timeouts baseado na performance
        this.adaptTimeouts(responseTime);
    }

    incrementFailures() {
        this.apiHealth.failures++;
        
        // Abrir circuit breaker se necessário
        if (this.apiHealth.failures >= this.options.circuitBreakerThreshold) {
            this.openCircuitBreaker();
        }
    }

    resetCircuitBreaker() {
        if (this.apiHealth.circuitOpen) {
            this.apiHealth.circuitOpen = false;
            this.apiHealth.circuitOpenSince = null;
            this.apiHealth.failures = 0;
            
            console.log('[APIResilience] Circuit breaker fechado - API recuperada');
            
            if (window.notifications) {
                window.notifications.success('Conexão com servidor restabelecida', 3000);
            }
        }
    }

    openCircuitBreaker() {
        if (!this.apiHealth.circuitOpen) {
            this.apiHealth.circuitOpen = true;
            this.apiHealth.circuitOpenSince = Date.now();
            
            console.warn('[APIResilience] Circuit breaker aberto - API indisponível');
            
            if (window.notifications) {
                window.notifications.error('Problema de conectividade detectado. Tentando reconectar...', 5000);
            }
            
            // Tentar fechar circuit breaker após timeout
            setTimeout(() => {
                this.resetCircuitBreaker();
            }, this.options.circuitBreakerTimeout);
        }
    }

    // === Timeout Adaptativo ===

    adaptTimeouts(responseTime) {
        if (!responseTime) return;

        // Ajustar timeout baseado na performance atual
        if (responseTime < 2000) {
            // API respondendo bem, usar timeout menor
            this.currentTimeout = Math.max(this.options.baseTimeout, responseTime * 3);
        } else if (responseTime < 5000) {
            // API um pouco lenta, aumentar timeout
            this.currentTimeout = Math.min(this.options.maxTimeout, responseTime * 2);
        } else {
            // API muito lenta, usar timeout máximo
            this.currentTimeout = this.options.maxTimeout;
        }
    }

    getCurrentTimeout() {
        return this.currentTimeout || this.options.baseTimeout;
    }

    // === Requisições Resilientes ===

    async resilientFetch(url, options = {}) {
        // Verificar circuit breaker
        if (this.isCircuitOpen()) {
            throw new Error('Serviço temporariamente indisponível devido a problemas de conectividade');
        }

        this.requestStats.total++;
        
        const enhancedOptions = {
            ...options,
            timeout: this.getCurrentTimeout(),
            retryCount: 0
        };

        return this.executeWithRetry(url, enhancedOptions);
    }

    async executeWithRetry(url, options) {
        let lastError;
        const maxRetries = this.options.maxRetries;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.fetchWithTimeout(url, options, this.getCurrentTimeout());
                
                // Sucesso - atualizar estatísticas
                this.requestStats.successful++;
                this.recordSuccessfulRequest();
                
                return response;
                
            } catch (error) {
                lastError = error;
                this.recordFailedRequest(error);
                
                // Se for o último retry ou erro não recuperável, falhar
                if (attempt === maxRetries || !this.isRetryableError(error)) {
                    break;
                }
                
                // Aguardar antes do próximo retry
                const delay = this.calculateRetryDelay(attempt);
                await this.sleep(delay);
                
                console.log(`[APIResilience] Retry ${attempt + 1}/${maxRetries} em ${delay}ms`);
            }
        }

        this.requestStats.failed++;
        throw lastError;
    }

    async fetchWithTimeout(url, options, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                this.requestStats.timeouts++;
                throw new Error(`Timeout de ${timeout}ms excedido`);
            }
            
            if (!navigator.onLine) {
                this.requestStats.networkErrors++;
                throw new Error('Sem conexão com a internet');
            }
            
            throw error;
        }
    }

    // === Helpers ===

    isCircuitOpen() {
        if (!this.apiHealth.circuitOpen) return false;
        
        // Verificar se é hora de tentar fechar o circuit breaker
        const timeSinceOpen = Date.now() - this.apiHealth.circuitOpenSince;
        if (timeSinceOpen > this.options.circuitBreakerTimeout) {
            this.resetCircuitBreaker();
            return false;
        }
        
        return true;
    }

    isRetryableError(error) {
        // Não tentar novamente para erros 4xx (exceto 408, 429)
        if (error.status >= 400 && error.status < 500) {
            return error.status === 408 || error.status === 429;
        }
        
        // Tentar novamente para timeouts, erros de rede e 5xx
        return error.name === 'AbortError' || 
               error.message.includes('Timeout') ||
               error.message.includes('fetch') ||
               error.status >= 500;
    }

    calculateRetryDelay(attempt) {
        // Jitter para evitar thundering herd
        const jitter = Math.random() * 500;
        return this.options.retryDelay * (attempt + 1) + jitter;
    }

    recordSuccessfulRequest() {
        // Reset de falhas em caso de sucesso
        if (this.apiHealth.failures > 0) {
            this.apiHealth.failures = Math.max(0, this.apiHealth.failures - 1);
        }
    }

    recordFailedRequest(error) {
        this.incrementFailures();
        
        // Log detalhado em modo debug
        if (this.options.debug) {
            console.error('[APIResilience] Request failed:', {
                error: error.message,
                status: error.status,
                timeout: this.getCurrentTimeout(),
                apiHealth: this.apiHealth
            });
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // === Connection Monitoring ===

    setupConnectionMonitoring() {
        // Monitorar status online/offline
        window.addEventListener('online', () => {
            console.log('[APIResilience] Conexão restaurada');
            this.resetCircuitBreaker();
            this.performHealthCheck();
        });

        window.addEventListener('offline', () => {
            console.log('[APIResilience] Conexão perdida');
            this.updateApiHealth('down', null);
        });

        // Monitorar mudanças na qualidade da conexão
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                this.handleConnectionChange();
            });
        }
    }

    handleConnectionChange() {
        const connection = navigator.connection;
        
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            // Aumentar timeouts para conexões lentas
            this.currentTimeout = this.options.maxTimeout;
            console.log('[APIResilience] Conexão lenta detectada - ajustando timeouts');
        } else {
            // Usar timeout normal
            this.currentTimeout = this.options.baseTimeout;
        }
    }

    // === Notifications ===

    setupNotificationHandlers() {
        // Configurar diferentes tipos de notificações
        this.notificationHandlers = {
            'healthy': () => {
                if (window.notifications) {
                    window.notifications.success('Servidor funcionando normalmente', 2000);
                }
            },
            'degraded': () => {
                if (window.notifications) {
                    window.notifications.warning('Servidor com lentidão - aguarde', 3000);
                }
            },
            'down': () => {
                if (window.notifications) {
                    window.notifications.error('Servidor indisponível - tentando reconectar', 5000);
                }
            }
        };
    }

    notifyStatusChange(previousStatus, newStatus) {
        console.log(`[APIResilience] Status mudou: ${previousStatus} -> ${newStatus}`);
        
        const handler = this.notificationHandlers[newStatus];
        if (handler && previousStatus !== 'unknown') {
            handler();
        }
    }

    // === API Pública ===

    getApiHealth() {
        return { ...this.apiHealth };
    }

    getRequestStats() {
        return {
            ...this.requestStats,
            successRate: this.requestStats.total > 0 
                ? (this.requestStats.successful / this.requestStats.total * 100).toFixed(1) + '%'
                : '0%'
        };
    }

    isHealthy() {
        return this.apiHealth.status === 'healthy';
    }

    forceHealthCheck() {
        return this.performHealthCheck();
    }

    resetStats() {
        this.requestStats = {
            total: 0,
            successful: 0,
            failed: 0,
            timeouts: 0,
            networkErrors: 0
        };
    }

    // === Debug ===

    getDebugInfo() {
        return {
            apiHealth: this.apiHealth,
            requestStats: this.requestStats,
            currentTimeout: this.getCurrentTimeout(),
            circuitOpen: this.isCircuitOpen(),
            connectionInfo: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }

    logStatus() {
        console.group('[APIResilience] Status do Sistema');
        console.log('API Health:', this.getApiHealth());
        console.log('Request Stats:', this.getRequestStats());
        console.log('Current Timeout:', this.getCurrentTimeout() + 'ms');
        console.log('Debug Info:', this.getDebugInfo());
        console.groupEnd();
    }

    // === Cleanup ===

    destroy() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        
        console.log('[APIResilience] Sistema destruído');
    }
}

// Integração com fetchWithRetry existente
if (window.fetchWithRetry) {
    const originalFetchWithRetry = window.fetchWithRetry;
    const apiResilience = new APIResilience({
        debug: localStorage.getItem('debugMode') === 'true'
    });
    
    // Sobrescrever fetchWithRetry para usar o sistema resiliente
    window.fetchWithRetry = async function(url, options = {}) {
        try {
            return await apiResilience.resilientFetch(url, options);
        } catch (error) {
            // Fallback para método original se necessário
            console.warn('[APIResilience] Fallback para método original');
            return originalFetchWithRetry(url, options);
        }
    };
    
    // Expor instância globalmente
    window.apiResilience = apiResilience;
}

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIResilience;
} 
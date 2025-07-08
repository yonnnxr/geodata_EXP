// Sistema de Monitoramento de Erros
class ErrorMonitor {
    constructor(options = {}) {
        this.options = {
            // Configurações básicas
            enabled: options.enabled !== false,
            maxErrors: options.maxErrors || 100,
            maxErrorAge: options.maxErrorAge || 24 * 60 * 60 * 1000, // 24 horas
            
            // Endpoints para envio de erros
            reportingEndpoint: options.reportingEndpoint || null,
            
            // Configurações de envio
            batchSize: options.batchSize || 10,
            flushInterval: options.flushInterval || 30000, // 30 segundos
            
            // Filtros
            ignoreErrors: options.ignoreErrors || [
                'Script error.',
                'Non-Error promise rejection captured',
                'ResizeObserver loop limit exceeded'
            ],
            ignoreUrls: options.ignoreUrls || [
                'chrome-extension://',
                'moz-extension://',
                'safari-extension://'
            ],
            
            // Configurações de usuário
            collectUserInfo: options.collectUserInfo !== false,
            collectBrowserInfo: options.collectBrowserInfo !== false,
            collectPerformanceInfo: options.collectPerformanceInfo !== false,
            
            // Callbacks
            onError: options.onError || null,
            onReport: options.onReport || null,
            
            // Privacy
            sanitizeData: options.sanitizeData !== false,
            excludePersonalData: options.excludePersonalData || ['password', 'token', 'key', 'secret']
        };

        this.errorQueue = [];
        this.errorBuffer = [];
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.errorCounts = new Map();
        this.flushTimer = null;
        
        this.init();
    }

    init() {
        if (!this.options.enabled) return;

        this.setupErrorHandlers();
        this.setupUnhandledRejectionHandler();
        this.setupConsoleInterception();
        this.startPeriodicFlush();
        
        console.log('[ErrorMonitor] Sistema de monitoramento iniciado');
    }

    // === Handlers de Erro ===
    
    setupErrorHandlers() {
        window.addEventListener('error', (event) => {
            this.handleError({
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                type: 'javascript'
            });
        });
    }

    setupUnhandledRejectionHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                message: `Unhandled Promise Rejection: ${event.reason}`,
                error: event.reason,
                type: 'promise'
            });
        });
    }

    setupConsoleInterception() {
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        console.error = (...args) => {
            this.handleError({
                message: args.join(' '),
                type: 'console.error',
                args: this.options.sanitizeData ? this.sanitizeArgs(args) : args
            });
            originalConsoleError.apply(console, args);
        };

        console.warn = (...args) => {
            this.handleError({
                message: args.join(' '),
                type: 'console.warn',
                level: 'warning',
                args: this.options.sanitizeData ? this.sanitizeArgs(args) : args
            });
            originalConsoleWarn.apply(console, args);
        };
    }

    // === Processamento de Erros ===
    
    handleError(errorInfo) {
        try {
            // Filtrar erros ignorados
            if (this.shouldIgnoreError(errorInfo)) {
                return;
            }

            const errorRecord = this.createErrorRecord(errorInfo);
            this.trackError(errorRecord);
            
            // Callback personalizado
            if (this.options.onError) {
                this.options.onError(errorRecord);
            }

            // Notificar usuário se configurado
            this.notifyUser(errorRecord);
            
        } catch (error) {
            console.error('[ErrorMonitor] Erro ao processar erro:', error);
        }
    }

    shouldIgnoreError(errorInfo) {
        const message = errorInfo.message || '';
        const filename = errorInfo.filename || '';

        // Verificar mensagens ignoradas
        if (this.options.ignoreErrors.some(ignore => message.includes(ignore))) {
            return true;
        }

        // Verificar URLs ignoradas
        if (this.options.ignoreUrls.some(ignore => filename.includes(ignore))) {
            return true;
        }

        return false;
    }

    createErrorRecord(errorInfo) {
        const record = {
            id: this.generateErrorId(),
            timestamp: Date.now(),
            sessionId: this.sessionId,
            
            // Informações do erro
            message: errorInfo.message,
            type: errorInfo.type || 'unknown',
            level: errorInfo.level || 'error',
            filename: errorInfo.filename,
            lineno: errorInfo.lineno,
            colno: errorInfo.colno,
            
            // Stack trace
            stack: this.extractStackTrace(errorInfo.error),
            
            // Contexto da aplicação
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp_relative: Date.now() - this.startTime,
            
            // Informações adicionais
            breadcrumbs: this.getBreadcrumbs(),
            customData: {}
        };

        // Adicionar informações opcionais
        if (this.options.collectUserInfo) {
            record.user = this.getUserInfo();
        }

        if (this.options.collectBrowserInfo) {
            record.browser = this.getBrowserInfo();
        }

        if (this.options.collectPerformanceInfo) {
            record.performance = this.getPerformanceInfo();
        }

        // Sanitizar dados sensíveis
        if (this.options.sanitizeData) {
            this.sanitizeRecord(record);
        }

        return record;
    }

    extractStackTrace(error) {
        if (!error || !error.stack) return null;
        
        return error.stack
            .split('\n')
            .slice(0, 10) // Limitar a 10 linhas
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    // === Coleta de Contexto ===
    
    getUserInfo() {
        return {
            id: this.getUserId(),
            session: this.sessionId,
            locale: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            online: navigator.onLine
        };
    }

    getBrowserInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            connection: connection ? {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt
            } : null,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }

    getPerformanceInfo() {
        if (!window.performanceMonitor) return null;
        
        const summary = window.performanceMonitor.getPerformanceSummary();
        return {
            score: summary.score,
            vitals: summary.vitals,
            memory: summary.memory
        };
    }

    getBreadcrumbs() {
        // Implementar sistema de breadcrumbs se necessário
        return this.breadcrumbs || [];
    }

    // === Rastreamento e Armazenamento ===
    
    trackError(errorRecord) {
        // Incrementar contador
        const key = `${errorRecord.type}:${errorRecord.message}`;
        this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
        
        // Adicionar à fila
        this.errorQueue.push(errorRecord);
        this.errorBuffer.push(errorRecord);
        
        // Limitar tamanho do buffer
        if (this.errorBuffer.length > this.options.maxErrors) {
            this.errorBuffer.shift();
        }
        
        // Salvar no localStorage
        this.saveToLocalStorage(errorRecord);
        
        // Tentar enviar imediatamente para erros críticos
        if (errorRecord.level === 'error') {
            this.flush();
        }
    }

    saveToLocalStorage(errorRecord) {
        try {
            const stored = JSON.parse(localStorage.getItem('error-monitor-logs') || '[]');
            stored.push(errorRecord);
            
            // Limitar por idade e quantidade
            const now = Date.now();
            const filtered = stored
                .filter(record => now - record.timestamp < this.options.maxErrorAge)
                .slice(-this.options.maxErrors);
            
            localStorage.setItem('error-monitor-logs', JSON.stringify(filtered));
        } catch (error) {
            console.error('[ErrorMonitor] Erro ao salvar no localStorage:', error);
        }
    }

    // === Envio de Relatórios ===
    
    startPeriodicFlush() {
        this.flushTimer = setInterval(() => {
            this.flush();
        }, this.options.flushInterval);
    }

    async flush() {
        if (this.errorQueue.length === 0) return;
        
        const batch = this.errorQueue.splice(0, this.options.batchSize);
        
        try {
            await this.sendBatch(batch);
            
            if (this.options.onReport) {
                this.options.onReport(batch);
            }
            
        } catch (error) {
            // Recolocar na fila se falhar
            this.errorQueue.unshift(...batch);
            console.error('[ErrorMonitor] Falha ao enviar batch:', error);
        }
    }

    async sendBatch(errors) {
        if (!this.options.reportingEndpoint) {
            console.log('[ErrorMonitor] Batch de erros (sem endpoint):', errors);
            return;
        }

        const payload = {
            session: this.sessionId,
            timestamp: Date.now(),
            errors: errors,
            metadata: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                version: this.getAppVersion()
            }
        };

        const response = await fetch(this.options.reportingEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Falha no envio: ${response.status}`);
        }
    }

    // === Notificações ao Usuário ===
    
    notifyUser(errorRecord) {
        if (!window.notifications) return;
        
        const shouldNotify = errorRecord.level === 'error' && 
                           errorRecord.type !== 'console.warn';
        
        if (shouldNotify) {
            window.notifications.error(
                'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
                5000
            );
        }
    }

    // === Sanitização de Dados ===
    
    sanitizeArgs(args) {
        return args.map(arg => {
            if (typeof arg === 'string') {
                return this.sanitizeString(arg);
            }
            if (typeof arg === 'object') {
                return this.sanitizeObject(arg);
            }
            return arg;
        });
    }

    sanitizeString(str) {
        let sanitized = str;
        this.options.excludePersonalData.forEach(keyword => {
            const regex = new RegExp(`${keyword}[\\s]*[:=][\\s]*[^\\s,}]+`, 'gi');
            sanitized = sanitized.replace(regex, `${keyword}: [REDACTED]`);
        });
        return sanitized;
    }

    sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (this.options.excludePersonalData.some(keyword => 
                key.toLowerCase().includes(keyword.toLowerCase()))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'object') {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    sanitizeRecord(record) {
        // Sanitizar stack trace
        if (record.stack) {
            record.stack = record.stack.map(line => this.sanitizeString(line));
        }
        
        // Sanitizar URL
        if (record.url) {
            record.url = this.sanitizeUrl(record.url);
        }
        
        // Sanitizar mensagem
        if (record.message) {
            record.message = this.sanitizeString(record.message);
        }
    }

    sanitizeUrl(url) {
        try {
            const urlObj = new URL(url);
            // Remover parâmetros sensíveis
            this.options.excludePersonalData.forEach(param => {
                if (urlObj.searchParams.has(param)) {
                    urlObj.searchParams.set(param, '[REDACTED]');
                }
            });
            return urlObj.toString();
        } catch {
            return url;
        }
    }

    // === Utilitários ===
    
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateErrorId() {
        return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getUserId() {
        // Tentar obter ID do usuário do sistema de auth
        if (window.authManager && window.authManager.getCurrentUser) {
            const user = window.authManager.getCurrentUser();
            return user ? user.id : 'anonymous';
        }
        return 'anonymous';
    }

    getAppVersion() {
        // Tentar obter versão da aplicação
        return document.querySelector('meta[name="version"]')?.content || '1.0.0';
    }

    // === API Pública ===
    
    logError(message, extra = {}) {
        this.handleError({
            message,
            type: 'manual',
            level: 'error',
            ...extra
        });
    }

    logWarning(message, extra = {}) {
        this.handleError({
            message,
            type: 'manual',
            level: 'warning',
            ...extra
        });
    }

    logInfo(message, extra = {}) {
        this.handleError({
            message,
            type: 'manual',
            level: 'info',
            ...extra
        });
    }

    addBreadcrumb(message, category = 'action', data = {}) {
        if (!this.breadcrumbs) this.breadcrumbs = [];
        
        this.breadcrumbs.push({
            timestamp: Date.now(),
            message,
            category,
            data
        });
        
        // Limitar breadcrumbs
        if (this.breadcrumbs.length > 50) {
            this.breadcrumbs.shift();
        }
    }

    setUser(userInfo) {
        this.userInfo = userInfo;
    }

    setCustomData(key, value) {
        if (!this.customData) this.customData = {};
        this.customData[key] = value;
    }

    getErrorStats() {
        return {
            totalErrors: this.errorBuffer.length,
            errorCounts: Object.fromEntries(this.errorCounts),
            sessionId: this.sessionId,
            uptime: Date.now() - this.startTime,
            queueSize: this.errorQueue.length
        };
    }

    getStoredErrors() {
        try {
            return JSON.parse(localStorage.getItem('error-monitor-logs') || '[]');
        } catch {
            return [];
        }
    }

    clearStoredErrors() {
        localStorage.removeItem('error-monitor-logs');
        this.errorBuffer = [];
        this.errorQueue = [];
        this.errorCounts.clear();
    }

    // === Debugging ===
    
    logStats() {
        const stats = this.getErrorStats();
        console.group('[ErrorMonitor] Estatísticas de Erros');
        console.log('Total de erros:', stats.totalErrors);
        console.log('Erros na fila:', stats.queueSize);
        console.log('Sessão:', stats.sessionId);
        console.log('Uptime:', `${Math.round(stats.uptime / 1000)}s`);
        console.log('Contadores:', stats.errorCounts);
        console.groupEnd();
    }

    exportErrors() {
        const data = {
            errors: this.getStoredErrors(),
            stats: this.getErrorStats(),
            session: this.sessionId,
            timestamp: Date.now()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    destroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        
        // Flush final
        this.flush();
        
        console.log('[ErrorMonitor] Sistema destruído');
    }
}

// Classe para relatórios de erro customizados
class ErrorReporter {
    static reportNetworkError(url, status, response) {
        if (window.errorMonitor) {
            window.errorMonitor.logError(`Network Error: ${status} - ${url}`, {
                type: 'network',
                url,
                status,
                response
            });
        }
    }
    
    static reportAPIError(endpoint, error, requestData = {}) {
        if (window.errorMonitor) {
            window.errorMonitor.logError(`API Error: ${endpoint}`, {
                type: 'api',
                endpoint,
                error: error.message,
                requestData
            });
        }
    }
    
    static reportUserAction(action, success, details = {}) {
        if (window.errorMonitor) {
            const level = success ? 'info' : 'warning';
            window.errorMonitor.addBreadcrumb(`User ${action}`, 'user', {
                success,
                ...details
            });
            
            if (!success) {
                window.errorMonitor.logWarning(`User action failed: ${action}`, {
                    type: 'user_action',
                    action,
                    details
                });
            }
        }
    }
}

// Inicializar monitor global
window.addEventListener('DOMContentLoaded', () => {
    window.errorMonitor = new ErrorMonitor({
        // reportingEndpoint: '/api/errors', // Descomente para enviar erros
        onError: (error) => {
            console.log('[ErrorMonitor] Erro capturado:', error.message);
        }
    });
    
    // Adicionar breadcrumb de inicialização
    window.errorMonitor.addBreadcrumb('Application started', 'lifecycle');
});

// Funções globais de conveniência
window.logError = (message, extra) => {
    if (window.errorMonitor) {
        window.errorMonitor.logError(message, extra);
    }
};

window.logWarning = (message, extra) => {
    if (window.errorMonitor) {
        window.errorMonitor.logWarning(message, extra);
    }
};

window.addBreadcrumb = (message, category, data) => {
    if (window.errorMonitor) {
        window.errorMonitor.addBreadcrumb(message, category, data);
    }
};

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorMonitor, ErrorReporter };
} 
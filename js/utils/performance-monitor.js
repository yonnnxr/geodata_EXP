// Sistema de Monitoramento de Performance
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            vitals: {},
            custom: {},
            resources: {},
            navigation: {},
            memory: {}
        };
        
        this.observers = new Map();
        this.enabled = true;
        this.bufferSize = 100;
        this.metricsBuffer = [];
        
        this.init();
    }

    init() {
        if (!this.enabled) return;

        try {
            this.setupWebVitals();
            this.setupResourceObserver();
            this.setupNavigationObserver();
            this.setupMemoryMonitoring();
            this.setupCustomMetrics();
            this.startPeriodicReporting();
            
            console.log('[Performance] Monitoramento iniciado');
        } catch (error) {
            console.error('[Performance] Erro na inicialização:', error);
        }
    }

    // === Web Vitals (Core Web Vitals + outras métricas importantes) ===
    
    setupWebVitals() {
        // Largest Contentful Paint (LCP)
        this.observeMetric('largest-contentful-paint', (entry) => {
            this.recordVital('LCP', entry.startTime, {
                element: entry.element?.tagName,
                url: entry.url,
                renderTime: entry.renderTime || entry.loadTime
            });
        });

        // First Input Delay (FID)
        this.observeMetric('first-input', (entry) => {
            this.recordVital('FID', entry.processingStart - entry.startTime, {
                name: entry.name,
                target: entry.target?.tagName
            });
        });

        // Cumulative Layout Shift (CLS)
        this.observeMetric('layout-shift', (entry) => {
            if (!entry.hadRecentInput) {
                const currentCLS = this.metrics.vitals.CLS?.value || 0;
                this.recordVital('CLS', currentCLS + entry.value, {
                    sources: entry.sources?.map(s => s.node?.tagName)
                });
            }
        });

        // First Contentful Paint (FCP)
        this.observeMetric('paint', (entry) => {
            if (entry.name === 'first-contentful-paint') {
                this.recordVital('FCP', entry.startTime);
            }
        });

        // Time to First Byte (TTFB)
        this.measureTTFB();
    }

    observeMetric(type, callback) {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    callback(entry);
                }
            });
            
            observer.observe({ type, buffered: true });
            this.observers.set(type, observer);
        } catch (error) {
            console.warn(`[Performance] ${type} não suportado:`, error);
        }
    }

    measureTTFB() {
        if (performance.navigation && performance.timing) {
            const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
            this.recordVital('TTFB', ttfb);
        }
    }

    recordVital(name, value, details = {}) {
        this.metrics.vitals[name] = {
            value: Math.round(value),
            timestamp: Date.now(),
            details,
            rating: this.getRating(name, value)
        };

        this.bufferMetric('vital', { name, value, details });
        this.notifyIfPoorPerformance(name, value);
    }

    getRating(metric, value) {
        const thresholds = {
            'LCP': { good: 2500, poor: 4000 },
            'FID': { good: 100, poor: 300 },
            'CLS': { good: 0.1, poor: 0.25 },
            'FCP': { good: 1800, poor: 3000 },
            'TTFB': { good: 800, poor: 1800 }
        };

        const threshold = thresholds[metric];
        if (!threshold) return 'unknown';

        if (value <= threshold.good) return 'good';
        if (value <= threshold.poor) return 'needs-improvement';
        return 'poor';
    }

    // === Monitoramento de Recursos ===
    
    setupResourceObserver() {
        this.observeMetric('resource', (entry) => {
            this.recordResource(entry);
        });
    }

    recordResource(entry) {
        const resource = {
            name: entry.name,
            type: this.getResourceType(entry),
            duration: Math.round(entry.duration),
            size: entry.transferSize || 0,
            startTime: Math.round(entry.startTime),
            timing: {
                dns: Math.round(entry.domainLookupEnd - entry.domainLookupStart),
                tcp: Math.round(entry.connectEnd - entry.connectStart),
                request: Math.round(entry.responseStart - entry.requestStart),
                response: Math.round(entry.responseEnd - entry.responseStart)
            },
            cached: entry.transferSize === 0 && entry.decodedBodySize > 0
        };

        if (!this.metrics.resources[resource.type]) {
            this.metrics.resources[resource.type] = [];
        }

        this.metrics.resources[resource.type].push(resource);
        this.bufferMetric('resource', resource);

        // Alertar para recursos lentos
        if (resource.duration > 2000) {
            console.warn(`[Performance] Recurso lento detectado: ${resource.name} (${resource.duration}ms)`);
        }
    }

    getResourceType(entry) {
        if (entry.initiatorType) return entry.initiatorType;
        
        const url = entry.name.toLowerCase();
        if (url.includes('.css')) return 'css';
        if (url.includes('.js')) return 'script';
        if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) return 'img';
        if (url.includes('/api/')) return 'fetch';
        
        return 'other';
    }

    // === Navegação ===
    
    setupNavigationObserver() {
        this.observeMetric('navigation', (entry) => {
            this.recordNavigation(entry);
        });
    }

    recordNavigation(entry) {
        this.metrics.navigation = {
            type: entry.type,
            duration: Math.round(entry.duration),
            loadEventStart: Math.round(entry.loadEventStart),
            loadEventEnd: Math.round(entry.loadEventEnd),
            domContentLoaded: Math.round(entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart),
            timing: {
                redirect: Math.round(entry.redirectEnd - entry.redirectStart),
                dns: Math.round(entry.domainLookupEnd - entry.domainLookupStart),
                tcp: Math.round(entry.connectEnd - entry.connectStart),
                request: Math.round(entry.responseStart - entry.requestStart),
                response: Math.round(entry.responseEnd - entry.responseStart),
                processing: Math.round(entry.loadEventStart - entry.responseEnd)
            }
        };
    }

    // === Memória ===
    
    setupMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                this.recordMemoryUsage();
            }, 30000); // A cada 30 segundos
        }
    }

    recordMemoryUsage() {
        if (!('memory' in performance)) return;

        const memory = performance.memory;
        this.metrics.memory = {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
            timestamp: Date.now()
        };

        // Alertar para uso excessivo de memória
        const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usage > 80) {
            console.warn(`[Performance] Alto uso de memória: ${usage.toFixed(1)}%`);
        }
    }

    // === Métricas Customizadas ===
    
    setupCustomMetrics() {
        // Tempo de carregamento de autenticação
        this.startMeasure('auth-load');
        
        // Tempo de carregamento de dados
        this.startMeasure('data-load');
    }

    startMeasure(name) {
        if (performance.mark) {
            performance.mark(`${name}-start`);
        }
        
        if (!this.metrics.custom[name]) {
            this.metrics.custom[name] = {
                startTime: performance.now(),
                measurements: []
            };
        }
    }

    endMeasure(name, details = {}) {
        const custom = this.metrics.custom[name];
        if (!custom) return;

        const duration = performance.now() - custom.startTime;
        
        if (performance.mark && performance.measure) {
            performance.mark(`${name}-end`);
            performance.measure(name, `${name}-start`, `${name}-end`);
        }

        custom.measurements.push({
            duration: Math.round(duration),
            timestamp: Date.now(),
            details
        });

        this.bufferMetric('custom', { name, duration, details });
        
        console.log(`[Performance] ${name}: ${Math.round(duration)}ms`);
    }

    // === Análise e Relatórios ===
    
    bufferMetric(type, data) {
        this.metricsBuffer.push({
            type,
            data,
            timestamp: Date.now()
        });

        if (this.metricsBuffer.length > this.bufferSize) {
            this.metricsBuffer.shift();
        }
    }

    notifyIfPoorPerformance(metric, value) {
        const rating = this.getRating(metric, value);
        
        if (rating === 'poor' && window.notifications) {
            window.notifications.warning(
                `Performance degradada detectada: ${metric} = ${Math.round(value)}ms`,
                5000
            );
        }
    }

    getPerformanceSummary() {
        const summary = {
            vitals: this.metrics.vitals,
            score: this.calculatePerformanceScore(),
            recommendations: this.getRecommendations(),
            resources: this.getResourceSummary(),
            memory: this.metrics.memory,
            timestamp: Date.now()
        };

        return summary;
    }

    calculatePerformanceScore() {
        const vitals = this.metrics.vitals;
        let score = 100;
        let count = 0;

        // Penalizar based nos Web Vitals
        for (const [name, data] of Object.entries(vitals)) {
            count++;
            const rating = data.rating;
            
            if (rating === 'poor') score -= 30;
            else if (rating === 'needs-improvement') score -= 15;
        }

        return count > 0 ? Math.max(0, score) : null;
    }

    getRecommendations() {
        const recommendations = [];
        const vitals = this.metrics.vitals;

        // Recomendações baseadas nos Web Vitals
        if (vitals.LCP?.rating === 'poor') {
            recommendations.push({
                type: 'LCP',
                title: 'Otimizar Largest Contentful Paint',
                description: 'Considere otimizar imagens, usar CDN ou melhorar o servidor',
                priority: 'high'
            });
        }

        if (vitals.FID?.rating === 'poor') {
            recommendations.push({
                type: 'FID',
                title: 'Reduzir tempo de resposta',
                description: 'Minimize JavaScript, use Web Workers para tarefas pesadas',
                priority: 'high'
            });
        }

        if (vitals.CLS?.rating === 'poor') {
            recommendations.push({
                type: 'CLS',
                title: 'Estabilizar layout',
                description: 'Defina dimensões para imagens e evite inserção dinâmica de conteúdo',
                priority: 'medium'
            });
        }

        // Recomendações de recursos
        const slowResources = this.getSlowResources();
        if (slowResources.length > 0) {
            recommendations.push({
                type: 'Resources',
                title: 'Otimizar recursos lentos',
                description: `${slowResources.length} recursos carregando lentamente`,
                priority: 'medium',
                details: slowResources
            });
        }

        return recommendations;
    }

    getResourceSummary() {
        const summary = {};
        
        for (const [type, resources] of Object.entries(this.metrics.resources)) {
            const durations = resources.map(r => r.duration);
            const sizes = resources.map(r => r.size);
            
            summary[type] = {
                count: resources.length,
                avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
                totalSize: sizes.reduce((a, b) => a + b, 0),
                cached: resources.filter(r => r.cached).length
            };
        }

        return summary;
    }

    getSlowResources() {
        const slowResources = [];
        
        for (const resources of Object.values(this.metrics.resources)) {
            slowResources.push(...resources.filter(r => r.duration > 1000));
        }

        return slowResources.sort((a, b) => b.duration - a.duration);
    }

    // === Relatórios ===
    
    startPeriodicReporting() {
        // Relatório a cada 5 minutos
        setInterval(() => {
            this.generateReport();
        }, 5 * 60 * 1000);
    }

    generateReport() {
        const report = {
            summary: this.getPerformanceSummary(),
            details: this.metrics,
            buffer: this.metricsBuffer.slice(-20), // Últimas 20 métricas
            userAgent: navigator.userAgent,
            connection: this.getConnectionInfo()
        };

        // Salvar no localStorage para análise posterior
        this.saveReport(report);
        
        console.log('[Performance] Relatório gerado:', report);
        return report;
    }

    saveReport(report) {
        try {
            const reports = JSON.parse(localStorage.getItem('performance-reports') || '[]');
            reports.push(report);
            
            // Manter apenas os últimos 10 relatórios
            if (reports.length > 10) {
                reports.splice(0, reports.length - 10);
            }
            
            localStorage.setItem('performance-reports', JSON.stringify(reports));
        } catch (error) {
            console.error('[Performance] Erro ao salvar relatório:', error);
        }
    }

    getConnectionInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            return {
                effectiveType: conn.effectiveType,
                downlink: conn.downlink,
                rtt: conn.rtt,
                saveData: conn.saveData
            };
        }
        return null;
    }

    // === API Pública ===
    
    mark(name) {
        this.startMeasure(name);
    }

    measure(name, details) {
        this.endMeasure(name, details);
    }

    getMetrics() {
        return this.metrics;
    }

    getSavedReports() {
        try {
            return JSON.parse(localStorage.getItem('performance-reports') || '[]');
        } catch {
            return [];
        }
    }

    clearReports() {
        localStorage.removeItem('performance-reports');
    }

    enable() {
        this.enabled = true;
        this.init();
    }

    disable() {
        this.enabled = false;
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }

    // === Debug e Visualização ===
    
    logSummary() {
        const summary = this.getPerformanceSummary();
        console.group('[Performance] Resumo de Performance');
        console.log('Score:', summary.score);
        console.log('Web Vitals:', summary.vitals);
        console.log('Recursos:', summary.resources);
        console.log('Recomendações:', summary.recommendations);
        console.groupEnd();
    }

    exportData() {
        const data = {
            metrics: this.metrics,
            summary: this.getPerformanceSummary(),
            reports: this.getSavedReports(),
            timestamp: Date.now()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Inicializar monitor global
window.performanceMonitor = new PerformanceMonitor();

// Funções globais para facilitar uso
window.mark = (name) => window.performanceMonitor.mark(name);
window.measure = (name, details) => window.performanceMonitor.measure(name, details);

// Métricas específicas da aplicação
window.addEventListener('load', () => {
    window.measure('app-load', { page: window.location.pathname });
});

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
} 
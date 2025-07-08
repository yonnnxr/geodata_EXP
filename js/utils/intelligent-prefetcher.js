// Sistema de Prefetching Inteligente
class IntelligentPrefetcher {
    constructor(options = {}) {
        this.options = {
            maxConcurrent: options.maxConcurrent || 3,
            maxCacheSize: options.maxCacheSize || 50,
            priority: options.priority || 'low',
            timeout: options.timeout || 10000,
            retryAttempts: options.retryAttempts || 2,
            enabled: options.enabled !== false,
            adaptivePriority: options.adaptivePriority !== false,
            connectionAware: options.connectionAware !== false,
            userBehaviorTracking: options.userBehaviorTracking !== false,
            debug: options.debug || false
        };

        this.cache = new Map();
        this.prefetchQueue = [];
        this.activePrefetches = new Set();
        this.failedUrls = new Set();
        this.analytics = {
            hits: 0,
            misses: 0,
            prefetched: 0,
            bytes: 0,
            timesSaved: []
        };

        // User behavior tracking
        this.userPatterns = {
            clickedLinks: [],
            scrollBehavior: [],
            hoverDuration: new Map(),
            navigationPath: []
        };

        // Connection monitoring
        this.connectionInfo = {
            effectiveType: '4g',
            downlink: 10,
            rtt: 100,
            saveData: false
        };

        // Prediction models
        this.predictions = new Map();
        this.learningData = [];
        
        this.intersectionObserver = null;
        this.mutationObserver = null;
        
        this.init();
    }

    init() {
        if (!this.options.enabled) return;

        this.setupConnectionMonitoring();
        this.setupUserBehaviorTracking();
        this.setupLinkPrefetching();
        this.setupPredictiveModels();
        this.startPerformanceMonitoring();
        
        console.log('[IntelligentPrefetcher] Sistema inicializado');
    }

    // === Connection Monitoring ===

    setupConnectionMonitoring() {
        if (!this.options.connectionAware) return;

        // Network Information API
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            this.updateConnectionInfo(connection);
            
            connection.addEventListener('change', () => {
                this.updateConnectionInfo(connection);
                this.adjustPrefetchingStrategy();
            });
        }

        // Data Saver API
        if ('connection' in navigator && 'saveData' in navigator.connection) {
            this.connectionInfo.saveData = navigator.connection.saveData;
        }
    }

    updateConnectionInfo(connection) {
        this.connectionInfo = {
            effectiveType: connection.effectiveType || '4g',
            downlink: connection.downlink || 10,
            rtt: connection.rtt || 100,
            saveData: connection.saveData || false
        };

        if (this.options.debug) {
            console.log('[IntelligentPrefetcher] Conexão atualizada:', this.connectionInfo);
        }
    }

    adjustPrefetchingStrategy() {
        const { effectiveType, saveData, downlink } = this.connectionInfo;
        
        // Desabilitar em conexões lentas ou data saver
        if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
            this.pausePrefetching();
            return;
        }

        // Ajustar concorrência baseado na velocidade
        if (effectiveType === '3g' || downlink < 1.5) {
            this.options.maxConcurrent = 1;
        } else if (effectiveType === '4g' && downlink > 5) {
            this.options.maxConcurrent = 4;
        } else {
            this.options.maxConcurrent = 2;
        }

        this.resumePrefetching();
    }

    // === User Behavior Tracking ===

    setupUserBehaviorTracking() {
        if (!this.options.userBehaviorTracking) return;

        // Track clicks
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                this.recordClick(e.target.href, e.target);
            }
        });

        // Track hovers
        document.addEventListener('mouseover', (e) => {
            if (e.target.tagName === 'A') {
                this.startHoverTracking(e.target);
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.tagName === 'A') {
                this.endHoverTracking(e.target);
            }
        });

        // Track scroll behavior
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.recordScrollBehavior();
            }, 100);
        });

        // Track navigation
        this.recordNavigation();
    }

    recordClick(href, element) {
        const clickData = {
            url: href,
            timestamp: Date.now(),
            elementText: element.textContent.trim(),
            position: this.getElementPosition(element),
            scrollPosition: window.scrollY
        };

        this.userPatterns.clickedLinks.push(clickData);
        this.learnFromClick(clickData);
        
        // Manter apenas os últimos 100 cliques
        if (this.userPatterns.clickedLinks.length > 100) {
            this.userPatterns.clickedLinks.shift();
        }
    }

    startHoverTracking(element) {
        this.hoverStartTime = Date.now();
        this.hoveredElement = element;
    }

    endHoverTracking(element) {
        if (this.hoveredElement === element && this.hoverStartTime) {
            const duration = Date.now() - this.hoverStartTime;
            this.userPatterns.hoverDuration.set(element.href, duration);
            
            // Prefetch se hover foi longo (indica interesse)
            if (duration > 300) {
                this.queuePrefetch(element.href, 'hover', { priority: 'high' });
            }
        }
    }

    recordScrollBehavior() {
        const scrollData = {
            position: window.scrollY,
            timestamp: Date.now(),
            direction: this.getScrollDirection(),
            speed: this.getScrollSpeed()
        };

        this.userPatterns.scrollBehavior.push(scrollData);
        
        // Prefetch visible links
        this.prefetchVisibleLinks();
        
        // Manter apenas os últimos 50 registros de scroll
        if (this.userPatterns.scrollBehavior.length > 50) {
            this.userPatterns.scrollBehavior.shift();
        }
    }

    recordNavigation() {
        const currentPath = window.location.pathname;
        this.userPatterns.navigationPath.push({
            path: currentPath,
            timestamp: Date.now()
        });

        // Prever próximas páginas baseado no histórico
        this.updateNavigationPredictions();
    }

    // === Link Prefetching ===

    setupLinkPrefetching() {
        // Intersection Observer para links
        if (window.IntersectionObserver) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const link = entry.target;
                        if (link.href && this.shouldPrefetch(link.href)) {
                            this.queuePrefetch(link.href, 'viewport', { 
                                priority: 'low',
                                delay: 1000 
                            });
                        }
                    }
                });
            }, {
                rootMargin: '100px'
            });
        }

        // Mutation Observer para novos links
        if (window.MutationObserver) {
            this.mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.observeLinks(node);
                        }
                    });
                });
            });
            
            this.mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Observar links existentes
        this.observeLinks(document);
    }

    observeLinks(container) {
        const links = container.querySelectorAll('a[href]');
        links.forEach(link => {
            if (this.intersectionObserver) {
                this.intersectionObserver.observe(link);
            }
        });
    }

    prefetchVisibleLinks() {
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            if (this.isElementVisible(link) && this.shouldPrefetch(link.href)) {
                this.queuePrefetch(link.href, 'visible', { priority: 'medium' });
            }
        });
    }

    // === Predictive Models ===

    setupPredictiveModels() {
        // Model de navegação sequencial
        this.sequentialModel = new Map();
        
        // Model de padrões temporais
        this.temporalModel = new Map();
        
        // Model de similaridade de conteúdo
        this.contentModel = new Map();
    }

    learnFromClick(clickData) {
        // Aprender padrões sequenciais
        this.updateSequentialModel(clickData);
        
        // Aprender padrões temporais
        this.updateTemporalModel(clickData);
        
        // Atualizar predições
        this.updatePredictions();
    }

    updateSequentialModel(clickData) {
        const previousClicks = this.userPatterns.clickedLinks.slice(-3);
        
        if (previousClicks.length >= 2) {
            const pattern = previousClicks.map(click => this.extractPageType(click.url)).join(' -> ');
            const nextPage = this.extractPageType(clickData.url);
            
            if (!this.sequentialModel.has(pattern)) {
                this.sequentialModel.set(pattern, new Map());
            }
            
            const patternData = this.sequentialModel.get(pattern);
            patternData.set(nextPage, (patternData.get(nextPage) || 0) + 1);
        }
    }

    updateTemporalModel(clickData) {
        const hour = new Date(clickData.timestamp).getHours();
        const pageType = this.extractPageType(clickData.url);
        
        if (!this.temporalModel.has(hour)) {
            this.temporalModel.set(hour, new Map());
        }
        
        const hourData = this.temporalModel.get(hour);
        hourData.set(pageType, (hourData.get(pageType) || 0) + 1);
    }

    updateNavigationPredictions() {
        const recentPath = this.userPatterns.navigationPath.slice(-3);
        
        if (recentPath.length >= 2) {
            const pattern = recentPath.map(nav => nav.path).join(' -> ');
            const predictions = this.predictNextPages(pattern);
            
            predictions.forEach(prediction => {
                if (prediction.confidence > 0.5) {
                    this.queuePrefetch(prediction.url, 'prediction', {
                        priority: prediction.confidence > 0.8 ? 'high' : 'medium'
                    });
                }
            });
        }
    }

    predictNextPages(pattern) {
        const predictions = [];
        
        // Usar modelo sequencial
        if (this.sequentialModel.has(pattern)) {
            const patternData = this.sequentialModel.get(pattern);
            const totalOccurrences = Array.from(patternData.values()).reduce((a, b) => a + b, 0);
            
            patternData.forEach((count, pageType) => {
                const confidence = count / totalOccurrences;
                predictions.push({
                    url: this.pageTypeToUrl(pageType),
                    confidence,
                    reason: 'sequential_pattern'
                });
            });
        }
        
        return predictions.sort((a, b) => b.confidence - a.confidence);
    }

    // === Prefetch Queue Management ===

    queuePrefetch(url, trigger, options = {}) {
        if (!this.shouldPrefetch(url)) return false;

        const priority = options.priority || this.calculatePriority(url, trigger);
        const delay = options.delay || 0;
        
        const prefetchItem = {
            url,
            trigger,
            priority,
            queueTime: Date.now(),
            attempts: 0,
            delay
        };

        // Verificar se já está na fila ou cache
        if (this.cache.has(url) || this.isInQueue(url) || this.activePrefetches.has(url)) {
            return false;
        }

        this.prefetchQueue.push(prefetchItem);
        this.sortPrefetchQueue();
        
        if (delay > 0) {
            setTimeout(() => this.processPrefetchQueue(), delay);
        } else {
            this.processPrefetchQueue();
        }

        return true;
    }

    shouldPrefetch(url) {
        try {
            const urlObj = new URL(url, window.location.origin);
            
            // Apenas prefetch do mesmo domínio
            if (urlObj.origin !== window.location.origin) return false;
            
            // Não prefetch da página atual
            if (urlObj.pathname === window.location.pathname) return false;
            
            // Verificar se falhou recentemente
            if (this.failedUrls.has(url)) return false;
            
            // Verificar se já está no cache
            if (this.cache.has(url)) return false;
            
            // Verificar se é um tipo de arquivo suportado
            const supportedTypes = ['.html', '.json', '.css', '.js'];
            const hasExtension = supportedTypes.some(ext => 
                urlObj.pathname.endsWith(ext) || urlObj.pathname.includes(ext)
            );
            
            // Se não tem extensão, assume que é uma página HTML
            return !urlObj.pathname.includes('.') || hasExtension;
            
        } catch (error) {
            return false;
        }
    }

    calculatePriority(url, trigger) {
        if (!this.options.adaptivePriority) return 'medium';

        let score = 0;
        
        // Pontuação baseada no trigger
        const triggerScores = {
            'hover': 0.8,
            'prediction': 0.7,
            'visible': 0.5,
            'viewport': 0.3,
            'manual': 1.0
        };
        
        score += triggerScores[trigger] || 0.5;
        
        // Pontuação baseada no histórico do usuário
        const clickHistory = this.userPatterns.clickedLinks
            .filter(click => click.url === url).length;
        score += Math.min(clickHistory * 0.1, 0.3);
        
        // Pontuação baseada na posição na página
        const links = Array.from(document.querySelectorAll(`a[href="${url}"]`));
        if (links.length > 0) {
            const avgPosition = links.reduce((sum, link) => {
                const rect = link.getBoundingClientRect();
                return sum + rect.top;
            }, 0) / links.length;
            
            // Links mais próximos do topo têm prioridade maior
            score += Math.max(0, (1000 - avgPosition) / 1000) * 0.2;
        }
        
        // Converter score para prioridade
        if (score >= 0.8) return 'high';
        if (score >= 0.6) return 'medium';
        return 'low';
    }

    sortPrefetchQueue() {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        
        this.prefetchQueue.sort((a, b) => {
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            
            // Se mesma prioridade, ordena por tempo
            return a.queueTime - b.queueTime;
        });
    }

    processPrefetchQueue() {
        if (this.activePrefetches.size >= this.options.maxConcurrent) return;
        if (this.prefetchQueue.length === 0) return;

        const item = this.prefetchQueue.shift();
        if (!item) return;

        this.executePrefetch(item);
    }

    async executePrefetch(item) {
        const { url, trigger } = item;
        
        if (this.activePrefetches.has(url)) return;
        
        this.activePrefetches.add(url);
        
        try {
            const startTime = performance.now();
            const response = await this.fetchResource(url);
            const endTime = performance.now();
            
            if (response.ok) {
                const content = await response.text();
                
                this.cache.set(url, {
                    content,
                    contentType: response.headers.get('content-type'),
                    size: content.length,
                    cachedAt: Date.now(),
                    trigger,
                    fetchTime: endTime - startTime
                });
                
                this.analytics.prefetched++;
                this.analytics.bytes += content.length;
                
                // Limpar cache se necessário
                this.manageCacheSize();
                
                if (this.options.debug) {
                    console.log(`[IntelligentPrefetcher] Prefetched: ${url} (${trigger}, ${(endTime - startTime).toFixed(2)}ms)`);
                }
                
            } else {
                this.handlePrefetchError(item, `HTTP ${response.status}`);
            }
            
        } catch (error) {
            this.handlePrefetchError(item, error.message);
        } finally {
            this.activePrefetches.delete(url);
            
            // Processar próximo item da fila
            setTimeout(() => this.processPrefetchQueue(), 10);
        }
    }

    async fetchResource(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                priority: this.options.priority,
                credentials: 'same-origin',
                headers: {
                    'X-Prefetch': 'true'
                }
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    handlePrefetchError(item, error) {
        item.attempts++;
        
        if (item.attempts <= this.options.retryAttempts) {
            // Recolocar na fila com prioridade baixa
            item.priority = 'low';
            this.prefetchQueue.push(item);
        } else {
            // Marcar como falhado
            this.failedUrls.add(item.url);
            
            // Remover da lista de falhas após um tempo
            setTimeout(() => {
                this.failedUrls.delete(item.url);
            }, 300000); // 5 minutos
        }
        
        if (this.options.debug) {
            console.warn(`[IntelligentPrefetcher] Erro ao prefetch ${item.url}:`, error);
        }
    }

    // === Cache Management ===

    manageCacheSize() {
        if (this.cache.size <= this.options.maxCacheSize) return;
        
        // Remover itens mais antigos primeiro
        const cacheEntries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].cachedAt - b[1].cachedAt);
        
        const toRemove = cacheEntries.slice(0, cacheEntries.length - this.options.maxCacheSize);
        
        toRemove.forEach(([url]) => {
            this.cache.delete(url);
        });
    }

    getCached(url) {
        const cached = this.cache.get(url);
        
        if (cached) {
            this.analytics.hits++;
            
            // Registrar tempo economizado
            const savedTime = cached.fetchTime;
            this.analytics.timesSaved.push(savedTime);
            
            if (this.options.debug) {
                console.log(`[IntelligentPrefetcher] Cache hit: ${url} (saved ${savedTime.toFixed(2)}ms)`);
            }
            
            return cached;
        } else {
            this.analytics.misses++;
            return null;
        }
    }

    // === Performance Monitoring ===

    startPerformanceMonitoring() {
        // Monitor navigation timing para medir efetividade
        if ('performance' in window && 'getEntriesByType' in performance) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.entryType === 'navigation') {
                        this.analyzeNavigationTiming(entry);
                    }
                });
            });
            
            try {
                observer.observe({ entryTypes: ['navigation'] });
            } catch (error) {
                // Fallback para browsers mais antigos
                window.addEventListener('load', () => {
                    this.analyzeNavigationTiming(performance.timing);
                });
            }
        }
    }

    analyzeNavigationTiming(timing) {
        // Analisar se a página atual foi prefetched
        const currentUrl = window.location.href;
        const cached = this.cache.get(currentUrl);
        
        if (cached) {
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            const savedTime = cached.fetchTime;
            
            if (window.performanceMonitor) {
                window.performanceMonitor.logCustomMetric('prefetch_effectiveness', savedTime, {
                    totalLoadTime: loadTime,
                    trigger: cached.trigger
                });
            }
        }
    }

    // === Utility Methods ===

    extractPageType(url) {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;
            
            if (path.includes('/admin')) return 'admin';
            if (path.includes('/map')) return 'map';
            if (path.includes('/stats') || path.includes('/estatisticas')) return 'stats';
            if (path.includes('/config') || path.includes('/configuracoes')) return 'config';
            if (path === '/' || path.includes('/home') || path.includes('/inicial')) return 'home';
            
            return 'other';
        } catch {
            return 'unknown';
        }
    }

    pageTypeToUrl(pageType) {
        const urlMap = {
            'admin': '/admin.html',
            'map': '/map.html',
            'stats': '/estatisticas.html',
            'config': '/configuracoes.html',
            'home': '/pagina_inicial.html'
        };
        
        return urlMap[pageType] || '/';
    }

    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.top <= window.innerHeight;
    }

    getScrollDirection() {
        const currentScroll = window.scrollY;
        const direction = currentScroll > (this.lastScrollPosition || 0) ? 'down' : 'up';
        this.lastScrollPosition = currentScroll;
        return direction;
    }

    getScrollSpeed() {
        const currentTime = Date.now();
        const currentScroll = window.scrollY;
        
        if (this.lastScrollTime && this.lastScrollPosition !== undefined) {
            const timeDiff = currentTime - this.lastScrollTime;
            const scrollDiff = Math.abs(currentScroll - this.lastScrollPosition);
            return scrollDiff / timeDiff; // pixels per ms
        }
        
        this.lastScrollTime = currentTime;
        return 0;
    }

    isInQueue(url) {
        return this.prefetchQueue.some(item => item.url === url);
    }

    // === Public API ===

    prefetch(url, options = {}) {
        return this.queuePrefetch(url, 'manual', options);
    }

    warmupPages(urls) {
        urls.forEach(url => {
            this.queuePrefetch(url, 'warmup', { priority: 'medium' });
        });
    }

    getAnalytics() {
        const hitRate = this.analytics.hits / (this.analytics.hits + this.analytics.misses) || 0;
        const avgTimeSaved = this.analytics.timesSaved.length > 0 
            ? this.analytics.timesSaved.reduce((a, b) => a + b, 0) / this.analytics.timesSaved.length 
            : 0;
        
        return {
            ...this.analytics,
            hitRate: (hitRate * 100).toFixed(2) + '%',
            avgTimeSaved: avgTimeSaved.toFixed(2) + 'ms',
            cacheSize: this.cache.size,
            queueSize: this.prefetchQueue.length,
            activePrefetches: this.activePrefetches.size
        };
    }

    pausePrefetching() {
        this.options.enabled = false;
        
        // Cancelar prefetches ativos
        this.activePrefetches.clear();
        this.prefetchQueue = [];
    }

    resumePrefetching() {
        this.options.enabled = true;
    }

    clearCache() {
        this.cache.clear();
        this.analytics.hits = 0;
        this.analytics.misses = 0;
    }

    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        this.clearCache();
        this.prefetchQueue = [];
        this.activePrefetches.clear();
        
        console.log('[IntelligentPrefetcher] Sistema destruído');
    }
}

// Inicializar automaticamente
window.addEventListener('DOMContentLoaded', () => {
    window.intelligentPrefetcher = new IntelligentPrefetcher({
        debug: localStorage.getItem('debugMode') === 'true'
    });
    
    // API global
    window.prefetchPage = (url, options) => {
        return window.intelligentPrefetcher.prefetch(url, options);
    };
    
    window.warmupPages = (urls) => {
        return window.intelligentPrefetcher.warmupPages(urls);
    };
});

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntelligentPrefetcher;
} 
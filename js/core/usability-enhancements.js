// Integração dos Sistemas de Melhorias de Usabilidade e Velocidade
class UsabilityEnhancements {
    constructor(options = {}) {
        this.options = {
            enableKeyboardShortcuts: options.enableKeyboardShortcuts !== false,
            enableSkeletonLoader: options.enableSkeletonLoader !== false,
            enableVirtualScrolling: options.enableVirtualScrolling !== false,
            enableIntelligentPrefetcher: options.enableIntelligentPrefetcher !== false,
            enableMicroInteractions: options.enableMicroInteractions !== false,
            enableThemeSystem: options.enableThemeSystem !== false,
            debug: options.debug || false,
            autoInitialize: options.autoInitialize !== false
        };

        this.systems = {};
        this.initialized = false;
        
        if (this.options.autoInitialize) {
            this.init();
        }
    }

    init() {
        if (this.initialized) return;

        console.log('[UsabilityEnhancements] Inicializando sistemas de melhorias...');
        
        // Inicializar sistemas em ordem de dependência
        this.initializeKeyboardShortcuts();
        this.initializeSkeletonLoader();
        this.initializeVirtualScrolling();
        this.initializeIntelligentPrefetcher();
        this.initializeMicroInteractions();
        this.initializeThemeSystem();
        
        // Configurar integrações entre sistemas
        this.setupIntegrations();
        
        // Configurar eventos globais
        this.setupGlobalEvents();
        
        // Registrar no window para acesso global
        window.usabilityEnhancements = this;
        
        this.initialized = true;
        
        console.log('[UsabilityEnhancements] Todos os sistemas inicializados com sucesso');
        
        // Notificar inicialização completa
        this.notifyInitializationComplete();
    }

    // === Inicialização dos Sistemas ===

    initializeKeyboardShortcuts() {
        if (!this.options.enableKeyboardShortcuts) return;
        
        try {
            this.systems.keyboardShortcuts = window.keyboardShortcuts || new KeyboardShortcuts({
                debug: this.options.debug
            });
            
            // Registrar atalhos específicos para nossos sistemas
            this.registerCustomShortcuts();
            
            console.log('[UsabilityEnhancements] ✓ Sistema de atalhos de teclado inicializado');
        } catch (error) {
            console.error('[UsabilityEnhancements] Erro ao inicializar atalhos de teclado:', error);
        }
    }

    initializeSkeletonLoader() {
        if (!this.options.enableSkeletonLoader) return;
        
        try {
            this.systems.skeletonLoader = window.skeletonLoader || new SkeletonLoader({
                debug: this.options.debug
            });
            
            console.log('[UsabilityEnhancements] ✓ Sistema de skeleton loader inicializado');
        } catch (error) {
            console.error('[UsabilityEnhancements] Erro ao inicializar skeleton loader:', error);
        }
    }

    initializeVirtualScrolling() {
        if (!this.options.enableVirtualScrolling) return;
        
        try {
            // Virtual scrolling será inicializado sob demanda para containers específicos
            this.systems.virtualScrolling = {
                createScroller: (container, options) => new VirtualScroller(container, options),
                activeScrollers: new Map()
            };
            
            // Auto-detectar listas grandes e aplicar virtualização
            this.autoDetectLargeLists();
            
            console.log('[UsabilityEnhancements] ✓ Sistema de virtual scrolling preparado');
        } catch (error) {
            console.error('[UsabilityEnhancements] Erro ao preparar virtual scrolling:', error);
        }
    }

    initializeIntelligentPrefetcher() {
        if (!this.options.enableIntelligentPrefetcher) return;
        
        try {
            this.systems.intelligentPrefetcher = window.intelligentPrefetcher || new IntelligentPrefetcher({
                debug: this.options.debug
            });
            
            console.log('[UsabilityEnhancements] ✓ Sistema de prefetching inteligente inicializado');
        } catch (error) {
            console.error('[UsabilityEnhancements] Erro ao inicializar prefetching:', error);
        }
    }

    initializeMicroInteractions() {
        if (!this.options.enableMicroInteractions) return;
        
        try {
            this.systems.microInteractions = window.microInteractions || new MicroInteractions({
                debug: this.options.debug
            });
            
            console.log('[UsabilityEnhancements] ✓ Sistema de micro-interações inicializado');
        } catch (error) {
            console.error('[UsabilityEnhancements] Erro ao inicializar micro-interações:', error);
        }
    }

    initializeThemeSystem() {
        if (!this.options.enableThemeSystem) return;
        
        try {
            this.systems.themeSystem = window.themeSystem || new ThemeSystem({
                debug: this.options.debug,
                onThemeChange: (themeId, resolvedThemeId, theme, oldTheme) => {
                    this.handleThemeChange(themeId, resolvedThemeId, theme, oldTheme);
                }
            });
            
            console.log('[UsabilityEnhancements] ✓ Sistema de temas inicializado');
        } catch (error) {
            console.error('[UsabilityEnhancements] Erro ao inicializar sistema de temas:', error);
        }
    }

    // === Configuração de Integrações ===

    setupIntegrations() {
        // Integração Skeleton Loader + Virtual Scrolling
        this.integrateSkeletonWithVirtualScroll();
        
        // Integração Prefetcher + Theme System
        this.integratePrefetcherWithThemes();
        
        // Integração Micro Interactions + Keyboard Shortcuts
        this.integrateMicroInteractionsWithShortcuts();
        
        // Integração Performance Monitor
        this.integratePerformanceMonitoring();
    }

    integrateSkeletonWithVirtualScroll() {
        if (!this.systems.skeletonLoader || !this.systems.virtualScrolling) return;
        
        // Mostrar skeleton enquanto virtual scroller está carregando dados
        const originalCreateScroller = this.systems.virtualScrolling.createScroller;
        
        this.systems.virtualScrolling.createScroller = (container, options = {}) => {
            const targetElement = typeof container === 'string' ? document.querySelector(container) : container;
            
            if (targetElement && options.data && options.data.length > 100) {
                // Mostrar skeleton para listas grandes
                const skeletonId = this.systems.skeletonLoader.showList(container, 10);
                
                // Configurar callback para remover skeleton quando dados estiverem prontos
                const originalSetData = options.onDataReady || (() => {});
                options.onDataReady = () => {
                    this.systems.skeletonLoader.hide(skeletonId);
                    originalSetData();
                };
            }
            
            return originalCreateScroller(container, options);
        };
    }

    integratePrefetcherWithThemes() {
        if (!this.systems.intelligentPrefetcher || !this.systems.themeSystem) return;
        
        // Prefetch recursos específicos do tema
        const themeAssets = {
            'dark': ['/css/dark-theme-assets.css'],
            'light': ['/css/light-theme-assets.css'],
            'high-contrast': ['/css/high-contrast-assets.css']
        };
        
        // Quando tema mudar, prefetch assets relacionados
        this.systems.themeSystem.options.onThemeChange = (themeId, resolvedThemeId) => {
            const assets = themeAssets[resolvedThemeId];
            if (assets) {
                assets.forEach(asset => {
                    this.systems.intelligentPrefetcher.prefetch(asset, { priority: 'high' });
                });
            }
        };
    }

    integrateMicroInteractionsWithShortcuts() {
        if (!this.systems.microInteractions || !this.systems.keyboardShortcuts) return;
        
        // Feedback visual para atalhos de teclado
        const originalExecuteShortcut = this.systems.keyboardShortcuts.executeShortcut;
        
        this.systems.keyboardShortcuts.executeShortcut = function(shortcut, event) {
            // Feedback háptico para atalhos importantes
            if (window.usabilityEnhancements.systems.microInteractions) {
                window.usabilityEnhancements.systems.microInteractions.triggerHapticFeedback('light');
            }
            
            return originalExecuteShortcut.call(this, shortcut, event);
        };
    }

    integratePerformanceMonitoring() {
        // Monitorar performance de todos os sistemas
        if (window.performanceMonitor) {
            // Métricas de atalhos de teclado
            if (this.systems.keyboardShortcuts) {
                const originalExecute = this.systems.keyboardShortcuts.executeShortcut;
                this.systems.keyboardShortcuts.executeShortcut = function(shortcut, event) {
                    const start = performance.now();
                    const result = originalExecute.call(this, shortcut, event);
                    const duration = performance.now() - start;
                    
                    window.performanceMonitor.logCustomMetric('keyboard_shortcut_execution', duration, {
                        shortcut: shortcut.key
                    });
                    
                    return result;
                };
            }
            
            // Métricas de mudança de tema
            if (this.systems.themeSystem) {
                const originalApplyTheme = this.systems.themeSystem.applyTheme;
                this.systems.themeSystem.applyTheme = function(themeId) {
                    const start = performance.now();
                    const result = originalApplyTheme.call(this, themeId);
                    const duration = performance.now() - start;
                    
                    window.performanceMonitor.logCustomMetric('theme_application', duration, {
                        theme: themeId
                    });
                    
                    return result;
                };
            }
        }
    }

    // === Configuração de Eventos Globais ===

    setupGlobalEvents() {
        // Evento de visibilidade da página para pausar/retomar sistemas
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseSystems();
            } else {
                this.resumeSystems();
            }
        });
        
        // Evento de mudança de orientação para recalcular layouts
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        // Evento de resize para otimizações
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 150);
        });
        
        // Evento customizado para comunicação entre sistemas
        window.addEventListener('usability-event', (e) => {
            this.handleUsabilityEvent(e.detail);
        });
    }

    // === Métodos de Atalhos Customizados ===

    registerCustomShortcuts() {
        if (!this.systems.keyboardShortcuts) return;
        
        // Atalho para alternar tema
        this.systems.keyboardShortcuts.register('ctrl+shift+t', () => {
            if (this.systems.themeSystem) {
                this.systems.themeSystem.toggleTheme();
            }
        }, {
            description: 'Alternar tema claro/escuro',
            category: 'Sistema'
        });
        
        // Atalho para mostrar métricas de performance
        this.systems.keyboardShortcuts.register('ctrl+shift+p', () => {
            this.showPerformanceReport();
        }, {
            description: 'Mostrar relatório de performance',
            category: 'Desenvolvimento'
        });
        
        // Atalho para limpar cache
        this.systems.keyboardShortcuts.register('ctrl+shift+c', () => {
            this.clearAllCaches();
        }, {
            description: 'Limpar todos os caches',
            category: 'Sistema'
        });
        
        // Atalho para toggle de todas as animações
        this.systems.keyboardShortcuts.register('ctrl+shift+a', () => {
            this.toggleAllAnimations();
        }, {
            description: 'Ligar/desligar animações',
            category: 'Acessibilidade'
        });
    }

    // === Auto-detecção e Otimizações ===

    autoDetectLargeLists() {
        if (!this.systems.virtualScrolling) return;
        
        // Observar listas que podem se beneficiar de virtualização
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.checkForLargeLists(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Verificar listas existentes
        this.checkForLargeLists(document);
    }

    checkForLargeLists(container) {
        const listSelectors = [
            'ul:has(li:nth-child(50))',
            'ol:has(li:nth-child(50))',
            '.list-container:has(.list-item:nth-child(50))',
            'table tbody:has(tr:nth-child(50))'
        ];
        
        listSelectors.forEach(selector => {
            try {
                const lists = container.querySelectorAll ? container.querySelectorAll(selector) : [];
                lists.forEach(list => {
                    if (!list.hasAttribute('data-virtualized')) {
                        this.optimizeList(list);
                    }
                });
            } catch (error) {
                // Selector não suportado em alguns browsers
            }
        });
    }

    optimizeList(listElement) {
        const itemCount = listElement.children.length;
        
        if (itemCount < 50) return; // Não vale a pena virtualizar
        
        console.log(`[UsabilityEnhancements] Virtualizando lista com ${itemCount} itens`);
        
        // Converter para virtual scroller
        const items = Array.from(listElement.children).map(child => ({
            content: child.outerHTML,
            height: child.offsetHeight || 50
        }));
        
        const scroller = this.systems.virtualScrolling.createScroller(listElement, {
            itemHeight: items[0]?.height || 50,
            renderItem: (item) => item.content,
            dynamicHeight: true
        });
        
        scroller.setData(items);
        listElement.setAttribute('data-virtualized', 'true');
    }

    // === Event Handlers ===

    handleThemeChange(themeId, resolvedThemeId, theme, oldTheme) {
        // Notificar outros sistemas sobre mudança de tema
        if (this.systems.microInteractions) {
            this.systems.microInteractions.triggerHapticFeedback('light');
        }
        
        // Atualizar skeleton loader para o novo tema
        if (this.systems.skeletonLoader) {
            this.systems.skeletonLoader.options.darkMode = resolvedThemeId === 'dark';
            this.systems.skeletonLoader.updateStyles();
        }
        
        // Disparar evento customizado
        window.dispatchEvent(new CustomEvent('theme-changed', {
            detail: { themeId, resolvedThemeId, theme, oldTheme }
        }));
    }

    handleOrientationChange() {
        // Reajustar virtual scrollers
        if (this.systems.virtualScrolling) {
            this.systems.virtualScrolling.activeScrollers.forEach(scroller => {
                scroller.handleResize();
            });
        }
        
        // Reposicionar elementos de micro-interações
        if (this.systems.microInteractions) {
            // Limpar indicadores posicionais
            document.querySelectorAll('.micro-focus-indicator').forEach(el => el.remove());
        }
    }

    handleResize() {
        // Otimizar performance durante resize
        this.pauseSystems();
        
        setTimeout(() => {
            this.resumeSystems();
            
            // Recalcular virtual scrollers
            if (this.systems.virtualScrolling) {
                this.systems.virtualScrolling.activeScrollers.forEach(scroller => {
                    scroller.updateContainerDimensions();
                    scroller.calculateVisibleRange();
                    scroller.render();
                });
            }
        }, 100);
    }

    handleUsabilityEvent(eventData) {
        const { type, data } = eventData;
        
        switch (type) {
            case 'show-skeleton':
                if (this.systems.skeletonLoader) {
                    this.systems.skeletonLoader.show(data.container, data.template, data.options);
                }
                break;
                
            case 'hide-skeleton':
                if (this.systems.skeletonLoader) {
                    this.systems.skeletonLoader.hide(data.skeletonId, data.options);
                }
                break;
                
            case 'prefetch-resources':
                if (this.systems.intelligentPrefetcher) {
                    data.urls.forEach(url => {
                        this.systems.intelligentPrefetcher.prefetch(url, data.options);
                    });
                }
                break;
                
            case 'apply-theme':
                if (this.systems.themeSystem) {
                    this.systems.themeSystem.applyTheme(data.themeId);
                }
                break;
        }
    }

    // === Métodos de Controle ===

    pauseSystems() {
        if (this.systems.intelligentPrefetcher) {
            this.systems.intelligentPrefetcher.pausePrefetching();
        }
        
        if (this.systems.microInteractions) {
            this.systems.microInteractions.pauseAnimations();
        }
    }

    resumeSystems() {
        if (this.systems.intelligentPrefetcher) {
            this.systems.intelligentPrefetcher.resumePrefetching();
        }
        
        if (this.systems.microInteractions) {
            this.systems.microInteractions.resumeAnimations();
        }
    }

    toggleAllAnimations() {
        const disabled = document.body.classList.contains('animations-disabled');
        
        if (disabled) {
            document.body.classList.remove('animations-disabled');
            this.resumeSystems();
            
            if (window.notifications) {
                window.notifications.info('Animações ativadas');
            }
        } else {
            document.body.classList.add('animations-disabled');
            this.pauseSystems();
            
            if (window.notifications) {
                window.notifications.info('Animações desativadas');
            }
        }
    }

    clearAllCaches() {
        // Limpar cache do prefetcher
        if (this.systems.intelligentPrefetcher) {
            this.systems.intelligentPrefetcher.clearCache();
        }
        
        // Limpar cache do service worker
        if (window.swManager) {
            window.swManager.clearCache('all');
        }
        
        // Limpar localStorage relacionado aos sistemas
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('app-') || key.startsWith('usability-')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        if (window.notifications) {
            window.notifications.success('Cache limpo com sucesso');
        }
    }

    showPerformanceReport() {
        const report = this.generatePerformanceReport();
        
        // Mostrar em modal ou console
        if (window.notifications) {
            window.notifications.info(`Performance Report disponível no console`, 5000);
        }
        
        console.group('📊 Relatório de Performance - Usability Enhancements');
        console.table(report.systems);
        console.log('Métricas gerais:', report.general);
        console.log('Recomendações:', report.recommendations);
        console.groupEnd();
        
        return report;
    }

    generatePerformanceReport() {
        const report = {
            systems: {},
            general: {},
            recommendations: []
        };
        
        // Métricas dos sistemas
        if (this.systems.intelligentPrefetcher) {
            report.systems.prefetcher = this.systems.intelligentPrefetcher.getAnalytics();
        }
        
        if (this.systems.virtualScrolling) {
            report.systems.virtualScrolling = {
                activeScrollers: this.systems.virtualScrolling.activeScrollers.size,
                totalItemsVirtualized: Array.from(this.systems.virtualScrolling.activeScrollers.values())
                    .reduce((total, scroller) => total + scroller.data.length, 0)
            };
        }
        
        if (this.systems.keyboardShortcuts) {
            report.systems.keyboardShortcuts = {
                registeredShortcuts: this.systems.keyboardShortcuts.getShortcuts().length,
                enabled: this.systems.keyboardShortcuts.isEnabled()
            };
        }
        
        // Métricas gerais
        report.general = {
            memoryUsage: performance.memory ? {
                used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
                total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
            } : 'Não disponível',
            loadTime: (performance.timing.loadEventEnd - performance.timing.navigationStart) + 'ms',
            systemsLoaded: Object.keys(this.systems).length
        };
        
        // Recomendações
        if (report.systems.prefetcher?.hitRate < 50) {
            report.recommendations.push('Taxa de acerto do prefetcher baixa - considere ajustar estratégia');
        }
        
        if (report.systems.virtualScrolling?.activeScrollers === 0) {
            report.recommendations.push('Nenhuma lista virtualizada - procure por listas grandes para otimizar');
        }
        
        return report;
    }

    notifyInitializationComplete() {
        // Disparar evento de inicialização completa
        window.dispatchEvent(new CustomEvent('usability-enhancements-ready', {
            detail: {
                systems: Object.keys(this.systems),
                version: '1.0.0',
                timestamp: Date.now()
            }
        }));
        
        // Mostrar notificação se disponível
        if (window.notifications) {
            window.notifications.success('Melhorias de usabilidade carregadas', 3000);
        }
        
        // Log de inicialização
        console.log(`
🚀 Usability Enhancements v1.0.0 inicializado!

Sistemas ativos:
${Object.keys(this.systems).map(system => `✓ ${system}`).join('\n')}

Pressione Ctrl+/ para ver atalhos disponíveis
Pressione Ctrl+Shift+P para relatório de performance
        `);
    }

    // === API Pública ===

    getSystem(systemName) {
        return this.systems[systemName];
    }

    getAllSystems() {
        return { ...this.systems };
    }

    isSystemActive(systemName) {
        return !!this.systems[systemName];
    }

    getSystemsStatus() {
        const status = {};
        Object.keys(this.systems).forEach(systemName => {
            status[systemName] = {
                active: true,
                instance: !!this.systems[systemName]
            };
        });
        return status;
    }

    // === Cleanup ===

    destroy() {
        // Destruir todos os sistemas
        Object.values(this.systems).forEach(system => {
            if (system && typeof system.destroy === 'function') {
                system.destroy();
            }
        });
        
        this.systems = {};
        this.initialized = false;
        
        // Remover referência global
        if (window.usabilityEnhancements === this) {
            delete window.usabilityEnhancements;
        }
        
        console.log('[UsabilityEnhancements] Todos os sistemas destruídos');
    }
}

// Inicializar automaticamente quando DOM estiver pronto
window.addEventListener('DOMContentLoaded', () => {
    // Verificar se já foi inicializado manualmente
    if (!window.usabilityEnhancements) {
        window.usabilityEnhancements = new UsabilityEnhancements({
            debug: localStorage.getItem('debugMode') === 'true'
        });
    }
});

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UsabilityEnhancements;
} 
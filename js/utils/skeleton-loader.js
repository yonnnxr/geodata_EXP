// Sistema de Loading Skeletons
class SkeletonLoader {
    constructor(options = {}) {
        this.options = {
            animationDuration: options.animationDuration || 2000,
            baseColor: options.baseColor || '#f0f0f0',
            highlightColor: options.highlightColor || '#e0e0e0',
            borderRadius: options.borderRadius || '4px',
            shimmerEnabled: options.shimmerEnabled !== false,
            darkMode: options.darkMode || false,
            debug: options.debug || false
        };

        this.activeSkeletons = new Map();
        this.templates = new Map();
        
        this.init();
    }

    init() {
        this.setupStyles();
        this.registerDefaultTemplates();
        
        // Detectar modo escuro
        this.detectDarkMode();
        
        console.log('[SkeletonLoader] Sistema inicializado');
    }

    setupStyles() {
        if (document.getElementById('skeleton-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'skeleton-styles';
        styles.textContent = this.generateCSS();
        document.head.appendChild(styles);
    }

    generateCSS() {
        const baseColor = this.options.darkMode ? '#2d3748' : this.options.baseColor;
        const highlightColor = this.options.darkMode ? '#4a5568' : this.options.highlightColor;

        return `
            .skeleton-loader {
                background: linear-gradient(90deg, ${baseColor} 0%, ${highlightColor} 50%, ${baseColor} 100%);
                background-size: 200% 100%;
                animation: ${this.options.shimmerEnabled ? 'skeletonShimmer' : 'skeletonPulse'} ${this.options.animationDuration}ms ease-in-out infinite;
                border-radius: ${this.options.borderRadius};
                position: relative;
                overflow: hidden;
            }

            .skeleton-loader::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: inherit;
                border-radius: inherit;
            }

            @keyframes skeletonShimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }

            @keyframes skeletonPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            .skeleton-text {
                height: 1em;
                width: 100%;
                margin: 0.25em 0;
            }

            .skeleton-text.small { height: 0.75em; }
            .skeleton-text.large { height: 1.25em; }
            .skeleton-text.title { height: 1.5em; }

            .skeleton-circle {
                border-radius: 50%;
                aspect-ratio: 1;
            }

            .skeleton-rect {
                border-radius: ${this.options.borderRadius};
            }

            .skeleton-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
            }

            .skeleton-avatar.small { width: 32px; height: 32px; }
            .skeleton-avatar.large { width: 56px; height: 56px; }

            .skeleton-button {
                height: 36px;
                width: 100px;
                border-radius: 6px;
            }

            .skeleton-card {
                border-radius: 8px;
                padding: 16px;
                background: ${this.options.darkMode ? '#1a202c' : '#ffffff'};
                border: 1px solid ${this.options.darkMode ? '#4a5568' : '#e0e0e0'};
            }

            .skeleton-table-row {
                height: 48px;
                border-bottom: 1px solid ${this.options.darkMode ? '#4a5568' : '#f0f0f0'};
            }

            .skeleton-image {
                background: ${baseColor};
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                color: ${this.options.darkMode ? '#718096' : '#9ca3af'};
                font-size: 24px;
            }

            .skeleton-container {
                animation: fadeIn 0.3s ease-in;
            }

            .skeleton-fade-out {
                animation: fadeOut 0.3s ease-out forwards;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-10px); }
            }

            @media (prefers-reduced-motion: reduce) {
                .skeleton-loader {
                    animation: none;
                    opacity: 0.7;
                }
                
                .skeleton-container,
                .skeleton-fade-out {
                    animation: none;
                }
            }
        `;
    }

    detectDarkMode() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const hasDarkClass = document.body.classList.contains('dark-mode');
        
        this.options.darkMode = prefersDark || hasDarkClass;
        
        // Observar mudanças no modo escuro
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            this.options.darkMode = e.matches;
            this.updateStyles();
        });
    }

    updateStyles() {
        const styleElement = document.getElementById('skeleton-styles');
        if (styleElement) {
            styleElement.textContent = this.generateCSS();
        }
    }

    // === Templates Predefinidos ===

    registerDefaultTemplates() {
        // Template de cartão simples
        this.registerTemplate('card', {
            structure: `
                <div class="skeleton-card">
                    <div class="skeleton-loader skeleton-rect" style="height: 120px; margin-bottom: 12px;"></div>
                    <div class="skeleton-loader skeleton-text title" style="width: 80%;"></div>
                    <div class="skeleton-loader skeleton-text" style="width: 100%;"></div>
                    <div class="skeleton-loader skeleton-text" style="width: 60%;"></div>
                </div>
            `,
            description: 'Cartão com imagem e texto'
        });

        // Template de lista de usuários
        this.registerTemplate('user-list', {
            structure: `
                <div class="skeleton-container">
                    {{repeat:5}}
                    <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                        <div class="skeleton-loader skeleton-avatar" style="margin-right: 12px;"></div>
                        <div style="flex: 1;">
                            <div class="skeleton-loader skeleton-text" style="width: 60%; margin-bottom: 8px;"></div>
                            <div class="skeleton-loader skeleton-text small" style="width: 40%;"></div>
                        </div>
                    </div>
                    {{/repeat}}
                </div>
            `,
            description: 'Lista de usuários com avatar e informações'
        });

        // Template de tabela
        this.registerTemplate('table', {
            structure: `
                <div class="skeleton-container">
                    <div class="skeleton-table-row" style="display: flex; padding: 12px; background: #f8f9fa;">
                        <div class="skeleton-loader skeleton-rect" style="width: 25%; height: 20px; margin-right: 12px;"></div>
                        <div class="skeleton-loader skeleton-rect" style="width: 35%; height: 20px; margin-right: 12px;"></div>
                        <div class="skeleton-loader skeleton-rect" style="width: 25%; height: 20px; margin-right: 12px;"></div>
                        <div class="skeleton-loader skeleton-rect" style="width: 15%; height: 20px;"></div>
                    </div>
                    {{repeat:8}}
                    <div class="skeleton-table-row" style="display: flex; padding: 12px; align-items: center;">
                        <div class="skeleton-loader skeleton-text" style="width: 25%; margin-right: 12px;"></div>
                        <div class="skeleton-loader skeleton-text" style="width: 35%; margin-right: 12px;"></div>
                        <div class="skeleton-loader skeleton-text" style="width: 25%; margin-right: 12px;"></div>
                        <div class="skeleton-loader skeleton-button" style="width: 15%;"></div>
                    </div>
                    {{/repeat}}
                </div>
            `,
            description: 'Tabela com cabeçalho e linhas de dados'
        });

        // Template de estatísticas
        this.registerTemplate('stats', {
            structure: `
                <div class="skeleton-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    {{repeat:4}}
                    <div class="skeleton-card">
                        <div class="skeleton-loader skeleton-circle" style="width: 48px; height: 48px; margin-bottom: 12px;"></div>
                        <div class="skeleton-loader skeleton-text large" style="width: 80%; margin-bottom: 8px;"></div>
                        <div class="skeleton-loader skeleton-text small" style="width: 60%;"></div>
                    </div>
                    {{/repeat}}
                </div>
            `,
            description: 'Cards de estatísticas com ícones e números'
        });

        // Template de gráfico
        this.registerTemplate('chart', {
            structure: `
                <div class="skeleton-card">
                    <div class="skeleton-loader skeleton-text title" style="width: 40%; margin-bottom: 16px;"></div>
                    <div class="skeleton-loader skeleton-rect" style="height: 300px; margin-bottom: 16px;"></div>
                    <div style="display: flex; justify-content: space-between;">
                        <div class="skeleton-loader skeleton-text small" style="width: 20%;"></div>
                        <div class="skeleton-loader skeleton-text small" style="width: 20%;"></div>
                        <div class="skeleton-loader skeleton-text small" style="width: 20%;"></div>
                    </div>
                </div>
            `,
            description: 'Gráfico com título e legenda'
        });

        // Template de formulário
        this.registerTemplate('form', {
            structure: `
                <div class="skeleton-container">
                    {{repeat:5}}
                    <div style="margin-bottom: 20px;">
                        <div class="skeleton-loader skeleton-text small" style="width: 30%; margin-bottom: 8px;"></div>
                        <div class="skeleton-loader skeleton-rect" style="height: 40px; width: 100%;"></div>
                    </div>
                    {{/repeat}}
                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                        <div class="skeleton-loader skeleton-button" style="width: 100px;"></div>
                        <div class="skeleton-loader skeleton-button" style="width: 80px;"></div>
                    </div>
                </div>
            `,
            description: 'Formulário com campos e botões'
        });

        // Template de mapa
        this.registerTemplate('map', {
            structure: `
                <div class="skeleton-container" style="position: relative;">
                    <div class="skeleton-loader skeleton-rect" style="height: 400px; width: 100%;"></div>
                    <div style="position: absolute; top: 16px; right: 16px; display: flex; flex-direction: column; gap: 8px;">
                        <div class="skeleton-loader skeleton-button" style="width: 40px; height: 40px;"></div>
                        <div class="skeleton-loader skeleton-button" style="width: 40px; height: 40px;"></div>
                        <div class="skeleton-loader skeleton-button" style="width: 40px; height: 40px;"></div>
                    </div>
                </div>
            `,
            description: 'Mapa com controles'
        });

        // Template de comentários
        this.registerTemplate('comments', {
            structure: `
                <div class="skeleton-container">
                    {{repeat:3}}
                    <div style="display: flex; margin-bottom: 20px;">
                        <div class="skeleton-loader skeleton-avatar small" style="margin-right: 12px;"></div>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <div class="skeleton-loader skeleton-text small" style="width: 120px; margin-right: 12px;"></div>
                                <div class="skeleton-loader skeleton-text small" style="width: 80px;"></div>
                            </div>
                            <div class="skeleton-loader skeleton-text" style="width: 100%; margin-bottom: 4px;"></div>
                            <div class="skeleton-loader skeleton-text" style="width: 80%;"></div>
                        </div>
                    </div>
                    {{/repeat}}
                </div>
            `,
            description: 'Lista de comentários com avatares'
        });
    }

    registerTemplate(name, template) {
        this.templates.set(name, template);
        
        if (this.options.debug) {
            console.log(`[SkeletonLoader] Template registrado: ${name}`);
        }
    }

    // === API Principal ===

    show(container, template = 'default', options = {}) {
        const targetElement = this.getElement(container);
        if (!targetElement) {
            console.warn('[SkeletonLoader] Container não encontrado:', container);
            return null;
        }

        // Salvar conteúdo original
        const originalContent = targetElement.innerHTML;
        const skeletonId = this.generateId();
        
        this.activeSkeletons.set(skeletonId, {
            element: targetElement,
            originalContent,
            template,
            options,
            startTime: Date.now()
        });

        // Aplicar skeleton
        const skeletonHTML = this.buildSkeleton(template, options);
        targetElement.innerHTML = skeletonHTML;
        targetElement.classList.add('skeleton-active');

        if (this.options.debug) {
            console.log(`[SkeletonLoader] Skeleton ativado:`, skeletonId, template);
        }

        return skeletonId;
    }

    hide(skeletonId, options = {}) {
        const skeleton = this.activeSkeletons.get(skeletonId);
        if (!skeleton) {
            console.warn('[SkeletonLoader] Skeleton não encontrado:', skeletonId);
            return false;
        }

        const { element, originalContent } = skeleton;
        const fadeOut = options.fadeOut !== false;
        
        if (fadeOut) {
            // Animação de saída
            element.classList.add('skeleton-fade-out');
            
            setTimeout(() => {
                this.restoreContent(element, originalContent);
                this.activeSkeletons.delete(skeletonId);
            }, 300);
        } else {
            this.restoreContent(element, originalContent);
            this.activeSkeletons.delete(skeletonId);
        }

        if (this.options.debug) {
            const duration = Date.now() - skeleton.startTime;
            console.log(`[SkeletonLoader] Skeleton removido: ${skeletonId} (${duration}ms)`);
        }

        return true;
    }

    hideAll(options = {}) {
        const skeletonIds = Array.from(this.activeSkeletons.keys());
        
        skeletonIds.forEach(id => {
            this.hide(id, options);
        });

        return skeletonIds.length;
    }

    // === Métodos de Conveniência ===

    showFor(container, template, duration = 2000, options = {}) {
        const skeletonId = this.show(container, template, options);
        
        if (skeletonId) {
            setTimeout(() => {
                this.hide(skeletonId, options);
            }, duration);
        }

        return skeletonId;
    }

    showWhile(container, template, promise, options = {}) {
        const skeletonId = this.show(container, template, options);
        
        if (skeletonId && promise && typeof promise.then === 'function') {
            promise
                .then(() => this.hide(skeletonId, options))
                .catch(() => this.hide(skeletonId, options));
        }

        return { skeletonId, promise };
    }

    // === Templates Dinâmicos ===

    showCards(container, count = 3, options = {}) {
        const template = {
            structure: `
                <div class="skeleton-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                    {{repeat:${count}}}
                    <div class="skeleton-card">
                        <div class="skeleton-loader skeleton-rect" style="height: 120px; margin-bottom: 12px;"></div>
                        <div class="skeleton-loader skeleton-text title" style="width: 80%;"></div>
                        <div class="skeleton-loader skeleton-text" style="width: 100%;"></div>
                        <div class="skeleton-loader skeleton-text" style="width: 60%;"></div>
                    </div>
                    {{/repeat}}
                </div>
            `,
            description: `${count} cartões em grid`
        };

        return this.show(container, template, options);
    }

    showList(container, count = 5, withAvatar = true, options = {}) {
        const avatarHTML = withAvatar ? 
            '<div class="skeleton-loader skeleton-avatar" style="margin-right: 12px;"></div>' : 
            '';

        const template = {
            structure: `
                <div class="skeleton-container">
                    {{repeat:${count}}}
                    <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                        ${avatarHTML}
                        <div style="flex: 1;">
                            <div class="skeleton-loader skeleton-text" style="width: 60%; margin-bottom: 8px;"></div>
                            <div class="skeleton-loader skeleton-text small" style="width: 40%;"></div>
                        </div>
                    </div>
                    {{/repeat}}
                </div>
            `,
            description: `Lista com ${count} itens`
        };

        return this.show(container, template, options);
    }

    showTable(container, rows = 8, columns = 4, options = {}) {
        const columnWidths = ['25%', '35%', '25%', '15%'];
        
        const headerHTML = columnWidths.slice(0, columns)
            .map(width => `<div class="skeleton-loader skeleton-rect" style="width: ${width}; height: 20px; margin-right: 12px;"></div>`)
            .join('');
            
        const rowHTML = columnWidths.slice(0, columns)
            .map(width => `<div class="skeleton-loader skeleton-text" style="width: ${width}; margin-right: 12px;"></div>`)
            .join('');

        const template = {
            structure: `
                <div class="skeleton-container">
                    <div class="skeleton-table-row" style="display: flex; padding: 12px; background: #f8f9fa;">
                        ${headerHTML}
                    </div>
                    {{repeat:${rows}}}
                    <div class="skeleton-table-row" style="display: flex; padding: 12px; align-items: center;">
                        ${rowHTML}
                    </div>
                    {{/repeat}}
                </div>
            `,
            description: `Tabela ${rows}x${columns}`
        };

        return this.show(container, template, options);
    }

    // === Métodos Auxiliares ===

    buildSkeleton(template, options = {}) {
        let skeletonTemplate;

        if (typeof template === 'string') {
            // Template predefinido
            skeletonTemplate = this.templates.get(template);
            if (!skeletonTemplate) {
                console.warn('[SkeletonLoader] Template não encontrado:', template);
                skeletonTemplate = this.templates.get('card'); // fallback
            }
        } else {
            // Template personalizado
            skeletonTemplate = template;
        }

        if (!skeletonTemplate || !skeletonTemplate.structure) {
            return '<div class="skeleton-loader skeleton-rect" style="height: 100px;"></div>';
        }

        let html = skeletonTemplate.structure;

        // Processar repetições
        html = html.replace(/\{\{repeat:(\d+)\}\}([\s\S]*?)\{\{\/repeat\}\}/g, (match, count, content) => {
            const num = parseInt(count);
            return Array(num).fill(content).join('');
        });

        // Aplicar opções personalizadas
        if (options.height) {
            html = html.replace(/height:\s*\d+px/g, `height: ${options.height}px`);
        }

        return html;
    }

    restoreContent(element, originalContent) {
        element.innerHTML = originalContent;
        element.classList.remove('skeleton-active', 'skeleton-fade-out');
    }

    getElement(selector) {
        if (typeof selector === 'string') {
            return document.querySelector(selector);
        } else if (selector instanceof Element) {
            return selector;
        }
        return null;
    }

    generateId() {
        return 'skeleton_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    // === Utilitários ===

    getActiveSkeletons() {
        return Array.from(this.activeSkeletons.entries()).map(([id, data]) => ({
            id,
            template: data.template,
            duration: Date.now() - data.startTime,
            element: data.element
        }));
    }

    getTemplates() {
        return Array.from(this.templates.entries()).map(([name, template]) => ({
            name,
            description: template.description || 'Template personalizado'
        }));
    }

    // === Integração com Performance Monitor ===

    measureSkeletonPerformance(skeletonId) {
        const skeleton = this.activeSkeletons.get(skeletonId);
        if (!skeleton) return null;

        const duration = Date.now() - skeleton.startTime;
        
        if (window.performanceMonitor) {
            window.performanceMonitor.logCustomMetric('skeleton_display_time', duration, {
                template: skeleton.template,
                element: skeleton.element.tagName
            });
        }

        return duration;
    }

    destroy() {
        this.hideAll({ fadeOut: false });
        
        const styleElement = document.getElementById('skeleton-styles');
        if (styleElement) {
            styleElement.remove();
        }

        console.log('[SkeletonLoader] Sistema destruído');
    }
}

// Inicializar automaticamente
window.addEventListener('DOMContentLoaded', () => {
    window.skeletonLoader = new SkeletonLoader({
        debug: localStorage.getItem('debugMode') === 'true'
    });

    // Funções globais de conveniência
    window.showSkeleton = (container, template, options) => {
        return window.skeletonLoader.show(container, template, options);
    };

    window.hideSkeleton = (id, options) => {
        return window.skeletonLoader.hide(id, options);
    };

    window.showSkeletonWhile = (container, template, promise, options) => {
        return window.skeletonLoader.showWhile(container, template, promise, options);
    };
});

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkeletonLoader;
} 
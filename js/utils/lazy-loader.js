// Sistema de Lazy Loading Avançado
class LazyLoader {
    constructor(options = {}) {
        this.options = {
            // Configurações básicas
            root: options.root || null,
            rootMargin: options.rootMargin || '50px',
            threshold: options.threshold || 0.1,
            
            // Seletores
            imageSelector: options.imageSelector || 'img[data-src]',
            backgroundSelector: options.backgroundSelector || '[data-bg]',
            
            // Classes CSS
            loadingClass: options.loadingClass || 'lazy-loading',
            loadedClass: options.loadedClass || 'lazy-loaded',
            errorClass: options.errorClass || 'lazy-error',
            
            // Configurações de placeholder
            placeholder: options.placeholder || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSIxNCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmaWxsPSIjY2NjIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2FycmVnYW5kby4uLjwvdGV4dD48L3N2Zz4=',
            blurredPlaceholder: options.blurredPlaceholder || true,
            
            // Progressive loading
            progressiveLoading: options.progressiveLoading || true,
            lowQualityPrefix: options.lowQualityPrefix || '_thumb',
            
            // Otimizações
            batchSize: options.batchSize || 5,
            debounceDelay: options.debounceDelay || 100,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            
            // WebP support
            webpSupport: options.webpSupport !== false,
            
            // Callbacks
            onLoad: options.onLoad || null,
            onError: options.onError || null,
            onProgress: options.onProgress || null
        };

        this.observer = null;
        this.loadQueue = [];
        this.loadingImages = new Set();
        this.supportsWebP = false;
        this.stats = {
            imagesLoaded: 0,
            imagesErrored: 0,
            totalImages: 0,
            averageLoadTime: 0,
            totalLoadTime: 0
        };

        this.init();
    }

    async init() {
        await this.detectWebPSupport();
        this.setupIntersectionObserver();
        this.initializeImages();
        this.setupEventListeners();
        
        console.log('[LazyLoader] Inicializado com suporte WebP:', this.supportsWebP);
    }

    // === Detecção de Suporte WebP ===
    
    async detectWebPSupport() {
        if (!this.options.webpSupport) return;
        
        return new Promise((resolve) => {
            const webp = new Image();
            webp.onload = webp.onerror = () => {
                this.supportsWebP = webp.height === 2;
                resolve(this.supportsWebP);
            };
            webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }

    // === Intersection Observer ===
    
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            console.warn('[LazyLoader] IntersectionObserver não suportado, carregando todas as imagens');
            this.loadAllImages();
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.queueImageLoad(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            root: this.options.root,
            rootMargin: this.options.rootMargin,
            threshold: this.options.threshold
        });
    }

    // === Inicialização de Imagens ===
    
    initializeImages() {
        const images = document.querySelectorAll(this.options.imageSelector);
        const backgrounds = document.querySelectorAll(this.options.backgroundSelector);
        
        this.stats.totalImages = images.length + backgrounds.length;
        
        images.forEach(img => this.setupImage(img));
        backgrounds.forEach(el => this.setupBackground(el));
        
        console.log(`[LazyLoader] ${this.stats.totalImages} elementos configurados para lazy loading`);
    }

    setupImage(img) {
        // Configurar placeholder
        if (!img.src && this.options.placeholder) {
            img.src = this.options.placeholder;
            img.classList.add(this.options.loadingClass);
        }

        // Configurar progressive loading se disponível
        if (this.options.progressiveLoading && img.dataset.srcThumb) {
            this.loadProgressiveImage(img);
        }

        // Adicionar ao observer
        if (this.observer) {
            this.observer.observe(img);
        } else {
            this.queueImageLoad(img);
        }
    }

    setupBackground(element) {
        element.classList.add(this.options.loadingClass);
        
        if (this.observer) {
            this.observer.observe(element);
        } else {
            this.queueImageLoad(element);
        }
    }

    // === Progressive Loading ===
    
    loadProgressiveImage(img) {
        const thumbSrc = img.dataset.srcThumb;
        if (!thumbSrc) return;

        const thumbImg = new Image();
        thumbImg.onload = () => {
            img.src = thumbSrc;
            img.style.filter = 'blur(2px)';
            img.style.transition = 'filter 0.3s ease';
        };
        thumbImg.src = thumbSrc;
    }

    // === Fila de Carregamento ===
    
    queueImageLoad(element) {
        if (this.loadingImages.has(element)) return;
        
        this.loadQueue.push(element);
        this.processLoadQueue();
    }

    processLoadQueue() {
        // Processar em lotes para não sobrecarregar
        const batch = this.loadQueue.splice(0, this.options.batchSize);
        
        batch.forEach(element => {
            this.loadElement(element);
        });

        // Continuar processando se há mais na fila
        if (this.loadQueue.length > 0) {
            setTimeout(() => this.processLoadQueue(), this.options.debounceDelay);
        }
    }

    // === Carregamento de Elementos ===
    
    async loadElement(element) {
        this.loadingImages.add(element);
        const startTime = performance.now();

        try {
            if (element.tagName === 'IMG') {
                await this.loadImage(element);
            } else {
                await this.loadBackground(element);
            }
            
            const loadTime = performance.now() - startTime;
            this.onImageLoaded(element, loadTime);
            
        } catch (error) {
            this.onImageError(element, error);
        } finally {
            this.loadingImages.delete(element);
        }
    }

    loadImage(img) {
        return new Promise((resolve, reject) => {
            const dataSrc = img.dataset.src;
            if (!dataSrc) {
                reject(new Error('data-src não encontrado'));
                return;
            }

            const finalSrc = this.getOptimizedSrc(dataSrc);
            const tempImg = new Image();

            tempImg.onload = () => {
                img.src = finalSrc;
                
                // Remover blur se estava aplicado
                if (img.style.filter) {
                    img.style.filter = 'none';
                }
                
                resolve();
            };

            tempImg.onerror = () => {
                reject(new Error(`Falha ao carregar: ${finalSrc}`));
            };

            tempImg.src = finalSrc;
        });
    }

    loadBackground(element) {
        return new Promise((resolve, reject) => {
            const dataBg = element.dataset.bg;
            if (!dataBg) {
                reject(new Error('data-bg não encontrado'));
                return;
            }

            const finalSrc = this.getOptimizedSrc(dataBg);
            const tempImg = new Image();

            tempImg.onload = () => {
                element.style.backgroundImage = `url(${finalSrc})`;
                resolve();
            };

            tempImg.onerror = () => {
                reject(new Error(`Falha ao carregar background: ${finalSrc}`));
            };

            tempImg.src = finalSrc;
        });
    }

    // === Otimização de URLs ===
    
    getOptimizedSrc(src) {
        if (!this.supportsWebP) return src;
        
        // Converter para WebP se suportado e não for já WebP
        if (!src.toLowerCase().includes('.webp')) {
            // Tentar substituir extensão por .webp
            const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            return webpSrc;
        }
        
        return src;
    }

    // === Handlers de Eventos ===
    
    onImageLoaded(element, loadTime) {
        element.classList.remove(this.options.loadingClass);
        element.classList.add(this.options.loadedClass);
        
        this.stats.imagesLoaded++;
        this.stats.totalLoadTime += loadTime;
        this.stats.averageLoadTime = this.stats.totalLoadTime / this.stats.imagesLoaded;
        
        if (this.options.onLoad) {
            this.options.onLoad(element, loadTime);
        }
        
        if (this.options.onProgress) {
            this.options.onProgress(this.getProgress());
        }

        // Performance: marcar carregamento de imagem
        if (window.performanceMonitor) {
            window.performanceMonitor.bufferMetric('image-load', {
                src: element.src || element.dataset.bg,
                loadTime: Math.round(loadTime),
                type: element.tagName.toLowerCase()
            });
        }
    }

    onImageError(element, error) {
        element.classList.remove(this.options.loadingClass);
        element.classList.add(this.options.errorClass);
        
        this.stats.imagesErrored++;
        
        console.error('[LazyLoader] Erro ao carregar imagem:', error);
        
        if (this.options.onError) {
            this.options.onError(element, error);
        }
        
        // Tentar novamente após delay
        this.retryLoadElement(element);
    }

    // === Retry Logic ===
    
    retryLoadElement(element, attempt = 1) {
        if (attempt > this.options.retryAttempts) {
            console.error(`[LazyLoader] Máximo de tentativas atingido para: ${element.dataset.src || element.dataset.bg}`);
            return;
        }

        setTimeout(() => {
            console.log(`[LazyLoader] Tentativa ${attempt + 1} para: ${element.dataset.src || element.dataset.bg}`);
            this.loadElement(element).catch(() => {
                this.retryLoadElement(element, attempt + 1);
            });
        }, this.options.retryDelay * attempt);
    }

    // === Event Listeners ===
    
    setupEventListeners() {
        // Reagir a mudanças de DOM
        if ('MutationObserver' in window) {
            const mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            this.observeNewImages(node);
                        }
                    });
                });
            });

            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Listener para modo print
        window.addEventListener('beforeprint', () => {
            this.loadAllImages();
        });
    }

    observeNewImages(element) {
        // Verificar o próprio elemento
        if (element.matches && element.matches(this.options.imageSelector)) {
            this.setupImage(element);
        }
        
        if (element.matches && element.matches(this.options.backgroundSelector)) {
            this.setupBackground(element);
        }
        
        // Verificar elementos filhos
        const newImages = element.querySelectorAll(this.options.imageSelector);
        const newBackgrounds = element.querySelectorAll(this.options.backgroundSelector);
        
        newImages.forEach(img => this.setupImage(img));
        newBackgrounds.forEach(el => this.setupBackground(el));
    }

    // === Utilitários ===
    
    loadAllImages() {
        const allElements = [
            ...document.querySelectorAll(this.options.imageSelector),
            ...document.querySelectorAll(this.options.backgroundSelector)
        ];
        
        allElements.forEach(element => {
            if (this.observer) {
                this.observer.unobserve(element);
            }
            this.queueImageLoad(element);
        });
    }

    getProgress() {
        const total = this.stats.imagesLoaded + this.stats.imagesErrored;
        return {
            loaded: this.stats.imagesLoaded,
            errored: this.stats.imagesErrored,
            total: this.stats.totalImages,
            percentage: this.stats.totalImages > 0 ? (total / this.stats.totalImages) * 100 : 0,
            averageLoadTime: this.stats.averageLoadTime
        };
    }

    getStats() {
        return {
            ...this.stats,
            progress: this.getProgress(),
            supportsWebP: this.supportsWebP,
            queueLength: this.loadQueue.length,
            currentlyLoading: this.loadingImages.size
        };
    }

    // === API Pública ===
    
    refresh() {
        this.initializeImages();
    }

    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = this.getOptimizedSrc(src);
        });
    }

    preloadImages(sources) {
        return Promise.all(sources.map(src => this.preloadImage(src)));
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.loadQueue = [];
        this.loadingImages.clear();
        
        console.log('[LazyLoader] Destruído');
    }

    // === Debugging ===
    
    logStats() {
        const stats = this.getStats();
        console.group('[LazyLoader] Estatísticas');
        console.log('Progresso:', `${stats.progress.percentage.toFixed(1)}%`);
        console.log('Carregadas:', stats.loaded);
        console.log('Com erro:', stats.errored);
        console.log('Total:', stats.total);
        console.log('Tempo médio:', `${stats.averageLoadTime.toFixed(0)}ms`);
        console.log('Suporte WebP:', stats.supportsWebP);
        console.log('Fila de carregamento:', stats.queueLength);
        console.log('Carregando agora:', stats.currentlyLoading);
        console.groupEnd();
    }
}

// Sistema de Otimização de Imagens
class ImageOptimizer {
    static createResponsiveImage(src, alt, sizes = {}) {
        const img = document.createElement('img');
        img.alt = alt;
        
        // Configurar data-src para lazy loading
        img.dataset.src = src;
        
        // Gerar srcset se sizes foram fornecidos
        if (Object.keys(sizes).length > 0) {
            const srcset = Object.entries(sizes)
                .map(([size, url]) => `${url} ${size}w`)
                .join(', ');
            img.dataset.srcset = srcset;
        }
        
        return img;
    }
    
    static generatePlaceholder(width, height, text = 'Carregando...') {
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f0f0f0"/>
                <text x="50%" y="50%" font-size="14" font-family="Arial" 
                      fill="#ccc" text-anchor="middle" dy=".3em">${text}</text>
            </svg>
        `;
        
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }
    
    static createBlurredPlaceholder(src, quality = 10) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                const ratio = img.width / img.height;
                canvas.width = quality;
                canvas.height = quality / ratio;
                
                ctx.filter = 'blur(1px)';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                resolve(canvas.toDataURL('image/jpeg', 0.1));
            };
            
            img.crossOrigin = 'anonymous';
            img.src = src;
        });
    }
}

// Inicializar lazy loader global
window.addEventListener('DOMContentLoaded', () => {
    window.lazyLoader = new LazyLoader({
        onLoad: (element, loadTime) => {
            console.log(`[LazyLoader] Carregado: ${element.src || element.dataset.bg} (${Math.round(loadTime)}ms)`);
        },
        onProgress: (progress) => {
            if (progress.percentage % 10 === 0) { // Log a cada 10%
                console.log(`[LazyLoader] Progresso: ${progress.percentage.toFixed(1)}%`);
            }
        }
    });
});

// Funções globais de conveniência
window.preloadImages = (sources) => {
    if (window.lazyLoader) {
        return window.lazyLoader.preloadImages(sources);
    }
    return Promise.resolve();
};

window.refreshLazyLoader = () => {
    if (window.lazyLoader) {
        window.lazyLoader.refresh();
    }
};

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LazyLoader, ImageOptimizer };
} 
// Sistema de Virtual Scrolling
class VirtualScroller {
    constructor(container, options = {}) {
        this.container = this.getElement(container);
        if (!this.container) {
            throw new Error('Container não encontrado para VirtualScroller');
        }

        this.options = {
            itemHeight: options.itemHeight || 50,
            bufferSize: options.bufferSize || 5,
            tolerance: options.tolerance || 2,
            dynamicHeight: options.dynamicHeight || false,
            renderItem: options.renderItem || this.defaultRenderItem.bind(this),
            getItemHeight: options.getItemHeight || null,
            horizontal: options.horizontal || false,
            threshold: options.threshold || 100, // Mínimo de itens para ativar virtualização
            preload: options.preload || 0,
            debug: options.debug || false,
            estimatedItemHeight: options.estimatedItemHeight || options.itemHeight,
            overscan: options.overscan || 3, // Itens extras para renderizar
            onScroll: options.onScroll || null,
            onVisibleRangeChange: options.onVisibleRangeChange || null
        };

        this.data = [];
        this.visibleItems = [];
        this.startIndex = 0;
        this.endIndex = 0;
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.totalHeight = 0;
        this.itemHeights = new Map();
        this.averageItemHeight = this.options.itemHeight;
        
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.resizeObserver = null;
        this.intersectionObserver = null;
        
        this.renderedItems = new Map();
        this.itemPool = [];
        this.lastScrollTime = 0;
        this.scrollDirection = 0; // 1 = para baixo, -1 = para cima

        this.init();
    }

    init() {
        this.setupContainer();
        this.setupEventListeners();
        this.setupObservers();
        
        if (this.options.debug) {
            console.log('[VirtualScroller] Inicializado', this.options);
        }
    }

    setupContainer() {
        // Configurar CSS do container
        const containerStyle = window.getComputedStyle(this.container);
        
        if (containerStyle.position === 'static') {
            this.container.style.position = 'relative';
        }
        
        this.container.style.overflow = 'auto';
        
        // Criar viewport interno
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-scroller-viewport';
        this.viewport.style.cssText = `
            position: relative;
            width: 100%;
            min-height: 100%;
        `;
        
        // Mover conteúdo existente para o viewport
        while (this.container.firstChild) {
            this.viewport.appendChild(this.container.firstChild);
        }
        
        this.container.appendChild(this.viewport);
        
        // Medir container
        this.updateContainerDimensions();
    }

    setupEventListeners() {
        // Scroll com throttling
        this.container.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 16));
        
        // Resize
        window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 100));
        
        // Wheel para scroll suave
        this.container.addEventListener('wheel', this.handleWheel.bind(this));
    }

    setupObservers() {
        // Resize Observer para detectar mudanças no container
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(this.debounce(() => {
                this.updateContainerDimensions();
                this.calculateVisibleRange();
                this.render();
            }, 100));
            
            this.resizeObserver.observe(this.container);
        }

        // Intersection Observer para otimizar renderização
        if (window.IntersectionObserver) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) {
                        // Container saiu da viewport, pausar updates
                        this.isVisible = false;
                    } else {
                        this.isVisible = true;
                        this.render();
                    }
                });
            }, { threshold: 0.01 });
            
            this.intersectionObserver.observe(this.container);
        }
    }

    // === API Principal ===

    setData(data) {
        this.data = Array.isArray(data) ? data : [];
        this.itemHeights.clear();
        this.renderedItems.clear();
        
        // Verificar se vale a pena virtualizar
        if (this.data.length < this.options.threshold) {
            this.renderDirectly();
            return;
        }

        this.calculateTotalHeight();
        this.calculateVisibleRange();
        this.render();
        
        if (this.options.debug) {
            console.log('[VirtualScroller] Dados atualizados:', this.data.length, 'itens');
        }
    }

    addItems(items, position = 'end') {
        if (!Array.isArray(items)) items = [items];
        
        const startLength = this.data.length;
        
        if (position === 'start') {
            this.data.unshift(...items);
            // Ajustar índices existentes
            this.adjustIndicesAfterInsert(0, items.length);
        } else if (position === 'end') {
            this.data.push(...items);
        } else if (typeof position === 'number') {
            this.data.splice(position, 0, ...items);
            this.adjustIndicesAfterInsert(position, items.length);
        }

        this.calculateTotalHeight();
        
        if (this.data.length >= this.options.threshold) {
            this.calculateVisibleRange();
            this.render();
        } else {
            this.renderDirectly();
        }
    }

    removeItems(indices) {
        if (!Array.isArray(indices)) indices = [indices];
        
        // Ordenar em ordem decrescente para não afetar índices seguintes
        indices.sort((a, b) => b - a);
        
        indices.forEach(index => {
            if (index >= 0 && index < this.data.length) {
                this.data.splice(index, 1);
                this.itemHeights.delete(index);
                this.renderedItems.delete(index);
            }
        });

        this.adjustIndicesAfterRemove(indices);
        this.calculateTotalHeight();
        this.calculateVisibleRange();
        this.render();
    }

    updateItem(index, newData) {
        if (index >= 0 && index < this.data.length) {
            this.data[index] = newData;
            this.itemHeights.delete(index); // Recalcular altura
            
            if (index >= this.startIndex && index <= this.endIndex) {
                this.renderItem(index, true); // Force re-render
            }
        }
    }

    scrollToIndex(index, behavior = 'smooth', position = 'start') {
        if (index < 0 || index >= this.data.length) return;

        let targetScrollTop;
        
        if (position === 'start') {
            targetScrollTop = this.getItemOffset(index);
        } else if (position === 'center') {
            const itemOffset = this.getItemOffset(index);
            const itemHeight = this.getItemHeight(index);
            targetScrollTop = itemOffset - (this.containerHeight - itemHeight) / 2;
        } else if (position === 'end') {
            const itemOffset = this.getItemOffset(index);
            const itemHeight = this.getItemHeight(index);
            targetScrollTop = itemOffset - this.containerHeight + itemHeight;
        }

        targetScrollTop = Math.max(0, Math.min(targetScrollTop, this.totalHeight - this.containerHeight));

        if (behavior === 'smooth' && this.container.scrollTo) {
            this.container.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
        } else {
            this.container.scrollTop = targetScrollTop;
        }
    }

    // === Renderização ===

    render() {
        if (!this.isVisible && this.intersectionObserver) return;
        
        const startTime = performance.now();
        
        // Determinar itens visíveis
        const { start, end } = this.getVisibleRange();
        
        // Verificar se a faixa mudou significativamente
        if (Math.abs(start - this.startIndex) < this.options.tolerance && 
            Math.abs(end - this.endIndex) < this.options.tolerance) {
            return; // Não há necessidade de re-renderizar
        }

        const oldStart = this.startIndex;
        const oldEnd = this.endIndex;
        
        this.startIndex = start;
        this.endIndex = end;

        // Notificar mudança na faixa visível
        if (this.options.onVisibleRangeChange) {
            this.options.onVisibleRangeChange(start, end, oldStart, oldEnd);
        }

        // Remover itens que saíram da faixa visível
        this.cleanupInvisibleItems(start, end);
        
        // Renderizar novos itens
        for (let i = start; i <= end; i++) {
            if (!this.renderedItems.has(i)) {
                this.renderItem(i);
            }
        }

        // Atualizar altura total se necessário
        this.updateTotalHeight();
        
        // Métricas de performance
        const renderTime = performance.now() - startTime;
        
        if (this.options.debug && renderTime > 16) {
            console.warn('[VirtualScroller] Renderização lenta:', renderTime.toFixed(2), 'ms');
        }
        
        if (window.performanceMonitor) {
            window.performanceMonitor.logCustomMetric('virtual_scroll_render_time', renderTime, {
                itemCount: end - start + 1,
                totalItems: this.data.length
            });
        }
    }

    renderItem(index, forceUpdate = false) {
        if (index < 0 || index >= this.data.length) return;

        let element = this.renderedItems.get(index);
        const isNewElement = !element || forceUpdate;
        
        if (isNewElement) {
            // Reutilizar elemento do pool ou criar novo
            element = this.getElementFromPool() || this.createElement();
            this.renderedItems.set(index, element);
        }

        // Renderizar conteúdo
        const itemData = this.data[index];
        const itemContent = this.options.renderItem(itemData, index, element);
        
        if (typeof itemContent === 'string') {
            element.innerHTML = itemContent;
        } else if (itemContent instanceof Element) {
            element.innerHTML = '';
            element.appendChild(itemContent);
        }

        // Configurar posicionamento
        this.positionItem(element, index);
        
        // Adicionar ao DOM se necessário
        if (isNewElement || !element.parentNode) {
            this.viewport.appendChild(element);
        }

        // Medir altura se necessário
        if (this.options.dynamicHeight && !this.itemHeights.has(index)) {
            this.measureItemHeight(element, index);
        }
    }

    positionItem(element, index) {
        const offset = this.getItemOffset(index);
        const height = this.getItemHeight(index);
        
        element.style.cssText = `
            position: absolute;
            top: ${offset}px;
            left: 0;
            right: 0;
            height: ${height}px;
            box-sizing: border-box;
        `;
        
        element.setAttribute('data-index', index);
    }

    measureItemHeight(element, index) {
        // Força reflow para obter altura real
        const height = element.offsetHeight;
        
        if (height > 0) {
            this.itemHeights.set(index, height);
            this.updateAverageHeight(height);
            
            // Recalcular altura total se necessário
            this.calculateTotalHeight();
        }
    }

    cleanupInvisibleItems(visibleStart, visibleEnd) {
        const toRemove = [];
        
        this.renderedItems.forEach((element, index) => {
            if (index < visibleStart - this.options.overscan || 
                index > visibleEnd + this.options.overscan) {
                toRemove.push(index);
            }
        });

        toRemove.forEach(index => {
            const element = this.renderedItems.get(index);
            this.returnElementToPool(element);
            this.renderedItems.delete(index);
        });
    }

    renderDirectly() {
        // Renderização direta para listas pequenas
        this.viewport.innerHTML = '';
        this.renderedItems.clear();
        
        this.data.forEach((item, index) => {
            const element = this.createElement();
            const content = this.options.renderItem(item, index, element);
            
            if (typeof content === 'string') {
                element.innerHTML = content;
            } else if (content instanceof Element) {
                element.appendChild(content);
            }
            
            element.setAttribute('data-index', index);
            this.viewport.appendChild(element);
        });
    }

    // === Cálculos ===

    calculateVisibleRange() {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.containerHeight;
        
        let startIndex = 0;
        let endIndex = 0;

        if (this.options.dynamicHeight) {
            // Busca binária para altura dinâmica
            startIndex = this.findItemByOffset(scrollTop);
            endIndex = this.findItemByOffset(scrollTop + containerHeight);
        } else {
            // Cálculo simples para altura fixa
            startIndex = Math.floor(scrollTop / this.options.itemHeight);
            endIndex = Math.ceil((scrollTop + containerHeight) / this.options.itemHeight);
        }

        // Aplicar buffer e overscan
        startIndex = Math.max(0, startIndex - this.options.bufferSize - this.options.overscan);
        endIndex = Math.min(this.data.length - 1, endIndex + this.options.bufferSize + this.options.overscan);

        this.startIndex = startIndex;
        this.endIndex = endIndex;
        
        return { start: startIndex, end: endIndex };
    }

    getVisibleRange() {
        return {
            start: this.startIndex,
            end: this.endIndex
        };
    }

    findItemByOffset(offset) {
        if (!this.options.dynamicHeight) {
            return Math.floor(offset / this.options.itemHeight);
        }

        let totalOffset = 0;
        
        for (let i = 0; i < this.data.length; i++) {
            const itemHeight = this.getItemHeight(i);
            
            if (totalOffset + itemHeight > offset) {
                return i;
            }
            
            totalOffset += itemHeight;
        }
        
        return this.data.length - 1;
    }

    getItemOffset(index) {
        if (!this.options.dynamicHeight) {
            return index * this.options.itemHeight;
        }

        let offset = 0;
        
        for (let i = 0; i < index; i++) {
            offset += this.getItemHeight(i);
        }
        
        return offset;
    }

    getItemHeight(index) {
        if (this.options.getItemHeight) {
            return this.options.getItemHeight(this.data[index], index);
        }
        
        if (this.options.dynamicHeight && this.itemHeights.has(index)) {
            return this.itemHeights.get(index);
        }
        
        return this.options.estimatedItemHeight;
    }

    calculateTotalHeight() {
        if (!this.options.dynamicHeight) {
            this.totalHeight = this.data.length * this.options.itemHeight;
        } else {
            let total = 0;
            for (let i = 0; i < this.data.length; i++) {
                total += this.getItemHeight(i);
            }
            this.totalHeight = total;
        }
        
        this.viewport.style.height = this.totalHeight + 'px';
    }

    updateTotalHeight() {
        const oldHeight = this.totalHeight;
        this.calculateTotalHeight();
        
        // Se a altura mudou significativamente, pode ser necessário rerender
        if (Math.abs(this.totalHeight - oldHeight) > this.containerHeight) {
            this.calculateVisibleRange();
        }
    }

    updateAverageHeight(newHeight) {
        const currentAverage = this.averageItemHeight;
        const measuredCount = this.itemHeights.size;
        
        this.averageItemHeight = (currentAverage * (measuredCount - 1) + newHeight) / measuredCount;
        
        // Atualizar estimativa para itens não medidos
        if (Math.abs(this.averageItemHeight - this.options.estimatedItemHeight) > 10) {
            this.options.estimatedItemHeight = this.averageItemHeight;
        }
    }

    updateContainerDimensions() {
        const rect = this.container.getBoundingClientRect();
        this.containerHeight = rect.height;
        this.containerWidth = rect.width;
    }

    // === Event Handlers ===

    handleScroll(event) {
        const currentTime = performance.now();
        const scrollTop = this.container.scrollTop;
        
        // Detectar direção do scroll
        this.scrollDirection = scrollTop > this.scrollTop ? 1 : -1;
        this.scrollTop = scrollTop;
        this.lastScrollTime = currentTime;
        
        // Marcar como scrolling
        if (!this.isScrolling) {
            this.isScrolling = true;
            this.container.classList.add('virtual-scrolling');
        }
        
        // Callback personalizado
        if (this.options.onScroll) {
            this.options.onScroll(scrollTop, this.scrollDirection);
        }
        
        // Calcular e renderizar nova faixa
        this.calculateVisibleRange();
        this.render();
        
        // Reset scrolling state
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
            this.container.classList.remove('virtual-scrolling');
        }, 150);
    }

    handleWheel(event) {
        // Melhorar suavidade do scroll
        if (Math.abs(event.deltaY) < 50) {
            // Scroll suave para pequenos deltas
            event.preventDefault();
            
            this.container.scrollTop += event.deltaY;
        }
    }

    handleResize() {
        this.updateContainerDimensions();
        this.calculateVisibleRange();
        this.render();
    }

    // === Pool de Elementos ===

    createElement() {
        const element = document.createElement('div');
        element.className = 'virtual-scroller-item';
        return element;
    }

    getElementFromPool() {
        return this.itemPool.pop();
    }

    returnElementToPool(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
        
        // Limpar elemento
        if (element) {
            element.innerHTML = '';
            element.removeAttribute('data-index');
            this.itemPool.push(element);
        }
        
        // Limitar tamanho do pool
        if (this.itemPool.length > 50) {
            this.itemPool.splice(0, this.itemPool.length - 50);
        }
    }

    // === Utilitários ===

    adjustIndicesAfterInsert(position, count) {
        const newItemHeights = new Map();
        const newRenderedItems = new Map();
        
        this.itemHeights.forEach((height, index) => {
            const newIndex = index >= position ? index + count : index;
            newItemHeights.set(newIndex, height);
        });
        
        this.renderedItems.forEach((element, index) => {
            const newIndex = index >= position ? index + count : index;
            newRenderedItems.set(newIndex, element);
            element.setAttribute('data-index', newIndex);
        });
        
        this.itemHeights = newItemHeights;
        this.renderedItems = newRenderedItems;
    }

    adjustIndicesAfterRemove(removedIndices) {
        const newItemHeights = new Map();
        const newRenderedItems = new Map();
        
        this.itemHeights.forEach((height, index) => {
            let newIndex = index;
            removedIndices.forEach(removedIndex => {
                if (index > removedIndex) newIndex--;
            });
            
            if (newIndex >= 0) {
                newItemHeights.set(newIndex, height);
            }
        });
        
        this.renderedItems.forEach((element, index) => {
            let newIndex = index;
            removedIndices.forEach(removedIndex => {
                if (index > removedIndex) newIndex--;
            });
            
            if (newIndex >= 0) {
                newRenderedItems.set(newIndex, element);
                element.setAttribute('data-index', newIndex);
            } else {
                this.returnElementToPool(element);
            }
        });
        
        this.itemHeights = newItemHeights;
        this.renderedItems = newRenderedItems;
    }

    defaultRenderItem(item, index) {
        return `<div style="padding: 12px; border-bottom: 1px solid #eee;">Item ${index}: ${JSON.stringify(item)}</div>`;
    }

    getElement(selector) {
        if (typeof selector === 'string') {
            return document.querySelector(selector);
        } else if (selector instanceof Element) {
            return selector;
        }
        return null;
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // === API de Status ===

    getStats() {
        return {
            totalItems: this.data.length,
            renderedItems: this.renderedItems.size,
            visibleRange: { start: this.startIndex, end: this.endIndex },
            containerHeight: this.containerHeight,
            totalHeight: this.totalHeight,
            averageItemHeight: this.averageItemHeight,
            isScrolling: this.isScrolling,
            poolSize: this.itemPool.length
        };
    }

    getVisibleItems() {
        const items = [];
        for (let i = this.startIndex; i <= this.endIndex; i++) {
            if (i >= 0 && i < this.data.length) {
                items.push({
                    index: i,
                    data: this.data[i],
                    element: this.renderedItems.get(i)
                });
            }
        }
        return items;
    }

    // === Destruição ===

    destroy() {
        // Remover event listeners
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        clearTimeout(this.scrollTimeout);
        
        // Limpar DOM
        this.viewport.innerHTML = '';
        this.container.removeChild(this.viewport);
        
        // Limpar referências
        this.data = [];
        this.renderedItems.clear();
        this.itemHeights.clear();
        this.itemPool = [];
        
        console.log('[VirtualScroller] Destruído');
    }
}

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualScroller;
} 
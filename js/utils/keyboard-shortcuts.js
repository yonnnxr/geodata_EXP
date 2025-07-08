// Sistema de Atalhos de Teclado
class KeyboardShortcuts {
    constructor(options = {}) {
        this.options = {
            enabled: options.enabled !== false,
            showHelp: options.showHelp !== false,
            preventDefault: options.preventDefault !== false,
            scope: options.scope || 'global',
            debug: options.debug || false
        };

        this.shortcuts = new Map();
        this.sequences = new Map(); // Para combinações de teclas
        this.currentSequence = [];
        this.sequenceTimeout = null;
        this.sequenceDelay = 1000; // 1 segundo para sequências
        
        this.modifierKeys = {
            ctrl: false,
            alt: false,
            shift: false,
            meta: false
        };

        this.helpVisible = false;
        this.enabled = true;
        
        this.init();
    }

    init() {
        if (!this.options.enabled) return;

        this.setupEventListeners();
        this.registerDefaultShortcuts();
        this.createHelpModal();
        
        console.log('[KeyboardShortcuts] Sistema inicializado');
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Prevenir conflitos com formulários
        document.addEventListener('focusin', this.handleFocusIn.bind(this));
        document.addEventListener('focusout', this.handleFocusOut.bind(this));
        
        // Reset de modificadores quando janela perde foco
        window.addEventListener('blur', this.resetModifiers.bind(this));
    }

    handleKeyDown(event) {
        if (!this.enabled) return;
        
        // Atualizar estado dos modificadores
        this.updateModifiers(event);
        
        // Ignorar em campos de entrada (exceto atalhos específicos)
        if (this.isInputElement(event.target) && !this.isGlobalShortcut(event)) {
            return;
        }

        const key = this.normalizeKey(event.key);
        const shortcutKey = this.buildShortcutKey(key, this.modifierKeys);
        
        // Verificar se é um atalho registrado
        if (this.shortcuts.has(shortcutKey)) {
            const shortcut = this.shortcuts.get(shortcutKey);
            
            if (this.options.preventDefault || shortcut.preventDefault !== false) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            this.executeShortcut(shortcut, event);
            this.logShortcut(shortcutKey, shortcut);
            return;
        }

        // Verificar sequências de teclas
        this.handleSequence(key, event);
    }

    handleKeyUp(event) {
        this.updateModifiers(event, false);
    }

    handleFocusIn(event) {
        // Desabilitar alguns atalhos quando em inputs
        if (this.isInputElement(event.target)) {
            this.inputFocused = true;
        }
    }

    handleFocusOut(event) {
        this.inputFocused = false;
    }

    updateModifiers(event, pressed = true) {
        this.modifierKeys.ctrl = pressed ? event.ctrlKey : false;
        this.modifierKeys.alt = pressed ? event.altKey : false;
        this.modifierKeys.shift = pressed ? event.shiftKey : false;
        this.modifierKeys.meta = pressed ? event.metaKey : false;
    }

    resetModifiers() {
        this.modifierKeys = {
            ctrl: false,
            alt: false,
            shift: false,
            meta: false
        };
    }

    normalizeKey(key) {
        // Verificação robusta para evitar erros
        if (!key || typeof key !== 'string') {
            console.debug('[KeyboardShortcuts] Key inválida recebida:', key);
            return '';
        }

        try {
            // Normalizar teclas para consistência
            const keyMap = {
                ' ': 'Space',
                'ArrowUp': 'Up',
                'ArrowDown': 'Down',
                'ArrowLeft': 'Left',
                'ArrowRight': 'Right',
                'Escape': 'Esc',
                'Unidentified': '' // Alguns dispositivos podem retornar 'Unidentified'
            };
            
            const mapped = keyMap[key] || key;
            return typeof mapped === 'string' ? mapped.toLowerCase() : '';
        } catch (error) {
            console.warn('[KeyboardShortcuts] Erro ao normalizar tecla:', key, error);
            return '';
        }
    }

    buildShortcutKey(key, modifiers) {
        const parts = [];
        
        if (modifiers.ctrl) parts.push('ctrl');
        if (modifiers.alt) parts.push('alt');
        if (modifiers.shift) parts.push('shift');
        if (modifiers.meta) parts.push('meta');
        
        if (key) parts.push(key);
        
        return parts.join('+');
    }

    isInputElement(element) {
        const inputTypes = ['input', 'textarea', 'select', 'contenteditable'];
        return inputTypes.includes(element.tagName.toLowerCase()) ||
               element.contentEditable === 'true';
    }

    isGlobalShortcut(event) {
        // Atalhos que funcionam mesmo em inputs
        const globalShortcuts = ['f1', 'ctrl+/', 'esc', 'ctrl+k'];
        const normalized = this.normalizeKey(event.key);
        if (!normalized) return false;
        
        const key = this.buildShortcutKey(normalized, this.modifierKeys);
        return globalShortcuts.includes(key);
    }

    // === Registro de Atalhos ===
    
    register(shortcut, callback, options = {}) {
        const key = this.parseShortcut(shortcut);
        
        const shortcutObj = {
            key,
            callback,
            description: options.description || '',
            category: options.category || 'Geral',
            scope: options.scope || 'global',
            preventDefault: options.preventDefault,
            enabled: options.enabled !== false
        };
        
        this.shortcuts.set(key, shortcutObj);
        
        if (this.options.debug) {
            console.log(`[KeyboardShortcuts] Registrado: ${shortcut} -> ${key}`);
        }
        
        return this;
    }

    registerSequence(sequence, callback, options = {}) {
        const sequenceKey = sequence.join(' ');
        
        this.sequences.set(sequenceKey, {
            sequence,
            callback,
            description: options.description || '',
            category: options.category || 'Sequências'
        });
        
        return this;
    }

    parseShortcut(shortcut) {
        return shortcut.toLowerCase()
                      .replace(/\s+/g, '')
                      .replace(/command|cmd/g, 'meta')
                      .replace(/option/g, 'alt')
                      .replace(/control/g, 'ctrl');
    }

    unregister(shortcut) {
        const key = this.parseShortcut(shortcut);
        return this.shortcuts.delete(key);
    }

    // === Sequências de Teclas ===
    
    handleSequence(key, event) {
        this.currentSequence.push(key);
        
        // Limitar tamanho da sequência
        if (this.currentSequence.length > 5) {
            this.currentSequence.shift();
        }
        
        // Verificar se alguma sequência coincide
        for (const [sequenceKey, sequenceObj] of this.sequences) {
            const sequence = sequenceObj.sequence;
            
            if (this.matchesSequence(this.currentSequence, sequence)) {
                event.preventDefault();
                sequenceObj.callback(event);
                this.currentSequence = [];
                this.clearSequenceTimeout();
                return;
            }
        }
        
        // Reset da sequência após delay
        this.clearSequenceTimeout();
        this.sequenceTimeout = setTimeout(() => {
            this.currentSequence = [];
        }, this.sequenceDelay);
    }

    matchesSequence(current, target) {
        if (current.length < target.length) return false;
        
        const slice = current.slice(-target.length);
        return slice.every((key, index) => key === target[index]);
    }

    clearSequenceTimeout() {
        if (this.sequenceTimeout) {
            clearTimeout(this.sequenceTimeout);
            this.sequenceTimeout = null;
        }
    }

    // === Execução ===
    
    executeShortcut(shortcut, event) {
        if (!shortcut.enabled) return;
        
        try {
            shortcut.callback(event);
            
            // Feedback visual
            this.showShortcutFeedback(shortcut);
            
        } catch (error) {
            console.error('[KeyboardShortcuts] Erro ao executar atalho:', error);
            
            if (window.errorMonitor) {
                window.errorMonitor.logError('Erro em atalho de teclado', {
                    shortcut: shortcut.key,
                    error: error.message
                });
            }
        }
    }

    showShortcutFeedback(shortcut) {
        if (!this.options.showFeedback) return;
        
        // Criar indicador visual temporário
        const indicator = document.createElement('div');
        indicator.className = 'shortcut-feedback';
        indicator.textContent = shortcut.key.toUpperCase();
        
        Object.assign(indicator.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: '10000',
            animation: 'shortcutFeedback 1s ease-out forwards'
        });
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 1000);
    }

    logShortcut(key, shortcut) {
        if (this.options.debug) {
            console.log(`[KeyboardShortcuts] Executado: ${key}`, shortcut);
        }
    }

    // === Atalhos Padrão ===
    
    registerDefaultShortcuts() {
        // Navegação básica
        this.register('ctrl+/', () => this.toggleHelp(), {
            description: 'Mostrar/ocultar ajuda de atalhos',
            category: 'Navegação'
        });

        this.register('esc', () => this.handleEscape(), {
            description: 'Cancelar/fechar modal/menu',
            category: 'Navegação'
        });

        this.register('f1', () => this.toggleHelp(), {
            description: 'Mostrar ajuda',
            category: 'Ajuda'
        });

        // Navegação por páginas
        this.register('alt+h', () => this.navigateTo('pagina_inicial.html'), {
            description: 'Ir para página inicial',
            category: 'Navegação'
        });

        this.register('alt+m', () => this.navigateTo('map.html'), {
            description: 'Ir para o mapa',
            category: 'Navegação'
        });

        this.register('alt+s', () => this.navigateTo('estatisticas.html'), {
            description: 'Ir para estatísticas',
            category: 'Navegação'
        });

        this.register('alt+c', () => this.navigateTo('configuracoes.html'), {
            description: 'Ir para configurações',
            category: 'Navegação'
        });

        this.register('alt+a', () => this.navigateTo('admin.html'), {
            description: 'Ir para administração',
            category: 'Navegação'
        });

        // Operações comuns
        this.register('ctrl+r', (e) => this.refresh(e), {
            description: 'Atualizar dados',
            category: 'Ações'
        });

        this.register('ctrl+s', (e) => this.save(e), {
            description: 'Salvar',
            category: 'Ações'
        });

        this.register('ctrl+k', () => this.openSearchModal(), {
            description: 'Busca rápida',
            category: 'Busca'
        });

        this.register('ctrl+shift+d', () => this.toggleDebugMode(), {
            description: 'Alternar modo debug',
            category: 'Desenvolvimento'
        });

        // Zoom e visualização (para mapas)
        this.register('+', () => this.zoomIn(), {
            description: 'Aumentar zoom',
            category: 'Mapa'
        });

        this.register('-', () => this.zoomOut(), {
            description: 'Diminuir zoom',
            category: 'Mapa'
        });

        this.register('0', () => this.resetZoom(), {
            description: 'Reset zoom',
            category: 'Mapa'
        });

        // Sequências especiais (Easter eggs)
        this.registerSequence(['k', 'o', 'n', 'a', 'm', 'i'], () => {
            this.showEasterEgg('🎮 Konami Code ativado!');
        }, {
            description: 'Código Konami',
            category: 'Easter Eggs'
        });

        this.registerSequence(['s', 'i', 's', 'g', 'e', 't', 'i'], () => {
            this.showEasterEgg('🗺️ SisGeti é incrível!');
        }, {
            description: 'Mensagem especial',
            category: 'Easter Eggs'
        });
    }

    // === Ações dos Atalhos ===
    
    navigateTo(page) {
        if (window.location.pathname.includes(page)) {
            if (window.notifications) {
                window.notifications.info(`Você já está em ${page}`);
            }
            return;
        }
        
        window.location.href = page;
    }

    handleEscape() {
        // Fechar modais, menus, overlays
        const modals = document.querySelectorAll('.modal.show, .overlay.show, .dropdown.open');
        
        if (modals.length > 0) {
            modals.forEach(modal => {
                if (modal.classList.contains('modal')) {
                    modal.classList.remove('show');
                }
                if (modal.classList.contains('overlay')) {
                    modal.classList.remove('show');
                }
                if (modal.classList.contains('dropdown')) {
                    modal.classList.remove('open');
                }
            });
            return;
        }

        // Fechar ajuda se estiver aberta
        if (this.helpVisible) {
            this.hideHelp();
            return;
        }

        // Limpar seleções
        this.clearSelections();
    }

    refresh(event) {
        event.preventDefault();
        
        // Buscar função de refresh específica da página
        if (window.refreshPageData && typeof window.refreshPageData === 'function') {
            window.refreshPageData();
        } else {
            // Fallback: recarregar a página
            window.location.reload();
        }
        
        if (window.notifications) {
            window.notifications.info('Dados atualizados');
        }
    }

    save(event) {
        event.preventDefault();
        
        // Buscar função de save específica da página
        if (window.savePageData && typeof window.savePageData === 'function') {
            window.savePageData();
        } else {
            // Buscar formulário ativo
            const activeForm = document.querySelector('form:focus-within, form.active');
            if (activeForm) {
                activeForm.requestSubmit();
            }
        }
    }

    openSearchModal() {
        // Implementar modal de busca rápida
        this.createSearchModal();
    }

    toggleDebugMode() {
        // Alternar modo debug
        const debugMode = !localStorage.getItem('debugMode');
        localStorage.setItem('debugMode', debugMode);
        
        if (window.notifications) {
            window.notifications.info(`Modo debug ${debugMode ? 'ativado' : 'desativado'}`);
        }
        
        // Aplicar estilos de debug
        document.body.classList.toggle('debug-mode', debugMode);
    }

    zoomIn() {
        if (window.mapInstance && window.mapInstance.zoomIn) {
            window.mapInstance.zoomIn();
        }
    }

    zoomOut() {
        if (window.mapInstance && window.mapInstance.zoomOut) {
            window.mapInstance.zoomOut();
        }
    }

    resetZoom() {
        if (window.mapInstance && window.mapInstance.setZoom) {
            window.mapInstance.setZoom(12); // zoom padrão
        }
    }

    clearSelections() {
        // Limpar seleções de texto e elementos
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
        
        // Remover focus de elementos
        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }
    }

    showEasterEgg(message) {
        if (window.notifications) {
            window.notifications.success(message, 3000);
        }
        
        // Adicionar efeito visual especial
        document.body.style.animation = 'rainbow 2s ease-in-out';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 2000);
    }

    // === Interface de Ajuda ===
    
    createHelpModal() {
        const helpModal = document.createElement('div');
        helpModal.id = 'keyboard-help-modal';
        helpModal.className = 'keyboard-help-modal';
        helpModal.innerHTML = this.generateHelpHTML();
        
        document.body.appendChild(helpModal);
        
        // Event listeners
        const closeBtn = helpModal.querySelector('.close-help');
        closeBtn?.addEventListener('click', () => this.hideHelp());
        
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                this.hideHelp();
            }
        });
    }

    generateHelpHTML() {
        const categories = this.groupShortcutsByCategory();
        
        let html = `
            <div class="help-content">
                <div class="help-header">
                    <h2>⌨️ Atalhos de Teclado</h2>
                    <button class="close-help" aria-label="Fechar ajuda">×</button>
                </div>
                <div class="help-body">
        `;
        
        for (const [category, shortcuts] of Object.entries(categories)) {
            html += `
                <div class="shortcut-category">
                    <h3>${category}</h3>
                    <div class="shortcuts-list">
            `;
            
            shortcuts.forEach(shortcut => {
                const keys = this.formatShortcutKey(shortcut.key);
                html += `
                    <div class="shortcut-item">
                        <div class="shortcut-keys">${keys}</div>
                        <div class="shortcut-description">${shortcut.description}</div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += `
                </div>
                <div class="help-footer">
                    <p>Pressione <kbd>Esc</kbd> ou <kbd>Ctrl</kbd>+<kbd>/</kbd> para fechar</p>
                </div>
            </div>
        `;
        
        return html;
    }

    groupShortcutsByCategory() {
        const categories = {};
        
        for (const shortcut of this.shortcuts.values()) {
            const category = shortcut.category || 'Geral';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(shortcut);
        }
        
        // Adicionar sequências
        for (const sequence of this.sequences.values()) {
            const category = sequence.category || 'Sequências';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push({
                key: sequence.sequence.join(' '),
                description: sequence.description
            });
        }
        
        return categories;
    }

    formatShortcutKey(key) {
        return key.split('+')
                  .map(part => `<kbd>${part.toUpperCase()}</kbd>`)
                  .join(' + ');
    }

    toggleHelp() {
        if (this.helpVisible) {
            this.hideHelp();
        } else {
            this.showHelp();
        }
    }

    showHelp() {
        const modal = document.getElementById('keyboard-help-modal');
        if (modal) {
            modal.classList.add('show');
            this.helpVisible = true;
        }
    }

    hideHelp() {
        const modal = document.getElementById('keyboard-help-modal');
        if (modal) {
            modal.classList.remove('show');
            this.helpVisible = false;
        }
    }

    createSearchModal() {
        // Implementar modal de busca rápida
        if (document.getElementById('quick-search-modal')) return;
        
        const searchModal = document.createElement('div');
        searchModal.id = 'quick-search-modal';
        searchModal.className = 'quick-search-modal';
        searchModal.innerHTML = `
            <div class="search-content">
                <div class="search-box">
                    <input type="text" id="quick-search-input" placeholder="Buscar páginas, ações...">
                    <button class="search-close">×</button>
                </div>
                <div class="search-results" id="quick-search-results"></div>
            </div>
        `;
        
        document.body.appendChild(searchModal);
        
        // Mostrar e focar
        requestAnimationFrame(() => {
            searchModal.classList.add('show');
            const input = searchModal.querySelector('#quick-search-input');
            input.focus();
            
            // Event listeners
            input.addEventListener('input', (e) => this.handleQuickSearch(e.target.value));
            input.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
            
            searchModal.querySelector('.search-close').addEventListener('click', () => {
                this.closeSearchModal();
            });
            
            searchModal.addEventListener('click', (e) => {
                if (e.target === searchModal) {
                    this.closeSearchModal();
                }
            });
        });
    }

    handleQuickSearch(query) {
        const results = this.searchCommands(query);
        this.displaySearchResults(results);
    }

    searchCommands(query) {
        if (!query.trim()) return [];
        
        const searchableItems = [
            { name: 'Página Inicial', action: () => this.navigateTo('pagina_inicial.html'), type: 'page' },
            { name: 'Mapa', action: () => this.navigateTo('map.html'), type: 'page' },
            { name: 'Estatísticas', action: () => this.navigateTo('estatisticas.html'), type: 'page' },
            { name: 'Configurações', action: () => this.navigateTo('configuracoes.html'), type: 'page' },
            { name: 'Administração', action: () => this.navigateTo('admin.html'), type: 'page' },
            { name: 'Atualizar Dados', action: () => this.refresh({ preventDefault: () => {} }), type: 'action' },
            { name: 'Modo Debug', action: () => this.toggleDebugMode(), type: 'action' },
            { name: 'Limpar Cache', action: () => window.clearAppCache?.('all'), type: 'action' }
        ];
        
        return searchableItems.filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8);
    }

    displaySearchResults(results) {
        const container = document.getElementById('quick-search-results');
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = '<div class="no-results">Nenhum resultado encontrado</div>';
            return;
        }
        
        container.innerHTML = results.map((result, index) => `
            <div class="search-result-item ${index === 0 ? 'selected' : ''}" data-index="${index}">
                <div class="result-icon">${result.type === 'page' ? '📄' : '⚡'}</div>
                <div class="result-text">${result.name}</div>
            </div>
        `).join('');
        
        // Event listeners para clique
        container.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.executeSearchResult(results[index]);
                this.closeSearchModal();
            });
        });
    }

    handleSearchKeydown(event) {
        const results = document.querySelectorAll('.search-result-item');
        const selected = document.querySelector('.search-result-item.selected');
        
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                this.closeSearchModal();
                break;
                
            case 'Enter':
                event.preventDefault();
                if (selected) {
                    const index = parseInt(selected.dataset.index);
                    const resultsData = this.searchCommands(event.target.value);
                    if (resultsData[index]) {
                        this.executeSearchResult(resultsData[index]);
                        this.closeSearchModal();
                    }
                }
                break;
                
            case 'ArrowDown':
                event.preventDefault();
                this.moveSearchSelection(1, results);
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                this.moveSearchSelection(-1, results);
                break;
        }
    }

    moveSearchSelection(direction, results) {
        const selected = document.querySelector('.search-result-item.selected');
        const currentIndex = selected ? parseInt(selected.dataset.index) : -1;
        const newIndex = Math.max(0, Math.min(results.length - 1, currentIndex + direction));
        
        results.forEach(item => item.classList.remove('selected'));
        if (results[newIndex]) {
            results[newIndex].classList.add('selected');
        }
    }

    executeSearchResult(result) {
        if (result.action) {
            result.action();
        }
    }

    closeSearchModal() {
        const modal = document.getElementById('quick-search-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    // === API Pública ===
    
    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    isEnabled() {
        return this.enabled;
    }

    getShortcuts() {
        return Array.from(this.shortcuts.values());
    }

    getShortcutsByCategory() {
        return this.groupShortcutsByCategory();
    }

    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('blur', this.resetModifiers);
        
        const helpModal = document.getElementById('keyboard-help-modal');
        if (helpModal) {
            helpModal.remove();
        }
        
        console.log('[KeyboardShortcuts] Sistema destruído');
    }
}

// Inicializar automaticamente
window.addEventListener('DOMContentLoaded', () => {
    window.keyboardShortcuts = new KeyboardShortcuts({
        showFeedback: true,
        debug: localStorage.getItem('debugMode') === 'true'
    });
    
    // Função global para registrar novos atalhos
    window.registerShortcut = (shortcut, callback, options) => {
        return window.keyboardShortcuts.register(shortcut, callback, options);
    };
});

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardShortcuts;
} 
// Sistema de Temas
class ThemeSystem {
    constructor(options = {}) {
        this.options = {
            defaultTheme: options.defaultTheme || 'auto',
            storageKey: options.storageKey || 'app-theme',
            themeAttribute: options.themeAttribute || 'data-theme',
            customThemes: options.customThemes || {},
            respectSystemPreference: options.respectSystemPreference !== false,
            smoothTransitions: options.smoothTransitions !== false,
            debug: options.debug || false,
            onThemeChange: options.onThemeChange || null,
            enableHighContrast: options.enableHighContrast !== false,
            enableCustomColors: options.enableCustomColors !== false
        };

        this.themes = new Map();
        this.currentTheme = null;
        this.systemPreference = 'light';
        this.customColors = new Map();
        
        this.mediaQueryList = null;
        this.transitionElements = [];
        
        this.init();
    }

    init() {
        this.registerBuiltInThemes();
        this.registerCustomThemes();
        this.setupSystemPreferenceDetection();
        this.setupTransitions();
        this.loadSavedTheme();
        
        console.log('[ThemeSystem] Sistema inicializado');
    }

    // === Built-in Themes ===

    registerBuiltInThemes() {
        // Light Theme
        this.registerTheme('light', {
            name: 'Claro',
            description: 'Tema claro padrão',
            colors: {
                // Primary colors
                primary: '#007bff',
                primaryHover: '#0056b3',
                primaryActive: '#004085',
                
                // Secondary colors
                secondary: '#6c757d',
                secondaryHover: '#545b62',
                secondaryActive: '#494f54',
                
                // Background colors
                background: '#ffffff',
                backgroundSecondary: '#f8f9fa',
                backgroundTertiary: '#e9ecef',
                
                // Surface colors
                surface: '#ffffff',
                surfaceHover: '#f8f9fa',
                surfaceActive: '#e9ecef',
                
                // Text colors
                textPrimary: '#212529',
                textSecondary: '#6c757d',
                textMuted: '#adb5bd',
                textInverse: '#ffffff',
                
                // Border colors
                border: '#dee2e6',
                borderHover: '#adb5bd',
                borderActive: '#6c757d',
                
                // Status colors
                success: '#28a745',
                warning: '#ffc107',
                danger: '#dc3545',
                info: '#17a2b8',
                
                // Shadows
                shadowSmall: 'rgba(0, 0, 0, 0.1)',
                shadowMedium: 'rgba(0, 0, 0, 0.15)',
                shadowLarge: 'rgba(0, 0, 0, 0.2)'
            },
            properties: {
                borderRadius: '6px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '14px',
                lineHeight: '1.5',
                transitionDuration: '0.2s',
                transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            },
            type: 'built-in'
        });

        // Dark Theme
        this.registerTheme('dark', {
            name: 'Escuro',
            description: 'Tema escuro para reduzir cansaço visual',
            colors: {
                primary: '#0d6efd',
                primaryHover: '#0b5ed7',
                primaryActive: '#0a58ca',
                
                secondary: '#6c757d',
                secondaryHover: '#5a6268',
                secondaryActive: '#495057',
                
                background: '#121212',
                backgroundSecondary: '#1e1e1e',
                backgroundTertiary: '#2d2d2d',
                
                surface: '#1e1e1e',
                surfaceHover: '#2d2d2d',
                surfaceActive: '#3d3d3d',
                
                textPrimary: '#ffffff',
                textSecondary: '#adb5bd',
                textMuted: '#6c757d',
                textInverse: '#000000',
                
                border: '#495057',
                borderHover: '#6c757d',
                borderActive: '#adb5bd',
                
                success: '#198754',
                warning: '#fd7e14',
                danger: '#dc3545',
                info: '#0dcaf0',
                
                shadowSmall: 'rgba(0, 0, 0, 0.3)',
                shadowMedium: 'rgba(0, 0, 0, 0.4)',
                shadowLarge: 'rgba(0, 0, 0, 0.5)'
            },
            properties: {
                borderRadius: '6px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '14px',
                lineHeight: '1.5',
                transitionDuration: '0.2s',
                transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            },
            type: 'built-in'
        });

        // High Contrast Theme
        if (this.options.enableHighContrast) {
            this.registerTheme('high-contrast', {
                name: 'Alto Contraste',
                description: 'Tema de alto contraste para melhor acessibilidade',
                colors: {
                    primary: '#ffffff',
                    primaryHover: '#f0f0f0',
                    primaryActive: '#e0e0e0',
                    
                    secondary: '#ffffff',
                    secondaryHover: '#f0f0f0',
                    secondaryActive: '#e0e0e0',
                    
                    background: '#000000',
                    backgroundSecondary: '#1a1a1a',
                    backgroundTertiary: '#333333',
                    
                    surface: '#000000',
                    surfaceHover: '#1a1a1a',
                    surfaceActive: '#333333',
                    
                    textPrimary: '#ffffff',
                    textSecondary: '#ffffff',
                    textMuted: '#cccccc',
                    textInverse: '#000000',
                    
                    border: '#ffffff',
                    borderHover: '#ffffff',
                    borderActive: '#ffffff',
                    
                    success: '#00ff00',
                    warning: '#ffff00',
                    danger: '#ff0000',
                    info: '#00ffff',
                    
                    shadowSmall: 'rgba(255, 255, 255, 0.1)',
                    shadowMedium: 'rgba(255, 255, 255, 0.2)',
                    shadowLarge: 'rgba(255, 255, 255, 0.3)'
                },
                properties: {
                    borderRadius: '2px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    transitionDuration: '0s', // Sem transições para melhor acessibilidade
                    transitionEasing: 'none'
                },
                type: 'accessibility'
            });
        }

        // Blue Theme
        this.registerTheme('blue', {
            name: 'Azul',
            description: 'Tema azul profissional',
            colors: {
                primary: '#2563eb',
                primaryHover: '#1d4ed8',
                primaryActive: '#1e40af',
                
                secondary: '#64748b',
                secondaryHover: '#475569',
                secondaryActive: '#334155',
                
                background: '#f8fafc',
                backgroundSecondary: '#f1f5f9',
                backgroundTertiary: '#e2e8f0',
                
                surface: '#ffffff',
                surfaceHover: '#f8fafc',
                surfaceActive: '#f1f5f9',
                
                textPrimary: '#1e293b',
                textSecondary: '#475569',
                textMuted: '#94a3b8',
                textInverse: '#ffffff',
                
                border: '#e2e8f0',
                borderHover: '#cbd5e1',
                borderActive: '#94a3b8',
                
                success: '#059669',
                warning: '#d97706',
                danger: '#dc2626',
                info: '#0891b2',
                
                shadowSmall: 'rgba(59, 130, 246, 0.1)',
                shadowMedium: 'rgba(59, 130, 246, 0.15)',
                shadowLarge: 'rgba(59, 130, 246, 0.2)'
            },
            properties: {
                borderRadius: '8px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '14px',
                lineHeight: '1.5',
                transitionDuration: '0.2s',
                transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            },
            type: 'color'
        });

        // Green Theme
        this.registerTheme('green', {
            name: 'Verde',
            description: 'Tema verde natural',
            colors: {
                primary: '#059669',
                primaryHover: '#047857',
                primaryActive: '#065f46',
                
                secondary: '#6b7280',
                secondaryHover: '#4b5563',
                secondaryActive: '#374151',
                
                background: '#f9fafb',
                backgroundSecondary: '#f3f4f6',
                backgroundTertiary: '#e5e7eb',
                
                surface: '#ffffff',
                surfaceHover: '#f9fafb',
                surfaceActive: '#f3f4f6',
                
                textPrimary: '#111827',
                textSecondary: '#4b5563',
                textMuted: '#9ca3af',
                textInverse: '#ffffff',
                
                border: '#e5e7eb',
                borderHover: '#d1d5db',
                borderActive: '#9ca3af',
                
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
                info: '#06b6d4',
                
                shadowSmall: 'rgba(16, 185, 129, 0.1)',
                shadowMedium: 'rgba(16, 185, 129, 0.15)',
                shadowLarge: 'rgba(16, 185, 129, 0.2)'
            },
            properties: {
                borderRadius: '6px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '14px',
                lineHeight: '1.5',
                transitionDuration: '0.2s',
                transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            },
            type: 'color'
        });
    }

    registerCustomThemes() {
        Object.entries(this.options.customThemes).forEach(([id, theme]) => {
            this.registerTheme(id, { ...theme, type: 'custom' });
        });
    }

    registerTheme(id, theme) {
        this.themes.set(id, theme);
        
        if (this.options.debug) {
            console.log(`[ThemeSystem] Tema registrado: ${id}`, theme);
        }
    }

    // === System Preference Detection ===

    setupSystemPreferenceDetection() {
        if (!this.options.respectSystemPreference) return;

        this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        this.systemPreference = this.mediaQueryList.matches ? 'dark' : 'light';

        this.mediaQueryList.addEventListener('change', (e) => {
            this.systemPreference = e.matches ? 'dark' : 'light';
            
            if (this.currentTheme === 'auto') {
                this.applyTheme('auto');
            }
        });

        // Detectar preferência de alto contraste
        if (this.options.enableHighContrast) {
            const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
            
            if (highContrastQuery.matches && this.currentTheme === 'auto') {
                this.applyTheme('high-contrast');
            }
            
            highContrastQuery.addEventListener('change', (e) => {
                if (e.matches && this.currentTheme === 'auto') {
                    this.applyTheme('high-contrast');
                }
            });
        }
    }

    // === Theme Application ===

    applyTheme(themeId) {
        let resolvedThemeId = themeId;
        
        // Resolver tema 'auto'
        if (themeId === 'auto') {
            resolvedThemeId = this.systemPreference;
        }

        const theme = this.themes.get(resolvedThemeId);
        if (!theme) {
            console.warn(`[ThemeSystem] Tema não encontrado: ${resolvedThemeId}`);
            return false;
        }

        // Preparar transição
        if (this.options.smoothTransitions && this.currentTheme) {
            this.prepareTransition();
        }

        // Aplicar variáveis CSS
        this.applyCSSVariables(theme);
        
        // Definir atributo no HTML
        document.documentElement.setAttribute(this.options.themeAttribute, resolvedThemeId);
        
        // Atualizar classes do body
        this.updateBodyClasses(resolvedThemeId, theme);
        
        // Salvar preferência
        this.saveThemePreference(themeId); // Salvar o original, não o resolvido
        
        const oldTheme = this.currentTheme;
        this.currentTheme = themeId;

        // Callback de mudança
        if (this.options.onThemeChange) {
            this.options.onThemeChange(themeId, resolvedThemeId, theme, oldTheme);
        }

        // Completar transição
        if (this.options.smoothTransitions && oldTheme) {
            this.completeTransition();
        }

        // Atualizar favicon se existir versão temática
        this.updateFavicon(resolvedThemeId);
        
        // Atualizar meta theme-color
        this.updateMetaThemeColor(theme);

        if (this.options.debug) {
            console.log(`[ThemeSystem] Tema aplicado: ${themeId} -> ${resolvedThemeId}`);
        }

        return true;
    }

    applyCSSVariables(theme) {
        const root = document.documentElement;
        
        // Aplicar cores
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${this.kebabCase(key)}`, value);
        });
        
        // Aplicar propriedades
        Object.entries(theme.properties).forEach(([key, value]) => {
            root.style.setProperty(`--${this.kebabCase(key)}`, value);
        });
    }

    updateBodyClasses(themeId, theme) {
        const body = document.body;
        
        // Remover classes de tema anteriores
        body.classList.forEach(className => {
            if (className.startsWith('theme-')) {
                body.classList.remove(className);
            }
        });
        
        // Adicionar nova classe de tema
        body.classList.add(`theme-${themeId}`);
        
        // Adicionar classe de tipo de tema
        if (theme.type) {
            body.classList.add(`theme-type-${theme.type}`);
        }
    }

    updateFavicon(themeId) {
        const favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) return;

        const themedFavicon = document.querySelector(`link[data-theme="${themeId}"]`);
        if (themedFavicon) {
            favicon.href = themedFavicon.href;
        }
    }

    updateMetaThemeColor(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        
        metaThemeColor.content = theme.colors.primary;
    }

    // === Transitions ===

    setupTransitions() {
        if (!this.options.smoothTransitions) return;

        // Adicionar CSS para transições
        const style = document.createElement('style');
        style.textContent = `
            .theme-transition * {
                transition: 
                    background-color 0.3s ease,
                    border-color 0.3s ease,
                    color 0.3s ease,
                    box-shadow 0.3s ease !important;
            }
            
            .theme-transition *::before,
            .theme-transition *::after {
                transition: 
                    background-color 0.3s ease,
                    border-color 0.3s ease,
                    color 0.3s ease,
                    box-shadow 0.3s ease !important;
            }
        `;
        document.head.appendChild(style);
    }

    prepareTransition() {
        document.body.classList.add('theme-transition');
    }

    completeTransition() {
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    }

    // === Storage ===

    loadSavedTheme() {
        const savedTheme = localStorage.getItem(this.options.storageKey);
        const themeToApply = savedTheme || this.options.defaultTheme;
        
        this.applyTheme(themeToApply);
    }

    saveThemePreference(themeId) {
        localStorage.setItem(this.options.storageKey, themeId);
    }

    // === Custom Colors ===

    setCustomColor(property, value) {
        if (!this.options.enableCustomColors) return false;
        
        this.customColors.set(property, value);
        document.documentElement.style.setProperty(`--color-${this.kebabCase(property)}`, value);
        
        // Salvar cores customizadas
        this.saveCustomColors();
        
        return true;
    }

    getCustomColor(property) {
        return this.customColors.get(property);
    }

    resetCustomColors() {
        this.customColors.clear();
        localStorage.removeItem(`${this.options.storageKey}-custom-colors`);
        
        // Reaplicar tema atual para remover customizações
        this.applyTheme(this.currentTheme);
    }

    saveCustomColors() {
        const customColorsObj = Object.fromEntries(this.customColors);
        localStorage.setItem(`${this.options.storageKey}-custom-colors`, JSON.stringify(customColorsObj));
    }

    loadCustomColors() {
        try {
            const saved = localStorage.getItem(`${this.options.storageKey}-custom-colors`);
            if (saved) {
                const customColorsObj = JSON.parse(saved);
                Object.entries(customColorsObj).forEach(([property, value]) => {
                    this.setCustomColor(property, value);
                });
            }
        } catch (error) {
            console.warn('[ThemeSystem] Erro ao carregar cores personalizadas:', error);
        }
    }

    // === Theme Switcher UI ===

    createThemeSwitcher(container, options = {}) {
        const switcherOptions = {
            showNames: options.showNames !== false,
            showPreviews: options.showPreviews !== false,
            layout: options.layout || 'dropdown', // dropdown, buttons, grid
            exclude: options.exclude || [],
            include: options.include || null,
            ...options
        };

        const targetElement = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;

        if (!targetElement) {
            console.warn('[ThemeSystem] Container não encontrado para theme switcher');
            return null;
        }

        const switcher = this.buildThemeSwitcher(switcherOptions);
        targetElement.appendChild(switcher);
        
        return switcher;
    }

    buildThemeSwitcher(options) {
        const container = document.createElement('div');
        container.className = 'theme-switcher';
        
        if (options.layout === 'dropdown') {
            return this.buildDropdownSwitcher(container, options);
        } else if (options.layout === 'buttons') {
            return this.buildButtonSwitcher(container, options);
        } else if (options.layout === 'grid') {
            return this.buildGridSwitcher(container, options);
        }
        
        return container;
    }

    buildDropdownSwitcher(container, options) {
        const select = document.createElement('select');
        select.className = 'theme-switcher-select';
        
        // Opção Auto
        if (!options.exclude.includes('auto')) {
            const autoOption = document.createElement('option');
            autoOption.value = 'auto';
            autoOption.textContent = 'Automático';
            autoOption.selected = this.currentTheme === 'auto';
            select.appendChild(autoOption);
        }
        
        // Temas disponíveis
        this.getAvailableThemes(options).forEach(([id, theme]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = theme.name;
            option.selected = this.currentTheme === id;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
        });
        
        container.appendChild(select);
        return container;
    }

    buildButtonSwitcher(container, options) {
        container.className += ' theme-switcher-buttons';
        
        // Auto button
        if (!options.exclude.includes('auto')) {
            const autoBtn = this.createThemeButton('auto', 'Automático', options);
            container.appendChild(autoBtn);
        }
        
        // Theme buttons
        this.getAvailableThemes(options).forEach(([id, theme]) => {
            const button = this.createThemeButton(id, theme.name, options);
            container.appendChild(button);
        });
        
        return container;
    }

    buildGridSwitcher(container, options) {
        container.className += ' theme-switcher-grid';
        
        // Auto option
        if (!options.exclude.includes('auto')) {
            const autoCard = this.createThemeCard('auto', 'Automático', null, options);
            container.appendChild(autoCard);
        }
        
        // Theme cards
        this.getAvailableThemes(options).forEach(([id, theme]) => {
            const card = this.createThemeCard(id, theme.name, theme, options);
            container.appendChild(card);
        });
        
        return container;
    }

    createThemeButton(themeId, themeName, options) {
        const button = document.createElement('button');
        button.className = 'theme-switcher-button';
        button.dataset.theme = themeId;
        button.textContent = themeName;
        
        if (this.currentTheme === themeId) {
            button.classList.add('active');
        }
        
        button.addEventListener('click', () => {
            // Remove active from all buttons
            container.querySelectorAll('.theme-switcher-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active to clicked button
            button.classList.add('active');
            
            // Apply theme
            this.applyTheme(themeId);
        });
        
        return button;
    }

    createThemeCard(themeId, themeName, theme, options) {
        const card = document.createElement('div');
        card.className = 'theme-switcher-card';
        card.dataset.theme = themeId;
        
        if (this.currentTheme === themeId) {
            card.classList.add('active');
        }
        
        // Preview colors
        if (options.showPreviews && theme) {
            const preview = document.createElement('div');
            preview.className = 'theme-preview';
            
            const colors = [
                theme.colors.primary,
                theme.colors.secondary,
                theme.colors.background,
                theme.colors.surface
            ];
            
            colors.forEach(color => {
                const colorSwatch = document.createElement('div');
                colorSwatch.className = 'color-swatch';
                colorSwatch.style.backgroundColor = color;
                preview.appendChild(colorSwatch);
            });
            
            card.appendChild(preview);
        }
        
        // Theme name
        if (options.showNames) {
            const name = document.createElement('div');
            name.className = 'theme-name';
            name.textContent = themeName;
            card.appendChild(name);
        }
        
        card.addEventListener('click', () => {
            // Remove active from all cards
            card.parentElement.querySelectorAll('.theme-switcher-card').forEach(c => {
                c.classList.remove('active');
            });
            
            // Add active to clicked card
            card.classList.add('active');
            
            // Apply theme
            this.applyTheme(themeId);
        });
        
        return card;
    }

    getAvailableThemes(options) {
        let themes = Array.from(this.themes.entries());
        
        // Filter by include/exclude
        if (options.include) {
            themes = themes.filter(([id]) => options.include.includes(id));
        }
        
        if (options.exclude.length > 0) {
            themes = themes.filter(([id]) => !options.exclude.includes(id));
        }
        
        return themes;
    }

    // === Utility Methods ===

    kebabCase(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }

    // === Public API ===

    getCurrentTheme() {
        return this.currentTheme;
    }

    getTheme(themeId) {
        return this.themes.get(themeId);
    }

    getAllThemes() {
        return Array.from(this.themes.entries()).map(([id, theme]) => ({
            id,
            ...theme
        }));
    }

    isDarkMode() {
        const resolvedTheme = this.currentTheme === 'auto' ? this.systemPreference : this.currentTheme;
        return resolvedTheme === 'dark' || resolvedTheme === 'high-contrast';
    }

    toggleTheme() {
        const currentResolved = this.currentTheme === 'auto' ? this.systemPreference : this.currentTheme;
        const newTheme = currentResolved === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    exportTheme(themeId) {
        const theme = this.themes.get(themeId);
        if (!theme) return null;
        
        return {
            id: themeId,
            ...theme,
            customColors: Object.fromEntries(this.customColors)
        };
    }

    importTheme(themeData) {
        const { id, customColors, ...theme } = themeData;
        
        this.registerTheme(id, theme);
        
        if (customColors) {
            Object.entries(customColors).forEach(([property, value]) => {
                this.setCustomColor(property, value);
            });
        }
        
        return true;
    }

    destroy() {
        if (this.mediaQueryList) {
            this.mediaQueryList.removeEventListener('change', this.handleSystemPreferenceChange);
        }
        
        // Remove theme classes
        document.body.classList.forEach(className => {
            if (className.startsWith('theme-')) {
                document.body.classList.remove(className);
            }
        });
        
        // Reset CSS variables
        const root = document.documentElement;
        Array.from(root.style).forEach(property => {
            if (property.startsWith('--color-') || property.startsWith('--font-') || 
                property.startsWith('--border-') || property.startsWith('--transition-')) {
                root.style.removeProperty(property);
            }
        });
        
        console.log('[ThemeSystem] Sistema destruído');
    }
}

// CSS para Theme Switcher
const themeSwitcherCSS = `
.theme-switcher {
    display: inline-block;
}

.theme-switcher-select {
    padding: 8px 12px;
    border: 1px solid var(--color-border, #dee2e6);
    border-radius: var(--border-radius, 6px);
    background: var(--color-surface, #ffffff);
    color: var(--color-text-primary, #212529);
    font-size: var(--font-size, 14px);
    cursor: pointer;
}

.theme-switcher-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.theme-switcher-button {
    padding: 8px 16px;
    border: 1px solid var(--color-border, #dee2e6);
    border-radius: var(--border-radius, 6px);
    background: var(--color-surface, #ffffff);
    color: var(--color-text-primary, #212529);
    font-size: var(--font-size, 14px);
    cursor: pointer;
    transition: all 0.2s ease;
}

.theme-switcher-button:hover {
    background: var(--color-surface-hover, #f8f9fa);
}

.theme-switcher-button.active {
    background: var(--color-primary, #007bff);
    color: var(--color-text-inverse, #ffffff);
    border-color: var(--color-primary, #007bff);
}

.theme-switcher-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
}

.theme-switcher-card {
    padding: 12px;
    border: 1px solid var(--color-border, #dee2e6);
    border-radius: var(--border-radius, 6px);
    background: var(--color-surface, #ffffff);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
}

.theme-switcher-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--color-shadow-medium, rgba(0,0,0,0.15));
}

.theme-switcher-card.active {
    border-color: var(--color-primary, #007bff);
    box-shadow: 0 0 0 2px var(--color-primary, #007bff);
}

.theme-preview {
    display: flex;
    height: 20px;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
}

.color-swatch {
    flex: 1;
    height: 100%;
}

.theme-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary, #6c757d);
}

@media (max-width: 768px) {
    .theme-switcher-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .theme-switcher-buttons {
        flex-direction: column;
    }
}
`;

// Injetar CSS
const themeStyle = document.createElement('style');
themeStyle.textContent = themeSwitcherCSS;
document.head.appendChild(themeStyle);

// Inicializar automaticamente
window.addEventListener('DOMContentLoaded', () => {
    window.themeSystem = new ThemeSystem({
        debug: localStorage.getItem('debugMode') === 'true'
    });
    
    // API global
    window.setTheme = (themeId) => {
        return window.themeSystem.applyTheme(themeId);
    };
    
    window.toggleTheme = () => {
        return window.themeSystem.toggleTheme();
    };
    
    window.getCurrentTheme = () => {
        return window.themeSystem.getCurrentTheme();
    };
});

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeSystem;
} 
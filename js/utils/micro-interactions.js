// Sistema de Micro-interações
class MicroInteractions {
    constructor(options = {}) {
        this.options = {
            enabled: options.enabled !== false,
            respectMotionPreference: options.respectMotionPreference !== false,
            hapticFeedback: options.hapticFeedback !== false,
            soundFeedback: options.soundFeedback || false,
            debug: options.debug || false,
            customAnimations: options.customAnimations || {},
            globalDuration: options.globalDuration || 300,
            easing: options.easing || 'cubic-bezier(0.4, 0, 0.2, 1)'
        };

        this.reducedMotion = false;
        this.activeAnimations = new Map();
        this.observers = [];
        this.soundContext = null;
        
        this.animationQueue = [];
        this.isProcessingQueue = false;
        
        this.hapticSupported = 'vibrate' in navigator;
        this.webAudioSupported = 'AudioContext' in window || 'webkitAudioContext' in window;
        
        this.init();
    }

    init() {
        if (!this.options.enabled) return;

        this.detectMotionPreference();
        this.setupGlobalInteractions();
        this.setupButtonInteractions();
        this.setupFormInteractions();
        this.setupCardInteractions();
        this.setupNavigationInteractions();
        this.setupLoadingInteractions();
        this.setupNotificationInteractions();
        
        if (this.options.soundFeedback) {
            this.initAudioContext();
        }
        
        console.log('[MicroInteractions] Sistema inicializado');
    }

    detectMotionPreference() {
        if (!this.options.respectMotionPreference) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.reducedMotion = prefersReducedMotion.matches;

        prefersReducedMotion.addEventListener('change', (e) => {
            this.reducedMotion = e.matches;
            
            if (this.reducedMotion) {
                this.disableAllAnimations();
            } else {
                this.enableAllAnimations();
            }
        });
    }

    // === Global Interactions ===

    setupGlobalInteractions() {
        // Click ripple effect
        document.addEventListener('click', (e) => {
            if (this.shouldCreateRipple(e.target)) {
                this.createRippleEffect(e);
            }
        });

        // Focus indicators
        document.addEventListener('focusin', (e) => {
            this.enhanceFocusIndicator(e.target);
        });

        document.addEventListener('focusout', (e) => {
            this.removeFocusIndicator(e.target);
        });

        // Scroll animations
        this.setupScrollAnimations();
        
        // Page transitions
        this.setupPageTransitions();
    }

    shouldCreateRipple(element) {
        const rippleElements = ['button', 'a', '[data-ripple]'];
        return rippleElements.some(selector => {
            if (selector.startsWith('[')) {
                return element.matches(selector);
            }
            return element.tagName.toLowerCase() === selector;
        });
    }

    createRippleEffect(event) {
        if (this.reducedMotion) return;

        const element = event.target;
        const rect = element.getBoundingClientRect();
        
        const ripple = document.createElement('span');
        ripple.className = 'micro-ripple';
        
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            transform: scale(0);
            animation: rippleAnimation 0.6s ease-out;
            pointer-events: none;
            z-index: 1000;
        `;
        
        // Garantir posição relativa no elemento pai
        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
        
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        // Remover depois da animação
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);

        // Haptic feedback
        this.triggerHapticFeedback('light');
        
        // Sound feedback
        this.playSoundFeedback('click');
    }

    enhanceFocusIndicator(element) {
        element.classList.add('micro-focus-enhanced');
        
        // Criar indicador customizado se necessário
        if (element.matches('button, a, input, select, textarea')) {
            const indicator = document.createElement('div');
            indicator.className = 'micro-focus-indicator';
            indicator.style.cssText = `
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                border: 2px solid var(--primary-color, #007bff);
                border-radius: inherit;
                animation: focusIndicatorIn 0.2s ease-out;
                pointer-events: none;
                z-index: 999;
            `;
            
            if (getComputedStyle(element).position === 'static') {
                element.style.position = 'relative';
            }
            
            element.appendChild(indicator);
        }
    }

    removeFocusIndicator(element) {
        element.classList.remove('micro-focus-enhanced');
        
        const indicator = element.querySelector('.micro-focus-indicator');
        if (indicator) {
            indicator.style.animation = 'focusIndicatorOut 0.2s ease-out forwards';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 200);
        }
    }

    // === Button Interactions ===

    setupButtonInteractions() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.enhanceButtons(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        this.observers.push(observer);
        
        // Enhance existing buttons
        this.enhanceButtons(document);
    }

    enhanceButtons(container) {
        const buttons = container.querySelectorAll('button, .btn, [role="button"]');
        
        buttons.forEach(button => {
            if (button.hasAttribute('data-micro-enhanced')) return;
            
            button.setAttribute('data-micro-enhanced', 'true');
            
            // Hover effect
            button.addEventListener('mouseenter', () => {
                this.animateButtonHover(button, true);
            });
            
            button.addEventListener('mouseleave', () => {
                this.animateButtonHover(button, false);
            });
            
            // Press effect
            button.addEventListener('mousedown', () => {
                this.animateButtonPress(button, true);
            });
            
            button.addEventListener('mouseup', () => {
                this.animateButtonPress(button, false);
            });
            
            // Loading state
            this.observeButtonLoading(button);
        });
    }

    animateButtonHover(button, isHovering) {
        if (this.reducedMotion) return;
        
        const scale = isHovering ? 1.05 : 1;
        const shadow = isHovering ? '0 4px 12px rgba(0,0,0,0.15)' : '';
        
        button.style.transition = `transform 0.2s ${this.options.easing}, box-shadow 0.2s ${this.options.easing}`;
        button.style.transform = `scale(${scale})`;
        button.style.boxShadow = shadow;
    }

    animateButtonPress(button, isPressed) {
        if (this.reducedMotion) return;
        
        const scale = isPressed ? 0.95 : 1;
        
        button.style.transition = `transform 0.1s ${this.options.easing}`;
        button.style.transform = `scale(${scale})`;
        
        if (isPressed) {
            this.triggerHapticFeedback('medium');
        }
    }

    observeButtonLoading(button) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'disabled') {
                    const isLoading = button.disabled && button.textContent.includes('...');
                    this.animateButtonLoading(button, isLoading);
                }
            });
        });
        
        observer.observe(button, { attributes: true });
        this.observers.push(observer);
    }

    animateButtonLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('micro-loading');
            
            // Adicionar spinner se não existir
            if (!button.querySelector('.micro-spinner')) {
                const spinner = document.createElement('span');
                spinner.className = 'micro-spinner';
                spinner.style.cssText = `
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-right: 8px;
                `;
                button.insertBefore(spinner, button.firstChild);
            }
        } else {
            button.classList.remove('micro-loading');
            
            const spinner = button.querySelector('.micro-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    }

    // === Form Interactions ===

    setupFormInteractions() {
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                this.animateInputChange(e.target);
            }
        });
        
        document.addEventListener('focus', (e) => {
            if (e.target.matches('input, textarea, select')) {
                this.animateInputFocus(e.target);
            }
        });
        
        document.addEventListener('blur', (e) => {
            if (e.target.matches('input, textarea, select')) {
                this.animateInputBlur(e.target);
            }
        });
        
        // Form validation animations
        this.setupValidationAnimations();
    }

    animateInputChange(input) {
        if (this.reducedMotion) return;
        
        // Pulse effect for value changes
        input.style.transition = 'border-color 0.3s ease';
        input.style.borderColor = 'var(--primary-color, #007bff)';
        
        setTimeout(() => {
            input.style.borderColor = '';
        }, 300);
        
        // Label animation for floating labels
        const label = this.findInputLabel(input);
        if (label && input.value) {
            label.classList.add('micro-label-floating');
        } else if (label) {
            label.classList.remove('micro-label-floating');
        }
    }

    animateInputFocus(input) {
        input.classList.add('micro-input-focused');
        
        // Animate label
        const label = this.findInputLabel(input);
        if (label) {
            label.classList.add('micro-label-focused');
        }
        
        this.triggerHapticFeedback('light');
    }

    animateInputBlur(input) {
        input.classList.remove('micro-input-focused');
        
        const label = this.findInputLabel(input);
        if (label) {
            label.classList.remove('micro-label-focused');
        }
    }

    findInputLabel(input) {
        // Procurar label associado
        if (input.id) {
            return document.querySelector(`label[for="${input.id}"]`);
        }
        
        // Procurar label pai
        let parent = input.parentElement;
        while (parent && parent.tagName !== 'FORM') {
            if (parent.tagName === 'LABEL') {
                return parent;
            }
            parent = parent.parentElement;
        }
        
        return null;
    }

    setupValidationAnimations() {
        // Observar mudanças na classe de validação
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const element = mutation.target;
                    if (element.matches('input, textarea, select')) {
                        this.handleValidationStateChange(element);
                    }
                }
            });
        });
        
        observer.observe(document.body, { 
            attributes: true, 
            subtree: true, 
            attributeFilter: ['class'] 
        });
        this.observers.push(observer);
    }

    handleValidationStateChange(input) {
        if (input.classList.contains('is-invalid') || input.classList.contains('error')) {
            this.animateValidationError(input);
        } else if (input.classList.contains('is-valid') || input.classList.contains('success')) {
            this.animateValidationSuccess(input);
        }
    }

    animateValidationError(input) {
        if (this.reducedMotion) return;
        
        // Shake animation
        input.style.animation = 'shake 0.5s ease-in-out';
        
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
        
        this.triggerHapticFeedback('heavy');
        this.playSoundFeedback('error');
    }

    animateValidationSuccess(input) {
        if (this.reducedMotion) return;
        
        // Success pulse
        input.style.animation = 'successPulse 0.6s ease-out';
        
        setTimeout(() => {
            input.style.animation = '';
        }, 600);
        
        this.triggerHapticFeedback('light');
        this.playSoundFeedback('success');
    }

    // === Card Interactions ===

    setupCardInteractions() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.enhanceCards(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        this.observers.push(observer);
        
        this.enhanceCards(document);
    }

    enhanceCards(container) {
        const cards = container.querySelectorAll('.card, .info-card, [data-card]');
        
        cards.forEach(card => {
            if (card.hasAttribute('data-micro-enhanced')) return;
            
            card.setAttribute('data-micro-enhanced', 'true');
            
            card.addEventListener('mouseenter', () => {
                this.animateCardHover(card, true);
            });
            
            card.addEventListener('mouseleave', () => {
                this.animateCardHover(card, false);
            });
            
            // Intersection observer para scroll animations
            if (window.IntersectionObserver) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.animateCardEntry(entry.target);
                        }
                    });
                }, { threshold: 0.1 });
                
                observer.observe(card);
                this.observers.push(observer);
            }
        });
    }

    animateCardHover(card, isHovering) {
        if (this.reducedMotion) return;
        
        const scale = isHovering ? 1.02 : 1;
        const shadow = isHovering ? '0 8px 25px rgba(0,0,0,0.15)' : '';
        const translateY = isHovering ? '-2px' : '0';
        
        card.style.transition = `transform 0.3s ${this.options.easing}, box-shadow 0.3s ${this.options.easing}`;
        card.style.transform = `scale(${scale}) translateY(${translateY})`;
        card.style.boxShadow = shadow;
    }

    animateCardEntry(card) {
        if (this.reducedMotion) return;
        if (card.hasAttribute('data-animated')) return;
        
        card.setAttribute('data-animated', 'true');
        
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            card.style.transition = `opacity 0.6s ${this.options.easing}, transform 0.6s ${this.options.easing}`;
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }

    // === Navigation Interactions ===

    setupNavigationInteractions() {
        // Menu toggle animations
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-toggle="menu"], .menu-toggle, .hamburger')) {
                this.animateMenuToggle(e.target);
            }
        });
        
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-tab], .nav-tab, .tab-button')) {
                this.animateTabSwitch(e.target);
            }
        });
        
        // Breadcrumb animations
        this.enhanceBreadcrumbs();
    }

    animateMenuToggle(toggleButton) {
        const menu = document.querySelector(toggleButton.dataset.target || '.menu, .navigation');
        
        if (menu) {
            const isOpening = !menu.classList.contains('open');
            
            if (isOpening) {
                menu.classList.add('open');
                this.animateMenuOpen(menu);
            } else {
                this.animateMenuClose(menu);
                setTimeout(() => {
                    menu.classList.remove('open');
                }, this.options.globalDuration);
            }
        }
        
        // Animate toggle button
        this.animateHamburger(toggleButton);
    }

    animateMenuOpen(menu) {
        if (this.reducedMotion) return;
        
        menu.style.opacity = '0';
        menu.style.transform = 'translateY(-10px)';
        
        requestAnimationFrame(() => {
            menu.style.transition = `opacity 0.3s ease, transform 0.3s ease`;
            menu.style.opacity = '1';
            menu.style.transform = 'translateY(0)';
        });
    }

    animateMenuClose(menu) {
        if (this.reducedMotion) return;
        
        menu.style.transition = `opacity 0.3s ease, transform 0.3s ease`;
        menu.style.opacity = '0';
        menu.style.transform = 'translateY(-10px)';
    }

    animateHamburger(button) {
        button.classList.toggle('active');
        
        // Animate hamburger lines if they exist
        const lines = button.querySelectorAll('.line, .bar');
        lines.forEach((line, index) => {
            if (button.classList.contains('active')) {
                line.style.transform = index === 0 ? 'rotate(45deg) translateY(6px)' :
                                     index === 1 ? 'opacity: 0' :
                                     'rotate(-45deg) translateY(-6px)';
            } else {
                line.style.transform = '';
            }
        });
    }

    animateTabSwitch(tab) {
        const tabs = document.querySelectorAll('[data-tab], .nav-tab, .tab-button');
        
        // Remove active from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        
        // Add active to clicked tab
        tab.classList.add('active');
        
        // Animate tab indicator
        this.animateTabIndicator(tab);
        
        this.triggerHapticFeedback('light');
    }

    animateTabIndicator(activeTab) {
        if (this.reducedMotion) return;
        
        let indicator = document.querySelector('.tab-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'tab-indicator';
            indicator.style.cssText = `
                position: absolute;
                bottom: 0;
                height: 2px;
                background: var(--primary-color, #007bff);
                transition: all 0.3s ${this.options.easing};
                z-index: 1;
            `;
            
            activeTab.parentElement.style.position = 'relative';
            activeTab.parentElement.appendChild(indicator);
        }
        
        const rect = activeTab.getBoundingClientRect();
        const parentRect = activeTab.parentElement.getBoundingClientRect();
        
        indicator.style.width = `${rect.width}px`;
        indicator.style.left = `${rect.left - parentRect.left}px`;
    }

    enhanceBreadcrumbs() {
        const breadcrumbs = document.querySelectorAll('.breadcrumb, .breadcrumbs');
        
        breadcrumbs.forEach(breadcrumb => {
            const items = breadcrumb.querySelectorAll('.breadcrumb-item, .crumb');
            
            items.forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateX(-10px)';
                
                setTimeout(() => {
                    item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    item.style.opacity = '1';
                    item.style.transform = 'translateX(0)';
                }, index * 100);
            });
        });
    }

    // === Loading Interactions ===

    setupLoadingInteractions() {
        // Observe loading states
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const element = mutation.target;
                    if (element.classList.contains('loading')) {
                        this.animateLoadingStart(element);
                    } else if (mutation.oldValue?.includes('loading')) {
                        this.animateLoadingEnd(element);
                    }
                }
            });
        });
        
        observer.observe(document.body, { 
            attributes: true, 
            subtree: true, 
            attributeFilter: ['class'],
            attributeOldValue: true
        });
        this.observers.push(observer);
    }

    animateLoadingStart(element) {
        element.classList.add('micro-loading-active');
        
        // Add shimmer effect if not present
        if (!element.querySelector('.micro-shimmer')) {
            const shimmer = document.createElement('div');
            shimmer.className = 'micro-shimmer';
            shimmer.style.cssText = `
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: shimmer 1.5s infinite;
            `;
            
            element.style.position = 'relative';
            element.style.overflow = 'hidden';
            element.appendChild(shimmer);
        }
    }

    animateLoadingEnd(element) {
        element.classList.remove('micro-loading-active');
        
        const shimmer = element.querySelector('.micro-shimmer');
        if (shimmer) {
            shimmer.remove();
        }
        
        // Success animation
        if (!this.reducedMotion) {
            element.style.animation = 'loadingSuccess 0.5s ease-out';
            setTimeout(() => {
                element.style.animation = '';
            }, 500);
        }
    }

    // === Notification Interactions ===

    setupNotificationInteractions() {
        // Observe notifications
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        node.matches('.notification, .alert, .toast, .message')) {
                        this.animateNotificationEntry(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        this.observers.push(observer);
    }

    animateNotificationEntry(notification) {
        if (this.reducedMotion) return;
        
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        requestAnimationFrame(() => {
            notification.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        this.triggerHapticFeedback('light');
        
        // Auto-dismiss animation
        const dismissTime = notification.dataset.dismissTime || 5000;
        if (dismissTime > 0) {
            setTimeout(() => {
                this.animateNotificationExit(notification);
            }, dismissTime);
        }
    }

    animateNotificationExit(notification) {
        if (this.reducedMotion) {
            notification.remove();
            return;
        }
        
        notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // === Scroll Animations ===

    setupScrollAnimations() {
        if (!window.IntersectionObserver) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElementEntry(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        // Observe elements with animation classes
        document.querySelectorAll('[data-animate], .animate-on-scroll').forEach(element => {
            observer.observe(element);
        });
        
        this.observers.push(observer);
    }

    animateElementEntry(element) {
        if (this.reducedMotion) return;
        if (element.hasAttribute('data-animated')) return;
        
        element.setAttribute('data-animated', 'true');
        
        const animationType = element.dataset.animate || 'fadeInUp';
        
        switch (animationType) {
            case 'fadeInUp':
                this.animateFadeInUp(element);
                break;
            case 'fadeInLeft':
                this.animateFadeInLeft(element);
                break;
            case 'fadeInRight':
                this.animateFadeInRight(element);
                break;
            case 'scaleIn':
                this.animateScaleIn(element);
                break;
            default:
                this.animateFadeInUp(element);
        }
    }

    animateFadeInUp(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        
        requestAnimationFrame(() => {
            element.style.transition = `opacity 0.6s ${this.options.easing}, transform 0.6s ${this.options.easing}`;
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    animateFadeInLeft(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateX(-30px)';
        
        requestAnimationFrame(() => {
            element.style.transition = `opacity 0.6s ${this.options.easing}, transform 0.6s ${this.options.easing}`;
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        });
    }

    animateFadeInRight(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateX(30px)';
        
        requestAnimationFrame(() => {
            element.style.transition = `opacity 0.6s ${this.options.easing}, transform 0.6s ${this.options.easing}`;
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        });
    }

    animateScaleIn(element) {
        element.style.opacity = '0';
        element.style.transform = 'scale(0.8)';
        
        requestAnimationFrame(() => {
            element.style.transition = `opacity 0.6s ${this.options.easing}, transform 0.6s ${this.options.easing}`;
            element.style.opacity = '1';
            element.style.transform = 'scale(1)';
        });
    }

    // === Page Transitions ===

    setupPageTransitions() {
        // Interceptar navegação
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && this.isInternalLink(e.target.href)) {
                e.preventDefault();
                this.animatePageTransition(e.target.href);
            }
        });
    }

    isInternalLink(href) {
        try {
            const url = new URL(href);
            return url.origin === window.location.origin;
        } catch {
            return false;
        }
    }

    animatePageTransition(href) {
        if (this.reducedMotion) {
            window.location.href = href;
            return;
        }
        
        document.body.style.transition = 'opacity 0.3s ease';
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            window.location.href = href;
        }, 300);
    }

    // === Feedback Systems ===

    triggerHapticFeedback(intensity = 'light') {
        if (!this.options.hapticFeedback || !this.hapticSupported) return;
        
        const intensityMap = {
            light: 10,
            medium: 50,
            heavy: 100
        };
        
        navigator.vibrate(intensityMap[intensity] || 10);
    }

    initAudioContext() {
        if (!this.webAudioSupported) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.soundContext = new AudioContext();
        } catch (error) {
            console.warn('[MicroInteractions] Não foi possível inicializar áudio:', error);
        }
    }

    playSoundFeedback(type = 'click') {
        if (!this.options.soundFeedback || !this.soundContext) return;
        
        const frequencies = {
            click: 800,
            success: 1000,
            error: 400,
            hover: 600
        };
        
        const frequency = frequencies[type] || 800;
        
        try {
            const oscillator = this.soundContext.createOscillator();
            const gainNode = this.soundContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.soundContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.soundContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, this.soundContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + 0.1);
            
            oscillator.start(this.soundContext.currentTime);
            oscillator.stop(this.soundContext.currentTime + 0.1);
            
        } catch (error) {
            console.warn('[MicroInteractions] Erro ao reproduzir som:', error);
        }
    }

    // === Control Methods ===

    disableAllAnimations() {
        document.body.classList.add('micro-animations-disabled');
    }

    enableAllAnimations() {
        document.body.classList.remove('micro-animations-disabled');
    }

    pauseAnimations() {
        this.options.enabled = false;
    }

    resumeAnimations() {
        this.options.enabled = true;
    }

    // === Cleanup ===

    destroy() {
        this.observers.forEach(observer => {
            if (observer.disconnect) {
                observer.disconnect();
            }
        });
        
        this.observers = [];
        this.activeAnimations.clear();
        
        if (this.soundContext) {
            this.soundContext.close();
        }
        
        console.log('[MicroInteractions] Sistema destruído');
    }
}

// CSS Animations
const microInteractionsCSS = `
@keyframes rippleAnimation {
    to {
        transform: scale(4);
        opacity: 0;
    }
}

@keyframes focusIndicatorIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes focusIndicatorOut {
    from {
        opacity: 1;
        transform: scale(1);
    }
    to {
        opacity: 0;
        transform: scale(1.05);
    }
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}

@keyframes successPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
}

@keyframes loadingSuccess {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}

.micro-animations-disabled * {
    animation: none !important;
    transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
    .micro-ripple,
    .micro-focus-indicator {
        animation: none !important;
    }
}
`;

// Injetar CSS
const style = document.createElement('style');
style.textContent = microInteractionsCSS;
document.head.appendChild(style);

// Inicializar automaticamente
window.addEventListener('DOMContentLoaded', () => {
    window.microInteractions = new MicroInteractions({
        debug: localStorage.getItem('debugMode') === 'true'
    });
});

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MicroInteractions;
} 
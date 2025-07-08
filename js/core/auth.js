// Sistema de autenticação aprimorado
class AuthManager {
    constructor() {
        this.refreshTimeout = null;
        this.isRefreshing = false;
        this.refreshPromise = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.debounceTimeout = null;
        
        // Inicializar verificação periódica
        this.startPeriodicCheck();
        
        // Listener para mudanças no localStorage de outras abas
        window.addEventListener('storage', this.handleStorageChange.bind(this));
        
        // Listener para detectar quando a página fica visível novamente
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    // Validação robusta do token
    isValidToken(showErrors = false) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            if (showErrors) this.showAuthError('Token não encontrado');
            return false;
        }

        try {
            const tokenParts = token.split('.');

            // Caso o token não seja um JWT, considerá-lo válido como token opaco
            if (tokenParts.length !== 3) {
                // Aceitar qualquer string não vazia como token opaco
                return true;
            }

            const payload = JSON.parse(atob(tokenParts[1]));
            
            // Validar estrutura do payload
            if (!payload.exp || !payload.sub) {
                if (showErrors) this.showAuthError('Token com dados inválidos');
                this.clearAuthData();
                return false;
            }

            const now = Date.now();
            const expirationTime = payload.exp * 1000;
            const renewalTime = expirationTime - (5 * 60 * 1000); // 5 minutos antes de expirar

            // Token expirado
            if (now >= expirationTime) {
                if (showErrors) this.showAuthError('Token expirado');
                this.clearAuthData();
                return false;
            }

            // Agendar renovação se necessário
            if (now >= renewalTime && !this.isRefreshing) {
                this.scheduleTokenRenewal();
            }

            return true;
        } catch (error) {
            console.error('Erro ao validar token:', error);
            if (showErrors) this.showAuthError('Erro na validação do token');
            this.clearAuthData();
            return false;
        }
    }

    // Renovação de token com retry e debounce
    async renewToken() {
        if (this.isRefreshing) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            this.isRefreshing = false;
            return false;
        }

        try {
            console.log('Renovando token...');
            
            const response = await fetch(`${window.API_BASE_URL}/api/refresh-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 segundos de timeout
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.access_token) {
                    localStorage.setItem('authToken', data.access_token);
                    this.retryCount = 0; // Reset retry count on success
                    
                    if (window.notifications) {
                        window.notifications.info('Sessão renovada automaticamente', 3000);
                    }
                    
                    console.log('Token renovado com sucesso');
                    this.isRefreshing = false;
                    return true;
                }
            }
            
            throw new Error(`Erro na renovação: ${response.status}`);
            
        } catch (error) {
            console.error('Erro ao renovar token:', error);
            this.retryCount++;
            
            if (this.retryCount < this.maxRetries) {
                // Retry com backoff exponencial
                const delay = Math.pow(2, this.retryCount) * 1000;
                setTimeout(() => {
                    this.isRefreshing = false;
                    this.renewToken();
                }, delay);
                return false;
            } else {
                // Máximo de tentativas atingido
                this.showAuthError('Não foi possível renovar a sessão. Redirecionando para login...');
                this.logout();
                return false;
            }
        }
    }

    // Agendar renovação de token
    scheduleTokenRenewal() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
        
        // Debounce para evitar múltiplas renovações simultâneas
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        this.debounceTimeout = setTimeout(() => {
            this.refreshPromise = this.renewToken();
        }, 1000); // 1 segundo de debounce
    }

    // Verificação completa de autenticação
    checkAuth(showErrors = false) {
        const requiredFields = ['authToken', 'userType', 'userName'];
        const authData = {};
        
        // Verificar se todos os campos obrigatórios estão presentes
        for (const field of requiredFields) {
            const value = localStorage.getItem(field);
            if (!value || value.trim() === '') {
                if (showErrors) this.showAuthError(`Dados de autenticação incompletos: ${field}`);
                return false;
            }
            authData[field] = value;
        }

        // Validar token
        if (!this.isValidToken(showErrors)) {
            return false;
        }

        // Verificar redirecionamentos baseados no tipo de usuário
        const currentPath = window.location.pathname;
        const isAdminPage = currentPath.includes('admin.html');
        const isUserPage = currentPath.includes('pagina_inicial.html');
        
        if (authData.userType === 'admin') {
            if (isUserPage) {
                if (showErrors) console.log('Redirecionando admin para página administrativa');
                window.location.href = 'admin.html';
                return false;
            }
        } else {
            if (isAdminPage) {
                if (showErrors) this.showAuthError('Acesso negado: apenas administradores');
                window.location.href = 'pagina_inicial.html';
                return false;
            }
        }

        return true;
    }

    // Verificação periódica do token
    startPeriodicCheck() {
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.isValidToken();
            }
        }, 60000); // Verificar a cada minuto
    }

    // Tratar mudanças no localStorage de outras abas
    handleStorageChange(event) {
        if (event.key === 'authToken' && !event.newValue) {
            // Token removido em outra aba
            this.showAuthError('Sessão encerrada em outra aba');
            this.logout();
        }
    }

    // Tratar mudanças de visibilidade da página
    handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            // Verificar autenticação quando a página ficar visível
            this.isValidToken(true);
        }
    }

    // Limpar dados de autenticação
    clearAuthData() {
        const keysToRemove = ['authToken', 'userType', 'userName', 'userCity', 'refreshToken'];
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // Logout seguro
    logout() {
        this.clearAuthData();
        
        // Cancelar timers
        if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
        if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
        
        this.isRefreshing = false;
        this.retryCount = 0;
        
        // Redirecionar para login
        window.location.replace('login.html');
    }

    // Mostrar erro de autenticação
    showAuthError(message) {
        console.error('Auth Error:', message);
        if (window.notifications) {
            window.notifications.warning(message);
        }
    }

    // Navegar para página inicial baseada no tipo de usuário
    redirectToHome() {
        const userType = localStorage.getItem('userType');
        if (userType === 'admin') {
            window.location.replace('admin.html');
        } else {
            window.location.replace('pagina_inicial.html');
        }
    }

    // Verificar permissão para uma ação específica
    hasPermission(requiredRole) {
        const userType = localStorage.getItem('userType');
        
        const roleHierarchy = {
            'user': 1,
            'manager': 2,
            'admin': 3
        };
        
        const userLevel = roleHierarchy[userType] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 99;
        
        return userLevel >= requiredLevel;
    }

    // Obter informações do usuário atual
    getCurrentUser() {
        if (!this.checkAuth()) return null;
        
        return {
            name: localStorage.getItem('userName'),
            type: localStorage.getItem('userType'),
            city: localStorage.getItem('userCity'),
            token: localStorage.getItem('authToken')
        };
    }
}

// Instância global do gerenciador de autenticação
const authManager = new AuthManager();

// Compatibilidade com código antigo
function isValidToken() {
    return authManager.isValidToken();
}

function checkAuth() {
    return authManager.checkAuth(true);
}

function logout() {
    authManager.logout();
}

function redirectToHome() {
    authManager.redirectToHome();
}

// Exportar funções globalmente
window.authUtils = {
    isValidToken,
    checkAuth,
    logout,
    redirectToHome,
    hasPermission: authManager.hasPermission.bind(authManager),
    getCurrentUser: authManager.getCurrentUser.bind(authManager),
    manager: authManager
}; 
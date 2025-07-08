// Sistema de autenticação ultra-simples
(function() {
    'use strict';
    
    console.log('🔐 Carregando sistema de autenticação ultra-simples...');
    
    // Funções básicas de autenticação
    window.SimpleAuth = {
        // Verificar se está logado
        isLoggedIn: function() {
            const token = localStorage.getItem('authToken');
            const userName = localStorage.getItem('userName');
            const isValid = !!(token && userName && token.trim() !== '' && userName.trim() !== '');
            console.log('Verificação de login:', { 
                hasToken: !!token, 
                hasUserName: !!userName, 
                isValid: isValid 
            });
            return isValid;
        },
        
        // Logout simples
        logout: function() {
            console.log('🚪 Fazendo logout...');
            localStorage.clear();
            window.location.href = 'login.html';
        },
        
        // Obter dados do usuário
        getUser: function() {
            return {
                name: localStorage.getItem('userName'),
                type: localStorage.getItem('userType'),
                city: localStorage.getItem('userCity'),
                token: localStorage.getItem('authToken')
            };
        },
        
        // Verificar se é admin
        isAdmin: function() {
            return localStorage.getItem('userType') === 'admin';
        },
        
        // Redirecionar para home baseado no tipo
        goToHome: function() {
            const userType = localStorage.getItem('userType');
            const url = userType === 'admin' ? 'admin.html' : 'pagina_inicial.html';
            console.log('Redirecionando para:', url);
            window.location.href = url;
        }
    };
    
    // Função para proteger páginas
    window.protectPage = function() {
        console.log('🛡️ Protegendo página...');
        
        if (!window.SimpleAuth.isLoggedIn()) {
            console.log('❌ Usuário não logado, redirecionando para login');
            window.location.href = 'login.html';
            return false;
        }
        
        console.log('✅ Usuário autenticado');
        return true;
    };
    
    // Compatibilidade com código existente
    window.authUtils = {
        checkAuth: window.SimpleAuth.isLoggedIn,
        isValidToken: window.SimpleAuth.isLoggedIn,
        logout: window.SimpleAuth.logout,
        redirectToHome: window.SimpleAuth.goToHome,
        getCurrentUser: window.SimpleAuth.getUser,
        hasPermission: function(role) {
            if (role === 'admin') return window.SimpleAuth.isAdmin();
            return true;
        },
        manager: {
            checkAuth: window.SimpleAuth.isLoggedIn,
            logout: window.SimpleAuth.logout
        }
    };
    
    console.log('✅ Sistema de autenticação ultra-simples carregado!');
    
})(); 
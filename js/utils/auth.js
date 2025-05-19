// Funções de autenticação centralizadas
function isValidToken() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) return false;

        const payload = JSON.parse(atob(tokenParts[1]));
        const expirationTime = payload.exp * 1000;
        
        // Adiciona margem de 5 minutos para renovação
        const renewalTime = expirationTime - (5 * 60 * 1000);
        
        if (Date.now() >= expirationTime) {
            localStorage.clear();
            return false;
        }

        // Se estiver próximo da expiração, tenta renovar
        if (Date.now() >= renewalTime) {
            renewToken();
        }

        return true;
    } catch (error) {
        console.error('Erro ao validar token:', error);
        return false;
    }
}

async function renewToken() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    try {
        const response = await fetch(`${window.API_BASE_URL}/api/refresh-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('authToken', data.access_token);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erro ao renovar token:', error);
        return false;
    }
}

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    const userName = localStorage.getItem('userName');
    const userCity = localStorage.getItem('userCity');

    if (!token || !userType || !userName) {
        console.error('Dados de autenticação incompletos');
        return false;
    }

    if (!isValidToken()) {
        console.error('Token inválido ou expirado');
        return false;
    }

    // Verificações específicas por tipo de usuário
    if (userType === 'admin' && !userCity && window.location.pathname.includes('pagina_inicial.html')) {
        window.location.href = 'admin.html';
        return false;
    }

    if (userType !== 'admin' && window.location.pathname.includes('admin.html')) {
        window.location.href = 'pagina_inicial.html';
        return false;
    }

    return true;
}

function logout() {
    localStorage.clear();
    window.location.href = 'Login.html';
}

// Função para gerenciar navegação
function handleNavigation(event) {
    const userType = localStorage.getItem('userType');
    
    // Se não houver tipo de usuário, deixa o comportamento padrão
    if (!userType) return;

    // Se for botão voltar do navegador
    if (event && event.type === 'popstate') {
        event.preventDefault();
        redirectToHome();
        return;
    }

    // Para outros tipos de navegação
    redirectToHome();
}

// Função para redirecionar para a página inicial correta
function redirectToHome() {
    const userType = localStorage.getItem('userType');
    if (userType === 'admin') {
        window.location.replace('admin.html');
    } else {
        window.location.replace('pagina_inicial.html');
    }
}

// Interceptar evento de voltar do navegador
window.addEventListener('popstate', handleNavigation);

// Exportar funções
window.authUtils = {
    isValidToken,
    checkAuth,
    logout,
    handleNavigation,
    redirectToHome
}; 
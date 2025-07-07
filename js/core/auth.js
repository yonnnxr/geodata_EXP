// Copiado de js/utils/auth.js
// Funções de autenticação centralizadas
function isValidToken() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) return false;

        const payload = JSON.parse(atob(tokenParts[1]));
        const expirationTime = payload.exp * 1000;
        const renewalTime = expirationTime - (5 * 60 * 1000);

        if (Date.now() >= expirationTime) {
            localStorage.clear();
            return false;
        }

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
    window.location.replace('login.html');
}

function handleNavigation(event) {
    const userType = localStorage.getItem('userType');
    if (!userType) return;

    if (event && event.type === 'popstate') {
        event.preventDefault();
        redirectToHome();
        return;
    }
    redirectToHome();
}

function redirectToHome() {
    const userType = localStorage.getItem('userType');
    if (userType === 'admin') {
        window.location.replace('admin.html');
    } else {
        window.location.replace('pagina_inicial.html');
    }
}

window.addEventListener('popstate', handleNavigation);

// Exportar funções globalmente
window.authUtils = {
    isValidToken,
    checkAuth,
    logout,
    handleNavigation,
    redirectToHome
}; 
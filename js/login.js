console.log('Script de login carregado!');

// Tratamento global de erros de scripts
window.addEventListener('error', (event) => {
    console.warn('Erro de script detectado:', event.filename, event.message);
    window.hasScriptErrors = true;
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== PÁGINA DE LOGIN CARREGADA ===');
    
    // Verificar se já está logado
    const token = localStorage.getItem('authToken');
    const userName = localStorage.getItem('userName');
    
    if (token && userName) {
        console.log('Usuário já logado, redirecionando...');
        const userType = localStorage.getItem('userType');
        const redirectUrl = userType === 'admin' ? 'admin.html' : 'pagina_inicial.html';
        window.location.replace(redirectUrl);
        return;
    }

    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    function showError(message) {
        if (window.notifications) {
            window.notifications.error(message);
        } else {
            errorMessageDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
            errorMessageDiv.style.display = 'flex';
            errorMessageDiv.style.opacity = '1';
        }
    }

    function hideError() {
        if (errorMessageDiv) {
            errorMessageDiv.style.display = 'none';
        }
    }

    function togglePassword() {
        const passwordInput = document.getElementById('password');
        const toggleButton = document.querySelector('.toggle-password i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleButton.classList.remove('fa-eye');
            toggleButton.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleButton.classList.remove('fa-eye-slash');
            toggleButton.classList.add('fa-eye');
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        hideError();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        if (!username || !password) {
            showError('Por favor, preencha todos os campos');
            return;
        }

        // Mostrar loading
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        submitButton.disabled = true;

        try {
            console.log('=== INICIANDO LOGIN ===');
            console.log('URL da API:', window.API_BASE_URL);
            
            const response = await fetch(`${window.API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    username: username, 
                    password: password
                })
            });

            console.log('Status da resposta:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erro na resposta:', errorText);
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Dados recebidos do servidor:', {
                hasToken: !!data.access_token,
                userType: data.user_type,
                userName: data.name,
                userCity: data.city
            });

            if (!data.access_token) {
                throw new Error('Token não recebido do servidor');
            }

            // Limpar localStorage completamente
            localStorage.clear();
            
            // Salvar dados essenciais
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('userName', data.name || username);
            localStorage.setItem('userType', data.user_type || 'user');
            localStorage.setItem('userCity', data.city || 'dourados');

            console.log('=== DADOS SALVOS NO LOCALSTORAGE ===');
            console.log('Token salvo:', !!localStorage.getItem('authToken'));
            console.log('Nome salvo:', localStorage.getItem('userName'));
            console.log('Tipo salvo:', localStorage.getItem('userType'));
            console.log('Cidade salva:', localStorage.getItem('userCity'));

            // Mostrar sucesso
            submitButton.innerHTML = '<i class="fas fa-check"></i> Sucesso!';
            submitButton.style.background = '#4CAF50';

            // Redirecionar
            setTimeout(() => {
                const redirectUrl = data.user_type === 'admin' ? 'admin.html' : 'pagina_inicial.html';
                console.log('Redirecionando para:', redirectUrl);
                window.location.replace(redirectUrl);
            }, 1000);

        } catch (error) {
            console.error('=== ERRO NO LOGIN ===');
            console.error('Erro completo:', error);
            
            let errorMessage = 'Erro interno. Tente novamente.';
            
            if (error.message.includes('401')) {
                errorMessage = 'Usuário ou senha incorretos.';
                document.getElementById('password').value = '';
                document.getElementById('password').focus();
            } else if (error.message.includes('Network') || error.message.includes('fetch')) {
                errorMessage = 'Problema de conexão. Verifique sua internet.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Erro no servidor. Tente novamente em alguns instantes.';
            }
            
            showError(errorMessage);
            
            // Restaurar botão
            submitButton.innerHTML = originalText;
            submitButton.style.background = '';
            submitButton.disabled = false;
        }
    }

    // Event Listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleSubmit);
    }
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    
    if (usernameInput) usernameInput.addEventListener('input', hideError);
    if (passwordInput) passwordInput.addEventListener('input', hideError);
    if (togglePasswordBtn) togglePasswordBtn.addEventListener('click', togglePassword);

    // Enter para navegar entre campos
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement.id === 'username') {
                passwordInput.focus();
            } else if (activeElement.id === 'password') {
                handleSubmit(new Event('submit'));
            }
        }
    });
});
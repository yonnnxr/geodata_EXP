console.log('Script carregado!');
document.addEventListener('DOMContentLoaded', () => {
    // Limpar dados antigos do localStorage ao entrar na página de login
    localStorage.clear();

    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    function showError(message) {
        errorMessageDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
        errorMessageDiv.style.display = 'flex';
        errorMessageDiv.style.opacity = '0';
        requestAnimationFrame(() => {
            errorMessageDiv.style.opacity = '1';
        });
    }

    function hideError() {
        errorMessageDiv.style.opacity = '0';
        setTimeout(() => {
            errorMessageDiv.style.display = 'none';
        }, 300);
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

        const username = document.getElementById('username');
        const password = document.getElementById('password');
        const submitButton = loginForm.querySelector('button[type="submit"]');

        if (!username || !password) {
            showError('Por favor, preencha todos os campos');
            return;
        }

        const usernameValue = username.value.trim();
        const passwordValue = password.value;

        if (!usernameValue || !passwordValue) {
            showError('Por favor, preencha todos os campos');
            return;
        }

        // Adicionar classe de submitting para mostrar loading
        loginForm.classList.add('submitting');
        const buttonText = submitButton.querySelector('.button-text').textContent;
        submitButton.disabled = true;

        try {
            if (!window.API_BASE_URL) {
                throw new Error('URL da API não configurada');
            }

            console.log('Tentando login na URL:', `${window.API_BASE_URL}/api/login`);
            
            const response = await window.fetchWithRetry(`${window.API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': window.location.origin
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    username: usernameValue, 
                    password: passwordValue,
                    client_type: 'web'
                })
            });

            if (!response.ok) {
                throw new Error(`Erro no servidor: ${response.status}`);
            }

            const data = await response.json();
            
            // Log para debug
            console.log('Resposta do servidor:', data);

            // Validar dados retornados
            if (!data.access_token) {
                throw new Error('Token não retornado pelo servidor');
            }

            // Se a cidade não estiver definida, usar um valor padrão para teste
            const userCity = data.city || 'dourados';
            console.log('Cidade definida:', userCity);

            // Salvar dados no localStorage
            try {
                localStorage.setItem('authToken', data.access_token);
                console.log('Token armazenado:', data.access_token);
                
                localStorage.setItem('userType', data.user_type || 'user');
                console.log('Tipo de usuário armazenado:', data.user_type);
                
                localStorage.setItem('userName', data.name || usernameValue);
                console.log('Nome do usuário armazenado:', data.name || usernameValue);
                
                localStorage.setItem('userCity', userCity);
                console.log('Cidade armazenada:', userCity);

                // Verificar se os dados foram salvos corretamente
                const savedToken = localStorage.getItem('authToken');
                const savedType = localStorage.getItem('userType');
                const savedName = localStorage.getItem('userName');
                const savedCity = localStorage.getItem('userCity');

                if (!savedToken || !savedType || !savedName || !savedCity) {
                    throw new Error('Falha ao salvar dados no localStorage');
                }

                console.log('Todos os dados foram salvos com sucesso no localStorage');
            } catch (storageError) {
                console.error('Erro ao salvar dados:', storageError);
                throw new Error('Falha ao salvar dados de autenticação');
            }

            // Adicionar animação de sucesso antes de redirecionar
            submitButton.innerHTML = '<i class="fas fa-check"></i>';
            submitButton.style.background = 'var(--success-color)';
            
            // Redirecionar baseado no tipo de usuário após validar os dados
            setTimeout(() => {
                const redirectUrl = data.user_type === 'admin' ? 'admin.html' : 'pagina_inicial.html';
                console.log('Redirecionando para:', redirectUrl);
                window.location.replace(redirectUrl);
            }, 1000);

        } catch (error) {
            console.error('Erro no login:', error);
            showError(error.message || 'Usuário ou senha inválidos');
            
            // Restaurar botão
            submitButton.innerHTML = `<span class="button-text">${buttonText}</span><i class="fas fa-arrow-right"></i>`;
            loginForm.classList.remove('submitting');
            submitButton.disabled = false;
        }
    }

    // Event Listeners
    loginForm.addEventListener('submit', handleSubmit);
    document.getElementById('username').addEventListener('input', hideError);
    document.getElementById('password').addEventListener('input', hideError);
    document.querySelector('.toggle-password').addEventListener('click', togglePassword);

    // Adicionar funcionalidade de pressionar Enter
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement.tagName === 'INPUT') {
                if (activeElement.id === 'username') {
                    document.getElementById('password').focus();
                } else if (activeElement.id === 'password') {
                    handleSubmit(new Event('submit'));
                }
            }
        }
    });
});
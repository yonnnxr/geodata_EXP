console.log('Script carregado!');
document.addEventListener('DOMContentLoaded', () => {
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

        console.log('Iniciando login...');

        const username = document.getElementById('username');
        const password = document.getElementById('password');
        const submitButton = loginForm.querySelector('button[type="submit"]');

        console.log('Elementos encontrados:', {
            username: username ? 'sim' : 'não',
            password: password ? 'sim' : 'não',
            submitButton: submitButton ? 'sim' : 'não'
        });

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
            console.log('Enviando requisição para:', `${window.API_BASE_URL}/api/auth/login`);
            
            const response = await fetch(`${window.API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: usernameValue, password: passwordValue })
            });

            const data = await response.json();
            console.log('Resposta recebida:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao fazer login');
            }

            // Salvar dados no localStorage
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('userType', data.user_type);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userCity', data.city);

            // Adicionar animação de sucesso antes de redirecionar
            submitButton.innerHTML = '<i class="fas fa-check"></i>';
            submitButton.style.background = 'var(--success-color)';
            
            // Redirecionar baseado no tipo de usuário
            setTimeout(() => {
                if (data.user_type === 'admin_central' || data.user_type === 'admin_city') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'map.html';
                }
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

    // Limpar erro quando o usuário começa a digitar
    document.getElementById('username').addEventListener('input', hideError);
    document.getElementById('password').addEventListener('input', hideError);

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

    // Adicionar event listeners
    document.querySelector('.toggle-password').addEventListener('click', togglePassword);
});
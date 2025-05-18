console.log('Script carregado!');
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');
    const API_BASE_URL = 'https://api-geodata-exp.onrender.com';

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const cidadeInput = document.getElementById('regional_id');
        const passwordInput = document.getElementById('password');
        const submitButton = loginForm.querySelector('button[type="submit"]');

        const cidade = cidadeInput.value.trim();
        const password = passwordInput.value.trim();

        if (!cidade || !password) {
            errorMessageDiv.textContent = 'Por favor, preencha todos os campos.';
            errorMessageDiv.style.display = 'block';
            return;
        }

        try {
            console.log('Tentando login para:', cidade);
            submitButton.disabled = true;
            submitButton.textContent = 'Carregando...';

            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cidade: cidade,
                    password: password
                })
            });

            const data = await response.json();
            console.log('Resposta do servidor:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao fazer login');
            }

            // Armazena o token e a cidade
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('userCity', cidade);

            // Redireciona para a página inicial
            window.location.href = 'pagina_inicial.html';

        } catch (error) {
            console.error('Erro no login:', error);
            errorMessageDiv.textContent = error.message || 'Erro ao fazer login. Tente novamente.';
            errorMessageDiv.style.display = 'block';
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });
});
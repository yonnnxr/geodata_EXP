console.log('Script carregado!');
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        console.log('Formulário de login enviado!');
        event.preventDefault();
        console.log('preventDefault() chamado!');

        const cidadeInput = document.getElementById('regional_id');
        const passwordInput = document.getElementById('password');

        const cidade = cidadeInput.value.trim();
        const password = passwordInput.value.trim();

        console.log('Cidade:', cidade);
        console.log('Senha:', password);

        if (!cidade || !password) {
            errorMessageDiv.textContent = 'Por favor, preencha todos os campos.';
            errorMessageDiv.style.display = 'block';
            return;
        }

        const apiUrl = 'https://api-geodata-exp.onrender.com/login';

        try {
            console.log('Fazendo requisição para:', apiUrl);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cidade, password }),
            });
            console.log('Resposta recebida:', response);
            const data = await response.json();
            console.log('Dados da resposta:', data);

            if (response.ok) {
                localStorage.setItem('authToken', data.token);
                console.log('Token armazenado:', data.token);
                window.location.href = 'map.html';
                console.log('Login bem-sucedido, redirecionando.');
            } else {
                errorMessageDiv.textContent = data.message || 'Erro ao fazer login.';
                errorMessageDiv.style.display = 'block';
                console.log('Falha no login:', data.message);
            }

        } catch (error) {
            console.error('Erro ao comunicar com a API:', error);
            errorMessageDiv.textContent = 'Erro ao comunicar com o servidor.';
        }
    });
});
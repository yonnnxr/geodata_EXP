document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        console.log('Formulário de login enviado!'); // Verifique se o listener está funcionando
        event.preventDefault();
        console.log('preventDefault() chamado!'); // Verifique se o preventDefault está funcionando

        const regionalIdInput = document.getElementById('regional_id');
        const passwordInput = document.getElementById('password');

        const regional_id = regionalIdInput.value.trim();
        const password = passwordInput.value.trim();

        console.log('ID da Regional:', regional_id);
        console.log('Senha:', password);

        if (!regional_id || !password) {
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
                body: JSON.stringify({ regional_id, password }),
            });
            console.log('Resposta recebida:', response);
            const data = await response.json();
            console.log('Dados da resposta:', data);

            if (response.ok) {
                localStorage.setItem('authToken', data.token);
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
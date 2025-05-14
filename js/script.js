document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const regionalIdInput = document.getElementById('regional_id');
        const passwordInput = document.getElementById('password');

        const regional_id = regionalIdInput.value.trim();
        const password = passwordInput.value.trim();

        if (!regional_id || !password) {
            errorMessageDiv.textContent = 'Por favor, preencha todos os campos.';
            errorMessageDiv.style.display = 'block';
            return;
        }

        const apiUrl = 'https://api-geodata-exp.onrender.com/login';

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ regional_id, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('authToken', data.token);

                window.location.href = 'map.html';
            } else {
                errorMessageDiv.textContent = data.message || 'Erro ao fazer login.';
                errorMessageDiv.style.display = 'block';
            }

        } catch (error) {
            console.error('Erro ao comunicar com a API:', error);
            errorMessageDiv.textContent = 'Erro ao comunicar com o servidor.';
            errorMessageDiv.style.display = 'block';
        }
    });
});
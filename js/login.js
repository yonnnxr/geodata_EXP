console.log('Script carregado!');
document.addEventListener('DOMContentLoaded', () => {
    // NÃO limpar dados antigos do localStorage ao entrar na página de login
    // isso pode estar causando o problema se o usuário for redirecionado para cá
    console.log('LocalStorage antes da limpeza:', {
        authToken: localStorage.getItem('authToken'),
        userType: localStorage.getItem('userType'),
        userName: localStorage.getItem('userName'),
        userCity: localStorage.getItem('userCity')
    });
    
    // Só limpar se estivermos realmente fazendo login (não se for um redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const fromRedirect = urlParams.get('redirect') || document.referrer.includes('pagina_inicial') || document.referrer.includes('admin');
    
    if (!fromRedirect) {
        localStorage.clear();
        console.log('LocalStorage limpo (não é redirect)');
    } else {
        console.log('Mantendo localStorage (possível redirect)');
    }

    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    function showError(message) {
        // Usar o sistema unificado de notificações se disponível
        if (window.notifications) {
            window.notifications.error(message);
        } else {
            // Fallback para o sistema antigo
            errorMessageDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
            errorMessageDiv.style.display = 'flex';
            errorMessageDiv.style.opacity = '0';
            requestAnimationFrame(() => {
                errorMessageDiv.style.opacity = '1';
            });
        }
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

            // Limpar localStorage antes de salvar novos dados
            localStorage.clear();
            console.log('LocalStorage limpo antes de salvar novos dados');

            // Salvar dados no localStorage
            try {
                localStorage.setItem('authToken', data.access_token);
                console.log('Token armazenado:', data.access_token.substring(0, 20) + '...');
                
                localStorage.setItem('userType', data.user_type || 'user');
                console.log('Tipo de usuário armazenado:', data.user_type);
                
                localStorage.setItem('userName', data.name || usernameValue);
                console.log('Nome do usuário armazenado:', data.name || usernameValue);
                
                localStorage.setItem('userCity', userCity);
                console.log('Cidade armazenada:', userCity);

                // Aguardar um pouco para garantir que o localStorage foi salvo
                await new Promise(resolve => setTimeout(resolve, 100));

                // Verificar se os dados foram salvos corretamente
                const savedToken = localStorage.getItem('authToken');
                const savedType = localStorage.getItem('userType');
                const savedName = localStorage.getItem('userName');
                const savedCity = localStorage.getItem('userCity');

                console.log('Verificação dos dados salvos:', {
                    hasToken: !!savedToken,
                    tokenLength: savedToken ? savedToken.length : 0,
                    userType: savedType,
                    userName: savedName,
                    userCity: savedCity
                });

                if (!savedToken || !savedName) {
                    throw new Error('Falha ao salvar dados críticos no localStorage');
                }

                console.log('Dados essenciais salvos com sucesso no localStorage');
                
                // Testar se a autenticação funciona
                if (window.authUtils && window.authUtils.checkAuth) {
                    const authValid = window.authUtils.checkAuth(false);
                    console.log('Teste de autenticação após login:', authValid);
                }
                
            } catch (storageError) {
                console.error('Erro ao salvar dados:', storageError);
                throw new Error('Falha ao salvar dados de autenticação: ' + storageError.message);
            }

            // Adicionar animação de sucesso antes de redirecionar
            submitButton.innerHTML = '<i class="fas fa-check"></i>';
            submitButton.style.background = 'var(--success-color)';
            
            // Aguardar um pouco mais antes de redirecionar
            setTimeout(() => {
                const redirectUrl = data.user_type === 'admin' ? 'admin.html' : 'pagina_inicial.html';
                console.log('Redirecionando para:', redirectUrl);
                
                // Usar replace para evitar voltar ao login pelo botão voltar
                window.location.replace(redirectUrl);
            }, 1500); // Aumentado para 1.5 segundos

        } catch (error) {
            console.error('Erro no login:', error);
            
            // Mensagem mais amigável baseada no tipo de erro
            let userFriendlyMessage = 'Erro interno. Tente novamente.';
            
            if (error.message.includes('401') || error.message.includes('Unauthorized') || 
                error.message.includes('senha inválidos') || error.message.includes('Senha incorreta')) {
                userFriendlyMessage = 'Usuário ou senha incorretos. Verifique suas credenciais.';
                // Limpar o campo de senha para nova tentativa
                password.value = '';
                password.focus();
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                userFriendlyMessage = 'Acesso negado. Verifique suas permissões.';
            } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
                userFriendlyMessage = 'Erro no servidor. Tente novamente em alguns instantes.';
            } else if (error.message.includes('Network') || error.message.includes('fetch') || 
                      error.message.includes('Failed to fetch')) {
                userFriendlyMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
            } else if (error.message.includes('timeout') || error.name === 'AbortError') {
                userFriendlyMessage = 'Tempo limite excedido. Tente novamente.';
            } else if (error.message.includes('URL da API não configurada')) {
                userFriendlyMessage = 'Configuração do sistema incompleta. Contate o suporte.';
            } else if (error.message.includes('Token não retornado')) {
                userFriendlyMessage = 'Erro na autenticação. Tente novamente.';
            } else if (error.message.includes('localStorage')) {
                userFriendlyMessage = 'Erro ao salvar dados. Verifique se cookies estão habilitados.';
            }
            
            showError(userFriendlyMessage);
            
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
// Configuração da API
const API_BASE_URL = 'https://api-geodata-exp.onrender.com';

// Elementos do DOM
const userNameElement = document.getElementById('userName');
const cityNameElement = document.getElementById('cityName');
const waterNetworksElement = document.getElementById('waterNetworks');
const totalLengthElement = document.getElementById('totalLength');
const totalPointsElement = document.getElementById('totalPoints');
const logoutBtn = document.getElementById('logoutBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (!window.authUtils.checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    // Atualizar informações do usuário
    const userName = localStorage.getItem('userName');
    const userCity = localStorage.getItem('userCity');

    if (userNameElement) userNameElement.textContent = userName;
    if (cityNameElement) cityNameElement.textContent = userCity;

    loadStatistics();
});

// Configurar botão de logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        window.authUtils.logout();
    });
}

// Função para carregar estatísticas
async function loadStatistics() {
    try {
        const token = localStorage.getItem('authToken');
        const userCity = localStorage.getItem('userCity')?.toLowerCase();

        if (!token || !userCity) {
            throw new Error('Dados de autenticação incompletos');
        }

        console.log(`Carregando estatísticas para ${userCity}...`);

        const response = await window.fetchWithRetry(`${API_BASE_URL}/api/statistics/${userCity}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }, 3, 2000, 30000); // 3 tentativas, 2s delay inicial, 30s timeout

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });

            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }

            throw new Error(`Erro ao carregar estatísticas: ${response.status}`);
        }

        const data = await response.json();
        updateStatistics(data);
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        
        let errorMessage = 'Erro ao carregar estatísticas';
        if (error.message.includes('401')) {
            errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
            setTimeout(() => window.location.href = '/login.html', 2000);
        } else if (error.message.includes('503')) {
            errorMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
        } else if (error.name === 'AbortError') {
            errorMessage = 'Tempo limite excedido. Verifique sua conexão e tente novamente.';
        }
        
        showError(errorMessage);
    }
}

// Função para mostrar erros
function showError(message) {
    const errorContainer = document.getElementById('errorContainer') || createErrorContainer();
    errorContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <strong>Erro!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

// Função para criar container de erro
function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'errorContainer';
    container.className = 'error-container';
    document.body.insertBefore(container, document.body.firstChild);
    return container;
}

// Função para atualizar estatísticas na página
function updateStatistics(data) {
    try {
        // Atualiza os contadores
        document.getElementById('totalRedes')?.textContent = formatNumber(data.total_networks || 0);
        document.getElementById('totalPontos')?.textContent = formatNumber(data.total_points || 0);
        document.getElementById('totalExtensao')?.textContent = formatNumber(data.total_length / 1000 || 0, 2) + ' km';
        
        // Atualiza detalhes adicionais se existirem
        if (data.details) {
            document.getElementById('detalhesRedes')?.textContent = formatNumber(data.details.networks || 0);
            document.getElementById('detalhesEconomias')?.textContent = formatNumber(data.details.economies || 0);
            document.getElementById('detalhesExtensao')?.textContent = formatNumber(data.details.network_length_km || 0, 2) + ' km';
        }
    } catch (error) {
        console.error('Erro ao atualizar estatísticas na página:', error);
        showError('Erro ao atualizar informações na página');
    }
}

// Função para formatar números
function formatNumber(value, decimals = 0) {
    if (!value && value !== 0) return 'N/A';
    return Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Adicionar animações aos cards quando ficarem visíveis
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, {
    threshold: 0.1
});

// Observar todos os cards
document.querySelectorAll('.card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    observer.observe(card);
});

// Adicionar efeito de hover nos cards
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Adicionar animação de clique nos cards
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', function(e) {
        // Criar efeito de onda
        const ripple = document.createElement('div');
        ripple.classList.add('ripple');
        
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        card.appendChild(ripple);
        
        // Remover o efeito após a animação
        setTimeout(() => {
            ripple.remove();
        }, 1000);

        // Navegar para a página correspondente se houver um link
        const href = this.getAttribute('data-href');
        if (href) {
            setTimeout(() => {
                window.location.href = href;
            }, 300);
        }
    });
}); 
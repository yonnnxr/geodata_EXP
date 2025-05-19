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
        window.location.href = 'Login.html';
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
        const userCity = localStorage.getItem('userCity');

        if (!token || !userCity) {
            throw new Error('Dados de autenticação incompletos');
        }

        const response = await fetch(`${API_BASE_URL}/api/statistics/${userCity}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.authUtils.logout();
                return;
            }
            throw new Error('Erro ao carregar estatísticas');
        }

        const data = await response.json();
        updateStatistics(data);
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro ao carregar estatísticas');
    }
}

function updateStatistics(data) {
    if (waterNetworksElement) waterNetworksElement.textContent = data.total_networks || 0;
    if (totalLengthElement) totalLengthElement.textContent = formatDistance(data.total_length || 0);
    if (totalPointsElement) totalPointsElement.textContent = data.total_points || 0;
}

function formatDistance(meters) {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(2)} m`;
}

function showError(message) {
    // Implementar lógica de exibição de erro
    console.error(message);
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
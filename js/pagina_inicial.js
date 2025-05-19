// Configuração da API
const API_BASE_URL = 'https://api-geodata-exp.onrender.com';

// Elementos do DOM
const userNameElement = document.getElementById('userName');
const cityNameElement = document.getElementById('cityName');
const waterNetworksElement = document.getElementById('waterNetworks');
const totalLengthElement = document.getElementById('totalLength');
const totalPointsElement = document.getElementById('totalPoints');
const logoutBtn = document.getElementById('logoutBtn');

// Função para verificar autenticação
async function checkAuth() {
    const token = localStorage.getItem('authToken');
    const userName = localStorage.getItem('userName');
    const userCity = localStorage.getItem('userCity');
    const userType = localStorage.getItem('userType');

    console.log('Verificando autenticação:', {
        token: token ? 'presente' : 'ausente',
        userName,
        userCity,
        userType
    });

    if (!token) {
        console.error('Token não encontrado');
        window.location.href = 'Login.html';
        return;
    }

    try {
        if (userName && userCity) {
            if (userNameElement) userNameElement.textContent = userName;
            if (cityNameElement) cityNameElement.textContent = userCity;
        } else {
            throw new Error('Dados do usuário incompletos');
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.clear();
        window.location.href = 'Login.html';
    }
}

// Função para carregar estatísticas
async function loadStatistics() {
    try {
        const userCity = localStorage.getItem('userCity');
        const token = localStorage.getItem('authToken');

        if (!userCity || !token) {
            console.error('Dados necessários não encontrados');
            return;
        }

        // Adicionar classe de loading
        if (waterNetworksElement) waterNetworksElement.classList.add('loading');
        if (totalLengthElement) totalLengthElement.classList.add('loading');
        if (totalPointsElement) totalPointsElement.classList.add('loading');

        const response = await fetch(`${API_BASE_URL}/api/geodata/${userCity}/query`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar estatísticas');
        }

        const data = await response.json();

        // Remover classe de loading e atualizar dados
        if (waterNetworksElement) {
            waterNetworksElement.classList.remove('loading');
            waterNetworksElement.textContent = data.total_networks?.toLocaleString('pt-BR') || '0';
        }
        if (totalLengthElement) {
            totalLengthElement.classList.remove('loading');
            totalLengthElement.textContent = `${(data.total_length / 1000).toLocaleString('pt-BR')} km`;
        }
        if (totalPointsElement) {
            totalPointsElement.classList.remove('loading');
            totalPointsElement.textContent = data.total_points?.toLocaleString('pt-BR') || '0';
        }

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        if (waterNetworksElement) waterNetworksElement.textContent = 'Erro';
        if (totalLengthElement) totalLengthElement.textContent = 'Erro';
        if (totalPointsElement) totalPointsElement.textContent = 'Erro';
    }
}

// Função para fazer logout
function logout() {
    localStorage.clear();
    window.location.href = 'Login.html';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadStatistics();
});

if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
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
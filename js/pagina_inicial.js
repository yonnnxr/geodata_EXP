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
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    try {
        // Aqui você pode adicionar uma verificação do token com o backend
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData) {
            userNameElement.textContent = userData.nome;
            cityNameElement.textContent = userData.cidade;
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = 'Login.html';
    }
}

// Função para carregar estatísticas
async function loadStatistics() {
    try {
        const cidade = JSON.parse(localStorage.getItem('userData'))?.cidade;
        if (!cidade) return;

        // Adicionar classe de loading
        waterNetworksElement.classList.add('loading');
        totalLengthElement.classList.add('loading');
        totalPointsElement.classList.add('loading');

        const response = await fetch(`${API_BASE_URL}/geodata/${cidade}/query`);
        const data = await response.json();

        // Remover classe de loading e atualizar dados
        waterNetworksElement.classList.remove('loading');
        totalLengthElement.classList.remove('loading');
        totalPointsElement.classList.remove('loading');

        // Formatando os números com separadores de milhares
        waterNetworksElement.textContent = data.total_networks?.toLocaleString('pt-BR') || '0';
        totalLengthElement.textContent = `${(data.total_length / 1000).toLocaleString('pt-BR')} km`;
        totalPointsElement.textContent = data.total_points?.toLocaleString('pt-BR') || '0';

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        waterNetworksElement.textContent = 'Erro';
        totalLengthElement.textContent = 'Erro';
        totalPointsElement.textContent = 'Erro';
    }
}

// Função para fazer logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = 'Login.html';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadStatistics();
});

logoutBtn.addEventListener('click', logout);

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
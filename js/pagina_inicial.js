document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity');
    
    if (!token || !userCity) {
        window.location.href = 'Login.html';
        return;
    }

    const API_BASE_URL = 'https://api-geodata-exp.onrender.com';

    // Elementos da interface
    const userNameElement = document.getElementById('userName');
    const waterNetworksElement = document.getElementById('waterNetworks');
    const totalLengthElement = document.getElementById('totalLength');
    const totalPointsElement = document.getElementById('totalPoints');
    const logoutBtn = document.getElementById('logoutBtn');
    const cityNameElement = document.getElementById('cityName');

    // Função para formatar números
    function formatNumber(number) {
        return new Intl.NumberFormat('pt-BR').format(number);
    }

    // Função para formatar distância
    function formatDistance(meters) {
        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(2)} km`;
        }
        return `${meters.toFixed(2)} m`;
    }

    // Função para tratar erros de API
    async function handleApiResponse(response) {
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Erro na requisição');
        }
        return response.json();
    }

    // Carregar dados do usuário
    async function loadUserData() {
        try {
            const response = await fetch(`${API_BASE_URL}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const userData = await handleApiResponse(response);
            userNameElement.textContent = userData.name || 'Usuário';
            cityNameElement.textContent = userCity.charAt(0).toUpperCase() + userCity.slice(1).replace('_', ' ');
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            userNameElement.textContent = 'Usuário';
            cityNameElement.textContent = userCity.charAt(0).toUpperCase() + userCity.slice(1).replace('_', ' ');
        }
    }

    // Carregar estatísticas
    async function loadStatistics() {
        try {
            const response = await fetch(`${API_BASE_URL}/geodata/${userCity}/map`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await handleApiResponse(response);
            
            if (!data.features || !Array.isArray(data.features)) {
                throw new Error('Dados inválidos recebidos da API');
            }

            // Contagem de redes de água
            const waterNetworks = data.features.filter(f => 
                f.properties && f.properties.tipo === 'agua'
            ).length;
            waterNetworksElement.textContent = formatNumber(waterNetworks);

            // Cálculo da extensão total
            const totalLength = data.features.reduce((acc, feature) => {
                if (!feature.properties) return acc;
                return acc + (feature.properties.length || 0);
            }, 0);
            totalLengthElement.textContent = formatDistance(totalLength);

            // Contagem de pontos
            const totalPoints = data.features.reduce((acc, feature) => {
                if (!feature.geometry) return acc;
                if (feature.geometry.type === 'Point') return acc + 1;
                if (feature.geometry.type === 'LineString' && Array.isArray(feature.geometry.coordinates)) 
                    return acc + feature.geometry.coordinates.length;
                return acc;
            }, 0);
            totalPointsElement.textContent = formatNumber(totalPoints);

        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            waterNetworksElement.textContent = '---';
            totalLengthElement.textContent = '---';
            totalPointsElement.textContent = '---';
            
            // Mostrar mensagem de erro para o usuário
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = 'Erro ao carregar dados. Por favor, tente novamente mais tarde.';
            document.querySelector('.statistics-container').appendChild(errorDiv);
        }
    }

    // Função de logout
    function handleLogout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userCity');
        window.location.href = 'Login.html';
    }

    // Event listeners
    logoutBtn.addEventListener('click', handleLogout);

    // Carregar dados iniciais
    loadUserData();
    loadStatistics();

    // Adicionar animação aos cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
}); 
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    // Elementos da interface
    const userNameElement = document.getElementById('userName');
    const waterNetworksElement = document.getElementById('waterNetworks');
    const totalLengthElement = document.getElementById('totalLength');
    const totalPointsElement = document.getElementById('totalPoints');
    const logoutBtn = document.getElementById('logoutBtn');

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

    // Carregar dados do usuário
    async function loadUserData() {
        try {
            const response = await fetch('https://api-geodata-exp.onrender.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Erro ao carregar dados do usuário');

            const userData = await response.json();
            userNameElement.textContent = userData.name || 'Usuário';
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            userNameElement.textContent = 'Usuário';
        }
    }

    // Carregar estatísticas
    async function loadStatistics() {
        try {
            const response = await fetch('https://api-geodata-exp.onrender.com/geodata_regional', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Erro ao carregar estatísticas');

            const data = await response.json();
            
            // Contagem de redes de água
            const waterNetworks = data.features.filter(f => 
                f.properties.tipo === 'agua'
            ).length;
            waterNetworksElement.textContent = formatNumber(waterNetworks);

            // Cálculo da extensão total
            const totalLength = data.features.reduce((acc, feature) => 
                acc + (feature.properties.length || 0), 0
            );
            totalLengthElement.textContent = formatDistance(totalLength);

            // Contagem de pontos
            const totalPoints = data.features.reduce((acc, feature) => {
                if (feature.geometry.type === 'Point') return acc + 1;
                if (feature.geometry.type === 'LineString') 
                    return acc + feature.geometry.coordinates.length;
                return acc;
            }, 0);
            totalPointsElement.textContent = formatNumber(totalPoints);

        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            waterNetworksElement.textContent = '---';
            totalLengthElement.textContent = '---';
            totalPointsElement.textContent = '---';
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
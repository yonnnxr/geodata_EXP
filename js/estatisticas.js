document.addEventListener('DOMContentLoaded', () => {
    if (!window.authUtils.checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    // Atualizar informações do usuário
    const userName = localStorage.getItem('userName');
    const userCity = localStorage.getItem('userCity');
    const userNameElement = document.getElementById('userName');
    const cityNameElement = document.getElementById('cityName');

    if (userNameElement) userNameElement.textContent = userName;
    if (cityNameElement) cityNameElement.textContent = userCity;

    // Configurar botão de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.authUtils.logout();
        });
    }

    // Configurar botão de exportar
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    loadStatistics();
});

async function loadStatistics() {
    try {
        const token = localStorage.getItem('authToken');
        const userCity = localStorage.getItem('userCity');

        if (!token || !userCity) {
            throw new Error('Dados de autenticação incompletos');
        }

        const response = await window.fetchWithRetry(`${API_BASE_URL}/api/statistics/${userCity}/detailed`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        createCharts(data);
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        showError('Erro ao carregar estatísticas detalhadas');
    }
}

function createCharts(data) {
    // Gráfico de Materiais
    createPieChart('materialChart', 'Distribuição por Material', data.networks.by_material);
    
    // Gráfico de Diâmetros
    createBarChart('diameterChart', 'Distribuição por Diâmetro', data.networks.by_diameter);
    
    // Gráfico de Status das Economias
    createPieChart('statusChart', 'Status das Economias', data.economies.by_status);
    
    // Gráfico de Consumo
    createLineChart('consumptionChart', 'Consumo Médio', data.economies.consumption_history);
    
    // Gráfico de Tipos de Ocorrência
    createPieChart('occurrenceTypeChart', 'Tipos de Ocorrência', data.occurrences.by_type);
    
    // Gráfico de Status das Ocorrências
    createPieChart('occurrenceStatusChart', 'Status das Ocorrências', data.occurrences.by_status);
}

function createPieChart(elementId, title, data) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: generateColors(Object.keys(data).length)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: title
                }
            }
        }
    });
}

function createBarChart(elementId, title, data) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: title,
                data: Object.values(data),
                backgroundColor: generateColors(1)[0]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: title
                }
            }
        }
    });
}

function createLineChart(elementId, title, data) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.month),
            datasets: [{
                label: 'Consumo Médio (m³)',
                data: data.map(d => d.value),
                borderColor: generateColors(1)[0],
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function generateColors(count) {
    const colors = [
        '#2196F3', // Azul
        '#FF5252', // Vermelho
        '#4CAF50', // Verde
        '#FFC107', // Amarelo
        '#9C27B0', // Roxo
        '#FF9800', // Laranja
        '#607D8B', // Azul acinzentado
        '#E91E63', // Rosa
        '#795548', // Marrom
        '#00BCD4'  // Ciano
    ];

    if (count <= colors.length) {
        return colors.slice(0, count);
    }

    // Se precisar de mais cores, gera aleatoriamente
    const extraColors = Array(count - colors.length).fill().map(() => {
        return '#' + Math.floor(Math.random()*16777215).toString(16);
    });

    return [...colors, ...extraColors];
}

async function exportData() {
    try {
        const token = localStorage.getItem('authToken');
        const userCity = localStorage.getItem('userCity');

        if (!token || !userCity) {
            throw new Error('Dados de autenticação incompletos');
        }

        const response = await window.fetchWithRetry(`${API_BASE_URL}/api/statistics/${userCity}/export`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `estatisticas_${userCity}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        showError('Erro ao exportar dados');
    }
}

function showError(message) {
    // Usar o sistema unificado de notificações se disponível
    if (window.notifications) {
        window.notifications.error(message);
    } else {
        // Fallback para console.error
        console.error(message);
        alert(message); // Fallback simples
    }
}

function showSuccess(message) {
    // Usar o sistema unificado de notificações se disponível
    if (window.notifications) {
        window.notifications.success(message);
    } else {
        // Fallback para console.log
        console.log(message);
        alert(message); // Fallback simples
    }
} 
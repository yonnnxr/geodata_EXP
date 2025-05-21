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

    // Carregar configurações salvas
    loadSettings();

    // Configurar botão de salvar
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }

    // Adicionar listeners para mudanças em tempo real
    setupRealTimePreview();
});

function loadSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('mapSettings')) || getDefaultSettings();
        
        // Configurações do Mapa
        document.getElementById('defaultZoom').value = settings.map.defaultZoom;
        document.getElementById('clusterRadius').value = settings.map.clusterRadius;
        document.getElementById('pointSize').value = settings.map.pointSize;
        
        // Preferências de Visualização
        document.getElementById('showLabels').checked = settings.display.showLabels;
        document.getElementById('autoRefresh').checked = settings.display.autoRefresh;
        document.getElementById('refreshInterval').value = settings.display.refreshInterval;
        
        // Cores
        document.getElementById('networkColor').value = settings.colors.network;
        document.getElementById('economyColor').value = settings.colors.economy;
        document.getElementById('occurrenceColor').value = settings.colors.occurrence;
        
        // Notificações
        document.getElementById('emailNotifications').checked = settings.notifications.email;
        document.getElementById('desktopNotifications').checked = settings.notifications.desktop;
        
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        showError('Erro ao carregar configurações');
    }
}

async function saveSettings() {
    try {
        const settings = {
            map: {
                defaultZoom: parseInt(document.getElementById('defaultZoom').value),
                clusterRadius: parseInt(document.getElementById('clusterRadius').value),
                pointSize: parseInt(document.getElementById('pointSize').value)
            },
            display: {
                showLabels: document.getElementById('showLabels').checked,
                autoRefresh: document.getElementById('autoRefresh').checked,
                refreshInterval: parseInt(document.getElementById('refreshInterval').value)
            },
            colors: {
                network: document.getElementById('networkColor').value,
                economy: document.getElementById('economyColor').value,
                occurrence: document.getElementById('occurrenceColor').value
            },
            notifications: {
                email: document.getElementById('emailNotifications').checked,
                desktop: document.getElementById('desktopNotifications').checked
            }
        };

        // Salvar localmente
        localStorage.setItem('mapSettings', JSON.stringify(settings));

        // Salvar no servidor
        const token = localStorage.getItem('authToken');
        const userCity = localStorage.getItem('userCity');

        if (!token || !userCity) {
            throw new Error('Dados de autenticação incompletos');
        }

        const response = await window.fetchWithRetry(`${API_BASE_URL}/api/settings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            throw new Error('Erro ao salvar configurações no servidor');
        }

        showSuccess('Configurações salvas com sucesso');
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showError('Erro ao salvar configurações');
    }
}

function getDefaultSettings() {
    return {
        map: {
            defaultZoom: 12,
            clusterRadius: 200,
            pointSize: 5
        },
        display: {
            showLabels: true,
            autoRefresh: true,
            refreshInterval: 5
        },
        colors: {
            network: '#2196F3',
            economy: '#FF5252',
            occurrence: '#FFC107'
        },
        notifications: {
            email: true,
            desktop: false
        }
    };
}

function setupRealTimePreview() {
    // Atualizar visualização em tempo real quando as configurações mudarem
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            // Aqui você pode adicionar lógica para preview em tempo real
            // Por exemplo, atualizar cores do mapa, tamanho dos pontos, etc.
            console.log('Configuração alterada:', input.id, input.value);
        });
    });
}

function showSuccess(message) {
    // TODO: Implementar notificação visual de sucesso
    console.log(message);
}

function showError(message) {
    // TODO: Implementar notificação visual de erro
    console.error(message);
} 
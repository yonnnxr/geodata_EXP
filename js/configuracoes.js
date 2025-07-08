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
            // Usar debounce para evitar muitas atualizações
            if (window.debounce) {
                window.debounce(`preview-${input.id}`, () => {
                    updatePreview(input.id, input.value);
                }, 500);
            } else {
                updatePreview(input.id, input.value);
            }
        });
        
        // Para inputs de range, usar input event com throttle
        if (input.type === 'range') {
            input.addEventListener('input', () => {
                if (window.throttle) {
                    window.throttle(`range-${input.id}`, () => {
                        updatePreview(input.id, input.value);
                    }, 100);
                }
            });
        }
    });
}

function updatePreview(inputId, value) {
    // Implementar preview em tempo real baseado no input
    console.log('Configuração alterada:', inputId, value);
    
    // Exemplos de preview em tempo real
    switch(inputId) {
        case 'networkColor':
            updateColorPreview('network', value);
            break;
        case 'economyColor':
            updateColorPreview('economy', value);
            break;
        case 'occurrenceColor':
            updateColorPreview('occurrence', value);
            break;
        case 'pointSize':
            updateSizePreview(value);
            break;
        default:
            // Log para debug
            console.log(`Preview para ${inputId} não implementado`);
    }
}

function updateColorPreview(type, color) {
    // Atualizar preview de cores na própria página se houver elementos visuais
    const preview = document.querySelector(`[data-preview="${type}"]`);
    if (preview) {
        preview.style.backgroundColor = color;
    }
}

function updateSizePreview(size) {
    // Atualizar preview de tamanho
    const preview = document.querySelector('[data-preview="point-size"]');
    if (preview) {
        preview.style.width = `${size * 2}px`;
        preview.style.height = `${size * 2}px`;
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
import { showNotification } from '../core/notifications.js';

// Ícones para tipos de atividade
function getActivityIcon(type) {
    const icons = {
        login: 'sign-in-alt',
        create_user: 'user-plus',
        update_user: 'user-edit',
        create_locality: 'map-marker-alt',
        update_locality: 'edit',
        default: 'circle'
    };
    return icons[type] || icons.default;
}

// Formatar data/hora pt-BR
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Atualiza DOM do dashboard
export function updateDashboard(data) {
    document.getElementById('totalUsers').textContent = data.users.total;
    document.getElementById('activeLocalities').textContent = data.localities.total;
    document.getElementById('totalAccess').textContent = data.users.active;

    const activityList = document.getElementById('activityList');
    if (data.recent_activities?.length) {
        activityList.innerHTML = data.recent_activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-details">
                    <p class="activity-description">${activity.description}</p>
                    <span class="activity-time">${formatDate(activity.timestamp)}</span>
                </div>
            </div>
        `).join('');
    } else {
        activityList.innerHTML = '<p class="no-data">Nenhuma atividade recente</p>';
    }
}

// Busca os dados na API e chama updateDashboard
export async function loadDashboardData() {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) throw new Error('Usuário não autenticado');

        const response = await window.fetchWithRetry(`${window.API_BASE_URL}/api/admin/dashboard`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showNotification(error.message || 'Erro ao carregar dados do dashboard', 'error');
    }
} 
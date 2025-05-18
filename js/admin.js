document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticação
    const authToken = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    const userName = localStorage.getItem('userName');

    if (!authToken || userType !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Atualizar nome do administrador
    document.getElementById('adminName').textContent = userName;

    // Configurar data atual
    const currentDate = new Date();
    document.getElementById('currentDate').textContent = currentDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Configurar navegação
    const navButtons = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.dataset.section;
            
            // Atualizar botões ativos
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Atualizar seções visíveis
            sections.forEach(section => {
                if (section.id === targetSection) {
                    section.classList.add('active');
                    document.getElementById('sectionTitle').textContent = button.textContent.trim();
                } else {
                    section.classList.remove('active');
                }
            });

            // Carregar dados da seção
            loadSectionData(targetSection);
        });
    });

    // Configurar logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // Função para carregar dados das seções
    async function loadSectionData(section) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/${section}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar dados');
            }

            const data = await response.json();

            switch (section) {
                case 'dashboard':
                    updateDashboard(data);
                    break;
                case 'users':
                    updateUsers(data);
                    break;
                case 'localities':
                    updateLocalities(data);
                    break;
                case 'permissions':
                    updatePermissions(data);
                    break;
            }
        } catch (error) {
            console.error('Erro:', error);
            showNotification('Erro ao carregar dados', 'error');
        }
    }

    // Funções de atualização das seções
    function updateDashboard(data) {
        document.getElementById('totalUsers').textContent = data.total_users;
        document.getElementById('activeLocalities').textContent = data.active_localities;
        document.getElementById('totalAccess').textContent = data.total_access;

        const activityList = document.getElementById('activityList');
        activityList.innerHTML = data.recent_activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-details">
                    <p class="activity-description">${activity.description}</p>
                    <span class="activity-time">${formatDate(activity.created_at)}</span>
                </div>
            </div>
        `).join('');
    }

    function updateUsers(data) {
        const usersList = document.querySelector('#users .data-list');
        usersList.innerHTML = data.map(user => `
            <div class="data-item">
                <div class="item-info">
                    <h3>${user.name}</h3>
                    <p>${user.locality} - ${user.user_type}</p>
                </div>
                <div class="item-actions">
                    <button class="edit-btn" data-id="${user.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="status-btn ${user.status ? 'active' : ''}" data-id="${user.id}">
                        <i class="fas fa-${user.status ? 'check' : 'times'}"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Funções auxiliares
    function getActivityIcon(type) {
        const icons = {
            'login': 'sign-in-alt',
            'create_user': 'user-plus',
            'update_user': 'user-edit',
            'create_locality': 'map-marker-alt',
            'update_locality': 'edit',
            'default': 'circle'
        };
        return icons[type] || icons.default;
    }

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

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }, 100);
    }

    // Carregar dados iniciais do dashboard
    loadSectionData('dashboard');
}); 
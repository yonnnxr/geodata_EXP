// Variáveis globais
let currentSection = 'dashboard';
let usersData = [];
let localitiesData = [];

// Configuração da navegação
function setupNavigation() {
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
                    currentSection = targetSection;
                    loadSectionData(targetSection);
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
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
        setupNavigation();
        
        // Carregar localidades para o select
        await loadLocalities();
        
        // Configurar modais
        setupModals();
        
        // Configurar formulários
        setupForms();
        
        // Configurar logout
        setupLogout();

        // Carregar dados iniciais
        await loadDashboardData();

        // Botão do mapa
        const mapButton = document.getElementById('mapButton');
        if (mapButton) {
            mapButton.addEventListener('click', () => {
                window.location.href = 'map.html';
            });
        }
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showNotification('Erro ao carregar dados. Por favor, recarregue a página.', 'error');
    }
});

// Carregar localidades para o select
async function loadLocalities() {
    try {
        const response = await window.fetchWithRetry(`${API_BASE_URL}/api/localities`);
        const data = await response.json();
        const select = document.getElementById('userLocality');
        
        select.innerHTML = data.localities.map(locality => 
            `<option value="${locality.id}">${locality.name}</option>`
        ).join('');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Configuração dos modais
function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close-modal');
    const addUserBtn = document.getElementById('addUserBtn');
    const addLocalityBtn = document.getElementById('addLocalityBtn');

    // Abrir modal de novo usuário
    addUserBtn?.addEventListener('click', () => {
        document.getElementById('userModal').style.display = 'flex';
    });

    // Abrir modal de nova localidade
    addLocalityBtn?.addEventListener('click', () => {
        document.getElementById('localityModal').style.display = 'flex';
    });

    // Fechar modais
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    // Fechar modal ao clicar fora
    window.addEventListener('click', (e) => {
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Configuração dos formulários
function setupForms() {
    const userForm = document.getElementById('userForm');
    const localityForm = document.getElementById('localityForm');

    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userName = document.getElementById('userName');
            const userLocality = document.getElementById('userLocality');
            const userType = document.getElementById('userType');
            const userPassword = document.getElementById('userPassword');

            if (!userName || !userLocality || !userType || !userPassword) {
                showNotification('Erro ao acessar campos do formulário', 'error');
                return;
            }
            
            const formData = {
                name: userName.value,
                city: userLocality.value,
                user_type: userType.value,
                password: userPassword.value
            };

            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erro ao criar usuário');
                }

                showNotification('Usuário criado com sucesso', 'success');
                const userModal = document.getElementById('userModal');
                if (userModal) {
                    userModal.style.display = 'none';
                }
                userForm.reset();
                loadSectionData('users');

            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    }

    if (localityForm) {
        localityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const localityName = document.getElementById('localityName');
            const localityCode = document.getElementById('localityCode');
            const localityState = document.getElementById('localityState');
            const localityType = document.getElementById('localityType');

            if (!localityName || !localityCode || !localityState || !localityType) {
                showNotification('Erro ao acessar campos do formulário', 'error');
                return;
            }
            
            const formData = {
                name: localityName.value,
                code: localityCode.value,
                state: localityState.value,
                type: localityType.value
            };

            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/localities`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erro ao criar localidade');
                }

                showNotification('Localidade criada com sucesso', 'success');
                const localityModal = document.getElementById('localityModal');
                if (localityModal) {
                    localityModal.style.display = 'none';
                }
                localityForm.reset();
                loadSectionData('localities');

            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    }
}

// Configuração do logout
function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
}

// Carregar dados das seções
async function loadSectionData(section) {
    try {
        const response = await window.fetchWithRetry(`${API_BASE_URL}/api/admin/${section}`);
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
        console.error(`Erro ao carregar dados da seção ${section}:`, error);
        showNotification(error.message, 'error');
    }
}

// Carregar dados do dashboard
async function loadDashboardData() {
    try {
        const response = await window.fetchWithRetry(`${API_BASE_URL}/api/admin/dashboard`);
        const data = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        throw new Error('Erro ao carregar dados do dashboard');
    }
}

// Atualizar seções
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
                <span class="activity-time">${formatDate(activity.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

function updateUsers(data) {
    usersData = data;
    const tbody = document.getElementById('usersTableBody');
    
    tbody.innerHTML = data.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.locality}</td>
            <td>${translateUserType(user.user_type)}</td>
            <td>
                <span class="status-badge ${user.status ? 'active' : 'inactive'}">
                    ${user.status ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <button class="action-btn edit" onclick="editUser('${user.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn toggle-status" onclick="toggleUserStatus('${user.id}')">
                    <i class="fas fa-${user.status ? 'ban' : 'check'}"></i>
                </button>
                <button class="action-btn delete" onclick="deleteUser('${user.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function updateLocalities(data) {
    localitiesData = data;
    const grid = document.getElementById('localitiesGrid');
    
    grid.innerHTML = data.map(locality => `
        <div class="locality-card ${locality.status ? 'active' : 'inactive'}">
            <div class="locality-header">
                <h3>${locality.name}</h3>
                <span class="state-badge">${locality.state}</span>
            </div>
            <div class="locality-info">
                <p><i class="fas fa-code"></i> ${locality.code}</p>
                <p><i class="fas fa-tag"></i> ${locality.type}</p>
            </div>
            <div class="locality-actions">
                <button onclick="editLocality('${locality.id}')" class="action-btn">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="toggleLocalityStatus('${locality.id}')" class="action-btn">
                    <i class="fas fa-${locality.status ? 'ban' : 'check'}"></i>
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

function translateUserType(type) {
    const types = {
        'admin': 'Administrador',
        'manager': 'Gerente',
        'user': 'Usuário'
    };
    return types[type] || type;
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

// Funções de edição
async function editUser(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) {
        showNotification('Usuário não encontrado', 'error');
        return;
    }

    const userName = document.getElementById('userName');
    const userLocality = document.getElementById('userLocality');
    const userType = document.getElementById('userType');
    const userPassword = document.getElementById('userPassword');
    const userModal = document.getElementById('userModal');

    if (!userName || !userLocality || !userType || !userPassword || !userModal) {
        showNotification('Erro ao acessar campos do formulário', 'error');
        return;
    }

    userName.value = user.name;
    userLocality.value = user.city;
    userType.value = user.user_type;
    userPassword.value = '';
    
    userModal.style.display = 'flex';
}

async function toggleUserStatus(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/toggle-status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao alterar status do usuário');
        }

        loadSectionData('users');
        showNotification('Status do usuário alterado com sucesso', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function editLocality(localityId) {
    const locality = localitiesData.find(l => l.id === localityId);
    if (!locality) return;

    // Implementar edição de localidade
    showNotification('Funcionalidade em desenvolvimento', 'info');
}

async function toggleLocalityStatus(localityId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/localities/${localityId}/toggle-status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao alterar status da localidade');
        }

        loadSectionData('localities');
        showNotification('Status da localidade alterado com sucesso', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao excluir usuário');
        }

        loadSectionData('users');
        showNotification('Usuário excluído com sucesso', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
} 
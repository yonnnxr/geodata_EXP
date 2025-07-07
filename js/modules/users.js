import { showNotification } from '../core/notifications.js';

// Traduz tipos de usuário
function translateUserType(type) {
    const types = { admin: 'Administrador', manager: 'Gerente', user: 'Usuário' };
    return types[type] || type;
}

// Atualiza tabela de usuários
export function updateUsers(data) {
    window.usersData = data;
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = data.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.locality}</td>
            <td>${translateUserType(user.user_type)}</td>
            <td><span class="status-badge ${user.status ? 'active' : 'inactive'}">${user.status ? 'Ativo' : 'Inativo'}</span></td>
            <td>
                <button class="action-btn edit" onclick="window.userActions.edit('${user.id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn toggle-status" onclick="window.userActions.toggleStatus('${user.id}')"><i class="fas fa-${user.status ? 'ban' : 'check'}"></i></button>
                <button class="action-btn delete" onclick="window.userActions.remove('${user.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Ações de usuário (expostos em window para uso inline)
async function editUser(userId, usersData) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return showNotification('Usuário não encontrado', 'error');

    const userName = document.getElementById('userName');
    const userLocality = document.getElementById('userLocality');
    const userType = document.getElementById('userType');
    const userPassword = document.getElementById('userPassword');
    const userModal = document.getElementById('userModal');

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
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (!response.ok) throw new Error('Erro ao alterar status do usuário');
        window.loadSectionData('users');
        showNotification('Status do usuário alterado', 'success');
    } catch (e) { showNotification(e.message, 'error'); }
}

async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (!response.ok) throw new Error('Erro ao excluir usuário');
        window.loadSectionData('users');
        showNotification('Usuário excluído', 'success');
    } catch (e) { showNotification(e.message, 'error'); }
}

window.userActions = {
    edit: (id) => editUser(id, window.usersData || []),
    toggleStatus: toggleUserStatus,
    remove: deleteUser
}; 
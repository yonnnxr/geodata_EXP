import { showNotification } from '../core/notifications.js';

export function setupForms(loadSectionData) {
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
                const response = await fetch(`${window.API_BASE_URL}/api/admin/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Erro ao criar usuário');
                showNotification('Usuário criado com sucesso', 'success');
                document.getElementById('userModal').style.display = 'none';
                userForm.reset();
                loadSectionData?.('users');
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
                const response = await fetch(`${window.API_BASE_URL}/api/admin/localities`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(formData)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Erro ao criar localidade');
                showNotification('Localidade criada com sucesso', 'success');
                document.getElementById('localityModal').style.display = 'none';
                localityForm.reset();
                loadSectionData?.('localities');
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    }
} 
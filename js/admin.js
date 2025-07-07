import { showNotification } from './core/notifications.js';
import { loadDashboardData, updateDashboard } from './modules/dashboard.js';
import { setupNavigation } from './modules/navigation.js';
import { setupModals } from './modules/modals.js';
import { setupForms } from './modules/forms.js';
import { updateUsers } from './modules/users.js';
import { updateLocalities } from './modules/localities.js';

// Variáveis globais
let currentSection = 'dashboard';

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
        setupForms(loadSectionData);
        
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
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Usuário não autenticado');
        }

        const response = await window.fetchWithRetry(`${API_BASE_URL}/api/localities`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        const select = document.getElementById('userLocality');
        
        select.innerHTML = data.localities.map(locality => 
            `<option value="${locality.id}">${locality.name}</option>`
        ).join('');
    } catch (error) {
        console.error('Erro ao carregar localidades:', error);
        showNotification(error.message, 'error');
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
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Usuário não autenticado');
        }

        const response = await window.fetchWithRetry(`${API_BASE_URL}/api/admin/${section}`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

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

// Funções de edição movidas para modules/users.js e modules/localities.js 
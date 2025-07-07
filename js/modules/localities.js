import { showNotification } from '../core/notifications.js';

export function updateLocalities(data) {
    window.localitiesData = data;
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
                <button onclick="window.localityActions.edit('${locality.id}')" class="action-btn"><i class="fas fa-edit"></i></button>
                <button onclick="window.localityActions.toggleStatus('${locality.id}')" class="action-btn"><i class="fas fa-${locality.status ? 'ban' : 'check'}"></i></button>
            </div>
        </div>
    `).join('');
}

async function editLocality(localityId) {
    showNotification('Funcionalidade em desenvolvimento', 'info');
}

async function toggleLocalityStatus(localityId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/localities/${localityId}/toggle-status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (!response.ok) throw new Error('Erro ao alterar status da localidade');
        window.loadSectionData('localities');
        showNotification('Status da localidade alterado', 'success');
    } catch (e) { showNotification(e.message, 'error'); }
}

window.localityActions = {
    edit: editLocality,
    toggleStatus: toggleLocalityStatus
}; 
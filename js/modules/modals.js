export function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close-modal');
    const addUserBtn = document.getElementById('addUserBtn');
    const addLocalityBtn = document.getElementById('addLocalityBtn');

    addUserBtn?.addEventListener('click', () => {
        document.getElementById('userModal').style.display = 'flex';
    });

    addLocalityBtn?.addEventListener('click', () => {
        document.getElementById('localityModal').style.display = 'flex';
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
} 
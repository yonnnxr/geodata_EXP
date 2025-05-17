document.getElementById('toggleRedes').addEventListener('change', function () {
    if (this.checked && redesLayer) {
        map.addLayer(redesLayer);
    } else if (redesLayer) {
        map.removeLayer(redesLayer);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('close-btn');

    // Função para abrir/fechar a sidebar
    function toggleSidebar() {
        sidebar.classList.toggle('active');
    }

    // Event listeners
    menuToggle.addEventListener('click', toggleSidebar);
    closeBtn.addEventListener('click', toggleSidebar);

    // Fechar sidebar ao clicar fora dela
    document.addEventListener('click', function(event) {
        const isClickInside = sidebar.contains(event.target) || menuToggle.contains(event.target);
        
        if (!isClickInside && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const closeBtn = document.getElementById('close-btn');
    const userCity = localStorage.getItem('userCity');

    if (userCity) {
        const cidadeFormatada = userCity
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        document.querySelector('#sidebar h2').textContent = `Controle de Camadas - ${cidadeFormatada}`;
    }

    function openSidebar() {
        sidebar.classList.add('active');
        menuToggle.style.display = 'none';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        menuToggle.style.display = 'block';
    }

    menuToggle.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);

    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && 
            !menuToggle.contains(e.target) && 
            sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });

    function adjustSidebar() {
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    }

    window.addEventListener('resize', adjustSidebar);
    adjustSidebar();

    document.getElementById('toggleRedes')?.addEventListener('change', function(e) {
        if (window.map && window.redesLayer) {
            if (e.target.checked) {
                window.map.addLayer(window.redesLayer);
            } else {
                window.map.removeLayer(window.redesLayer);
            }
        }
    });
});

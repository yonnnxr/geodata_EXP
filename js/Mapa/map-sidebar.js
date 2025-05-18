document.getElementById('toggleRedes').addEventListener('change', function () {
    if (this.checked && redesLayer) {
        map.addLayer(redesLayer);
    } else if (redesLayer) {
        map.removeLayer(redesLayer);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const closeBtn = document.getElementById('close-btn');
    const userCity = localStorage.getItem('userCity');

    // Atualizar título do sidebar com o nome da cidade
    if (userCity) {
        const cidadeFormatada = userCity
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        document.querySelector('#sidebar h2').textContent = `Controle de Camadas - ${cidadeFormatada}`;
    }

    // Função para abrir o sidebar
    function openSidebar() {
        sidebar.classList.add('active');
        menuToggle.style.display = 'none';
    }

    // Função para fechar o sidebar
    function closeSidebar() {
        sidebar.classList.remove('active');
        menuToggle.style.display = 'block';
    }

    // Event listeners
    menuToggle.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);

    // Fechar sidebar ao clicar fora dele
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && 
            !menuToggle.contains(e.target) && 
            sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });

    // Fechar sidebar ao pressionar ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });

    // Ajustar sidebar em telas pequenas
    function adjustSidebar() {
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    }

    window.addEventListener('resize', adjustSidebar);
    adjustSidebar();
});

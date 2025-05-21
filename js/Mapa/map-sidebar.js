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

    const toggleRedes = document.getElementById('toggleRedes');
    const toggleEconomias = document.getElementById('toggleEconomias');
    const toggleOcorrencias = document.getElementById('toggleOcorrencias');

    const filterConsumo = document.getElementById('filterConsumo');
    const filterStatus = document.getElementById('filterStatus');
    const filterTipoOcorrencia = document.getElementById('filterTipoOcorrencia');
    const filterPrioridade = document.getElementById('filterPrioridade');

    toggleRedes?.addEventListener('change', function(e) {
        if (window.markerClusters?.['file']) {
            if (e.target.checked) {
                window.map.addLayer(window.markerClusters['file']);
            } else {
                window.map.removeLayer(window.markerClusters['file']);
            }
        }
    });

    toggleEconomias?.addEventListener('change', function(e) {
        if (window.markerClusters?.['file-1']) {
            if (e.target.checked) {
                window.map.addLayer(window.markerClusters['file-1']);
            } else {
                window.map.removeLayer(window.markerClusters['file-1']);
            }
        }
    });

    toggleOcorrencias?.addEventListener('change', function(e) {
        if (window.markerClusters?.['file-2']) {
            if (e.target.checked) {
                window.map.addLayer(window.markerClusters['file-2']);
            } else {
                window.map.removeLayer(window.markerClusters['file-2']);
            }
        }
    });

    function applyFilters() {
        const consumoValue = filterConsumo.value;
        const statusValue = filterStatus.value;
        const tipoOcorrenciaValue = filterTipoOcorrencia.value;
        const prioridadeValue = filterPrioridade.value;

        if (window.markerClusters?.['file-1']) {
            window.markerClusters['file-1'].eachLayer(layer => {
                let visible = true;
                const props = layer.feature.properties;

                if (consumoValue) {
                    const consumo = parseFloat(props.consumo_medio || 0);
                    if (consumoValue === '0' && consumo !== 0) visible = false;
                    else if (consumoValue === '1-10' && (consumo < 1 || consumo > 10)) visible = false;
                    else if (consumoValue === '11-20' && (consumo < 11 || consumo > 20)) visible = false;
                    else if (consumoValue === '>20' && consumo <= 20) visible = false;
                }

                if (statusValue && props.status !== statusValue) visible = false;

                layer.setStyle({ opacity: visible ? 1 : 0, fillOpacity: visible ? 0.6 : 0 });
                layer.options.interactive = visible;
            });
        }

        if (window.markerClusters?.['file-2']) {
            window.markerClusters['file-2'].eachLayer(layer => {
                let visible = true;
                const props = layer.feature.properties;

                if (tipoOcorrenciaValue && props.tipo_ocorrencia !== tipoOcorrenciaValue) visible = false;
                if (prioridadeValue && props.prioridade !== prioridadeValue) visible = false;

                layer.setStyle({ opacity: visible ? 1 : 0, fillOpacity: visible ? 0.6 : 0 });
                layer.options.interactive = visible;
            });
        }
    }

    filterConsumo?.addEventListener('change', applyFilters);
    filterStatus?.addEventListener('change', applyFilters);
    filterTipoOcorrencia?.addEventListener('change', applyFilters);
    filterPrioridade?.addEventListener('change', applyFilters);

    const searchInput = document.getElementById('searchMatricula');
    searchInput?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMatricula();
        }
    });
});

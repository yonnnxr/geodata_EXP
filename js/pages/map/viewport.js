// viewport.js – funções de visualização do mapa

// A função initializeLeafletMap depende de utilitários e variáveis globais
// que ainda são definidos no script legacy (isLeafletLoaded, loadMapData, etc.).
// Durante a migração mantemos essas dependências.

// Se ainda não existir, definimos verificação mínima para Leaflet
if (!window.isLeafletLoaded) {
  window.isLeafletLoaded = () => typeof L !== 'undefined' && typeof L.markerClusterGroup === 'function';
}

export async function initializeLeafletMap() {
    if (window.isMapInitialized) {
        console.log('Mapa já inicializado');
        return true;
    }

    console.log('Iniciando inicialização do mapa Leaflet (módulo viewport)');

    try {
        if (!window.isLeafletLoaded || !window.isLeafletLoaded()) {
            throw new Error('Leaflet ou MarkerCluster não estão carregados corretamente');
        }

        const isMobile = window.innerWidth <= 768;

        // Inicializa os layer groups globais
        window.layerGroups = {
            'file': L.layerGroup(),
            'file-1': L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 200,
                spiderfyOnMaxZoom: false,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                disableClusteringAtZoom: 15,
                animate: false,
                maxZoom: 19
            }),
            'file-2': L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 100,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                disableClusteringAtZoom: 19,
                animate: false,
                maxZoom: 19
            })
        };

        // Alias para compatibilidade com scripts legacy
        window.markerClusters = window.layerGroups;

        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) loadingMessage.style.display = 'none';

        const mapElement = document.getElementById('map');
        if (!mapElement) throw new Error('Elemento do mapa não encontrado');

        window.map = L.map('map', {
            zoomControl: !isMobile,
            tap: true,
            bounceAtZoomLimits: false,
            maxZoom: 19,
            minZoom: 4
        });

        // Camadas base
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(window.map);
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 19
        });
        L.control.layers({ 'OpenStreetMap': osm, 'Satélite': satellite }, null, { position: 'topright' }).addTo(window.map);

        window.map.setView([-20.4697, -54.6201], isMobile ? 11 : 12);
        window.isMapInitialized = true;

        window.map.on('moveend', window.onMapMoveEnd || (() => {}));

        await window.loadMapData(); // função legada
        return true;
    } catch (err) {
        console.error('Erro ao inicializar mapa:', err);
        if (window.showError) window.showError('Erro ao inicializar o mapa: ' + err.message);
        return false;
    }
}

export function fitMapToBounds() {
    const combined = L.latLngBounds();
    Object.values(window.layerGroups || {}).forEach(group => {
        if (group && typeof group.getBounds === 'function') {
            const b = group.getBounds();
            if (b.isValid()) combined.extend(b);
        }
    });
    if (combined.isValid()) window.map.fitBounds(combined, { padding: [20, 20] });
}

export function zoomToFeature(lat, lng) {
    if (window.map) window.map.setView([lat, lng], 19, { animate: true, duration: 1 });
}

// Compatibilidade global
window.zoomToFeature = window.zoomToFeature || zoomToFeature; 
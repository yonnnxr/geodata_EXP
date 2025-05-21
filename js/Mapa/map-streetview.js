let choosingStreetView = false;
let streetViewMarker = null;
let panorama;
let streetViewService;
let isStreetViewInitialized = false;
let streetViewControl = null;

function showMessage(text, duration = 3000) {
    const box = document.getElementById('message-box');
    if (!box) return;
    box.textContent = text;
    box.style.display = 'block';

    setTimeout(() => {
        box.style.display = 'none';
    }, duration);
}

// Função para verificar se o Google Maps está carregado
function isGoogleMapsLoaded() {
    return typeof google !== 'undefined' && google.maps;
}

// Inicializa o Street View quando o Google Maps estiver carregado
const oldInitMap = window.initMap || function() {};
window.initMap = async function() {
    try {
        // Chama a função original de inicialização do mapa
        await oldInitMap();
        
        // Inicializa o Street View
        if (isGoogleMapsLoaded()) {
            streetViewService = new google.maps.StreetViewService();
            isStreetViewInitialized = true;
            initStreetViewControl();
            setupStreetViewMapClick();
            console.log('Street View inicializado com sucesso');
        }
    } catch (error) {
        console.error('Erro na configuração do Street View:', error);
    }
};

function initStreetViewControl() {
    if (!window.map || typeof window.map.addControl !== 'function' || streetViewControl) {
        console.log('Mapa não está pronto ou controle já inicializado');
        return;
    }

    try {
        streetViewControl = L.control({ position: 'topleft' });

        streetViewControl.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            div.innerHTML = `<img src="img/streetview-icon.png" alt="Street View" title="Clique para escolher local do Street View" style="width: 26px; height: 26px; cursor: pointer;">`;

            div.onclick = (e) => {
                e.stopPropagation();
                choosingStreetView = true;
                showMessage('Clique no mapa para escolher o local do Street View.');
            };

            return div;
        };

        streetViewControl.addTo(window.map);
        console.log('Controle do Street View inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar controle do Street View:', error);
    }
}

// Evento de clique no mapa para Street View
function setupStreetViewMapClick() {
    if (window.map && typeof window.map.on === 'function') {
        window.map.on('click', async function(e) {
            if (!choosingStreetView) return;

            choosingStreetView = false;
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            try {
                if (!isGoogleMapsLoaded()) {
                    await loadGoogleMaps();
                }

                if (streetViewMarker) {
                    window.map.removeLayer(streetViewMarker);
                }

                const pegmanIcon = L.icon({
                    iconUrl: 'img/pegman.png',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                });

                streetViewMarker = L.marker([lat, lng], { icon: pegmanIcon })
                    .addTo(window.map)
                    .bindPopup('Street View disponível aqui!');

                const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=AIzaSyAeq2olKPH1UlTKxuOvW7WXpbhdATQ1jG8&location=${lat},${lng}&heading=0&pitch=0&fov=90`;
                
                const iframe = document.createElement('iframe');
                iframe.src = streetViewUrl;
                iframe.style.width = '100%';
                iframe.style.height = '400px';
                iframe.style.border = 'none';

                const popup = L.popup({
                    maxWidth: 600,
                    maxHeight: 450,
                    closeButton: true,
                    className: 'streetview-popup'
                })
                .setLatLng([lat, lng])
                .setContent(iframe)
                .openOn(window.map);

            } catch (error) {
                console.error('Erro ao abrir Street View:', error);
                showMessage('Erro ao carregar Street View. Tente novamente.');
            }
        });
    }
}

document.getElementById('close-streetview').onclick = () => {
    streetviewPanel.style.display = 'none';
    iframe.src = '';
    if (streetViewMarker) {
        window.map.removeLayer(streetViewMarker);
        streetViewMarker = null;
    }
};

function showStreetView(lat, lng) {
    const streetviewPanel = document.getElementById('streetview-panel');
    const streetviewIframe = document.getElementById('streetview-iframe');
    
    if (!isStreetViewInitialized) {
        initStreetView();
    }

    const location = new google.maps.LatLng(lat, lng);
    
    streetViewService.getPanorama({ location, radius: 50 }, (data, status) => {
        if (status === google.maps.StreetViewStatus.OK) {
            const panoId = data.location.pano;
            const heading = google.maps.geometry.spherical.computeHeading(
                data.location.latLng,
                location
            );

            const streetViewUrl = `https://www.google.com/maps/embed?pb=!4v1&map_action=pano&pano=${panoId}&heading=${heading}&pitch=0`;
            streetviewIframe.src = streetViewUrl;
            streetviewPanel.style.display = 'block';
        } else {
            showError('Street View não disponível nesta localização.');
        }
    });
}

function closeStreetView() {
    const streetviewPanel = document.getElementById('streetview-panel');
    const streetviewIframe = document.getElementById('streetview-iframe');
    streetviewIframe.src = '';
    streetviewPanel.style.display = 'none';
}

document.getElementById('close-streetview').addEventListener('click', closeStreetView);

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

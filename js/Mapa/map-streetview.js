let choosingStreetView = false;
let streetViewMarker = null;
let panorama;
let streetViewService;
let isStreetViewInitialized = false;

function showMessage(text, duration = 3000) {
    const box = document.getElementById('message-box');
    if (!box) return;
    box.textContent = text;
    box.style.display = 'block';

    setTimeout(() => {
        box.style.display = 'none';
    }, duration);
}

const streetviewPanel = document.getElementById('streetview-panel');
const iframe = document.getElementById('streetview-iframe');

const streetViewControl = L.control({ position: 'topleft' });

streetViewControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.innerHTML = `<img src="https://w7.pngwing.com/pngs/275/833/png-transparent-google-maps-geolocation-google-street-view-google-thumbnail.png" alt="Street View" title="Clique para escolher local do Street View" style="width: 26px; height: 26px; cursor: pointer;">`;

    div.onclick = (e) => {
        e.stopPropagation();
        choosingStreetView = true;
        showMessage('Clique no mapa para escolher o local do Street View.');
    };

    return div;
};

streetViewControl.addTo(map);

map.on('click', function (e) {
    if (!choosingStreetView) return;

    choosingStreetView = false;

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    if (streetViewMarker) {
        map.removeLayer(streetViewMarker);
        streetViewMarker = null;
    }

    const pegmanIcon = L.icon({
        iconUrl: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    streetViewMarker = L.marker([lat, lng], { icon: pegmanIcon })
        .addTo(map)
        .bindPopup('Street View aberto aqui!')

    const apiKey = 'AIzaSyAeq2olKPH1UlTKxuOvW7WXpbhdATQ1jG8';
    const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}&heading=0&pitch=0&fov=90`;

    iframe.src = streetViewUrl;
    streetviewPanel.style.display = 'block';

    map.setView([lat, lng], 18);
});

document.getElementById('close-streetview').onclick = () => {
    streetviewPanel.style.display = 'none';
    iframe.src = '';
    if (streetViewMarker) {
        map.removeLayer(streetViewMarker);
        streetViewMarker = null;
    }
};

// Função para inicializar o Street View
function initStreetView() {
    if (!isStreetViewInitialized) {
        streetViewService = new google.maps.StreetViewService();
        isStreetViewInitialized = true;
    }
}

// Função para mostrar o Street View
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

// Função para fechar o Street View
function closeStreetView() {
    const streetviewPanel = document.getElementById('streetview-panel');
    const streetviewIframe = document.getElementById('streetview-iframe');
    streetviewIframe.src = '';
    streetviewPanel.style.display = 'none';
}

// Event listener para o botão de fechar
document.getElementById('close-streetview').addEventListener('click', closeStreetView);

// Função para mostrar mensagens de erro
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

// Inicializar Street View quando o Google Maps estiver carregado
function initMap() {
    initStreetView();
}

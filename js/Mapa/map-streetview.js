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

const streetviewPanel = document.getElementById('streetview-panel');
const iframe = document.getElementById('streetview-iframe');

// Função para inicializar o controle do Street View
// Modificar a função initStreetViewControl para verificar melhor se o mapa existe
function initStreetViewControl() {
    // Verificação mais robusta para garantir que o mapa está inicializado
    if (!window.map || typeof window.map.addControl !== 'function' || streetViewControl) {
        console.log('Mapa não está pronto ou controle já inicializado');
        return;
    }

    try {
        streetViewControl = L.control({ position: 'topleft' });

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

        // Adicionar o controle ao mapa com tratamento de erro
        try {
            streetViewControl.addTo(window.map);
            console.log('Controle do Street View inicializado com sucesso');
        } catch (addError) {
            console.error('Erro ao adicionar controle ao mapa:', addError);
        }
    } catch (error) {
        console.error('Erro ao inicializar controle do Street View:', error);
    }
}

// Modificar o event listener para ser mais robusto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, aguardando inicialização do mapa...');
    
    // Aguardar a inicialização do mapa com verificação mais robusta
    const checkMapInterval = setInterval(() => {
        if (window.map && typeof window.map.on === 'function') {
            console.log('Mapa detectado e inicializado corretamente');
            
            // Inicializar o controle do Street View
            initStreetViewControl();
            
            // Adicionar o evento de clique ao mapa
            try {
                window.map.on('click', function (e) {
                    if (!choosingStreetView) return;

                    choosingStreetView = false;

                    const lat = e.latlng.lat;
                    const lng = e.latlng.lng;

                    if (streetViewMarker) {
                        window.map.removeLayer(streetViewMarker);
                        streetViewMarker = null;
                    }

                    const pegmanIcon = L.icon({
                        iconUrl: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
                        iconSize: [32, 32],
                        iconAnchor: [16, 32],
                        popupAnchor: [0, -32]
                    });

                    streetViewMarker = L.marker([lat, lng], { icon: pegmanIcon })
                        .addTo(window.map)
                        .bindPopup('Street View aberto aqui!');

                    const apiKey = 'AIzaSyAeq2olKPH1UlTKxuOvW7WXpbhdATQ1jG8';
                    const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}&heading=0&pitch=0&fov=90`;

                    iframe.src = streetViewUrl;
                    streetviewPanel.style.display = 'block';

                    window.map.setView([lat, lng], 18);
                });
                
                console.log('Evento de clique adicionado ao mapa');
            } catch (clickError) {
                console.error('Erro ao adicionar evento de clique:', clickError);
            }
            
            clearInterval(checkMapInterval);
        } else {
            console.log('Aguardando inicialização do mapa...');
        }
    }, 500); // Aumentei o intervalo para 500ms para reduzir a carga
});

// Remover os comentários de código duplicado
document.getElementById('close-streetview').onclick = () => {
    streetviewPanel.style.display = 'none';
    iframe.src = '';
    if (streetViewMarker) {
        window.map.removeLayer(streetViewMarker);
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

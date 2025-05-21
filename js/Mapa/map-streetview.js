let choosingStreetView = false;
let streetViewMarker = null;
let panorama;
let streetViewService;
let isStreetViewInitialized = false;
let streetViewControl = null;

function showMessage(text, duration = 3000) {
    const box = document.getElementById('message-box') || createMessageBox();
    box.textContent = text;
    box.style.display = 'block';

    setTimeout(() => {
        box.style.display = 'none';
    }, duration);
}

function createMessageBox() {
    const box = document.createElement('div');
    box.id = 'message-box';
    box.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        display: none;
    `;
    document.body.appendChild(box);
    return box;
}

function checkStreetViewDependencies() {
    if (!window.google || !window.google.maps) {
        console.error('Google Maps não está disponível para Street View');
        return false;
    }

    if (!window.map) {
        console.error('Mapa base não está disponível para Street View');
        return false;
    }

    return true;
}

async function initStreetView() {
    if (isStreetViewInitialized) {
        console.log('Street View já inicializado');
        return true;
    }

    try {
        if (!checkStreetViewDependencies()) {
            throw new Error('Dependências do Street View não disponíveis');
        }

        streetViewService = new google.maps.StreetViewService();
        
        initStreetViewControl();
        setupStreetViewMapClick();
        
        isStreetViewInitialized = true;
        console.log('Street View inicializado com sucesso');
        
        return true;
    } catch (error) {
        console.error('Erro na configuração do Street View:', error);
        showMessage('Erro ao inicializar Street View: ' + error.message);
        return false;
    }
}

function initStreetViewControl() {
    if (!window.map || typeof window.map.addControl !== 'function' || streetViewControl) {
        console.error('Mapa não está pronto ou controle já inicializado');
        return false;
    }

    try {
        streetViewControl = L.control({ position: 'topleft' });

        streetViewControl.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            div.innerHTML = `
                <a href="#" title="Ativar Street View">
                    <img src="img/streetview-icon.png" alt="Street View" style="width: 26px; height: 26px;">
                </a>
            `;

            div.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                choosingStreetView = true;
                showMessage('Clique no mapa para escolher o local do Street View');
            };

            return div;
        };

        streetViewControl.addTo(window.map);
        return true;
    } catch (error) {
        console.error('Erro ao inicializar controle do Street View:', error);
        return false;
    }
}

function setupStreetViewMapClick() {
    if (!window.map || !window.google || !window.google.maps) {
        console.error('Dependências não disponíveis para configurar clique do Street View');
        return false;
    }

    window.map.on('click', async function(e) {
        if (!choosingStreetView) return;

        choosingStreetView = false;
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        try {
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
                .bindPopup('Carregando Street View...');

            const location = new google.maps.LatLng(lat, lng);
            
            streetViewService.getPanorama({ location, radius: 50 }, (data, status) => {
                if (status === google.maps.StreetViewStatus.OK) {
                    const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${window.GOOGLE_MAPS_CONFIG.apiKey}&location=${lat},${lng}&heading=0&pitch=0&fov=90`;
                    
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
                } else {
                    showMessage('Street View não disponível nesta localização');
                    if (streetViewMarker) {
                        window.map.removeLayer(streetViewMarker);
                    }
                }
            });

        } catch (error) {
            console.error('Erro ao abrir Street View:', error);
            showMessage('Erro ao carregar Street View: ' + error.message);
            if (streetViewMarker) {
                window.map.removeLayer(streetViewMarker);
            }
        }
    });

    return true;
}

window.addEventListener('mapReady', async () => {
    console.log('Evento mapReady recebido, iniciando Street View...');
    try {
        await initStreetView();
    } catch (error) {
        console.error('Erro ao inicializar Street View após mapReady:', error);
        showMessage('Falha ao inicializar Street View: ' + error.message);
    }
});

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

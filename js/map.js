const map = L.map('map');

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
}).addTo(map);

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/' +
    'World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri',
    maxZoom: 19
});

L.control.layers({
    "Mapa": osmLayer,
    "Satélite": satelliteLayer
}).addTo(map);

let redesLayer;

document.getElementById('loadingMessage').style.display = 'block';

const token = localStorage.getItem('authToken');
console.log('Token no map.js:', token);

if (token) {
    fetch('https://api-geodata-exp.onrender.com/geodata_regional', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`Erro ao carregar dados do mapa: ${res.status}`);
        }
        return res.text();
    })
    .then(data => {
        console.log("Dados recebidos da API (texto):", data);
        try {
            const geojsonData = JSON.parse(data);
            console.log("Dados parseados para JSON:", geojsonData);
            redesLayer = L.geoJSON(geojsonData, {
                style: { color: 'blue', weight: 3 },
                onEachFeature: (feature, layer) => {
                    if (feature.properties && feature.properties.nome) {
                        layer.bindPopup(feature.properties.nome);
                    }
                }
            });
            redesLayer.addTo(map);

            if (geojsonData.features && geojsonData.features.length > 0) {
                map.fitBounds(redesLayer.getBounds());
            } else {
                map.setView([-20.4695, -54.6052], 13);
                console.warn("Nenhum feature encontrado no GeoJSON, definindo centro padrão.");
            }

            document.getElementById('loadingMessage').style.display = 'none';
        } catch (error) {
            console.error("Erro ao fazer o parse do JSON:", error);
            alert("Erro ao processar dados do mapa (JSON inválido).");
            document.getElementById('loadingMessage').style.display = 'none';
        }
    })
    .catch(err => {
        alert("Erro ao carregar dados do mapa.");
        document.getElementById('loadingMessage').style.display = 'none';
        console.error("Erro ao carregar dados do mapa:", err);
    });
} else {
    console.warn('Token não encontrado, talvez o usuário não esteja logado.');
    window.location.href = 'Login.html';
}

document.getElementById('toggleRedes').addEventListener('change', function () {
    if (this.checked && redesLayer) {
        map.addLayer(redesLayer);
    } else if (redesLayer) {
        map.removeLayer(redesLayer);
    }
});

const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const closeBtn = document.getElementById('close-btn');

menuToggle.addEventListener('click', () => {
    sidebar.classList.add('open');
    menuToggle.style.display = 'none';
});

closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
    menuToggle.style.display = 'block';
});


let choosingStreetView = false;
let streetViewMarker = null;

const streetviewPanel = document.createElement('div');
streetviewPanel.id = 'streetview-panel';
streetviewPanel.style.position = 'absolute';
streetviewPanel.style.bottom = '10px';
streetviewPanel.style.left = '10px';
streetviewPanel.style.width = '400px';
streetviewPanel.style.height = '300px';
streetviewPanel.style.border = '2px solid #ccc';
streetviewPanel.style.backgroundColor = 'white';
streetviewPanel.style.zIndex = '1000';
streetviewPanel.style.display = 'none';
streetviewPanel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
streetviewPanel.innerHTML = `
    <button id="close-streetview" style="position:absolute; top:5px; right:5px; z-index:10; cursor:pointer;">✖</button>
    <iframe id="streetview-iframe" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>
`;
document.body.appendChild(streetviewPanel);

document.getElementById('close-streetview').onclick = () => {
    streetviewPanel.style.display = 'none';
    document.getElementById('streetview-iframe').src = '';
    if (streetViewMarker) {
        map.removeLayer(streetViewMarker);
        streetViewMarker = null;
    }
};

const streetViewControl = L.control({ position: 'topleft' });

streetViewControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.innerHTML = '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Street_View_icon.svg/32px-Street_View_icon.svg.png" alt="Street View" title="Clique para escolher local do Street View" style="width: 26px; height: 26px; cursor: pointer;">';
    
    div.onclick = () => {
        choosingStreetView = true;
        alert('Clique no mapa para escolher o local do Street View.');
    };

    return div;
};

streetViewControl.addTo(map);

map.on('click', function(e) {
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
        .openPopup();

    // Atualiza iframe com URL do Street View Embed da Google
    const apiKey = 'AIzaSyAeq2olKPH1UlTKxuOvW7WXpbhdATQ1jG8';
    const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}&heading=0&pitch=0&fov=90`;

    const iframe = document.getElementById('streetview-iframe');
    iframe.src = streetViewUrl;

    streetviewPanel.style.display = 'block';

    map.setView([lat, lng], 18);
});

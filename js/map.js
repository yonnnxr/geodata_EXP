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
                    console.log("Feature Properties:", feature.properties);
                    //implementar
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


const streetViewControl = L.control({ position: 'topleft' });

streetViewControl.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.innerHTML = '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Street_View_icon.svg/32px-Street_View_icon.svg.png" alt="Street View" style="width: 26px; height: 26px; cursor: pointer;" title="Clique para escolher local do Street View">';

    div.onclick = function () {
        alert('Clique no mapa para escolher o local do Street View.');

        const pegmanIcon = L.icon({
            iconUrl: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        if (window.streetViewMarker) {
            map.removeLayer(window.streetViewMarker);
            window.streetViewMarker = null;
        }

        function onMapClick(e) {
            const latlng = e.latlng;

            map.off('click', onMapClick);

            window.streetViewMarker = L.marker(latlng, { icon: pegmanIcon })
                .addTo(map)
                .bindPopup("Street View aberto aqui!")
                .openPopup();


            L.streetView({
                position: latlng,
                pov: { heading: 0, pitch: 0 },
                zoom: 1
            }).addTo(map);
        }

        map.on('click', onMapClick);
    };

    return div;
};

streetViewControl.addTo(map);

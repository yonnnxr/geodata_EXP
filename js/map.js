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

const token = localStorage.getItem('authToken');
console.log('Token no map-init.js:', token);

document.getElementById('loadingMessage').style.display = 'block';

if (token) {
    fetch('https://api-geodata-exp.onrender.com/geodata_regional', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (!res.ok) throw new Error(`Erro ao carregar dados do mapa: ${res.status}`);
        return res.text();
    })
    .then(data => {
        const geojsonData = JSON.parse(data);
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
        }

        document.getElementById('loadingMessage').style.display = 'none';
    })
    .catch(err => {
        alert("Erro ao carregar dados do mapa.");
        document.getElementById('loadingMessage').style.display = 'none';
        console.error("Erro ao carregar dados do mapa:", err);
    });
} else {
    console.warn('Token não encontrado. Redirecionando para o login.');
    window.location.href = 'Login.html';
}

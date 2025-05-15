const map = L.map('map').setView([-22.223, -54.812], 12);

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
if (token) {
    fetch('https://api-geo-ymve.onrender.com/geodata_regional', {
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
        return res.json();
    })
    .then(data => {
        redesLayer = L.geoJSON(data, {
            style: { color: 'blue', weight: 3 },
            onEachFeature: (feature, layer) => {
                let popup = '';
                for (const key in feature.properties) {
                    popup += `<strong>${key}</strong>: ${feature.properties[key]}<br>`;
                }
                layer.bindPopup(popup);
            }
        });
        map.addLayer(redesLayer);
        document.getElementById('loadingMessage').style.display = 'none';
    })
    .catch(err => {
        alert("Erro ao carregar dados do mapa.");
        document.getElementById('loadingMessage').style.display = 'none';
        console.error("Erro ao carregar dados do mapa:", err);
    });
} else {
    console.warn('Token não encontrado, talvez o usuário não esteja logado.');
    window.location.href = 'login.html';
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
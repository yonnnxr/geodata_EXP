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
            console.log("Primeiro Feature:", geojsonData.features ? geojsonData.features[0] : 'Nenhum feature encontrado');
            redesLayer = L.geoJSON(geojsonData, {
                style: { color: 'blue', weight: 3 },
                onEachFeature: (feature, layer) => {
                    console.log("Feature Properties:", feature.properties);
                    // ... o restante da sua função onEachFeature ...
                }
            });
            map.addLayer(redesLayer);
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
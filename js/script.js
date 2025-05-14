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

let regionalLayer;
let redesLayer;

document.getElementById('loadingMessage').style.display = 'block';

async function loadRegionalData() {
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
        window.location.href = 'index.html';
        return;
    }

    const apiUrl = 'https://api-geodata-exp.onrender.com/geodata_regional';

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });

        if (response.ok) {
            const geojsonData = await response.json();
            regionalLayer = L.geoJSON(geojsonData).addTo(map);
        } else if (response.status === 401) {
            localStorage.removeItem('authToken');
            window.location.href = 'index.html';
        } else if (response.status === 404) {
            console.error('Dados da regional não encontrados.');
            alert('Dados da regional não encontrados.');
        } else {
            console.error('Erro ao carregar dados da regional:', response.status);
            alert('Erro ao carregar dados da regional.');
        }

    } catch (error) {
        console.error('Erro ao comunicar com a API para buscar dados da regional:', error);
        alert('Erro ao comunicar com o servidor para buscar dados da regional.');
    }
}

fetch('https://api-geo-ymve.onrender.com/redes_agua')
    .then(res => res.json())
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
    .catch(err => console.error("Erro ao carregar redes de água:", err));

document.getElementById('toggleRedes').addEventListener('change', function () {
    if (this.checked && redesLayer) {
        map.addLayer(redesLayer);
    } else if (redesLayer) {
        map.removeLayer(redesLayer);
    }
});

loadRegionalData();

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
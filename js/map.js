const map = L.map('map').setView([-20.4695, -54.6052], 13);

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

let redesLayer;
let streetViewMode = false;
let pegmanMarker = null;

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
    return res.json();
  })
  .then(geojsonData => {
    redesLayer = L.geoJSON(geojsonData, {
      style: { color: 'blue', weight: 3 },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`ID: ${feature.properties.id || 'Sem informação'}`);
      }
    }).addTo(map);

    if (geojsonData.features.length > 0) {
      map.fitBounds(redesLayer.getBounds());
    }

    document.getElementById('loadingMessage').style.display = 'none';
  })
  .catch(err => {
    console.error("Erro ao carregar dados do mapa:", err);
    alert("Erro ao carregar dados do mapa.");
    document.getElementById('loadingMessage').style.display = 'none';
  });
} else {
  console.warn('Token não encontrado. Redirecionando...');
  window.location.href = 'Login.html';
}

document.getElementById('toggleRedes').addEventListener('change', function () {
  if (this.checked && redesLayer) {
    map.addLayer(redesLayer);
  } else if (redesLayer) {
    map.removeLayer(redesLayer);
  }
});

const streetViewControl = L.control({ position: 'topleft' });

streetViewControl.onAdd = function () {
  const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
  div.innerHTML = `
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Street_View_icon.svg/32px-Street_View_icon.svg.png"
         alt="Street View"
         style="width: 26px; height: 26px; cursor: pointer;"
         title="Clique para ativar o Street View">`;

  div.onclick = function () {
    streetViewMode = true;
    map._container.style.cursor = 'crosshair';
    alert("Clique no local do mapa onde deseja abrir o Street View.");
  };

  return div;
};

streetViewControl.addTo(map);


map.on('click', function (e) {
  if (!streetViewMode) return;

  const { lat, lng } = e.latlng;

  if (pegmanMarker) {
    map.removeLayer(pegmanMarker);
  }

  const pegmanIcon = L.icon({
    iconUrl: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  pegmanMarker = L.marker([lat, lng], { icon: pegmanIcon })
    .addTo(map)
    .bindPopup("Street View aqui")
    .openPopup();

  const iframe = document.getElementById('streetViewFrame');
  const container = document.getElementById('streetViewContainer');
  const url = `https://www.google.com/maps/embed?pb=!4v0!6m8!1m7!1sCAoSLEFGMVFpcE1JUnZ1Z19vYVZYVGRhU25WeUtUeXRqUDFoYVZjQjE1cUVEaHJB!2m2!1d${lat}!2d${lng}!3f0!4f0!5f1.1924812503605782`;

  iframe.src = url;
  container.style.display = 'block';

  streetViewMode = false;
  map._container.style.cursor = '';
});

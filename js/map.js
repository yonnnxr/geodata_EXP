const map = L.map('map').setView([-20.4695, -54.6052], 13);

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 19
}).addTo(map);

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri',
  maxZoom: 19
});

L.control.layers({
  "Mapa": osmLayer,
  "Satélite": satelliteLayer
}).addTo(map);

let streetViewMode = false;
let pegmanMarker = null;

const streetViewControl = L.control({ position: 'topleft' });

streetViewControl.onAdd = function () {
  const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
  div.innerHTML = `
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Street_View_icon.svg/32px-Street_View_icon.svg.png"
         alt="Street View"
         style="width: 26px; height: 26px; cursor: pointer;"
         title="Clique para escolher o local">`;

  div.onclick = function () {
    streetViewMode = true;
    map._container.style.cursor = 'crosshair';
    alert("Clique no mapa onde deseja abrir o Street View.");
  };

  return div;
};

streetViewControl.addTo(map);

map.on('click', function (e) {
  if (!streetViewMode) return;

  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  if (pegmanMarker) {
    map.removeLayer(pegmanMarker);
  }

  const pegmanIcon = L.icon({
    iconUrl: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  pegmanMarker = L.marker([lat, lng], { icon: pegmanIcon }).addTo(map)
    .bindPopup("Abrindo Street View...")
    .openPopup();

  const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  window.open(url, '_blank');

  streetViewMode = false;
  map._container.style.cursor = '';
});

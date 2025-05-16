let choosingStreetView = false;
let streetViewMarker = null;

// Botão de fechar o painel
document.getElementById('close-streetview').onclick = () => {
    document.getElementById('streetview-panel').style.display = 'none';
    document.getElementById('streetview-iframe').src = '';
    if (streetViewMarker) {
        map.removeLayer(streetViewMarker);
        streetViewMarker = null;
    }
};

// Botão na barra do Leaflet
const streetViewControl = L.control({ position: 'topleft' });

streetViewControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.innerHTML = `
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Street_View_icon.svg/32px-Street_View_icon.svg.png"
             alt="Street View" title="Clique para escolher local do Street View"
             style="width: 26px; height: 26px; cursor: pointer;">
    `;

    div.onclick = () => {
        choosingStreetView = true;
        alert('Clique no mapa para escolher o local do Street View.');
    };

    return div;
};

streetViewControl.addTo(map);

// Evento de clique no mapa
map.on('click', function (e) {
    if (!choosingStreetView) return;

    choosingStreetView = false;

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    if (streetViewMarker) {
        map.removeLayer(streetViewMarker);
    }

    // Ícone do Pegman
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

    const apiKey = 'AIzaSyAeq2olKPH1UlTKxuOvW7WXpbhdATQ1jG8';
    const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}&heading=0&pitch=0&fov=90`;

    const iframe = document.getElementById('streetview-iframe');
    iframe.src = streetViewUrl;

    document.getElementById('streetview-panel').style.display = 'block';
    map.setView([lat, lng], 18);
});

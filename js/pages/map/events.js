// events.js – módulo para eventos padrão do mapa

import { clearHighlight } from './layers.js';

function initializeEvents() {
  if (!window.map) return;
  console.log('Inicializando eventos do mapa (module)');

  // Clique simples
  window.map.on('click', e => {
    console.log('Clique no mapa:', e.latlng);
    clearHighlight();
    window.zoomToFeature?.(e.latlng.lat, e.latlng.lng);
  });

  // Fim de movimento
  window.map.on('moveend', () => window.onMapMoveEnd?.());

  // Zoom
  window.map.on('zoomend', () => console.log('Zoom:', window.map.getZoom()));

  // Carregamento inicial completo
  window.map.whenReady(() => {
    if (!window.dadosCarregados) {
      window.loadMapData?.().then(() => { window.dadosCarregados = true; });
    }
  });
}

// Aguarda mapa
const waiter = setInterval(() => { if (window.map) { clearInterval(waiter); initializeEvents(); } }, 100); 
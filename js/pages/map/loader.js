// loader.js – lógica de carregamento de dados do mapa (camadas + tiles)
// Este módulo ainda depende de algumas funções globais (fetchWithRetry, LAYER_CONFIGS, etc.)
// mas agora encapsula toda a lógica de I/O, facilitando testes e futura migração da API.

import { processFeatures } from './layers.js';

/* eslint-disable no-console */

// ------------------------------ Constantes ------------------------------
export const ECONOMIA_PAGE_SIZE = 50_000;
export const TILE_ZOOM = 14;
export const MAX_CACHE_TILES = 200;

// ------------------------------ Estado ------------------------------
export let currentEconomiaPage = 1;
let hasMoreEconomias = true;
let bboxFetchTimeout = null;

// Cache de tiles baixados (compartilhado globalmente)
export const tileCache = window.tileCache ?? (window.tileCache = new Map());

// ------------------------------ Utilidades de UI ------------------------------
export function updateLoadingProgress(layerType, page, total, description) {
  const loadingMessage = document.getElementById('loadingMessage');
  if (!loadingMessage) return;

  const progressText = total ? ` (${page}/${total})` : ` (Página ${page})`;
  loadingMessage.querySelector('span').textContent = `Carregando ${description ?? layerType}${progressText}...`;
}

function updateLayerControl(layerType, description) {
  const layerControl = document.getElementById('layerControl');
  if (!layerControl) return;

  if (document.getElementById(`toggle-${layerType}`)) return;

  const div = document.createElement('div');
  div.className = 'layer-toggle';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `toggle-${layerType}`;
  checkbox.checked = true;
  const label = document.createElement('label');
  label.htmlFor = `toggle-${layerType}`;
  label.textContent = description;
  div.appendChild(checkbox);
  div.appendChild(label);
  layerControl.appendChild(div);

  checkbox.addEventListener('change', e => {
    const lg = window.layerGroups?.[layerType];
    if (!lg) return;
    if (e.target.checked) window.map.addLayer(lg); else window.map.removeLayer(lg);
  });
}

function fitMapToBounds() {
  const combined = L.latLngBounds();
  Object.values(window.layerGroups ?? {}).forEach(group => { 
    if (group && typeof group.getBounds === 'function') {
      const b = group.getBounds();
      if (b.isValid()) combined.extend(b);
    }
  });
  if (combined.isValid()) window.map.fitBounds(combined, { padding: [20, 20] });
}

function handleAuthError() {
  console.error('Credenciais ausentes ou inválidas – redirecionando para login');
  if (typeof window.showError === 'function') window.showError('Sessão expirada. Faça login novamente.');
  setTimeout(() => { window.location.href = 'login.html'; }, 1500);
}

// ------------------------------ Carregamento de camada ------------------------------
export async function loadLayerData(layer, page, userCity, token) {
  try {
    const isEconomia = layer.type === 'file-1';
    const perPage = isEconomia ? ECONOMIA_PAGE_SIZE : 0;
    const description = window.LAYER_CONFIGS?.[layer.type]?.description ?? layer.type;

    console.log(`loadLayerData: ${layer.type} page=${page}`);
    updateLoadingProgress(layer.type, page, null, description);

    const url = `${window.API_BASE_URL}/api/geodata/${userCity}/map?type=${layer.type}&page=${page}&per_page=${perPage}`;

    const response = await window.fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, 3, 2_000, 60_000);

    if (!response.ok) {
      if (response.status === 401) return handleAuthError();
      console.error('Erro na resposta', response.status, await response.text());
      return;
    }

    const data = await response.json();
    if (!data?.features) {
      console.warn('Resposta sem features');
      return;
    }

    const totalFeatures = data.metadata?.total_features;
    const processedFeatures = (page - 1) * perPage + data.features.length;
    if (totalFeatures) {
      updateLoadingProgress(layer.type, processedFeatures.toLocaleString(), totalFeatures.toLocaleString(), description);
    }

    await processFeatures(data.features, layer.type, data.metadata);

    if (page === 1) updateLayerControl(layer.type, data.metadata?.description ?? description);

    if (data.metadata?.has_more) {
      await loadLayerData(layer, page + 1, userCity, token);
    }

    if (isEconomia) {
      currentEconomiaPage = page;
      hasMoreEconomias = data.metadata?.has_more ?? false;
    }
  } catch (err) {
    console.error('loadLayerData error', err);
    throw err;
  }
}

// ------------------------------ Lógica por tiles ------------------------------
export function lonLatToTile(lon, lat, zoom) {
  const latRad = lat * Math.PI / 180;
  const n = 2 ** zoom;
  const x = Math.floor((lon + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

export function tileToBBox(x, y, zoom) {
  const n = 2 ** zoom;
  const lon1 = x / n * 360 - 180;
  const lat1Rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
  const lat1 = lat1Rad * 180 / Math.PI;

  const lon2 = (x + 1) / n * 360 - 180;
  const lat2Rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n)));
  const lat2 = lat2Rad * 180 / Math.PI;

  return { minLon: lon1, minLat: lat2, maxLon: lon2, maxLat: lat1 };
}

export function getVisibleTiles(map, zoomLevel) {
  const bounds = map.getBounds();
  const nw = bounds.getNorthWest();
  const se = bounds.getSouthEast();

  const nwTile = lonLatToTile(nw.lng, nw.lat, zoomLevel);
  const seTile = lonLatToTile(se.lng, se.lat, zoomLevel);

  const tiles = [];
  for (let x = nwTile.x; x <= seTile.x; x++) {
    for (let y = nwTile.y; y <= seTile.y; y++) {
      tiles.push({ x, y, z: zoomLevel });
    }
  }
  return tiles;
}

async function fetchEconomiasTile(tile, userCity, token) {
  const key = `${tile.z}/${tile.x}/${tile.y}`;
  if (tileCache.has(key)) return;

  if (tileCache.size >= MAX_CACHE_TILES) {
    const oldest = tileCache.keys().next().value;
    tileCache.delete(oldest);
  }

  const bbox = tileToBBox(tile.x, tile.y, tile.z);
  const bboxStr = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
  const url = `${window.API_BASE_URL}/api/geodata/${userCity}/bbox?bbox=${bboxStr}`;

  try {
    const res = await window.fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, 3, 2_000, 60_000);
    if (!res.ok) {
      console.error('Erro ao carregar tile', key, res.status);
      return;
    }
    const data = await res.json();
    if (data?.features?.length) await processFeatures(data.features, 'file-1', data.metadata);
    tileCache.set(key, true);
  } catch (err) {
    console.error('Falha ao buscar tile', key, err);
  }
}

export function scheduleFetchVisibleTiles() {
  if (bboxFetchTimeout) clearTimeout(bboxFetchTimeout);
  bboxFetchTimeout = setTimeout(async () => {
    const zoom = window.map.getZoom();
    if (zoom < TILE_ZOOM) return;

    const userCity = localStorage.getItem('userCity')?.toLowerCase();
    const token = localStorage.getItem('authToken');
    if (!userCity || !token) return;

    for (const tile of getVisibleTiles(window.map, TILE_ZOOM)) {
      await fetchEconomiasTile(tile, userCity, token);
    }
  }, 300);
}

// ------------------------------ onMove handler ------------------------------
export function onMapMoveEnd() {
  scheduleFetchVisibleTiles();
}

// ------------------------------ Carregamento principal ------------------------------
export async function loadMapData(startEconomiaPage = 1) {
  try {
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity')?.toLowerCase();
    if (!token || !userCity) return handleAuthError();

    currentEconomiaPage = startEconomiaPage;

    const layersToLoad = startEconomiaPage > 1 ? [{ type: 'file-1' }] : [
      { type: 'file' }, // rede
      { type: 'file-2' } // ocorrências
    ];

    for (const layer of layersToLoad) {
      const initialPage = layer.type === 'file-1' ? startEconomiaPage : 1;
      await loadLayerData(layer, initialPage, userCity, token);
    }

    if (startEconomiaPage === 1) {
      fitMapToBounds();
      scheduleFetchVisibleTiles();
      window.dadosCarregados = true;
    }
  } catch (err) {
    console.error('loadMapData error', err);
    throw err;
  }
}

// ------------------------------ Compatibilidade global ------------------------------
window.loadLayerData = window.loadLayerData || loadLayerData;
window.loadMapData = window.loadMapData || loadMapData;
window.onMapMoveEnd = window.onMapMoveEnd || onMapMoveEnd; 
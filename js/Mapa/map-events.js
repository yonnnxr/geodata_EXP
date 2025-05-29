// Eventos do mapa
document.addEventListener('DOMContentLoaded', () => {
    // Aguarda a inicialização do mapa
    const checkMap = setInterval(() => {
        if (window.map) {
            clearInterval(checkMap);
            initializeMapEvents();
        }
    }, 100);
});

function initializeMapEvents() {
    console.log('Inicializando eventos do mapa...');

    // Evento de clique no mapa
    window.map.on('click', (e) => {
        console.log('Clique no mapa:', e.latlng);
        
        // Limpa qualquer destaque anterior
        if (window.clearHighlight) {
            window.clearHighlight();
        }

        // Zoom para a localização clicada
        if (window.zoomToFeature) {
            window.zoomToFeature(e.latlng.lat, e.latlng.lng);
        }
    });

    // Evento de fim de movimento do mapa
    window.map.on('moveend', () => {
        if (window.onMapMoveEnd) {
            window.onMapMoveEnd();
        }
    });

    // Evento de zoom
    window.map.on('zoomend', () => {
        console.log('Nível de zoom atual:', window.map.getZoom());
    });

    // Evento de carregamento do mapa
    window.map.on('load', () => {
        console.log('Mapa carregado completamente');
        if (!window.dadosCarregados) {
            window.loadMapData().then(() => {
                console.log('Dados carregados com sucesso');
                window.dadosCarregados = true;
            }).catch(error => {
                console.error('Erro ao carregar dados:', error);
                showError('Erro ao carregar dados do mapa: ' + error.message);
            });
        }
    });
}

// Função para buscar matrícula
window.searchMatricula = async function() {
    const searchInput = document.getElementById('searchMatricula');
    const searchResults = document.getElementById('searchResults');
    const matricula = searchInput.value.trim();

    if (!matricula) {
        showWarning('Digite uma matrícula para buscar');
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        const userCity = localStorage.getItem('userCity')?.toLowerCase();

        if (!token || !userCity) {
            throw new Error('Dados de autenticação incompletos');
        }

        const response = await window.fetchWithRetry(`${window.API_BASE_URL}/api/geodata/${userCity}/search?matricula=${matricula}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro na busca: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.features || data.features.length === 0) {
            searchResults.innerHTML = '<p class="no-results">Nenhum resultado encontrado</p>';
            return;
        }

        // Exibe os resultados
        searchResults.innerHTML = data.features.map(feature => `
            <div class="search-result" onclick="zoomToFeature(${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]})">
                <i class="fas fa-map-marker-alt"></i>
                <div class="result-info">
                    <strong>Matrícula: ${feature.properties.matricula}</strong>
                    <small>${feature.properties.endereco || 'Endereço não disponível'}</small>
                </div>
            </div>
        `).join('');

        // Zoom para o primeiro resultado
        const firstFeature = data.features[0];
        window.zoomToFeature(firstFeature.geometry.coordinates[1], firstFeature.geometry.coordinates[0]);

    } catch (error) {
        console.error('Erro na busca:', error);
        showError('Erro ao buscar matrícula: ' + error.message);
    }
}; 
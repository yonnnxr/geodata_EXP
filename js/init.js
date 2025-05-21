// Função para carregar scripts de forma sequencial
function loadScriptsSequentially(scripts) {
    return scripts.reduce((promise, script) => {
        return promise.then(() => {
            return new Promise((resolve, reject) => {
                console.log(`Carregando script: ${script}`);
                const scriptElement = document.createElement('script');
                scriptElement.src = script;
                scriptElement.async = false; // Carregamento sequencial
                
                scriptElement.onload = () => {
                    console.log(`Script carregado: ${script}`);
                    resolve();
                };
                
                scriptElement.onerror = () => {
                    console.error(`Erro ao carregar script: ${script}`);
                    reject(new Error(`Falha ao carregar ${script}`));
                };
                
                document.body.appendChild(scriptElement);
            });
        });
    }, Promise.resolve());
}

// Iniciar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Carregar scripts em ordem específica
    loadScriptsSequentially([
        'js/config.js',
        'js/utils/auth.js',
        'https://unpkg.com/leaflet@1.9.3/dist/leaflet.js',
        'js/Mapa/map.js',
        'js/Mapa/map-sidebar.js'
    ]).then(() => {
        console.log('Todos os scripts foram carregados');
        // Inicializar o mapa
        if (typeof initializeLeafletMap === 'function') {
            console.log('Iniciando o mapa...');
            initializeLeafletMap().catch(error => {
                console.error('Erro ao inicializar o mapa:', error);
            });
        } else {
            console.error('Função initializeLeafletMap não encontrada');
        }
    }).catch(error => {
        console.error('Erro ao carregar scripts:', error);
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle"></i>
                    Erro ao carregar scripts: ${error.message}
                </div>
            `;
            loadingMessage.style.display = 'block';
        }
    });
}); 
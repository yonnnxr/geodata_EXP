// Função para carregar scripts em sequência
async function loadScriptsSequentially(scripts) {
    const loadedScripts = new Set();
    
    for (const script of scripts) {
        // Verifica se o script já está carregado no documento
        if (document.querySelector(`script[src="${script}"]`)) {
            console.log(`Script já carregado no documento: ${script}`);
            continue;
        }
        
        // Verifica se já carregamos nesta sessão
        if (loadedScripts.has(script)) {
            console.log(`Script já carregado nesta sessão: ${script}`);
            continue;
        }
        
        console.log(`Carregando script: ${script}`);
        try {
            await new Promise((resolve, reject) => {
                const scriptElement = document.createElement('script');
                scriptElement.src = script;
                scriptElement.async = false;
                
                scriptElement.onload = () => {
                    console.log(`Script carregado: ${script}`);
                    loadedScripts.add(script);
                    resolve();
                };
                
                scriptElement.onerror = () => {
                    reject(new Error(`Erro ao carregar script: ${script}`));
                };
                
                document.head.appendChild(scriptElement);
            });
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}

// Iniciar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Carregar scripts em ordem específica
    loadScriptsSequentially([
        'js/config.js',
        'js/utils/auth.js',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js'
    ]).then(() => {
        console.log('Scripts base carregados');
        // Carregar scripts da aplicação após os scripts base
        return loadScriptsSequentially([
            'js/Mapa/map.js',
            'js/Mapa/map-sidebar.js'
        ]);
    }).then(() => {
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
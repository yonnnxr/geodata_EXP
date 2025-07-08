// Configuração da API
const API_BASE_URL = 'https://api-geodata-exp.onrender.com';

// Elementos do DOM
const userNameElement = document.getElementById('userName');
const cityNameElement = document.getElementById('cityName');
const totalRedesElement = document.getElementById('totalRedes');
const totalExtensaoElement = document.getElementById('totalExtensao');
const totalPontosElement = document.getElementById('totalPontos');
const logoutBtn = document.getElementById('logoutBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Página inicial carregada');
    
    // Usar o novo sistema de proteção
    if (!window.protectPage || !window.protectPage()) {
        return; // Página foi redirecionada
    }
    
    // Carregar a página
    loadPage();
});

function loadPage() {
    console.log('🏠 Carregando página inicial...');
    
    // Obter dados do usuário
    const user = window.SimpleAuth.getUser();
    console.log('Dados do usuário:', user);
    
    // Atualizar elementos da página
    if (userNameElement && user.name) {
        userNameElement.textContent = user.name;
    }
    
    if (cityNameElement && user.city) {
        cityNameElement.textContent = user.city;
    }

    // Carregar estatísticas
    loadStatistics();
}

// Configurar botão de logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        console.log('🚪 Logout solicitado via botão');
        window.SimpleAuth.logout();
    });
}

// Função para carregar estatísticas com cache
async function loadStatistics() {
    const userCity = localStorage.getItem('userCity')?.toLowerCase();
    const cacheKey = `statistics:${userCity}`;
    
    try {
        // Tentar buscar do cache primeiro
        if (window.cache) {
            const cachedData = await window.cache.get(cacheKey);
            if (cachedData) {
                console.log('Estatísticas carregadas do cache');
                updateStatistics(cachedData);
                
                // Carregar dados atualizados em background
                window.debounce('loadStats', () => loadStatisticsFromAPI(cacheKey), 1000);
                return;
            }
        }
        
        // Se não houver cache, carregar da API
        await loadStatisticsFromAPI(cacheKey);
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        handleStatisticsError(error);
    }
}

// Carregar estatísticas da API
async function loadStatisticsFromAPI(cacheKey) {
    const token = localStorage.getItem('authToken');
    const userCity = localStorage.getItem('userCity')?.toLowerCase();

    if (!token || !userCity) {
        throw new Error('Dados de autenticação incompletos');
    }

    console.log(`Carregando estatísticas para ${userCity}...`);
    
    // Mostrar loading se não houver dados em cache
    if (window.loading && !(await window.cache?.get(cacheKey))) {
        const loaderId = window.loading.show('Carregando estatísticas...');
        
        try {
            const response = await window.fetchWithRetry(`${API_BASE_URL}/api/statistics/${userCity}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }, 3, 2000, 30000);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erro na resposta:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });

                if (response.status === 401) {
                    window.location.href = 'login.html';
                    return;
                }

                throw new Error(`Erro ao carregar estatísticas: ${response.status}`);
            }

            const data = await response.json();
            console.log('Dados recebidos:', data);
            
            // Salvar no cache com TTL de 2 minutos
            if (window.cache) {
                await window.cache.set(cacheKey, data, 2 * 60 * 1000);
            }
            
            updateStatistics(data);
            window.loading.hide(loaderId);
            
        } catch (error) {
            window.loading.hide(loaderId);
            throw error;
        }
    } else {
        // Requisição sem loading se há dados em cache
        const response = await window.fetchWithRetry(`${API_BASE_URL}/api/statistics/${userCity}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }, 3, 2000, 30000);

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`Erro ao carregar estatísticas: ${response.status}`);
        }

        const data = await response.json();
        
        // Atualizar cache
        if (window.cache) {
            await window.cache.set(cacheKey, data, 2 * 60 * 1000);
        }
        
        updateStatistics(data);
    }
}

// Tratar erros de estatísticas
function handleStatisticsError(error) {
    let errorMessage = 'Erro ao carregar estatísticas';
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Sessão expirada. Redirecionando para login...';
        showError(errorMessage);
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'Acesso negado para esta cidade. Verifique suas permissões.';
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
        errorMessage = 'Dados não encontrados para esta cidade. Contate o administrador.';
    } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        errorMessage = 'Erro no servidor. Tente novamente em alguns instantes.';
    } else if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
        errorMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
    } else if (error.message.includes('Network') || error.message.includes('fetch') || 
              error.message.includes('Failed to fetch')) {
        errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
    } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorMessage = 'Tempo limite excedido. Verifique sua conexão e tente novamente.';
    } else if (error.message.includes('incompletos')) {
        errorMessage = 'Dados de autenticação incompletos. Fazendo login novamente...';
        setTimeout(() => window.location.href = 'login.html', 2000);
    }
    
    showError(errorMessage);
    
    // Mostrar dados padrão em caso de erro
    if (totalRedesElement) totalRedesElement.textContent = 'N/A';
    if (totalPontosElement) totalPontosElement.textContent = 'N/A';
    if (totalExtensaoElement) totalExtensaoElement.textContent = 'N/A';
}
}

// Função para mostrar erros
function showError(message) {
    // Usar o sistema unificado de notificações se disponível
    if (window.notifications) {
        window.notifications.error(message);
    } else {
        // Fallback para o sistema antigo
        const errorContainer = document.getElementById('errorContainer') || createErrorContainer();
        errorContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <strong>Erro!</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

// Função para criar container de erro
function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'errorContainer';
    container.className = 'error-container';
    document.body.insertBefore(container, document.body.firstChild);
    return container;
}

// Função para atualizar estatísticas na página
function updateStatistics(data) {
    try {
        console.log('Atualizando estatísticas:', data);
        
        // Atualiza os contadores
        if (totalRedesElement) totalRedesElement.textContent = formatNumber(data.total_networks || 0);
        if (totalPontosElement) totalPontosElement.textContent = formatNumber(data.total_points || 0);
        if (totalExtensaoElement) totalExtensaoElement.textContent = formatNumber(data.total_length / 1000 || 0, 2) + ' km';
        
        // Atualiza detalhes adicionais se existirem
        if (data.details) {
            const detalhesRedes = document.getElementById('detalhesRedes');
            const detalhesEconomias = document.getElementById('detalhesEconomias');
            const detalhesExtensao = document.getElementById('detalhesExtensao');
            
            if (detalhesRedes) detalhesRedes.textContent = formatNumber(data.details.networks || 0);
            if (detalhesEconomias) detalhesEconomias.textContent = formatNumber(data.details.economies || 0);
            if (detalhesExtensao) detalhesExtensao.textContent = formatNumber(data.details.network_length_km || 0, 2) + ' km';
        }
    } catch (error) {
        console.error('Erro ao atualizar estatísticas na página:', error);
        showError('Erro ao atualizar informações na página');
    }
}

// Função para formatar números
function formatNumber(value, decimals = 0) {
    if (!value && value !== 0) return 'N/A';
    return Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Adicionar animações aos cards quando ficarem visíveis
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, {
    threshold: 0.1
});

// Observar todos os cards
document.querySelectorAll('.card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    observer.observe(card);
});

// Adicionar efeito de hover nos cards
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Adicionar animação de clique nos cards
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', function(e) {
        // Criar efeito de onda
        const ripple = document.createElement('div');
        ripple.classList.add('ripple');
        
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        card.appendChild(ripple);
        
        // Remover o efeito após a animação
        setTimeout(() => {
            ripple.remove();
        }, 1000);

        // Navegar para a página correspondente se houver um link
        const href = this.getAttribute('data-href');
        if (href) {
            setTimeout(() => {
                window.location.href = href;
            }, 300);
        }
    });
}); 
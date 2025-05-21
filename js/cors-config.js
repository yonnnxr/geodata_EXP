// Configuração do proxy CORS
(function() {
    // Verifica se já existe uma solicitação de acesso ao proxy
    if (!localStorage.getItem('cors_proxy_requested')) {
        // Redireciona para a página de ativação do proxy
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/corsdemo';
        window.open(proxyUrl, '_blank');
        localStorage.setItem('cors_proxy_requested', 'true');
    }
})(); 
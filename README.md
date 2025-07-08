# SisGeti - Sistema de Visualização de Dados Geográficos

SisGeti é um sistema web moderno para visualização e gerenciamento de dados geográficos, especialmente focado em redes de água, economias e ocorrências. O sistema oferece uma interface intuitiva para visualização de mapas interativos e gerenciamento administrativo.

## 🌟 Funcionalidades

### 🗺️ Visualização de Mapas
- **Mapa Interativo**: Visualização de dados geográficos usando Leaflet
- **Camadas Personalizáveis**: 
  - Redes de Água
  - Economias
  - Ocorrências
- **Busca por Matrícula**: Localização rápida de propriedades
- **Controle de Camadas**: Ativar/desativar visualizações
- **Legenda Interativa**: Identificação fácil dos elementos

### 🔐 Sistema de Autenticação
- Login seguro com autenticação JWT
- Controle de sessão e renovação automática de tokens
- Diferentes níveis de permissão

### 👥 Gerenciamento de Usuários
- **Painel Administrativo**: Interface completa para administradores
- **Gerenciamento de Usuários**: Criação, edição e remoção de usuários
- **Controle de Localidades**: Gerenciamento de cidades e distritos
- **Sistema de Permissões**: Três níveis de acesso
  - **Administrador**: Acesso total ao sistema
  - **Gerente Local**: Gerenciamento da localidade específica
  - **Usuário**: Visualização de dados

### 📊 Estatísticas e Relatórios
- Dashboard com métricas em tempo real
- Estatísticas de redes de água
- Relatórios de extensão total
- Contagem de pontos cadastrados

## 🚀 Tecnologias Utilizadas

### Frontend
- **HTML5** - Estrutura das páginas
- **CSS3** - Estilização e design responsivo
- **JavaScript (ES6+)** - Funcionalidades interativas
- **Leaflet.js** - Mapas interativos
- **Font Awesome** - Ícones
- **Google Fonts (Poppins)** - Tipografia

### Backend/API
- **API REST** - Integração com API externa
- **JWT Authentication** - Autenticação segura
- **CORS** - Suporte a requisições cross-origin

### Deploy
- **GitHub Pages** - Hospedagem automática
- **GitHub Actions** - CI/CD automatizado

## 📁 Estrutura do Projeto

```
sisgeti/
├── css/                    # Arquivos de estilo
│   ├── global.css         # Estilos globais
│   ├── login.css          # Estilos da página de login
│   ├── configuracoes.css  # Estilos das configurações
│   └── estatisticas.css   # Estilos das estatísticas
├── js/                    # Scripts JavaScript
│   ├── core/              # Funcionalidades principais
│   ├── modules/           # Módulos reutilizáveis
│   ├── pages/             # Scripts específicos de páginas
│   ├── config.js          # Configurações da aplicação
│   ├── login.js           # Lógica de autenticação
│   ├── admin.js           # Painel administrativo
│   └── ...
├── img/                   # Imagens e recursos
├── *.html                 # Páginas da aplicação
├── .github/workflows/     # Configurações de CI/CD
└── README.md             # Este arquivo
```

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Navegador web moderno
- Servidor web (para desenvolvimento local)

### Configuração Local

1. **Clone o repositório**:
```bash
git clone https://github.com/seu-usuario/sisgeti.git
cd sisgeti
```

2. **Inicie um servidor local**:
```bash
# Usando Python
python -m http.server 8000

# Usando Node.js
npx http-server

# Usando PHP
php -S localhost:8000
```

3. **Acesse a aplicação**:
Abra o navegador e acesse `http://localhost:8000`

### Configuração da API

Edite o arquivo `js/config.js` para configurar a URL da API:

```javascript
window.API_BASE_URL = 'https://sua-api.com';
```

## 🔧 Configuração

### Variáveis de Configuração

No arquivo `js/config.js`, você pode configurar:

- **API_BASE_URL**: URL base da API
- **LAYER_CONFIGS**: Configurações das camadas do mapa
- **GOOGLE_MAPS_CONFIG**: Configurações do Google Maps
- **API_TIMEOUT**: Timeout para requisições
- **API_RETRY_ATTEMPTS**: Número de tentativas de retry

### Personalização de Estilos

Os estilos podem ser personalizados editando os arquivos CSS:

- `css/global.css`: Estilos globais e variáveis CSS
- `css/login.css`: Estilos específicos da página de login
- Outros arquivos CSS para páginas específicas

## 📖 Como Usar

### 1. Acesso ao Sistema
- Acesse a página inicial
- Faça login com suas credenciais
- Você será redirecionado para o dashboard

### 2. Visualização de Mapas
- Clique em "Visualizar Mapa" no dashboard
- Use o menu lateral para controlar as camadas
- Busque por matrículas específicas
- Visualize informações detalhadas clicando nos elementos

### 3. Administração (apenas para administradores)
- Acesse o painel administrativo
- Gerencie usuários e localidades
- Configure permissões
- Visualize estatísticas do sistema

## 🔐 Níveis de Permissão

### Administrador
- ✅ Gerenciar usuários
- ✅ Gerenciar localidades
- ✅ Definir permissões
- ✅ Visualizar relatórios completos

### Gerente Local
- ✅ Gerenciar usuários da localidade
- ✅ Visualizar dados da localidade
- ❌ Definir permissões globais
- ✅ Relatórios locais

### Usuário
- ❌ Gerenciar usuários
- ✅ Visualizar dados
- ❌ Definir permissões
- ❌ Visualizar relatórios administrativos

## 🚀 Deploy

O projeto está configurado para deploy automático no GitHub Pages:

1. **Push para main**: Automaticamente aciona o deploy
2. **GitHub Actions**: Processa e publica o site
3. **Acesso**: Disponível em `https://seu-usuario.github.io/sisgeti`

## 🐛 Solução de Problemas

### Problemas Comuns

1. **Erro de CORS**: Verifique se a API está configurada para aceitar requisições da origem
2. **Token expirado**: O sistema tenta renovar automaticamente, mas pode ser necessário fazer login novamente
3. **Mapa não carrega**: Verifique a conexão com a internet e a configuração da API

### Logs de Debug

O sistema inclui logs detalhados no console do navegador para facilitar o debug.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas:
- 📧 Email: suporte@sisgeti.com
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/sisgeti/issues)

---

⭐ Se este projeto foi útil para você, considere dar uma estrela no repositório!

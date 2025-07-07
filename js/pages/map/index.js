// Entry-point do Mapa (fase de migração)
// 1. Garante que o utilitário de autenticação global esteja carregado
import '../../core/auth.js';

// 2. Importa placeholders – à medida que migrarmos, funções reais virão desses módulos
import './layers.js';
import * as loader from './loader.js';
import * as viewport from './viewport.js';
import './sidebar.js';
import './events.js';

// 3. Para manter o funcionamento durante a migração, ainda carregamos o script original
//    que expõe todas as funções/variáveis globais já utilizadas por sidebar, events etc.
//    import '../../Mapa/map.js'; // legado

// Dependência legacy removida após migração das principais funções

(async () => {
  await viewport.initializeLeafletMap();
})();

// Futuramente, removeremos a importação legacy e chamaremos somente funções migradas. 
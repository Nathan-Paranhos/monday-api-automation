// Carrega variáveis de ambiente baseado no ambiente
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: '.env.production' });
} else {
  require('dotenv').config();
}
const path = require('path');
const os = require('os');

/**
 * Configurações centralizadas da aplicação
 * Contém caminhos, tokens e mapeamento de responsáveis por produto
 */
const config = {
  // Configurações do Monday.com
  monday: {
    apiToken: process.env.MONDAY_API_TOKEN,
    boardId: process.env.MONDAY_BOARD_ID,
    apiUrl: 'https://api.monday.com/v2',
    // ATENÇÃO: Substitua pelo ID do usuário que será o responsável BOT
    botUserId: 12345678 // Substitua pelo ID de usuário numérico correto
  },

  // Configurações do servidor
  server: {
    port: process.env.PORT || 10000,
    environment: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production'
  },

  // Configurações de email
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true' || true, // Habilita notificações por email
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    service: process.env.EMAIL_SERVICE || 'gmail', // gmail, outlook, etc.
    from: process.env.EMAIL_FROM || 'sistema-bot@fagrontech.com.br'
  },

  // Caminhos base do sistema
  paths: {
    baseUserPath: process.env.BASE_USER_PATH || (process.env.NODE_ENV === 'production' ? '/tmp' : `C:\\Users\\${os.userInfo().username}\\OneDrive - Fagron\\COM272 - FagronTech - Onboarding\\# Backoffice`),
    modelFilePath: process.env.MODEL_FILE_PATH || (process.env.NODE_ENV === 'production' ? '/tmp/modelo.vsdx' : `C:\\Users\\${os.userInfo().username}\\OneDrive - Fagron\\COM272 - FagronTech - Onboarding\\# Backoffice\\# BOT Extensão\\Modelo - Fluxo de atendimento BOT Numérico.vsdx`),
    
    // Caminhos específicos por produto
    products: {
      'BOT': '# BOT Extensão',
      'Fórmula Certa': '# BOT Extensão\\#FCERTA EXTENSÃO\\',
      'Phusion': '# BOT Extensão\\#PHUSION EXTENSÃO\\'
    }
  },

  // Mapeamento de responsáveis por produto
  responsaveis: {
    'BOT': ['Nathan.silva@fagrontech.com.br', 'Pedro.Ribeiro@fagrontech.com.br', 'Bruno.Vaz@fagrontech.com.br', 'Jean.Vencigueri@fagrontech.com.br'],
    'Fórmula Certa': ['Nathan.silva@fagrontech.com.br', 'Pedro.Ribeiro@fagrontech.com.br', 'Bruno.Vaz@fagrontech.com.br', 'Jean.Vencigueri@fagrontech.com.br'],
    'Phusion': ['Nathan.silva@fagrontech.com.br', 'Pedro.Ribeiro@fagrontech.com.br', 'Bruno.Vaz@fagrontech.com.br', 'Jean.Vencigueri@fagrontech.com.br']
  },

  // Status válidos para o sistema
  statusValidos: [
    'Na fila', 'em andamento', 'configuração', 'concluido', 'finalizado', 'pausado', 
    'cancelado', 'relacionamento', 'pausado features', 'aguardando 3º', 
    'desenvolvimento', 'aguardando implantações', 'pausado cliente', 'inadimplente'
  ],

  // Mapeamento para normalização de status (considerando variações de capitalização e acentuação)
  statusMapping: {
    'Na Fila': 'na fila',
    'Em andamento': 'em andamento',
    'Configuração': 'configuração',
    'Concluído': 'concluido',
    'Finalizado': 'finalizado',
    'Pausado': 'pausado',
    'Cancelado': 'cancelado',
    'Relacionamento': 'relacionamento',
    'Pausado Features': 'pausado features',
    'Aguardando 3º': 'aguardando 3º',
    'Desenvolvimento': 'desenvolvimento',
    'Aguardando implantações FCerta ou Phusion': 'aguardando implantações',
    'Pausado Cliente': 'pausado cliente',
    'Inadimplente': 'inadimplente'
  },

  // Produtos de referencias para criação de pastas 
  produtosValidos: ['BOT', 'Fórmula Certa', 'Phusion'],

  // IDs das colunas no Monday.com (IDs reais obtidos da API)
  colunasIds: {
    status: 'status_1', // ID da coluna de status principal
    produto: 'status_1', // ID da coluna de produto (mesmo que status)
    principalProduto: 'status_15', // ID da coluna de produto principal
    responsavel: 'person', // ID da coluna de responsável
    codigoCliente: 'text', // ID da coluna de código do cliente
    // Adicione outros IDs de coluna conforme necessário
  },
  
  // Mapeamento de propriedades para IDs de colunas do Monday.com
  // Isso torna o código mais robusto, pois IDs não mudam, mas títulos de colunas podem mudar.
  camposMonday: {
    elemento: 'name',
    responsavel: 'person', // Substitua pelo ID da coluna de responsável
    status: 'status', // Substitua pelo ID da coluna de status
    produto: 'connect_boards', // Substitua pelo ID da coluna de produto
    principalProduto: 'connect_boards2', // Substitua pelo ID da coluna de produto principal
    codigoCliente: 'text' // Substitua pelo ID da coluna de código do cliente
    // Adicione outros campos aqui, mapeando um nome lógico para o ID da coluna
    // Ex: dataSolicitacao: 'date_1'
  },

  /**
   * Gera o caminho completo da pasta baseado no produto e ID do cliente
   * @param {string} produto - Nome do produto
   * @param {number} idCliente - ID do cliente
   * @returns {string} Caminho completo da pasta
   */
  gerarCaminhoPasta(produto, idCliente) {
    const basePath = this.paths.baseUserPath;
    const produtoPath = this.paths.products[produto];
    
    if (!produtoPath) {
      throw new Error(`Produto inválido: ${produto}`);
    }
    
    return path.join(basePath, produtoPath, idCliente.toString());
  },

  /**
   * Obtém o responsável pelo produto
   * @param {string} produto - Nome do produto
   * @returns {string|Array} Email(s) do(s) responsável(is)
   */
  obterResponsavel(produto) {
    const responsavel = this.responsaveis[produto];
    
    if (!responsavel) {
      throw new Error(`Responsável não encontrado para o produto: ${produto}`);
    }
    
    return responsavel;
  },

  /**
   * Valida se o produto é válido
   * @param {string} produto - Nome do produto
   * @returns {boolean} True se válido
   */
  isProdutoValido(produto) {
    if (!produto) return false;
    
    if (this.produtosValidos.includes(produto)) return true;
    
    if (this.paths.products[produto]) return true;
    const produtoNormalizado = produto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    for (const validProduto of this.produtosValidos) {
      const validProdutoNormalizado = validProduto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (validProdutoNormalizado === produtoNormalizado) return true;
    }
    
    for (const key of Object.keys(this.paths.products)) {
      const keyNormalizado = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (keyNormalizado === produtoNormalizado) return true;
    }
    
    return false;
  },

  /**
   * Normaliza o status recebido do Monday.com para o formato interno
   * @param {string} status - Status recebido do Monday.com
   * @returns {string} Status normalizado
   */
  normalizarStatus(status) {
    if (!status) return null;
    
    const statusNormalizado = this.statusMapping[status];
    if (statusNormalizado) return statusNormalizado;
    
    const statusSemAcento = status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    // Verifica se existe no mapeamento após normalização
    for (const [key, value] of Object.entries(this.statusMapping)) {
      const keySemAcento = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (keySemAcento === statusSemAcento) {
        return value;
      }
    }
    
    // Caso não exista no mapeamento, retorna o status sem acento e em minúsculo
    return statusSemAcento;
  },

  /**
   * Valida se o status é válido, após normalização
   * @param {string} status - Status a ser validado
   * @returns {boolean} True se válido
   */
  isStatusValido(status) {
    const statusNormalizado = this.normalizarStatus(status);
    return this.statusValidos.includes(statusNormalizado);
  },
  
  /**
   * Obtém o nome do campo no Monday.com baseado na propriedade desejada
   * @param {string} propriedade - Nome da propriedade interna
   * @returns {Array} Possíveis nomes do campo no Monday.com
   */
  obterNomesCampo(propriedade) {
    return this.camposMonday[propriedade] || [];
  }
};

module.exports = config;
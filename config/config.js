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
    apiUrl: 'https://api.monday.com/v2'
  },

  // Configurações do servidor
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production'
  },

  // Caminhos base do sistema
  paths: {
    baseUserPath: process.env.BASE_USER_PATH || (process.env.NODE_ENV === 'production' ? '/tmp' : `C:\\Users\\${os.userInfo().username}\\OneDrive`),
    modelFilePath: process.env.MODEL_FILE_PATH || (process.env.NODE_ENV === 'production' ? '/tmp/modelo.vsdx' : 'C:\\OneDrive\\Onboarding\\#Backoffice\\#BOT Extensão\\Modelo Fluxo.vsdx'),
    
    // Caminhos específicos por produto
    products: {
      'Fórmula Certa': '#FCERTA EXTENSÃO',
      'Phusion': '#PHUSION EXTENSÃO'
    }
  },

  // Mapeamento de responsáveis por produto
  responsaveis: {
    'Fórmula Certa': 'Pedro.Ribeiro@fagrontech.com.br',
    'Phusion': 'Bruno.Vaz@fagrontech.com.br'
  },

  // Produtos válidos
  produtosValidos: ['Fórmula Certa', 'Phusion'],

  /**
   * Gera o caminho completo da pasta baseado no produto e ID do cliente
   * @param {string} produto - Nome do produto
   * @param {number} idCliente - ID do cliente
   * @returns {string} Caminho completo da pasta
   */
  gerarCaminhoPasta(produto, idCliente) {
    const basePath = this.paths.baseUserPath.replace('{User}', os.userInfo().username);
    const produtoPath = this.paths.products[produto];
    
    if (!produtoPath) {
      throw new Error(`Produto inválido: ${produto}`);
    }
    
    return path.join(basePath, produtoPath, idCliente.toString());
  },

  /**
   * Obtém o responsável pelo produto
   * @param {string} produto - Nome do produto
   * @returns {string} Email do responsável
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
    return this.produtosValidos.includes(produto);
  }
};

module.exports = config;
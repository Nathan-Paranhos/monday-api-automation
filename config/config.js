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

  // Produtos válidos
  produtosValidos: ['BOT', 'Fórmula Certa', 'Phusion'],
  
  // Configuração para campos adicionais identificados nas imagens
  camposMonday: {
    elemento: ['name', 'elemento'],
    responsavel: ['responsavel', 'responsável'],
    acompanhamento: ['acompanhamento'],
    proximoContato: ['proximo contato', 'próximo contato'],
    esforcoReal: ['esforco real', 'esforço real'],
    goLive: ['go live'],
    case: ['case'],
    dataSolicitacao: ['data solicitacao', 'data solicitação'],
    cronograma: ['cronograma'],
    etapas: ['etapas'],
    status: ['status'],
    produto: ['produto'],
    tipoPix: ['tipo pix', 'tipo Pix'],
    principalProduto: ['principal produto'],
    codigoCliente: ['codigo cliente', 'código cliente', 'id cliente', 'cliente id']
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
    
    // Verifica se o produto está na lista de produtos válidos
    if (this.produtosValidos.includes(produto)) return true;
    
    // Verifica se o produto está no mapeamento de paths
    if (this.paths.products[produto]) return true;
    
    // Normaliza o produto (remove acentos e converte para minúsculo) para comparação
    const produtoNormalizado = produto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    // Verifica se algum produto válido corresponde após normalização
    for (const validProduto of this.produtosValidos) {
      const validProdutoNormalizado = validProduto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (validProdutoNormalizado === produtoNormalizado) return true;
    }
    
    // Verifica se alguma chave no mapeamento de paths corresponde após normalização
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
    
    // Verifica se existe no mapeamento
    const statusNormalizado = this.statusMapping[status];
    if (statusNormalizado) return statusNormalizado;
    
    // Remove acentos e converte para minúsculo para melhorar compatibilidade
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
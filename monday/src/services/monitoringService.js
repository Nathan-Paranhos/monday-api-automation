const MondayClient = require('../../mondayClient');
const AutomationService = require('../../../src/services/automationService');
const { logger } = require('../../../logs/logger');
const config = require('../../../config/config');

/**
 * Serviço de monitoramento contínuo para detectar produtos BOT
 * e criar pastas automaticamente
 */
class MonitoringService {
  constructor() {
    this.mondayClient = new MondayClient();
    this.automationService = new AutomationService();
    this.isRunning = false;
    this.intervalId = null;
    this.processedItems = new Set(); 
    this.monitoringInterval = 20000; 
  }

  /**
   * Inicia o monitoramento contínuo
   */
  async startMonitoring() {
    if (this.isRunning) {
      logger.info('Serviço de monitoramento já está em execução');
      return;
    }

    this.isRunning = true;
    logger.info('Iniciando monitoramento contínuo de produtos BOT...');

    // Executa imediatamente na primeira vez
    await this.checkForBotProducts();

    // Configura o intervalo de monitoramento
    this.intervalId = setInterval(async () => {
      try {
        await this.checkForBotProducts();
      } catch (error) {
        logger.error('Erro no monitoramento', { error: error.message, action: 'checkForBotProducts' });
      }
    }, this.monitoringInterval);

    logger.info(`Monitoramento ativo - verificando a cada ${this.monitoringInterval / 1000} segundos`);
  }

  /**
   * Para o monitoramento contínuo
   */
  stopMonitoring() {
    if (!this.isRunning) {
      logger.info('Serviço de monitoramento não está em execução');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Monitoramento contínuo parado');
  }

  /**
   * Verifica se há novos produtos BOT no Monday.com
   */
  async checkForBotProducts() {
    try {
      logger.info('Verificando novos produtos BOT...');

      // Busca todos os itens do board
      const items = await this.mondayClient.consultarTodosItens();
      
      if (!items || items.length === 0) {
        logger.info('Nenhum item encontrado no board');
        return;
      }

      let newBotProductsFound = 0;

      for (const item of items) {
        // Verifica se já foi processado
        if (this.processedItems.has(item.id)) {
          continue;
        }

        // Verifica se é um produto BOT
        if (this.isBotProduct(item)) {
          logger.info(`Produto BOT detectado: ${item.name} (ID: ${item.id})`);
          
          try {
            // Processa automaticamente o produto BOT
            await this.processNewBotProduct(item);
            
            // Marca como processado
            this.processedItems.add(item.id);
            newBotProductsFound++;
            
            logger.info(`Produto BOT processado com sucesso: ${item.name}`);
          } catch (error) {
            logger.error('Erro ao processar produto BOT', { 
              error: error.message,
              action: 'processNewBotProduct', 
              itemId: item.id, 
              itemName: item.name 
            });
          }
        }
      }

      if (newBotProductsFound > 0) {
        logger.info(`${newBotProductsFound} novo(s) produto(s) BOT processado(s)`);
      } else {
        logger.info('Nenhum novo produto BOT encontrado');
      }

    } catch (error) {
      logger.error('Erro ao verificar produtos BOT', { error: error.message, action: 'checkForBotProducts' });
    }
  }

  /**
   * Verifica se um item é um produto BOT
   * @param {Object} item - Item do Monday.com
   * @returns {boolean}
   */
  isBotProduct(item) {
    if (!item || !item.column_values) {
      return false;
    }

    // Procura por colunas que indiquem produto BOT
    const produtoColumn = item.column_values.find(col => 
      col.column && col.column.title && 
      col.column.title.toLowerCase().includes('produto')
    );

    const principalProdutoColumn = item.column_values.find(col => 
      col.column && col.column.title && 
      col.column.title.toLowerCase().includes('principal produto')
    );

    // Verifica se contém "BOT" no nome do produto ou principal produto
    const produtoText = produtoColumn?.text?.toLowerCase() || '';
    const principalProdutoText = principalProdutoColumn?.text?.toLowerCase() || '';
    const itemName = item.name?.toLowerCase() || '';

    return produtoText.includes('bot') || 
           principalProdutoText.includes('bot') || 
           itemName.includes('bot');
  }

  /**
   * Processa um novo produto BOT detectado
   * @param {Object} item - Item do Monday.com
   */
  async processNewBotProduct(item) {
    try {
      logger.info(`Iniciando processamento automático do produto BOT: ${item.name}`);

      // Consulta detalhes completos do item
        const itemDetalhado = await this.mondayClient.buscarItemPorId(item.id);
      
      if (!itemDetalhado) {
        throw new Error(`Não foi possível obter detalhes do item ${item.id}`);
      }

      // Prepara dados para automação
      const automationData = {
        idCliente: item.id,
        produto: itemDetalhado.produto || itemDetalhado.principalProduto || item.name,
        campos: itemDetalhado.campos || {}
      };

      // Executa a automação
      const resultado = await this.automationService.processAutomation(automationData);
      
      if (resultado.sucesso) {
        logger.info(`Pasta criada automaticamente para produto BOT: ${automationData.produto}`);
        
        // Adiciona observação no Monday.com sobre a criação automática
        await this.mondayClient.adicionarObservacao(
          item.id, 
          `🤖 Pasta criada automaticamente pelo sistema de monitoramento para produto BOT: ${automationData.produto}`
        );
      } else {
        throw new Error(`Falha na automação: ${resultado.erro}`);
      }

    } catch (error) {
      logger.error('Erro no processamento automático', { 
        error: error.message,
        action: 'processNewBotProduct', 
        itemId: item.id, 
        itemName: item.name 
      });
      
      // Adiciona observação de erro no Monday.com
      try {
        await this.mondayClient.adicionarObservacao(
          item.id, 
          `❌ Erro no processamento automático do produto BOT: ${error.message}`
        );
      } catch (obsError) {
        logger.error('Erro ao adicionar observação', { error: obsError.message, action: 'adicionarObservacaoErro' });
      }
      
      throw error;
    }
  }

  /**
   * Obtém o status do monitoramento
   * @returns {Object}
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      processedItemsCount: this.processedItems.size,
      monitoringInterval: this.monitoringInterval,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Limpa o cache de itens processados
   */
  clearProcessedCache() {
    this.processedItems.clear();
    logger.info('Cache de itens processados limpo');
  }

  /**
   * Configura o intervalo de monitoramento
   * @param {number} intervalMs - Intervalo em milissegundos
   */
  setMonitoringInterval(intervalMs) {
    if (intervalMs < 10000) { // Mínimo de 10 segundos
      throw new Error('Intervalo mínimo de monitoramento é 10 segundos');
    }

    this.monitoringInterval = intervalMs;
    
    // Se estiver rodando, reinicia com novo intervalo
    if (this.isRunning) {
      this.stopMonitoring();
      this.startMonitoring();
    }

    logger.info(`Intervalo de monitoramento configurado para ${intervalMs / 1000} segundos`);
  }
}

module.exports = MonitoringService;
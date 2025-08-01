const logger = require('../../logs/logger');
const MondayService = require('./mondayService');
const FileManager = require('../../fileManager/fileManager');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Serviço de automação
 * Contém a lógica de negócio para processamento de automações
 */
class AutomationService {
  constructor() {
    this.mondayService = new MondayService();
    this.fileManager = new FileManager();
    this.automationHistory = new Map(); // Cache em memória para histórico
  }

  /**
   * Processa automação completa
   */
  async processAutomation(data) {
    const { clienteId, produto, responsavel } = data;
    const automationId = this.generateAutomationId();
    
    logger.info('Iniciando processamento de automação', {
      automationId,
      clienteId,
      produto,
      responsavel
    });

    try {
      // Registrar início da automação
      this.registerAutomation(automationId, {
        status: 'iniciando',
        clienteId,
        produto,
        responsavel,
        startTime: new Date(),
        steps: []
      });

      // Passo 1: Consultar informações do cliente no Monday.com
      this.updateAutomationStep(automationId, 'consultando_cliente', 'em_progresso');
      const clienteInfo = await this.mondayService.getClientInfo(clienteId);
      
      if (!clienteInfo) {
        this.updateAutomationStep(automationId, 'consultando_cliente', 'falha', 'Cliente não encontrado');
        throw new AppError(`Cliente com ID ${clienteId} não encontrado`, 404, 'CLIENT_NOT_FOUND');
      }
      
      this.updateAutomationStep(automationId, 'consultando_cliente', 'sucesso', clienteInfo);

      // Passo 2: Determinar responsável
      this.updateAutomationStep(automationId, 'determinando_responsavel', 'em_progresso');
      const responsavelFinal = this.determineResponsible(responsavel, clienteInfo.analista_responsavel);
      this.updateAutomationStep(automationId, 'determinando_responsavel', 'sucesso', { responsavel: responsavelFinal });

      // Passo 3: Criar estrutura de pastas
      this.updateAutomationStep(automationId, 'criando_estrutura', 'em_progresso');
      const estruturaPastas = await this.fileManager.criarEstruturaPastas({
        produto,
        responsavel: responsavelFinal,
        clienteId
      });
      this.updateAutomationStep(automationId, 'criando_estrutura', 'sucesso', estruturaPastas);

      // Passo 4: Processar automação no Monday.com
      this.updateAutomationStep(automationId, 'processando_monday', 'em_progresso');
      const processResult = await this.mondayService.processAutomation({
        clienteId,
        produto,
        responsavel: responsavelFinal,
        estruturaPastas: estruturaPastas.caminho
      });
      this.updateAutomationStep(automationId, 'processando_monday', 'sucesso', processResult);

      // Finalizar automação
      const automation = this.automationHistory.get(automationId);
      automation.status = 'concluida';
      automation.endTime = new Date();
      automation.duration = automation.endTime - automation.startTime;
      automation.result = {
        clienteInfo,
        responsavel: responsavelFinal,
        estruturaPastas,
        processResult
      };

      logger.info('Automação processada com sucesso', {
        automationId,
        duration: automation.duration,
        clienteId
      });

      return {
        automationId,
        status: 'concluida',
        result: automation.result,
        duration: automation.duration
      };

    } catch (error) {
      // Registrar falha
      const automation = this.automationHistory.get(automationId);
      if (automation) {
        automation.status = 'falha';
        automation.endTime = new Date();
        automation.duration = automation.endTime - automation.startTime;
        automation.error = {
          message: error.message,
          code: error.code,
          stack: error.stack
        };
      }

      logger.error('Falha no processamento da automação', {
        automationId,
        error: error.message,
        clienteId
      });

      throw error;
    }
  }

  /**
   * Processa automação disparada por webhook
   */
  async processWebhookAutomation(webhookData) {
    const { itemId, changeType, columnId, newValue } = webhookData;
    
    logger.info('Processando automação via webhook', {
      itemId,
      changeType,
      columnId,
      newValue
    });

    try {
      // Obter dados do item do Monday.com
      const itemData = await this.mondayClient.obterItem(itemId);
      
      if (!itemData) {
        throw new AppError(`Item ${itemId} não encontrado`, 404, 'ITEM_NOT_FOUND');
      }

      // Verificar se é uma mudança que requer automação
      if (this.shouldTriggerAutomation(columnId, newValue)) {
        // Extrair dados necessários do item
        const automationData = this.extractAutomationData(itemData);
        
        // Processar automação
        return await this.processAutomation(automationData);
      }

      logger.info('Webhook não requer automação', {
        itemId,
        columnId,
        newValue
      });

      return {
        processed: true,
        automationTriggered: false,
        reason: 'Mudança não requer automação'
      };

    } catch (error) {
      logger.error('Erro no processamento de automação via webhook', {
        itemId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Processa um item específico do Monday.com
   * @param {Object} itemData - Dados do item
   * @returns {Promise<Object>} Resultado do processamento
   */
  async processSpecificItem(itemData) {
    const { itemId, itemName, source = 'api', timestamp } = itemData;
    const automationId = this.generateAutomationId();
    
    logger.info('Processando item específico', {
      automationId,
      itemId,
      itemName,
      source
    });

    try {
      // Registrar início do processamento
      this.registerAutomation(automationId, {
        status: 'processando_item',
        itemId,
        itemName,
        source,
        startTime: new Date(),
        steps: []
      });

      // Passo 1: Obter dados completos do item
      this.updateAutomationStep(automationId, 'obtendo_dados_item', 'em_progresso');
      const itemCompleto = await this.mondayService.getItemById(itemId);
      
      if (!itemCompleto) {
        this.updateAutomationStep(automationId, 'obtendo_dados_item', 'falha', 'Item não encontrado');
        throw new AppError(`Item com ID ${itemId} não encontrado`, 404, 'ITEM_NOT_FOUND');
      }
      
      this.updateAutomationStep(automationId, 'obtendo_dados_item', 'sucesso', itemCompleto);

      // Passo 2: Verificar se o item precisa ser processado
      this.updateAutomationStep(automationId, 'verificando_processamento', 'em_progresso');
      const needsProcessing = this.shouldProcessItem(itemCompleto);
      
      if (!needsProcessing) {
        this.updateAutomationStep(automationId, 'verificando_processamento', 'ignorado', 'Item não requer processamento');
        
        const automation = this.automationHistory.get(automationId);
        automation.status = 'ignorado';
        automation.endTime = new Date();
        automation.duration = automation.endTime - automation.startTime;
        
        return {
          automationId,
          status: 'ignorado',
          reason: 'Item não requer processamento',
          itemId,
          itemName
        };
      }
      
      this.updateAutomationStep(automationId, 'verificando_processamento', 'sucesso', 'Item requer processamento');

      // Passo 3: Extrair dados para automação
      this.updateAutomationStep(automationId, 'extraindo_dados', 'em_progresso');
      const automationData = this.extractAutomationDataFromItem(itemCompleto);
      this.updateAutomationStep(automationId, 'extraindo_dados', 'sucesso', automationData);

      // Passo 4: Processar automação
      this.updateAutomationStep(automationId, 'executando_automacao', 'em_progresso');
      const processResult = await this.processAutomation(automationData);
      this.updateAutomationStep(automationId, 'executando_automacao', 'sucesso', processResult);

      // Finalizar processamento
      const automation = this.automationHistory.get(automationId);
      automation.status = 'concluida';
      automation.endTime = new Date();
      automation.duration = automation.endTime - automation.startTime;
      automation.result = processResult;

      logger.info('Item processado com sucesso', {
        automationId,
        itemId,
        duration: automation.duration
      });

      return {
        automationId,
        status: 'concluida',
        itemId,
        itemName,
        result: processResult,
        duration: automation.duration
      };

    } catch (error) {
      // Registrar falha
      const automation = this.automationHistory.get(automationId);
      if (automation) {
        automation.status = 'falha';
        automation.endTime = new Date();
        automation.duration = automation.endTime - automation.startTime;
        automation.error = {
          message: error.message,
          code: error.code,
          stack: error.stack
        };
      }

      logger.error('Falha no processamento do item', {
        automationId,
        itemId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Obtém status de uma automação
   * @param {string} automationId - ID da automação
   * @returns {Promise<Object>} Status da automação
   */
  async getStatus(automationId) {
    try {
      const automation = this.automationHistory.get(automationId);
      
      if (!automation) {
        return null;
      }

      return {
        id: automationId,
        status: automation.status,
        progress: automation.progress || 0,
        startTime: automation.startTime,
        endTime: automation.endTime,
        duration: automation.duration,
        steps: automation.steps,
        result: automation.result,
        error: automation.error
      };
    } catch (error) {
      logger.error('Erro ao obter status da automação:', error);
      throw error;
    }
  }

  /**
   * Lista automações com filtros
   * @param {Object} filters - Filtros de busca
   * @returns {Promise<Object>} Lista de automações
   */
  async list(filters = {}) {
    try {
      const { page = 1, limit = 10, status, responsavel } = filters;
      
      let automations = Array.from(this.automationHistory.values());
      
      // Aplicar filtros
      if (status) {
        automations = automations.filter(auto => auto.status === status);
      }
      
      if (responsavel) {
        automations = automations.filter(auto => auto.responsavel === responsavel);
      }
      
      // Ordenar por data (mais recentes primeiro)
      automations.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      
      // Paginação
      const total = automations.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAutomations = automations.slice(startIndex, endIndex);
      
      return {
        automations: paginatedAutomations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar automações:', error);
      throw error;
    }
  }

  /**
   * Cancela uma automação
   * @param {string} automationId - ID da automação
   * @returns {Promise<Object>} Resultado do cancelamento
   */
  async cancel(automationId) {
    try {
      const automation = this.automationHistory.get(automationId);
      
      if (!automation) {
        return null;
      }
      
      if (automation.status === 'concluida' || automation.status === 'falha') {
        throw new AppError('Não é possível cancelar automação já finalizada', 400, 'AUTOMATION_ALREADY_FINISHED');
      }
      
      automation.status = 'cancelada';
      automation.endTime = new Date();
      automation.duration = automation.endTime - automation.startTime;
      
      logger.info('Automação cancelada', { automationId });
      
      return {
        id: automationId,
        status: 'cancelada',
        canceledAt: automation.endTime
      };
    } catch (error) {
      logger.error('Erro ao cancelar automação:', error);
      throw error;
    }
  }

  /**
   * Gera ID único para automação
   */
  generateAutomationId() {
    return `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Registra nova automação
   */
  registerAutomation(id, data) {
    this.automationHistory.set(id, data);
    
    // Limpar histórico antigo (manter apenas últimas 1000 automações)
    if (this.automationHistory.size > 1000) {
      const oldestKey = this.automationHistory.keys().next().value;
      this.automationHistory.delete(oldestKey);
    }
  }

  /**
   * Atualiza passo da automação
   */
  updateAutomationStep(automationId, stepName, status, data = null) {
    const automation = this.automationHistory.get(automationId);
    if (automation) {
      automation.steps.push({
        name: stepName,
        status,
        timestamp: new Date(),
        data
      });
    }
  }

  /**
   * Determina responsável final
   */
  determineResponsible(providedResponsible, mondayResponsible) {
    return providedResponsible || mondayResponsible || 'Não definido';
  }

  /**
   * Verifica se mudança deve disparar automação
   */
  shouldTriggerAutomation(columnId, newValue) {
    // Lógica para determinar se a mudança requer automação
    const triggerColumns = ['produto', 'status', 'responsavel'];
    return triggerColumns.includes(columnId) && newValue;
  }

  /**
   * Extrai dados de automação do item do Monday.com
   */
  extractAutomationData(itemData) {
    return {
      clienteId: itemData.id,
      produto: itemData.name,
      responsavel: itemData.responsavel
    };
  }

  /**
   * Verifica se um item deve ser processado
   * @param {Object} item - Dados do item do Monday.com
   * @returns {boolean} Se o item deve ser processado
   */
  shouldProcessItem(item) {
    try {
      // Verificar se o item tem status "Na Fila"
      const statusColumn = item.column_values?.find(col => col.id === 'status');
      const status = statusColumn?.text || '';
      
      if (status !== 'Na Fila') {
        logger.debug('Item não está "Na Fila"', { itemId: item.id, status });
        return false;
      }

      // Verificar se tem produto principal válido
      const produtoColumn = item.column_values?.find(col => col.id === 'produto_principal');
      const produto = produtoColumn?.text || '';
      
      const produtosValidos = ['Fórmula Certa', 'Phusion'];
      if (!produtosValidos.includes(produto)) {
        logger.debug('Produto principal não é válido', { itemId: item.id, produto });
        return false;
      }

      // Verificar se é do tipo "BOT"
      const tipoColumn = item.column_values?.find(col => col.id === 'tipo');
      const tipo = tipoColumn?.text || '';
      
      if (tipo !== 'BOT') {
        logger.debug('Item não é do tipo BOT', { itemId: item.id, tipo });
        return false;
      }

      logger.info('Item deve ser processado', {
        itemId: item.id,
        status,
        produto,
        tipo
      });

      return true;
    } catch (error) {
      logger.error('Erro ao verificar se item deve ser processado', {
        itemId: item?.id,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Extrai dados de automação de um item específico
   * @param {Object} item - Dados do item do Monday.com
   * @returns {Object} Dados para automação
   */
  extractAutomationDataFromItem(item) {
    try {
      const clienteId = item.id;
      const clienteNome = item.name;
      
      // Extrair produto principal
      const produtoColumn = item.column_values?.find(col => col.id === 'produto_principal');
      const produto = produtoColumn?.text || '';
      
      // Extrair responsável
      const responsavelColumn = item.column_values?.find(col => col.id === 'responsavel');
      const responsavel = responsavelColumn?.text || '';
      
      // Extrair outras informações relevantes
      const observacoesColumn = item.column_values?.find(col => col.id === 'observacoes');
      const observacoes = observacoesColumn?.text || '';
      
      const demandaColumn = item.column_values?.find(col => col.id === 'tipo_demanda');
      const tipoDemanda = demandaColumn?.text || '';

      logger.info('Dados extraídos do item', {
        clienteId,
        clienteNome,
        produto,
        responsavel,
        tipoDemanda
      });

      return {
        clienteId,
        clienteNome,
        produto,
        responsavel,
        observacoes,
        tipoDemanda
      };
    } catch (error) {
      logger.error('Erro ao extrair dados do item', {
        itemId: item?.id,
        error: error.message
      });
      throw new AppError('Erro ao extrair dados do item para automação', 500, 'DATA_EXTRACTION_ERROR');
    }
  }
}

module.exports = AutomationService;
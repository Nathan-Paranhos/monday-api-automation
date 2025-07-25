const { logger } = require('../../logs/logger');
const MondayClient = require('../../monday/mondayClient');
const FileManager = require('../../fileManager/fileManager');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Serviço de automação
 * Contém a lógica de negócio para processamento de automações
 */
class AutomationService {
  constructor() {
    this.mondayClient = new MondayClient();
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

      // Passo 1: Consultar produto no Monday.com
      this.updateAutomationStep(automationId, 'consultando_produto', 'em_progresso');
      const produtoInfo = await this.mondayClient.consultarProduto(clienteId);
      
      if (!produtoInfo) {
        this.updateAutomationStep(automationId, 'consultando_produto', 'falha', 'Produto não encontrado');
        throw new AppError(`Produto com ID ${clienteId} não encontrado`, 404, 'PRODUCT_NOT_FOUND');
      }
      
      this.updateAutomationStep(automationId, 'consultando_produto', 'sucesso', produtoInfo);

      // Passo 2: Determinar responsável
      this.updateAutomationStep(automationId, 'determinando_responsavel', 'em_progresso');
      const responsavelFinal = this.determineResponsible(responsavel, produtoInfo.responsavel);
      this.updateAutomationStep(automationId, 'determinando_responsavel', 'sucesso', { responsavel: responsavelFinal });

      // Passo 3: Criar estrutura de pastas
      this.updateAutomationStep(automationId, 'criando_estrutura', 'em_progresso');
      const estruturaPastas = await this.fileManager.criarEstruturaPastas({
        produto,
        responsavel: responsavelFinal,
        clienteId
      });
      this.updateAutomationStep(automationId, 'criando_estrutura', 'sucesso', estruturaPastas);

      // Passo 4: Atualizar Monday.com
      this.updateAutomationStep(automationId, 'atualizando_monday', 'em_progresso');
      const updateResult = await this.mondayClient.atualizarItem(produtoInfo.id, {
        status: 'Em Processamento',
        responsavel: responsavelFinal,
        estruturaPastas: estruturaPastas.caminho
      });
      this.updateAutomationStep(automationId, 'atualizando_monday', 'sucesso', updateResult);

      // Finalizar automação
      const automation = this.automationHistory.get(automationId);
      automation.status = 'concluida';
      automation.endTime = new Date();
      automation.duration = automation.endTime - automation.startTime;
      automation.result = {
        produtoInfo,
        responsavel: responsavelFinal,
        estruturaPastas,
        updateResult
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
   * Obtém status de uma automação
   */
  async getStatus(automationId) {
    const automation = this.automationHistory.get(automationId);
    
    if (!automation) {
      return null;
    }

    return {
      id: automationId,
      status: automation.status,
      startTime: automation.startTime,
      endTime: automation.endTime,
      duration: automation.duration,
      steps: automation.steps,
      result: automation.result,
      error: automation.error
    };
  }

  /**
   * Lista automações com filtros
   */
  async list(filters = {}) {
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
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Cancela uma automação
   */
  async cancel(automationId) {
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
}

module.exports = AutomationService;
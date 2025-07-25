const { logger } = require('../../logs/logger');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Serviço de webhooks
 * Gerencia processamento e histórico de webhooks
 */
class WebhookService {
  constructor() {
    this.webhookHistory = new Map(); // Histórico de webhooks em memória
    this.processingQueue = []; // Fila de processamento
    this.stats = {
      total: 0,
      success: 0,
      errors: 0,
      bySource: {},
      byDay: {}
    };
  }

  /**
   * Processa webhook do Monday.com
   */
  async processWebhook(webhookData) {
    const webhookId = this.generateWebhookId();
    const startTime = Date.now();
    
    logger.info('Processando webhook do Monday.com', {
      webhookId,
      event: webhookData.event,
      timestamp: new Date().toISOString()
    });

    try {
      // Registrar webhook no histórico
      this.registerWebhook(webhookId, {
        source: 'monday',
        data: webhookData,
        status: 'processando',
        receivedAt: new Date(),
        processingStarted: new Date()
      });

      // Validar estrutura do webhook
      this.validateMondayWebhook(webhookData);

      // Processar evento específico
      const processedData = await this.processMondayEvent(webhookData);

      // Atualizar histórico com sucesso
      const webhook = this.webhookHistory.get(webhookId);
      webhook.status = 'sucesso';
      webhook.processedAt = new Date();
      webhook.processingTime = Date.now() - startTime;
      webhook.result = processedData;

      // Atualizar estatísticas
      this.updateStats('monday', 'success');

      logger.info('Webhook processado com sucesso', {
        webhookId,
        processingTime: webhook.processingTime,
        event: webhookData.event
      });

      return processedData;

    } catch (error) {
      // Registrar erro no histórico
      const webhook = this.webhookHistory.get(webhookId);
      if (webhook) {
        webhook.status = 'erro';
        webhook.processedAt = new Date();
        webhook.processingTime = Date.now() - startTime;
        webhook.error = {
          message: error.message,
          code: error.code,
          stack: error.stack
        };
      }

      // Atualizar estatísticas
      this.updateStats('monday', 'error');

      logger.error('Erro ao processar webhook', {
        webhookId,
        error: error.message,
        event: webhookData.event
      });

      throw error;
    }
  }

  /**
   * Processa webhook genérico
   */
  async processGenericWebhook(webhookData, source = 'unknown') {
    const webhookId = this.generateWebhookId();
    const startTime = Date.now();
    
    logger.info('Processando webhook genérico', {
      webhookId,
      source,
      dataKeys: Object.keys(webhookData)
    });

    try {
      // Registrar webhook
      this.registerWebhook(webhookId, {
        source,
        data: webhookData,
        status: 'processando',
        receivedAt: new Date(),
        processingStarted: new Date()
      });

      // Processar baseado na fonte
      const processedData = await this.processGenericEvent(webhookData, source);

      // Atualizar histórico
      const webhook = this.webhookHistory.get(webhookId);
      webhook.status = 'sucesso';
      webhook.processedAt = new Date();
      webhook.processingTime = Date.now() - startTime;
      webhook.result = processedData;

      this.updateStats(source, 'success');

      return processedData;

    } catch (error) {
      const webhook = this.webhookHistory.get(webhookId);
      if (webhook) {
        webhook.status = 'erro';
        webhook.processedAt = new Date();
        webhook.processingTime = Date.now() - startTime;
        webhook.error = {
          message: error.message,
          code: error.code
        };
      }

      this.updateStats(source, 'error');
      throw error;
    }
  }

  /**
   * Obtém histórico de webhooks
   */
  async getHistory(filters = {}) {
    const { page = 1, limit = 20, source, status, startDate, endDate } = filters;
    
    let webhooks = Array.from(this.webhookHistory.values());
    
    // Aplicar filtros
    if (source) {
      webhooks = webhooks.filter(webhook => webhook.source === source);
    }
    
    if (status) {
      webhooks = webhooks.filter(webhook => webhook.status === status);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      webhooks = webhooks.filter(webhook => webhook.receivedAt >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      webhooks = webhooks.filter(webhook => webhook.receivedAt <= end);
    }
    
    // Ordenar por data (mais recentes primeiro)
    webhooks.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
    
    // Paginação
    const total = webhooks.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedWebhooks = webhooks.slice(startIndex, endIndex);
    
    return {
      webhooks: paginatedWebhooks.map(webhook => this.sanitizeWebhookForResponse(webhook)),
      total,
      page,
      limit
    };
  }

  /**
   * Obtém estatísticas de webhooks
   */
  async getStats(period = '7d') {
    const now = new Date();
    const periodMs = this.parsePeriod(period);
    const startDate = new Date(now.getTime() - periodMs);
    
    // Filtrar webhooks do período
    const periodWebhooks = Array.from(this.webhookHistory.values())
      .filter(webhook => webhook.receivedAt >= startDate);
    
    // Calcular estatísticas
    const stats = {
      period,
      startDate,
      endDate: now,
      total: periodWebhooks.length,
      success: periodWebhooks.filter(w => w.status === 'sucesso').length,
      errors: periodWebhooks.filter(w => w.status === 'erro').length,
      processing: periodWebhooks.filter(w => w.status === 'processando').length,
      bySource: {},
      byDay: {},
      averageProcessingTime: 0,
      errorRate: 0
    };
    
    // Estatísticas por fonte
    periodWebhooks.forEach(webhook => {
      if (!stats.bySource[webhook.source]) {
        stats.bySource[webhook.source] = { total: 0, success: 0, errors: 0 };
      }
      stats.bySource[webhook.source].total++;
      if (webhook.status === 'sucesso') stats.bySource[webhook.source].success++;
      if (webhook.status === 'erro') stats.bySource[webhook.source].errors++;
    });
    
    // Estatísticas por dia
    periodWebhooks.forEach(webhook => {
      const day = webhook.receivedAt.toISOString().split('T')[0];
      if (!stats.byDay[day]) {
        stats.byDay[day] = { total: 0, success: 0, errors: 0 };
      }
      stats.byDay[day].total++;
      if (webhook.status === 'sucesso') stats.byDay[day].success++;
      if (webhook.status === 'erro') stats.byDay[day].errors++;
    });
    
    // Tempo médio de processamento
    const processedWebhooks = periodWebhooks.filter(w => w.processingTime);
    if (processedWebhooks.length > 0) {
      stats.averageProcessingTime = processedWebhooks
        .reduce((sum, w) => sum + w.processingTime, 0) / processedWebhooks.length;
    }
    
    // Taxa de erro
    if (stats.total > 0) {
      stats.errorRate = (stats.errors / stats.total) * 100;
    }
    
    return stats;
  }

  /**
   * Reprocessa webhook por ID
   */
  async reprocessWebhook(webhookId) {
    const webhook = this.webhookHistory.get(webhookId);
    
    if (!webhook) {
      return null;
    }
    
    logger.info('Reprocessando webhook', { webhookId, originalSource: webhook.source });
    
    try {
      // Reprocessar baseado na fonte original
      if (webhook.source === 'monday') {
        return await this.processWebhook(webhook.data);
      } else {
        return await this.processGenericWebhook(webhook.data, webhook.source);
      }
    } catch (error) {
      logger.error('Erro ao reprocessar webhook', {
        webhookId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Testa webhook (para desenvolvimento)
   */
  async testWebhook(testData) {
    logger.info('Executando teste de webhook', { testData });
    
    const testResult = {
      valid: true,
      errors: [],
      warnings: [],
      processedData: null
    };
    
    try {
      // Simular processamento
      if (testData.event) {
        // Teste como webhook do Monday.com
        testResult.processedData = await this.processMondayEvent(testData);
      } else {
        // Teste como webhook genérico
        testResult.processedData = await this.processGenericEvent(testData, 'test');
      }
    } catch (error) {
      testResult.valid = false;
      testResult.errors.push(error.message);
    }
    
    return testResult;
  }

  /**
   * Valida webhook do Monday.com
   */
  validateMondayWebhook(webhookData) {
    if (!webhookData.event) {
      throw new AppError('Webhook inválido: evento não encontrado', 400, 'INVALID_WEBHOOK');
    }
    
    const requiredFields = ['event'];
    const missingFields = requiredFields.filter(field => !webhookData[field]);
    
    if (missingFields.length > 0) {
      throw new AppError(
        `Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
        400,
        'MISSING_WEBHOOK_FIELDS'
      );
    }
  }

  /**
   * Processa evento específico do Monday.com
   */
  async processMondayEvent(webhookData) {
    const { event } = webhookData;
    
    switch (event.type) {
      case 'change_column_value':
        return this.processColumnChange(event);
      case 'create_item':
        return this.processItemCreation(event);
      case 'update_item':
        return this.processItemUpdate(event);
      default:
        logger.warn('Tipo de evento não reconhecido', { eventType: event.type });
        return {
          processed: true,
          requiresAutomation: false,
          reason: 'Tipo de evento não requer processamento'
        };
    }
  }

  /**
   * Processa mudança de coluna
   */
  processColumnChange(event) {
    const { itemId, columnId, value } = event;
    
    // Verificar se é uma coluna que requer automação
    const automationColumns = ['produto', 'status', 'responsavel'];
    const requiresAutomation = automationColumns.includes(columnId);
    
    return {
      processed: true,
      requiresAutomation,
      itemId,
      changeType: 'column_change',
      columnId,
      newValue: value,
      timestamp: new Date()
    };
  }

  /**
   * Processa criação de item
   */
  processItemCreation(event) {
    return {
      processed: true,
      requiresAutomation: true,
      itemId: event.itemId,
      changeType: 'item_created',
      timestamp: new Date()
    };
  }

  /**
   * Processa atualização de item
   */
  processItemUpdate(event) {
    return {
      processed: true,
      requiresAutomation: false,
      itemId: event.itemId,
      changeType: 'item_updated',
      timestamp: new Date()
    };
  }

  /**
   * Processa evento genérico
   */
  async processGenericEvent(webhookData, source) {
    logger.info('Processando evento genérico', { source, dataKeys: Object.keys(webhookData) });
    
    return {
      processed: true,
      source,
      dataReceived: Object.keys(webhookData),
      timestamp: new Date()
    };
  }

  /**
   * Gera ID único para webhook
   */
  generateWebhookId() {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Registra webhook no histórico
   */
  registerWebhook(id, data) {
    this.webhookHistory.set(id, { id, ...data });
    
    // Limitar histórico (manter últimos 5000 webhooks)
    if (this.webhookHistory.size > 5000) {
      const oldestKey = this.webhookHistory.keys().next().value;
      this.webhookHistory.delete(oldestKey);
    }
  }

  /**
   * Atualiza estatísticas
   */
  updateStats(source, result) {
    this.stats.total++;
    
    if (result === 'success') {
      this.stats.success++;
    } else if (result === 'error') {
      this.stats.errors++;
    }
    
    if (!this.stats.bySource[source]) {
      this.stats.bySource[source] = { total: 0, success: 0, errors: 0 };
    }
    
    this.stats.bySource[source].total++;
    if (result === 'success') this.stats.bySource[source].success++;
    if (result === 'error') this.stats.bySource[source].errors++;
    
    // Estatísticas por dia
    const today = new Date().toISOString().split('T')[0];
    if (!this.stats.byDay[today]) {
      this.stats.byDay[today] = { total: 0, success: 0, errors: 0 };
    }
    
    this.stats.byDay[today].total++;
    if (result === 'success') this.stats.byDay[today].success++;
    if (result === 'error') this.stats.byDay[today].errors++;
  }

  /**
   * Sanitiza webhook para resposta
   */
  sanitizeWebhookForResponse(webhook) {
    return {
      id: webhook.id,
      source: webhook.source,
      status: webhook.status,
      receivedAt: webhook.receivedAt,
      processedAt: webhook.processedAt,
      processingTime: webhook.processingTime,
      error: webhook.error ? {
        message: webhook.error.message,
        code: webhook.error.code
      } : null,
      result: webhook.result
    };
  }

  /**
   * Converte período em milissegundos
   */
  parsePeriod(period) {
    const periodMap = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    return periodMap[period] || periodMap['7d'];
  }
}

module.exports = WebhookService;
/**
 * Serviço de Monitoramento Bot - Monday.com API
 * Sistema de monitoramento contínuo 24h que detecta apenas novos itens
 * 
 * @author Nathan Silva - Fagron Tech
 * @version 2.0.0
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const { logger } = require('../../logs/logger');
const MondayClient = require('../../monday/mondayClient');
const config = require('../../config/config');

class MonitorBotService {
  constructor() {
    // Cache para armazenar IDs de itens já processados (TTL: 24 horas)
    this.processedItemsCache = new NodeCache({ 
      stdTTL: 86400, // 24 horas
      checkperiod: 3600, // Verificar expiração a cada hora
      useClones: false
    });
    
    // Cache para último timestamp de verificação
    this.lastCheckCache = new NodeCache({ stdTTL: 0 }); // Sem expiração
    
    this.mondayClient = null;
    this.isRunning = false;
    this.intervalId = null;
    this.startTime = null;
    this.checkInterval = 30000; // 30 segundos
    this.apiBaseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://monday-api-automation.onrender.com'
      : 'http://localhost:10000';
    
    // Configurações de monitoramento
    this.config = {
      boardId: config.monday.boardId,
      statusColumn: 'status',
      targetStatus: 'Na Fila',
      mainProductColumn: 'produto_principal',
      validProducts: ['Fórmula Certa', 'Phusion'],
      maxRetries: 3,
      retryDelay: 5000
    };
  }

  /**
   * Inicializa o serviço de monitoramento
   */
  async iniciar() {
    try {
      logger.info('🤖 Iniciando MonitorBotService v2.0...');
      
      // Inicializar cliente Monday.com
      this.mondayClient = new MondayClient();
      
      // Testar conexão
      const conexaoOk = await this.testarConexaoAPI();
      if (!conexaoOk) {
        throw new Error('Falha na conexão com Monday.com API');
      }
      
      // Carregar itens já processados (para evitar reprocessamento)
      await this.carregarItensProcessados();
      
      // Iniciar monitoramento contínuo
      this.isRunning = true;
      this.startTime = Date.now();
      this.iniciarMonitoramentoContinuo();
      
      logger.info('✅ MonitorBotService iniciado com sucesso');
      logger.info(`📊 Configurações: Intervalo=${this.checkInterval}ms, Board=${this.config.boardId}`);
      
    } catch (error) {
      logger.error('❌ Erro ao iniciar MonitorBotService:', error);
      throw error;
    }
  }

  /**
   * Para o serviço de monitoramento
   */
  async parar() {
    try {
      logger.info('🛑 Parando MonitorBotService...');
      
      this.isRunning = false;
      
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      
      // Salvar estado atual
      await this.salvarEstado();
      
      logger.info('✅ MonitorBotService parado com sucesso');
      
    } catch (error) {
      logger.error('❌ Erro ao parar MonitorBotService:', error);
    }
  }

  /**
   * Testa a conexão com a API do Monday.com
   */
  async testarConexaoAPI() {
    try {
      const resultado = await this.mondayClient.testarConexao();
      if (resultado.sucesso) {
        logger.info(`✅ Conexão Monday.com OK - Usuário: ${resultado.usuario}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('❌ Erro na conexão Monday.com:', error.message);
      return false;
    }
  }

  /**
   * Inicia o monitoramento contínuo
   */
  iniciarMonitoramentoContinuo() {
    logger.info('🔄 Iniciando monitoramento contínuo 24h...');
    
    // Primeira verificação imediata
    this.verificarNovosItens();
    
    // Configurar verificações periódicas
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.verificarNovosItens();
      }
    }, this.checkInterval);
  }

  /**
   * Verifica se existem novos itens para processar
   */
  async verificarNovosItens() {
    try {
      const agora = new Date();
      const ultimaVerificacao = this.lastCheckCache.get('lastCheck') || new Date(0);
      
      logger.info(`🔍 Verificando novos itens... (Última verificação: ${ultimaVerificacao.toISOString()})`);
      
      // Buscar itens "Na Fila" do Monday.com
      const itensNaFila = await this.buscarItensNaFila();
      
      if (!itensNaFila || itensNaFila.length === 0) {
        logger.info('ℹ️ Nenhum item "Na Fila" encontrado');
        this.lastCheckCache.set('lastCheck', agora);
        return;
      }
      
      // Filtrar apenas itens novos (não processados)
      const itensNovos = this.filtrarItensNovos(itensNaFila);
      
      if (itensNovos.length === 0) {
        logger.info('ℹ️ Nenhum item novo encontrado');
        this.lastCheckCache.set('lastCheck', agora);
        return;
      }
      
      logger.info(`🆕 Encontrados ${itensNovos.length} novos itens para processar`);
      
      // Processar cada item novo
      for (const item of itensNovos) {
        await this.processarItemNovo(item);
      }
      
      this.lastCheckCache.set('lastCheck', agora);
      
    } catch (error) {
      logger.error('❌ Erro ao verificar novos itens:', error);
    }
  }

  /**
   * Busca itens com status "Na Fila" do Monday.com
   */
  async buscarItensNaFila() {
    try {
      const query = `
        query {
          boards(ids: [${this.config.boardId}]) {
            items_page(limit: 100) {
              items {
                id
                name
                created_at
                updated_at
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;
      
      const response = await this.mondayClient.executarQuery(query);
      
      if (!response.boards || response.boards.length === 0) {
        return [];
      }
      
      const items = response.boards[0].items_page.items;
      
      // Filtrar apenas itens "Na Fila" com produtos válidos
      const itensNaFila = items.filter(item => {
        const statusColumn = item.column_values.find(col => col.id === this.config.statusColumn);
        const produtoColumn = item.column_values.find(col => col.id === this.config.mainProductColumn);
        
        const isNaFila = statusColumn && statusColumn.text === this.config.targetStatus;
        const isProdutoValido = produtoColumn && this.config.validProducts.includes(produtoColumn.text);
        
        return isNaFila && isProdutoValido;
      });
      
      logger.info(`📋 Encontrados ${itensNaFila.length} itens "Na Fila" com produtos válidos`);
      return itensNaFila;
      
    } catch (error) {
      logger.error('❌ Erro ao buscar itens Na Fila:', error);
      return [];
    }
  }

  /**
   * Filtra apenas itens que não foram processados anteriormente
   */
  filtrarItensNovos(items) {
    const itensNovos = items.filter(item => {
      const jaProcessado = this.processedItemsCache.has(item.id);
      return !jaProcessado;
    });
    
    logger.info(`🔍 Filtrados ${itensNovos.length} itens novos de ${items.length} total`);
    return itensNovos;
  }

  /**
   * Processa um item novo via API REST
   */
  async processarItemNovo(item) {
    let tentativas = 0;
    
    while (tentativas < this.config.maxRetries) {
      try {
        logger.info(`🔄 Processando item ${item.id} (${item.name}) - Tentativa ${tentativas + 1}`);
        
        // Chamar endpoint de processamento via API REST
        const response = await axios.post(
          `${this.apiBaseUrl}/api/automation/process-item`,
          {
            itemId: item.id,
            itemName: item.name,
            source: 'monitor-bot',
            timestamp: new Date().toISOString()
          },
          {
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'MonitorBot/2.0'
            }
          }
        );
        
        if (response.status === 200 && response.data.sucesso) {
          // Marcar como processado
          this.processedItemsCache.set(item.id, {
            processedAt: new Date().toISOString(),
            itemName: item.name,
            status: 'success'
          });
          
          logger.info(`✅ Item ${item.id} processado com sucesso`);
          break;
          
        } else {
          throw new Error(`Resposta inválida da API: ${response.status}`);
        }
        
      } catch (error) {
        tentativas++;
        logger.error(`❌ Erro ao processar item ${item.id} (tentativa ${tentativas}):`, error.message);
        
        if (tentativas >= this.config.maxRetries) {
          // Marcar como erro após esgotar tentativas
          this.processedItemsCache.set(item.id, {
            processedAt: new Date().toISOString(),
            itemName: item.name,
            status: 'error',
            error: error.message
          });
          
          logger.error(`💥 Item ${item.id} falhou após ${this.config.maxRetries} tentativas`);
        } else {
          // Aguardar antes da próxima tentativa
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }
  }

  /**
   * Carrega itens já processados do cache persistente
   */
  async carregarItensProcessados() {
    try {
      // Em produção, isso poderia vir de um banco de dados
      // Por enquanto, usar apenas cache em memória
      logger.info('📥 Cache de itens processados inicializado');
    } catch (error) {
      logger.error('❌ Erro ao carregar itens processados:', error);
    }
  }

  /**
   * Salva o estado atual do monitoramento
   */
  async salvarEstado() {
    try {
      const stats = {
        totalProcessados: this.processedItemsCache.keys().length,
        ultimaVerificacao: this.lastCheckCache.get('lastCheck'),
        isRunning: this.isRunning
      };
      
      logger.info('💾 Estado do monitoramento salvo:', stats);
    } catch (error) {
      logger.error('❌ Erro ao salvar estado:', error);
    }
  }

  /**
   * Retorna estatísticas do monitoramento
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      totalProcessados: this.processedItemsCache.keys().length,
      ultimaVerificacao: this.lastCheckCache.get('lastCheck'),
      intervalo: this.checkInterval,
      configuracao: this.config
    };
  }

  /**
   * Retorna status detalhado do monitoramento para API
   */
  getMonitorStatus() {
    const ultimaVerificacao = this.lastCheckCache.get('lastCheck');
    const itensProcessados = this.processedItemsCache.keys();
    
    // Calcular estatísticas dos itens processados
    const itensComSucesso = itensProcessados.filter(id => {
      const item = this.processedItemsCache.get(id);
      return item && item.status === 'success';
    }).length;
    
    const itensComErro = itensProcessados.filter(id => {
      const item = this.processedItemsCache.get(id);
      return item && item.status === 'error';
    }).length;
    
    return {
      status: this.isRunning ? 'running' : 'stopped',
      uptime: this.isRunning ? Date.now() - (this.startTime || Date.now()) : 0,
      monitoring: {
        isActive: this.isRunning,
        interval: this.checkInterval,
        lastCheck: ultimaVerificacao,
        nextCheck: ultimaVerificacao ? new Date(ultimaVerificacao.getTime() + this.checkInterval) : null
      },
      statistics: {
        totalProcessed: itensProcessados.length,
        successful: itensComSucesso,
        failed: itensComErro,
        successRate: itensProcessados.length > 0 ? ((itensComSucesso / itensProcessados.length) * 100).toFixed(2) : 0
      },
      configuration: {
        boardId: this.config.boardId,
        targetStatus: this.config.targetStatus,
        validProducts: this.config.validProducts,
        apiBaseUrl: this.apiBaseUrl,
        maxRetries: this.config.maxRetries
      },
      cache: {
        processedItems: itensProcessados.length,
        cacheStats: this.processedItemsCache.getStats()
      },
      version: '2.0.0',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = MonitorBotService;
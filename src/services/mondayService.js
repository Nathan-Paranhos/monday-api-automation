const { logger } = require('../../logs/logger');
const MondayClient = require('../../monday/mondayClient');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Serviço do Monday.com
 * Centraliza todas as operações relacionadas à API do Monday.com
 */
class MondayService {
  constructor() {
    this.mondayClient = new MondayClient();
    this.cache = new Map(); // Cache simples para consultas frequentes
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Testa conexão com Monday.com
   */
  async testarConexao() {
    try {
      logger.info('Testando conexão com Monday.com');
      
      const result = await this.mondayClient.testarConexao();
      
      logger.info('Conexão com Monday.com estabelecida com sucesso', {
        usuario: result.usuario,
        workspace: result.workspace
      });
      
      return result;
    } catch (error) {
      logger.error('Falha na conexão com Monday.com', {
        error: error.message,
        stack: error.stack
      });
      throw new AppError('Falha na conexão com Monday.com', 502, 'MONDAY_CONNECTION_ERROR');
    }
  }

  /**
   * Consulta produto por ID do cliente
   */
  async consultarProduto(clienteId) {
    const cacheKey = `produto_${clienteId}`;
    
    // Verificar cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.info('Produto obtido do cache', { clienteId });
      return cached;
    }

    try {
      logger.info('Consultando produto no Monday.com', { clienteId });
      
      const produto = await this.mondayClient.consultarProduto(clienteId);
      
      if (produto) {
        // Normalizar dados do produto
        const normalizedProduct = this.normalizeProductData(produto);
        
        // Armazenar no cache
        this.setCache(cacheKey, normalizedProduct);
        
        logger.info('Produto encontrado e normalizado', {
          clienteId,
          produtoId: normalizedProduct.id,
          nome: normalizedProduct.nome
        });
        
        return normalizedProduct;
      }
      
      logger.warn('Produto não encontrado', { clienteId });
      return null;
      
    } catch (error) {
      logger.error('Erro ao consultar produto', {
        clienteId,
        error: error.message
      });
      throw new AppError('Erro ao consultar produto no Monday.com', 500, 'PRODUCT_QUERY_ERROR');
    }
  }

  /**
   * Busca farmácias BOT
   */
  async buscarFarmaciasBOT(filters = {}) {
    const { status, produto, limit = 50 } = filters;
    
    try {
      logger.info('Buscando farmácias BOT', { filters });
      
      const farmacias = await this.mondayClient.buscarFarmaciasBOT({
        status,
        produto,
        limit
      });
      
      // Normalizar dados das farmácias
      const normalizedFarmacias = farmacias.map(farmacia => this.normalizePharmacyData(farmacia));
      
      logger.info('Farmácias BOT encontradas', {
        total: normalizedFarmacias.length,
        filters
      });
      
      return normalizedFarmacias;
      
    } catch (error) {
      logger.error('Erro ao buscar farmácias BOT', {
        filters,
        error: error.message
      });
      throw new AppError('Erro ao buscar farmácias BOT', 500, 'PHARMACIES_QUERY_ERROR');
    }
  }

  /**
   * Atualiza item no Monday.com
   */
  async atualizarItem(itemId, updateData) {
    try {
      logger.info('Atualizando item no Monday.com', {
        itemId,
        updateData
      });
      
      // Preparar dados para atualização
      const preparedData = this.prepareUpdateData(updateData);
      
      const result = await this.mondayClient.atualizarItem(itemId, preparedData);
      
      // Invalidar cache relacionado
      this.invalidateRelatedCache(itemId);
      
      logger.info('Item atualizado com sucesso', {
        itemId,
        result
      });
      
      return result;
      
    } catch (error) {
      logger.error('Erro ao atualizar item', {
        itemId,
        updateData,
        error: error.message
      });
      throw new AppError('Erro ao atualizar item no Monday.com', 500, 'ITEM_UPDATE_ERROR');
    }
  }

  /**
   * Lista itens do board
   */
  async listarItens(filters = {}) {
    const { page = 1, limit = 25, status, responsavel } = filters;
    
    try {
      logger.info('Listando itens do Monday.com', { filters });
      
      const items = await this.mondayClient.listarItens({
        page,
        limit,
        status,
        responsavel
      });
      
      // Normalizar dados dos itens
      const normalizedItems = items.items.map(item => this.normalizeItemData(item));
      
      logger.info('Itens listados com sucesso', {
        total: items.total,
        page,
        limit
      });
      
      return {
        items: normalizedItems,
        total: items.total,
        page,
        limit
      };
      
    } catch (error) {
      logger.error('Erro ao listar itens', {
        filters,
        error: error.message
      });
      throw new AppError('Erro ao listar itens do Monday.com', 500, 'ITEMS_LIST_ERROR');
    }
  }

  /**
   * Cria novo item no Monday.com
   */
  async criarItem(itemData) {
    try {
      logger.info('Criando novo item no Monday.com', { itemData });
      
      // Validar dados do item
      this.validateItemData(itemData);
      
      // Preparar dados para criação
      const preparedData = this.prepareCreateData(itemData);
      
      const newItem = await this.mondayClient.criarItem(preparedData);
      
      // Normalizar dados do novo item
      const normalizedItem = this.normalizeItemData(newItem);
      
      logger.info('Item criado com sucesso', {
        itemId: normalizedItem.id,
        nome: normalizedItem.nome
      });
      
      return normalizedItem;
      
    } catch (error) {
      logger.error('Erro ao criar item', {
        itemData,
        error: error.message
      });
      throw new AppError('Erro ao criar item no Monday.com', 500, 'ITEM_CREATE_ERROR');
    }
  }

  /**
   * Obtém item específico por ID
   */
  async obterItem(itemId) {
    const cacheKey = `item_${itemId}`;
    
    // Verificar cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.info('Item obtido do cache', { itemId });
      return cached;
    }

    try {
      logger.info('Obtendo item do Monday.com', { itemId });
      
      const item = await this.mondayClient.obterItem(itemId);
      
      if (item) {
        const normalizedItem = this.normalizeItemData(item);
        this.setCache(cacheKey, normalizedItem);
        return normalizedItem;
      }
      
      return null;
      
    } catch (error) {
      logger.error('Erro ao obter item', {
        itemId,
        error: error.message
      });
      throw new AppError('Erro ao obter item do Monday.com', 500, 'ITEM_GET_ERROR');
    }
  }

  /**
   * Obtém estatísticas do board
   */
  async obterEstatisticas() {
    const cacheKey = 'board_stats';
    
    // Verificar cache (estatísticas podem ser cacheadas por mais tempo)
    const cached = this.getFromCache(cacheKey, 10 * 60 * 1000); // 10 minutos
    if (cached) {
      logger.info('Estatísticas obtidas do cache');
      return cached;
    }

    try {
      logger.info('Obtendo estatísticas do Monday.com');
      
      const stats = await this.mondayClient.obterEstatisticas();
      
      // Processar e enriquecer estatísticas
      const processedStats = this.processStatistics(stats);
      
      this.setCache(cacheKey, processedStats, 10 * 60 * 1000);
      
      logger.info('Estatísticas obtidas com sucesso', {
        totalItens: processedStats.totalItens,
        statusDistribution: processedStats.statusDistribution
      });
      
      return processedStats;
      
    } catch (error) {
      logger.error('Erro ao obter estatísticas', {
        error: error.message
      });
      throw new AppError('Erro ao obter estatísticas do Monday.com', 500, 'STATS_ERROR');
    }
  }

  /**
   * Normaliza dados do produto
   */
  normalizeProductData(produto) {
    return {
      id: produto.id,
      nome: produto.name || produto.nome,
      clienteId: produto.clienteId || produto.cliente_id,
      status: this.normalizeStatus(produto.status),
      responsavel: produto.responsavel || produto.responsible || 'Não definido',
      dataCriacao: produto.created_at || produto.dataCriacao,
      ultimaAtualizacao: produto.updated_at || produto.ultimaAtualizacao || new Date(),
      colunas: produto.column_values || produto.colunas || []
    };
  }

  /**
   * Normaliza dados da farmácia
   */
  normalizePharmacyData(farmacia) {
    return {
      id: farmacia.id,
      nome: farmacia.name || farmacia.nome,
      status: this.normalizeStatus(farmacia.status),
      produto: farmacia.produto,
      responsavel: farmacia.responsavel || 'Não definido',
      ultimaAtualizacao: farmacia.updated_at || new Date()
    };
  }

  /**
   * Normaliza dados do item
   */
  normalizeItemData(item) {
    return {
      id: item.id,
      nome: item.name || item.nome,
      status: this.normalizeStatus(item.status),
      responsavel: item.responsavel || 'Não definido',
      dataCriacao: item.created_at || item.dataCriacao,
      ultimaAtualizacao: item.updated_at || new Date(),
      colunas: item.column_values || []
    };
  }

  /**
   * Normaliza status
   */
  normalizeStatus(status) {
    if (!status) return 'Não definido';
    
    const statusMap = {
      'working_on_it': 'Em Andamento',
      'done': 'Concluído',
      'stuck': 'Bloqueado',
      'pending': 'Pendente'
    };
    
    return statusMap[status] || status;
  }

  /**
   * Prepara dados para atualização
   */
  prepareUpdateData(updateData) {
    // Converter dados para formato esperado pela API do Monday.com
    const prepared = {};
    
    if (updateData.status) {
      prepared.status = this.reverseNormalizeStatus(updateData.status);
    }
    
    if (updateData.responsavel) {
      prepared.responsavel = updateData.responsavel;
    }
    
    if (updateData.estruturaPastas) {
      prepared.estrutura_pastas = updateData.estruturaPastas;
    }
    
    return prepared;
  }

  /**
   * Prepara dados para criação
   */
  prepareCreateData(itemData) {
    return {
      name: itemData.nome || itemData.name,
      column_values: itemData.colunas || itemData.column_values || {}
    };
  }

  /**
   * Valida dados do item
   */
  validateItemData(itemData) {
    if (!itemData.nome && !itemData.name) {
      throw new AppError('Nome do item é obrigatório', 400, 'MISSING_ITEM_NAME');
    }
  }

  /**
   * Processa estatísticas
   */
  processStatistics(stats) {
    return {
      totalItens: stats.totalItens || 0,
      statusDistribution: stats.statusDistribution || {},
      responsaveisDistribution: stats.responsaveisDistribution || {},
      ultimaAtualizacao: new Date(),
      tendencias: this.calculateTrends(stats)
    };
  }

  /**
   * Calcula tendências
   */
  calculateTrends(stats) {
    // Implementar lógica de cálculo de tendências
    return {
      crescimento: 0,
      produtividade: 0,
      eficiencia: 0
    };
  }

  /**
   * Reverte normalização de status
   */
  reverseNormalizeStatus(normalizedStatus) {
    const reverseMap = {
      'Em Andamento': 'working_on_it',
      'Concluído': 'done',
      'Bloqueado': 'stuck',
      'Pendente': 'pending'
    };
    
    return reverseMap[normalizedStatus] || normalizedStatus;
  }

  /**
   * Obtém item do cache
   */
  getFromCache(key, customTimeout = null) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const timeout = customTimeout || this.cacheTimeout;
    if (Date.now() - cached.timestamp > timeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Define item no cache
   */
  setCache(key, data, customTimeout = null) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limpar cache antigo
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Invalida cache relacionado
   */
  invalidateRelatedCache(itemId) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(itemId) || key === 'board_stats') {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

module.exports = MondayService;
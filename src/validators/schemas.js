const Joi = require('joi');

/**
 * Esquemas de validação usando Joi
 * Define validações para diferentes endpoints da API
 */

// Esquemas base
const baseSchemas = {
  id: Joi.string().min(1).max(100).required(),
  clienteId: Joi.string().min(1).max(50).required(),
  produto: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().max(255),
  url: Joi.string().uri().max(500),
  timestamp: Joi.date().iso(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  }
};

// Validação de automação
const automationSchemas = {
  // Processar automação
  processAutomation: Joi.object({
    clienteId: baseSchemas.clienteId,
    produto: baseSchemas.produto,
    options: Joi.object({
      createFolders: Joi.boolean().default(true),
      updateMonday: Joi.boolean().default(true),
      sendNotification: Joi.boolean().default(false),
      priority: Joi.string().valid('low', 'normal', 'high').default('normal')
    }).default({})
  }),
  
  // Listar automações
  listAutomations: Joi.object({
    status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled'),
    clienteId: Joi.string().max(50),
    produto: Joi.string().max(100),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    ...baseSchemas.pagination
  }),
  
  // Status da automação
  automationStatus: Joi.object({
    id: baseSchemas.id
  }),
  
  // Cancelar automação
  cancelAutomation: Joi.object({
    id: baseSchemas.id,
    reason: Joi.string().max(255).optional()
  }),
  
  // Reprocessar automação
  retryAutomation: Joi.object({
    id: baseSchemas.id,
    options: Joi.object({
      resetProgress: Joi.boolean().default(false),
      skipValidation: Joi.boolean().default(false)
    }).default({})
  }),
  
  // Automação em lote
  bulkAutomation: Joi.object({
    items: Joi.array().items(
      Joi.object({
        clienteId: baseSchemas.clienteId,
        produto: baseSchemas.produto
      })
    ).min(1).max(50).required(),
    options: Joi.object({
      createFolders: Joi.boolean().default(true),
      updateMonday: Joi.boolean().default(true),
      sendNotification: Joi.boolean().default(false),
      priority: Joi.string().valid('low', 'normal', 'high').default('normal'),
      batchSize: Joi.number().integer().min(1).max(10).default(5)
    }).default({})
  })
};

// Validação do Monday.com
const mondaySchemas = {
  // Consultar produtos
  queryProducts: Joi.object({
    search: Joi.string().min(1).max(100),
    limit: Joi.number().integer().min(1).max(100).default(20),
    columns: Joi.array().items(Joi.string()).optional()
  }),
  
  // Buscar farmácias
  searchPharmacies: Joi.object({
    query: Joi.string().min(1).max(100).required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    filters: Joi.object({
      city: Joi.string().max(100),
      state: Joi.string().max(50),
      active: Joi.boolean()
    }).optional()
  }),
  
  // Atualizar item
  updateItem: Joi.object({
    itemId: Joi.string().required(),
    columnValues: Joi.object().required(),
    boardId: Joi.string().optional()
  }),
  
  // Criar item
  createItem: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    columnValues: Joi.object().optional(),
    groupId: Joi.string().optional(),
    boardId: Joi.string().optional()
  }),
  
  // Listar itens
  listItems: Joi.object({
    boardId: Joi.string().optional(),
    groupId: Joi.string().optional(),
    ...baseSchemas.pagination
  }),
  
  // Buscar itens
  searchItems: Joi.object({
    query: Joi.string().min(1).max(100).required(),
    boardId: Joi.string().optional(),
    columns: Joi.array().items(Joi.string()).optional(),
    ...baseSchemas.pagination
  }),
  
  // Atividade do item
  itemActivity: Joi.object({
    itemId: Joi.string().required(),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

// Validação de webhooks
const webhookSchemas = {
  // Webhook do Monday.com
  mondayWebhook: Joi.object({
    challenge: Joi.string().optional(),
    event: Joi.object({
      type: Joi.string().required(),
      data: Joi.object().required(),
      userId: Joi.string().optional(),
      originalTriggerUuid: Joi.string().optional(),
      boardId: Joi.string().optional(),
      groupId: Joi.string().optional(),
      pulseId: Joi.string().optional(),
      columnId: Joi.string().optional(),
      value: Joi.object().optional(),
      previousValue: Joi.object().optional()
    }).optional()
  }),
  
  // Webhook genérico
  genericWebhook: Joi.object({
    type: Joi.string().max(50).required(),
    data: Joi.object().required(),
    source: Joi.string().max(100).optional(),
    timestamp: baseSchemas.timestamp.optional()
  }),
  
  // Histórico de webhooks
  webhookHistory: Joi.object({
    type: Joi.string().max(50),
    status: Joi.string().valid('received', 'processing', 'completed', 'failed'),
    source: Joi.string().max(100),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    ...baseSchemas.pagination
  }),
  
  // Reprocessar webhook
  reprocessWebhook: Joi.object({
    id: baseSchemas.id,
    options: Joi.object({
      skipValidation: Joi.boolean().default(false),
      forceReprocess: Joi.boolean().default(false)
    }).default({})
  }),
  
  // Teste de webhook
  testWebhook: Joi.object({
    type: Joi.string().valid('monday', 'generic').required(),
    data: Joi.object().required(),
    options: Joi.object({
      validateOnly: Joi.boolean().default(false),
      async: Joi.boolean().default(true)
    }).default({})
  }),
  
  // Validar estrutura de webhook
  validateWebhook: Joi.object({
    type: Joi.string().required(),
    payload: Joi.object().required(),
    headers: Joi.object().optional()
  })
};

// Validação de configurações
const configSchemas = {
  // Validar configurações
  validateConfig: Joi.object({
    categories: Joi.array().items(
      Joi.string().valid('environment', 'monday', 'paths', 'security', 'cache', 'logging')
    ).optional(),
    detailed: Joi.boolean().default(false)
  }),
  
  // Informações de variáveis de ambiente
  envInfo: Joi.object({
    includeValues: Joi.boolean().default(false),
    maskSensitive: Joi.boolean().default(true)
  }),
  
  // Status de features
  featureStatus: Joi.object({
    feature: Joi.string().valid(
      'automation', 'webhooks', 'monday_integration', 'file_operations', 
      'caching', 'rate_limiting', 'logging'
    ).optional()
  }),
  
  // Recarregar configurações (apenas desenvolvimento)
  reloadConfig: Joi.object({
    category: Joi.string().valid('all', 'environment', 'monday', 'paths').default('all')
  })
};

// Validação de health checks
const healthSchemas = {
  // Health check detalhado
  detailedHealth: Joi.object({
    includeDependencies: Joi.boolean().default(true),
    includeMetrics: Joi.boolean().default(true),
    includeSystem: Joi.boolean().default(false)
  }),
  
  // Métricas
  metrics: Joi.object({
    period: Joi.string().valid('1h', '6h', '24h', '7d').default('1h'),
    includeDetails: Joi.boolean().default(false)
  }),
  
  // Informações do sistema
  systemInfo: Joi.object({
    includeEnvironment: Joi.boolean().default(false),
    includePaths: Joi.boolean().default(false)
  })
};

// Validação de parâmetros de query
const querySchemas = {
  // Paginação
  pagination: Joi.object(baseSchemas.pagination),
  
  // Filtros de data
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }),
  
  // Ordenação
  sorting: Joi.object({
    sortBy: Joi.string().max(50),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  // Busca
  search: Joi.object({
    q: Joi.string().min(1).max(100),
    fields: Joi.array().items(Joi.string().max(50)).optional()
  })
};

// Validação de headers
const headerSchemas = {
  // Headers obrigatórios
  required: Joi.object({
    'content-type': Joi.string().valid('application/json').required(),
    'user-agent': Joi.string().optional()
  }).unknown(true),
  
  // Headers de autenticação
  auth: Joi.object({
    'authorization': Joi.string().pattern(/^Bearer .+/).optional(),
    'x-api-key': Joi.string().min(10).optional()
  }).unknown(true),
  
  // Headers de webhook
  webhook: Joi.object({
    'x-monday-signature': Joi.string().optional(),
    'x-webhook-source': Joi.string().optional(),
    'x-request-id': Joi.string().optional()
  }).unknown(true)
};

// Validação de arquivos
const fileSchemas = {
  // Upload de arquivo
  upload: Joi.object({
    filename: Joi.string().min(1).max(255).required(),
    mimetype: Joi.string().valid(
      'application/json', 'text/plain', 'text/csv', 
      'application/pdf', 'image/jpeg', 'image/png'
    ).required(),
    size: Joi.number().integer().min(1).max(10 * 1024 * 1024), // 10MB
    encoding: Joi.string().optional()
  }),
  
  // Operações de arquivo
  fileOperation: Joi.object({
    path: Joi.string().min(1).max(500).required(),
    operation: Joi.string().valid('read', 'write', 'delete', 'copy', 'move').required(),
    options: Joi.object({
      createDirs: Joi.boolean().default(true),
      overwrite: Joi.boolean().default(false),
      backup: Joi.boolean().default(false)
    }).optional()
  })
};

// Esquemas combinados por rota
const routeSchemas = {
  automation: automationSchemas,
  monday: mondaySchemas,
  webhook: webhookSchemas,
  config: configSchemas,
  health: healthSchemas,
  query: querySchemas,
  headers: headerSchemas,
  files: fileSchemas
};

// Opções de validação padrão
const defaultOptions = {
  abortEarly: false, // Retorna todos os erros
  allowUnknown: false, // Não permite campos desconhecidos
  stripUnknown: true, // Remove campos desconhecidos
  convert: true, // Converte tipos automaticamente
  presence: 'optional' // Campos são opcionais por padrão
};

// Opções específicas por contexto
const validationOptions = {
  body: { ...defaultOptions, presence: 'required' },
  query: { ...defaultOptions, allowUnknown: true },
  params: { ...defaultOptions, presence: 'required' },
  headers: { ...defaultOptions, allowUnknown: true, stripUnknown: false }
};

module.exports = {
  baseSchemas,
  routeSchemas,
  defaultOptions,
  validationOptions,
  
  // Esquemas individuais para importação direta
  automationSchemas,
  mondaySchemas,
  webhookSchemas,
  configSchemas,
  healthSchemas,
  querySchemas,
  headerSchemas,
  fileSchemas
};
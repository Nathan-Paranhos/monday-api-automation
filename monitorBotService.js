const NodeCache = require('node-cache');
const winston = require('winston');

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Adiciona log no console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Cache para deduplicação com TTL de 10 minutos
const cache = new NodeCache({ stdTTL: 600 });

function deveProcessar(item) {
  if (cache.get(item.id) === item.updated_at) return false;
  cache.set(item.id, item.updated_at);
  return true;
}

async function consultarItensMonday() {
  try {
    // Implementar lógica de consulta ao Monday.com
    // Retornar array de items com status "Na Fila"
    return [];
  } catch (err) {
    logger.error('[CONSULTA] Falha ao buscar itens:', err.message);
    throw err;
  }
}

async function processarItem(item) {
  try {
    logger.info(`[PROCESSAMENTO] Iniciando processamento do item ${item.id}`);
    // Implementar lógica de processamento do item
    // - Criar pastas
    // - Atribuir responsáveis
    // - Atualizar status
  } catch (err) {
    logger.error(`[PROCESSAMENTO] Falha ao processar item ${item.id}:`, err.message);
    throw err;
  }
}

async function verificarNovasDemandas() {
  try {
    const items = await consultarItensMonday();

    for (const item of items) {
      if (!deveProcessar(item)) {
        logger.debug(`[DEDUPLICAÇÃO] Item ${item.id} já processado recentemente`);
        continue;
      }
      await processarItem(item);
    }
  } catch (err) {
    logger.error('[VERIFICAÇÃO] Falha ao verificar demandas:', err.message);
    throw err;
  }
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function iniciarMonitoramento() {
  logger.info('[MONITOR] Iniciando serviço de monitoramento');

  while (true) {
    try {
      await verificarNovasDemandas();
    } catch (err) {
      logger.error('[MONITORAMENTO] Falha:', err.message);
    }

    await esperar(20000); // 20 segundos
  }
}

// Inicia o monitoramento
iniciarMonitoramento();
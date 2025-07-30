const { logger } = require('../../logs/logger');
const NodeCache = require('node-cache');
const config = require('../../config/config');

// Cache com TTL de 10 minutos
const cache = new NodeCache({ stdTTL: 600 });

/**
 * Verifica se um item deve ser processado baseado no cache
 */
function deveProcessar(item) {
  if (cache.get(item.id) === item.updated_at) return false;
  cache.set(item.id, item.updated_at);
  return true;
}

/**
 * Consulta itens no Monday com status "Na Fila"
 */
async function consultarItensMonday() {
  try {
    // Implementar lógica de consulta ao Monday.com
    // Retornar array de itens com status "Na Fila"
    return [];
  } catch (err) {
    logger.error('[MONDAY] Erro ao consultar itens:', err.message);
    throw err;
  }
}

/**
 * Processa um item individual
 */
async function processarItem(item) {
  try {
    logger.info(`[ITEM] Processando item ${item.id}`);
    // Implementar lógica de processamento
  } catch (err) {
    logger.error(`[ITEM] Erro ao processar item ${item.id}:`, err.message);
    throw err;
  }
}

/**
 * Função principal de verificação de novas demandas
 */
async function verificarNovasDemandas() {
  try {
    const items = await consultarItensMonday();

    for (const item of items) {
      if (!deveProcessar(item)) continue;
      await processarItem(item);
    }
  } catch (err) {
    logger.error('[MONITORAMENTO] Falha:', err.message);
  }
}

/**
 * Função de espera entre verificações
 */
function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Inicia o monitoramento contínuo
 */
async function iniciarMonitoramento() {
  logger.info('[MONITOR] Iniciando serviço de monitoramento');
  
  while (true) {
    try {
      await verificarNovasDemandas();
    } catch (err) {
      logger.error('[MONITORAMENTO] Falha crítica:', err.message);
    }

    await esperar(20000); // 20 segundos
  }
}

module.exports = {
  iniciarMonitoramento
};
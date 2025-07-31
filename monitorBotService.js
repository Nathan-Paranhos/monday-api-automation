const axios = require('axios');
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

// URL da API de produção
const API_BASE_URL = 'https://monday-api-automation.onrender.com';

// Configuração do axios com timeout
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json'
  }
});

function deveProcessar(item) {
  const cacheKey = `${item.id}_${item.updated_at}`;
  if (cache.get(cacheKey)) {
    return false;
  }
  cache.set(cacheKey, true);
  return true;
}

async function verificarStatusAPI() {
  try {
    const response = await apiClient.get('/health');
    logger.info('[API] Status da API:', response.data);
    return response.data.status === 'ok';
  } catch (error) {
    logger.error('[API] Erro ao verificar status da API:', error.message);
    return false;
  }
}

async function buscarFarmaciasBOT() {
  try {
    const response = await apiClient.get('/api/monday/pharmacies/bot', {
      params: {
        status: 'Na Fila',
        limit: 50
      }
    });
    
    if (response.data && response.data.dados) {
      logger.info(`[CONSULTA] Encontradas ${response.data.dados.length} farmácias BOT`);
      return response.data.dados;
    }
    
    return [];
  } catch (error) {
    logger.error('[CONSULTA] Erro ao buscar farmácias BOT:', error.message);
    throw error;
  }
}

async function processarItemViaAPI(itemId) {
  try {
    logger.info(`[PROCESSAMENTO] Processando item ${itemId} via API`);
    
    const response = await apiClient.post(`/test-item/${itemId}`);
    
    if (response.data && response.data.status === 'sucesso') {
      logger.info(`[PROCESSAMENTO] Item ${itemId} processado com sucesso`);
      return true;
    } else {
      logger.warn(`[PROCESSAMENTO] Resposta inesperada para item ${itemId}:`, response.data);
      return false;
    }
  } catch (error) {
    logger.error(`[PROCESSAMENTO] Erro ao processar item ${itemId}:`, error.message);
    throw error;
  }
}

async function verificarNovasDemandas() {
  try {
    // Verificar se a API está funcionando
    const apiOk = await verificarStatusAPI();
    if (!apiOk) {
      logger.warn('[VERIFICAÇÃO] API não está disponível, pulando verificação');
      return;
    }

    // Buscar farmácias BOT com status "Na Fila"
    const farmacias = await buscarFarmaciasBOT();
    
    if (farmacias.length === 0) {
      logger.debug('[VERIFICAÇÃO] Nenhuma farmácia BOT encontrada com status "Na Fila"');
      return;
    }

    // Processar cada farmácia encontrada
    for (const farmacia of farmacias) {
      if (!deveProcessar(farmacia)) {
        logger.debug(`[DEDUPLICAÇÃO] Farmácia ${farmacia.id} já processada recentemente`);
        continue;
      }

      try {
        await processarItemViaAPI(farmacia.id);
        logger.info(`[SUCESSO] Farmácia ${farmacia.id} processada com sucesso`);
      } catch (error) {
        logger.error(`[ERRO] Falha ao processar farmácia ${farmacia.id}:`, error.message);
      }

      // Aguardar 2 segundos entre processamentos para não sobrecarregar a API
      await esperar(2000);
    }
  } catch (error) {
    logger.error('[VERIFICAÇÃO] Erro geral na verificação de demandas:', error.message);
  }
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function iniciarMonitoramento() {
  logger.info('[MONITOR] Iniciando serviço de monitoramento');
  logger.info(`[MONITOR] API Base URL: ${API_BASE_URL}`);

  // Verificação inicial da API
  try {
    const apiOk = await verificarStatusAPI();
    if (apiOk) {
      logger.info('[MONITOR] API está funcionando corretamente');
    } else {
      logger.warn('[MONITOR] API não está respondendo adequadamente');
    }
  } catch (error) {
    logger.error('[MONITOR] Erro na verificação inicial da API:', error.message);
  }

  // Loop principal de monitoramento
  while (true) {
    try {
      await verificarNovasDemandas();
    } catch (error) {
      logger.error('[MONITORAMENTO] Falha no ciclo de monitoramento:', error.message);
    }

    // Aguardar 30 segundos antes da próxima verificação
    await esperar(30000);
  }
}

// Tratamento de sinais para encerramento gracioso
process.on('SIGINT', () => {
  logger.info('[MONITOR] Recebido SIGINT, encerrando monitoramento...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('[MONITOR] Recebido SIGTERM, encerrando monitoramento...');
  process.exit(0);
});

// Inicia o monitoramento
iniciarMonitoramento().catch(error => {
  logger.error('[MONITOR] Erro fatal no monitoramento:', error.message);
  process.exit(1);
});
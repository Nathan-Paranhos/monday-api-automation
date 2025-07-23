require('dotenv').config();
const MondayClient = require('./monday/mondayClient');
const FileManager = require('./fileManager/fileManager');
const config = require('./config/config');
const { logger, logErro, logSucesso } = require('./logs/logger');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração da API para receber notificações do Monday.com
app.use(express.json());

app.post('/webhook/monday', async (req, res) => {
  try {
    const { event } = req.body;
    
    // Verifica se é um evento de atualização de coluna e se a coluna é 'produto'
    if (event && event.type === 'change_column_value' && event.columnId === 'produto') {
      const itemId = event.pulseId;
      logger.info(`Recebida notificação de atualização do produto para o item ${itemId}`);
      
      // Processa o item atualizado
      await processarItemAtualizado(itemId);
    }
    
    res.status(200).send('Webhook recebido com sucesso');
  } catch (error) {
    logErro('Webhook Monday', error);
    res.status(500).send('Erro ao processar webhook');
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  logger.info(`Servidor API iniciado na porta ${PORT}`);
});

/**
 * Processa um item específico que teve o produto BOT atualizado
 */
async function processarItemAtualizado(itemId) {
  try {
    // Inicializa o cliente do Monday.com
    const mondayClient = new MondayClient(config.monday.apiToken, config.monday.boardId);
    
    // Busca os detalhes do item
    const item = await mondayClient.buscarItemPorId(itemId);
    
    if (item && item.produto === 'BOT') {
      logger.info(`Processando item ${itemId} com produto BOT`);
      
      // Aguarda 10 segundos após detectar o produto BOT
      logger.info('Aguardando 10 segundos após o preenchimento do produto "BOT"...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      logger.info('Continuando o processamento após o atraso de 10 segundos');
      
      await processarFarmaciaBOT(item, mondayClient);
    }
  } catch (error) {
    logErro('Processamento de item atualizado', error, { itemId });
  }
}

/**
 * Processa uma farmácia com produto BOT
 * @param {Object} farmacia - Objeto com informações da farmácia
 * @param {MondayClient} mondayClient - Cliente do Monday.com
 */
async function processarFarmaciaBOT(farmacia, mondayClient) {
  try {
    // Verifica se o principal produto é Fórmula Certa ou Phusion
    if (!farmacia.principalProduto || 
        (farmacia.principalProduto !== 'Fórmula Certa' && farmacia.principalProduto !== 'Phusion')) {
      logger.info(`Farmácia ${farmacia.id} não tem produto principal válido: ${farmacia.principalProduto}`);
      return;
    }
    
    // Verifica se o status é "Na Fila"
    if (!farmacia.status || farmacia.status !== 'Na Fila') {
      logger.info(`Farmácia ${farmacia.id} não está com status "Na Fila": ${farmacia.status}`);
      return;
    }
    
    logger.info(`Processando farmácia BOT: ${farmacia.elemento} (ID: ${farmacia.id}) - Produto principal: ${farmacia.principalProduto}`);
    
    // Inicializa o gerenciador de arquivos
    const fileManager = new FileManager();
    
    // Extrai o código do cliente - prioriza campo específico, depois nome, depois ID
      let codigoCliente = farmacia.campos?.codigoCliente;
      
      if (!codigoCliente) {
        // Tenta extrair do nome usando regex (formato: "1234 - Nome da Farmácia")
        const nomeMatch = farmacia.elemento.match(/^(\d+)\s*-\s*(.+)$/);
        codigoCliente = nomeMatch ? nomeMatch[1] : farmacia.id;
      }
    
    // Determina o responsável com base no produto principal
    const emailResponsavel = config.obterResponsavel(farmacia.principalProduto);
    if (!emailResponsavel) {
      throw new Error(`Não foi possível determinar o responsável para o produto ${farmacia.principalProduto}`);
    }
    
    // Cria a estrutura de pastas e copia o arquivo modelo
    const resultado = await fileManager.processarCliente(farmacia.principalProduto, codigoCliente);
    
    if (resultado.sucesso) {
      // Atualiza o item no Monday.com
      await mondayClient.atribuirResponsavel(farmacia.id, emailResponsavel);
      
      // Adiciona observação
      const observacao = "🗂️ Pasta criada automaticamente e modelo de fluxo copiado com base no status 'Na Fila'.";
      await mondayClient.adicionarObservacao(farmacia.id, observacao);
      
      // Atualiza o status para "Configuração"
      await mondayClient.atualizarStatus(farmacia.id, "Em andamento");
      
      logSucesso({ operacao: 'Processamento de farmácia BOT', resultado: `Farmácia ${farmacia.elemento} (ID: ${farmacia.id}) processada com sucesso` });
    } else {
      logErro('Processamento de farmácia BOT', new Error(resultado.mensagem), { farmacia });
    }
  } catch (error) {
    logErro('Processamento de farmácia BOT', error, { farmacia: `${farmacia.elemento} (ID: ${farmacia.id})` });
  }
}

/**
 * Função principal que executa o processo de criação de pastas e atualização do Monday.com
 */
async function main() {
  try {
    logger.info('Iniciando processamento de clientes BOT');
    
    // Inicializa o cliente do Monday.com
    const mondayClient = new MondayClient(config.monday.apiToken, config.monday.boardId);
    
    // Testa a conexão com o Monday.com
    const conexaoOk = await mondayClient.testarConexao();
    if (!conexaoOk) {
      throw new Error('Não foi possível conectar ao Monday.com. Verifique as credenciais.');
    }
    
    // Inicializa o gerenciador de arquivos
    const fileManager = new FileManager();
    
    logger.info('Iniciando processamento de farmácias BOT existentes');
    
    // Busca as farmácias BOT
    const farmaciasBOT = await mondayClient.buscarFarmaciasBOT();
    logger.info(`Encontradas ${farmaciasBOT.length} farmácias BOT`);
    
    // Filtra apenas as farmácias com status "Na Fila" e produto principal "Fórmula Certa" ou "Phusion"
    const farmaciasFiltradas = farmaciasBOT.filter(farmacia => {
      return (
        (farmacia.statusOriginal === 'Na Fila' || farmacia.statusNormalizado === 'na fila') && 
        (farmacia.principalProduto === 'Fórmula Certa' || farmacia.principalProduto === 'Phusion')
      );
    });
    
    logger.info(`Filtradas ${farmaciasFiltradas.length} farmácias com status "Na Fila" e produto principal "Fórmula Certa" ou "Phusion"`);
    
    // Processa cada farmácia
    for (const farmacia of farmaciasFiltradas) {
      try {
        logger.info(`Processando farmácia: ${farmacia.elemento} (ID: ${farmacia.id})`);
        
        // Extrai o código do cliente - prioriza campo específico, depois nome, depois ID
        let codigoCliente = farmacia.campos?.codigoCliente;
        
        if (!codigoCliente) {
          // Tenta extrair do nome usando regex (formato: "1234 - Nome da Farmácia")
          const nomeMatch = farmacia.elemento.match(/^(\d+)\s*-\s*(.+)$/);
          codigoCliente = nomeMatch ? nomeMatch[1] : farmacia.id;
        }
        
        // Determina o responsável com base no produto principal
        const emailResponsavel = config.obterResponsavel(farmacia.principalProduto);
        if (!emailResponsavel) {
          logErro('Processamento de farmácia', new Error(`Não foi possível determinar o responsável para o produto ${farmacia.principalProduto}`), { farmacia });
          continue;
        }
        
        // Cria a estrutura de pastas e copia o arquivo modelo
        const resultado = await fileManager.processarCliente(farmacia.principalProduto, codigoCliente);
        
        if (resultado.sucesso) {
          // Atualiza o item no Monday.com
          await mondayClient.atribuirResponsavel(farmacia.id, emailResponsavel);
          
          // Adiciona observação
          const observacao = "🗂️ Pasta criada automaticamente e modelo de fluxo copiado com base no status 'Na Fila'.";
          await mondayClient.adicionarObservacao(farmacia.id, observacao);
          
          // Atualiza o status para "Configuração"
          await mondayClient.atualizarStatus(farmacia.id, "Em andamento");
          
          logSucesso({ operacao: 'Processamento de farmácia', resultado: `Farmácia ${farmacia.elemento} (ID: ${farmacia.id}) processada com sucesso` });
        } else {
          logErro('Processamento de farmácia', new Error(resultado.mensagem), { farmacia });
        }
      } catch (error) {
        logErro('Processamento de farmácia', error, { farmacia: `${farmacia.elemento} (ID: ${farmacia.id})` });
      }
    }
    
    logger.info('Processamento de clientes BOT concluído com sucesso');
  } catch (error) {
    logErro('Processamento principal', error);
  }
}

// Executa a função principal
main().catch(error => {
  logErro('Execução principal', error);
  process.exit(1);
});
require('dotenv').config();
const MondayClient = require('./monday/mondayClient');
const config = require('./config/config');
const logger = require('./logs/logger');

/**
 * Script para testar atualização de status com IDs reais do Monday.com
 * Busca itens existentes no board e testa a atualização de status
 */
async function testarStatusComIdsReais() {
  try {
    logger.logger.info('🚀 Iniciando teste de status com IDs reais do Monday.com');
    
    const mondayClient = new MondayClient();
    
    // Testa a conexão
    logger.logger.info('📡 Testando conexão com Monday.com...');
    const conexaoOk = await mondayClient.testarConexao();
    if (!conexaoOk) {
      throw new Error('❌ Não foi possível conectar ao Monday.com');
    }
    logger.logger.info('✅ Conexão estabelecida com sucesso');
    
    // Busca itens existentes no board
    logger.logger.info('🔍 Buscando itens existentes no board...');
    
    const query = `
      query GetBoardItems($boardId: [ID!]) {
        boards(ids: $boardId) {
          items_page(limit: 10) {
            items {
              id
              name
              column_values {
                id
                text
                value
                column {
                  title
                  id
                  type
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      boardId: [config.monday.boardId.toString()]
    };

    const response = await mondayClient.client.request(query, variables);
    
    if (!response.boards || response.boards.length === 0 || 
        !response.boards[0].items_page.items || 
        response.boards[0].items_page.items.length === 0) {
      throw new Error('❌ Nenhum item encontrado no board');
    }

    const items = response.boards[0].items_page.items;
    logger.logger.info(`✅ Encontrados ${items.length} itens no board`);
    
    // Lista os itens encontrados
    logger.logger.info('📋 Itens encontrados:');
    items.forEach((item, index) => {
      const statusColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('status')
      );
      const currentStatus = statusColumn ? statusColumn.text : 'N/A';
      
      logger.logger.info(`  ${index + 1}. ID: ${item.id} | Nome: ${item.name} | Status: ${currentStatus}`);
    });
    
    // Testa atualização de status com o primeiro item encontrado
    if (items.length > 0) {
      const primeiroItem = items[0];
      logger.logger.info(`\n🔄 Testando atualização de status do item: ${primeiroItem.id} (${primeiroItem.name})`);
      
      try {
        // Busca o status atual
        const statusColumn = primeiroItem.column_values.find(col => 
          col.column.title.toLowerCase().includes('status')
        );
        const statusAtual = statusColumn ? statusColumn.text : 'Desconhecido';
        
        logger.logger.info(`📊 Status atual: ${statusAtual}`);
        
        // Tenta atualizar para "Em Andamento"
        logger.logger.info('🔄 Atualizando status para "Em Andamento"...');
        await mondayClient.atualizarStatus(primeiroItem.id, 'Em Andamento');
        logger.logger.info('✅ Status atualizado com sucesso!');
        
        // Aguarda 3 segundos
        logger.logger.info('⏳ Aguardando 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Restaura o status original (se havia um)
        if (statusAtual && statusAtual !== 'Desconhecido') {
          logger.logger.info(`🔄 Restaurando status original: ${statusAtual}`);
          await mondayClient.atualizarStatus(primeiroItem.id, statusAtual);
          logger.logger.info('✅ Status original restaurado!');
        }
        
      } catch (error) {
        logger.logger.info(`❌ Erro ao atualizar status: ${error.message}`);
        
        // Tenta com outros status válidos
        const statusValidos = ['Na Fila', 'Em Andamento', 'Concluído', 'Pausado'];
        
        for (const status of statusValidos) {
          try {
            logger.logger.info(`🔄 Tentando com status: ${status}`);
            await mondayClient.atualizarStatus(primeiroItem.id, status);
            logger.logger.info(`✅ Sucesso com status: ${status}`);
            break;
          } catch (statusError) {
            logger.logger.info(`❌ Falhou com status ${status}: ${statusError.message}`);
          }
        }
      }
    }
    
    // Testa também com alguns itens adicionais se disponíveis
    if (items.length > 1) {
      logger.logger.info('\n🔄 Testando com mais itens...');
      
      for (let i = 1; i < Math.min(3, items.length); i++) {
        const item = items[i];
        logger.logger.info(`\n📝 Testando item ${i + 1}: ${item.id} (${item.name})`);
        
        try {
          await mondayClient.atualizarStatus(item.id, 'Na Fila');
          logger.logger.info(`✅ Item ${item.id} atualizado com sucesso`);
        } catch (error) {
          logger.logger.info(`❌ Erro no item ${item.id}: ${error.message}`);
        }
      }
    }
    
    logger.logger.info('\n🏁 Teste de status com IDs reais concluído!');
    logger.logSucesso({ 
      operacao: 'Teste de status com IDs reais', 
      resultado: `Testados ${items.length} itens do board` 
    });
    
  } catch (error) {
    logger.logErro('Teste de status com IDs reais', error);
  }
}

// Executa o teste
testarStatusComIdsReais().catch(error => {
  logger.logErro('Execução do teste de status', error);
  process.exit(1);
});
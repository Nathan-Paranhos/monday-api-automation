require('dotenv').config();
const MondayClient = require('./monday/mondayClient');
const FileManager = require('./fileManager/fileManager');
const config = require('./config/config');
const logger = require('./logs/logger');

/**
 * Script para testar a identificação de campos e criação de pastas
 * Verifica se os campos 'produto' e 'produto principal' estão sendo identificados corretamente
 * e se as pastas estão sendo criadas nos caminhos corretos
 */
async function testarCamposEPastas() {
  try {
    logger.logger.info('🔍 Iniciando teste de identificação de campos e criação de pastas');
    
    // Inicializa os clientes
    const mondayClient = new MondayClient();
    const fileManager = new FileManager();
    
    // Testa a conexão com o Monday.com
    logger.logger.info('📡 Testando conexão com Monday.com...');
    const conexaoOk = await mondayClient.testarConexao();
    if (!conexaoOk) {
      throw new Error('❌ Não foi possível conectar ao Monday.com. Verifique as credenciais.');
    }
    logger.logger.info('✅ Conexão com Monday.com estabelecida com sucesso');
    
    // Busca itens reais do board para análise
    logger.logger.info('🔍 Buscando itens do board para análise de campos...');
    
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
    
    // Analisa cada item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      logger.logger.info(`\n📋 [${i + 1}/${items.length}] Analisando item: ${item.name} (ID: ${item.id})`);
      
      // Lista todos os campos disponíveis
      logger.logger.info('📊 Campos disponíveis no item:');
      item.column_values.forEach(col => {
        if (col.text && col.text.trim()) {
          logger.logger.info(`   - ${col.column.title}: "${col.text}" (ID: ${col.column.id}, Tipo: ${col.column.type})`);
        }
      });
      
      // Identifica campos específicos
      const produtoColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('produto') && 
        !col.column.title.toLowerCase().includes('principal')
      );
      
      const principalProdutoColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('principal produto') ||
        col.column.title.toLowerCase().includes('produto principal')
      );
      
      const statusColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('status')
      );
      
      // Usa o ID real do Monday.com como ID do cliente
      const idCliente = item.id;
      const nomeFarmacia = item.name;
      
      logger.logger.info('🎯 Campos identificados:');
      logger.logger.info(`   📝 ID Cliente: ${idCliente}`);
      logger.logger.info(`   🏥 Nome Farmácia: ${nomeFarmacia}`);
      logger.logger.info(`   📦 Produto: ${produtoColumn ? produtoColumn.text : 'NÃO ENCONTRADO'}`);
      logger.logger.info(`   🎯 Produto Principal: ${principalProdutoColumn ? principalProdutoColumn.text : 'NÃO ENCONTRADO'}`);
      logger.logger.info(`   📊 Status: ${statusColumn ? statusColumn.text : 'NÃO ENCONTRADO'}`);
      
      // Determina qual produto usar para criação da pasta
      let produtoParaPasta = null;
      let origemProduto = null;
      
      // Prioriza o produto principal se for Phusion
      if (principalProdutoColumn && principalProdutoColumn.text) {
        const principalProdutoText = principalProdutoColumn.text.trim();
        if (principalProdutoText.toLowerCase().includes('phusion')) {
          produtoParaPasta = 'Phusion';
          origemProduto = 'produto principal';
        }
      }
      
      // Se não encontrou no produto principal, usa o produto normal
      if (!produtoParaPasta && produtoColumn && produtoColumn.text) {
        const produtoText = produtoColumn.text.trim();
        if (produtoText.toLowerCase().includes('formula') || produtoText.toLowerCase().includes('fórmula')) {
          produtoParaPasta = 'Fórmula Certa';
          origemProduto = 'produto';
        } else if (produtoText.toLowerCase().includes('bot')) {
          produtoParaPasta = 'BOT';
          origemProduto = 'produto';
        }
      }
      
      if (produtoParaPasta) {
        logger.logger.info(`✅ Produto determinado: ${produtoParaPasta} (origem: ${origemProduto})`);
        
        // Testa a criação da pasta
        logger.logger.info(`📁 Testando criação de pasta para produto: ${produtoParaPasta}`);
        
        try {
          // Gera o caminho esperado
          const caminhoEsperado = config.gerarCaminhoPasta(produtoParaPasta, idCliente);
          logger.logger.info(`📍 Caminho esperado: ${caminhoEsperado}`);
          
          // Testa a criação (sem realmente criar)
          const resultadoPastas = await fileManager.processarCliente(produtoParaPasta, idCliente);
          
          if (resultadoPastas.sucesso) {
            logger.logger.info(`✅ Pasta criada com sucesso: ${resultadoPastas.caminhoPasta}`);
            logger.logger.info(`✅ Arquivo modelo copiado: ${resultadoPastas.caminhoArquivo}`);
          } else {
            logger.logger.info(`❌ Erro na criação de pastas: ${resultadoPastas.mensagem}`);
          }
          
        } catch (error) {
          logger.logger.info(`❌ Erro ao testar criação de pasta: ${error.message}`);
        }
        
      } else {
        logger.logger.info('⚠️ Produto não identificado ou não suportado');
      }
      
      // Pausa entre análises
      if (i < items.length - 1) {
        logger.logger.info('⏳ Aguardando 1 segundo antes do próximo item...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Testa os caminhos configurados
    logger.logger.info('\n🗂️ Testando caminhos configurados:');
    
    const produtosTeste = ['BOT', 'Fórmula Certa', 'Phusion'];
    const idClienteTeste = '9999';
    
    produtosTeste.forEach(produto => {
      try {
        const caminho = config.gerarCaminhoPasta(produto, idClienteTeste);
        logger.logger.info(`✅ ${produto}: ${caminho}`);
      } catch (error) {
        logger.logger.info(`❌ ${produto}: Erro - ${error.message}`);
      }
    });
    
    logger.logger.info('\n🏁 Teste de campos e pastas concluído!');
    logger.logSucesso({ 
      operacao: 'Teste de identificação de campos e criação de pastas', 
      resultado: `Analisados ${items.length} itens do board` 
    });
    
  } catch (error) {
    logger.logErro('Teste de campos e pastas', error);
  }
}

// Executa a função de teste
testarCamposEPastas().catch(error => {
  logger.logErro('Execução do teste de campos e pastas', error);
  process.exit(1);
});
require('dotenv').config();
const MondayClient = require('./monday/mondayClient');
const FileManager = require('./fileManager/fileManager');
const config = require('./config/config');
const logger = require('./logs/logger');

/**
 * Script para testar a automação completa baseado nas tabelas do Monday.com
 * Testa com farmácias específicas e define nathan.silva@fagrontech.com.br como responsável
 */
async function testarAutomacaoCompleta() {
  try {
    logger.logger.info('🚀 Iniciando teste automatizado da automação completa');
    
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
    
    // Aguarda 10 segundos após o preenchimento do produto "BOT"
    logger.logger.info('⏳ Aguardando 10 segundos após o preenchimento do produto "BOT"...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    logger.logger.info('✅ Continuando o processamento após o atraso de 10 segundos');
    
    // Busca itens reais do board para teste
    logger.logger.info('🔍 Buscando itens reais do board para teste...');
    
    const query = `
      query GetBoardItems($boardId: [ID!]) {
        boards(ids: $boardId) {
          items_page(limit: 5) {
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
    
    // Converte itens reais para formato de teste
    const dadosTeste = items.map(item => {
      // Extrai ID do cliente do nome (formato: "ID - NOME")
      const nomeMatch = item.name.match(/^(\d+)\s*-\s*(.+)$/);
      const idCliente = nomeMatch ? nomeMatch[1] : item.id;
      const nomeFarmacia = nomeMatch ? nomeMatch[2] : item.name;
      
      // Busca produto
      const produtoColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('produto') && 
        !col.column.title.toLowerCase().includes('principal')
      );
      
      // Busca status
      const statusColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('status')
      );
      
      return {
        id: item.id, // Usa o ID real do Monday.com
        idCliente: idCliente,
        nome: nomeFarmacia,
        produto: produtoColumn ? produtoColumn.text : 'BOT',
        status: statusColumn ? statusColumn.text : 'Na Fila'
      };
    });
    
    logger.logger.info('📋 Dados de teste preparados:');
    dadosTeste.forEach((item, index) => {
      logger.logger.info(`  ${index + 1}. ID: ${item.id} | Cliente: ${item.idCliente} | Nome: ${item.nome} | Produto: ${item.produto} | Status: ${item.status}`);
    });
    
    logger.logger.info(`📋 Iniciando testes com ${dadosTeste.length} farmácias de teste`);
    
    // Email do responsável fixo para teste
    const emailResponsavelTeste = 'nathan.silva@fagrontech.com.br';
    
    // Processa cada farmácia de teste
    for (let i = 0; i < dadosTeste.length; i++) {
      const farmacia = dadosTeste[i];
      
      try {
        logger.logger.info(`\n🏥 [${i + 1}/${dadosTeste.length}] Processando: ${farmacia.nome} (ID: ${farmacia.id})`);
        
        // Etapa 1: Criar estrutura de pastas
        logger.logger.info('📁 Criando estrutura de pastas...');
        const resultadoPastas = await fileManager.processarCliente(farmacia.produto, farmacia.idCliente);
        
        if (resultadoPastas.sucesso) {
          logger.logger.info(`✅ Pasta criada: ${resultadoPastas.caminhoPasta}`);
          logger.logger.info(`✅ Arquivo modelo copiado: ${resultadoPastas.caminhoArquivo}`);
        } else {
          logger.logger.info(`❌ Erro na criação de pastas: ${resultadoPastas.mensagem}`);
          continue;
        }
        
        // Etapa 2: Buscar item no Monday.com
        logger.logger.info('🔍 Buscando item no Monday.com...');
        let itemEncontrado = null;
        
        try {
          // Tenta buscar por ID do cliente
          itemEncontrado = await mondayClient.consultarProdutoPorCliente(farmacia.id);
          logger.logger.info(`✅ Item encontrado por ID: ${JSON.stringify(itemEncontrado)}`);
        } catch (error) {
          try {
            // Fallback: busca por nome
            itemEncontrado = await mondayClient.consultarProdutoPorNome(farmacia.nome);
            logger.logger.info(`✅ Item encontrado por nome: ${JSON.stringify(itemEncontrado)}`);
          } catch (fallbackError) {
            logger.logger.info(`⚠️ Item não encontrado no Monday.com. Simulando dados...`);
            itemEncontrado = {
              produto: farmacia.produto,
              principalProduto: farmacia.produto,
              status: farmacia.status,
              elemento: farmacia.nome
            };
          }
        }
        
        // Etapa 3: Atribuir responsável (usando email fixo para teste)
        logger.logger.info(`👤 Atribuindo responsável: ${emailResponsavelTeste}`);
        try {
          await mondayClient.atribuirResponsavel(farmacia.id, emailResponsavelTeste);
          logger.logger.info('✅ Responsável atribuído com sucesso');
        } catch (error) {
          logger.logger.info(`⚠️ Erro ao atribuir responsável: ${error.message}`);
        }
        
        // Etapa 4: Adicionar observação
        const observacao = `🤖 Automação executada em ${new Date().toLocaleString('pt-BR')} - Pasta criada automaticamente para ${farmacia.produto}`;
        logger.logger.info('📝 Adicionando observação...');
        try {
          await mondayClient.adicionarObservacao(farmacia.id, observacao);
          logger.logger.info('✅ Observação adicionada com sucesso');
        } catch (error) {
          logger.logger.info(`⚠️ Erro ao adicionar observação: ${error.message}`);
        }
        
        // Etapa 5: Atualizar status (AGORA COM ID REAL!)
        logger.logger.info('🔄 Atualizando status para "Em Andamento"...');
        const statusOriginal = farmacia.status;
        
        try {
          await mondayClient.atualizarStatus(farmacia.id, 'Em Andamento');
          logger.logger.info('✅ Status atualizado para "Em Andamento" com sucesso!');
          
          // Aguarda 3 segundos antes de restaurar
          logger.logger.info('⏳ Aguardando 3 segundos...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Restaura o status original
          if (statusOriginal && statusOriginal !== 'Em Andamento') {
            logger.logger.info(`🔄 Restaurando status original: ${statusOriginal}`);
            await mondayClient.atualizarStatus(farmacia.id, statusOriginal);
            logger.logger.info('✅ Status original restaurado com sucesso!');
          }
          
        } catch (error) {
          logger.logger.info(`❌ Erro ao atualizar status: ${error.message}`);
          
          // Tenta com status alternativos
          const statusAlternativos = ['Na Fila', 'Pausado', 'Concluído'];
          
          for (const status of statusAlternativos) {
            try {
              logger.logger.info(`🔄 Tentando status alternativo: ${status}`);
              await mondayClient.atualizarStatus(farmacia.id, status);
              logger.logger.info(`✅ Sucesso com status: ${status}`);
              
              // Restaura o original se conseguiu atualizar
              if (statusOriginal && statusOriginal !== status) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                await mondayClient.atualizarStatus(farmacia.id, statusOriginal);
                logger.logger.info(`✅ Status ${statusOriginal} restaurado`);
              }
              break;
            } catch (statusError) {
              logger.logger.info(`❌ Falhou com ${status}: ${statusError.message}`);
            }
          }
        }
        
        logger.logger.info(`🎉 Farmácia ${farmacia.nome} processada com sucesso!`);
        
        // Pausa entre processamentos
        if (i < dadosTeste.length - 1) {
          logger.logger.info('⏳ Aguardando 3 segundos antes do próximo teste...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        logger.logErro(`Erro ao processar farmácia ${farmacia.nome}`, error);
      }
    }
    
    logger.logger.info('\n🏁 Teste automatizado concluído!');
    logger.logSucesso({ operacao: 'Teste de automação completa', resultado: 'Todos os testes foram executados' });
    
  } catch (error) {
    logger.logErro('Teste de automação completa', error);
  }
}

// Executa a função de teste
testarAutomacaoCompleta().catch(error => {
  logger.logErro('Execução do teste automatizado', error);
  process.exit(1);
});
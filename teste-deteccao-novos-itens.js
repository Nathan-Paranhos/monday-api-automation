require('dotenv').config();
const MondayClient = require('./monday/mondayClient');
const config = require('./config/config');
const { logger, logErro, logSucesso } = require('./logs/logger');

/**
 * Script para testar a detecção de novos itens no Monday.com
 * Este script busca os itens mais recentes e verifica se eles seriam processados corretamente
 */
async function testarDeteccaoNovosItens() {
  try {
    logger.info('=== TESTE DE DETECÇÃO DE NOVOS ITENS ===');
    
    // Inicializa o cliente do Monday.com
    const mondayClient = new MondayClient(config.monday.apiToken, config.monday.boardId);
    
    // Testa a conexão
    const conexaoOk = await mondayClient.testarConexao();
    if (!conexaoOk) {
      throw new Error('Falha na conexão com Monday.com');
    }
    
    logger.info('✅ Conexão com Monday.com estabelecida');
    
    // Busca todos os itens do board para encontrar os mais recentes
    logger.info('🔍 Buscando itens recentes no board...');
    
    const query = `
      query GetRecentItems($boardId: ID!) {
        boards(ids: [$boardId]) {
          items_page(limit: 20) {
            items {
              id
              name
              created_at
              column_values {
                id
                text
                value
                column {
                  title
                  id
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      boardId: config.monday.boardId.toString()
    };

    const response = await mondayClient.client.request(query, variables);
    
    if (!response.boards || response.boards.length === 0 || !response.boards[0].items_page || !response.boards[0].items_page.items) {
      throw new Error('Nenhum item encontrado no board');
    }

    const itens = response.boards[0].items_page.items;
    logger.info(`📋 Encontrados ${itens.length} itens recentes`);
    
    // Analisa cada item
    for (const item of itens) {
      const dataCreacao = new Date(item.created_at);
      const agora = new Date();
      const diferencaHoras = (agora - dataCreacao) / (1000 * 60 * 60);
      
      // Extrai informações relevantes
      const produtoColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('produto') && 
        !col.column.title.toLowerCase().includes('principal')
      );
      
      const principalProdutoColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('principal produto')
      );
      
      const statusColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('status')
      );
      
      const produto = produtoColumn?.text?.trim() || 'Não definido';
      const principalProduto = principalProdutoColumn?.text?.trim() || 'Não definido';
      const status = statusColumn?.text?.trim() || 'Não definido';
      
      logger.info(`\n📄 Item: ${item.name} (ID: ${item.id})`);
      logger.info(`   📅 Criado: ${dataCreacao.toLocaleString('pt-BR')} (${diferencaHoras.toFixed(1)}h atrás)`);
      logger.info(`   🏷️  Produto: "${produto}"`);
      logger.info(`   🎯 Principal Produto: "${principalProduto}"`);
      logger.info(`   📊 Status: "${status}"`);
      
      // Verifica se seria processado pelo webhook
      let seriaProcessado = false;
      let motivo = '';
      
      if (produto === 'BOT') {
        if (principalProduto === 'Fórmula Certa' || principalProduto === 'Phusion') {
          if (status === 'Na Fila') {
            seriaProcessado = true;
            motivo = '✅ Atende todos os critérios (BOT + Fórmula Certa/Phusion + Na Fila)';
          } else {
            motivo = `❌ Status incorreto: "${status}" (esperado: "Na Fila")`;
          }
        } else {
          motivo = `❌ Principal produto incorreto: "${principalProduto}" (esperado: "Fórmula Certa" ou "Phusion")`;
        }
      } else if (produto === 'Não definido') {
        motivo = '⏳ Produto ainda não definido - seria reagendado';
      } else {
        motivo = `❌ Produto incorreto: "${produto}" (esperado: "BOT")`;
      }
      
      logger.info(`   🤖 Seria processado: ${seriaProcessado ? 'SIM' : 'NÃO'}`);
      logger.info(`   💭 Motivo: ${motivo}`);
      
      // Se foi criado nas últimas 24 horas e seria processado, destaca
      if (diferencaHoras <= 24 && seriaProcessado) {
        logger.info(`   🎉 ITEM RECENTE QUE SERIA PROCESSADO!`);
      }
    }
    
    // Estatísticas
    const itensRecentes = itens.filter(item => {
      const dataCreacao = new Date(item.created_at);
      const agora = new Date();
      const diferencaHoras = (agora - dataCreacao) / (1000 * 60 * 60);
      return diferencaHoras <= 24;
    });
    
    const itensBOT = itens.filter(item => {
      const produtoColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('produto') && 
        !col.column.title.toLowerCase().includes('principal')
      );
      return produtoColumn?.text?.trim() === 'BOT';
    });
    
    logger.info(`\n📊 ESTATÍSTICAS:`);
    logger.info(`   📅 Itens criados nas últimas 24h: ${itensRecentes.length}`);
    logger.info(`   🤖 Itens com produto BOT: ${itensBOT.length}`);
    
    logger.info('\n✅ Teste de detecção de novos itens concluído');
    
  } catch (error) {
    logErro('Teste de detecção de novos itens', error);
    process.exit(1);
  }
}

// Executa o teste
testarDeteccaoNovosItens().catch(error => {
  logErro('Execução do teste', error);
  process.exit(1);
});
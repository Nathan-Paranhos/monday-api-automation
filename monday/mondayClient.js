const { GraphQLClient } = require('graphql-request');
const config = require('../config/config');
const { logConsultaMonday, logErro } = require('../logs/logger');

/**
 * Cliente para interação com a API do Monday.com via GraphQL
 * Responsável por consultar informações de demandas no board configurado
 */
class MondayClient {
  constructor() {
    if (!config.monday.apiToken) {
      throw new Error('Token do Monday.com não configurado. Verifique a variável MONDAY_API_TOKEN no .env');
    }
    
    if (!config.monday.boardId) {
      throw new Error('Board ID do Monday.com não configurado. Verifique a variável MONDAY_BOARD_ID no .env');
    }

    // Inicializa o cliente GraphQL com autenticação
    this.client = new GraphQLClient(config.monday.apiUrl, {
      headers: {
        'Authorization': config.monday.apiToken,
        'API-Version': '2023-10'
      }
    });
  }

  /**
   * Consulta o produto associado a uma demanda específica
   * @param {number} idCliente - ID do cliente para buscar na demanda
   * @returns {Promise<string>} Nome do produto ("Fórmula Certa" ou "Phusion")
   * @throws {Error} Se não encontrar a demanda ou o produto
   */
  async consultarProdutoPorCliente(idCliente) {
    try {
      // Query GraphQL para buscar itens no board com base no ID do cliente
      const query = `
        query GetItemByClientId($boardId: [ID!]) {
          boards(ids: $boardId) {
            items_page(query_params: {rules: [{column_id: "text", compare_value: ["${idCliente}"]}]}) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                  column {
                    title
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

      const response = await this.client.request(query, variables);
      
      // Verifica se encontrou algum item
      if (!response.boards || response.boards.length === 0) {
        throw new Error(`Board ${config.monday.boardId} não encontrado`);
      }

      const items = response.boards[0].items_page.items;
      
      if (!items || items.length === 0) {
        throw new Error(`Demanda não encontrada para o cliente ID: ${idCliente}`);
      }

      // Busca o primeiro item encontrado
      const item = items[0];
      
      // Procura pela coluna "Produto"
      const produtoColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('produto') ||
        col.id === 'dropdown' || // ID comum para dropdown de produto
        col.id === 'status' // Caso o produto esteja em status
      );

      if (!produtoColumn || !produtoColumn.text) {
        throw new Error(`Campo "Produto" não encontrado ou vazio para o cliente ID: ${idCliente}`);
      }

      const produto = produtoColumn.text.trim();
      
      // Valida se o produto é um dos esperados
      if (!config.isProdutoValido(produto)) {
        throw new Error(`Produto inválido encontrado: "${produto}". Produtos válidos: ${config.produtosValidos.join(', ')}`);
      }

      logConsultaMonday(idCliente, produto);
      
      return produto;

    } catch (error) {
      logErro('Consulta Monday.com', error, { idCliente });
      
      // Re-throw com mensagem mais específica
      if (error.message.includes('Unauthorized')) {
        throw new Error('Token do Monday.com inválido ou expirado');
      }
      
      if (error.message.includes('Network')) {
        throw new Error('Erro de conexão com Monday.com. Verifique sua internet');
      }
      
      throw error;
    }
  }

  /**
   * Método alternativo para buscar por nome da farmácia
   * @param {string} nomeFarmacia - Nome da farmácia
   * @returns {Promise<string>} Nome do produto
   */
  async consultarProdutoPorNome(nomeFarmacia) {
    try {
      const query = `
        query GetItemByName($boardId: [ID!]) {
          boards(ids: $boardId) {
            items_page(query_params: {rules: [{column_id: "name", compare_value: ["${nomeFarmacia}"]}]}) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                  column {
                    title
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

      const response = await this.client.request(query, variables);
      
      if (!response.boards || response.boards.length === 0 || 
          !response.boards[0].items_page.items || 
          response.boards[0].items_page.items.length === 0) {
        throw new Error(`Demanda não encontrada para a farmácia: ${nomeFarmacia}`);
      }

      const item = response.boards[0].items_page.items[0];
      const produtoColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('produto')
      );

      if (!produtoColumn || !produtoColumn.text) {
        throw new Error(`Campo "Produto" não encontrado para a farmácia: ${nomeFarmacia}`);
      }

      const produto = produtoColumn.text.trim();
      
      if (!config.isProdutoValido(produto)) {
        throw new Error(`Produto inválido: "${produto}"`);
      }

      return produto;

    } catch (error) {
      logErro('Consulta Monday.com por nome', error, { nomeFarmacia });
      throw error;
    }
  }

  /**
   * Busca todas as farmácias com produto "BOT"
   * @returns {Promise<Array>} Lista de farmácias com produto BOT
   */
  async buscarFarmaciasBOT() {
    try {
      const query = `
        query GetAllItems($boardId: ID!) {
          boards(ids: [$boardId]) {
            items_page {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                  column {
                    title
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

      const response = await this.client.request(query, variables);
      
      if (!response.boards || response.boards.length === 0) {
        throw new Error(`Board ${config.monday.boardId} não encontrado`);
      }

      const items = response.boards[0].items_page.items;
      const farmaciasBOT = [];

      items.forEach(item => {
        // Procura pela coluna "Produto"
        const produtoColumn = item.column_values.find(col => 
          col.column && col.column.title && (
            col.column.title.toLowerCase().includes('produto') ||
            col.id === 'dropdown' ||
            col.id === 'status'
          )
        );

        if (produtoColumn && produtoColumn.text && produtoColumn.text.trim() === 'BOT') {
          farmaciasBOT.push({
            id: item.id,
            elemento: item.name, // Nome da farmácia (ex: 2707 - BOULEVARD PHARMA)
            produto: produtoColumn.text
          });
        }
      });

      logConsultaMonday('Busca BOT', `Encontradas ${farmaciasBOT.length} farmácias com produto BOT`);
      
      return farmaciasBOT;

    } catch (error) {
      logErro('Busca farmácias BOT', error);
      throw error;
    }
  }

  /**
   * Testa a conexão com o Monday.com
   * @returns {Promise<boolean>} True se a conexão estiver funcionando
   */
  async testarConexao() {
    try {
      const query = `
        query {
          me {
            id
            name
          }
        }
      `;

      await this.client.request(query);
      return true;
    } catch (error) {
      logErro('Teste de conexão Monday.com', error);
      return false;
    }
  }
}

module.exports = MondayClient;
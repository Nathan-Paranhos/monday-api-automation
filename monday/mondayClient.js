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

    this.client = new GraphQLClient(config.monday.apiUrl, {
      headers: {
        'Authorization': config.monday.apiToken,
        'API-Version': '2023-10' // Usar uma versão de API estável
      }
    });
  }

  /**
   * Processa um item da API do Monday para extrair dados relevantes.
   * @private
   * @param {Object} item - O objeto do item retornado pela API do Monday.
   * @returns {Object} Objeto com os dados extraídos e normalizados.
   */
  _processarItem(item) {
    const resultado = {
      id: item.id,
      elemento: item.name,
      campos: {}
    };

    // Mapeia os valores das colunas por ID para acesso rápido
    const colunasPorId = item.column_values.reduce((acc, col) => {
      acc[col.id] = col;
      return acc;
    }, {});

    // Processa todos os campos configurados
    for (const [propriedade, infoCampo] of Object.entries(config.camposMonday)) {
        const campo = colunasPorId[infoCampo.id];
        if (campo && campo.text) {
            resultado.campos[propriedade] = campo.text.trim();
        }
    }

    // Extrai produto, principal produto e status usando os IDs de coluna do config
    const produtoColumn = colunasPorId[config.colunasIds.produto];
    if (produtoColumn && produtoColumn.text) {
      resultado.produto = produtoColumn.text.trim();
    }

    const principalProdutoColumn = colunasPorId[config.colunasIds.principalProduto];
    if (principalProdutoColumn && principalProdutoColumn.text) {
      resultado.principalProduto = principalProdutoColumn.text.trim();
    }

    const statusColumn = colunasPorId[config.colunasIds.status];
    if (statusColumn && statusColumn.text) {
      const statusOriginal = statusColumn.text.trim();
      resultado.statusOriginal = statusOriginal;
      resultado.statusNormalizado = config.normalizarStatus(statusOriginal);
    }

    // Valida se o produto é um dos esperados
    if (resultado.produto && !config.isProdutoValido(resultado.produto)) {
      throw new Error(`Produto inválido encontrado: "${resultado.produto}". Produtos válidos: ${config.produtosValidos.join(', ')}`);
    }

    return resultado;
  }

  /**
   * Executa uma query GraphQL e trata a resposta.
   * @private
   * @param {string} query - A query GraphQL.
   * @param {Object} variables - As variáveis para a query.
   * @returns {Promise<Array>} A lista de itens encontrados.
   */
  async _executarQuery(query, variables) {
    const response = await this.client.request(query, variables);

    if (!response.boards || response.boards.length === 0) {
      throw new Error(`Board ${config.monday.boardId} não encontrado`);
    }
    return response.boards[0].items_page.items;
  }

  /**
   * Consulta informações de uma demanda com base em um valor de coluna.
   * @param {string} columnId - O ID da coluna para a busca.
   * @param {string} columnValue - O valor a ser buscado na coluna.
   * @param {string} logContext - Contexto para o log.
   * @returns {Promise<Object>} Objeto com informações detalhadas da demanda.
   */
  async _consultarPorColuna(columnId, columnValue, logContext) {
    try {
      const query = `
        query($boardId: [ID!], $columnId: String!, $columnValue: [String!]) {
          boards(ids: $boardId) {
            items_page(query_params: {rules: [{column_id: $columnId, compare_value: $columnValue}]}) {
              items {
                id
                name
                column_values { id text value column { title id } }
              }
            }
          }
        }
      `;

      const variables = {
        boardId: [config.monday.boardId.toString()],
        columnId: columnId,
        columnValue: [columnValue]
      };

      const items = await this._executarQuery(query, variables);

      if (!items || items.length === 0) {
        throw new Error(`Demanda não encontrada para ${logContext}: ${columnValue}`);
      }

      const resultado = this._processarItem(items[0]);
      logConsultaMonday(logContext, `Encontrado: ${resultado.produto || 'Produto não encontrado'}`);
      return resultado;

    } catch (error) {
      logErro(`Consulta por ${logContext}`, error, { columnValue });
      throw error;
    }
  }

  /**
   * Consulta informações detalhadas de uma demanda específica pelo ID do cliente.
   * @param {number} idCliente - ID do cliente para buscar na demanda.
   * @returns {Promise<Object>} Objeto com informações detalhadas da demanda.
   */
  async consultarProdutoPorCliente(idCliente) {
    return this._consultarPorColuna(config.colunasIds.produto, idCliente.toString(), 'ID do Cliente');
  }

  /**
   * Consulta informações detalhadas por nome da farmácia.
   * @param {string} nomeFarmacia - Nome da farmácia.
   * @returns {Promise<Object>} Objeto com informações detalhadas da demanda.
   */
  async consultarProdutoPorNome(nomeFarmacia) {
    return this._consultarPorColuna('name', nomeFarmacia, 'Nome da Farmácia');
  }

  /**
   * Atribui um responsável a um item no Monday.com.
   * @param {string} itemId - ID do item.
   * @param {number} ownerId - ID do usuário a ser atribuído.
   * @returns {Promise<Object>} Resposta da API.
   */
  async atribuirResponsavel(itemId, ownerId) {
    try {
      const mutation = `
        mutation($itemId: ID!, $boardId: ID!, $columnId: String!, $value: JSON!) {
          change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
            id
          }
        }
      `;

      const variables = {
        boardId: config.monday.boardId,
        itemId: itemId,
        columnId: config.colunasIds.responsavel,
        value: JSON.stringify({ personsAndTeams: [{ id: ownerId, kind: "person" }] })
      };

      const response = await this.client.request(mutation, variables);
      logConsultaMonday(`Atribuição de responsável para item ${itemId}`, `Usuário ${ownerId} atribuído`);
      return response;

    } catch (error) {
      logErro('Atribuir responsável', error, { itemId, ownerId });
      throw error;
    }
  }

  /**
   * Altera o status de um item no Monday.com.
   * @param {string} itemId - ID do item.
   * @param {string} statusLabel - O novo status para o item.
   * @returns {Promise<Object>} Resposta da API.
   */
  async alterarStatus(itemId, statusLabel) {
    try {
      const mutation = `
        mutation($itemId: ID!, $boardId: ID!, $columnId: String!, $value: JSON!) {
          change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
            id
          }
        }
      `;

      const variables = {
        boardId: config.monday.boardId,
        itemId: itemId,
        columnId: config.colunasIds.status,
        value: JSON.stringify({ label: statusLabel })
      };

      const response = await this.client.request(mutation, variables);
      logConsultaMonday(`Alteração de status para item ${itemId}`, `Status alterado para ${statusLabel}`);
      return response;

    } catch (error) {
      logErro('Alterar status', error, { itemId, statusLabel });
      throw error;
    }
  }

  /**
   * Busca itens do tipo BOT que estão com status "Na Fila".
   * @returns {Promise<Array>} Lista de itens encontrados.
   */
  async buscarItemsBotEmFila() {
    try {
      const query = `
        query($boardId: [ID!]) {
          boards(ids: $boardId) {
            items_page(limit: 50, query_params: {
              rules: [
                { column_id: "${config.colunasIds.status}", compare_value: ["Na Fila"] },
                { column_id: "${config.colunasIds.produto}", compare_value: ["BOT"] }
              ]
            }) {
              items {
                id
                name
                updated_at
                column_values { id text value column { title id } }
              }
            }
          }
        }
      `;

      const variables = { boardId: [config.monday.boardId.toString()] };
      const items = await this._executarQuery(query, variables);
      
      logConsultaMonday('Busca BOT', `Encontrados ${items.length} itens na fila.`);
      return items;

    } catch (error) {
      logErro('Buscar itens BOT na fila', error);
      return []; // Retorna array vazio em caso de erro para não quebrar o loop de monitoramento
    }
  }

  /**
   * Monitora e processa itens da fila do BOT.
   */
  async monitorarEProcessarBots() {
    console.log('Iniciando monitoramento de itens BOT...');
    const itens = await this.buscarItemsBotEmFila();

    if (itens.length === 0) {
      console.log('Nenhum item na fila para processar.');
      return;
    }

    for (const item of itens) {
      try {
        console.log(`Processando item: ${item.name} (ID: ${item.id})`);

        // 1. Atribuir responsável (Ex: um usuário BOT com ID específico)
        await this.atribuirResponsavel(item.id, config.monday.botUserId);

        // 2. Alterar status para "Em Processamento"
        await this.alterarStatus(item.id, 'Em Processamento');

        console.log(`Item ${item.id} movido para 'Em Processamento' e atribuído ao BOT.`);

      } catch (error) {
        logErro(`Falha ao processar item ${item.id}`, error, { item });
        // Opcional: Alterar status para "Erro" para indicar falha
        try {
          await this.alterarStatus(item.id, 'Erro');
        } catch (statusError) {
          logErro(`Falha ao alterar status para 'Erro' do item ${item.id}`, statusError);
        }
      }
    }
  }

  /**
   * Consulta todos os itens do board.
   * @returns {Promise<Array>} Lista de todos os itens do board.
   */
  async consultarTodosItens() {
    try {
      const query = `
        query($boardId: ID!) {
          boards(ids: [$boardId]) {
            items_page(limit: 500) { // Adicionado limite para evitar sobrecarga
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
      logConsultaMonday('Consulta todos os itens', `Encontrados ${items.length} itens no board`);
      
      return items;

    } catch (error) {
      logErro('Consulta todos os itens', error);
      throw error;
    }
  }

  /**
   * Busca todas as farmácias com produto "BOT"
   * @returns {Promise<Array>} Lista de farmácias com produto BOT e informações detalhadas
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

      const response = await this.client.request(query, variables);
      
      if (!response.boards || response.boards.length === 0) {
        throw new Error(`Board ${config.monday.boardId} não encontrado`);
      }

      const items = response.boards[0].items_page.items;
      const farmaciasBOT = [];

      items.forEach(item => {
        // Procura pela coluna de produto
        const produtoColumn = item.column_values.find(col => 
          col.column && col.column.title && (
            col.column.title.toLowerCase().includes('produto') && 
            !col.column.title.toLowerCase().includes('principal')
          )
        );

        // Verifica se é um produto BOT
        if (produtoColumn && produtoColumn.text && 
            (produtoColumn.text.trim() === 'BOT' || produtoColumn.text.trim().toLowerCase() === 'bot')) {
          
          // Cria objeto base com informações da farmácia
          const farmacia = {
            id: item.id,
            elemento: item.name,
            produto: produtoColumn.text.trim(),
            campos: {}
          };
          
          // Processa todos os campos configurados
          for (const [propriedade, nomesCampo] of Object.entries(config.camposMonday)) {            // Verifica se nomesCampo é um array
            const camposParaBuscar = Array.isArray(nomesCampo) ? nomesCampo : [nomesCampo];
            
            // Busca o campo correspondente
            const campo = item.column_values.find(col => 
              camposParaBuscar.some(nome => 
                col.column.title.toLowerCase().includes(nome.toLowerCase()) ||
                col.column.id.toLowerCase().includes(nome.toLowerCase())
              )
            );
            
            if (campo && campo.text) {
              farmacia.campos[propriedade] = campo.text.trim();
            }
          }
          
          // Procura pelo principal produto
          const principalProdutoColumn = item.column_values.find(col => 
            col.column.title.toLowerCase().includes('principal produto')
          );
          
          if (principalProdutoColumn && principalProdutoColumn.text) {
            farmacia.principalProduto = principalProdutoColumn.text.trim();
          }
          
          // Procura pelo status
          const statusColumn = item.column_values.find(col => 
            col.column.title.toLowerCase().includes('status')
          );
          
          if (statusColumn && statusColumn.text) {
            const statusOriginal = statusColumn.text.trim();
            farmacia.statusOriginal = statusOriginal;
            farmacia.statusNormalizado = config.normalizarStatus(statusOriginal);
          }
          
          // Adiciona à lista de farmácias BOT
          farmaciasBOT.push(farmacia);
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
   * Testa a conexão com a API do Monday.com
   * @returns {Promise<boolean>} true se a conexão for bem-sucedida
   */
  async testarConexao() {
    try {
      const query = `
        query {
          me {
            name
          }
        }
      `;

      const response = await this.client.request(query);
      const resultado = response && response.me && response.me.name ? true : false;
      
      if (resultado) {
        logConsultaMonday('Teste de conexão', `Conexão bem-sucedida com a API do Monday.com. Usuário: ${response.me.name}`);
      } else {
        logErro('Teste de conexão', 'Falha na conexão com a API do Monday.com');
      }
      
      return resultado;
    } catch (error) {
      logErro('Teste de conexão', error);
      return false;
    }
  }
  
  /**
   * Busca um item específico pelo ID
   * @param {string} itemId - ID do item no Monday.com
   * @returns {Promise<Object>} Objeto com informações detalhadas do item
   */
  async buscarItemPorId(itemId) {
    try {
      const query = `
        query GetItemById($itemId: [ID!]) {
          items(ids: $itemId) {
            id
            name
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
      `;

      const variables = {
        itemId: [itemId.toString()]
      };

      const response = await this.client.request(query, variables);
      
      if (!response.items || response.items.length === 0) {
        throw new Error(`Item não encontrado: ${itemId}`);
      }

      const item = response.items[0];
      
      // Extrai todos os campos relevantes
      const resultado = {
        id: item.id,
        elemento: item.name,
        campos: {}
      };
      
      // Processa todos os campos configurados
      for (const [propriedade, nomesCampo] of Object.entries(config.camposMonday)) {
        // Verifica se nomesCampo é um array
        const camposParaBuscar = Array.isArray(nomesCampo) ? nomesCampo : [nomesCampo];
        
        const campo = item.column_values.find(col => 
          camposParaBuscar.some(nome => 
            col.column.title.toLowerCase().includes(nome.toLowerCase()) ||
            col.column.id.toLowerCase().includes(nome.toLowerCase())
          )
        );
        
        if (campo && campo.text) {
          resultado.campos[propriedade] = campo.text.trim();
        }
      }
      
      // Procura especificamente pelo produto e principal produto
      const produtoColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('produto') && 
        !col.column.title.toLowerCase().includes('principal')
      );
      
      const principalProdutoColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('principal produto')
      );
      
      if (produtoColumn && produtoColumn.text) {
        resultado.produto = produtoColumn.text.trim();
      }
      
      if (principalProdutoColumn && principalProdutoColumn.text) {
        resultado.principalProduto = principalProdutoColumn.text.trim();
      }
      
      // Procura pelo status
      const statusColumn = item.column_values.find(col => 
        col.column.title.toLowerCase().includes('status')
      );
      
      if (statusColumn && statusColumn.text) {
        resultado.status = statusColumn.text.trim();
      }
      
      logConsultaMonday(`Consulta item por ID: ${itemId}`, resultado);
      
      return resultado;

    } catch (error) {
      logErro('Consulta item por ID', error, { itemId });
      throw error;
    }
  }

  // Função de atualização de status removida - API funciona 24h monitorando automaticamente

  /**
   * Adiciona uma observação a um item no Monday.com
   * @param {string} itemId - ID do item no Monday.com
   * @param {string} observacao - Texto da observação
   * @returns {Promise<boolean>} true se a adição for bem-sucedida
   */
  async adicionarObservacao(itemId, observacao) {
    try {
      const mutation = `
        mutation AddUpdate($itemId: ID!, $body: String!) {
          create_update(item_id: $itemId, body: $body) {
            id
          }
        }
      `;

      const variables = {
        itemId: itemId,
        body: observacao
      };

      await this.client.request(mutation, variables);
      
      logConsultaMonday('Adição de observação', `Observação adicionada ao item ${itemId}`);
      
      return true;
    } catch (error) {
      logErro('Adição de observação', error, { itemId, observacao });
      throw error;
    }
  }

  /**
   * Atribui um responsável a uma demanda (item) no Monday.com
   * @param {number} itemId - ID do item
   * @param {number} userId - ID do usuário a ser atribuído
   * @returns {Promise<Object>} Resposta da API
   */
  async atribuirResponsavel(itemId, userId) {
    try {
      const mutation = `
        mutation ($itemId: ID!, $userId: ID!, $boardId: ID!) {
          change_column_value(
            board_id: $boardId,
            item_id: $itemId,
            column_id: "person",
            value: "{\"personsAndTeams\":[{\"id\":\"${userId}\", \"kind\":\"person\"}]}"
          ) {
            id
          }
        }
      `;

      const variables = {
        itemId: itemId.toString(),
        userId: userId.toString(),
        boardId: config.monday.boardId.toString()
      };

      const response = await this.client.request(mutation, variables);
      logConsultaMonday('Atribuir Responsável', `Responsável ${userId} atribuído ao item ${itemId}`);
      return response;

    } catch (error) {
      logErro('Atribuir Responsável', error, { itemId, userId });
      throw new Error(`Erro ao atribuir responsável: ${error.message}`);
    }
  }

  /**
   * Busca um item específico com campos customizados
   * @param {string} itemId - ID do item
   * @param {Array} fields - Array de IDs dos campos
   * @returns {Promise<Object>} Item encontrado
   */
  async getItem(itemId, fields) {
    try {
      const query = `
        query($itemId: [ID!]) {
          items(ids: $itemId) {
            id
            name
            column_values(ids: ["${fields.join('","')}"])  {
              id
              text
              value
            }
          }
        }
      `;

      const variables = {
        itemId: [itemId]
      };

      const response = await this.client.request(query, variables);

      if (!response.items || response.items.length === 0) {
        return null;
      }

      return response.items[0];
    } catch (error) {
      logErro('getItem', error, { itemId });
      throw error;
    }
  }
}

module.exports = MondayClient;
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
        'API-Version': '2025-11'
      }
    });
  }

  /**
   * Consulta informações detalhadas de uma demanda específica
   * @param {number} idCliente - ID do cliente para buscar na demanda
   * @returns {Promise<Object>} Objeto com informações detalhadas da demanda
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
                    id
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
      
      // Extrai todos os campos relevantes
      const resultado = {
        id: item.id,
        elemento: item.name,
        campos: {}
      };
      
      // Processa todos os campos configurados
      for (const [propriedade, nomesCampo] of Object.entries(config.camposMonday)) {
        // Busca o campo correspondente
        const campo = item.column_values.find(col => 
          nomesCampo.some(nome => 
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
      
      // Adiciona produto e principal produto ao resultado
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
        const statusOriginal = statusColumn.text.trim();
        resultado.statusOriginal = statusOriginal;
        resultado.statusNormalizado = config.normalizarStatus(statusOriginal);
      }
      
      // Valida se o produto é um dos esperados
      if (resultado.produto && !config.isProdutoValido(resultado.produto)) {
        throw new Error(`Produto inválido encontrado: "${resultado.produto}". Produtos válidos: ${config.produtosValidos.join(', ')}`);
      }

      logConsultaMonday(idCliente, resultado.produto || 'Produto não encontrado');
      
      return resultado;

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
   * Método alternativo para buscar informações detalhadas por nome da farmácia
   * @param {string} nomeFarmacia - Nome da farmácia
   * @returns {Promise<Object>} Objeto com informações detalhadas da demanda
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
                    id
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
      
      // Extrai todos os campos relevantes
      const resultado = {
        id: item.id,
        elemento: item.name,
        campos: {}
      };
      
      // Processa todos os campos configurados
      for (const [propriedade, nomesCampo] of Object.entries(config.camposMonday)) {
        // Busca o campo correspondente
        const campo = item.column_values.find(col => 
          nomesCampo.some(nome => 
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
      
      // Adiciona produto e principal produto ao resultado
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
        const statusOriginal = statusColumn.text.trim();
        resultado.statusOriginal = statusOriginal;
        resultado.statusNormalizado = config.normalizarStatus(statusOriginal);
      }
      
      // Valida se o produto é um dos esperados
      if (resultado.produto && !config.isProdutoValido(resultado.produto)) {
        throw new Error(`Produto inválido encontrado: "${resultado.produto}". Produtos válidos: ${config.produtosValidos.join(', ')}`);
      }

      logConsultaMonday(nomeFarmacia, resultado.produto || 'Produto não encontrado');
      
      return resultado;

    } catch (error) {
      logErro('Consulta Monday.com por nome', error, { nomeFarmacia });
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
          for (const [propriedade, nomesCampo] of Object.entries(config.camposMonday)) {
            // Busca o campo correspondente
            const campo = item.column_values.find(col => 
              nomesCampo.some(nome => 
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
        query GetItemById($boardId: [ID!], $itemId: [ID!]) {
          boards(ids: $boardId) {
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
        }
      `;

      const variables = {
        boardId: [config.monday.boardId.toString()],
        itemId: [itemId.toString()]
      };

      const response = await this.client.request(query, variables);
      
      if (!response.boards || response.boards.length === 0 || 
          !response.boards[0].items || response.boards[0].items.length === 0) {
        throw new Error(`Item não encontrado: ${itemId}`);
      }

      const item = response.boards[0].items[0];
      
      // Extrai todos os campos relevantes
      const resultado = {
        id: item.id,
        elemento: item.name,
        campos: {}
      };
      
      // Processa todos os campos configurados
      for (const [propriedade, nomesCampo] of Object.entries(config.camposMonday)) {
        const campo = item.column_values.find(col => 
          nomesCampo.some(nome => 
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

  /**
   * Atualiza o status de um item no Monday.com
   * @param {string} itemId - ID do item no Monday.com
   * @param {string} novoStatus - Novo status a ser definido
   * @returns {Promise<boolean>} true se a atualização for bem-sucedida
   */
  async atualizarStatus(itemId, novoStatus) {
    try {
      // Primeiro, precisamos encontrar o ID da coluna de status
      const queryColumns = `
        query GetBoardColumns($boardId: ID!) {
          boards(ids: [$boardId]) {
            columns {
              id
              title
              type
            }
          }
        }
      `;

      const variablesColumns = {
        boardId: config.monday.boardId.toString()
      };

      const responseColumns = await this.client.request(queryColumns, variablesColumns);
      
      if (!responseColumns.boards || responseColumns.boards.length === 0) {
        throw new Error(`Board ${config.monday.boardId} não encontrado`);
      }

      // Encontra a coluna de status
      const statusColumn = responseColumns.boards[0].columns.find(col => 
        col.title.toLowerCase().includes('status')
      );

      if (!statusColumn) {
        throw new Error('Coluna de status não encontrada no board');
      }

      // Agora, atualiza o status do item
      const mutation = `
        mutation ChangeColumnValue($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
          change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
            id
          }
        }
      `;

      const variables = {
        boardId: config.monday.boardId.toString(),
        itemId: itemId,
        columnId: statusColumn.id,
        value: JSON.stringify({"label": novoStatus})
      };

      await this.client.request(mutation, variables);
      
      logConsultaMonday('Atualização de status', `Status do item ${itemId} atualizado para "${novoStatus}"`);
      
      return true;
    } catch (error) {
      logErro('Atualização de status', error, { itemId, novoStatus });
      throw error;
    }
  }

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
   * Atribui um item a um ou múltiplos responsáveis no Monday.com
   * @param {string} itemId - ID do item no Monday.com
   * @param {string|Array} emailResponsavel - Email(s) do(s) responsável(is)
   * @returns {Promise<boolean>} true se a atribuição for bem-sucedida
   */
  async atribuirResponsavel(itemId, emailResponsavel) {
    try {
      // Normaliza para array se for string única
      const emails = Array.isArray(emailResponsavel) ? emailResponsavel : [emailResponsavel];
      
      // Primeiro, precisamos encontrar o ID da pessoa pelo email
      const queryUsers = `
        query GetUsers {
          users {
            id
            email
            name
          }
        }
      `;

      const responseUsers = await this.client.request(queryUsers);
      
      if (!responseUsers.users || responseUsers.users.length === 0) {
        throw new Error('Não foi possível obter a lista de usuários');
      }

      // Encontra os usuários pelos emails
      const usuarios = [];
      const emailsNaoEncontrados = [];
      
      for (const email of emails) {
        const usuario = responseUsers.users.find(user => 
          user.email.toLowerCase() === email.toLowerCase()
        );

        if (!usuario) {
          emailsNaoEncontrados.push(email);
          console.warn(`⚠️ Usuário com email ${email} não encontrado no Monday.com`);
        } else {
          usuarios.push(usuario);
        }
      }
      
      if (usuarios.length === 0) {
        throw new Error(`Nenhum usuário válido encontrado. Emails não encontrados: ${emailsNaoEncontrados.join(', ')}`);
      }
      
      if (emailsNaoEncontrados.length > 0) {
        console.log(`ℹ️ Continuando com ${usuarios.length} usuário(s) válido(s). Emails ignorados: ${emailsNaoEncontrados.join(', ')}`);
      }

      // Agora, precisamos encontrar o ID da coluna de responsável
      const queryColumns = `
        query GetBoardColumns($boardId: ID!) {
          boards(ids: [$boardId]) {
            columns {
              id
              title
              type
            }
          }
        }
      `;

      const variablesColumns = {
        boardId: config.monday.boardId.toString()
      };

      const responseColumns = await this.client.request(queryColumns, variablesColumns);
      
      if (!responseColumns.boards || responseColumns.boards.length === 0) {
        throw new Error(`Board ${config.monday.boardId} não encontrado`);
      }

      // Encontra a coluna de responsável
      const responsavelColumn = responseColumns.boards[0].columns.find(col => 
        col.title.toLowerCase().includes('responsável') || 
        col.title.toLowerCase().includes('responsavel')
      );

      if (!responsavelColumn) {
        throw new Error('Coluna de responsável não encontrada no board');
      }

      // Atribui os responsáveis ao item
      const mutation = `
        mutation ChangeColumnValue($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
          change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
            id
          }
        }
      `;

      // Cria o array de pessoas para atribuição
      const personsAndTeams = usuarios.map(usuario => ({
        "id": usuario.id,
        "kind": "person"
      }));

      const variables = {
        boardId: config.monday.boardId.toString(),
        itemId: itemId,
        columnId: responsavelColumn.id,
        value: JSON.stringify({"personsAndTeams": personsAndTeams})
      };

      await this.client.request(mutation, variables);
      
      const nomes = usuarios.map(u => u.name).join(', ');
      const emailsStr = emails.join(', ');
      logConsultaMonday('Atribuição de responsável', `Item ${itemId} atribuído a ${nomes} (${emailsStr})`);
      
      return true;
    } catch (error) {
      logErro('Atribuição de responsável', error, { itemId, emailResponsavel });
      throw error;
    }
  }
}

module.exports = MondayClient;
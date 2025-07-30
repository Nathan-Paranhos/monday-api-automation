const NodeCache = require('node-cache');
const MondayClient = require('./monday/mondayClient');
const { log, logErro } = require('./utils/logger');
const config = require('./config');

class MonitorBot {
  constructor() {
    this.mondayClient = new MondayClient();
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutos de TTL
  }

  isAlreadyProcessed(pulseId) {
    return this.cache.has(pulseId);
  }

  markAsProcessed(pulseId, updatedAt) {
    this.cache.set(pulseId, updatedAt);
  }

  async buscarItemsBot() {
    try {
      const query = `
        query {
          boards(ids: ${config.monday.boardId}) {
            items_page(limit: 50, query_params: {
              rules: [
                { column_id: "status", compare_value: ["Na Fila"] },
                { column_id: "produto", compare_value: ["BOT"] }
              ]
            }) {
              items {
                id
                name
                updated_at
                column_values { id title text }
              }
            }
          }
        }
      `;

      const response = await this.mondayClient.client.request(query);
      return response.boards[0].items_page.items;
    } catch (error) {
      logErro('Busca de Items BOT', error);
      return [];
    }
  }

  async iniciarMonitoramento() {
    log('Iniciando monitoramento de items BOT');
    
    setInterval(async () => {
      try {
        const items = await this.buscarItemsBot();
        
        for (const item of items) {
          const cachedUpdatedAt = this.cache.get(item.id);
          
          // Pula se já foi processado e não teve alterações
          if (cachedUpdatedAt === item.updated_at) {
            continue;
          }

          log(`Processando item: ${item.name} (ID: ${item.id})`);
          await this.processarItem(item);
          this.markAsProcessed(item.id, item.updated_at);
        }
      } catch (error) {
        logErro('Monitoramento', error);
      }
    }, 20000); // 20 segundos
  }

  async processarItem(item) {
    try {
      // Aqui você pode adicionar a lógica específica de processamento do item
      // Por exemplo, chamar a função main() do seu index.js
      
      log(`Item processado com sucesso: ${item.name}`);
    } catch (error) {
      logErro('Processamento de Item', error, { itemId: item.id });
    }
  }
}

module.exports = MonitorBot;
# 📚 API Documentation - Monday.com Automation

**Desenvolvido por:** Nathan Silva - Fagron Tech  
**Versão:** 1.0.0  
**Produção:** https://monday-api-automation.onrender.com

## 🌐 URLs da API

### Produção (Render)
- **URL Base:** `https://monday-api-automation.onrender.com`
- **Documentação Swagger:** `https://monday-api-automation.onrender.com/api-docs`
- **Health Check:** `https://monday-api-automation.onrender.com/health`

### Desenvolvimento Local
- **URL Base:** `http://localhost:10000`
- **Documentação Swagger:** `http://localhost:10000/api-docs`
- **Health Check:** `http://localhost:10000/health`

## 🚀 Endpoints Principais

### 1. Health Check
```http
GET /health
```

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "monday-api-automation",
  "developer": "Nathan Silva - Fagron Tech"
}
```

### 2. Configurações da Aplicação
```http
GET /config
```

**Resposta:**
```json
{
  "produtos_validos": ["BOT", "Fórmula Certa", "Phusion"],
  "status_validos": ["Na Fila", "Em andamento", "Concluído"],
  "responsaveis": {
    "BOT": ["analista1@fagron.com"],
    "Fórmula Certa": ["analista2@fagron.com"],
    "Phusion": ["analista3@fagron.com"]
  },
  "caminhos_produtos": {
    "BOT": "# BOT Extensão",
    "Fórmula Certa": "# BOT Extensão\\#FCERTA EXTENSÃO\\",
    "Phusion": "# BOT Extensão\\#PHUSION EXTENSÃO\\"
  },
  "servidor": {
    "porta": "10000",
    "ambiente": "production"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Automação Principal
```http
POST /api/automation/process
```

**Body:**
```json
{
  "itemId": "12345",
  "forceProcess": false
}
```

**Resposta (Sucesso):**
```json
{
  "success": true,
  "message": "Automação processada com sucesso",
  "data": {
    "itemId": "12345",
    "produto": "BOT",
    "status": "Em andamento",
    "responsavel": "analista@fagron.com",
    "pasta_criada": "# BOT Extensão\\12345 - Farmácia Exemplo",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Webhook Monday.com
```http
POST /webhook/monday
```

**Body (Exemplo):**
```json
{
  "event": {
    "type": "create_pulse",
    "pulseId": "12345"
  }
}
```

### 5. Consultar Item Monday.com
```http
GET /api/monday/item/:id
```

**Exemplo:**
```http
GET /api/monday/item/12345
```

### 6. Buscar Farmácias BOT
```http
GET /api/monday/farmacias-bot
```

**Parâmetros Query:**
- `limit` (opcional): Número máximo de resultados (padrão: 50)
- `offset` (opcional): Offset para paginação (padrão: 0)

### 7. Estatísticas do Board
```http
GET /api/monday/board/stats
```

## 🔧 Configuração para Produção

### Variáveis de Ambiente Obrigatórias

```env
# Monday.com API
MONDAY_API_TOKEN=seu_token_aqui
MONDAY_BOARD_ID=seu_board_id_aqui

# Servidor
PORT=10000
NODE_ENV=production

# Caminhos base
BASE_PATH_BOT=# BOT Extensão
BASE_PATH_FORMULA_CERTA=# BOT Extensão\#FCERTA EXTENSÃO\
BASE_PATH_PHUSION=# BOT Extensão\#PHUSION EXTENSÃO\
```

## 🚀 Deploy

### PM2 (Recomendado)
```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start ecosystem.config.js --env production

# Monitorar
pm2 status
pm2 logs monitor-bot
```

### Docker
```bash
# Build
docker build -t monday-api .

# Run
docker run -d --name monday-api -p 10000:10000 --env-file .env.production monday-api
```

### Render
1. Conecte o repositório GitHub
2. Configure as variáveis de ambiente
3. Deploy automático

## 📊 Monitoramento

### Health Checks
- `/health` - Status geral da aplicação
- `/health/metrics` - Métricas detalhadas
- `/health/monday` - Status da conexão Monday.com

### Logs
- Logs estruturados com Winston
- Rotação automática de logs
- Níveis: error, warn, info, debug

## 🔒 Segurança

- Rate limiting configurável
- Validação de entrada com Joi
- Sanitização de dados
- Headers de segurança com Helmet
- CORS configurado

## 📞 Suporte

**Desenvolvedor:** Nathan Silva - Fagron Tech  
**GitHub:** https://github.com/Nathan-Paranhos/monday-api-automation  
**Documentação Swagger:** Acesse `/api-docs` para documentação interativa completa
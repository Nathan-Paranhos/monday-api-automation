# Monday.com API Automation

## 📋 Descrição

API RESTful para automatizar processos baseados em demandas do Monday.com. Sistema autônomo que monitora farmácias BOT, cria estruturas de pastas, atribui responsáveis e atualiza status automaticamente.

**🔗 Produção:** https://monday-api-automation.onrender.com  
**📂 GitHub:** https://github.com/Nathan-Paranhos/monday-api-automation  
**👨‍💻 Desenvolvido por:** Nathan Silva - Fagron Tech

## 🏗️ Arquitetura

A API foi completamente reestruturada seguindo as melhores práticas de desenvolvimento:

```
src/
├── app.js              # Configuração principal da aplicação
├── controllers/        # Lógica de controle das rotas
├── middlewares/        # Middlewares customizados
├── routes/            # Definição das rotas
├── services/          # Lógica de negócio
├── utils/             # Utilitários e helpers
└── validators/        # Esquemas de validação
```

## 🎯 Objetivo

Sistema autônomo que monitora demandas BOT no Monday.com 24/7, processando automaticamente:
- ✅ Criação de estrutura de pastas por produto
- ✅ Atribuição de responsáveis
- ✅ Atualização de status para "Em Andamento"
- ✅ Processamento de farmácias com produtos BOT, Fórmula Certa e Phusion

## 📋 Funcionalidades

## ✨ Funcionalidades

- 🤖 **Monitoramento 24/7** com PM2
- 📁 **Criação automática** de estrutura de pastas
- 👥 **Atribuição inteligente** de responsáveis
- 🔄 **Webhooks** para eventos Monday.com
- 📊 **API RESTful** completa
- 🛡️ **Segurança** com rate limiting e validação
- 📈 **Logs estruturados** e métricas
- 🐳 **Docker** e **PM2** ready

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+ instalado
- Acesso à API do Monday.com
- Permissões de escrita nas pastas de destino

### 🚀 Deploy Rápido

**Render (Recomendado):**
1. Fork este repositório
2. Conecte no [Render](https://render.com)
3. Configure as variáveis de ambiente
4. Deploy automático! ✨

**PM2 (Produção):**
```bash
npm install -g pm2
pm2 start ecosystem.config.js --env production
```

**Docker:**
```bash
docker build -t monday-api .
docker run -d --name monday-api -p 10000:10000 --env-file .env.production monday-api
```

### 🛠️ Instalação Local

```bash
# 1. Clone o projeto
git clone https://github.com/Nathan-Paranhos/monday-api-automation.git
cd monday-api-automation

# 2. Instale dependências
npm install

# 3. Configure ambiente
cp .env.example .env
# Edite .env com suas configurações

# 4. Inicie o servidor
npm start
```

**Variáveis obrigatórias:**
```env
MONDAY_API_TOKEN=seu_token_aqui
MONDAY_BOARD_ID=seu_board_id_aqui
PORT=10000
NODE_ENV=production
```

## 📚 Documentação

- **📖 API Completa:** [API.md](./API.md)
- **🌐 Swagger UI:** `/api-docs`
- **❤️ Health Check:** `/health`
- **📊 Métricas:** `/health/metrics`

### Principais Endpoints

- `POST /api/automation/process` - Processar automação
- `GET /api/monday/farmacias-bot` - Buscar farmácias BOT
- `POST /webhook/monday` - Webhook Monday.com
- `GET /config` - Configurações da aplicação

## 🔧 Monitoramento

**PM2 (Produção):**
```bash
# Iniciar monitoramento automático
node start-monitor.js

# Comandos úteis
pm2 status
pm2 logs monitor-bot
pm2 restart monitor-bot
```

**Logs:** Winston com rotação automática  
**Métricas:** `/health/metrics`  
**Dashboard:** `pm2 monit`

## ⚙️ Configuração

### Variáveis Essenciais

```env
# Monday.com API
MONDAY_API_TOKEN=seu_token_monday_com
MONDAY_BOARD_ID=id_do_board_principal

# Servidor
PORT=10000
NODE_ENV=production

# Caminhos (Windows)
BASE_USER_PATH=C:\\Users\\{User}\\OneDrive
MODEL_FILE_PATH=C:\\OneDrive\\Onboarding\\#Backoffice\\#BOT Extensão\\Modelo Fluxo.vsdx
```

### Monday.com Setup

1. **Token API:** Monday.com → Avatar → Admin → API
2. **Board ID:** Extrair da URL do board
3. **Webhook:** `https://seu-dominio.com/webhook/monday`

### Estrutura de Pastas

```
OneDrive/Onboarding/#Backoffice/#BOT Extensão/
├── Modelo Fluxo.vsdx
└── Farmácias/[Nome]/
    ├── Fluxo [Nome].vsdx
    └── Responsáveis.txt
```

## 📞 Suporte

Para suporte técnico:
- Verifique os logs em `logs/error.log`
- Teste a conexão com `/test-monday`
- Valide as configurações com `/config`

**Equipe de desenvolvimento:**
- **Nathan Silva**: Nathan.silva@fagrontech.com.br
- **Jean Vencigueri**: Jean.Vencigueri@fagrontech.com.br

## 📝 Licença

ISC License - Fagron Tech

---

**Última atualização**: Julho 2025
**Versão**: 2.0.0  
**Desenvolvido por**: Equipe Fagron Tech
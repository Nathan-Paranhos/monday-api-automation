Monday API Automation
 1.0.0 
OAS 3.0
API para automatizar a criação de estrutura de pastas baseada em demandas do Monday.com, definindo analistas responsáveis por produto.

Contact Nathan Silva - Fagron Tech
ISC
Servers

https://monday-api-automation.onrender.com - Servidor de Produção (Render) - GitHub: https://github.com/Nathan-Paranhos/monday-api-automation
Sistema
Endpoints relacionados ao sistema e configurações



GET
/health
Health Check

Verifica se a API está funcionando corretamente

Parameters
Cancel
No parameters

Execute
Clear
Responses
Curl

curl -X 'GET' \
  'https://monday-api-automation.onrender.com/health' \
  -H 'accept: application/json'
Request URL
https://monday-api-automation.onrender.com/health
Server response
Code	Details
200	
Response body
Download
{
  "status": "ok",
  "timestamp": "2025-07-31T15:32:55.690Z",
  "service": "monday-api-automation",
  "developer": "Nathan Silva - Fagron Tech"
}
Response headers
 access-control-allow-headers: Origin,X-Requested-With,Content-Type,Accept,Authorization 
 access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS 
 access-control-allow-origin: * 
 alt-svc: h3=":443"; ma=86400 
 cf-cache-status: DYNAMIC 
 cf-ray: 967e26b48a876eac-GRU 
 content-encoding: br 
 content-length: 108 
 content-type: application/json; charset=utf-8 
 date: Thu,31 Jul 2025 15:32:55 GMT 
 etag: W/"81-O1hU2orzL9aixoJ1dDTZjPjPPqA" 
 rndr-id: 06ee5be5-43ab-4775 
 server: cloudflare 
 vary: Accept-Encoding 
 x-powered-by: Express 
 x-render-origin-server: Render 
Responses
Code	Description	Links
200	
API funcionando normalmente

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "monday-api-automation"
}
No links

GET
/config
Obter Configurações

Retorna as configurações da aplicação (sem dados sensíveis)

Parameters
Cancel
No parameters

Execute
Clear
Responses
Curl

curl -X 'GET' \
  'https://monday-api-automation.onrender.com/config' \
  -H 'accept: application/json'
Request URL
https://monday-api-automation.onrender.com/config
Server response
Code	Details
200	
Response body
Download
{
  "produtos_validos": [
    "BOT",
    "Fórmula Certa",
    "Phusion"
  ],
  "status_validos": [
    "Na fila",
    "em andamento",
    "configuração",
    "concluido",
    "finalizado",
    "pausado",
    "cancelado",
    "relacionamento",
    "pausado features",
    "aguardando 3º",
    "desenvolvimento",
    "aguardando implantações",
    "pausado cliente",
    "inadimplente"
  ],
  "responsaveis": {
    "BOT": [
      "Nathan.silva@fagrontech.com.br",
      "Pedro.Ribeiro@fagrontech.com.br",
      "Bruno.Vaz@fagrontech.com.br",
      "Jean.Vencigueri@fagrontech.com.br"
    ],
    "Fórmula Certa": [
      "Nathan.silva@fagrontech.com.br",
      "Pedro.Ribeiro@fagrontech.com.br",
      "Bruno.Vaz@fagrontech.com.br",
      "Jean.Vencigueri@fagrontech.com.br"
    ],
    "Phusion": [
      "Nathan.silva@fagrontech.com.br",
      "Pedro.Ribeiro@fagrontech.com.br",
      "Bruno.Vaz@fagrontech.com.br",
      "Jean.Vencigueri@fagrontech.com.br"
    ]
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
  "timestamp": "2025-07-31T15:33:18.296Z"
}
Response headers
 access-control-allow-headers: Origin,X-Requested-With,Content-Type,Accept,Authorization 
 access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS 
 access-control-allow-origin: * 
 alt-svc: h3=":443"; ma=86400 
 cf-cache-status: DYNAMIC 
 cf-ray: 967e2741ff4a565d-GRU 
 content-encoding: br 
 content-length: 421 
 content-type: application/json; charset=utf-8 
 date: Thu,31 Jul 2025 15:33:18 GMT 
 etag: W/"3e2-/lkJDnBuPBb8IPKr1U7SpK16sMY" 
 rndr-id: 0bc8cc05-7d76-4c2d 
 server: cloudflare 
 vary: Accept-Encoding 
 x-powered-by: Express 
 x-render-origin-server: Render 
Responses
Code	Description	Links
200	
Configurações obtidas com sucesso

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "produtos_validos": [
    "BOT"
  ],
  "status_validos": [
    "na fila",
    "em andamento",
    "concluido"
  ],
  "responsaveis": {
    "BOT": "Pedro.Ribeiro@fagrontech.com.br,Bruno.Vaz@fagrontech.com.br"
  },
  "caminhos_produtos": {
    "BOT": "#BOT EXTENSÃO"
  },
  "servidor": {
    "porta": 3000,
    "ambiente": "development"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
No links
Automação
Endpoints para execução da automação principal



POST
/automatizar
Automação Principal

Executa a automação completa: consulta Monday.com, cria estrutura de pastas e copia arquivo modelo

Parameters
Cancel
Reset
No parameters

Request body

application/json
Edit Value
Schema
{
  "id_cliente": 11111,
  "nome_farmacia": "TESTE FAGRON TECH"
}
Execute
Clear
Responses
Curl

curl -X 'POST' \
  'https://monday-api-automation.onrender.com/automatizar' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "id_cliente": 11111,
  "nome_farmacia": "TESTE FAGRON TECH"
}'
Request URL
https://monday-api-automation.onrender.com/automatizar
Server response
Code	Details
500	
Error: response status is 500

Response body
Download
{
  "status": "erro",
  "erro": "Não foi possível encontrar o produto. Erro principal: Not authenticated: {\"response\":{\"errors\":[{\"message\":\"Not authenticated\",\"extensions\":{\"code\":\"NOT_AUTHENTICATED\"}}],\"status\":401,\"headers\":{}},\"request\":{\"query\":\"\\n        query GetItemByClientId($boardId: [ID!]) {\\n          boards(ids: $boardId) {\\n            items_page(query_params: {rules: [{column_id: \\\"text\\\", compare_value: [\\\"11111\\\"]}]}) {\\n              items {\\n                id\\n                name\\n                column_values {\\n                  id\\n                  text\\n                  value\\n                  column {\\n                    title\\n                    id\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      \",\"variables\":{\"boardId\":[\"9572919643\"]}}}. Erro fallback: Not authenticated: {\"response\":{\"errors\":[{\"message\":\"Not authenticated\",\"extensions\":{\"code\":\"NOT_AUTHENTICATED\"}}],\"status\":401,\"headers\":{}},\"request\":{\"query\":\"\\n        query GetItemByName($boardId: [ID!]) {\\n          boards(ids: $boardId) {\\n            items_page(query_params: {rules: [{column_id: \\\"name\\\", compare_value: [\\\"TESTE FAGRON TECH\\\"]}]}) {\\n              items {\\n                id\\n                name\\n                column_values {\\n                  id\\n                  text\\n                  value\\n                  column {\\n                    title\\n                    id\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      \",\"variables\":{\"boardId\":[\"9572919643\"]}}}",
  "codigo": "ERRO_INTERNO",
  "timestamp": "2025-07-31T15:34:30.121Z"
}
Response headers
 access-control-allow-headers: Origin,X-Requested-With,Content-Type,Accept,Authorization 
 access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS 
 access-control-allow-origin: * 
 alt-svc: h3=":443"; ma=86400 
 cf-cache-status: DYNAMIC 
 cf-ray: 967e29005fcff197-GRU 
 content-encoding: br 
 content-length: 496 
 content-type: application/json; charset=utf-8 
 date: Thu,31 Jul 2025 15:34:30 GMT 
 etag: W/"6f5-PZIQDJDJhZJIC7loYCVB+cgH9Y0" 
 rndr-id: 1bdf5858-9674-4e5f 
 server: cloudflare 
 vary: Accept-Encoding 
 x-powered-by: Express 
 x-render-origin-server: Render 
Responses
Code	Description	Links
200	
Automação executada com sucesso

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "operacao_status": "ok",
  "produto": "BOT",
  "principal_produto": "Fórmula Certa",
  "status": {
    "original": "Na Fila",
    "normalizado": "na_fila"
  },
  "elemento": "12345 - Farmácia Exemplo",
  "campos": {
    "data_solicitacao": "2024-01-10",
    "tipo_rx": "Fórmula Certa"
  },
  "pasta": "C:\\Users\\Usuario\\OneDrive\\#BOT EXTENSÃO\\12345",
  "arquivo_modelo": "C:\\Users\\Usuario\\OneDrive\\#BOT EXTENSÃO\\12345\\Fluxo_Cliente_12345.vsdx",
  "responsavel": "Pedro.Ribeiro@fagrontech.com.br,Bruno.Vaz@fagrontech.com.br",
  "cliente": {
    "id": 12345,
    "nome_farmacia": "Farmácia Exemplo"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
No links
400	
Dados de entrada inválidos

Media type

application/json
Example Value
Schema
{
  "status": "erro",
  "erro": "Campo \"id_cliente\" deve ser um número positivo",
  "codigo": "DADOS_INVALIDOS",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
No links
403	
Sem permissão para criar pastas/arquivos

Media type

application/json
Example Value
Schema
{
  "status": "erro",
  "erro": "string",
  "codigo": "DADOS_INVALIDOS",
  "timestamp": "2025-07-31T15:36:27.169Z"
}
No links
404	
Demanda não encontrada no Monday.com

Media type

application/json
Example Value
Schema
{
  "status": "erro",
  "erro": "Demanda não encontrada para o cliente ID: 12345",
  "codigo": "DEMANDA_NAO_ENCONTRADA",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
No links
500	
Erro interno do servidor

Media type

application/json
Example Value
Schema
{
  "status": "erro",
  "erro": "string",
  "codigo": "DADOS_INVALIDOS",
  "timestamp": "2025-07-31T15:36:27.170Z"
}
No links
503	
Erro de conexão com Monday.com

Media type

application/json
Example Value
Schema
{
  "status": "erro",
  "erro": "string",
  "codigo": "DADOS_INVALIDOS",
  "timestamp": "2025-07-31T15:36:27.171Z"
}
No links
Monday.com
Endpoints para interação com Monday.com



GET
/test-monday
Teste de Conexão Monday

Verifica se a conexão com a API do Monday.com está funcionando

Parameters
Cancel
No parameters

Execute
Clear
Responses
Curl

curl -X 'GET' \
  'https://monday-api-automation.onrender.com/test-monday' \
  -H 'accept: application/json'
Request URL
https://monday-api-automation.onrender.com/test-monday
Server response
Code	Details
200	
Response body
Download
{
  "status": "erro",
  "monday_conectado": false,
  "timestamp": "2025-07-31T15:34:57.699Z"
}
Response headers
 access-control-allow-headers: Origin,X-Requested-With,Content-Type,Accept,Authorization 
 access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS 
 access-control-allow-origin: * 
 alt-svc: h3=":443"; ma=86400 
 cf-cache-status: DYNAMIC 
 cf-ray: 967e29ae4e23aec6-GRU 
 content-encoding: br 
 content-length: 71 
 content-type: application/json; charset=utf-8 
 date: Thu,31 Jul 2025 15:34:57 GMT 
 etag: W/"51-2raqrjFH9elhwZ24Nk/2ARYhtaE" 
 rndr-id: 04fca88f-5a30-448c 
 server: cloudflare 
 vary: Accept-Encoding 
 x-powered-by: Express 
 x-render-origin-server: Render 
Responses
Code	Description	Links
200	
Teste de conexão realizado

Media type

application/json
Controls Accept header.
Examples

Conexão bem-sucedida
Example Value
Schema
{
  "status": "ok",
  "monday_conectado": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
No links
500	
Erro ao testar conexão

Media type

application/json
Example Value
Schema
{
  "status": "erro",
  "erro": "string",
  "codigo": "DADOS_INVALIDOS",
  "timestamp": "2025-07-31T15:36:27.184Z"
}
No links

GET
/produto/{id}
Consultar Produto por ID

Busca o produto associado a um cliente específico no Monday.com

Parameters
Cancel
Name	Description
id *
integer
(path)
ID do cliente

11111
Execute
Clear
Responses
Curl

curl -X 'GET' \
  'https://monday-api-automation.onrender.com/produto/11111' \
  -H 'accept: application/json'
Request URL
https://monday-api-automation.onrender.com/produto/11111
Server response
Code	Details
404	
Error: response status is 404

Response body
Download
{
  "status": "erro",
  "erro": "Not authenticated: {\"response\":{\"errors\":[{\"message\":\"Not authenticated\",\"extensions\":{\"code\":\"NOT_AUTHENTICATED\"}}],\"status\":401,\"headers\":{}},\"request\":{\"query\":\"\\n        query GetItemByClientId($boardId: [ID!]) {\\n          boards(ids: $boardId) {\\n            items_page(query_params: {rules: [{column_id: \\\"text\\\", compare_value: [\\\"11111\\\"]}]}) {\\n              items {\\n                id\\n                name\\n                column_values {\\n                  id\\n                  text\\n                  value\\n                  column {\\n                    title\\n                    id\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      \",\"variables\":{\"boardId\":[\"9572919643\"]}}}",
  "codigo": "PRODUTO_NAO_ENCONTRADO",
  "timestamp": "2025-07-31T15:35:33.706Z"
}
Response headers
 access-control-allow-headers: Origin,X-Requested-With,Content-Type,Accept,Authorization 
 access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS 
 access-control-allow-origin: * 
 alt-svc: h3=":443"; ma=86400 
 cf-cache-status: DYNAMIC 
 cf-ray: 967e2a8f382a01a1-GRU 
 content-encoding: br 
 content-length: 416 
 content-type: application/json; charset=utf-8 
 date: Thu,31 Jul 2025 15:35:33 GMT 
 etag: W/"389-NA7OJCfoDwAbxmLi8+yE3t5SSXM" 
 rndr-id: 977d1d7d-bd34-4f21 
 server: cloudflare 
 vary: Accept-Encoding 
 x-powered-by: Express 
 x-render-origin-server: Render 
Responses
Code	Description	Links
200	
Produto encontrado com sucesso

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "operacao_status": "ok",
  "id_cliente": 12345,
  "produto": "BOT",
  "principal_produto": "Fórmula Certa",
  "status": {
    "original": "Na Fila",
    "normalizado": "na_fila"
  },
  "elemento": "12345 - FARMÁCIA EXEMPLO",
  "campos": {
    "data_solicitacao": "2024-01-10",
    "tipo_rx": "Fórmula Certa"
  },
  "responsavel": "Pedro.Ribeiro@fagrontech.com.br,Bruno.Vaz@fagrontech.com.br",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
No links
400	
ID do cliente inválido

Media type

application/json
Example Value
Schema
{
  "status": "erro",
  "erro": "string",
  "codigo": "DADOS_INVALIDOS",
  "timestamp": "2025-07-31T15:36:27.194Z"
}
No links
404	
Produto não encontrado

Media type

application/json
Example Value
Schema
{
  "status": "erro",
  "erro": "string",
  "codigo": "DADOS_INVALIDOS",
  "timestamp": "2025-07-31T15:36:27.196Z"
}
No links

GET
/api/farmacias/bot
Buscar Farmácias com Produto BOT

Busca todas as farmácias que possuem o produto 'BOT' no Monday.com

Parameters
Cancel
Name	Description
status
string
(query)
Filtrar por status normalizado

na_fila
produto_principal
string
(query)
Filtrar por produto principal

Phusion
Execute
Clear
Responses
Curl

curl -X 'GET' \
  'https://monday-api-automation.onrender.com/api/farmacias/bot?status=na_fila&produto_principal=Phusion' \
  -H 'accept: application/json'
Request URL
https://monday-api-automation.onrender.com/api/farmacias/bot?status=na_fila&produto_principal=Phusion
Server response
Code	Details
500	
Error: response status is 500

Response body
Download
{
  "status": "erro",
  "erro": "Erro interno do servidor",
  "codigo": "ERRO_INTERNO",
  "detalhes": "Not authenticated: {\"response\":{\"errors\":[{\"message\":\"Not authenticated\",\"extensions\":{\"code\":\"NOT_AUTHENTICATED\"}}],\"status\":401,\"headers\":{}},\"request\":{\"query\":\"\\n        query GetAllItems($boardId: ID!) {\\n          boards(ids: [$boardId]) {\\n            items_page {\\n              items {\\n                id\\n                name\\n                column_values {\\n                  id\\n                  text\\n                  value\\n                  column {\\n                    title\\n                    id\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      \",\"variables\":{\"boardId\":\"9572919643\"}}}",
  "timestamp": "2025-07-31T15:35:55.970Z"
}
Response headers
 access-control-allow-headers: Origin,X-Requested-With,Content-Type,Accept,Authorization 
 access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS 
 access-control-allow-origin: * 
 alt-svc: h3=":443"; ma=86400 
 cf-cache-status: DYNAMIC 
 cf-ray: 967e2b1d0baba47f-GRU 
 content-encoding: br 
 content-length: 369 
 content-type: application/json; charset=utf-8 
 date: Thu,31 Jul 2025 15:35:56 GMT 
 etag: W/"349-kXt+n7h5kQJqwN3+BZE1NI5ZzxY" 
 rndr-id: 8bf6e066-3820-4369 
 server: cloudflare 
 vary: Accept-Encoding 
 x-powered-by: Express 
 x-render-origin-server: Render 
Responses
Code	Description	Links
200	
Farmácias com produto BOT encontradas

Media type

application/json
Controls Accept header.
Example Value
Schema
{
  "status": "ok",
  "total": 2,
  "filtros": {
    "status": "na_fila",
    "produto_principal": "Fórmula Certa"
  },
  "farmacias": [
    {
      "id": "123456789",
      "elemento": "2707 - BOULEVARD PHARMA",
      "produto": "BOT",
      "principal_produto": "Fórmula Certa",
      "status": {
        "original": "Na Fila",
        "normalizado": "na_fila"
      }
    },
    {
      "id": "987654321",
      "elemento": "3456 - FARMÁCIA CENTRAL",
      "produto": "BOT",
      "principal_produto": "Fórmula Certa",
      "status": {
        "original": "Na Fila",
        "normalizado": "na_fila"
      }
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
No links
500	
Erro interno do servidor

Media type

application/json
Example Value
Schema
{
  "status": "erro",
  "erro": "string",
  "codigo": "DADOS_INVALIDOS",
  "timestamp": "2025-07-31T15:36:27.202Z"
}
No links
Webhook
Endpoints para receber notificações automáticas



POST
/webhook/monday
Webhook do Monday.com

Endpoint para receber notificações automáticas do Monday.com quando o produto 'BOT' é selecionado

Parameters
Cancel
Reset
No parameters

Request body

application/json
Edit Value
Schema
{
  "event": {
    "type": "change_column_value",
    "columnId": "produto",
    "pulseId": "11111"
  }
}
Execute
Clear
Responses
Curl

curl -X 'POST' \
  'https://monday-api-automation.onrender.com/webhook/monday' \
  -H 'accept: text/plain' \
  -H 'Content-Type: application/json' \
  -d '{
  "event": {
    "type": "change_column_value",
    "columnId": "produto",
    "pulseId": "11111"
  }
}'
Request URL
https://monday-api-automation.onrender.com/webhook/monday
Server response
Code	Details
200	
Response body
Download
{
  "status": "ok",
  "message": "Webhook processado com sucesso",
  "pulseId": "11111",
  "timestamp": "2025-07-31T15:36:26.667Z"
}
Response headers
 access-control-allow-headers: Origin,X-Requested-With,Content-Type,Accept,Authorization 
 access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS 
 access-control-allow-origin: * 
 alt-svc: h3=":443"; ma=86400 
 cf-cache-status: DYNAMIC 
 cf-ray: 967e2bdb483d0ed6-GRU 
 content-encoding: br 
 content-length: 98 
 content-type: application/json; charset=utf-8 
 date: Thu,31 Jul 2025 15:36:26 GMT 
 etag: W/"73-MpC8sXevgVOZqE4PB4yJlNB5W0k" 
 rndr-id: cfd2acbf-7977-4877 
 server: cloudflare 
 vary: Accept-Encoding 
 x-powered-by: Express 
 x-render-origin-server: Render 
Responses
Code	Description	Links
200	
Webhook processado com sucesso

Media type

text/plain
Controls Accept header.
Example Value
Schema
Webhook recebido com sucesso
No links
500	
Erro ao processar webhook

Media type

text/plain
Example Value
Schema
Erro ao processar webhook
No links

Schemas
AutomacaoRequest
AutomacaoSuccessResponse
ErrorResponse
HealthResponse
MondayTestResponse
ProdutoResponse
FarmaciasBOTResponse
ConfigResponse
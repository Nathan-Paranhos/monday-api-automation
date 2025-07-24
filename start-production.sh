#!/bin/bash

# Script de inicialização para produção
# Monday.com API Automation - Production Deployment

echo "🚀 Iniciando deploy de produção..."

# Verifica se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js 18+ antes de continuar."
    exit 1
fi

# Verifica a versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versão 18+ é necessária. Versão atual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Verifica se o arquivo .env.production existe
if [ ! -f ".env.production" ]; then
    echo "❌ Arquivo .env.production não encontrado!"
    echo "📝 Criando arquivo .env.production baseado no exemplo..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env.production
        echo "⚠️  Por favor, configure as variáveis de ambiente em .env.production antes de continuar."
        exit 1
    else
        echo "❌ Arquivo .env.example também não encontrado!"
        exit 1
    fi
fi

echo "✅ Arquivo .env.production encontrado"

# Instala as dependências
echo "📦 Instalando dependências..."
npm install --production

if [ $? -ne 0 ]; then
    echo "❌ Falha ao instalar dependências"
    exit 1
fi

echo "✅ Dependências instaladas com sucesso"

# Executa testes básicos
echo "🧪 Executando testes básicos..."
npm run test-detection

if [ $? -ne 0 ]; then
    echo "⚠️  Testes falharam, mas continuando com o deploy..."
fi

# Cria diretórios necessários para logs
mkdir -p logs

echo "📁 Estrutura de diretórios criada"

# Inicia o servidor de produção
echo "🌐 Iniciando servidor de produção na porta ${PORT:-10000}..."
echo "📋 Board ID: $(grep MONDAY_BOARD_ID .env.production | cut -d'=' -f2)"
echo "🔗 Webhook URL: http://localhost:${PORT:-10000}/webhook/monday"
echo "❤️  Health Check: http://localhost:${PORT:-10000}/health"
echo ""
echo "🎯 Para parar o servidor, pressione Ctrl+C"
echo "📊 Logs serão salvos automaticamente"
echo ""

# Executa o servidor
NODE_ENV=production node deploy-production.js
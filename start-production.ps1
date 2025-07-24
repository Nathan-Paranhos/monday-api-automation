# Script de inicialização para produção - Windows PowerShell
# Monday.com API Automation - Production Deployment

Write-Host "🚀 Iniciando deploy de produção..." -ForegroundColor Green

# Verifica se o Node.js está instalado
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js $nodeVersion detectado" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Por favor, instale o Node.js 18+ antes de continuar." -ForegroundColor Red
    exit 1
}

# Verifica a versão do Node.js
$versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($versionNumber -lt 18) {
    Write-Host "❌ Node.js versão 18+ é necessária. Versão atual: $nodeVersion" -ForegroundColor Red
    exit 1
}

# Verifica se o arquivo .env.production existe
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ Arquivo .env.production não encontrado!" -ForegroundColor Red
    Write-Host "📝 Criando arquivo .env.production baseado no exemplo..." -ForegroundColor Yellow
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.production"
        Write-Host "⚠️  Por favor, configure as variáveis de ambiente em .env.production antes de continuar." -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "❌ Arquivo .env.example também não encontrado!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Arquivo .env.production encontrado" -ForegroundColor Green

# Instala as dependências
Write-Host "📦 Instalando dependências..." -ForegroundColor Cyan
npm install --production

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falha ao instalar dependências" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependências instaladas com sucesso" -ForegroundColor Green

# Executa testes básicos
Write-Host "🧪 Executando testes básicos..." -ForegroundColor Cyan
npm run test-detection

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Testes falharam, mas continuando com o deploy..." -ForegroundColor Yellow
}

# Cria diretórios necessários para logs
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

Write-Host "📁 Estrutura de diretórios criada" -ForegroundColor Green

# Lê a porta do arquivo .env.production
$port = "10000"
if (Test-Path ".env.production") {
    $envContent = Get-Content ".env.production"
    $portLine = $envContent | Where-Object { $_ -match "^PORT=" }
    if ($portLine) {
        $port = ($portLine -split "=")[1]
    }
}

# Lê o Board ID
$boardId = "N/A"
if (Test-Path ".env.production") {
    $envContent = Get-Content ".env.production"
    $boardLine = $envContent | Where-Object { $_ -match "^MONDAY_BOARD_ID=" }
    if ($boardLine) {
        $boardId = ($boardLine -split "=")[1]
    }
}

# Inicia o servidor de produção
Write-Host "🌐 Iniciando servidor de produção na porta $port..." -ForegroundColor Green
Write-Host "📋 Board ID: $boardId" -ForegroundColor Cyan
Write-Host "🔗 Webhook URL: http://localhost:$port/webhook/monday" -ForegroundColor Cyan
Write-Host "❤️  Health Check: http://localhost:$port/health" -ForegroundColor Cyan
Write-Host "" 
Write-Host "🎯 Para parar o servidor, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host "📊 Logs serão salvos automaticamente" -ForegroundColor Yellow
Write-Host ""

# Define variável de ambiente e executa o servidor
$env:NODE_ENV = "production"
node deploy-production.js
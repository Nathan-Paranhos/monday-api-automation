#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
  PM2_APP_NAME: 'monitor-bot',
  API_URL: 'https://monday-api-automation.onrender.com',
  LOG_DIR: './logs',
  ECOSYSTEM_FILE: './ecosystem.config.js'
};

// Função para criar logs
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

// Função para executar comandos
function executeCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    log(`Executando: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Comando falhou com código ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Função para verificar se o PM2 está instalado
async function checkPM2() {
  try {
    await executeCommand('pm2', ['--version']);
    log('PM2 encontrado');
    return true;
  } catch (error) {
    log('PM2 não encontrado, instalando globalmente...', 'WARN');
    try {
      await executeCommand('npm', ['install', '-g', 'pm2']);
      log('PM2 instalado com sucesso');
      return true;
    } catch (installError) {
      log('Falha ao instalar PM2', 'ERROR');
      return false;
    }
  }
}

// Função para verificar dependências
async function checkDependencies() {
  log('Verificando dependências...');
  
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const dependencies = packageJson.dependencies || {};
  
  if (!dependencies.axios) {
    log('Instalando axios...', 'WARN');
    try {
      await executeCommand('npm', ['install', 'axios']);
      log('Axios instalado com sucesso');
    } catch (error) {
      log('Falha ao instalar axios', 'ERROR');
      throw error;
    }
  }
  
  log('Dependências verificadas');
}

// Função para criar diretório de logs
function ensureLogDirectory() {
  if (!fs.existsSync(CONFIG.LOG_DIR)) {
    fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    log(`Diretório de logs criado: ${CONFIG.LOG_DIR}`);
  }
}

// Função para parar processos PM2 existentes
async function stopExistingProcesses() {
  try {
    log('Parando processos PM2 existentes...');
    await executeCommand('pm2', ['stop', CONFIG.PM2_APP_NAME]);
    await executeCommand('pm2', ['delete', CONFIG.PM2_APP_NAME]);
    log('Processos existentes removidos');
  } catch (error) {
    log('Nenhum processo existente encontrado ou erro ao parar', 'WARN');
  }
}

// Função para iniciar o monitoramento
async function startMonitoring() {
  try {
    log('Iniciando monitoramento com PM2...');
    
    // Usar o arquivo ecosystem.config.js se existir, senão usar configuração direta
    if (fs.existsSync(CONFIG.ECOSYSTEM_FILE)) {
      await executeCommand('pm2', ['start', CONFIG.ECOSYSTEM_FILE, '--env', 'production']);
    } else {
      await executeCommand('pm2', ['start', 'monitorBotService.js', '--name', CONFIG.PM2_APP_NAME]);
    }
    
    log('Monitoramento iniciado com sucesso!');
    
    // Salvar configuração do PM2
    await executeCommand('pm2', ['save']);
    
    // Configurar startup automático
    try {
      await executeCommand('pm2', ['startup']);
      log('Startup automático configurado');
    } catch (error) {
      log('Aviso: Não foi possível configurar startup automático', 'WARN');
    }
    
  } catch (error) {
    log(`Erro ao iniciar monitoramento: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Função para mostrar status
async function showStatus() {
  try {
    log('Status dos processos PM2:');
    await executeCommand('pm2', ['status']);
    
    log('\nPara monitorar logs em tempo real:');
    console.log(`pm2 logs ${CONFIG.PM2_APP_NAME}`);
    
    log('\nPara monitorar performance:');
    console.log('pm2 monit');
    
    log('\nPara reiniciar o serviço:');
    console.log(`pm2 restart ${CONFIG.PM2_APP_NAME}`);
    
  } catch (error) {
    log(`Erro ao mostrar status: ${error.message}`, 'ERROR');
  }
}

// Função principal
async function main() {
  try {
    log('=== INICIANDO CONFIGURAÇÃO DO MONITOR BOT ===');
    log(`API de Produção: ${CONFIG.API_URL}`);
    
    // 1. Verificar PM2
    const pm2Available = await checkPM2();
    if (!pm2Available) {
      throw new Error('PM2 não pôde ser instalado');
    }
    
    // 2. Verificar dependências
    await checkDependencies();
    
    // 3. Criar diretório de logs
    ensureLogDirectory();
    
    // 4. Parar processos existentes
    await stopExistingProcesses();
    
    // 5. Iniciar monitoramento
    await startMonitoring();
    
    // 6. Mostrar status
    await showStatus();
    
    log('=== CONFIGURAÇÃO CONCLUÍDA COM SUCESSO ===');
    log('O sistema está agora monitorando automaticamente as demandas BOT');
    log('Todas as ações serão executadas automaticamente conforme configurado');
    
  } catch (error) {
    log(`ERRO FATAL: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main, CONFIG };
module.exports = {
  apps: [{
    name: 'monitor-bot',
    script: 'monitorBotService.js',
    watch: false, // Desabilitado para produção
    ignore_watch: ['node_modules', 'logs', '.git'],
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      API_BASE_URL: 'http://localhost:10000'
    },
    env_production: {
      NODE_ENV: 'production',
      API_BASE_URL: 'https://monday-api-automation.onrender.com'
    },
    max_memory_restart: '512M',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '30s',
    restart_delay: 5000,
    kill_timeout: 5000,
    listen_timeout: 10000,
    cron_restart: '0 2 * * *' // Reinicia diariamente às 2h da manhã
  }]
};
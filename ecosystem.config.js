module.exports = {
  apps: [{
    name: 'monitor-bot',
    script: 'monitorBotService.js',
    watch: ['src/', 'monitorBotService.js'],
    ignore_watch: ['logs', 'node_modules', '.env'],
    env_production: {
      NODE_ENV: 'production'
    },
    max_memory_restart: '200M',
    error_file: 'logs/pm2/error.log',
    out_file: 'logs/pm2/out.log',
    log_file: 'logs/pm2/combined.log',
    time: true,
    instance_var: 'INSTANCE_ID',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    exp_backoff_restart_delay: 100
  }]
};
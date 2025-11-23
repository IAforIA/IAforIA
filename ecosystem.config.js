# PM2 Ecosystem Configuration
# Auto-generated - Do not edit manually

module.exports = {
  apps: [
    {
      name: 'guriri-express',
      script: './dist/index.js',
      cwd: '/var/www/guriri-express/GuririExpress',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        WS_PORT: 5001,
      },
      error_file: '/var/log/pm2/guriri-express-error.log',
      out_file: '/var/log/pm2/guriri-express-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000,
    },
  ],
};

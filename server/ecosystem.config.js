module.exports = {
  apps: [{
    name: 'daily-server',
    script: 'src/app.js',
    cwd: './',
    instances: 1,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
  }],
};

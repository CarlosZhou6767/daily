/**
 * PM2 进程管理配置
 * 用于生产环境部署：进程守护、自动重启、日志管理
 * 启动命令：pm2 start ecosystem.config.js
 * 单实例模式（instances: 1），适合 SQLite 单写场景
 */
module.exports = {
  apps: [{
    // 应用名称：在 PM2 列表和日志中显示
    name: 'daily-server',

    // 入口脚本：相对于 cwd 的路径
    script: 'src/app.js',

    // 工作目录：server/ 目录
    cwd: './',

    // 实例数量：1（SQLite 不支持多实例并发写）
    instances: 1,

    // 内存上限（MB）：超过自动重启，防止内存泄漏
    max_memory_restart: '300M',

    // 环境变量注入
    env: {
      NODE_ENV: 'production',  // 生产模式：隐藏详细错误栈
      PORT: 3000,              // 监听端口
    },

    // 错误日志路径：记录未捕获异常和 stderr
    error_file: './logs/error.log',

    // 标准输出日志路径：记录 console.log 和 stdout
    out_file: './logs/out.log',

    // 日志时间格式
    log_date_format: 'YYYY-MM-DD HH:mm:ss',

    // 合并日志：多实例写同一个文件
    merge_logs: true,

    // 自动重启：进程异常退出后自动拉起
    autorestart: true,

    // 最大重启次数：防止无限重启死循环
    max_restarts: 10,

    // 重启延迟（毫秒）：避免频繁重启
    restart_delay: 3000,
  }],
};

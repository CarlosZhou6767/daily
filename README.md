# Daily - 习惯打卡系统

> 一款全栈习惯追踪应用，包含积分奖励、抽奖游戏和管理后台。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0-green.svg)
![Vue](https://img.shields.io/badge/vue-3.4-brightgreen.svg)
![Database](https://img.shields.io/badge/database-better--sqlite3-orange.svg)

---

## 功能特性

- **习惯追踪**：创建自定义任务并追踪每日进度
- **积分系统**：通过打卡、上传奖励和连续打卡获得积分
- **抽奖游戏**：消耗积分参与概率抽奖，赢取奖励
- **管理后台**：管理用户、打卡记录、积分、奖品和系统备份
- **响应式设计**：适配桌面、平板和手机
- **深色模式**：支持浅色与深色主题切换
- **微信小程序集成**：支持微信生态

---

## 技术栈

### 后端

- **运行环境**：Node.js 18+
- **框架**：Express.js
- **数据库**：better-sqlite3（原生 C++ SQLite）
- **身份认证**：JWT (jsonwebtoken)
- **密码加密**：bcryptjs
- **文件上传**：Multer
- **图片处理**：Sharp
- **备份工具**：Archiver (ZIP 打包)

### 前端

- **框架**：Vue 3.4（组合式 API）
- **构建工具**：Vite 5
- **状态管理**：Pinia 2.1
- **路由**：Vue Router 4.3
- **HTTP 客户端**：Axios 1.7
- **样式方案**：Tailwind CSS 3.4

### 管理后台

- Vue 3 + Vite + Tailwind CSS
- Chart.js 数据可视化

---

## 快速开始

### 前置要求

- Node.js 18+
- Python 3（用于 better-sqlite3 原生编译）
- 编译工具（Linux: gcc/make，Windows: Visual Studio Build Tools）

### 安装依赖

```bash
# 后端
cd server && npm install

# 前端
cd web && npm install

# 管理后台
cd admin && npm install
```

### 开发模式

```bash
# 终端 1 - 后端 API
cd server && npm run dev

# 终端 2 - 前端
cd web && npm run dev

# 终端 3 - 管理后台（可选）
cd admin && npm run dev
```

- **后端 API**：http://localhost:3000
- **前端**：http://localhost:5173
- **管理后台**：http://localhost:5174

### 默认管理员账号

```text
用户名: admin
密码: changeme
```

> **注意**：生产环境务必修改默认密码。

---

## 环境变量

```bash
# 服务器配置
PORT=3000
NODE_ENV=production

# JWT 配置
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# 管理员配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=strong_password

# CORS 配置
CORS_ORIGIN=http://localhost:5173
```

---

## 项目结构

```text
Daily/
├── server/                  # 后端 API 服务
│   ├── src/
│   │   ├── app.js          # Express 应用入口
│   │   ├── config/         # 配置文件
│   │   ├── db/             # 数据库层
│   │   ├── middleware/     # 认证与上传中间件
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 业务逻辑层
│   │   └── utils/          # 工具函数
│   └── data/               # SQLite 数据库
├── web/                    # 用户端 Web 应用
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── components/     # UI 组件
│   │   ├── stores/         # Pinia 状态管理
│   │   └── styles/         # Tailwind 配置
│   └── package.json
├── admin/                  # 管理后台
│   └── src/
│       ├── views/          # 管理页面
│       ├── components/     # 管理后台组件
│       └── router/         # 路由配置
└── miniapp/                # 微信小程序
```

---

## API 接口

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册新用户 |
| POST | `/api/auth/login` | 登录并获取 JWT Token |
| POST | `/api/auth/wechat-login` | 微信小程序登录 |

### 打卡接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/checkin/today` | 是 | 获取今日打卡状态 |
| POST | `/api/checkin/do` | 是 | 执行打卡 |
| GET | `/api/checkin/history` | 是 | 获取打卡历史记录 |
| GET | `/api/checkin/streak` | 是 | 获取连续打卡天数 |
| POST | `/api/checkin/task` | 是 | 创建自定义任务 |
| DELETE | `/api/checkin/task/:id` | 是 | 删除任务 |

### 积分与抽奖接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/points/balance` | 是 | 获取积分余额 |
| GET | `/api/points/log` | 是 | 获取积分流水 |
| GET | `/api/lottery/prizes` | 是 | 获取所有奖品 |
| POST | `/api/lottery/draw` | 是 | 执行抽奖（20 积分） |
| GET | `/api/lottery/records` | 是 | 获取抽奖记录 |

### 上传接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/upload` | 是 | 上传图片 |

### 管理接口

| 方法 | 路径 | 管理员 | 说明 |
|------|------|--------|------|
| GET | `/api/admin/dashboard` | 是 | 面板统计数据 |
| GET | `/api/admin/users` | 是 | 用户列表 |
| PUT | `/api/admin/users/:id/status` | 是 | 更新用户状态 |
| POST | `/api/admin/checkin/makeup` | 是 | 补打卡 |
| POST | `/api/admin/points/adjust` | 是 | 调整用户积分 |
| POST | `/api/admin/prizes` | 是 | 管理奖品 |
| GET | `/api/admin/backup` | 是 | 下载备份 ZIP |

完整 API 文档请参阅 [技术文档](docs/TechnicalDocumentation.md)。

---

## 积分规则

### 获得积分

| 操作 | 积分 |
|------|------|
| 每日打卡 | +10 |
| 上传图片 | +5 |
| 连续 3 天打卡 | +20 额外奖励 |
| 连续 7 天打卡 | +50 额外奖励 |
| 连续 30 天打卡 | +200 额外奖励 |

### 消耗积分

| 操作 | 消耗 |
|------|------|
| 抽奖一次 | -20 |

---

## 部署指南

### 生产构建

```bash
# 前端
cd web && npm run build

# 管理后台
cd admin && npm run build
```

### 使用 PM2 进程管理

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server/src/app.js --name daily

# 设置开机自启
pm2 startup
pm2 save
```

### 数据库备份

```bash
# 通过 API 接口（仅管理员）
curl http://your-server:3000/api/admin/backup \
  -H "Authorization: Bearer <admin_token>" \
  -o daily-backup.zip
```

---

## 文档

- [技术文档](docs/TechnicalDocumentation.md) - 架构设计、API 接口文档、数据库设计
- [安全修复报告](docs/SecurityFixReport.md) - 安全漏洞修复记录
- [代码审查报告](docs/CodeReviewReport.md) - 代码质量审查结果

---

## 开源协议

本项目采用 [MIT](LICENSE) 开源协议。

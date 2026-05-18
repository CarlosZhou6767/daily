# Daily - 技术文档

> **版本**: 2.0
> **更新日期**: 2026-04-17
> **技术栈**: Node.js + Express + SQLite (better-sqlite3) / Vue 3 + Vite / 管理后台 / 小程序

---

## 目录

- [项目概述](#项目概述)
- [系统架构](#系统架构)
- [后端架构](#后端架构)
- [数据库设计](#数据库设计)
- [API 接口文档](#api-接口文档)
- [前端架构](#前端架构)
- [管理后台架构](#管理后台架构)
- [安全设计](#安全设计)
- [部署指南](#部署指南)
- [性能优化](#性能优化)

---

## 项目概述

Daily 是一款习惯打卡系统，允许用户追踪每日任务、获取积分并参与抽奖。系统由四个部分组成：

1. **服务端**（Node.js + Express + better-sqlite3）- RESTful API 后端
2. **Web 端**（Vue 3 + Vite + Tailwind CSS）- 用户端 Web 应用
3. **管理后台**（Vue 3 + Vite + Tailwind CSS）- 管理员管理面板
4. **小程序**（微信小程序）- 移动端微信小程序集成

### 目录结构

```text
Daily/
├── server/                  # 后端 API 服务
│   ├── src/
│   │   ├── app.js          # Express 应用入口
│   │   ├── config/         # 配置文件（数据库、JWT、规则）
│   │   ├── db/             # 数据库层（better-sqlite3）
│   │   ├── middleware/      # 认证、文件上传中间件
│   │   ├── routes/         # API 路由处理器
│   │   ├── services/       # 业务逻辑层
│   │   └── utils/          # 工具函数（备份、日期、图片压缩）
│   ├── data/               # SQLite 数据库文件
│   ├── uploads/            # 上传的图片
│   └── backups/            # 备份 ZIP 文件
├── web/                    # 前端 Web 应用
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── components/     # 可复用 UI 组件
│   │   ├── router/         # Vue Router 路由配置
│   │   ├── stores/         # Pinia 状态管理
│   │   └── styles/         # 全局 CSS 和 Tailwind 配置
│   └── package.json
├── admin/                  # 管理后台
│   ├── src/
│   │   ├── views/          # 管理后台页面
│   │   ├── components/     # 管理后台 UI 组件
│   │   ├── router/         # 路由配置
│   │   └── styles/         # 管理后台样式
│   └── package.json
└── miniapp/                # 微信小程序
    └── src/
        └── pages/          # 小程序页面
```

---

## 系统架构

### 整体架构

```text
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Web 应用   │    │  管理后台    │    │  微信小程序   │
│  (Vue 3)    │    │  (Vue 3)    │    │  (WeChat)   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │ HTTP/REST
                   ┌──────▼──────┐
                   │  服务端      │
                   │ Express.js  │
                   └──────┬──────┘
                          │ better-sqlite3
                   ┌──────▼──────┐
                   │   SQLite    │
                   │  daily.db   │
                   └─────────────┘
```

### 数据库引擎

系统使用 **better-sqlite3** 作为数据库引擎，这是 Node.js 的原生 C++ SQLite 绑定：

- 直接连接磁盘文件，无需加载到内存
- 数据实时写入磁盘，零丢失风险
- WAL 模式支持读写并发
- 在 2核2G 服务器上内存占用约 40MB
- 比基于 WASM 的 sql.js 快 3-5 倍

---

## 后端架构

### 服务入口

`server/src/app.js` - Express 应用，包含：

- 速率限制（15 分钟内最多 100 次请求）
- CORS 中间件
- JSON 请求体解析（10MB 限制）
- 上传文件静态资源服务
- 集中式错误处理
- 健康检查端点

### 配置管理

`server/src/config/index.js`：

- 数据库路径：`server/data/daily.db`
- JWT 密钥与过期时间（默认 7 天）
- 积分规则：打卡（+10）、图片（+5）、连续奖励（+20/+50/+200）
- 默认任务：运动、阅读、学习、早起
- 默认奖品：5 个等级，基于概率的奖励机制

### 数据库层

`server/src/db/index.js`：

```javascript
// 单例模式获取数据库连接
function getDb() {
  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -2000');
  db.pragma('temp_store = MEMORY');
  db.pragma('foreign_keys = ON');
  initSQL(db);
  return db;
}
```

`server/src/db/init.js`：

- 创建 8 张表：users、tasks、checkins、points_log、prizes、lottery_records、admin_logs、images
- 初始化默认管理员账号和 5 个默认奖品

### 服务层

| 服务 | 文件 | 功能说明 |
|------|------|---------|
| 打卡服务 | `checkinService.js` | 打卡操作、连续天数计算、任务管理 |
| 用户服务 | `userService.js` | 注册、登录、微信登录、资料管理 |
| 积分服务 | `pointsService.js` | 余额查询、流水记录、积分调整 |
| 抽奖服务 | `lotteryService.js` | 奖品查询、抽奖算法、中奖记录 |
| 管理服务 | `adminService.js` | 面板统计、用户管理、补打卡 |

### 中间件

| 中间件 | 文件 | 功能说明 |
|--------|------|---------|
| 认证中间件 | `auth.js` | 从 Authorization 请求头提取并验证 JWT Token |
| 上传中间件 | `upload.js` | Multer 文件上传，图片验证，10MB 限制 |

### 工具模块

| 模块 | 文件 | 功能说明 |
|------|------|---------|
| 备份工具 | `backup.js` | 数据库 + 上传目录 ZIP 打包 |
| 日期工具 | `dateHelper.js` | 日期格式化和月份日期范围生成 |
| 图片压缩 | `imageCompress.js` | 基于 Sharp 的图片压缩与 WebP 转换 |

---

## 数据库设计

### 8 张表

```text
users（用户表）
├── id（主键）
├── username（唯一用户名）
├── password（bcrypt 加密）
├── nickname（昵称）、avatar（头像）、phone（手机）、wechat_openid（微信标识）
├── points（当前积分余额）
├── total_checkin_days（总打卡天数）、current_streak（当前连续天数）、longest_streak（最长连续天数）
├── status（状态）、theme（主题）、is_admin（是否管理员）
└── created_at（创建时间）、updated_at（更新时间）

tasks（打卡任务表）
├── id（主键）
├── user_id（外键 -> users）
├── name（名称）、icon（图标）、description（描述）
├── is_default（是否默认任务）、status（状态）
└── created_at（创建时间）

checkins（打卡记录表）
├── id（主键）
├── user_id（外键）、task_id（外键）、checkin_date（打卡日期）
├── image_path（图片路径）、note（备注）、points_earned（获得积分）
├── is_makeup（是否补打卡）、makeup_by（补打卡操作人）
└── created_at（创建时间）
唯一约束：UNIQUE(user_id, task_id, checkin_date)

points_log（积分流水表）
├── id（主键）
├── user_id（外键）
├── type（类型：checkin|image|streak_bonus|lottery|lottery_reward|admin_adjust）
├── amount（积分数量，正数为增加，负数为扣减）
├── description（描述）、related_id（关联 ID）
└── created_at（创建时间）

prizes（奖品表）
├── id（主键）
├── name（名称）、description（描述）、image（图片）
├── probability（概率）、prize_type（类型）、points_reward（积分奖励）
├── stock（库存，-1 表示无限制）
├── status（状态）
└── created_at（创建时间）

lottery_records（抽奖记录表）
├── id（主键）
├── user_id（外键）、prize_id（外键）
├── points_cost（消耗积分）、is_received（是否已领取）
└── created_at（创建时间）

admin_logs（管理员操作日志表）
├── id（主键）
├── admin_id（管理员 ID）
├── action（操作类型）、target_type（目标类型）、target_id（目标 ID）
├── detail（操作详情，JSON 格式）
└── created_at（创建时间）

images（图片资源表）
├── id（主键）
├── user_id（外键）
├── file_path（文件路径）、original_name（原始文件名）、file_size（文件大小）
├── width（宽度）、height（高度）、related_type（关联类型）、related_id（关联 ID）
├── status（状态）
└── created_at（创建时间）
```

### 索引

```sql
idx_checkins_user_date ON checkins(user_id, checkin_date)     -- 优化用户日期查询
idx_points_log_user ON points_log(user_id)                     -- 优化用户积分流水查询
idx_lottery_records_user ON lottery_records(user_id)           -- 优化用户抽奖记录查询
idx_admin_logs_time ON admin_logs(created_at)                  -- 优化日志时间查询
idx_images_user ON images(user_id)                             -- 优化用户图片查询
```

---

## API 接口文档

### 基础地址

```text
http://localhost:3000/api
```

### 认证方式

所有受保护的接口需要在请求头中携带：

```text
Authorization: Bearer <JWT_TOKEN>
```

### 接口列表

#### 认证接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/health` | 否 | 健康检查 |
| POST | `/auth/register` | 否 | 注册新用户 |
| POST | `/auth/login` | 否 | 登录并获取 Token |
| POST | `/auth/wechat-login` | 否 | 微信小程序登录 |

#### 打卡接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/checkin/today` | 是 | 获取今日所有任务的打卡状态 |
| POST | `/checkin/do` | 是 | 执行打卡（taskId、image、note） |
| GET | `/checkin/history` | 是 | 获取分页打卡历史记录 |
| GET | `/checkin/streak` | 是 | 获取当前和最长连续天数 |
| POST | `/checkin/task` | 是 | 创建自定义任务 |
| DELETE | `/checkin/task/:taskId` | 是 | 删除任务（软删除） |
| GET | `/checkin/tasks` | 是 | 获取所有活跃任务 |

#### 积分接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/points/balance` | 是 | 获取当前积分余额 |
| GET | `/points/log` | 是 | 获取分页积分流水记录 |

#### 抽奖接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/lottery/prizes` | 是 | 获取所有活跃奖品 |
| POST | `/lottery/draw` | 是 | 执行抽奖（消耗 20 积分） |
| GET | `/lottery/records` | 是 | 获取用户抽奖历史记录 |

#### 上传接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/upload` | 是 | 上传图片（multipart/form-data） |

#### 管理接口（所有接口需要管理员权限）

| 方法 | 路径 | 管理员 | 说明 |
|------|------|--------|------|
| GET | `/admin/dashboard` | 是 | 获取面板统计数据 |
| POST | `/admin/checkin/makeup` | 是 | 管理员补打卡 |
| POST | `/admin/points/adjust` | 是 | 调整用户积分 |
| GET | `/admin/users` | 是 | 获取用户列表（分页、可搜索） |
| PUT | `/admin/users/:id/status` | 是 | 更新用户状态 |
| GET | `/admin/checkins` | 是 | 获取所有打卡记录 |
| GET | `/admin/points-log` | 是 | 获取所有积分流水 |
| POST | `/admin/prizes` | 是 | 管理奖品（创建/更新/删除） |
| GET | `/admin/lottery-records` | 是 | 获取所有抽奖记录 |
| GET | `/admin/images` | 是 | 获取所有上传图片 |
| GET | `/admin/logs` | 是 | 获取管理员操作日志 |
| GET | `/admin/backup` | 是 | 创建数据库备份（返回 ZIP） |

---

## 前端架构

### 技术栈

- Vue 3.4 组合式 API（`<script setup>`）
- Vite 5 构建工具
- Tailwind CSS 3.4
- Pinia 2.1（状态管理）
- Vue Router 4.3
- Axios 1.7

### 组件结构

```text
src/
├── views/
│   ├── Login.vue          # 登录页面
│   ├── Register.vue       # 注册页面
│   ├── Dashboard.vue      # 主仪表盘（统计卡片、今日任务、周趋势图、打卡日历）
│   ├── PointsCenter.vue   # 积分中心（积分概览、流水列表、规则说明、快捷抽奖）
│   ├── Lottery.vue        # 幸运抽奖（Canvas 转盘）
│   ├── CheckinRecords.vue # 打卡记录（月度日历 + 圆圈标记）
│   └── Settings.vue       # 个人设置（资料、主题、数据管理）
├── components/
│   ├── Sidebar.vue        # 固定左侧导航栏（256px）
│   └── TopBar.vue         # 顶部信息栏（连续天数、积分、今日进度）
├── stores/
│   ├── auth.js            # 认证状态
│   ├── user.js            # 用户资料状态
│   ├── checkin.js         # 打卡状态
│   └── theme.js           # 深色/浅色主题状态
└── router/
    └── index.js           # 路由定义与认证守卫
```

### 颜色方案

| 变量 | 色值 | 用途 |
|------|------|------|
| brand-500 | #43d94a | 主按钮、链接 |
| brand-600 | #35b93c | 悬停状态 |
| mint-50 | #f0fdf4 | 卡片背景 |
| slate-50 | #f8fafc | 页面背景 |
| slate-950 | #020617 | 深色模式背景 |

### 路由配置

| 路径 | 组件 | 守卫 |
|------|------|------|
| `/login` | Login | 仅访客访问 |
| `/register` | Register | 仅访客访问 |
| `/` | Dashboard | 需要登录 |
| `/points` | PointsCenter | 需要登录 |
| `/lottery` | Lottery | 需要登录 |
| `/history` | CheckinRecords | 需要登录 |
| `/profile` | Settings | 需要登录 |

---

## 管理后台架构

### 技术栈

- Vue 3 + Vite + Tailwind CSS
- Pinia + Vue Router + Axios
- Chart.js 数据可视化

### 功能模块

- 仪表盘（统计卡片 + 趋势图表）
- 用户管理（列表、搜索、启用/禁用）
- 打卡记录查看
- 积分流水查看
- 奖品管理
- 抽奖记录查看
- 图片库查看
- 管理员操作日志查看
- 数据库备份下载

---

## 安全设计

### 身份认证

- JWT Token 7 天过期
- bcrypt 密码加密（10 轮迭代）
- 管理接口需要 `is_admin = 1` 标志

### 速率限制

- 15 分钟窗口内最多 100 次请求
- 应用于所有 `/api/*` 接口

### CORS 配置

- 通过 `CORS_ORIGIN` 环境变量配置来源
- 启用凭证支持（Cookie）

### 文件上传

- 仅允许图片格式（jpg、jpeg、png、gif、webp）
- 10MB 文件大小限制
- 使用 Sharp 库自动压缩

### 数据保护

- 数据库目录仅限系统/管理员访问
- 所有管理操作记录审计日志
- 自动备份并 ZIP 压缩

---

## 部署指南

### 前置要求

- Node.js 18+
- Python 3 + 编译工具（用于 better-sqlite3 原生编译）

### 后端部署

```bash
cd server
npm install
npm run dev          # 开发模式
npm start            # 生产模式
```

### 环境变量

```bash
PORT=3000
NODE_ENV=production
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
CORS_ORIGIN=http://localhost:5173
```

### 前端部署

```bash
cd web
npm install
npm run dev          # 开发模式（端口 5173）
npm run build        # 生产构建
```

### 使用 PM2 生产部署

```bash
pm2 start server/src/app.js --name daily
pm2 save
pm2 startup
```

### 数据库备份

```bash
# 通过 API 接口（仅管理员）
curl http://localhost:3000/api/admin/backup \
  -H "Authorization: Bearer <admin_token>" \
  -o backup.zip
```

---

## 性能优化

### 数据库优化

- 启用 WAL 模式以支持读写并发
- 配置 2MB 缓存大小
- 内存映射 I/O 加速读取操作
- 用户/日期查询建立索引

### 服务端优化

- 所有响应启用 Gzip 压缩
- 上传文件静态资源服务
- 速率限制防止滥用
- 优雅关闭并清理数据库连接

### 前端优化

- Vite 代码分割
- 未使用依赖的 Tree Shaking
- Tailwind CSS 清除未使用的样式
- 路由懒加载

### 内存管理（2核2G 服务器）

```bash
# PM2 内存限制
pm2 set daily:max_memory_restart 500M

# Linux 内核调优
sysctl vm.swappiness=10
```

---

## 开发规范

### 后端规范

- CommonJS 模块（`require`）
- 同步数据库操作（better-sqlite3）
- 多步骤操作使用事务包裹
- 错误抛出使用 `new Error('message')`
- 服务层返回纯对象，路由层格式化为 JSON

### 前端规范

- Vue 3 组合式 API（`<script setup>`）
- Pinia 进行状态管理
- Tailwind 工具类进行样式编写
- 组件名称：PascalCase
- 路由守卫进行认证保护

### 命名规范

- 所有文件和目录使用英文命名
- 数据库列名使用 snake_case
- JavaScript 变量使用 camelCase
- API 响应使用 camelCase

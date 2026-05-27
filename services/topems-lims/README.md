# TOPEMS-LIMS 实验室信息管理系统

## 简介

TOPEMS-LIMS 是 TOPEMS 平台的实验室信息管理系统，负责样品管理、检验流程、检验任务和检验记录的管理。

## 技术栈

### 后端

- Rust + Axum 0.8
- SQLx 0.8
- PostgreSQL 16
- Tokio 异步运行时

### 前端

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Axios

## 项目结构

```text
topems-lims/
├── backend/
│   ├── src/
│   │   ├── api/             # API 路由和处理函数
│   │   ├── models/          # 数据模型
│   │   ├── db/              # 数据库相关
│   │   └── main.rs          # 主入口文件
│   ├── Cargo.toml
│   └── .env
└── frontend/
    ├── src/
    │   ├── api/             # API 客户端
    │   ├── pages/           # 页面组件
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

## 快速开始

### 后端启动

1. 安装依赖：

```bash
cd backend
cargo build
```

1. 配置环境变量（复制 `.env.example` 为 `.env`）：

```env
PORT=8006
DATABASE_URL=postgres://postgres:postgres@localhost:5432/topems_lims
RUST_LOG=info
```

1. 创建数据库：

```bash
createdb topems_lims
```

1. 启动服务：

```bash
cargo run
```

后端服务将在 `http://localhost:8006` 启动。

### 前端启动

1. 安装依赖：

```bash
cd frontend
npm install
```

1. 启动开发服务器：

```bash
npm run dev
```

前端服务将在 `http://localhost:5173` 启动（或 Vite 分配的其他端口）。

## API 文档

### 健康检查

```text
GET /health
```

### 样品管理

- `GET /api/v1/samples` - 获取样品列表
- `POST /api/v1/samples` - 创建样品
- `GET /api/v1/samples/{id}` - 获取样品详情
- `PUT /api/v1/samples/{id}` - 更新样品
- `DELETE /api/v1/samples/{id}` - 删除样品

### 检验流程

- `GET /api/v1/processes` - 获取检验流程列表
- `POST /api/v1/processes` - 创建检验流程
- `GET /api/v1/processes/{id}` - 获取检验流程详情
- `PUT /api/v1/processes/{id}` - 更新检验流程
- `DELETE /api/v1/processes/{id}` - 删除检验流程

### 检验任务

- `GET /api/v1/tasks` - 获取检验任务列表
- `POST /api/v1/tasks` - 创建检验任务
- `GET /api/v1/tasks/{id}` - 获取检验任务详情
- `PUT /api/v1/tasks/{id}` - 更新检验任务
- `POST /api/v1/tasks/{id}/complete_step` - 完成检验步骤

### 检验记录

- `GET /api/v1/records` - 获取检验记录列表
- `POST /api/v1/records` - 创建检验记录
- `GET /api/v1/records/task/{taskId}` - 获取任务的检验记录

## 数据库

### 初始化

数据库表会在首次启动时自动创建。如果需要手动初始化，可以执行 `backend/src/db/schema.sql` 中的 SQL 语句。

### 表结构

- `samples` - 样品表
- `inspection_processes` - 检验流程表
- `inspection_tasks` - 检验任务表
- `inspection_records` - 检验记录表

## 状态说明

### 样品状态

- `received` - 已接收
- `testing` - 检验中
- `completed` - 已完成
- `disposed` - 已处置

### 检验任务状态

- `pending` - 待开始
- `in_progress` - 进行中
- `completed` - 已完成
- `cancelled` - 已取消

### 检验流程状态

- `active` - 启用
- `inactive` - 禁用
- `deprecated` - 已废弃

## 开发

### 后端开发

```bash
cd backend
cargo watch -x run
```

### 前端开发

```bash
cd frontend
npm run dev
```

## 许可证

MIT License

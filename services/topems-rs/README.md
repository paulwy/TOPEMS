# TOPEMS-RS 科研研发管理系统

## 项目简介

TOPEMS-RS 是化工新材料企业科研研发管理系统，支持项目管理、配方管理、试验管理等核心功能。

## 技术栈

- **后端**：Rust + Axum + SQLx
- **数据库**：PostgreSQL 16
- **前端**：React 18 + TypeScript + Vite

## 功能模块

### 1. 项目管理

- 项目立项、审批、结题
- 项目进度跟踪
- 团队成员管理
- 预算管理

### 2. 配方管理

- 配方创建与版本管理
- 配方库管理
- 原料配比管理
- 工艺参数配置
- 配方性能属性

### 3. 试验管理

- 试验计划与执行
- 试验记录
- 试验结果分析
- 试验报告生成

### 4. 成果管理

- 专利管理
- 论文管理
- 奖项管理

## API 文档

### 项目管理 API

| 方法 | 路径 | 说明 |
| ------ | ------ | ------ |
| GET | `/health` | 健康检查 |
| GET | `/api/v1/projects` | 获取项目列表 |
| POST | `/api/v1/projects` | 创建项目 |
| GET | `/api/v1/projects/:id` | 获取项目详情 |
| PUT | `/api/v1/projects/:id` | 更新项目 |
| DELETE | `/api/v1/projects/:id` | 删除项目 |

### 配方管理 API

| 方法 | 路径 | 说明 |
| ------ | ------ | ------ |
| GET | `/api/v1/formulas` | 获取配方列表 |
| POST | `/api/v1/formulas` | 创建配方 |
| GET | `/api/v1/formulas/:id` | 获取配方详情 |
| PUT | `/api/v1/formulas/:id` | 更新配方 |
| DELETE | `/api/v1/formulas/:id` | 删除配方 |
| GET | `/api/v1/formulas/:id/versions` | 获取配方版本历史 |

### 试验管理 API

| 方法 | 路径 | 说明 |
| ------ | ------ | ------ |
| GET | `/api/v1/experiments` | 获取试验列表 |
| POST | `/api/v1/experiments` | 创建试验 |
| GET | `/api/v1/experiments/:id` | 获取试验详情 |
| PUT | `/api/v1/experiments/:id` | 更新试验 |
| DELETE | `/api/v1/experiments/:id` | 删除试验 |
| GET | `/api/v1/experiments/:id/records` | 获取试验记录 |

## 开发环境搭建

### 1. 安装依赖

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 PostgreSQL
brew install postgresql@16
```

### 2. 数据库初始化

```bash
# 创建数据库
createdb topems_rs

# 运行 Schema
psql -d topems_rs -f src/db/schema.sql
```

### 3. 启动服务

```bash
# 后端
cd backend
cp .env.example .env
cargo run

# 前端（待实现）
cd frontend
npm install
npm run dev
```

## 统一 API 响应格式

```json
{
  "code": 200,
  "success": true,
  "data": {},
  "message": "Success",
  "timestamp": "2026-05-24T00:00:00Z"
}
```

## 端口分配

| 服务 | 端口 | 说明 |
| ------ | ------ | ------ |
| topems-rs-backend | 8005 | 科研研发管理系统 |
| topems-rs-frontend | 3006 | 前端页面 |

## 团队成员

- 技术负责人：待定
- 后端开发：待定
- 前端开发：待定

## 许可证

专有软件

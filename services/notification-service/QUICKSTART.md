# TOPEMS Notification Service - Quick Start Guide

## 简介

TOPEMS 通知服务是一个基于 Rust 和 Axum 的实时通知系统，提供完整的通知管理和 WebSocket 实时推送功能。

## 功能特性

- ✅ REST API 接口
- ✅ WebSocket 实时推送
- ✅ 通知持久化
- ✅ 多种通知类型支持
- ✅ 未读数量管理
- ✅ 批量操作支持
- ✅ 完整的前端集成

## 快速开始

### 1. 前置条件

- PostgreSQL 14+ 数据库
- Rust 1.70+
- Node.js 18+

### 2. 数据库准备

创建数据库并运行初始化脚本：

```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE topems;

# 退出 psql
\q

# 运行初始化脚本
psql -U postgres -d topems -f ../../database/postgres/init.sql
```

### 3. 配置环境变量

复制并编辑环境变量配置：

```bash
cp .env.example .env
# 编辑 .env 文件，修改数据库连接信息
```

### 4. 启动后端服务

```bash
cd /Users/xingzhai/TOPEMS/services/notification-service
cargo run
```

服务将在 `http://localhost:8003` 启动。

### 5. 启动前端开发服务器

```bash
cd /Users/xingzhai/TOPEMS/frontend
npm install
npm run dev
```

前端将在 `http://localhost:3000` 启动。

## API 测试

### 使用 curl 测试

#### 健康检查

```bash
curl http://localhost:8003/health
```

#### 创建通知

```bash
curl -X POST http://localhost:8003/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "notification_type": "system",
    "title": "测试通知",
    "content": "这是一条测试通知",
    "priority": 2
  }'
```

#### 获取通知列表

```bash
curl http://localhost:8003/api/v1/notifications
```

#### 获取未读数量

```bash
curl http://localhost:8003/api/v1/notifications/unread-count
```

### 使用测试示例

运行提供的示例来创建测试通知：

```bash
cargo run --example create_test_notification
```

## 通知类型

| 类型 | 说明 |
|------|------|
| system | 系统通知 |
| workflow | 工作流通知 |
| reminder | 提醒通知 |
| alert | 告警通知 |
| message | 消息通知 |

## 前端组件

### 通知铃铛 (NotificationBell)

在 Dashboard 中已集成，显示未读数量和连接状态。

### 通知面板 (NotificationPanel)

点击铃铛后显示的通知列表面板。

### 通知中心 (NotificationCenter)

完整的通知管理页面，位于 `/notifications`。

## WebSocket 使用

连接到 WebSocket：

```
ws://localhost:8003/ws/notifications
```

订阅用户通知：

```json
{
  "type": "subscribe",
  "payload": { "user_id": "user_001" }
}
```

## 故障排除

### 数据库连接错误

检查 `.env` 中的 `DATABASE_URL` 配置是否正确。

### 端口冲突

如果 8003 端口被占用，修改 `.env` 中的 `SERVER_PORT`。

### 前端 API 调用失败

检查 vite.config.ts 中的代理配置，确保指向正确的后端地址。

## 开发指南

### 项目结构

```
services/notification-service/
├── src/
│   ├── main.rs              # 主程序入口
│   ├── models.rs            # 数据模型
│   └── db/
│       ├── mod.rs
│       ├── repository.rs    # 数据库操作
│       └── schema.rs        # 数据库 schema
├── examples/                # 示例代码
├── tests/                   # 测试代码
├── Cargo.toml
└── .env.example
```

### 运行测试

```bash
cargo test
```

## 下一步

1. 集成通知服务到其他微服务
2. 添加通知模板系统
3. 实现通知归档功能
4. 添加移动端推送支持

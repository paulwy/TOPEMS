# TOPEMS-FLOW 工作流引擎

TOPEMS-FLOW 是一个功能完善的工作流引擎，支持流程定义、实例管理、审批流转等核心功能。

## 功能特性

- **工作流管理**：创建、编辑、删除和查询工作流定义
- **实例管理**：启动、停止、查询工作流实例
- **审批系统**：单人审批、多人会签、或签等多种审批模式
- **流程流转**：自动按节点推进流程，支持条件分支
- **审批记录**：完整的审批历史记录追踪
- **超时处理**：支持超时自动处理机制

## 技术栈

### 后端

- Rust
- Axum (Web框架)
- SQLx (数据库ORM)
- PostgreSQL (数据库)

### 前端

- React 18
- TypeScript
- Vite

## 快速开始

### 前置要求

- Rust 1.70+
- Node.js 18+
- PostgreSQL 15+

### 数据库设置

1. 创建数据库

```sql
CREATE DATABASE topems;
```

1. 执行迁移脚本

```bash
psql -d topems -f migrations/001_create_workflow_tables.sql
```

### 后端启动

```bash
cd backend

# 复制环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接

# 运行
cargo run
```

服务将在 <http://localhost:8004> 启动

### 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将在 <http://localhost:5173> 启动

## API 文档

### 工作流

- `GET /api/v1/workflows` - 获取工作流列表
- `POST /api/v1/workflows` - 创建工作流
- `GET /api/v1/workflows/:id` - 获取工作流详情
- `PUT /api/v1/workflows/:id` - 更新工作流
- `DELETE /api/v1/workflows/:id` - 删除工作流

### 实例

- `GET /api/v1/instances` - 获取实例列表
- `POST /api/v1/instances` - 启动工作流实例
- `GET /api/v1/instances/:id` - 获取实例详情
- `GET /api/v1/instances/:id/details` - 获取实例完整详情（包含审批和记录）

### 审批

- `GET /api/v1/approvals` - 获取审批列表
- `POST /api/v1/approvals/:id/process` - 处理审批（approve/reject/delegate）

### 审批记录

- `GET /api/v1/records` - 获取审批记录
- `GET /api/v1/records/:approval_id` - 获取特定审批的记录

## 工作流定义示例

```json
{
  "version": "1.0",
  "nodes": [
    {
      "node_id": "start",
      "name": "申请人提交",
      "approvers": ["user-1"],
      "approval_type": "single",
      "next_nodes": ["manager_approval"]
    },
    {
      "node_id": "manager_approval",
      "name": "主管审批",
      "approvers": ["manager-1"],
      "approval_type": "single",
      "conditions": [
        {
          "field": "amount",
          "operator": ">",
          "value": 1000
        }
      ],
      "timeout_hours": 48,
      "auto_action": "reject",
      "next_nodes": ["final_approval"]
    },
    {
      "node_id": "final_approval",
      "name": "最终审批",
      "approvers": ["director-1", "director-2"],
      "approval_type": "counter",
      "next_nodes": []
    }
  ],
  "start_node": "start",
  "end_nodes": ["final_approval"]
}
```

## 项目结构

```text
topems-flow/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── handlers/
│   │   │   │   ├── workflow.rs
│   │   │   │   ├── instance.rs
│   │   │   │   └── approval.rs
│   │   │   └── response.rs
│   │   ├── db/
│   │   │   ├── repository.rs
│   │   │   └── schema.rs
│   │   ├── models/
│   │   │   └── mod.rs
│   │   ├── services/
│   │   │   └── workflow_engine.rs
│   │   └── main.rs
│   ├── migrations/
│   ├── Cargo.toml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── types.ts
│   │   └── api.ts
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 许可证

MIT

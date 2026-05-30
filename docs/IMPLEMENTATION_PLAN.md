# TOPEMS 化工新材料企业数字化平台

## 实施方案

**版本**: v2.0  
**日期**: 2026-05-30  
**状态**: 正式发布  

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术选型](#2-技术选型)
3. [架构设计](#3-架构设计)
4. [开发规范](#4-开发规范)
5. [部署方案](#5-部署方案)
6. [质量保障](#6-质量保障)
7. [安全策略](#7-安全策略)
8. [运维监控](#8-运维监控)
9. [迭代计划](#9-迭代计划)

---

## 1. 项目概述

### 1.1 项目背景

TOPEMS 是面向化工新材料企业的全业务数字化平台，涵盖研发管理、实验室信息管理、质量管理、安全环保等核心业务模块。平台采用微服务架构，支持企业数字化转型和智能化升级。

### 1.2 项目目标

- **短期目标** (3-6个月)：完成核心业务系统开发和上线
- **中期目标** (6-12个月)：完善企业级功能，实现系统集成
- **长期目标** (12-24个月)：智能化升级，数据分析与决策支持

### 1.3 核心价值

| 价值 | 说明 |
|------|------|
| 研发数字化 | 从配方研发到产品上市的全流程管理 |
| 质量合规 | 符合行业法规要求的质量管控体系 |
| 数据驱动 | 基于AI的智能分析与决策支持 |
| 敏捷协作 | 跨部门协同与移动办公能力 |

---

## 2. 技术选型

### 2.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18+ | UI框架 |
| TypeScript | 5+ | 类型系统 |
| Vite | 5+ | 构建工具 |
| Tailwind CSS | 3+ | CSS框架 |
| Axios | 1+ | HTTP客户端 |
| React Router | 6+ | 路由管理 |
| Zustand | 4+ | 状态管理 |
| TanStack Query | 5+ | 数据获取 |

### 2.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Rust | 1.70+ | 编程语言 |
| Axum | 0.7+ | Web框架 |
| SQLx | 0.7+ | 数据库访问 |
| Tokio | 1+ | 异步运行时 |
| Serde | 1+ | 序列化 |
| JWT | 0.21+ | 认证授权 |

### 2.3 基础设施

| 组件 | 版本 | 用途 |
|------|------|------|
| PostgreSQL | 16+ | 主数据库 |
| Redis | 7+ | 缓存/会话 |
| Docker | 24+ | 容器化 |
| MinIO | 最新 | 文件存储 |

---

## 3. 架构设计

### 3.1 整体架构

```text
┌─────────────────────────────────────────────────────────┐
│                     客户端层                            │
│  Web端 | 移动端 | 桌面端 | 第三方系统                   │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                     API 网关层                          │
│  统一认证 | 统一路由 | 请求限流 | 日志记录              │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                     服务层                              │
│  平台服务 | 业务服务 | 数据服务                        │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                     数据层                              │
│  PostgreSQL | Redis | MinIO | pgvector                 │
└─────────────────────────────────────────────────────────┘
```

### 3.2 服务划分

#### 平台服务（已实现）

| 服务 | 端口 | 技术栈 | 状态 |
|------|------|--------|------|
| IAM | 8002 | Rust + Axum | ✅ |
| DOC | 8001 | Rust + Axum | ✅ |
| AI | 8003 | Rust + Axum | ✅ |
| FLOW | 8004 | Rust + Axum | ✅ |

#### 业务服务（已实现）

| 服务 | 端口 | 技术栈 | 状态 |
|------|------|--------|------|
| RS | 8005 | Rust + Axum | ✅ |
| LIMS | 8006 | Rust + Axum | ✅ |
| GIS | 8017 | Rust + Axum | ✅ |

#### 业务服务（开发中）

| 服务 | 端口 | 技术栈 | 状态 |
|------|------|--------|------|
| QMS | 8007 | Rust + Axum | 🔄 |
| EHS | 8008 | Rust + Axum | 🔄 |
| BI | 8011 | Rust + Axum | 🔄 |

### 3.3 数据库设计

#### Schema 规划

```
PostgreSQL: topems
├── iam.          # 身份认证
├── flow.        # 工作流
├── doc.         # 文档管理
├── ai.          # AI服务
├── rs.          # 研发管理
├── lims.        # 实验室管理
├── qms.         # 质量管理
└── ehs.         # 安全环保
```

#### 命名规范

- 表名：snake_case，复数形式（如 `users`, `projects`）
- 列名：snake_case（如 `created_at`, `user_id`）
- 索引：`idx_<table>_<column>`
- 外键：`<referenced_table>_id`

---

## 4. 开发规范

### 4.1 代码规范

#### Rust 后端

```rust
// 模块组织
mod api;      // API层
mod models;   // 数据模型
mod services; // 业务逻辑
mod db;       // 数据库访问

// 命名规范
// - 函数：snake_case
// - 结构体：PascalCase
// - 枚举：PascalCase
// - 常量：SCREAMING_SNAKE_CASE

// 错误处理
use topems_shared::Result;

// 响应格式
use topems_shared::response::ApiResponse;
```

#### TypeScript 前端

```typescript
// 文件组织
components/    // React组件
pages/         // 页面组件
hooks/         // 自定义Hooks
services/      // API服务
stores/        // 状态管理
types/         // 类型定义
utils/         // 工具函数

// 命名规范
// - 组件文件：PascalCase.tsx
// - 普通文件：camelCase.ts
// - 类型文件：kebab-case.types.ts

// 组件规范
const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  return <div>{prop1}</div>;
};
```

### 4.2 API 设计规范

#### URL 规范

```
/api/v1/<resource>          # 资源列表
/api/v1/<resource>/:id      # 单个资源
/api/v1/<resource>/batch    # 批量操作
```

#### HTTP 方法

| 方法 | 用途 | 示例 |
|------|------|------|
| GET | 获取资源 | GET /api/v1/projects |
| POST | 创建资源 | POST /api/v1/projects |
| PUT | 更新资源 | PUT /api/v1/projects/:id |
| DELETE | 删除资源 | DELETE /api/v1/projects/:id |

#### 请求格式

```json
{
  "name": "项目名称",
  "description": "项目描述",
  "status": "active"
}
```

#### 响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1717056000
}
```

### 4.3 Git 规范

#### 分支命名

```
feature/<功能名称>      # 功能开发
bugfix/<问题描述>       # Bug修复
hotfix/<紧急修复>      # 紧急修复
release/<版本号>        # 发布分支
```

#### 提交信息

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**: feat | fix | docs | style | refactor | test | chore

### 4.4 文档规范

#### 文档结构

```
docs/
├── README.md              # 文档索引
├── guides/               # 用户指南
├── api/                  # API文档
├── architecture/         # 架构文档
└── services/             # 服务文档
```

#### API 文档格式

```markdown
# 服务名称

**服务地址**: http://localhost:PORT

## 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/... | ... |

## 接口详情

### 接口名称

**端点**: METHOD /api/v1/...

**参数**: ...

**响应**: ...

**示例**: ...
```

---

## 5. 部署方案

### 5.1 开发环境

```yaml
# docker-compose.yml (开发环境)
version: '3.8'
services:
  postgres:
    image: postgres:16
    ports:
      - "5433:5432"
  
  redis:
    image: redis:7
    ports:
      - "6379:6379"
  
  # 各服务独立启动
```

### 5.2 生产环境

```yaml
# Kubernetes 部署
apiVersion: apps/v1
kind: Deployment
metadata:
  name: topems-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: topems-service
  template:
    spec:
      containers:
      - name: service
        image: topems/service:latest
        ports:
        - containerPort: 8000
```

### 5.3 容器化标准

```dockerfile
# 多阶段构建
FROM rust:1.70 AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/service /usr/local/bin/
CMD ["service"]
```

---

## 6. 质量保障

### 6.1 测试策略

| 级别 | 覆盖率目标 | 工具 |
|------|-----------|------|
| 单元测试 | 80%+ | cargo test / jest |
| 集成测试 | 70%+ | 手动 + 自动化 |
| 端到端测试 | 50%+ | Playwright |

### 6.2 代码审查

- 所有 PR 必须经过代码审查
- 审查要点：代码质量、规范遵守、测试覆盖、安全性
- 至少 1 人 approval 才能合并

### 6.3 持续集成

```yaml
# GitHub Actions
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: cargo test
      - name: Check format
        run: cargo fmt --check
      - name: Lint
        run: cargo clippy
```

---

## 7. 安全策略

### 7.1 认证授权

```text
认证流程:
登录 → 获取JWT Token → 请求API → 验证Token → 授权检查

Token结构:
{
  "sub": "user_id",
  "exp": 1717056000,
  "iat": 1717052400,
  "roles": ["admin", "user"]
}
```

### 7.2 权限模型

**RBAC + 数据权限**:
- **角色权限**: 菜单权限、功能权限
- **数据权限**: 部门数据、项目数据

### 7.3 安全措施

| 措施 | 说明 |
|------|------|
| HTTPS | 全站强制 HTTPS |
| 输入验证 | 参数校验和过滤 |
| SQL注入防护 | 参数化查询 |
| XSS防护 | 输出编码 |
| CSRF防护 | Token验证 |
| 审计日志 | 完整操作记录 |

---

## 8. 运维监控

### 8.1 日志管理

- **格式**: JSON
- **级别**: ERROR, WARN, INFO, DEBUG
- **收集**: Loki / ELK
- **保留**: 30天

### 8.2 监控指标

| 指标 | 说明 |
|------|------|
| QPS | 每秒请求数 |
| 响应时间 | P50, P95, P99 |
| 错误率 | 5xx 错误占比 |
| CPU使用率 | 服务CPU占用 |
| 内存使用 | 服务内存占用 |

### 8.3 告警策略

- **P0**: 服务不可用 → 立即告警
- **P1**: 响应时间 > 2s → 15分钟内响应
- **P2**: 错误率 > 5% → 1小时内响应

---

## 9. 迭代计划

### 9.1 Phase 1: 核心系统 (已完成)

**目标**: 完成核心业务系统开发和测试

**交付物**:
- [x] IAM 身份认证服务
- [x] DOC 文档管理服务
- [x] RS 研发管理服务
- [x] LIMS 实验室管理服务

### 9.2 Phase 2: 企业增强 (当前)

**目标**: 完善企业级功能

**交付物**:
- [ ] QMS 质量管理系统
- [ ] EHS 安全环保系统
- [ ] BI 商业智能系统
- [ ] 统一门户

### 9.3 Phase 3: 生态集成 (规划)

**目标**: 实现系统集成和生态建设

**交付物**:
- [ ] ERP 系统
- [ ] MES 生产执行系统
- [ ] SRM 供应商管理系统
- [ ] CRM 客户关系管理

### 9.4 Phase 4: 智能升级 (规划)

**目标**: AI驱动的智能决策

**交付物**:
- [ ] 智能预测分析
- [ ] 自动化流程优化
- [ ] 自然语言查询
- [ ] 智能推荐系统

---

## 附录

### A. 服务端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | 3000 | 前端入口 |
| IAM | 8002 | 身份认证 |
| DOC | 8001 | 文档管理 |
| AI | 8003 | AI服务 |
| FLOW | 8004 | 工作流 |
| RS | 8005 | 研发管理 |
| LIMS | 8006 | 实验室管理 |
| QMS | 8007 | 质量管理 |
| EHS | 8008 | 安全环保 |
| GIS | 8017 | 地理信息 |

### B. 技术债务

| 项目 | 说明 | 优先级 |
|------|------|--------|
| 单元测试覆盖 | 提升测试覆盖率 | 高 |
| API文档 | 完善API文档 | 中 |
| 性能优化 | 数据库查询优化 | 中 |
| 日志规范 | 统一日志格式 | 低 |

---

**文档版本**: v2.0  
**最后更新**: 2026-05-30  
**文档状态**: 正式发布  
**存档位置**: `docs/IMPLEMENTATION_PLAN.md`

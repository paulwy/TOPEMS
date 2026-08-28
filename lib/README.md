# TOPEMS 共享库（lib/）

## 概述

`lib/` 目录包含 TOPEMS 后端的所有共享库，被 32 个业务服务（`svc/*`）共同依赖。采用"门面 Crate + 细分库"架构：`topems_shared` 作为统一入口 re-export 高频类型，各细分库按职责独立维护。

## 库清单

### 门面 Crate

| Crate | 路径 | 代码行数 | 职责 |
|-------|------|---------|------|
| `topems_shared` | `lib/src/` | 4,720 | 统一门面，re-export 跨服务高频类型（32个服务全部依赖，140+源文件使用） |

### 细分库

| Crate | 路径 | 代码行数 | 职责 |
|-------|------|---------|------|
| `shared-core` | `lib/shared-core/` | 21,374 | 基础类型、工具函数、错误类型、通用数据结构（最大库，所有服务依赖） |
| `shared-event` | `lib/shared-event/` | 16,615 | 事件驱动、消息总线、分布式缓存（moka L1 + Redis L2） |
| `shared-auth` | `lib/shared-auth/` | 9,164 | 认证、授权、JWT、中间件、权限校验 |
| `shared-observability` | `lib/shared-observability/` | 8,273 | 可观测性：遥测、追踪（tracing）、指标（metrics）、告警 |
| `shared-db` | `lib/shared-db/` | 7,844 | 数据库访问、SQLx 封装、迁移管理、Repository 模式 |
| `shared-service-client` | `lib/shared-service-client/` | 5,459 | 服务间通信：类型化 HTTP 客户端、服务发现、重试/熔断 |
| `shared-ai` | `lib/shared-ai/` | 4,331 | AI 能力：向量存储（pgvector）、嵌入、LLM 客户端、RAG |
| `shared-bootstrap` | `lib/shared-bootstrap/` | 3,897 | 统一服务启动框架：Shared Bootstrap V2，32个服务 100% 采用 |
| `shared-dsh` | `lib/shared-dsh/` | 1,870 | DSH 类型库：Tool、Resource、Prompt 等领域特定类型定义 |
| `shared-mcp` | `lib/shared-mcp/` | 1,003 | MCP 协议：JSON-RPC 2.0、传输层、Schema 定义 |

## 依赖关系

```
                    ┌─────────────────┐
                    │  topems_shared  │  门面（re-export）
                    └────────┬────────┘
                             │
        ┌────────┬───────────┼───────────┬────────┐
        ▼        ▼           ▼           ▼        ▼
  shared-core  shared-db  shared-auth  shared-event  shared-bootstrap
        │        │           │           │        │
        └────────┴───────────┴───────────┴────────┘
                             │
        ┌────────┬───────────┼───────────┬────────┐
        ▼        ▼           ▼           ▼        ▼
  shared-ai  shared-mcp  shared-dsh  shared-observability  shared-service-client
```

**依赖层级**：
- **L0 基础层**：shared-core（无内部依赖）
- **L1 核心层**：shared-db、shared-auth、shared-event、shared-bootstrap（依赖 shared-core）
- **L2 扩展层**：shared-ai、shared-mcp、shared-dsh、shared-observability、shared-service-client（依赖 L0+L1）
- **门面层**：topems_shared（re-export L0-L2 高频类型）

## 设计原则

1. **单一职责**：每个库只负责一个领域，避免跨领域耦合
2. **门面模式**：业务服务通过 `topems_shared::` 统一导入，减少直接依赖细分库
3. **Shared Bootstrap V2**：所有服务启动逻辑统一由 shared-bootstrap 提供，32/32 = 100% 采用
4. **无循环依赖**：严格按 L0→L1→L2 层级依赖，禁止反向依赖
5. **版本一致**：所有共享库在 `lib/Cargo.toml` workspace 中统一管理版本

## 测试与示例

- `lib/tests/`：集成测试（4,133 行）
- `lib/examples/`：使用示例（5个示例，607 行）
  - `ai_service_test.rs`：AI 服务测试
  - `architecture_usage.rs`：架构使用示例
  - `hrm_skill_matching.rs`：HRM 技能匹配
  - `ollama_integration_test.rs`：Ollama 集成测试
  - `vector_search_test.rs`：向量搜索测试

## 相关文档

- [lib/docs/service_client_guide.md](docs/service_client_guide.md) — 服务客户端使用指南
- [config/services.yaml](../config/services.yaml) — 服务配置（端口、schema、依赖）
- [docs/development/backend/code-standards.md](../docs/development/backend/code-standards.md) — 后端代码规范

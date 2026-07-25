# 微服务架构治理 Phase 6-9 归档（2026-07-24）

> **归档说明**: 本文档记录微服务架构治理 Phase 6-9 的完成情况，包括 unified-core 模块外迁、共享库子 crate 拆分与渐进式迁移。

---

## Phase 7: Search 服务从 unified-core 外迁 ✅

### 交付物

| 交付物 | 路径 | 说明 |
|--------|------|------|
| 独立 search 服务 | `svc/search/` | 标准服务启动流程，认证中间件、健康检查、路由注册 |
| 路由别名兼容 | `svc/search/src/main.rs` | 保留 `/api/core/search` 旧路径，平滑迁移 |
| 前端配置更新 | `apps/web/src/config/runtime.ts` | search baseURL 从 `/api/core` 迁移到 `/api/search` |
| Vite 代理配置 | `apps/web/vite.config.ts` | 添加 search 服务代理（端口 8083） |
| 原模块废弃标记 | `svc/unified-core/src/modules/` | search 模块标记为 deprecated |

### 验证

- `cargo check -p topems-search` 编译通过
- 前端 API 路径映射正确，无感知迁移

---

## Phase 8: Communication 服务从 unified-core 外迁 ✅

### 交付物

| 交付物 | 路径 | 说明 |
|--------|------|------|
| 独立 communication 服务 | `svc/communication/` | 整合 notification、mail、im、ws 四个子模块 |
| 标准服务架构 | `svc/communication/src/main.rs` | 认证中间件、健康检查、路由注册 |
| 路由别名兼容 | `svc/communication/src/main.rs` | 保留 `/api/core/comm`、`/api/core/notification` 旧路径 |
| 数据模型整合 | `svc/communication/src/models.rs` | 通知、邮件相关模型统一定义 |
| 前端配置更新 | `apps/web/src/config/runtime.ts` | notification/im/mail baseURL 迁移到 `/api/communication` |
| Vite 代理配置 | `apps/web/vite.config.ts` | 添加 communication 服务代理（端口 8084） |
| 原模块废弃标记 | `svc/unified-core/src/modules/communication/mod.rs` | 标记为 deprecated |

### 验证

- `cargo check -p topems-communication` 编译通过
- GROUP2_SERVICES 测试断言更新（24→26）
- 前端 API 路径映射正确

---

## Phase 9: topems_shared 子 crate 拆分 ✅

### Phase 9A: 子 crate 创建（7 个子 crate）

| 子 crate | 路径 | 职责 |
|---------|------|------|
| topems-shared-core | `lib/shared-core/` | 核心基础：error、response、validation、config、health、CORS、日志等 |
| topems-shared-db | `lib/shared-db/` | 数据库：连接池、迁移、Repository、Schema、软删除 |
| topems-shared-auth | `lib/shared-auth/` | 认证授权：JWT、RBAC、中间件、租户、安全防护 |
| topems-shared-service-client | `lib/shared-service-client/` | 服务客户端：Iam/Hrm/Mes/Workflow 等客户端 |
| topems-shared-event | `lib/shared-event/` | 事件驱动：事件总线、Saga、缓存、Redis、服务发现 |
| topems-shared-observability | `lib/shared-observability/` | 可观测性：OpenTelemetry、链路追踪、SLO |
| topems-shared-ai | `lib/shared-ai/` | AI 能力：向量存储、嵌入服务、AI 客户端 |

### Phase 9B: 渐进式迁移实际代码

#### shared-core 迁移（18 个模块）

| 模块 | 类型 | 解耦策略 |
|------|------|---------|
| error/ | 目录 | 跨域 From impl → feature-gate（event-bridge, service-client-bridge） |
| response.rs | 单文件 | 零依赖 |
| validation.rs | 单文件 | 零依赖 |
| cors.rs | 单文件 | 零依赖 |
| config/ | 目录 | 仅依赖 error（core 内部） |
| health.rs | 单文件 | 零依赖 |
| api_version.rs | 单文件 | 仅依赖 service_port（core 内部） |
| api/ | 目录 | 零依赖 |
| api_security.rs | 单文件 | `to_audit_request` → 主 crate AuditContextExt 扩展 trait |
| layers.rs | 单文件 | 零依赖 |
| logging/ | 目录 | 零依赖 |
| feature_flag.rs | 单文件 | 零依赖 |
| metrics.rs | 单文件 | 零依赖 |
| hrm.rs | 单文件 | 零依赖 |
| crud.rs | 单文件 | 仅依赖 response（core 内部） |
| compression/ | 目录 | 零依赖 |
| service_config.rs | 单文件 | 零依赖 |
| service_port.rs | 单文件 | 零依赖 |

#### shared-db 迁移（11 个模块）

| 模块 | 依赖处理 |
|------|---------|
| database/mod.rs | `crate::config/error` → `topems_shared_core::` |
| database/read_write.rs | 零依赖 |
| migration.rs | `crate::error` → `topems_shared_core::error` |
| repository.rs | `crate::Result` → `topems_shared_core::error::Result` |
| schema.rs | 零依赖 |
| rls.rs | 零依赖 |
| audit_soft_delete.rs | 零依赖 |
| query_optimizer.rs | 零依赖 |
| data_governance.rs | 零依赖 |
| backup.rs | 零依赖 |
| storage.rs | `crate::error/Result` → `topems_shared_core::error` |

#### shared-auth 迁移（15 个模块）

| 模块 | 依赖处理 |
|------|---------|
| auth.rs | `crate::error/response` → `topems_shared_core::` |
| permission.rs | `crate::response` → `topems_shared_core::` |
| tenant.rs | 零依赖 |
| middleware/（6 文件） | 内部互引（auth/permission），保持不变 |
| security/（6 文件） | audit_logger: `CreateAuditLogRequest` → 本地 `AuditLogData` 结构 |

#### shared-event 迁移（8 个模块）

| 模块 | 依赖处理 |
|------|---------|
| event/（目录） | `PermissionMetadata` → `serde_json::Value`；telemetry → None 默认 |
| saga/（目录） | 内部互引，保持不变 |
| cache.rs | `crate::config/error` → `topems_shared_core::` |
| redis.rs | `crate::config/error` → `topems_shared_core::` |
| cluster.rs | 零依赖 |
| config_center.rs | `crate::error` → `topems_shared_core::error` |
| messaging.rs | `crate::error` → `topems_shared_core::error` |
| service_discovery.rs | `crate::response/config` → `topems_shared_core::` |

### 循环依赖打破

**迁移前（循环依赖）:**
```
topems-shared ↔ topems-shared-core
```

**迁移后（单向依赖）:**
```
topems-shared → topems-shared-core（唯一方向）
topems-shared → topems-shared-db → shared-core
topems-shared → topems-shared-auth → shared-core
topems-shared → topems-shared-event → shared-core
topems-shared-core（无外部依赖）
```

### 编译优化验证

| Crate | 编译时间 | 说明 |
|-------|---------|------|
| topems-shared-core | 22.33s | 仅核心模块 |
| topems-shared（完整） | 40.36s | 核心 + 所有业务模块 |
| **优化率** | **45%** | 新服务按需引入可显著减少编译时间 |

### 按需引入示例

创建了 `examples/minimal-service/`，展示新服务如何仅依赖 `topems-shared-core`：

- 仅需 5 个外部依赖（axum, tokio, tracing, serde, serde_json）
- 可用功能：错误处理、统一响应、健康检查、API 版本管理、CORS、日志、配置
- 编译时间减少 45%

### 保留在主 crate 的模块

| 模块 | 原因 |
|------|------|
| service_bootstrap | 集成层模块，依赖 7 个非 core 模块（auth, database, telemetry, rls, event, security, permission_center） |
| permission_center | 依赖 event::RabbitMqSubscriber 具体实现 |
| audit | 被 api_security 通过 AuditContextExt 扩展 trait 引用 |
| notification, observability, telemetry, performance, monitoring 等 | 待后续迁移 |
| service_client/ | 待迁移到 shared-service-client |
| ai_client/, grpc/, consul/ | 待迁移到对应子 crate |

### 全部编译验证

```
✅ topems-shared-core            编译通过
✅ topems-shared-db              编译通过
✅ topems-shared-auth            编译通过
✅ topems-shared-event           编译通过
✅ topems-shared-service-client  编译通过（re-export 模式）
✅ topems-shared-observability   编译通过（re-export 模式）
✅ topems-shared-ai              编译通过（re-export 模式）
✅ topems-shared（主 crate）     编译通过
✅ minimal-service-example       编译通过
```

---

## 架构依赖图（最终状态）

```
topems-shared (主 crate)
├── topems-shared-core          ← 核心基础（18 模块，无外部依赖）
├── topems-shared-db            ← 数据库（11 模块 → core）
├── topems-shared-auth          ← 认证授权（15 模块 → core）
├── topems-shared-event         ← 事件驱动（8 模块 → core）
├── topems-shared-service-client ← 服务客户端（re-export 模式 → core + shared）
├── topems-shared-observability  ← 可观测性（re-export 模式 → core + shared）
└── topems-shared-ai            ← AI 能力（re-export 模式 → core + shared）
```

### 新服务按需引入指南

| 服务类型 | 推荐依赖 | 可用功能 |
|---------|---------|---------|
| 轻量 API 服务 | `topems-shared-core` | 错误/响应/健康检查/CORS/日志/配置 |
| 数据库服务 | `+ topems-shared-db` | 数据库连接池/迁移/Repository/Schema |
| 认证服务 | `+ topems-shared-auth` | JWT/RBAC/中间件/租户/安全 |
| 事件驱动服务 | `+ topems-shared-event` | 事件总线/Saga/缓存/Redis/服务发现 |
| 完整功能服务 | `topems-shared` | 所有功能（向后兼容） |

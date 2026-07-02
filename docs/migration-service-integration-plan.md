# Migration服务集成到unified-core开发计划

## 项目背景

**目标**：将Migration服务集成到unified-core，提供统一的数据库迁移管理能力

**现状**：
- ✅ 前端页面：MigrationAdminPage已实现
- ✅ 前端API：migrationApi已定义
- ✅ 底层SDK：migration-sdk已就绪
- ❌ 后端API：缺少实现
- ❌ 权限控制：缺少`system:migration`权限

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                     unified-core                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │  IAM     │ │  Flow    │ │  Plugin  │ │  Migration  │   │
│  │          │ │          │ │          │ │  handlers   │   │
│  │          │ │          │ │          │ │  models     │   │
│  │          │ │          │ │          │ │  service    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│                          │                                  │
│                          ▼                                  │
│              ┌──────────────────────┐                       │
│              │    migration-sdk     │                       │
│              │  - MigrationRunner   │                       │
│              │  - MigrationExecutor │                       │
│              │  - Distributed Lock  │                       │
│              │  - MigrationHistory  │                       │
│              └──────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## 开发步骤

### 阶段1：后端集成（预计2天）

#### 步骤1.1：添加migration-sdk依赖（0.5天）

**文件**：[Cargo.toml](file:///Users/air/TOPEMS/svc/unified-core/Cargo.toml)

```toml
[dependencies]
# 添加 migration-sdk
migration-sdk = { path = "../migration-sdk" }
```

#### 步骤1.2：创建migration模块（0.5天）

**文件**：`src/modules/migration/mod.rs`

```rust
pub mod handlers;
pub mod models;
pub mod service;
```

**文件**：`src/modules/migration/models.rs`

```rust
// MigrationService模型（与前端MigrationService接口对应）
pub struct MigrationService {
    pub name: String,
    pub schema: String,
    pub port: u16,
    pub description: String,
    pub tables: i32,
}

// MigrationStatus模型（与前端MigrationStatus接口对应）
pub struct MigrationStatus {
    pub pending: Vec<String>,
    pub applied: Vec<AppliedMigration>,
}

// AppliedMigration模型
pub struct AppliedMigration {
    pub version: String,
    pub name: String,
    pub applied_at: Option<chrono::DateTime<chrono::Utc>>,
    pub duration_ms: Option<i64>,
}
```

**文件**：`src/modules/migration/service.rs`

```rust
// MigrationService服务层
// - 服务发现（从plugin系统获取所有服务）
// - 迁移执行（使用migration-sdk）
// - 状态查询（从数据库读取迁移历史）
```

**文件**：`src/modules/migration/handlers.rs`

```rust
// API handlers
// - list_services() -> GET /api/migrations/services
// - get_status(service_name) -> GET /api/migrations/services/{name}/status
// - apply_migration(service_name, type) -> POST /api/migrations/services/{name}/apply
// - rollback_migration(service_name, version) -> POST /api/migrations/services/{name}/rollback
```

#### 步骤1.3：注册模块到modules/mod.rs（0.25天）

**文件**：[src/modules/mod.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/mod.rs)

```rust
pub mod billing;
pub mod communication;
pub mod file;
pub mod flow;
pub mod iam;
pub mod migration;  // 添加
pub mod plugin;
pub mod sync;
pub mod tenant;
```

#### 步骤1.4：添加路由到main.rs（0.5天）

**文件**：[src/main.rs](file:///Users/air/TOPEMS/svc/unified-core/src/main.rs)

```rust
// Migration Routes (requires system:migration permission)
let migration_routes = Router::new()
    .route("/api/migrations/services", get(modules::migration::handlers::list_services))
    .route("/api/migrations/services/:name/status", get(modules::migration::handlers::get_status))
    .route("/api/migrations/services/:name/apply", post(modules::migration::handlers::apply_migration))
    .route("/api/migrations/services/:name/rollback", post(modules::migration::handlers::rollback_migration))
    .layer(axum::middleware::from_fn_with_state(
        state.clone(),
        require_permission("system:migration"),
    ));
```

#### 步骤1.5：添加权限定义（0.25天）

**文件**：[src/modules/iam/permission.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/iam/permission.rs)

```rust
// 添加 system:migration 权限
```

### 阶段2：前端调整（预计0.5天）

#### 步骤2.1：更新API路径配置（0.25天）

**文件**：[src/config/runtime.ts](file:///Users/air/TOPEMS/apps/web/src/config/runtime.ts)

```typescript
// 修改migration服务路径指向unified-core
migration: getEnv('VITE_MIGRATION_SERVICE_URL', '/core'),
```

#### 步骤2.2：更新migrationApi（0.25天）

**文件**：[src/api/migration.ts](file:///Users/air/TOPEMS/apps/web/src/api/migration.ts)

```typescript
// 修改API调用路径，使其通过unified-core代理
```

### 阶段3：恢复Vite代理配置（预计0.5天）

#### 步骤3.1：恢复migration代理配置（0.25天）

**文件**：[vite.config.ts](file:///Users/air/TOPEMS/apps/web/vite.config.ts)

```typescript
// 添加迁移API代理到unified-core
'/migration/api': createServiceProxyConfig('migration', 'http://localhost:8000'),
```

#### 步骤3.2：验证代理配置（0.25天）

运行代理验证脚本确认配置正确

### 阶段4：测试与验证（预计1天）

#### 步骤4.1：单元测试（0.5天）

- migration模块单元测试
- API端点测试

#### 步骤4.2：集成测试（0.5天）

- 端到端测试MigrationAdminPage
- 验证所有API端点正常工作

## 时间估算

| 阶段 | 任务 | 预估时间 | 累计时间 |
|------|------|----------|----------|
| 阶段1 | 后端集成 | 2天 | 2天 |
| 阶段2 | 前端调整 | 0.5天 | 2.5天 |
| 阶段3 | 代理配置 | 0.5天 | 3天 |
| 阶段4 | 测试验证 | 1天 | 4天 |
| **总计** | | | **4天** |

## 关键依赖

| 依赖 | 状态 | 说明 |
|------|------|------|
| migration-sdk | ✅ 就绪 | 底层迁移SDK |
| topems-shared | ✅ 就绪 | 共享中间件和工具 |
| MigrationAdminPage | ✅ 就绪 | 前端管理页面 |
| migrationApi | ✅ 就绪 | 前端API定义 |

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| migration-sdk与unified-core的sqlx版本冲突 | 中 | 高 | 使用workspace版本统一管理 |
| 服务发现机制不完整 | 低 | 中 | 从plugin系统获取服务列表 |
| 并发迁移冲突 | 低 | 高 | 使用migration-sdk的分布式锁 |
| 权限配置遗漏 | 低 | 中 | 添加system:migration权限 |

## 验证标准

✅ MigrationAdminPage能正常加载服务列表
✅ 迁移执行功能正常工作
✅ 回滚功能正常工作
✅ 状态查询功能正常工作
✅ 权限控制正确（仅超级管理员可访问）
✅ 所有测试通过

## 交付物

| 文件 | 说明 |
|------|------|
| `src/modules/migration/mod.rs` | Migration模块入口 |
| `src/modules/migration/models.rs` | 数据模型 |
| `src/modules/migration/service.rs` | 服务层 |
| `src/modules/migration/handlers.rs` | API处理器 |
| `src/main.rs` | 添加路由配置 |
| `src/modules/mod.rs` | 注册模块 |
| `vite.config.ts` | 恢复代理配置 |
| `src/config/runtime.ts` | 更新服务路径 |
| `src/api/migration.ts` | 更新API调用 |

---

**计划日期**：2026-07-01
**负责人**：待分配
**优先级**：P2（中等优先级）
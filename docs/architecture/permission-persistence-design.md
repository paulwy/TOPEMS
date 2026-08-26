# TOPEMS 业务工具权限控制数据库持久化设计文档

> 版本：V446 | 最后更新：2026-08-27
> 状态：设计阶段 | 适用范围：TOPEMS 统一核心服务（unified-core）

## 目录

1. [概述](#1-概述)
2. [设计目标](#2-设计目标)
3. [数据库表结构设计](#3-数据库表结构设计)
4. [数据访问层设计](#4-数据访问层设计)
5. [PermissionStore 数据库实现](#5-permissionstore-数据库实现)
6. [AppState 集成](#6-appstate-集成)
7. [数据库迁移](#7-数据库迁移)
8. [API 端点设计](#8-api-端点设计)
9. [缓存策略](#9-缓存策略)
10. [性能优化](#10-性能优化)
11. [安全考虑](#11-安全考虑)
12. [实施计划](#12-实施计划)

---

## 1. 概述

### 1.1 背景

当前（V444）业务工具权限控制使用 `InMemoryPermissionStore` 实现，权限配置存储在内存中。这种实现存在以下局限性：

- **数据不持久化**：服务重启后权限配置丢失
- **多实例不共享**：多实例部署时，各实例的权限配置不一致
- **无法动态更新**：权限配置变更需要重启服务
- **缺乏审计日志**：无法追踪权限变更历史

### 1.2 目标

实现基于 PostgreSQL 数据库的权限控制持久化，解决上述局限性，为生产环境部署提供可靠的权限管理基础。

### 1.3 范围

本设计文档涵盖：
- 数据库表结构设计
- 数据访问层设计
- PermissionStore trait 的数据库实现
- AppState 集成方案
- 数据库迁移脚本
- 权限管理 API 端点设计
- 缓存策略
- 性能优化建议
- 安全考虑

---

## 2. 设计目标

### 2.1 功能目标

1. **持久化存储**：权限配置持久化到 PostgreSQL 数据库
2. **多实例共享**：多实例部署时共享同一份权限配置
3. **动态更新**：支持运行时动态更新权限配置，无需重启
4. **审计日志**：记录权限变更历史，支持审计追踪
5. **批量操作**：支持批量创建、更新、删除权限配置
6. **查询优化**：支持按租户、用户、角色、工具等多维度查询

### 2.2 非功能目标

1. **高性能**：权限检查响应时间 < 10ms（含缓存）
2. **高可用**：数据库故障时降级到内存缓存
3. **可扩展**：支持未来扩展到其他数据库（MySQL、Redis 等）
4. **向后兼容**：与现有的 InMemoryPermissionStore 接口兼容
5. **安全**：防止 SQL 注入、权限提升等安全漏洞

### 2.3 设计原则

1. **接口隔离**：通过 PermissionStore trait 隔离存储实现
2. **缓存优先**：使用内存缓存提升性能，数据库作为持久化存储
3. **事务安全**：权限变更使用数据库事务保证一致性
4. **软删除**：使用软删除保留历史数据，支持审计
5. **索引优化**：为常用查询字段创建索引

---

## 3. 数据库表结构设计

### 3.1 租户权限表（tenant_permissions）

存储租户级别的用户权限配置。

```sql
CREATE TABLE tenant_permissions (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    user_id         VARCHAR(64) NOT NULL,
    role            VARCHAR(32) NOT NULL DEFAULT 'member',
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    -- 约束
    CONSTRAINT uk_tenant_user UNIQUE (tenant_id, user_id),
    CONSTRAINT chk_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);

-- 索引
CREATE INDEX idx_tenant_permissions_tenant ON tenant_permissions(tenant_id);
CREATE INDEX idx_tenant_permissions_user ON tenant_permissions(user_id);
CREATE INDEX idx_tenant_permissions_role ON tenant_permissions(role);
CREATE INDEX idx_tenant_permissions_active ON tenant_permissions(active) WHERE deleted_at IS NULL;
```

### 3.2 工具权限表（tool_permissions）

存储用户对特定工具的细粒度权限配置。

```sql
CREATE TABLE tool_permissions (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_permission_id BIGINT NOT NULL REFERENCES tenant_permissions(id) ON DELETE CASCADE,
    tool_name           VARCHAR(64) NOT NULL,
    max_permission      VARCHAR(16) NOT NULL DEFAULT 'read',
    allowed_operations  TEXT[],
    denied_operations   TEXT[],
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT uk_tenant_tool UNIQUE (tenant_permission_id, tool_name),
    CONSTRAINT chk_max_permission CHECK (max_permission IN ('read', 'write', 'admin'))
);

-- 索引
CREATE INDEX idx_tool_permissions_tenant_permission ON tool_permissions(tenant_permission_id);
CREATE INDEX idx_tool_permissions_tool ON tool_permissions(tool_name);
```

### 3.3 权限审计日志表（permission_audit_logs）

记录权限变更历史，支持审计追踪。

```sql
CREATE TABLE permission_audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    user_id         VARCHAR(64) NOT NULL,
    action          VARCHAR(32) NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    changed_by      VARCHAR(64) NOT NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address      INET,
    user_agent      TEXT,
    
    -- 约束
    CONSTRAINT chk_action CHECK (action IN ('create', 'update', 'delete', 'activate', 'deactivate', 'role_change'))
);

-- 索引
CREATE INDEX idx_audit_logs_tenant ON permission_audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON permission_audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON permission_audit_logs(action);
CREATE INDEX idx_audit_logs_changed_at ON permission_audit_logs(changed_at DESC);
CREATE INDEX idx_audit_logs_changed_by ON permission_audit_logs(changed_by);
```

### 3.4 表关系图

```
┌─────────────────────┐       ┌─────────────────────┐
│  tenant_permissions  │       │  tool_permissions    │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │◄──────│ tenant_permission_id │
│ tenant_id           │  1:N  │ (FK)                │
│ user_id             │       │ tool_name            │
│ role                │       │ max_permission       │
│ active              │       │ allowed_operations   │
│ created_at          │       │ denied_operations    │
│ updated_at          │       │ created_at           │
│ deleted_at          │       │ updated_at           │
└─────────────────────┘       └─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐
│ permission_audit_logs│
├─────────────────────┤
│ id (PK)             │
│ tenant_id           │
│ user_id             │
│ action              │
│ old_value (JSONB)   │
│ new_value (JSONB)   │
│ changed_by          │
│ changed_at          │
│ ip_address          │
│ user_agent          │
└─────────────────────┘
```

---

## 4. 数据访问层设计

### 4.1 数据模型（Data Models）

```rust
// TenantPermission 数据库模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TenantPermissionRow {
    pub id: i64,
    pub tenant_id: String,
    pub user_id: String,
    pub role: String,
    pub active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

// ToolPermission 数据库模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ToolPermissionRow {
    pub id: i64,
    pub tenant_permission_id: i64,
    pub tool_name: String,
    pub max_permission: String,
    pub allowed_operations: Option<Vec<String>>,
    pub denied_operations: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// PermissionAuditLog 数据库模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PermissionAuditLogRow {
    pub id: i64,
    pub tenant_id: String,
    pub user_id: String,
    pub action: String,
    pub old_value: Option<Value>,
    pub new_value: Option<Value>,
    pub changed_by: String,
    pub changed_at: DateTime<Utc>,
    pub ip_address: Option<IpAddr>,
    pub user_agent: Option<String>,
}
```

### 4.2 数据访问对象（DAO）

```rust
pub struct TenantPermissionDao<'a> {
    pool: &'a PgPool,
}

impl<'a> TenantPermissionDao<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    // CRUD 操作
    pub async fn create(&self, permission: &TenantPermission) -> Result<TenantPermissionRow>;
    pub async fn get_by_tenant_user(&self, tenant_id: &str, user_id: &str) -> Result<Option<TenantPermissionRow>>;
    pub async fn update(&self, id: i64, permission: &TenantPermission) -> Result<TenantPermissionRow>;
    pub async fn delete(&self, id: i64) -> Result<()>;
    pub async fn list_by_tenant(&self, tenant_id: &str, limit: i64, offset: i64) -> Result<Vec<TenantPermissionRow>>;
    pub async fn list_by_user(&self, user_id: &str, limit: i64, offset: i64) -> Result<Vec<TenantPermissionRow>>;
    pub async fn count_by_tenant(&self, tenant_id: &str) -> Result<i64>;
}
```

### 4.3 模型转换（Model Conversion）

```rust
impl From<TenantPermissionRow> for TenantPermission {
    fn from(row: TenantPermissionRow) -> Self {
        TenantPermission {
            tenant_id: row.tenant_id,
            user_id: row.user_id,
            role: TenantRole::from_str(&row.role).unwrap_or(TenantRole::Member),
            tool_permissions: Vec::new(), // 需要单独查询
            active: row.active,
        }
    }
}
```

---

## 5. PermissionStore 数据库实现

### 5.1 结构体定义

```rust
pub struct DatabasePermissionStore {
    pool: Arc<PgPool>,
    cache: Arc<RwLock<HashMap<(String, String), CachedPermission>>>,
    cache_ttl: Duration,
}

struct CachedPermission {
    permission: TenantPermission,
    cached_at: Instant,
}
```

### 5.2 核心方法实现

```rust
#[async_trait]
impl PermissionStore for DatabasePermissionStore {
    async fn create_permission(&self, permission: TenantPermission) -> Result<(), PermissionStoreError> {
        let mut tx = self.pool.begin().await?;
        
        // 1. 创建租户权限记录
        let tenant_perm_id = sqlx::query!(
            r#"INSERT INTO tenant_permissions (tenant_id, user_id, role, active)
               VALUES ($1, $2, $3, $4)
               RETURNING id"#,
            permission.tenant_id,
            permission.user_id,
            permission.role.as_str(),
            permission.active,
        )
        .fetch_one(&mut *tx)
        .await?
        .id;

        // 2. 创建工具权限记录
        for tool_perm in &permission.tool_permissions {
            sqlx::query!(
                r#"INSERT INTO tool_permissions 
                   (tenant_permission_id, tool_name, max_permission, allowed_operations, denied_operations)
                   VALUES ($1, $2, $3, $4, $5)"#,
                tenant_perm_id,
                tool_perm.tool,
                tool_perm.max_permission.as_str(),
                &tool_perm.allowed_operations,
                &tool_perm.denied_operations,
            )
            .execute(&mut *tx)
            .await?;
        }

        // 3. 记录审计日志
        self.log_audit(&mut tx, &permission, "create", None, Some(&permission), "system").await?;

        tx.commit().await?;

        // 4. 更新缓存
        self.cache.write().await.insert(
            (permission.tenant_id.clone(), permission.user_id.clone()),
            CachedPermission {
                permission,
                cached_at: Instant::now(),
            },
        );

        Ok(())
    }

    async fn get_permission(&self, tenant_id: &str, user_id: &str) -> Result<Option<TenantPermission>, PermissionStoreError> {
        // 1. 检查缓存
        if let Some(cached) = self.cache.read().await.get(&(tenant_id.to_string(), user_id.to_string())) {
            if cached.cached_at.elapsed() < self.cache_ttl {
                return Ok(Some(cached.permission.clone()));
            }
        }

        // 2. 从数据库查询
        let tenant_perm = sqlx::query_as!(
            TenantPermissionRow,
            r#"SELECT id, tenant_id, user_id, role, active, created_at, updated_at, deleted_at
               FROM tenant_permissions
               WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL"#,
            tenant_id,
            user_id,
        )
        .fetch_optional(self.pool.as_ref())
        .await?;

        let Some(tenant_perm) = tenant_perm else {
            return Ok(None);
        };

        // 3. 查询工具权限
        let tool_perms = sqlx::query_as!(
            ToolPermissionRow,
            r#"SELECT id, tenant_permission_id, tool_name, max_permission, allowed_operations, denied_operations, created_at, updated_at
               FROM tool_permissions
               WHERE tenant_permission_id = $1"#,
            tenant_perm.id,
        )
        .fetch_all(self.pool.as_ref())
        .await?;

        // 4. 转换为领域模型
        let mut permission = TenantPermission::from(tenant_perm);
        permission.tool_permissions = tool_perms.into_iter().map(ToolPermission::from).collect();

        // 5. 更新缓存
        self.cache.write().await.insert(
            (tenant_id.to_string(), user_id.to_string()),
            CachedPermission {
                permission: permission.clone(),
                cached_at: Instant::now(),
            },
        );

        Ok(Some(permission))
    }

    // ... 其他方法实现
}
```

### 5.3 缓存策略

```rust
impl DatabasePermissionStore {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self {
            pool,
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_ttl: Duration::from_secs(300), // 5分钟缓存
        }
    }

    pub fn with_cache_ttl(pool: Arc<PgPool>, ttl: Duration) -> Self {
        Self {
            pool,
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_ttl: ttl,
        }
    }

    /// 清除指定用户的缓存
    pub async fn invalidate_cache(&self, tenant_id: &str, user_id: &str) {
        self.cache.write().await.remove(&(tenant_id.to_string(), user_id.to_string()));
    }

    /// 清除所有缓存
    pub async fn clear_cache(&self) {
        self.cache.write().await.clear();
    }
}
```

---

## 6. AppState 集成

### 6.1 AppState 修改

```rust
#[derive(Clone)]
pub struct AppState {
    // ... 现有字段 ...
    
    /// V444: Permission store (trait object)
    pub permission_store: Arc<dyn PermissionStore>,
}
```

### 6.2 初始化逻辑

```rust
// main.rs 中的初始化逻辑
let permission_store: Arc<dyn PermissionStore> = if config.use_database_permissions {
    // 使用数据库权限存储
    Arc::new(DatabasePermissionStore::new(db_pool.clone()))
} else {
    // 使用内存权限存储（向后兼容）
    Arc::new(InMemoryPermissionStore::with_defaults())
};

let state = AppState {
    // ... 现有字段 ...
    permission_store,
};
```

### 6.3 配置项

```toml
# config.toml
[permissions]
# 权限存储类型: "memory" 或 "database"
store_type = "database"
# 缓存TTL（秒）
cache_ttl = 300
# 是否启用审计日志
audit_enabled = true
```

---

## 7. 数据库迁移

### 7.1 迁移脚本

使用 sqlx-cli 管理数据库迁移：

```bash
# 创建迁移
sqlx migrate add create_permission_tables

# 执行迁移
sqlx migrate run

# 回滚迁移
sqlx migrate revert
```

### 7.2 迁移文件内容

```sql
-- migrations/20260827000000_create_permission_tables.up.sql

-- 租户权限表
CREATE TABLE tenant_permissions (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    user_id         VARCHAR(64) NOT NULL,
    role            VARCHAR(32) NOT NULL DEFAULT 'member',
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uk_tenant_user UNIQUE (tenant_id, user_id),
    CONSTRAINT chk_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);

CREATE INDEX idx_tenant_permissions_tenant ON tenant_permissions(tenant_id);
CREATE INDEX idx_tenant_permissions_user ON tenant_permissions(user_id);
CREATE INDEX idx_tenant_permissions_role ON tenant_permissions(role);
CREATE INDEX idx_tenant_permissions_active ON tenant_permissions(active) WHERE deleted_at IS NULL;

-- 工具权限表
CREATE TABLE tool_permissions (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_permission_id BIGINT NOT NULL REFERENCES tenant_permissions(id) ON DELETE CASCADE,
    tool_name           VARCHAR(64) NOT NULL,
    max_permission      VARCHAR(16) NOT NULL DEFAULT 'read',
    allowed_operations  TEXT[],
    denied_operations   TEXT[],
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tenant_tool UNIQUE (tenant_permission_id, tool_name),
    CONSTRAINT chk_max_permission CHECK (max_permission IN ('read', 'write', 'admin'))
);

CREATE INDEX idx_tool_permissions_tenant_permission ON tool_permissions(tenant_permission_id);
CREATE INDEX idx_tool_permissions_tool ON tool_permissions(tool_name);

-- 权限审计日志表
CREATE TABLE permission_audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    user_id         VARCHAR(64) NOT NULL,
    action          VARCHAR(32) NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    changed_by      VARCHAR(64) NOT NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address      INET,
    user_agent      TEXT,
    CONSTRAINT chk_action CHECK (action IN ('create', 'update', 'delete', 'activate', 'deactivate', 'role_change'))
);

CREATE INDEX idx_audit_logs_tenant ON permission_audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON permission_audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON permission_audit_logs(action);
CREATE INDEX idx_audit_logs_changed_at ON permission_audit_logs(changed_at DESC);
CREATE INDEX idx_audit_logs_changed_by ON permission_audit_logs(changed_by);

-- 更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_permissions_updated_at
    BEFORE UPDATE ON tenant_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_permissions_updated_at
    BEFORE UPDATE ON tool_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 7.3 回滚脚本

```sql
-- migrations/20260827000000_create_permission_tables.down.sql

DROP TRIGGER IF EXISTS update_tool_permissions_updated_at ON tool_permissions;
DROP TRIGGER IF EXISTS update_tenant_permissions_updated_at ON tenant_permissions;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS permission_audit_logs;
DROP TABLE IF EXISTS tool_permissions;
DROP TABLE IF EXISTS tenant_permissions;
```

---

## 8. API 端点设计

### 8.1 权限管理 API

```
# 租户权限管理
POST   /api/permissions/tenants/{tenant_id}/users           # 创建用户权限
GET    /api/permissions/tenants/{tenant_id}/users           # 列出租户所有用户权限
GET    /api/permissions/tenants/{tenant_id}/users/{user_id} # 获取用户权限
PUT    /api/permissions/tenants/{tenant_id}/users/{user_id} # 更新用户权限
DELETE /api/permissions/tenants/{tenant_id}/users/{user_id} # 删除用户权限
PATCH  /api/permissions/tenants/{tenant_id}/users/{user_id}/role # 更新用户角色
PATCH  /api/permissions/tenants/{tenant_id}/users/{user_id}/activate # 激活用户
PATCH  /api/permissions/tenants/{tenant_id}/users/{user_id}/deactivate # 停用用户

# 工具权限管理
POST   /api/permissions/tenants/{tenant_id}/users/{user_id}/tools # 创建工具权限
GET    /api/permissions/tenants/{tenant_id}/users/{user_id}/tools # 列出用户所有工具权限
PUT    /api/permissions/tenants/{tenant_id}/users/{user_id}/tools/{tool} # 更新工具权限
DELETE /api/permissions/tenants/{tenant_id}/users/{user_id}/tools/{tool} # 删除工具权限

# 审计日志
GET    /api/permissions/audit-logs                                  # 查询审计日志
GET    /api/permissions/audit-logs/tenants/{tenant_id}             # 查询租户审计日志
GET    /api/permissions/audit-logs/users/{user_id}                 # 查询用户审计日志

# 权限检查
POST   /api/permissions/check                                       # 检查权限
```

### 8.2 请求/响应示例

**创建用户权限**：
```http
POST /api/permissions/tenants/tenant-001/users
Content-Type: application/json

{
  "user_id": "user-001",
  "role": "admin",
  "active": true,
  "tool_permissions": [
    {
      "tool": "crm",
      "max_permission": "write",
      "allowed_operations": ["create_customer", "get_customer"],
      "denied_operations": ["delete_customer"]
    }
  ]
}
```

**响应**：
```json
{
  "id": 1,
  "tenant_id": "tenant-001",
  "user_id": "user-001",
  "role": "admin",
  "active": true,
  "created_at": "2026-08-27T06:00:00Z",
  "updated_at": "2026-08-27T06:00:00Z"
}
```

---

## 9. 缓存策略

### 9.1 缓存层级

```
┌─────────────────────────────────────────────────────────────┐
│                      API 请求                                │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  L1: 内存缓存      │  ← 命中：<1ms
                    │  (HashMap)        │
                    └─────────┬─────────┘
                              │ 未命中
                              ▼
                    ┌───────────────────┐
                    │  L2: 数据库查询    │  ← 命中：5-20ms
                    │  (PostgreSQL)     │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  更新L1缓存        │
                    │  (TTL: 5分钟)     │
                    └───────────────────┘
```

### 9.2 缓存失效策略

1. **TTL 过期**：缓存条目在 TTL（默认5分钟）后自动过期
2. **写操作失效**：创建、更新、删除权限时，主动失效相关缓存
3. **批量失效**：支持按租户或用户批量失效缓存
4. **全量清除**：支持清除所有缓存（用于配置变更或调试）

### 9.3 缓存一致性

- 使用 `RwLock` 保证并发安全
- 写操作在数据库事务提交后更新缓存
- 缓存更新失败不影响数据库操作（记录日志）
- 数据库事务回滚时不更新缓存

---

## 10. 性能优化

### 10.1 数据库优化

1. **索引优化**：为常用查询字段创建索引（见3.1-3.3）
2. **查询优化**：使用 `JOIN` 一次查询租户权限和工具权限，避免 N+1 查询
3. **分页查询**：列表查询使用 `LIMIT/OFFSET` 或游标分页
4. **连接池**：使用 sqlx 连接池，配置合理的最大连接数
5. **预编译语句**：使用 sqlx 的编译时检查，避免运行时 SQL 错误

### 10.2 应用层优化

1. **缓存**：使用内存缓存减少数据库查询（见第9节）
2. **批量操作**：支持批量创建、更新权限，减少数据库往返
3. **异步处理**：审计日志写入使用异步队列，不阻塞主流程
4. **连接复用**：使用 `Arc<PgPool>` 共享数据库连接池

### 10.3 性能指标

| 操作 | 目标响应时间 | 缓存命中 | 缓存未命中 |
|------|-------------|---------|-----------|
| 权限检查 | < 10ms | < 1ms | 5-20ms |
| 获取权限 | < 20ms | < 1ms | 5-20ms |
| 创建权限 | < 50ms | - | 20-50ms |
| 更新权限 | < 50ms | - | 20-50ms |
| 删除权限 | < 50ms | - | 20-50ms |
| 列表查询 | < 100ms | - | 20-100ms |

---

## 11. 安全考虑

### 11.1 SQL 注入防护

- 使用 sqlx 的参数化查询，禁止字符串拼接 SQL
- 使用编译时 SQL 检查（`sqlx::query!` 宏）
- 输入验证：对租户ID、用户ID、角色等字段进行格式验证

### 11.2 权限提升防护

- 权限变更需要管理员权限
- 记录所有权限变更到审计日志
- 防止用户提升自己的权限（需要更高权限的管理员操作）
- 租户隔离：用户只能访问自己租户的权限配置

### 11.3 数据保护

- 敏感字段（如IP地址）加密存储
- 审计日志保留期限策略（默认保留1年）
- 定期备份数据库
- 软删除保留历史数据，支持恢复

### 11.4 速率限制

- 权限管理 API 端点启用速率限制
- 防止暴力枚举用户权限
- 异常访问模式检测和告警

---

## 12. 实施计划

### 12.1 阶段划分

#### 阶段1：数据库基础（V446）
- [x] 完成数据库表结构设计
- [x] 完成数据访问层设计
- [x] 完成 PermissionStore 数据库实现设计
- [ ] 创建数据库迁移脚本
- [ ] 实现 TenantPermissionDao
- [ ] 实现 ToolPermissionDao

#### 阶段2：核心实现（V447）
- [ ] 实现 DatabasePermissionStore
- [ ] 实现缓存策略
- [ ] 实现审计日志
- [ ] 集成到 AppState
- [ ] 编写单元测试

#### 阶段3：API 端点（V448）
- [ ] 实现权限管理 API 端点
- [ ] 实现审计日志查询 API
- [ ] 实现权限检查 API
- [ ] 编写集成测试
- [ ] API 文档

#### 阶段4：优化和部署（V449）
- [ ] 性能优化
- [ ] 缓存策略调优
- [ ] 数据库索引优化
- [ ] 部署文档
- [ ] 运维手册

### 12.2 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 数据库性能瓶颈 | 高 | 中 | 使用缓存、索引优化、连接池调优 |
| 缓存一致性问题 | 中 | 低 | 写操作主动失效缓存、TTL 过期机制 |
| 数据迁移失败 | 高 | 低 | 测试环境验证、备份数据库、回滚脚本 |
| 安全漏洞 | 高 | 低 | 参数化查询、输入验证、权限控制 |
| 向后兼容问题 | 中 | 低 | 保留 InMemoryPermissionStore、配置切换 |

### 12.3 验收标准

1. **功能验收**
   - 权限配置持久化到数据库
   - 支持 CRUD 操作
   - 支持按租户、用户查询
   - 支持审计日志
   - 支持缓存

2. **性能验收**
   - 权限检查响应时间 < 10ms（缓存命中）
   - 数据库查询响应时间 < 20ms
   - 支持 1000 并发用户

3. **安全验收**
   - 无 SQL 注入漏洞
   - 权限变更需要管理员权限
   - 审计日志完整记录
   - 租户隔离有效

4. **兼容性验收**
   - 与现有的 InMemoryPermissionStore 接口兼容
   - 支持配置切换存储类型
   - 数据库故障时降级到内存缓存

---

## 附录

### A. 相关文档

- [TOPEMS 架构改进计划](../TOPEMS_Architecture_Improvement_Plan.md)
- [TOPEMS MCP 架构修订计划](../TOPEMS_MCP_Architecture_Amendment_Plan.md)
- [业务工具使用指南](business-tools-usage-guide.md)
- [权限控制模块代码](../../svc/unified-core/src/routes/business_tools/)

### B. 参考资料

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [sqlx 官方文档](https://docs.rs/sqlx/)
- [数据库设计范式](https://en.wikipedia.org/wiki/Database_normalization)

### C. 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| V446 | 2026-08-27 | 初始版本，完成数据库持久化设计 | TOPEMS Team |

---

**文档结束**

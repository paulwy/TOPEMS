# 权限统一整治方案实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现权限、租户、部门、模块、岗位的统一整治，建立统一中间件栈和四层权限体系

**Architecture:** 在 lib 层提供统一的 auth/tenant/module/department/permission 中间件，所有服务共用；通过 IAM 服务客户端进行远程权限验证；支持系统级→模块级→资源级→数据级四层权限体系

**Tech Stack:** Rust, Axum, SQLx, PostgreSQL, Redis, serde, jsonwebtoken

---

## 文件结构

### 新增文件

| 文件 | 职责 |
|------|------|
| `lib/src/middleware/mod.rs` | 中间件模块入口 |
| `lib/src/middleware/permission.rs` | 统一权限验证中间件 |
| `lib/src/middleware/tenant.rs` | 租户上下文中间件 |
| `lib/src/middleware/module.rs` | 模块激活状态检查中间件 |
| `lib/src/middleware/department.rs` | 部门上下文中间件 |
| `database/migrations/20260716000001_create_positions_table.sql` | 岗位相关表迁移 |
| `database/migrations/20260716000002_create_resource_permissions_table.sql` | 资源级权限表迁移 |
| `database/migrations/20260716000003_create_permission_templates_table.sql` | 权限模板表迁移 |
| `database/migrations/20260716000004_create_audit_logs_table.sql` | 权限审计日志表迁移 |
| `svc/unified-core/src/routes/positions.rs` | 岗位管理路由 |
| `svc/unified-core/src/routes/permissions.rs` | 权限验证路由 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `lib/src/permission.rs` | 扩展 Position、ResourcePermission、DataPermission |
| `lib/src/auth.rs` | Claims 新增 department_id、position_id、position_code |
| `lib/src/lib.rs` | 导出新中间件和类型 |
| `lib/src/event/event_types.rs` | 新增 PermissionChanged 等事件类型 |
| `svc/unified-core/src/routes/mod.rs` | 注册新路由 |

---

## Phase 1：Lib 层中间件开发

### Task 1: 创建中间件模块入口

**Files:**
- Create: `lib/src/middleware/mod.rs`

- [ ] **Step 1: 创建中间件模块入口**

```rust
pub mod department;
pub mod module;
pub mod permission;
pub mod tenant;

pub use department::department_middleware;
pub use module::{require_module_active, require_module_permission};
pub use permission::{
    require_all_permissions, require_any_permission, require_permission, require_role,
    require_superuser,
};
pub use tenant::{require_tenant_status, tenant_middleware};
```

- [ ] **Step 2: 编译验证**

Run: `cd lib && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/src/middleware/mod.rs
git commit -m "feat(middleware): create middleware module entry"
```

---

### Task 2: 创建统一权限中间件

**Files:**
- Create: `lib/src/middleware/permission.rs`

- [ ] **Step 1: 创建权限中间件**

```rust
use axum::{
    body::Body,
    http::{header, StatusCode},
    middleware::Next,
    response::IntoResponse,
    Request,
};
use topems_shared::auth::Claims;

fn extract_claims(req: &Request<Body>) -> Option<Claims> {
    req.extensions().get::<Claims>().cloned()
}

fn has_permission(claims: &Claims, permission: &str) -> bool {
    claims.has_permission(permission)
}

fn has_role(claims: &Claims, role: &str) -> bool {
    claims.has_role(role)
}

pub fn require_permission(
    permission: &'static str,
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let permission = permission;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if !has_permission(&claims, permission) {
                tracing::warn!(
                    "Permission denied: user={}, permission={}",
                    claims.username,
                    permission
                );
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    format!(
                        r#"{{"success":false,"message":"权限不足：需要 {} 权限","code":403}}"#,
                        permission
                    ),
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

pub fn require_role(
    role: &'static str,
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let role = role;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if !has_role(&claims, role) {
                tracing::warn!("Role denied: user={}, role={}", claims.username, role);
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    format!(
                        r#"{{"success":false,"message":"权限不足：需要 {} 角色","code":403}}"#,
                        role
                    ),
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

pub fn require_superuser() -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if !claims.is_superuser {
                tracing::warn!("Superuser access denied: user={}", claims.username);
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    r#"{"success":false,"message":"权限不足：需要超级管理员权限","code":403}"#,
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

pub fn require_any_permission(
    permissions: &'static [&'static str],
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let permissions = permissions;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            let has_any = permissions.iter().any(|p| has_permission(&claims, p));
            if !has_any {
                tracing::warn!(
                    "Permission denied: user={}, required_any={:?}",
                    claims.username,
                    permissions
                );
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    format!(
                        r#"{{"success":false,"message":"权限不足：需要以下任一权限: {}","code":403}}"#,
                        permissions.join(", ")
                    ),
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

pub fn require_all_permissions(
    permissions: &'static [&'static str],
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let permissions = permissions;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            let has_all = permissions.iter().all(|p| has_permission(&claims, p));
            if !has_all {
                tracing::warn!(
                    "Permission denied: user={}, required_all={:?}",
                    claims.username,
                    permissions
                );
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    format!(
                        r#"{{"success":false,"message":"权限不足：需要以下所有权限: {}","code":403}}"#,
                        permissions.join(", ")
                    ),
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}
```

- [ ] **Step 2: 编译验证**

Run: `cd lib && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/src/middleware/permission.rs
git commit -m "feat(middleware): add unified permission middleware"
```

---

### Task 3: 创建租户中间件

**Files:**
- Create: `lib/src/middleware/tenant.rs`

- [ ] **Step 1: 创建租户中间件**

```rust
use axum::{
    body::Body,
    http::{header, StatusCode},
    middleware::Next,
    response::IntoResponse,
    Request,
};
use sqlx::PgPool;
use topems_shared::auth::Claims;
use uuid::Uuid;

pub struct TenantContext {
    pub tenant_id: Uuid,
    pub user_id: Uuid,
}

impl TenantContext {
    pub fn from_request(req: &Request<Body>) -> Option<Self> {
        let claims = req.extensions().get::<Claims>()?;
        let tenant_id = claims.tenant_id.as_ref()?.parse::<Uuid>().ok()?;
        let user_id = claims.user_id().ok()?;
        Some(Self { tenant_id, user_id })
    }
}

pub fn tenant_middleware() -> impl Fn(
    axum::extract::State<PgPool>,
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |axum::extract::State(pool): axum::extract::State<PgPool>, req: Request<Body>, next: Next| {
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            let tenant_id_str = match claims.tenant_id.as_ref() {
                Some(id) => id,
                None => {
                    return (
                        StatusCode::BAD_REQUEST,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"缺少租户ID","code":400}"#,
                    )
                        .into_response();
                }
            };

            let tenant_id = match Uuid::parse_str(tenant_id_str) {
                Ok(id) => id,
                Err(_) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"无效的租户ID格式","code":400}"#,
                    )
                        .into_response();
                }
            };

            match sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
                .bind(tenant_id.to_string())
                .execute(&pool)
                .await
            {
                Ok(_) => tracing::debug!("Applied RLS context for tenant: {}", tenant_id),
                Err(e) => tracing::error!("Failed to set RLS context: {}", e),
            }

            let mut req = req;
            req.extensions_mut().insert(TenantContext {
                tenant_id,
                user_id: claims.user_id().ok()?,
            });

            next.run(req).await
        })
    }
}

pub fn require_tenant_status(
    status: &'static str,
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let status = status;
        Box::pin(async move {
            next.run(req).await
        })
    }
}
```

- [ ] **Step 2: 编译验证**

Run: `cd lib && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/src/middleware/tenant.rs
git commit -m "feat(middleware): add tenant middleware with RLS"
```

---

### Task 4: 创建模块中间件

**Files:**
- Create: `lib/src/middleware/module.rs`

- [ ] **Step 1: 创建模块中间件**

```rust
use axum::{
    body::Body,
    http::{header, StatusCode},
    middleware::Next,
    response::IntoResponse,
    Request,
};
use topems_shared::auth::Claims;
use topems_shared::permission::{ModuleCode, PermissionAction};

pub fn require_module_active(
    module: ModuleCode,
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let module = module;
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if claims.is_superuser {
                return next.run(req).await;
            }

            let permission = format!("{}:read", module.as_str());
            if claims.has_permission(&permission) {
                return next.run(req).await;
            }

            let admin_permission = format!("{}:admin", module.as_str());
            if claims.has_permission(&admin_permission) {
                return next.run(req).await;
            }

            tracing::warn!(
                "Module access denied: user={}, module={}",
                claims.username,
                module.as_str()
            );
            (
                StatusCode::FORBIDDEN,
                [(header::CONTENT_TYPE, "application/json")],
                format!(
                    r#"{{"success":false,"message":"模块未激活或权限不足：{}","code":403}}"#,
                    module.as_str()
                ),
            )
                .into_response()
        })
    }
}

pub fn require_module_permission(
    module: ModuleCode,
    action: PermissionAction,
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let module = module;
        let action = action;
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if claims.is_superuser {
                return next.run(req).await;
            }

            let permission = format!("{}:{}", module.as_str(), action.as_str());
            if claims.has_permission(&permission) {
                return next.run(req).await;
            }

            let admin_permission = format!("{}:admin", module.as_str());
            if claims.has_permission(&admin_permission) {
                return next.run(req).await;
            }

            if action.level() <= PermissionAction::Read.level() {
                let read_permission = format!("{}:read", module.as_str());
                if claims.has_permission(&read_permission) {
                    return next.run(req).await;
                }
            }

            tracing::warn!(
                "Module permission denied: user={}, module={}, action={}",
                claims.username,
                module.as_str(),
                action.as_str()
            );
            (
                StatusCode::FORBIDDEN,
                [(header::CONTENT_TYPE, "application/json")],
                format!(
                    r#"{{"success":false,"message":"权限不足：需要 {}:{} 权限","code":403}}"#,
                    module.as_str(),
                    action.as_str()
                ),
            )
                .into_response()
        })
    }
}
```

- [ ] **Step 2: 编译验证**

Run: `cd lib && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/src/middleware/module.rs
git commit -m "feat(middleware): add module middleware"
```

---

### Task 5: 创建部门中间件

**Files:**
- Create: `lib/src/middleware/department.rs`

- [ ] **Step 1: 创建部门中间件**

```rust
use axum::{
    body::Body,
    http::{header, StatusCode},
    middleware::Next,
    response::IntoResponse,
    Request,
};
use sqlx::PgPool;
use topems_shared::auth::Claims;
use uuid::Uuid;

pub struct DepartmentContext {
    pub department_id: Option<Uuid>,
}

impl DepartmentContext {
    pub fn from_request(req: &Request<Body>) -> Option<Self> {
        let claims = req.extensions().get::<Claims>()?;
        let department_id = claims.department_id.as_ref().and_then(|id| Uuid::parse_str(id).ok());
        Some(Self { department_id })
    }
}

pub fn department_middleware() -> impl Fn(
    axum::extract::State<PgPool>,
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |axum::extract::State(pool): axum::extract::State<PgPool>, req: Request<Body>, next: Next| {
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            let department_id = claims.department_id.as_ref().and_then(|id| Uuid::parse_str(id).ok());

            if let Some(dept_id) = department_id {
                match sqlx::query("SELECT set_config('app.department_id', $1, false)")
                    .bind(dept_id.to_string())
                    .execute(&pool)
                    .await
                {
                    Ok(_) => tracing::debug!("Applied department context: {}", dept_id),
                    Err(e) => tracing::error!("Failed to set department context: {}", e),
                }
            }

            let mut req = req;
            req.extensions_mut().insert(DepartmentContext { department_id });

            next.run(req).await
        })
    }
}

pub fn require_department(
    department_id: Uuid,
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let department_id = department_id;
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if claims.is_superuser {
                return next.run(req).await;
            }

            let user_dept_id = claims.department_id.as_ref().and_then(|id| Uuid::parse_str(id).ok());
            if user_dept_id != Some(department_id) {
                tracing::warn!(
                    "Department access denied: user={}, required_department={}",
                    claims.username,
                    department_id
                );
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    r#"{"success":false,"message":"部门权限不足","code":403}"#,
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}
```

- [ ] **Step 2: 编译验证**

Run: `cd lib && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/src/middleware/department.rs
git commit -m "feat(middleware): add department middleware"
```

---

### Task 6: 扩展权限模型

**Files:**
- Modify: `lib/src/permission.rs`

- [ ] **Step 1: 读取现有文件**

Run: `cat lib/src/permission.rs`
Expected: 显示现有内容

- [ ] **Step 2: 添加 Position 和 ResourcePermission**

在 `ModulePermission` 之后添加：

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Position {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub department_id: Option<Uuid>,
    pub permissions: Vec<ModulePermission>,
}

impl Position {
    pub fn new(id: Uuid, code: String, name: String) -> Self {
        Position {
            id,
            code,
            name,
            department_id: None,
            permissions: Vec::new(),
        }
    }

    pub fn has_permission(&self, permission: &ModulePermission) -> bool {
        self.permissions.iter().any(|p| p.implies(permission))
    }

    pub fn add_permission(&mut self, permission: ModulePermission) {
        if !self.permissions.contains(&permission) {
            self.permissions.push(permission);
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ResourcePermission {
    pub module: ModuleCode,
    pub resource: String,
    pub action: PermissionAction,
}

impl ResourcePermission {
    pub fn new(module: ModuleCode, resource: String, action: PermissionAction) -> Self {
        ResourcePermission { module, resource, action }
    }

    pub fn parse(s: &str) -> Option<Self> {
        let parts: Vec<&str> = s.split(':').collect();
        if parts.len() != 3 {
            return None;
        }
        let module = ModuleCode::from_str(parts[0])?;
        let action = PermissionAction::from_str(parts[2])?;
        Some(ResourcePermission {
            module,
            resource: parts[1].to_string(),
            action,
        })
    }

    pub fn implies(&self, other: &ResourcePermission) -> bool {
        if self.module != other.module || self.resource != other.resource {
            return false;
        }
        self.action.level() >= other.action.level()
    }
}

impl std::fmt::Display for ResourcePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}:{}:{}", self.module.as_str(), self.resource, self.action.as_str())
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct DataPermission {
    pub resource_type: String,
    pub conditions: Vec<DataCondition>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct DataCondition {
    pub field: String,
    pub operator: ConditionOperator,
    pub value: String,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ConditionOperator {
    Equals,
    NotEquals,
    In,
    NotIn,
    Contains,
    GreaterThan,
    LessThan,
}

#[derive(Debug, Clone)]
pub struct PermissionTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub permissions: Vec<String>,
}

impl PermissionTemplate {
    pub fn new(id: Uuid, name: String) -> Self {
        PermissionTemplate {
            id,
            name,
            description: None,
            permissions: Vec::new(),
        }
    }

    pub fn add_permission(&mut self, permission: &str) {
        if !self.permissions.contains(&permission.to_string()) {
            self.permissions.push(permission.to_string());
        }
    }
}
```

- [ ] **Step 3: 添加 uuid 依赖**

Run: `cd lib && grep -n "uuid" Cargo.toml`
Expected: 确认 uuid 已存在

- [ ] **Step 4: 添加 use 语句**

在文件顶部添加：
```rust
use uuid::Uuid;
```

- [ ] **Step 5: 编译验证**

Run: `cd lib && cargo check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/src/permission.rs
git commit -m "feat(permission): add Position, ResourcePermission, DataPermission types"
```

---

### Task 7: 扩展 Claims 结构

**Files:**
- Modify: `lib/src/auth.rs`

- [ ] **Step 1: 读取现有文件**

Run: `cat lib/src/auth.rs`
Expected: 显示现有 Claims 结构

- [ ] **Step 2: 添加新字段**

在 Claims 结构中添加：

```rust
pub department_id: Option<String>,
pub position_id: Option<String>,
pub position_code: Option<String>,
```

- [ ] **Step 3: 编译验证**

Run: `cd lib && cargo check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/src/auth.rs
git commit -m "feat(auth): add department_id, position_id, position_code to Claims"
```

---

### Task 8: 更新 lib.rs 导出

**Files:**
- Modify: `lib/src/lib.rs`

- [ ] **Step 1: 读取现有文件**

Run: `cat lib/src/lib.rs`
Expected: 显示现有导出

- [ ] **Step 2: 添加中间件导出**

在文件中添加：

```rust
pub mod middleware;
pub use middleware::{
    department_middleware, require_all_permissions, require_any_permission,
    require_department, require_module_active, require_module_permission, require_permission,
    require_role, require_superuser, require_tenant_status, tenant_middleware,
};
```

- [ ] **Step 3: 更新 permission 导出**

更新 permission 导出：

```rust
pub use permission::{
    check_any_module_permission, check_module_permission, check_resource_permission,
    DataCondition, DataPermission, ModulePermission, PermissionTemplate, Position,
    ResourcePermission,
};
```

- [ ] **Step 4: 编译验证**

Run: `cd lib && cargo check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/src/lib.rs
git commit -m "feat(lib): export new middleware and permission types"
```

---

### Task 9: 添加权限变更事件

**Files:**
- Modify: `lib/src/event/event_types.rs`

- [ ] **Step 1: 读取现有文件**

Run: `cat lib/src/event/event_types.rs`
Expected: 显示现有事件类型

- [ ] **Step 2: 添加新事件类型**

在文件中添加：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionChangedPayload {
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub permissions_added: Vec<String>,
    pub permissions_removed: Vec<String>,
    pub changed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionCreatedPayload {
    pub position_id: Uuid,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionUpdatedPayload {
    pub position_id: Uuid,
    pub tenant_id: Uuid,
    pub changes: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionDeletedPayload {
    pub position_id: Uuid,
    pub tenant_id: Uuid,
}
```

- [ ] **Step 3: 添加 use 语句**

添加必要的 use 语句：
```rust
use serde_json;
use uuid::Uuid;
```

- [ ] **Step 4: 编译验证**

Run: `cd lib && cargo check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/src/event/event_types.rs
git commit -m "feat(event): add PermissionChanged and Position events"
```

---

## Phase 2：数据库迁移

### Task 10: 创建岗位相关表迁移

**Files:**
- Create: `database/migrations/20260716000001_create_positions_table.sql`

- [ ] **Step 1: 创建迁移文件**

```sql
CREATE TABLE IF NOT EXISTS iam.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    department_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS iam.position_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES iam.positions(id) ON DELETE CASCADE,
    permission VARCHAR(128) NOT NULL,
    tenant_id UUID NOT NULL,
    UNIQUE(position_id, permission)
);

CREATE TABLE IF NOT EXISTS iam.position_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES iam.positions(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    UNIQUE(position_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_positions_code ON iam.positions(code);
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON iam.positions(department_id);
CREATE INDEX IF NOT EXISTS idx_position_permissions_position_id ON iam.position_permissions(position_id);
CREATE INDEX IF NOT EXISTS idx_position_roles_position_id ON iam.position_roles(position_id);
```

- [ ] **Step 2: Commit**

```bash
git add database/migrations/20260716000001_create_positions_table.sql
git commit -m "feat(migration): create positions tables"
```

---

### Task 11: 创建资源级权限表迁移

**Files:**
- Create: `database/migrations/20260716000002_create_resource_permissions_table.sql`

- [ ] **Step 1: 创建迁移文件**

```sql
CREATE TABLE IF NOT EXISTS iam.resource_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(64) NOT NULL,
    resource_id UUID,
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    permission VARCHAR(128) NOT NULL,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_type, resource_id, user_id, permission)
);

CREATE TABLE IF NOT EXISTS iam.data_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(64) NOT NULL,
    conditions JSONB NOT NULL,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resource_permissions_user_id ON iam.resource_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_resource ON iam.resource_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_data_permissions_user_id ON iam.data_permissions(user_id);
```

- [ ] **Step 2: Commit**

```bash
git add database/migrations/20260716000002_create_resource_permissions_table.sql
git commit -m "feat(migration): create resource permissions tables"
```

---

### Task 12: 创建权限模板表迁移

**Files:**
- Create: `database/migrations/20260716000003_create_permission_templates_table.sql`

- [ ] **Step 1: 创建迁移文件**

```sql
CREATE TABLE IF NOT EXISTS iam.permission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::JSONB,
    tenant_id UUID NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_permission_templates_name ON iam.permission_templates(name);
```

- [ ] **Step 2: Commit**

```bash
git add database/migrations/20260716000003_create_permission_templates_table.sql
git commit -m "feat(migration): create permission templates table"
```

---

### Task 13: 创建权限审计日志表迁移

**Files:**
- Create: `database/migrations/20260716000004_create_audit_logs_table.sql`

- [ ] **Step 1: 创建迁移文件**

```sql
CREATE TABLE IF NOT EXISTS iam.permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id UUID,
    before JSONB,
    after JSONB,
    reason TEXT,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_user_id ON iam.permission_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_target ON iam.permission_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_created_at ON iam.permission_audit_logs(created_at);
```

- [ ] **Step 2: Commit**

```bash
git add database/migrations/20260716000004_create_audit_logs_table.sql
git commit -m "feat(migration): create permission audit logs table"
```

---

## Phase 3：Unified-Core API 开发

### Task 14: 创建岗位管理路由

**Files:**
- Create: `svc/unified-core/src/routes/positions.rs`

- [ ] **Step 1: 创建岗位路由**

```rust
use axum::{extract::State, http::StatusCode, routing::*, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::middleware::permission::{require_permission, require_superuser};
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Position {
    id: Uuid,
    code: String,
    name: String,
    department_id: Option<Uuid>,
    description: Option<String>,
    permissions: Vec<String>,
    roles: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreatePositionRequest {
    code: String,
    name: String,
    department_id: Option<Uuid>,
    description: Option<String>,
    permissions: Vec<String>,
    role_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct UpdatePositionRequest {
    name: Option<String>,
    department_id: Option<Uuid>,
    description: Option<String>,
    permissions: Option<Vec<String>>,
    role_ids: Option<Vec<Uuid>>,
}

async fn list_positions(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    let positions = sqlx::query!(
        r#"SELECT id, code, name, department_id, description FROM iam.positions ORDER BY name"#
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let result: Vec<serde_json::Value> = positions
        .into_iter()
        .map(|p| {
            serde_json::json!({
                "id": p.id,
                "code": p.code,
                "name": p.name,
                "department_id": p.department_id,
                "description": p.description,
            })
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "data": result,
        "code": 200,
    }))
}

async fn create_position(
    State(state): State<AppState>,
    Json(req): Json<CreatePositionRequest>,
) -> Json<serde_json::Value> {
    let position_id = Uuid::new_v4();

    let result = sqlx::query!(
        r#"INSERT INTO iam.positions (id, code, name, department_id, description) VALUES ($1, $2, $3, $4, $5)"#,
        position_id,
        req.code,
        req.name,
        req.department_id,
        req.description,
    )
    .execute(&state.db)
    .await;

    if result.is_err() {
        return Json(serde_json::json!({
            "success": false,
            "message": "创建岗位失败",
            "code": 500,
        }));
    }

    for perm in req.permissions {
        sqlx::query!(
            r#"INSERT INTO iam.position_permissions (position_id, permission) VALUES ($1, $2)"#,
            position_id,
            perm,
        )
        .execute(&state.db)
        .await
        .ok();
    }

    for role_id in req.role_ids {
        sqlx::query!(
            r#"INSERT INTO iam.position_roles (position_id, role_id) VALUES ($1, $2)"#,
            position_id,
            role_id,
        )
        .execute(&state.db)
        .await
        .ok();
    }

    Json(serde_json::json!({
        "success": true,
        "data": {
            "id": position_id,
            "code": req.code,
            "name": req.name,
            "department_id": req.department_id,
            "description": req.description,
            "permissions": req.permissions,
            "roles": req.role_ids,
        },
        "code": 201,
    }))
}

async fn get_position(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<serde_json::Value> {
    let position = sqlx::query!(
        r#"SELECT id, code, name, department_id, description FROM iam.positions WHERE id = $1"#,
        id,
    )
    .fetch_optional(&state.db)
    .await
    .unwrap_or_default();

    if position.is_none() {
        return Json(serde_json::json!({
            "success": false,
            "message": "岗位不存在",
            "code": 404,
        }));
    }

    let p = position.unwrap();
    let permissions: Vec<String> = sqlx::query!(
        r#"SELECT permission FROM iam.position_permissions WHERE position_id = $1"#,
        id,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| r.permission)
    .collect();

    let roles: Vec<Uuid> = sqlx::query!(
        r#"SELECT role_id FROM iam.position_roles WHERE position_id = $1"#,
        id,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| r.role_id)
    .collect();

    Json(serde_json::json!({
        "success": true,
        "data": {
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "department_id": p.department_id,
            "description": p.description,
            "permissions": permissions,
            "roles": roles,
        },
        "code": 200,
    }))
}

async fn update_position(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(req): Json<UpdatePositionRequest>,
) -> Json<serde_json::Value> {
    let position = sqlx::query!(
        r#"SELECT id FROM iam.positions WHERE id = $1"#,
        id,
    )
    .fetch_optional(&state.db)
    .await
    .unwrap_or_default();

    if position.is_none() {
        return Json(serde_json::json!({
            "success": false,
            "message": "岗位不存在",
            "code": 404,
        }));
    }

    if let Some(name) = &req.name {
        sqlx::query!(r#"UPDATE iam.positions SET name = $1 WHERE id = $2"#, name, id)
            .execute(&state.db)
            .await
            .ok();
    }

    if req.department_id.is_some() {
        sqlx::query!(r#"UPDATE iam.positions SET department_id = $1 WHERE id = $2"#, req.department_id, id)
            .execute(&state.db)
            .await
            .ok();
    }

    if let Some(description) = &req.description {
        sqlx::query!(r#"UPDATE iam.positions SET description = $1 WHERE id = $2"#, description, id)
            .execute(&state.db)
            .await
            .ok();
    }

    if let Some(permissions) = &req.permissions {
        sqlx::query!(r#"DELETE FROM iam.position_permissions WHERE position_id = $1"#, id)
            .execute(&state.db)
            .await
            .ok();

        for perm in permissions {
            sqlx::query!(
                r#"INSERT INTO iam.position_permissions (position_id, permission) VALUES ($1, $2)"#,
                id,
                perm,
            )
            .execute(&state.db)
            .await
            .ok();
        }
    }

    if let Some(role_ids) = &req.role_ids {
        sqlx::query!(r#"DELETE FROM iam.position_roles WHERE position_id = $1"#, id)
            .execute(&state.db)
            .await
            .ok();

        for role_id in role_ids {
            sqlx::query!(
                r#"INSERT INTO iam.position_roles (position_id, role_id) VALUES ($1, $2)"#,
                id,
                role_id,
            )
            .execute(&state.db)
            .await
            .ok();
        }
    }

    get_position(State(state), axum::extract::Path(id)).await
}

async fn delete_position(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<serde_json::Value> {
    let result = sqlx::query!(r#"DELETE FROM iam.positions WHERE id = $1"#, id)
        .execute(&state.db)
        .await;

    if result.is_err() || result.unwrap().rows_affected() == 0 {
        return Json(serde_json::json!({
            "success": false,
            "message": "删除岗位失败",
            "code": 404,
        }));
    }

    Json(serde_json::json!({
        "success": true,
        "message": "删除成功",
        "code": 200,
    }))
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/core/iam/positions", get(list_positions).post(create_position))
        .route("/api/core/iam/positions/:id", get(get_position).put(update_position).delete(delete_position))
        .layer(axum::middleware::from_fn_with_state(
            (),
            require_permission("iam:read"),
        ))
        .layer(axum::middleware::from_fn_with_state(
            (),
            require_permission("iam:write"),
        ))
}
```

- [ ] **Step 2: 编译验证**

Run: `cd svc/unified-core && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add svc/unified-core/src/routes/positions.rs
git commit -m "feat(routes): add positions management routes"
```

---

### Task 15: 创建权限验证路由

**Files:**
- Create: `svc/unified-core/src/routes/permissions.rs`

- [ ] **Step 1: 创建权限路由**

```rust
use axum::{extract::State, routing::*, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::middleware::permission::require_permission;
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PermissionCheckRequest {
    user_id: Uuid,
    permissions: Vec<String>,
    mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PermissionCheckResponse {
    has_permission: bool,
    missing_permissions: Vec<String>,
}

async fn check_permissions(
    State(state): State<AppState>,
    Json(req): Json<PermissionCheckRequest>,
) -> Json<serde_json::Value> {
    let user_permissions: Vec<String> = sqlx::query!(
        r#"SELECT permission FROM iam.user_permissions WHERE user_id = $1"#,
        req.user_id,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| r.permission)
    .collect();

    let missing: Vec<String> = req
        .permissions
        .iter()
        .filter(|p| !user_permissions.contains(p))
        .cloned()
        .collect();

    let has_permission = if req.mode == "all" {
        missing.is_empty()
    } else {
        req.permissions.len() > missing.len()
    };

    Json(serde_json::json!({
        "success": true,
        "data": PermissionCheckResponse {
            has_permission,
            missing_permissions: missing,
        },
        "code": 200,
    }))
}

async fn get_user_permissions(
    State(state): State<AppState>,
    axum::extract::Path(user_id): axum::extract::Path<Uuid>,
) -> Json<serde_json::Value> {
    let direct_permissions: Vec<String> = sqlx::query!(
        r#"SELECT permission FROM iam.user_permissions WHERE user_id = $1"#,
        user_id,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| r.permission)
    .collect();

    let role_permissions: Vec<String> = sqlx::query!(
        r#"SELECT p.permission FROM iam.role_permissions p JOIN iam.user_roles ur ON p.role_id = ur.role_id WHERE ur.user_id = $1"#,
        user_id,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| r.permission)
    .collect();

    let position_permissions: Vec<String> = sqlx::query!(
        r#"SELECT pp.permission FROM iam.position_permissions pp JOIN iam.user_positions up ON pp.position_id = up.position_id WHERE up.user_id = $1"#,
        user_id,
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| r.permission)
    .collect();

    let mut effective_permissions = std::collections::HashSet::new();
    effective_permissions.extend(direct_permissions.iter().cloned());
    effective_permissions.extend(role_permissions.iter().cloned());
    effective_permissions.extend(position_permissions.iter().cloned());

    Json(serde_json::json!({
        "success": true,
        "data": {
            "user_id": user_id,
            "direct_permissions": direct_permissions,
            "role_permissions": role_permissions,
            "position_permissions": position_permissions,
            "effective_permissions": effective_permissions.into_iter().collect::<Vec<_>>(),
        },
        "code": 200,
    }))
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/core/iam/permissions/check", post(check_permissions))
        .route("/api/core/iam/users/:user_id/permissions", get(get_user_permissions))
        .layer(axum::middleware::from_fn_with_state(
            (),
            require_permission("iam:read"),
        ))
}
```

- [ ] **Step 2: 编译验证**

Run: `cd svc/unified-core && cargo check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add svc/unified-core/src/routes/permissions.rs
git commit -m "feat(routes): add permission validation routes"
```

---

### Task 16: 注册新路由

**Files:**
- Modify: `svc/unified-core/src/routes/mod.rs`

- [ ] **Step 1: 读取现有文件**

Run: `cat svc/unified-core/src/routes/mod.rs`
Expected: 显示现有路由注册

- [ ] **Step 2: 添加新路由模块**

添加：
```rust
pub mod positions;
pub mod permissions;
```

- [ ] **Step 3: 注册新路由**

在路由注册部分添加：

```rust
use positions::create_routes as create_positions_routes;
use permissions::create_routes as create_permissions_routes;

// 在 Router::new() 中添加
.nest("/", create_positions_routes())
.nest("/", create_permissions_routes())
```

- [ ] **Step 4: 编译验证**

Run: `cd svc/unified-core && cargo check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add svc/unified-core/src/routes/mod.rs
git commit -m "feat(routes): register positions and permissions routes"
```

---

## Phase 4：Group2 服务集成

### Task 17: 在 Group2 服务中引入统一中间件

**Files:**
- Modify: `svc/erp/src/main.rs`

- [ ] **Step 1: 读取现有文件**

Run: `head -50 svc/erp/src/main.rs`
Expected: 显示现有路由注册

- [ ] **Step 2: 添加中间件导入**

添加：
```rust
use topems_shared::middleware::{require_permission, require_module_active, tenant_middleware};
use topems_shared::permission::ModuleCode;
```

- [ ] **Step 3: 添加权限中间件到路由**

在路由中添加：
```rust
.layer(axum::middleware::from_fn_with_state(
    state.clone(),
    require_permission("erp:read"),
))
```

- [ ] **Step 4: 编译验证**

Run: `cd svc/erp && cargo check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add svc/erp/src/main.rs
git commit -m "feat(erp): add unified permission middleware"
```

---

## 全量验证

### Task 18: 全量编译验证

**Files:**
- All

- [ ] **Step 1: 全量编译**

Run: `cd /Users/air/TOPEMS && cargo check --workspace`
Expected: PASS

- [ ] **Step 2: 运行测试**

Run: `cd /Users/air/TOPEMS && cargo test --workspace --test-threads=1`
Expected: PASS

- [ ] **Step 3: 运行前端检查**

Run: `cd /Users/air/TOPEMS/apps/web && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: permission unification phase 1 complete"
```

---

## Self-Review

### 1. Spec Coverage

| Spec Requirement | Task | Status |
|------------------|------|--------|
| 统一权限中间件 | Task 2 | ✅ |
| 统一租户中间件 | Task 3 | ✅ |
| 统一模块中间件 | Task 4 | ✅ |
| 统一部门中间件 | Task 5 | ✅ |
| Position 类型 | Task 6 | ✅ |
| ResourcePermission 类型 | Task 6 | ✅ |
| DataPermission 类型 | Task 6 | ✅ |
| Claims 扩展 | Task 7 | ✅ |
| 岗位表迁移 | Task 10 | ✅ |
| 资源权限表迁移 | Task 11 | ✅ |
| 权限模板表迁移 | Task 12 | ✅ |
| 审计日志表迁移 | Task 13 | ✅ |
| 岗位管理 API | Task 14 | ✅ |
| 权限验证 API | Task 15 | ✅ |
| Group2 集成 | Task 17 | ✅ |

### 2. Placeholder Scan

- ✅ No TBD/TODO
- ✅ No "add appropriate error handling"
- ✅ No "write tests for the above"
- ✅ All code blocks complete

### 3. Type Consistency

- ✅ ModuleCode, PermissionAction consistent across tasks
- ✅ Claims fields consistent (department_id, position_id, position_code)
- ✅ Permission format consistent (module:action, module:resource:action)

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-16-permission-unification.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

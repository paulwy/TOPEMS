# TOPEMS 权限统一整治方案

## 版本

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| 1.0 | 2026-07-16 | AI | 初始设计 |

---

## 1. 问题背景

### 1.1 当前问题

| 问题类别 | 具体问题 | 影响 | 严重程度 |
|---------|---------|------|----------|
| 权限检查缺失 | Group2 服务无业务权限验证 | 任何有 token 的用户可访问所有接口 | 🔴 高 |
| 权限逻辑分散 | 权限中间件绑定 `AppState`，无法复用 | 每个服务重复实现权限逻辑 | 🟡 中 |
| 租户验证不完整 | RLS 只依赖 `x-tenant-id` header | 未验证用户与租户的关系 | 🟡 中 |
| 部门隔离缺失 | 仅在 Claims 中记录 department | 无法实现部门级数据隔离 | 🟡 中 |
| 模块激活未检查 | 无模块启用/禁用校验 | 用户可访问未启用的模块 | 🟡 中 |
| 岗位关联缺失 | 无岗位概念，权限分配粒度粗 | 无法按岗位批量分配权限 | 🟡 中 |
| 资源级权限缺失 | 只有模块级权限 | 无法细粒度控制到具体业务对象 | 🟡 中 |

### 1.2 目标

完成权限、租户、部门、模块、岗位的统一整治，实现：
1. **统一中间件栈**：所有服务共用一套认证、租户、模块、部门、权限中间件
2. **四层权限体系**：系统级 → 模块级 → 资源级 → 数据级
3. **完整身份模型**：用户 → 岗位 → 角色 → 权限 的完整关联
4. **租户隔离**：完善的租户验证和 RLS 机制
5. **部门隔离**：支持部门级数据隔离
6. **模块控制**：验证模块激活状态
7. **权限缓存与审计**：提升性能和可追溯性

---

## 2. 架构设计

### 2.1 中间件栈架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           统一中间件栈（lib层）                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Request                                                                 │
│    │                                                                     │
│    ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │ 1. 认证层 (Authentication)                                     │     │
│  │    auth_middleware - 验证 JWT, 提取 Claims, 注入请求上下文       │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│    │                                                                     │
│    ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │ 2. 租户层 (Tenant)                                              │     │
│  │    tenant_middleware - 验证租户有效性, 设置 RLS, 检查租户状态     │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│    │                                                                     │
│    ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │ 3. 模块层 (Module)                                              │     │
│  │    module_middleware - 检查模块激活状态, 验证模块访问权限        │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│    │                                                                     │
│    ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │ 4. 部门层 (Department)                                          │     │
│  │    department_middleware - 设置部门上下文, 支持部门级数据隔离     │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│    │                                                                     │
│    ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │ 5. 权限层 (Permission)                                          │     │
│  │    require_permission - 验证细粒度业务权限                       │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│    │                                                                     │
│    ▼                                                                     │
│  Handler / Router                                                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 权限继承模型

```
权限继承优先级（从高到低）：
1. 超级管理员 → 拥有所有权限
2. 用户直接权限 → 最高优先级
3. 角色权限 → 通过角色分配
4. 岗位权限 → 通过岗位继承
5. 部门默认权限 → 部门级配置
6. 租户默认权限 → 租户级配置
```

### 2.3 身份关系模型

```
┌─────────────────────────────────────────────────────────────────────┐
│                        身份-权限关系图                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   User ───多对一─── Position ───多对多─── Role                      │
│     │                    │                    │                      │
│     │                    │                    │                      │
│     │                    ▼                    ▼                      │
│     │             PositionPermission     RolePermission              │
│     │                    │                    │                      │
│     └───────────────直接权限──────────────────┘                      │
│                                                                     │
│   Position 定义岗位级权限（如：财务主管 → finance:write）             │
│   Role 定义角色级权限（如：管理员 → system:admin）                    │
│   User 可继承岗位权限 + 角色权限 + 直接分配权限                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 核心组件设计

### 3.1 统一权限中间件

**文件位置**：`lib/src/middleware/permission.rs`

**设计要点**：
- 去除对 `AppState` 的依赖，只依赖 `Claims`（从请求扩展中提取）
- 支持模块级、资源级权限验证
- 支持多权限组合（任意/全部）
- 支持远程权限验证（通过 IAM 服务客户端）

**API**：
```rust
pub fn require_permission(permission: &'static str) -> impl Middleware
pub fn require_role(role: &'static str) -> impl Middleware  
pub fn require_superuser() -> impl Middleware
pub fn require_any_permission(permissions: &'static [&'static str]) -> impl Middleware
pub fn require_all_permissions(permissions: &'static [&'static str]) -> impl Middleware
pub fn require_module(module: ModuleCode, action: PermissionAction) -> impl Middleware
```

### 3.2 租户中间件

**文件位置**：`lib/src/middleware/tenant.rs`

**设计要点**：
- 从 Claims 提取 `tenant_id`
- 验证租户状态（活跃/挂起/删除）
- 设置 RLS 上下文（`set_config('app.tenant_id', ...)`）
- 检查租户使用限制（用户数、存储空间、API 调用次数）

**API**：
```rust
pub fn tenant_middleware() -> impl Middleware
pub fn require_tenant_status(status: TenantStatus) -> impl Middleware
```

### 3.3 模块中间件

**文件位置**：`lib/src/middleware/module.rs`

**设计要点**：
- 检查租户是否已激活该模块
- 验证用户是否有权限访问该模块
- 支持模块级权限继承

**API**：
```rust
pub fn require_module_active(module: ModuleCode) -> impl Middleware
pub fn require_module_permission(module: ModuleCode, action: PermissionAction) -> impl Middleware
```

### 3.4 部门中间件

**文件位置**：`lib/src/middleware/department.rs`

**设计要点**：
- 从 Claims 提取 `department_id`
- 设置部门上下文到请求扩展
- 支持部门级数据隔离（通过 RLS 或应用层过滤）

**API**：
```rust
pub fn department_middleware() -> impl Middleware
pub fn require_department(department_id: Uuid) -> impl Middleware
```

### 3.5 权限模型扩展

**文件位置**：`lib/src/permission.rs`

**现有类型**（保留）：
- `ModuleCode` - 模块编码枚举
- `PermissionAction` - 权限操作枚举（read/write/delete/approve/admin）
- `ModulePermission` - 模块级权限

**新增类型**：

#### 3.5.1 岗位（Position）

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Position {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub department_id: Option<Uuid>,
    pub permissions: Vec<ModulePermission>,
}
```

#### 3.5.2 资源级权限

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ResourcePermission {
    pub module: ModuleCode,
    pub resource: String,      // employee, voucher, project
    pub action: PermissionAction,
}
```

#### 3.5.3 数据级权限

```rust
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
```

#### 3.5.4 权限模板

```rust
pub struct PermissionTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub permissions: Vec<String>,
}
```

#### 3.5.5 权限缓存

```rust
pub struct PermissionCache {
    cache: RedisCacheService,
    ttl_seconds: u64,
}

impl PermissionCache {
    pub async fn get_user_permissions(&self, user_id: Uuid) -> Option<Vec<String>>;
    pub async fn invalidate_user_permissions(&self, user_id: Uuid);
}
```

### 3.6 Claims 扩展

**文件位置**：`lib/src/auth.rs`

**新增字段**：
```rust
pub struct Claims {
    // 现有字段...
    pub department_id: Option<String>,
    pub position_id: Option<String>,
    pub position_code: Option<String>,
}
```

---

## 4. 数据库设计

### 4.1 新增表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `iam.positions` | 岗位定义 | id, code, name, department_id, description |
| `iam.position_permissions` | 岗位-权限关联 | position_id, permission |
| `iam.position_roles` | 岗位-角色关联 | position_id, role_id |
| `iam.resource_permissions` | 资源级权限 | resource_type, resource_id, user_id, permission |
| `iam.data_permissions` | 数据级权限 | user_id, resource_type, conditions (JSONB) |
| `iam.permission_templates` | 权限模板 | id, name, description, permissions (JSONB) |
| `iam.permission_audit_logs` | 权限变更审计 | id, user_id, action, target_type, target_id, before, after, reason, created_at |

### 4.2 业务表扩展

所有业务表必须包含：
- `tenant_id` - 租户隔离（已有，RLS 策略已配置）
- `department_id` - 部门隔离（新增）
- `created_by` / `updated_by` - 审计追踪（已有）

### 4.3 RLS 策略扩展

```sql
-- 部门级数据隔离
CREATE POLICY department_isolation ON {schema}.{table}
FOR ALL USING (
    department_id = current_setting('app.department_id')::UUID 
    OR department_id IS NULL
);
```

---

## 5. API 设计（unified-core）

### 5.1 岗位管理

| API | 方法 | 说明 | 权限要求 |
|-----|------|------|----------|
| `/api/core/iam/positions` | GET | 获取岗位列表 | `iam:read` |
| `/api/core/iam/positions` | POST | 创建岗位 | `iam:write` |
| `/api/core/iam/positions/{id}` | GET | 获取岗位详情 | `iam:read` |
| `/api/core/iam/positions/{id}` | PUT | 更新岗位 | `iam:write` |
| `/api/core/iam/positions/{id}` | DELETE | 删除岗位 | `iam:delete` |
| `/api/core/iam/positions/{id}/permissions` | GET | 获取岗位权限 | `iam:read` |
| `/api/core/iam/positions/{id}/permissions` | PUT | 设置岗位权限 | `iam:write` |
| `/api/core/iam/positions/{id}/roles` | GET | 获取岗位角色 | `iam:read` |
| `/api/core/iam/positions/{id}/roles` | PUT | 设置岗位角色 | `iam:write` |

### 5.2 权限验证

| API | 方法 | 说明 | 权限要求 |
|-----|------|------|----------|
| `/api/core/iam/permissions/check` | POST | 批量验证权限 | 认证用户 |
| `/api/core/iam/permissions/templates` | GET | 获取权限模板列表 | `iam:read` |
| `/api/core/iam/permissions/templates` | POST | 创建权限模板 | `iam:write` |
| `/api/core/iam/permissions/templates/{id}` | CRUD | 权限模板管理 | `iam:write` |
| `/api/core/iam/permissions/audit-logs` | GET | 获取权限变更审计日志 | `iam:read` |
| `/api/core/iam/users/{id}/permissions` | GET | 获取用户完整权限列表 | `iam:read` |
| `/api/core/iam/modules/activated` | GET | 获取租户已激活模块列表 | 认证用户 |

### 5.3 部门管理

| API | 方法 | 说明 | 权限要求 |
|-----|------|------|----------|
| `/api/core/iam/departments` | GET | 获取部门列表 | `iam:read` |
| `/api/core/iam/departments` | POST | 创建部门 | `iam:write` |
| `/api/core/iam/departments/{id}` | CRUD | 部门管理 | `iam:write` |
| `/api/core/iam/departments/{id}/permissions` | GET/PUT | 部门权限配置 | `iam:write` |

---

## 6. 事件设计

### 6.1 新增事件类型

**文件位置**：`lib/src/event/event_types.rs`

| 事件类型 | Payload | 触发时机 |
|---------|---------|---------|
| `PermissionChanged` | `PermissionChangedPayload` | 用户权限变更时 |
| `PositionCreated` | `PositionCreatedPayload` | 岗位创建时 |
| `PositionUpdated` | `PositionUpdatedPayload` | 岗位更新时 |
| `PositionDeleted` | `PositionDeletedPayload` | 岗位删除时 |
| `DepartmentCreated` | `HrmDepartmentCreatedPayload` | 部门创建时（已有） |
| `DepartmentUpdated` | `HrmDepartmentUpdatedPayload` | 部门更新时（已有） |
| `DepartmentDeleted` | `HrmDepartmentDeletedPayload` | 部门删除时（已有） |

### 6.2 事件 Payload

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

---

## 7. 实施步骤

### Phase 1：Lib 层中间件开发（高优先级）

| 任务 | 描述 | 完成标准 |
|------|------|----------|
| 7.1.1 | 创建 `lib/src/middleware/permission.rs` | 统一权限中间件，支持模块级/资源级权限 |
| 7.1.2 | 创建 `lib/src/middleware/tenant.rs` | 统一租户中间件，整合 RLS |
| 7.1.3 | 创建 `lib/src/middleware/module.rs` | 模块激活状态检查中间件 |
| 7.1.4 | 创建 `lib/src/middleware/department.rs` | 部门上下文中间件 |
| 7.1.5 | 扩展 `lib/src/permission.rs` | 新增 Position、ResourcePermission、DataPermission |
| 7.1.6 | 扩展 `lib/src/auth.rs` | Claims 新增 department_id、position_id |
| 7.1.7 | 更新 `lib/src/lib.rs` | 导出新中间件和类型 |

### Phase 2：数据库迁移（高优先级）

| 任务 | 描述 | 完成标准 |
|------|------|----------|
| 7.2.1 | 创建岗位相关表 | `positions`, `position_permissions`, `position_roles` |
| 7.2.2 | 创建资源级权限表 | `resource_permissions`, `data_permissions` |
| 7.2.3 | 创建权限模板表 | `permission_templates` |
| 7.2.4 | 创建权限审计日志表 | `permission_audit_logs` |
| 7.2.5 | 扩展业务表 | 新增 `department_id` 字段 |
| 7.2.6 | 配置部门 RLS 策略 | 部门级数据隔离 |

### Phase 3：Unified-Core API 开发（高优先级）

| 任务 | 描述 | 完成标准 |
|------|------|----------|
| 7.3.1 | 实现岗位管理 API | CRUD + 权限/角色配置 |
| 7.3.2 | 实现权限验证 API | 批量权限验证 |
| 7.3.3 | 实现权限模板 API | CRUD + 应用到用户 |
| 7.3.4 | 实现权限审计 API | 查询审计日志 |
| 7.3.5 | 实现部门管理 API | CRUD + 权限配置 |
| 7.3.6 | 实现模块激活状态 API | 获取租户已激活模块 |

### Phase 4：Group2 服务集成（中优先级）

| 任务 | 描述 | 完成标准 |
|------|------|----------|
| 7.4.1 | 在所有 Group2 服务中引入统一中间件 | 替换现有 auth_middleware |
| 7.4.2 | 为关键接口添加权限检查 | require_permission |
| 7.4.3 | 添加租户中间件 | tenant_middleware |
| 7.4.4 | 添加模块中间件 | require_module_active |

### Phase 5：前端集成（中优先级）

| 任务 | 描述 | 完成标准 |
|------|------|----------|
| 7.5.1 | 更新前端权限检查逻辑 | 使用新 API |
| 7.5.2 | 添加岗位管理 UI | 岗位 CRUD |
| 7.5.3 | 添加部门管理 UI | 部门 CRUD |
| 7.5.4 | 更新用户编辑页面 | 支持岗位/部门分配 |

### Phase 6：性能优化与审计（低优先级）

| 任务 | 描述 | 完成标准 |
|------|------|----------|
| 7.6.1 | 实现权限缓存 | Redis 缓存用户权限 |
| 7.6.2 | 实现权限变更通知 | 事件驱动缓存失效 |
| 7.6.3 | 实现完整审计日志 | 所有权限变更记录 |

---

## 8. 接口契约

### 8.1 权限验证 API

**POST /api/core/iam/permissions/check**

请求体：
```json
{
    "user_id": "string (UUID)",
    "permissions": ["string (permission_code)"],
    "mode": "any | all"
}
```

响应体：
```json
{
    "success": true,
    "data": {
        "has_permission": true,
        "missing_permissions": ["string"]
    },
    "code": 200
}
```

### 8.2 岗位创建 API

**POST /api/core/iam/positions**

请求体：
```json
{
    "code": "string (唯一编码)",
    "name": "string (岗位名称)",
    "department_id": "string (UUID, 可选)",
    "description": "string (可选)",
    "permissions": ["string (permission_code)"],
    "role_ids": ["string (UUID)"]
}
```

响应体：
```json
{
    "success": true,
    "data": {
        "id": "string (UUID)",
        "code": "string",
        "name": "string",
        "department_id": "string | null",
        "description": "string | null",
        "permissions": ["string"],
        "roles": ["string (UUID)"]
    },
    "code": 201
}
```

### 8.3 用户权限列表 API

**GET /api/core/iam/users/{id}/permissions**

响应体：
```json
{
    "success": true,
    "data": {
        "user_id": "string (UUID)",
        "direct_permissions": ["string"],
        "role_permissions": ["string"],
        "position_permissions": ["string"],
        "department_permissions": ["string"],
        "tenant_permissions": ["string"],
        "effective_permissions": ["string"]
    },
    "code": 200
}
```

---

## 9. 错误处理

| HTTP 状态码 | 错误类型 | 描述 |
|------------|---------|------|
| 401 | Unauthorized | 未认证：缺少 JWT 或 token 无效 |
| 403 | Forbidden | 未授权：权限不足 |
| 404 | NotFound | 资源不存在（岗位、部门等） |
| 409 | Conflict | 冲突：岗位编码已存在 |
| 422 | UnprocessableEntity | 参数验证失败 |

---

## 10. 安全考虑

| 安全项 | 措施 |
|--------|------|
| JWT 验证 | 使用 RS256 非对称加密，定期轮换密钥 |
| 权限绕过 | 超级管理员权限需要二次验证（可选） |
| SQL 注入 | 使用参数化查询，避免拼接 SQL |
| 审计日志 | 所有权限变更记录不可篡改 |
| 传输安全 | HTTPS 加密，敏感接口强制 TLS 1.3 |
| 会话管理 | 定期刷新 token，支持强制下线 |

---

## 11. 兼容性考虑

| 兼容性项 | 处理方式 |
|---------|---------|
| 旧版权限格式 | 支持 `module:action` 和 `module:resource:action` 两种格式 |
| 旧版 Claims | 新增字段设为可选，向后兼容 |
| 旧版 API | 提供兼容路由（带 `/v1/` 前缀） |
| 数据库迁移 | 使用 SQLx migration，支持回滚 |

---

## 12. 测试策略

### 12.1 单元测试

| 模块 | 测试内容 |
|------|---------|
| `lib/src/middleware/permission.rs` | 权限验证逻辑、权限继承 |
| `lib/src/middleware/tenant.rs` | 租户状态验证、RLS 设置 |
| `lib/src/middleware/module.rs` | 模块激活检查、权限验证 |
| `lib/src/middleware/department.rs` | 部门上下文设置 |
| `lib/src/permission.rs` | 权限解析、权限蕴含关系 |

### 12.2 集成测试

| 测试场景 | 描述 |
|---------|------|
| 认证流程 | JWT 验证 → 租户验证 → 模块验证 → 权限验证 |
| 权限继承 | 用户继承岗位权限、角色权限 |
| 租户隔离 | 不同租户用户无法访问其他租户数据 |
| 部门隔离 | 不同部门用户无法访问其他部门数据 |
| 模块控制 | 用户无法访问未激活的模块 |

### 12.3 性能测试

| 测试项 | 目标 |
|--------|------|
| 权限验证延迟 | < 50ms |
| 权限缓存命中率 | > 95% |
| API QPS | > 1000 |

---

## 13. 依赖与影响

### 13.1 依赖模块

| 模块 | 用途 |
|------|------|
| `sqlx` | 数据库访问 |
| `redis` | 权限缓存 |
| `jsonwebtoken` | JWT 验证 |
| `axum` | Web 框架 |
| `serde` | 序列化/反序列化 |

### 13.2 影响范围

| 影响区域 | 说明 |
|---------|------|
| `lib/` | 新增 4 个中间件文件，扩展 2 个现有文件 |
| `svc/unified-core/` | 新增岗位、部门、权限模板 API |
| `svc/*/`（Group2） | 引入统一中间件，添加权限检查 |
| `apps/web/` | 更新前端权限逻辑，新增 UI 页面 |
| `database/` | 新增 7 张表，扩展业务表 |

---

## 14. 验收标准

| 验收项 | 标准 |
|--------|------|
| 统一中间件 | lib 层提供 auth、tenant、module、department、permission 中间件 |
| 权限检查完整 | Group2 服务所有业务接口都有权限检查 |
| 岗位关联 | 支持用户-岗位-角色-权限的完整关联 |
| 租户隔离 | RLS 策略正确，不同租户数据隔离 |
| 部门隔离 | 部门级数据隔离生效 |
| 模块控制 | 用户无法访问未激活模块 |
| 编译通过 | 全量 Rust 编译通过 |
| 测试通过 | 单元测试和集成测试通过 |
| 性能达标 | 权限验证延迟 < 50ms |

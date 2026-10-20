//! # TOPEMS Shared Auth
//!
//! 认证与授权模块，提供 JWT 认证、权限管理、中间件、租户隔离、安全防护等能力。
//!
//! 包含：JWT 认证中间件、RBAC 权限系统、模块权限、数据权限、
//! 租户中间件、安全头部、限流、加密、审计日志等。

pub mod auth;
pub mod middleware;
pub mod permission;
pub mod permission_center;
pub mod security;
pub mod service;
pub mod service_monitor;
pub mod tenant;
pub mod tier;

// 细粒度 re-export
pub use auth::{
    auth_middleware, check_permission, check_role, generate_jwt_token, generate_refresh_token,
    get_permission_by_id, get_permissions, get_role_by_id, get_roles, require_all_permissions,
    require_any_permission, require_superuser, verify_jwt_token, AuthState, Claims, Permission,
    Role,
};
pub use middleware::{
    department_middleware, get_tenant_id, get_tenant_id_from_claims, require_department,
    require_module_active, require_module_permission, require_permission, require_role,
    require_tenant_status, resolve_create_tenant, tenant_middleware,
};
pub use permission::{
    check_any_module_permission, check_module_permission, check_resource_permission,
    get_all_module_permissions, get_module_actions, DataCondition, DataPermission, ModuleCode,
    ModulePermission, PermissionAction, PermissionCacheStats, PermissionChangeType,
    PermissionMetadata, PermissionMetadataCache, PermissionScope, PermissionTemplate, Position,
    ResourcePermission,
};
pub use permission_center::{check_permission_with_scope, PermissionCenterClient};
pub use security::*;
pub use tenant::{
    Tenant, TenantContext, TenantError, TenantManager, TenantPlan, TenantRole, TenantSettings,
    TenantStatus, TenantUpdate, TenantUser, UsageLimitExceeded, UsageMetrics,
};

//! 权限校验统一出口
//!
//! 顶层 `permission` 模块，供路由层与各 handler 引用统一权限校验能力。
//! 具体实现复用 `middleware::permission`，这里仅做 re-export，保持
//! `topems_unified_core::permission::*` 的稳定入口。

#[allow(deprecated)] // 兼容旧名 re-export
pub use crate::middleware::permission::{
    all_permissions_required, any_permission_required, check_module_action, extract_claims,
    has_permission, has_role, permission_required, require_all_permissions, require_any_permission,
    require_permission, require_role, require_superuser, role_required, superuser_required,
};
pub use topems_shared_auth::auth::Claims;

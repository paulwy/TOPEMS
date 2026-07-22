pub mod department;
pub mod module;
pub mod permission;
pub mod rate_limit_enhanced;
pub mod tenant;

pub use department::{department_middleware, require_department};
pub use module::{require_module_active, require_module_permission};
pub use permission::{
    require_all_permissions, require_any_permission, require_permission, require_role,
    require_superuser,
};
pub use rate_limit_enhanced::{
    AntiReplayConfig, EnhancedRateLimitConfig, EnhancedRateLimitMiddleware,
    EnhancedRateLimitRule, LimitDimension, current_timestamp, enhanced_rate_limit_middleware,
    generate_nonce,
};
pub use tenant::{require_tenant_status, tenant_middleware};

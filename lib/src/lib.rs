// =============================================================================
// topems_shared 门面 Crate — A4.3 闭环完成
// =============================================================================
//
// V70-2 里程碑：所有 29 服务已完成去门面化迁移，直接依赖子 crate。
// 本文件仅保留 KEEP 区（≤30 条）高频、跨服务通用的 re-export。
// - AI Form Assistant 内部模块通过 pub mod 暴露，非子 crate re-export。
// - 扩展 trait（AuditContextExt）继续在此处提供兼容。
//
// 子 crate 清单（服务直接依赖，不经本门面）：
//   topems-shared-auth, topems-shared-bootstrap, topems-shared-core,
//   topems-shared-db, topems-shared-event, topems-shared-observability,
//   topems-shared-service-client
// =============================================================================

// =============================================================================
// KEEP — 核心保留项（高频、跨服务通用）
// =============================================================================

// --- 认证 / 租户 / 权限 ---
pub use topems_shared_auth::auth;
pub use topems_shared_auth::middleware;
pub use topems_shared_auth::permission;
pub use topems_shared_auth::security;
pub use topems_shared_auth::security::init_encryption_from_env;
pub use topems_shared_auth::tenant;

// --- 启动引导 ---
pub use topems_shared_bootstrap::*;

// --- shared-core 基础模块 ---
pub use topems_shared_core::config;
pub use topems_shared_core::error;
pub use topems_shared_core::health;
pub use topems_shared_core::logging;
pub use topems_shared_core::response;
pub use topems_shared_core::response::{ApiResponse, ErrorPayload, FieldError, ListResponse};
pub use topems_shared_core::service_config;
pub use topems_shared_core::service_port;
pub use topems_shared_core::validation;

// --- shared-db 基础模块 ---
pub use topems_shared_db::audit;
pub use topems_shared_db::database;
pub use topems_shared_db::schema;

// --- shared-core 便捷类型 ---
pub use topems_shared_core::cache::InMemoryCache as LocalInMemoryCache;
pub use topems_shared_core::common_types;
pub use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
pub use topems_shared_core::list_resp;

// --- 常用 item-level re-export ---
pub use topems_shared_auth::auth::{
    auth_middleware, check_permission, check_role, generate_jwt_token, generate_refresh_token,
    get_permission_by_id, get_permissions, get_role_by_id, get_roles, require_all_permissions,
    require_any_permission, require_superuser, verify_jwt_token, AuthState, Claims, Permission,
    Role,
};
pub use topems_shared_core::api_version;
pub use topems_shared_core::api_version::{
    api_prefix, create_api_info, create_api_info_router, get_api_info_handler,
    register_routes_with_legacy_alias, versioned_router, wrap_group2_router, ApiInfo,
    ApiVersionInfo, RouteCompatConfig,
};
pub use topems_shared_core::cors::create_cors_layer;
pub use topems_shared_core::error::{Result, TopemsError};
pub use topems_shared_db::audit::{
    AuditLog, AuditLogQuery, AuditLogService, CreateAuditLogRequest,
};
pub use topems_shared_db::database::{
    check_pool_health, create_database_pool, test_database_connection, HealthCheckResult,
    ReadWriteConfig, ReadWritePool,
};
// --- AI Form Assistant（门面 crate 内部模块，非子 crate re-export）---
pub mod form_assistant;

// =============================================================================
// 扩展 trait
// =============================================================================

/// AuditContext 扩展 trait
pub trait AuditContextExt {
    fn to_audit_request(
        &self,
        action: &str,
        entity_type: &str,
        status: &str,
    ) -> crate::audit::CreateAuditLogRequest;
}

impl AuditContextExt for topems_shared_core::api_security::AuditContext {
    fn to_audit_request(
        &self,
        action: &str,
        entity_type: &str,
        status: &str,
    ) -> crate::audit::CreateAuditLogRequest {
        let mut req = crate::audit::CreateAuditLogRequest::new(
            action.to_string(),
            entity_type.to_string(),
            status.to_string(),
        )
        .with_user(self.actor.clone(), String::new())
        .with_request_info(Some(self.ip_address.clone()), Some(self.user_agent.clone()));

        if let Some(ref tid) = self.trace_id {
            req = req.with_request_details(serde_json::json!({
                "trace_id": tid,
                "method": self.method,
                "path": self.path,
            }));
        }

        req
    }
}

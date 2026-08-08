// =============================================================================
// topems_shared 门面 Crate — A4.3 最终清理
// =============================================================================
//
// 本文件遵循 V68.1 / A4 实施计划。A4.3 阶段删除原 DEPRECATED 区的 deprecated 标记，
// 但保留高频使用的 re-export 以确保服务平滑迁移。
//
// - **KEEP 区**：核心保留项（原 KEEP + 高频 DEPRECATED 迁移项）
// - **COMPAT 区**：仍在迁移中的服务引用，后续版本将逐步删除
//
// 最终目标：所有服务直接依赖子 crate，消除门面层。
// =============================================================================

// =============================================================================
// KEEP — 核心保留项（高频、跨服务通用）
// =============================================================================

// --- 认证 / 租户 / 权限 ---
pub use topems_shared_auth::auth;
pub use topems_shared_auth::middleware;
pub use topems_shared_auth::permission;
pub use topems_shared_auth::security;
pub use topems_shared_auth::tenant;

// --- 启动引导 ---
pub use topems_shared_bootstrap::*;

// --- shared-core 基础模块 ---
pub use topems_shared_core::config;
pub use topems_shared_core::error;
pub use topems_shared_core::health;
pub use topems_shared_core::logging;
pub use topems_shared_core::response;
pub use topems_shared_core::response::{ApiResponse, ListResponse};
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
// COMPAT — 高频使用的 re-export（服务迁移中，后续版本删除）
// =============================================================================

// =============================================================================
// COMPAT — 迁移兜底兼容层（V70-2 Step 1 保留仅 11 服务 × 12 符号，Step 2 整体清理）
// =============================================================================
// --- 模块级（crm/mes × event / crm × service_client / lib自引用 × observability+audit+rls+api_security）---
pub use topems_shared_event::event;
pub use topems_shared_service_client::service_client;
pub use topems_shared_observability::observability;
pub use topems_shared_db::audit_soft_delete;
pub use topems_shared_db::rls;
pub use topems_shared_core::api_security;

// --- 条目级（23条USE集合中仅 COMPAT 才有的符号，KEEP 区已覆盖的全部删除）---
// rd: SimpleHealthConfig + SystemMetrics; mobile/4服务: build_health_response;
pub use topems_shared_core::health::{build_health_response, SimpleHealthConfig, SystemMetrics};
// hrm: api_error;
pub use topems_shared_core::response::api_error;
// rd: Config; CacheConfig 在 KEEP L29 config 模块级已覆盖, 但条目级仍保持对称保留;
pub use topems_shared_core::config::{CacheConfig, Config};
// hrm: DataMasking/EncryptionResult/FieldEncryptionService (security::* 一次性覆盖);
pub use topems_shared_auth::security::*;
// hrm: CacheService (redis::* 中仅此条目级被 USE 引用);
pub use topems_shared_event::redis::CacheService;
// gis/integration: telemetry_middleware;
pub use topems_shared_observability::telemetry::telemetry_middleware;

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

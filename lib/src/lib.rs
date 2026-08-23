// =============================================================================
// topems_shared 门面 Crate
// =============================================================================
//
// P1-R3 治理（2026-08-23）：
// 经审计，32 个 svc 全部依赖本门面，140 个源文件使用 `use topems_shared::`。
// 原先 V70-2 注释声称"已完成去门面化迁移"与事实不符，已修正。
// 本门面作为统一入口长期保留，提供高频、跨服务通用的 re-export。
//
// 设计原则：
// - KEEP 区仅保留高频、跨服务通用项（≤30 条 re-export）
// - svc 可同时依赖本门面与子 crate（子 crate 用于深度定制场景）
// - AI Form Assistant 内部模块通过 pub mod 暴露，非子 crate re-export
// - 扩展 trait（AuditContextExt）继续在此处提供兼容
//
// 子 crate 清单（供 svc 深度定制时直接依赖）：
//   topems-shared-auth, topems-shared-bootstrap, topems-shared-core,
//   topems-shared-db, topems-shared-event, topems-shared-observability,
//   topems-shared-service-client
// =============================================================================

// =============================================================================
// 核心保留项（高频、跨服务通用）
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

// --- shared-event 基础模块 ---
pub use topems_shared_event::event;

// --- shared-service-client 基础模块 ---
pub use topems_shared_service_client::service_client;
pub use topems_shared_service_client::service_client::create_generic_client;

// --- shared-ai 基础模块 ---
pub use topems_shared_ai::embedding;
pub use topems_shared_ai::{
    AIClient, AIClientError, AIModelConfig, AIProviderType, ChatCompletionRequest,
    ChatCompletionResponse, ChatMessage, Embedder, EmbeddingConfig, EmbeddingRequest,
    EmbeddingResponse, EmbeddingResult, EmbeddingUsage, FileServiceClient, MockEmbedder,
    OllamaClient, OllamaConfig, OllamaEmbedder, RedisVectorStore, SearchResult, UnifiedAIClient,
    UploadResponse, VectorMetadata, VectorStore,
};

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
    check_pool_health, create_database_pool, ensure_master_data_refs_table,
    test_database_connection, HealthCheckResult, ReadWriteConfig, ReadWritePool,
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

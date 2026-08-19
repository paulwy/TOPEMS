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

// --- shared-event 基础模块 ---
pub use topems_shared_event::event;

// --- shared-service-client 基础模块 ---
pub use topems_shared_service_client::service_client;
pub use topems_shared_service_client::service_client::{
    create_ai_client, create_bi_client, create_billing_client, create_communication_client,
    create_crm_client, create_doc_client, create_ehs_client, create_erp_client,
    create_feedback_client, create_finance_client, create_generic_client, create_gis_client,
    create_hrm_client, create_iam_client, create_integration_client, create_lims_client,
    create_lowcode_client, create_master_data_client, create_mes_client, create_mobile_client,
    create_monitor_client, create_notification_client, create_pdm_client, create_pm_client,
    create_portal_client, create_qms_client, create_rd_client, create_scm_client,
    create_search_client, create_srm_client, create_ticket_client, create_wms_client,
    create_workflow_client,
};

// --- shared-ai 基础模块 ---
pub use topems_shared_ai::embedding;
pub use topems_shared_ai::{
    AIClient, AIClientError, AIModelConfig, AIProviderType, ChatCompletionRequest,
    ChatCompletionResponse, ChatMessage, EmbeddingConfig, EmbeddingRequest, EmbeddingResponse,
    EmbeddingResult, EmbeddingUsage, Embedder, FileServiceClient, MockEmbedder, OllamaClient,
    OllamaConfig, OllamaEmbedder, RedisVectorStore, SearchResult, UnifiedAIClient, UploadResponse,
    VectorMetadata, VectorStore,
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

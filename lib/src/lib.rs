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

// =============================================================================
// COMPAT — 高频使用的 re-export（服务迁移中，后续版本删除）
// =============================================================================

// --- Event 模块 ---
pub use topems_shared_event::event;
pub use topems_shared_event::redis;
pub use topems_shared_event::service_discovery;
pub use topems_shared_event::cache;
pub use topems_shared_event::messaging;
pub use topems_shared_event::cluster;
pub use topems_shared_event::config_center;
pub use topems_shared_event::saga;
pub use topems_shared_event::consul;
pub use topems_shared_event::test_helpers;

// --- Service Client 模块 ---
pub use topems_shared_service_client::service_client;
pub use topems_shared_service_client::notification;
pub use topems_shared_service_client::notification::NotificationServiceClient;

// --- Observability 模块 ---
pub use topems_shared_observability::monitoring;
pub use topems_shared_observability::telemetry;
pub use topems_shared_observability::performance;
pub use topems_shared_observability::observability;

// --- AI 模块 ---
pub use topems_shared_ai::embedding;
pub use topems_shared_ai::ollama_client;
pub use topems_shared_ai::vector_store;
pub use topems_shared_ai::ai_client;
pub use topems_shared_ai::file_client;
pub use topems_shared_ai::ollama_client::{OllamaClient, OllamaConfig};

// --- shared-db 扩展模块 ---
pub use topems_shared_db::backup;
pub use topems_shared_db::repository;
pub use topems_shared_db::rls;
pub use topems_shared_db::rls::rls_middleware;
pub use topems_shared_db::storage;
pub use topems_shared_db::audit_soft_delete;
pub use topems_shared_db::data_governance;
pub use topems_shared_db::migration;
pub use topems_shared_db::query_optimizer;

// --- shared-core 扩展模块 ---
pub use topems_shared_core::compression;
pub use topems_shared_core::feature_flag;
pub use topems_shared_core::api;
pub use topems_shared_core::api_security;
pub use topems_shared_core::layers;
pub use topems_shared_core::metrics;
pub use topems_shared_core::id;
pub use topems_shared_core::hrm;
pub use topems_shared_core::crud;
#[cfg(feature = "grpc")]
pub use topems_shared_core::grpc;

// --- shared-auth 扩展模块 ---
pub use topems_shared_auth::permission_center;
pub use topems_shared_auth::rate_limit;

// --- 高频 item-level re-export ---
// config::enhanced 模块
pub use topems_shared_core::config::enhanced::{
    AIConfig, CacheConfig as EnhancedCacheConfig, DatabaseConfig, JwtConfig, RedisConfig,
};
// health 模块
pub use topems_shared_core::health::{
    simple_health_check, SystemMetrics, ServiceHealth, SimpleHealthConfig,
    build_health_response, check_http_health, DependencyHealth, HealthStatus,
    HealthCheckResponse, HealthChecker, HealthState, ServiceMetrics, ServiceMonitor,
};
// response 模块
pub use topems_shared_core::response::{
    api_error, api_success, PaginatedResponse, PaginationParams,
};
// hrm 模块
pub use topems_shared_core::hrm::{PaginatedResult, PaginationQuery, AppState};
// logging 模块
pub use topems_shared_core::logging::{
    generate_request_id, create_log_filter, generate_span_id, generate_trace_id,
    get_current_request_id, get_current_trace_id, init_logging, inject_request_context,
    request_context_middleware,
};
// config 模块
pub use topems_shared_core::config::Config;
pub use topems_shared_core::config::get_default_port;
pub use topems_shared_core::config::CacheConfig;
// security 模块 (完整 re-export)
pub use topems_shared_auth::security::*;
// compression 模块
pub use topems_shared_core::compression::{CompressionMiddleware, CompressionConfig};
// service_discovery 模块
pub use topems_shared_event::service_discovery::{
    PortalServiceAggregator, ServiceRegistryStatus, LocalServiceRegistry,
};
// service_client 模块
pub use topems_shared_service_client::service_client::{
    WorkflowServiceClient, FinanceServiceClient, ErpServiceClient,
    MonitorServiceClient, TypedServiceClient,
    create_generic_client, create_hrm_client, create_iam_client,
    create_mes_client, create_notification_client, create_workflow_client,
    BaseServiceClient, Company, Department, Employee, GenericServiceClient,
    HrmServiceClient, IamServiceClient, MesServiceClient, NotificationSvcClient,
    ServiceClientError, ServiceClientResult, TaskStats, User, WorkflowTask,
};
// redis 模块
pub use topems_shared_event::redis::{
    RedisCacheService, BloomFilter, CacheService, RedisPool,
    CacheKeyGenerator as RedisCacheKeyGenerator, UnifiedCacheManager,
    CacheProtectionConfig, CacheStatisticsCollector,
};
// cache 模块 (event 版本，实现 CacheService)
pub use topems_shared_event::cache::InMemoryCache;
// observability 模块
pub use topems_shared_observability::telemetry::{
    telemetry_middleware, TelemetryExt,
};
pub use topems_shared_observability::monitoring::ServiceStatus;
// middleware 模块
pub use topems_shared_auth::middleware::{
    require_permission, require_role, require_tenant_status,
    tenant_middleware, department_middleware,
};
// permission_center 模块
pub use topems_shared_auth::permission_center::PermissionCenterClient;
// data_governance 模块
pub use topems_shared_db::data_governance::DataClassification;
// feature_flag 模块
pub use topems_shared_core::feature_flag::FeatureFlagService;
// layers 模块
pub use topems_shared_core::layers::Layer;

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

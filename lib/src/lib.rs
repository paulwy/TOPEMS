// =============================================================================
// topems_shared 门面 Crate — A4.1 去门面化阶段产物
// =============================================================================
//
// 本文件遵循 V68.1 实施计划，将原 119 条 `pub use` 精简为"保留核心（≤30 条）+
// 其余标记 deprecated"的两层结构。
//
// - **KEEP 区**：高频、跨服务通用的模块/符号（每服务几乎必用）。
// - **DEPRECATED 区**：低频、仅少数服务使用的模块/符号；请直接依赖
//   对应的子 crate（如 `topems-shared-event`、`topems-shared-db` 等）。
//
// 迁移指南（把本 crate 的 use 替换成子 crate）：
//   `use topems_shared::redis::RedisPool;`  →  `use topems_shared_event::redis::RedisPool;`
//   `use topems_shared::backup::BackupManager;` → `use topems_shared_db::backup::BackupManager;`
//   `use topems_shared::vector_store::*;`     → `use topems_shared_ai::vector_store::*;`
//
// 到 A4.2 迁移完成后，A4.3 会把 deprecated 条目全部删除，只留下 KEEP。
// =============================================================================

// =============================================================================
// KEEP — 核心保留项（28 条 pub use · 跨服务高频通用 · ≤30 阈值）
// =============================================================================

// --- 认证 / 租户 / 权限 · 每个服务必用 ---
pub use topems_shared_auth::auth;
pub use topems_shared_auth::middleware;
pub use topems_shared_auth::permission;
pub use topems_shared_auth::security;
pub use topems_shared_auth::tenant;

// --- 启动引导 · 每个服务必用 ---
pub use topems_shared_bootstrap::*;

// --- shared-core 基础模块 · 每个服务必用 ---
pub use topems_shared_core::config;
pub use topems_shared_core::error;
pub use topems_shared_core::health;
pub use topems_shared_core::logging;
pub use topems_shared_core::response;
// A4.1 KEEP 增补：根级高频符号 ApiResponse / ListResponse 在各服务普遍 use 根，降级到 DEPRECATED 会立即触发未解析 import error；≤30 阈值补 1 条到 29
pub use topems_shared_core::response::{ApiResponse, ListResponse};
pub use topems_shared_core::service_config;
pub use topems_shared_core::service_port;
pub use topems_shared_core::validation;

// --- shared-db 基础模块 · 有 DB 的服务必用 ---
pub use topems_shared_db::audit;
pub use topems_shared_db::database;
pub use topems_shared_db::schema;

// --- shared-core 新增的便捷类型（未走模块化 re-export，直接按名引用） ---
pub use topems_shared_core::cache::InMemoryCache as LocalInMemoryCache;
pub use topems_shared_core::common_types;
pub use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
pub use topems_shared_core::list_resp;

// --- 常用便捷聚合：item-level 短路径 re-export（顶层常用类型） ---
// A4.1 KEEP 补齐：api_version 模块名本身（30 条上限边界内，顶格第 30 条）
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
// DEPRECATED — 低频/领域专用项（请直接依赖对应子 crate，未来版本删除）
// =============================================================================

// ---------- topems_shared_ai（AI/向量/Ollama/嵌入/文件） ----------
#[deprecated(note = "直接依赖 topems-shared-ai：use topems_shared_ai::embedding;")]
pub use topems_shared_ai::embedding;
#[deprecated(note = "直接依赖 topems-shared-ai：use topems_shared_ai::ollama_client;")]
pub use topems_shared_ai::ollama_client;
#[deprecated(note = "直接依赖 topems-shared-ai：use topems_shared_ai::vector_store;")]
pub use topems_shared_ai::vector_store;
#[deprecated(note = "直接依赖 topems-shared-ai：use topems_shared_ai::permission_center;")]
pub use topems_shared_auth::permission_center;
#[deprecated(note = "直接依赖 topems-shared-auth：use topems_shared_auth::rate_limit;")]
pub use topems_shared_auth::rate_limit;

// ---------- topems_shared_core（除 KEEP 外的模块） ----------
#[deprecated(note = "直接依赖 topems-shared-core：use topems_shared_core::api;")]
pub use topems_shared_core::api;
#[deprecated(note = "直接依赖 topems-shared-core：use topems_shared_core::api_security;")]
pub use topems_shared_core::api_security;
#[deprecated(note = "直接依赖 topems-shared-core：use topems_shared_core::compression;")]
pub use topems_shared_core::compression;
#[deprecated(note = "直接依赖 topems-shared-core：use topems_shared_core::crud;")]
pub use topems_shared_core::crud;
#[deprecated(note = "直接依赖 topems-shared-core：use topems_shared_core::feature_flag;")]
pub use topems_shared_core::feature_flag;
#[cfg(feature = "grpc")]
#[deprecated(
    note = "直接依赖 topems-shared-core（feature=grpc）：use topems_shared_core::grpc;"
)]
pub use topems_shared_core::grpc;
#[deprecated(note = "直接依赖 topems-shared-core：use topems_shared_core::hrm;")]
pub use topems_shared_core::hrm;
#[deprecated(note = "直接依赖 topems-shared-core：use topems_shared_core::id;")]
pub use topems_shared_core::id;
#[deprecated(note = "直接依赖 topems-shared-core：use topems_shared_core::layers;")]
pub use topems_shared_core::layers;
#[deprecated(note = "直接依赖 topems-shared-core：use topems_shared_core::metrics;")]
pub use topems_shared_core::metrics;

// ---------- topems_shared_db（除 KEEP 外的模块） ----------
#[deprecated(note = "直接依赖 topems-shared-db：use topems_shared_db::audit_soft_delete;")]
pub use topems_shared_db::audit_soft_delete;
#[deprecated(note = "直接依赖 topems-shared-db：use topems_shared_db::backup;")]
pub use topems_shared_db::backup;
#[deprecated(note = "直接依赖 topems-shared-db：use topems_shared_db::data_governance;")]
pub use topems_shared_db::data_governance;
#[deprecated(note = "直接依赖 topems-shared-db：use topems_shared_db::migration;")]
pub use topems_shared_db::migration;
#[deprecated(note = "直接依赖 topems-shared-db：use topems_shared_db::query_optimizer;")]
pub use topems_shared_db::query_optimizer;
#[deprecated(note = "直接依赖 topems-shared-db：use topems_shared_db::repository;")]
pub use topems_shared_db::repository;
#[deprecated(note = "直接依赖 topems-shared-db：use topems_shared_db::rls;")]
pub use topems_shared_db::rls;
#[deprecated(note = "直接依赖 topems-shared-db：use topems_shared_db::storage;")]
pub use topems_shared_db::storage;

// ---------- topems_shared_event（全部标记 deprecated） ----------
#[deprecated(note = "直接依赖 topems-shared-event：use topems_shared_event::cache;")]
pub use topems_shared_event::cache;
#[deprecated(note = "直接依赖 topems-shared-event：use topems_shared_event::cluster;")]
pub use topems_shared_event::cluster;
#[deprecated(note = "直接依赖 topems-shared-event：use topems_shared_event::config_center;")]
pub use topems_shared_event::config_center;
#[deprecated(note = "直接依赖 topems-shared-event：use topems_shared_event::consul;")]
pub use topems_shared_event::consul;
#[deprecated(note = "直接依赖 topems-shared-event：use topems_shared_event::event;")]
pub use topems_shared_event::event;
#[deprecated(note = "直接依赖 topems-shared-event：use topems_shared_event::messaging;")]
pub use topems_shared_event::messaging;
#[deprecated(note = "直接依赖 topems-shared-event：use topems_shared_event::redis;")]
pub use topems_shared_event::redis;
#[deprecated(note = "直接依赖 topems-shared-event：use topems_shared_event::saga;")]
pub use topems_shared_event::saga;
#[deprecated(
    note = "直接依赖 topems-shared-event：use topems_shared_event::service_discovery;"
)]
pub use topems_shared_event::service_discovery;
#[deprecated(note = "直接依赖 topems-shared-event：use topems_shared_event::test_helpers;")]
pub use topems_shared_event::test_helpers;

// ---------- topems_shared_observability（全部） ----------
#[deprecated(
    note = "直接依赖 topems-shared-observability：use topems_shared_observability::monitoring;"
)]
pub use topems_shared_observability::monitoring;
#[deprecated(
    note = "直接依赖 topems-shared-observability：use topems_shared_observability::observability;"
)]
pub use topems_shared_observability::observability;
#[deprecated(
    note = "直接依赖 topems-shared-observability：use topems_shared_observability::performance;"
)]
pub use topems_shared_observability::performance;
#[deprecated(
    note = "直接依赖 topems-shared-observability：use topems_shared_observability::telemetry;"
)]
pub use topems_shared_observability::telemetry;

// ---------- topems_shared_service_client（全部） ----------
#[deprecated(
    note = "直接依赖 topems-shared-service-client：use topems_shared_service_client::notification;"
)]
pub use topems_shared_service_client::notification;
#[deprecated(
    note = "直接依赖 topems-shared-service-client：use topems_shared_service_client::service_client;"
)]
pub use topems_shared_service_client::service_client;

// =============================================================================
// DEPRECATED — 顶层 Item-level 聚合 re-export（迁移到直接子 crate）
// =============================================================================

#[deprecated(note = "use topems_shared_event::backup::*")]
pub use crate::backup::{
    BackupConfig, BackupError, BackupManager, BackupMetadata, BackupRequest, BackupSchedule,
    BackupStatistics, BackupStatus, BackupType, CompressionType, RestoreRequest,
};
#[deprecated(note = "use topems_shared_event::cache::*")]
pub use crate::cache::{
    CacheKeyGenerator, CacheManager, CacheStatistics, CacheWarmer, DistributedCacheManager,
    EvictionPolicy, InMemoryCache, MultiLevelCacheManager, MultiLevelCacheStatistics,
};
#[deprecated(note = "use topems_shared_event::cluster::*")]
pub use crate::cluster::{
    ClusterConfig, ClusterError, ClusterEvent, ClusterEventType, ClusterManager, ClusterMetrics,
    ClusterMode, EventSeverity, FailoverConfig, HealthCheckConfig, LoadBalancerConfig,
    LoadBalancingAlgorithm, NodeConfig, NodeHealth, NodeRole, NodeStatus,
};
#[deprecated(note = "use topems_shared_core::config::* 直接依赖")]
pub use crate::config::{
    get_default_port, AppConfig, CacheConfig, Config, ServiceConfig, ServiceRegistry,
};
#[deprecated(note = "use topems_shared_event::config_center::*")]
pub use crate::config_center::{
    ConfigAuditLog, ConfigCenter, ConfigSchema, ConfigType, ConfigVersion, ValidationRule,
};
#[deprecated(note = "use topems_shared_db::data_governance::*")]
pub use crate::data_governance::{
    BuiltInMaskingRules, ClassificationEngine, ClassificationRule, ComplianceAuditEvent,
    ComplianceAuditor, ComplianceConfig, ComplianceEventType, ComplianceReport,
    ComplianceReportGenerator, ComplianceReportType, ComplianceRequirement, ComplianceSummary,
    DataClassification, DataErasureResult, DataExportResult, DataMaskingEngine, DataSubject,
    DataSubjectRight, DataSubjectRightsManager, DataTag, DsrRequest, DsrRequestStatus, DsrSummary,
    EntityAccessStats, EntityDataTags, MaskingRule, MaskingStrategy,
};
#[deprecated(note = "use topems_shared_core::feature_flag::*")]
pub use crate::feature_flag::{
    FeatureCondition, FeatureContext, FeatureFlag, FeatureFlagService, FeatureState,
};
#[deprecated(note = "use topems_shared_core::health::*")]
pub use crate::health::{
    build_health_response, check_http_health, create_health_router, create_metrics_router,
    metrics_middleware, simple_health_check, standard_health_check, DependencyHealth,
    HealthCheckResponse, HealthChecker, HealthState, HealthStatus, ServiceHealth, ServiceMetrics,
    ServiceMonitor, SimpleHealthConfig, SystemMetrics,
};
#[deprecated(note = "use topems_shared_core::hrm::*")]
pub use crate::hrm::{AppState, PaginatedResult, PaginationQuery};
#[deprecated(note = "use topems_shared_core::layers::*")]
pub use crate::layers::{can_depend, module_layer, modules_by_layer, Layer};
#[deprecated(note = "use topems_shared_core::logging::*")]
pub use crate::logging::{
    create_log_filter, generate_request_id, generate_span_id, generate_trace_id,
    get_current_request_id, get_current_trace_id, init_logging, inject_request_context,
    request_context_middleware, JsonEventFormatter, LogAggregator, LogEntry, LogFormat, LogQuery,
    LogStats, RequestContext, RequestContextExt, TraceContext,
};
#[deprecated(note = "use topems_shared_event::messaging::*")]
pub use crate::messaging::{
    InMemoryMessageBroker, Message, MessageConsumer, MessageProducer, RedisMessageBroker,
};
#[deprecated(note = "use topems_shared_auth::middleware::*")]
pub use crate::middleware::{
    current_timestamp, department_middleware, enhanced_rate_limit_middleware, generate_nonce,
    require_department, require_module_active, require_module_permission, require_permission,
    require_role, require_tenant_status, tenant_middleware, AntiReplayConfig,
    EnhancedRateLimitConfig, EnhancedRateLimitMiddleware, EnhancedRateLimitRule, LimitDimension,
};
#[deprecated(note = "use topems_shared_observability::monitoring::*")]
pub use crate::monitoring::{
    default_alert_rules, Alert, AlertRule, AlertSeverity, MonitoringMetrics, MonitoringState,
    ServiceHealth as MonServiceHealth, ServiceStatus,
};
#[deprecated(note = "use topems_shared_service_client::notification::*")]
pub use crate::notification::{
    ArchiveConfig, CreateNotificationRequest, CreateTemplateRequest, Notification,
    NotificationListQuery, NotificationListResponse, NotificationServiceClient,
    NotificationServiceState, NotificationStats, NotificationTemplate, NotificationType,
    RenderTemplateRequest, TemplateStatus,
};
#[deprecated(note = "use topems_shared_observability::performance::*")]
pub use crate::performance::{
    ApiCallMetrics, ApiStats, CacheMetrics, CacheOperationRecorder, ComprehensiveMetrics,
    ComprehensiveStats, DatabaseQueryMetrics, DatabaseQueryTimer, DatabaseStats, EndpointStats,
    MetricsSnapshot, PerformanceMetrics, RequestTimer, TableStats,
};
#[deprecated(note = "use topems_shared_auth::permission::*")]
pub use crate::permission::{
    check_any_module_permission, check_module_permission, check_resource_permission,
    get_all_module_permissions, get_module_actions, DataCondition, DataPermission, ModuleCode,
    ModulePermission, PermissionAction, PermissionCacheStats, PermissionChangeType,
    PermissionMetadata, PermissionMetadataCache, PermissionScope, PermissionTemplate, Position,
    ResourcePermission,
};
#[deprecated(note = "use topems_shared_auth::permission_center::*")]
pub use crate::permission_center::{check_permission_with_scope, PermissionCenterClient};
#[deprecated(note = "use topems_shared_db::query_optimizer::*")]
pub use crate::query_optimizer::{
    suggest_query_optimization, BatchOperations, IndexRecommendation, NPlusOneDetector,
    NPlusOneWarning, PaginationOptimizer, QueryOptimizationSuggestion,
};
#[deprecated(note = "use topems_shared_event::redis::*")]
pub use crate::redis::{
    BloomFilter, CacheKeyGenerator as RedisCacheKeyGenerator, CacheProtectionConfig, CacheService,
    CacheStatisticsCollector, RedisCacheService, RedisPool, UnifiedCacheManager,
};
#[deprecated(note = "use topems_shared_db::repository::*")]
pub use crate::repository::{
    PaginatedQuery, PaginatedResult as RepoPaginatedResult, QueryBuilder, Repository,
};
#[deprecated(note = "use topems_shared_core::response::*")]
pub use crate::response::{api_error, api_success, PaginatedResponse, PaginationParams};
#[deprecated(note = "use topems_shared_db::rls::rls_middleware")]
pub use crate::rls::rls_middleware;
#[deprecated(note = "use topems_shared_db::schema::*")]
pub use crate::schema::{
    ai_table, bi_table, crm_table, ehs_table, erp_table, gis_table, hrm_table, im_table,
    integration_table, lims_table, mail_table, mes_table, mobile_table, pdm_table, pm_table,
    portal_table, qms_table, rs_table, scm_table, srm_table, with_schema, wms_table, AI_SCHEMA,
    BI_SCHEMA, CRM_SCHEMA, EHS_SCHEMA, ERP_SCHEMA, GIS_SCHEMA, HRM_SCHEMA, IM_SCHEMA,
    INTEGRATION_SCHEMA, LIMS_SCHEMA, MAIL_SCHEMA, MES_SCHEMA, MOBILE_SCHEMA, PDM_SCHEMA, PM_SCHEMA,
    PORTAL_SCHEMA, QMS_SCHEMA, RS_SCHEMA, SCM_SCHEMA, SRM_SCHEMA, WMS_SCHEMA,
};
#[deprecated(note = "use topems_shared_auth::security::*")]
pub use crate::security::*;
#[deprecated(note = "use topems_shared_core::config::enhanced::*")]
pub use topems_shared_core::config::enhanced::{
    AIConfig, CacheConfig as EnhancedCacheConfig, DatabaseConfig, JwtConfig, RedisConfig,
};

// service_bootstrap 别名（保留 mod 定义，但把内部的 quick_bootstrap 标 deprecated）
#[allow(deprecated)]
pub mod service_bootstrap {
    pub use topems_shared_bootstrap::*;
}
#[deprecated(note = "use topems_shared_bootstrap::* 直接依赖")]
pub use crate::service_bootstrap::{
    quick_bootstrap, quick_bootstrap_with_db, AppState as BootstrapAppState, BootstrapConfig,
    ServiceBootstrap,
};
#[deprecated(note = "use topems_shared_service_client::service_client::*")]
pub use crate::service_client::{
    create_generic_client, create_hrm_client, create_iam_client, create_mes_client,
    create_notification_client, create_workflow_client, BaseServiceClient, Company, Department,
    Employee, GenericServiceClient, HrmServiceClient, IamServiceClient, MesServiceClient,
    NotificationSvcClient, ServiceClientError, ServiceClientResult, TaskStats, User,
    WorkflowServiceClient, WorkflowTask,
};
#[deprecated(note = "use topems_shared_core::service_config::*")]
pub use crate::service_config::{
    global_registry, DeploymentType, ServiceConfigRegistry, ServiceDefinition, ServiceGroup,
    ValidationIssue, ValidationSeverity,
};
#[deprecated(note = "use topems_shared_event::service_discovery::*")]
pub use crate::service_discovery::{
    ConsulDiscoveryClient, ConsulServiceRegistrar, LocalServiceRegistry, PortalServiceAggregator,
    ServiceCategory, ServiceDiscoveryClient, ServiceHealthStatus, ServiceInfo, ServiceInstance,
    ServiceRegistryStatus, SmartServiceClient,
};
#[deprecated(note = "use topems_shared_db::storage::*")]
pub use crate::storage::{FileMetadata, LocalStorage, StorageConfig, StorageService};
#[deprecated(note = "use topems_shared_observability::telemetry::*")]
pub use crate::telemetry::{
    get_current_trace_context, init_telemetry, inject_trace_context, telemetry_middleware,
    TelemetryConfig, TelemetryExporter, TelemetryExt, TelemetryGuard,
};
#[deprecated(note = "use topems_shared_auth::tenant::*")]
pub use crate::tenant::{
    Tenant, TenantContext, TenantError, TenantManager, TenantPlan, TenantRole, TenantSettings,
    TenantStatus, TenantUpdate, TenantUser, UsageLimitExceeded, UsageMetrics,
};
#[deprecated(note = "use topems_shared_core::validation::*")]
pub use crate::validation::{ValidationError, ValidationResult, Validator};

// ----- AI / Ollama / 向量 / 文件 -----
#[deprecated(note = "use topems_shared_ai::embedding::*")]
pub use crate::embedding::{
    create_embedding_service, preprocess_text, EmbeddingConfig, EmbeddingResult, EmbeddingUsage,
};
#[deprecated(note = "use topems_shared_ai::ollama_client::*")]
pub use crate::ollama_client::{
    create_embedder, create_ollama_client, Embedder, MockEmbedder, OllamaClient, OllamaConfig,
    OllamaEmbedder,
};
#[deprecated(note = "use topems_shared_ai::vector_store::*")]
pub use crate::vector_store::{
    create_vector_store, RedisVectorStore, SearchResult, VectorMetadata, VectorStore,
};
// 为了兼容性，提供 ollama 别名
#[deprecated(note = "use topems_shared_ai::ollama_client::*")]
pub mod ollama {
    #[allow(deprecated)]
    pub use crate::ollama_client::*;
}

#[deprecated(note = "use topems_shared_ai::ai_client::*")]
pub use crate::ai_client::{
    create_client, get_supported_models, AIClient, AIClientError, AIModelConfig, AIProviderType,
    ChatCompletionRequest, ChatCompletionResponse, ChatMessage, EmbeddingRequest,
    EmbeddingResponse, UnifiedAIClient,
};
#[deprecated(note = "use topems_shared_core::api::*")]
pub use crate::api::{
    BatchRequest, BatchRequestHandler, BatchResponse, RequestPriority, SingleRequest,
    SingleResponse,
};
#[deprecated(note = "use topems_shared_core::compression::*")]
pub use crate::compression::{CompressionAlgorithm, CompressionConfig, CompressionMiddleware};
#[deprecated(note = "use topems_shared_ai::file_client::*")]
pub use crate::file_client::{FileServiceClient, UploadResponse};
#[cfg(feature = "grpc")]
#[deprecated(note = "use topems_shared_core::grpc::* (feature=grpc)")]
pub use crate::grpc::{
    DependencyProbe, GrpcChannelPool, GrpcHealthCheckResponse, GrpcHealthChecker, GrpcHealthServer,
    GrpcHealthState, GrpcHealthStatus, GrpcPoolConfig, GrpcPoolError, GrpcPoolStats, HealthProbeId,
    LoadBalancingStrategy, PooledChannel, ProbeKind,
};
#[deprecated(note = "use topems_shared_db::migration::*")]
pub use crate::migration::{MigrationHistory, MigrationResult, MigrationSDK, MigrationStatus};
#[deprecated(note = "use topems_shared_observability::observability::*")]
pub use crate::observability::presets::{
    standard_slos_for_all_services, standard_slos_for_service,
};
#[deprecated(note = "use topems_shared_observability::observability::*")]
pub use crate::observability::{
    AlertEvent, AlertManager, AlertRule as ObservabilityAlertRule,
    AlertSeverity as ObservabilityAlertSeverity, AlertState, AlertStats, InMemoryLogStore,
    LogEntry as ObservabilityLogEntry, LogLevel, LogQuery as ObservabilityLogQuery, LogQueryError,
    LogQueryProvider, LogQueryResult, LogStats as ObservabilityLogStats, ObservabilityAggregator,
    ObservabilityDashboard, SLODefinition, SLOManager, SLOMeasurement, SLOReport, SLOStatus,
    SLOType,
};
#[deprecated(note = "use topems_shared_event::saga::*")]
pub use crate::saga::{
    InMemorySagaStore, PostgresSagaStore, SagaError, SagaInstance, SagaOrchestrator, SagaResult,
    SagaStatus, SagaStep, SagaStepDefinition, SagaStore, StepStatus,
};
#[deprecated(note = "use topems_shared_ai::ai_client;")]
pub use topems_shared_ai::ai_client;
#[deprecated(note = "use topems_shared_ai::file_client;")]
pub use topems_shared_ai::file_client;

// =============================================================================
// 扩展 trait：为 shared-core 中的类型提供主 crate 特有的功能
// =============================================================================

/// AuditContext 扩展 trait
///
/// 为 `topems_shared_core::api_security::AuditContext` 提供 `to_audit_request` 方法，
/// 将审计上下文转换为主 crate 的 `CreateAuditLogRequest`。
/// 此 trait 仅在主 crate 中可用，保持 shared-core 对 audit 模块的零依赖。
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

pub use topems_shared_ai::embedding;
pub use topems_shared_ai::ollama_client;
pub use topems_shared_ai::vector_store;
pub use topems_shared_auth::auth;
pub use topems_shared_auth::middleware;
pub use topems_shared_auth::permission;
pub use topems_shared_auth::permission_center;
pub use topems_shared_auth::rate_limit;
pub use topems_shared_auth::security;
pub use topems_shared_auth::tenant;
pub use topems_shared_bootstrap::*;
pub use topems_shared_core::api;
pub use topems_shared_core::api_security;
pub use topems_shared_core::api_version;
pub use topems_shared_core::compression;
pub use topems_shared_core::config;
pub use topems_shared_core::cors;
pub use topems_shared_core::crud;
pub use topems_shared_core::error;
pub use topems_shared_core::feature_flag;
#[cfg(feature = "grpc")]
pub use topems_shared_core::grpc;
pub use topems_shared_core::health;
pub use topems_shared_core::hrm;
pub use topems_shared_core::id;
pub use topems_shared_core::layers;
pub use topems_shared_core::logging;
pub use topems_shared_core::metrics;
pub use topems_shared_core::response;
pub use topems_shared_core::service_config;
pub use topems_shared_core::service_port;
pub use topems_shared_core::validation;
pub use topems_shared_db::audit;
pub use topems_shared_db::audit_soft_delete;
pub use topems_shared_db::backup;
pub use topems_shared_db::data_governance;
pub use topems_shared_db::database;
pub use topems_shared_db::migration;
pub use topems_shared_db::query_optimizer;
pub use topems_shared_db::repository;
pub use topems_shared_db::rls;
pub use topems_shared_db::schema;
pub use topems_shared_db::storage;
pub use topems_shared_event::cache;
pub use topems_shared_event::cluster;
pub use topems_shared_event::config_center;
pub use topems_shared_event::consul;
pub use topems_shared_event::event;
pub use topems_shared_event::messaging;
pub use topems_shared_event::redis;
pub use topems_shared_event::saga;
pub use topems_shared_event::service_discovery;
/// 通用测试辅助工具（Redis Pub/Sub 两阶段订阅 API）。
///
/// 公开导出使所有依赖 `topems-shared` 的服务 crate 能在自己的集成测试中复用
/// `prepare_subscription` + `wait_for_match` 模式，避免 Future 惰性执行竞态。
pub use topems_shared_event::test_helpers;
pub use topems_shared_observability::monitoring;
pub use topems_shared_observability::observability;
pub use topems_shared_observability::performance;
pub use topems_shared_observability::telemetry;
pub use topems_shared_service_client::notification;
pub use topems_shared_service_client::service_client;

// AI 客户端模块
pub use topems_shared_ai::ai_client;

pub use api_version::{
    api_prefix, create_api_info, create_api_info_router, get_api_info_handler,
    register_routes_with_legacy_alias, versioned_router, wrap_group2_router, ApiInfo,
    ApiVersionInfo, RouteCompatConfig,
};
pub use audit::{AuditLog, AuditLogQuery, AuditLogService, CreateAuditLogRequest};
pub use auth::{
    auth_middleware, check_permission, check_role, generate_jwt_token, generate_refresh_token,
    get_permission_by_id, get_permissions, get_role_by_id, get_roles, require_all_permissions,
    require_any_permission, require_superuser, verify_jwt_token, AuthState, Claims, Permission,
    Role,
};
pub use backup::{
    BackupConfig, BackupError, BackupManager, BackupMetadata, BackupRequest, BackupSchedule,
    BackupStatistics, BackupStatus, BackupType, CompressionType, RestoreRequest,
};
pub use cache::{
    CacheKeyGenerator, CacheManager, CacheStatistics, CacheWarmer, DistributedCacheManager,
    EvictionPolicy, InMemoryCache, MultiLevelCacheManager, MultiLevelCacheStatistics,
};
pub use cluster::{
    ClusterConfig, ClusterError, ClusterEvent, ClusterEventType, ClusterManager, ClusterMetrics,
    ClusterMode, EventSeverity, FailoverConfig, HealthCheckConfig, LoadBalancerConfig,
    LoadBalancingAlgorithm, NodeConfig, NodeHealth, NodeRole, NodeStatus,
};
pub use config::enhanced::{
    AIConfig, CacheConfig as EnhancedCacheConfig, DatabaseConfig, JwtConfig, RedisConfig,
};
pub use config::{
    get_default_port, AppConfig, CacheConfig, Config, ServiceConfig, ServiceRegistry,
};
pub use config_center::{
    ConfigAuditLog, ConfigCenter, ConfigSchema, ConfigType, ConfigVersion, ValidationRule,
};
pub use cors::create_cors_layer;
pub use data_governance::{
    BuiltInMaskingRules, ClassificationEngine, ClassificationRule, ComplianceAuditEvent,
    ComplianceAuditor, ComplianceConfig, ComplianceEventType, ComplianceReport,
    ComplianceReportGenerator, ComplianceReportType, ComplianceRequirement, ComplianceSummary,
    DataClassification, DataErasureResult, DataExportResult, DataMaskingEngine, DataSubject,
    DataSubjectRight, DataSubjectRightsManager, DataTag, DsrRequest, DsrRequestStatus, DsrSummary,
    EntityAccessStats, EntityDataTags, MaskingRule, MaskingStrategy,
};
pub use database::{
    check_pool_health, create_database_pool, test_database_connection, HealthCheckResult,
    ReadWriteConfig, ReadWritePool,
};
pub use error::{Result, TopemsError};
pub use event::{
    CacheInvalidatedPayload, EhsAccidentReportedPayload, EhsHazardReportedPayload, Event,
    EventError, EventPublisher, EventResult, EventSubscriber, EventType,
    HrmDepartmentCreatedPayload, HrmDepartmentDeletedPayload, HrmDepartmentUpdatedPayload,
    HrmEmployeeCreatedPayload, HrmEmployeeUpdatedPayload, LimsInspectionAbnormalDetectedPayload,
    LimsInspectionResultSubmittedPayload, LimsSampleRegisteredPayload, MasterDataAction,
    MasterDataDomain, MasterDataEvent, MasterDataPublisher, MasterDataRef,
    PermissionChangedPayload, PmProjectCreatedPayload, PmProjectUpdatedPayload,
    PmTaskCreatedPayload, PmTaskDeletedPayload, PmTaskUpdatedPayload, PositionCreatedPayload,
    PositionDeletedPayload, PositionUpdatedPayload, QmsCorrectiveActionCreatedPayload,
    QmsInspectionCompletedPayload,
};
pub use feature_flag::{
    FeatureCondition, FeatureContext, FeatureFlag, FeatureFlagService, FeatureState,
};
pub use health::{
    build_health_response, check_http_health, create_health_router, create_metrics_router,
    metrics_middleware, simple_health_check, standard_health_check, DependencyHealth,
    HealthCheckResponse, HealthChecker, HealthState, HealthStatus, ServiceHealth, ServiceMetrics,
    ServiceMonitor, SimpleHealthConfig, SystemMetrics,
};
pub use hrm::{AppState, PaginatedResult, PaginationQuery};
pub use layers::{can_depend, module_layer, modules_by_layer, Layer};
pub use logging::{
    create_log_filter, generate_request_id, generate_span_id, generate_trace_id,
    get_current_request_id, get_current_trace_id, init_logging, inject_request_context,
    request_context_middleware, JsonEventFormatter, LogAggregator, LogEntry, LogFormat, LogQuery,
    LogStats, RequestContext, RequestContextExt, TraceContext,
};
pub use messaging::{
    InMemoryMessageBroker, Message, MessageConsumer, MessageProducer, RedisMessageBroker,
};
pub use monitoring::{
    default_alert_rules, Alert, AlertRule, AlertSeverity, MonitoringMetrics, MonitoringState,
    ServiceHealth as MonServiceHealth, ServiceStatus,
};
pub use notification::{
    ArchiveConfig, CreateNotificationRequest, CreateTemplateRequest, Notification,
    NotificationListQuery, NotificationListResponse, NotificationServiceClient,
    NotificationServiceState, NotificationStats, NotificationTemplate, NotificationType,
    RenderTemplateRequest, TemplateStatus,
};
pub use performance::{
    ApiCallMetrics, ApiStats, CacheMetrics, CacheOperationRecorder, ComprehensiveMetrics,
    ComprehensiveStats, DatabaseQueryMetrics, DatabaseQueryTimer, DatabaseStats, EndpointStats,
    MetricsSnapshot, PerformanceMetrics, RequestTimer, TableStats,
};
pub use permission::{
    check_any_module_permission, check_module_permission, check_resource_permission,
    get_all_module_permissions, get_module_actions, DataCondition, DataPermission, ModuleCode,
    ModulePermission, PermissionAction, PermissionCacheStats, PermissionChangeType,
    PermissionMetadata, PermissionMetadataCache, PermissionScope, PermissionTemplate, Position,
    ResourcePermission,
};
pub use permission_center::{check_permission_with_scope, PermissionCenterClient};
/// 进程内内存缓存（moka 实现，接受 Duration 作为 TTL）
/// 与 `cache::InMemoryCache`（接受 CacheConfig）不同，供各服务局部缓存使用。
pub use topems_shared_core::cache::InMemoryCache as LocalInMemoryCache;
/// 异步 L2 缓存（进程内 moka L1 + Redis L2），Redis 不可用时自动降级为纯 L1。
pub use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};

pub use middleware::{
    current_timestamp, department_middleware, enhanced_rate_limit_middleware, generate_nonce,
    require_department, require_module_active, require_module_permission, require_permission,
    require_role, require_tenant_status, tenant_middleware, AntiReplayConfig,
    EnhancedRateLimitConfig, EnhancedRateLimitMiddleware, EnhancedRateLimitRule, LimitDimension,
};
pub use query_optimizer::{
    suggest_query_optimization, BatchOperations, IndexRecommendation, NPlusOneDetector,
    NPlusOneWarning, PaginationOptimizer, QueryOptimizationSuggestion,
};
pub use redis::{
    BloomFilter, CacheKeyGenerator as RedisCacheKeyGenerator, CacheProtectionConfig, CacheService,
    CacheStatisticsCollector, RedisCacheService, RedisPool, UnifiedCacheManager,
};
pub use repository::{
    PaginatedQuery, PaginatedResult as RepoPaginatedResult, QueryBuilder, Repository,
};
pub use response::{
    api_error, api_success, ApiResponse, ListResponse, PaginatedResponse, PaginationParams,
};
pub use rls::rls_middleware;
pub use schema::{
    ai_table, bi_table, crm_table, ehs_table, erp_table, gis_table, hrm_table, im_table,
    integration_table, lims_table, mail_table, mes_table, mobile_table, pdm_table, pm_table,
    portal_table, qms_table, rs_table, scm_table, srm_table, with_schema, wms_table, AI_SCHEMA,
    BI_SCHEMA, CRM_SCHEMA, EHS_SCHEMA, ERP_SCHEMA, GIS_SCHEMA, HRM_SCHEMA, IM_SCHEMA,
    INTEGRATION_SCHEMA, LIMS_SCHEMA, MAIL_SCHEMA, MES_SCHEMA, MOBILE_SCHEMA, PDM_SCHEMA, PM_SCHEMA,
    PORTAL_SCHEMA, QMS_SCHEMA, RS_SCHEMA, SCM_SCHEMA, SRM_SCHEMA, WMS_SCHEMA,
};
pub use security::*;
pub use topems_shared_core::list_resp;
pub mod service_bootstrap {
    pub use topems_shared_bootstrap::*;
}
pub use service_bootstrap::{
    quick_bootstrap, quick_bootstrap_with_db, AppState as BootstrapAppState, BootstrapConfig,
    ServiceBootstrap,
};
pub use service_client::{
    create_generic_client, create_hrm_client, create_iam_client, create_mes_client,
    create_notification_client, create_workflow_client, BaseServiceClient, Company, Department,
    Employee, GenericServiceClient, HrmServiceClient, IamServiceClient, MesServiceClient,
    NotificationSvcClient, ServiceClientError, ServiceClientResult, TaskStats, User,
    WorkflowServiceClient, WorkflowTask,
};
pub use service_config::{
    global_registry, DeploymentType, ServiceConfigRegistry, ServiceDefinition, ServiceGroup,
    ValidationIssue, ValidationSeverity,
};
pub use service_discovery::{
    ConsulDiscoveryClient, ConsulServiceRegistrar, LocalServiceRegistry, PortalServiceAggregator,
    ServiceCategory, ServiceDiscoveryClient, ServiceHealthStatus, ServiceInfo, ServiceInstance,
    ServiceRegistryStatus, SmartServiceClient,
};
pub use storage::{FileMetadata, LocalStorage, StorageConfig, StorageService};
pub use telemetry::{
    get_current_trace_context, init_telemetry, inject_trace_context, telemetry_middleware,
    TelemetryConfig, TelemetryExporter, TelemetryExt, TelemetryGuard,
};
pub use tenant::{
    Tenant, TenantContext, TenantError, TenantManager, TenantPlan, TenantRole, TenantSettings,
    TenantStatus, TenantUpdate, TenantUser, UsageLimitExceeded, UsageMetrics,
};
pub use validation::{ValidationError, ValidationResult, Validator};

// 向量存储模块
pub use vector_store::{
    create_vector_store, RedisVectorStore, SearchResult, VectorMetadata, VectorStore,
};

// 嵌入服务模块
pub use embedding::{
    create_embedding_service, preprocess_text, EmbeddingConfig, EmbeddingResult, EmbeddingUsage,
};

// Ollama 客户端模块
pub use ollama_client::{
    create_embedder, create_ollama_client, Embedder, MockEmbedder, OllamaClient, OllamaConfig,
    OllamaEmbedder,
};
// 为了兼容性，提供 ollama 别名
pub mod ollama {
    pub use crate::ollama_client::*;
}

// File 服务客户端模块
pub use file_client::{FileServiceClient, UploadResponse};
pub use topems_shared_ai::file_client;

// Migration SDK 模块
pub use migration::{MigrationHistory, MigrationResult, MigrationSDK, MigrationStatus};

// AI 客户端模块导出
pub use ai_client::{
    create_client, get_supported_models, AIClient, AIClientError, AIModelConfig, AIProviderType,
    ChatCompletionRequest, ChatCompletionResponse, ChatMessage, EmbeddingRequest,
    EmbeddingResponse, UnifiedAIClient,
};

// 批量请求模块导出
pub use api::{
    BatchRequest, BatchRequestHandler, BatchResponse, RequestPriority, SingleRequest,
    SingleResponse,
};

// 数据压缩中间件模块导出
pub use compression::{CompressionAlgorithm, CompressionConfig, CompressionMiddleware};

// Saga 分布式事务编排器模块导出
pub use saga::{
    InMemorySagaStore, PostgresSagaStore, SagaError, SagaInstance, SagaOrchestrator, SagaResult,
    SagaStatus, SagaStep, SagaStepDefinition, SagaStore, StepStatus,
};

// 可观测性聚合模块导出（SLO + 日志查询 + 告警分级）
// 注意：AlertRule/AlertSeverity/LogQuery/LogEntry 与 monitoring/logging 模块重名，
// 此处使用 Observability 前缀别名避免 E0252 重复定义错误。
// 如需使用 observability 命名空间下的原始类型，可直接通过 `observability::` 路径访问。
pub use observability::presets::{standard_slos_for_all_services, standard_slos_for_service};
pub use observability::{
    AlertEvent, AlertManager, AlertRule as ObservabilityAlertRule,
    AlertSeverity as ObservabilityAlertSeverity, AlertState, AlertStats, InMemoryLogStore,
    LogEntry as ObservabilityLogEntry, LogLevel, LogQuery as ObservabilityLogQuery, LogQueryError,
    LogQueryProvider, LogQueryResult, LogStats as ObservabilityLogStats, ObservabilityAggregator,
    ObservabilityDashboard, SLODefinition, SLOManager, SLOMeasurement, SLOReport, SLOStatus,
    SLOType,
};

// gRPC 微服务基础模块导出（V24.0 模块 C）
// 仅当启用 grpc feature 时生效
#[cfg(feature = "grpc")]
pub use grpc::{
    DependencyProbe, GrpcChannelPool, GrpcHealthCheckResponse, GrpcHealthChecker, GrpcHealthServer,
    GrpcHealthState, GrpcHealthStatus, GrpcPoolConfig, GrpcPoolError, GrpcPoolStats, HealthProbeId,
    LoadBalancingStrategy, PooledChannel, ProbeKind,
};

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

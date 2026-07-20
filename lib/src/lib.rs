pub mod api;
pub mod api_security;
pub mod api_version;
pub mod audit;
pub mod auth;
pub mod backup;
pub mod cache;
pub mod cluster;
pub mod compression;
pub mod config;
pub mod config_center;
pub mod cors;
pub mod crud;
pub mod database;
pub mod embedding;
pub mod error;
pub mod event;
pub mod feature_flag;
#[cfg(feature = "grpc")]
pub mod grpc;
pub mod health;
pub mod hrm;
pub mod layers;
pub mod logging;
pub mod messaging;
pub mod metrics;
pub mod middleware;
pub mod migration;
pub mod monitoring;
pub mod notification;
pub mod observability;
pub mod ollama_client;
pub mod performance;
pub mod permission;
pub mod permission_center;
pub mod query_optimizer;
pub mod rate_limit;
pub mod redis;
pub mod repository;
pub mod response;
pub mod rls;
pub mod saga;
pub mod schema;
pub mod security;
pub mod service_bootstrap;
pub mod service_client;
pub mod service_config;
pub mod service_discovery;
pub mod service_port;
pub mod storage;
pub mod telemetry;
pub mod tenant;
pub mod validation;
pub mod vector_store;

// AI 客户端模块
pub mod ai_client;

pub use api_version::{
    api_prefix, create_api_info, create_api_info_router, default_versioned_router,
    deprecation_middleware, get_api_info_handler, group1_route_compat_middleware,
    group2_route_compat_middleware, register_routes_with_legacy_alias, versioned_router,
    wrap_group1_router, wrap_group2_router, ApiInfo, ApiVersionInfo, Group1CompatConfig,
    RouteCompatConfig,
};
pub use audit::{AuditLog, AuditLogQuery, CreateAuditLogRequest};
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
    LimsInspectionResultSubmittedPayload, LimsSampleRegisteredPayload, PermissionChangedPayload,
    PmProjectCreatedPayload, PmProjectUpdatedPayload, PmTaskCreatedPayload, PmTaskDeletedPayload,
    PmTaskUpdatedPayload, PositionCreatedPayload, PositionDeletedPayload, PositionUpdatedPayload,
    QmsCorrectiveActionCreatedPayload, QmsInspectionCompletedPayload,
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
    create_log_filter, generate_request_id, generate_span_id, generate_trace_id, init_logging,
    JsonEventFormatter, LogAggregator, LogEntry, LogFormat, LogQuery, LogStats, TraceContext,
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

pub use middleware::{
    department_middleware, require_department, require_module_active, require_module_permission,
    require_permission, require_role, require_tenant_status, tenant_middleware,
};
pub use query_optimizer::{
    suggest_query_optimization, BatchOperations, IndexRecommendation, NPlusOneDetector,
    NPlusOneWarning, PaginationOptimizer, QueryOptimizationSuggestion,
};
pub use rate_limit::{RateLimitConfig, RateLimitMiddleware};
pub use redis::{
    BloomFilter, CacheKeyGenerator as RedisCacheKeyGenerator, CacheProtectionConfig, CacheService,
    CacheStatisticsCollector, RedisCacheService, RedisPool, UnifiedCacheManager,
};
pub use repository::{
    PaginatedQuery, PaginatedResult as RepoPaginatedResult, QueryBuilder, Repository,
};
pub use response::{api_error, api_success, ApiResponse, PaginatedResponse, PaginationParams};
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
pub use service_bootstrap::{
    quick_bootstrap, quick_bootstrap_with_db, AppState as BootstrapAppState, BootstrapConfig,
    ServiceBootstrap,
};
pub use service_client::{
    create_generic_client, create_hrm_client, create_iam_client, create_notification_client,
    BaseServiceClient, Company, Department, Employee, GenericServiceClient, HrmServiceClient,
    IamServiceClient, NotificationSvcClient, ServiceClientError, ServiceClientResult, User,
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
pub mod file_client;
pub use file_client::{FileServiceClient, UploadResponse};

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

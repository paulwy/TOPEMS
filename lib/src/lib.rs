pub mod config;
pub mod error;
pub mod auth;
pub mod response;
pub mod cors;
pub mod health;
pub mod hrm;
pub mod performance;
pub mod database;
pub mod logging;
pub mod monitoring;
pub mod backup;
pub mod tenant;
pub mod cluster;
pub mod redis;
pub mod rate_limit;
pub mod repository;
pub mod messaging;
pub mod storage;
pub mod validation;
pub mod permission;
pub mod audit;
pub mod notification;
pub mod service_client;
pub mod event;
pub mod api_version;
pub mod schema;
pub mod cache;
pub mod query_optimizer;
pub mod service_bootstrap;
pub mod service_discovery;

pub use config::{Config, AppConfig, ServiceConfig, ServiceRegistry, get_default_port, CacheConfig};
pub use config::enhanced::{
    DatabaseConfig, RedisConfig, JwtConfig, AIConfig, CacheConfig as EnhancedCacheConfig,
};
pub use error::{TopemsError, Result};
pub use auth::{Claims, AuthState, Role, Permission, get_permissions, get_roles, auth_middleware, check_permission, check_role, require_superuser, require_any_permission, require_all_permissions, get_role_by_id, get_permission_by_id, generate_jwt_token, verify_jwt_token, generate_refresh_token};
pub use response::{ApiResponse, PaginationParams, PaginatedResponse, api_error};
pub use cors::create_cors_layer;
pub use health::{
    ServiceHealth, HealthStatus, DependencyHealth, HealthCheckResponse, 
    ServiceMetrics, ServiceMonitor, HealthChecker, SystemMetrics, 
    check_http_health, HealthState, standard_health_check, 
    create_health_router, metrics_middleware, create_metrics_router,
    SimpleHealthConfig, simple_health_check, build_health_response
};
pub use hrm::{AppState, PaginationQuery, PaginatedResult};
pub use performance::{
    PerformanceMetrics, MetricsSnapshot, RequestTimer,
    ApiCallMetrics, DatabaseQueryMetrics, CacheMetrics,
    ComprehensiveMetrics, EndpointStats, ApiStats, TableStats,
    DatabaseStats, ComprehensiveStats, DatabaseQueryTimer, CacheOperationRecorder
};
pub use database::{
    create_database_pool, test_database_connection,
    HealthCheckResult, check_pool_health
};
pub use logging::{LogEntry, LogQuery, LogStats, LogAggregator, TraceContext, create_log_filter, init_logging};
pub use monitoring::{MonitoringState, ServiceHealth as MonServiceHealth, ServiceStatus, MonitoringMetrics, AlertRule, AlertSeverity, Alert, default_alert_rules};
pub use backup::{BackupManager, BackupConfig, BackupMetadata, BackupType, BackupStatus, BackupRequest, RestoreRequest, BackupStatistics, BackupError, BackupSchedule, CompressionType};
pub use tenant::{TenantManager, Tenant, TenantStatus, TenantPlan, TenantSettings, TenantUser, TenantRole, TenantContext, TenantError, TenantUpdate, UsageMetrics, UsageLimitExceeded};
pub use cluster::{ClusterManager, ClusterConfig, ClusterMode, NodeConfig, NodeRole, NodeStatus, NodeHealth, LoadBalancerConfig, LoadBalancingAlgorithm, HealthCheckConfig, FailoverConfig, ClusterMetrics, ClusterEvent, ClusterEventType, EventSeverity, ClusterError};
pub use redis::{RedisPool, RedisCacheService, CacheService};
pub use rate_limit::{RateLimitConfig, RateLimitMiddleware};
pub use repository::{Repository, PaginatedQuery, PaginatedResult as RepoPaginatedResult, QueryBuilder};
pub use messaging::{Message, MessageProducer, MessageConsumer, RedisMessageBroker, InMemoryMessageBroker};
pub use storage::{StorageConfig, FileMetadata, StorageService, LocalStorage};
pub use validation::{ValidationError, ValidationResult, Validator};
pub use permission::{ModulePermission, check_module_permission, check_resource_permission, check_any_module_permission};
pub use audit::{AuditLog, CreateAuditLogRequest, AuditLogQuery};
pub use notification::{
    NotificationType,
    Notification,
    CreateNotificationRequest,
    NotificationTemplate,
    CreateTemplateRequest,
    RenderTemplateRequest,
    TemplateStatus,
    ArchiveConfig,
    NotificationStats,
    NotificationListResponse,
    NotificationListQuery,
    NotificationServiceClient,
    NotificationServiceState,
};
pub use service_discovery::{
    ServiceInfo,
    ServiceCategory,
    ServiceRegistryStatus,
    ServiceDiscoveryClient,
    ServiceHealthStatus,
    LocalServiceRegistry,
    PortalServiceAggregator,
};
pub use service_client::{
    ServiceClientError,
    ServiceClientResult,
    BaseServiceClient,
    HrmServiceClient,
    IamServiceClient,
    Employee,
    Department,
    Company,
    User,
    create_hrm_client,
    create_iam_client,
};
pub use event::{
    EventError,
    EventResult,
    Event,
    EventType,
    HrmEmployeeCreatedPayload,
    HrmEmployeeUpdatedPayload,
    PmProjectCreatedPayload,
    EventPublisher,
    EventSubscriber,
};
pub use api_version::{
    ApiVersionInfo,
    ApiInfo,
    api_prefix,
    versioned_router,
    default_versioned_router,
    create_api_info,
    create_api_info_router,
    get_api_info_handler,
};
pub use schema::{
    HRM_SCHEMA,
    ERP_SCHEMA,
    PM_SCHEMA,
    CRM_SCHEMA,
    QMS_SCHEMA,
    MES_SCHEMA,
    WMS_SCHEMA,
    SRM_SCHEMA,
    SCM_SCHEMA,
    PDM_SCHEMA,
    LIMS_SCHEMA,
    RS_SCHEMA,
    GIS_SCHEMA,
    EHS_SCHEMA,
    BI_SCHEMA,
    AI_SCHEMA,
    IM_SCHEMA,
    INTEGRATION_SCHEMA,
    MAIL_SCHEMA,
    MOBILE_SCHEMA,
    PORTAL_SCHEMA,
    with_schema,
    hrm_table,
    erp_table,
    pm_table,
    crm_table,
    qms_table,
    mes_table,
    wms_table,
    srm_table,
    scm_table,
    pdm_table,
    lims_table,
    rs_table,
    gis_table,
    ehs_table,
    bi_table,
    ai_table,
    im_table,
    integration_table,
    mail_table,
    mobile_table,
    portal_table,
};
pub use cache::{
    InMemoryCache, CacheManager, CacheStatistics, EvictionPolicy
};
pub use query_optimizer::{
    IndexRecommendation, QueryOptimizationSuggestion,
    suggest_query_optimization,
    BatchOperations, PaginationOptimizer,
    NPlusOneDetector, NPlusOneWarning
};
pub use service_bootstrap::{
    ServiceBootstrap, BootstrapConfig, AppState as BootstrapAppState,
    quick_bootstrap, quick_bootstrap_with_db,
};

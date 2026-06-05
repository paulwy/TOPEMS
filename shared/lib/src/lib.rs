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

pub use config::{Config, AppConfig, ServiceConfig, ServiceRegistry, get_default_port};
pub use error::{TopemsError, Result};
pub use auth::{Claims, AuthState, Role, Permission, get_permissions, get_roles, auth_middleware, check_permission, check_role, require_superuser, require_any_permission, require_all_permissions, get_role_by_id, get_permission_by_id};
pub use response::{ApiResponse, PaginationParams, PaginatedResponse, api_error};
pub use cors::create_cors_layer;
pub use health::{ServiceHealth, HealthStatus, DependencyHealth, HealthCheckResponse, ServiceMetrics, ServiceMonitor, HealthChecker, SystemMetrics, check_http_health};
pub use hrm::{AppState, PaginationQuery, PaginatedResult};
pub use performance::{PerformanceMetrics, MetricsSnapshot, RequestTimer};
pub use database::{create_database_pool, test_database_connection};
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
    NotificationServiceClient,
    NotificationServiceState,
};

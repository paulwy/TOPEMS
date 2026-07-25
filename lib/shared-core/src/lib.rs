//! # TOPEMS Shared Core
//!
//! 核心基础模块，提供所有服务共享的基础类型和工具。
//!
//! 包含：错误类型、响应格式、验证、配置、健康检查、ID 生成、
//! API 版本管理、CORS、模块分层、日志、特性标志、指标、CRUD 基础等。

// === 已迁移到本 crate 的模块（实际实现）===
pub mod error;
pub mod response;
pub mod validation;
pub mod config;
pub mod health;
pub mod id;
pub mod api_version;
pub mod api;
pub mod api_security;
pub mod cors;
pub mod layers;
pub mod logging;
pub mod feature_flag;
pub mod metrics;
pub mod hrm;
pub mod crud;
pub mod compression;
pub mod service_config;
pub mod service_port;

// === gRPC 微服务基础（V24.0 模块 C）===
// 仅当启用 grpc feature 时编译；提供连接池与健康检查抽象。
#[cfg(feature = "grpc")]
pub mod grpc;

// === 常用类型 re-export ===
pub use error::{Result, TopemsError};
pub use response::{api_error, api_success, ApiResponse, PaginatedResponse, PaginationParams};
pub use validation::{ValidationError, ValidationResult, Validator};
pub use config::{get_default_port, AppConfig, CacheConfig, Config, ServiceConfig, ServiceRegistry};
pub use config::enhanced::{AIConfig, CacheConfig as EnhancedCacheConfig, DatabaseConfig, JwtConfig, RedisConfig};
pub use health::{
    build_health_response, check_http_health, create_health_router, create_metrics_router,
    metrics_middleware, simple_health_check, standard_health_check, DependencyHealth,
    HealthCheckResponse, HealthChecker, HealthState, HealthStatus, ServiceHealth, ServiceMetrics,
    ServiceMonitor, SimpleHealthConfig, SystemMetrics,
};
pub use api_version::{
    api_prefix, create_api_info, create_api_info_router, get_api_info_handler,
    register_routes_with_legacy_alias, versioned_router, ApiInfo, ApiVersionInfo,
};
pub use cors::create_cors_layer;
pub use layers::{can_depend, module_layer, modules_by_layer, Layer};
pub use logging::{
    create_log_filter, generate_request_id, generate_span_id, generate_trace_id,
    get_current_request_id, get_current_trace_id, init_logging, inject_request_context,
    request_context_middleware, JsonEventFormatter, LogAggregator, LogEntry, LogFormat, LogQuery,
    LogStats, RequestContext, RequestContextExt, TraceContext,
};
pub use feature_flag::{
    FeatureCondition, FeatureContext, FeatureFlag, FeatureFlagService, FeatureState,
};
pub use hrm::{AppState, PaginatedResult, PaginationQuery};
pub use api::{
    BatchRequest, BatchRequestHandler, BatchResponse, RequestPriority, SingleRequest,
    SingleResponse,
};
pub use compression::{CompressionAlgorithm, CompressionConfig, CompressionMiddleware};
pub use service_config::{
    global_registry, DeploymentType, ServiceConfigRegistry, ServiceDefinition, ServiceGroup,
    ValidationIssue, ValidationSeverity,
};
pub use service_port::*;
pub use crud::*;

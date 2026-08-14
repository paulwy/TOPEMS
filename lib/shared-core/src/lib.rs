//! # TOPEMS Shared Core
//!
//! 核心基础模块，提供所有服务共享的基础类型和工具。
//!
//! 包含：错误类型、响应格式、验证、配置、健康检查、ID 生成、
//! API 版本管理、CORS、模块分层、日志、特性标志、指标、CRUD 基础等。

// === 已迁移到本 crate 的模块（实际实现）===
pub mod api;
pub mod api_security;
pub mod api_version;
pub mod cache;
pub mod common_types;
pub mod compression;
pub mod config;
pub mod cors;
pub mod crud;
pub mod error;
pub mod feature_flag;
pub mod health;
pub mod hrm;
pub mod id;
pub mod l2_cache;
pub mod layers;
pub mod logging;
pub mod metrics;
pub mod n_plus_one_detector;
pub mod plugin;
pub mod response;
pub mod service_config;
pub mod service_port;
pub mod validation;

// === gRPC 微服务基础（V24.0 模块 C）===
// 仅当启用 grpc feature 时编译；提供连接池与健康检查抽象。
#[cfg(feature = "grpc")]
pub mod grpc;

// === 常用类型 re-export ===
pub use api::{
    BatchRequest, BatchRequestHandler, BatchResponse, RequestPriority, SingleRequest,
    SingleResponse,
};
pub use api_version::{
    api_prefix, create_api_info, create_api_info_router, get_api_info_handler,
    register_routes_with_legacy_alias, versioned_router, ApiInfo, ApiVersionInfo,
};
pub use common_types::{ApprovalStatus, ResourceType};
pub use compression::{CompressionAlgorithm, CompressionConfig, CompressionMiddleware};
pub use config::enhanced::{
    AIConfig, CacheConfig as EnhancedCacheConfig, DatabaseConfig, JwtConfig, RedisConfig,
};
pub use config::{
    get_default_port, AppConfig, CacheConfig, Config, ServiceConfig, ServiceRegistry,
};
pub use cors::create_cors_layer;
pub use crud::*;
pub use error::{Result, TopemsError};
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
pub use l2_cache::{AsyncL2Cache, L2CacheConfig};
pub use layers::{can_depend, module_layer, modules_by_layer, Layer};
pub use logging::{
    create_log_filter, generate_request_id, generate_span_id, generate_trace_id,
    get_current_request_id, get_current_trace_id, init_logging, inject_request_context,
    request_context_middleware, JsonEventFormatter, LogAggregator, LogEntry, LogFormat, LogQuery,
    LogStats, RequestContext, RequestContextExt, TraceContext,
};
pub use response::{
    api_error, api_success, error_payload, error_value, ApiResponse, ErrorPayload, FieldError,
    ListResponse, PaginatedResponse, PaginationParams,
};
pub use service_config::{
    global_registry, DeploymentType, ServiceConfigRegistry, ServiceDefinition, ServiceGroup,
    ValidationIssue, ValidationSeverity,
};
pub use service_port::*;
pub use validation::{ValidationError, ValidationResult, Validator};

#[cfg(test)]
mod tests {
    use super::*;
    // 测试 crate 的公共 API re-export 是否可访问
    // 这些测试主要是编译时检查 — 如果 re-export 缺失则无法编译

    // ========== 模块结构测试 ==========

    #[test]
    fn module_api_is_accessible() {
        // 验证 api 模块存在（间接验证）
        let _ = std::any::type_name::<api::BatchRequest>();
    }

    #[test]
    fn module_health_is_accessible() {
        let _ = std::any::type_name::<health::HealthStatus>();
    }

    #[test]
    fn module_crud_is_accessible() {
        // crud 模块只有 pub 函数，通过引用模块路径验证存在
        // 如果 crud 模块不存在，编译会失败
        let _ = crate::crud::delete;
        assert!(true, "crud 模块存在（通过编译即证明）");
    }

    #[test]
    fn module_response_is_accessible() {
        let _ = std::any::type_name::<response::ApiResponse<()>>();
    }

    #[test]
    fn module_service_config_is_accessible() {
        let _ = std::any::type_name::<service_config::ServiceGroup>();
    }

    #[test]
    fn module_plugin_is_accessible() {
        let _ = std::any::type_name::<plugin::PluginInfo>();
    }

    #[test]
    fn module_validation_is_accessible() {
        let _ = std::any::type_name::<validation::ValidationError>();
    }

    // ========== Re-export 类型可访问性测试 ==========

    #[test]
    fn re_export_api_response_is_accessible() {
        let resp: ApiResponse<String> = ApiResponse::success("hi".to_string(), "ok");
        assert_eq!(resp.code, 200);
        assert!(resp.success);
    }

    #[test]
    fn re_export_health_status_is_accessible() {
        let status = HealthStatus::Healthy;
        assert_eq!(status, HealthStatus::Healthy);
    }

    #[test]
    fn re_export_service_group_is_accessible() {
        let group = ServiceGroup::Core;
        assert_eq!(group, ServiceGroup::Core);
    }

    #[test]
    fn re_export_topems_error_is_accessible() {
        let err = TopemsError::Internal("test".to_string());
        assert!(err.to_string().contains("test"));
    }

    #[test]
    fn re_export_pagination_params_is_accessible() {
        let params = PaginationParams {
            page: Some(1),
            page_size: Some(10),
            search: None,
            status: None,
        };
        assert_eq!(params.offset(), 0);
        assert_eq!(params.limit(), 10);
    }

    #[test]
    fn re_export_paginated_response_is_accessible() {
        let resp = PaginatedResponse::new(vec![1, 2, 3], 100, 1, 10);
        assert_eq!(resp.total, 100);
        assert_eq!(resp.items.len(), 3);
    }

    #[test]
    fn re_export_list_response_is_accessible() {
        let resp: ListResponse<i32> = ListResponse::new(vec![1, 2], 50);
        assert_eq!(resp.total, 50);
        assert_eq!(resp.items.len(), 2);
    }

    #[test]
    fn re_export_health_check_response_is_accessible() {
        let resp = HealthCheckResponse::new(vec![]);
        assert_eq!(resp.overall_status, HealthStatus::Healthy);
    }

    #[test]
    fn re_export_build_health_response_is_accessible() {
        let h = build_health_response("svc", true);
        assert_eq!(h.status, HealthStatus::Healthy);
    }

    #[test]
    fn re_export_global_registry_is_accessible() {
        let reg = global_registry();
        assert!(reg.get("unified-core").is_some());
    }

    // ========== 宏测试 ==========

    #[test]
    fn list_resp_macro_two_args() {
        let resp: ListResponse<i32> = list_resp!(vec![1, 2, 3], 100);
        assert_eq!(resp.items.len(), 3);
        assert_eq!(resp.total, 100);
        assert!(resp.page.is_none());
    }

    #[test]
    fn list_resp_macro_four_args() {
        let resp: ListResponse<i32> = list_resp!(vec![1, 2], 50, 2, 10);
        assert_eq!(resp.total, 50);
        assert_eq!(resp.page, Some(2));
        assert_eq!(resp.page_size, Some(10));
        assert_eq!(resp.total_pages, Some(5));
    }

    #[tokio::test]
    async fn handle_result_macro_with_ok() {
        async fn fake_query() -> std::result::Result<i32, std::io::Error> {
            Ok(42)
        }
        let json = handle_result!(fake_query(), "查询成功");
        let resp = json.0;
        assert_eq!(resp.code, 200);
        assert!(resp.success);
        assert_eq!(resp.data, Some(42));
        assert_eq!(resp.message, "查询成功");
    }

    #[tokio::test]
    async fn handle_result_macro_with_err() {
        async fn fake_failing_query() -> std::result::Result<i32, std::io::Error> {
            Err(std::io::Error::new(std::io::ErrorKind::Other, "db down"))
        }
        let json = handle_result!(fake_failing_query(), "查询失败");
        let resp = json.0;
        assert_eq!(resp.code, 500);
        assert!(!resp.success);
        assert!(resp.data.is_none());
        assert!(resp.message.contains("db down"));
    }

    // ========== 错误处理集成测试 ==========

    #[test]
    fn topems_error_implements_into_response() {
        use axum::response::IntoResponse;
        let err = TopemsError::Internal("boom".to_string());
        let resp = err.into_response();
        assert_eq!(resp.status(), axum::http::StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn api_response_into_response_status_code() {
        use axum::response::IntoResponse;
        let resp: ApiResponse<()> = ApiResponse::error(404, "not found");
        let response = resp.into_response();
        assert_eq!(response.status(), axum::http::StatusCode::NOT_FOUND);
    }

    #[test]
    fn error_payload_into_response_status_code() {
        use axum::response::IntoResponse;
        let payload = ErrorPayload::not_found("resource missing");
        let response = payload.into_response();
        assert_eq!(response.status(), axum::http::StatusCode::NOT_FOUND);
    }

    #[test]
    fn error_payload_helpers_set_correct_codes() {
        assert_eq!(ErrorPayload::new(400, "x").code, 400);
        assert_eq!(ErrorPayload::validation("x", vec![]).code, 400);
        assert_eq!(ErrorPayload::not_found("x").code, 404);
        assert_eq!(ErrorPayload::unauthorized("x").code, 401);
        assert_eq!(ErrorPayload::forbidden("x").code, 403);
        assert_eq!(ErrorPayload::conflict("x").code, 409);
        assert_eq!(ErrorPayload::internal("x").code, 500);
    }

    #[test]
    fn error_value_returns_json_value() {
        let v = error_value(400, "bad request");
        assert_eq!(v["code"], 400);
        assert_eq!(v["success"], false);
        assert_eq!(v["message"], "bad request");
    }

    #[test]
    fn error_payload_helper_creates_payload() {
        let p = error_payload(500, "server error");
        assert_eq!(p.code, 500);
        assert!(!p.success);
        assert_eq!(p.message, "server error");
    }
}


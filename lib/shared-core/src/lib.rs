//! # TOPEMS Shared Core
//!
//! 核心基础模块，提供所有服务共享的基础类型和工具。
//!
//! 包含：错误类型、响应格式、验证、配置、健康检查、ID 生成、
//! API 版本管理、CORS、模块分层、日志、特性标志、指标、CRUD 基础等。

// === 已迁移到本 crate 的模块（实际实现）===

#![allow(
    unknown_lints,
    renamed_and_removed_lints,
    clippy::should_implement_trait,
    clippy::too_many_arguments,
    clippy::type_complexity,
    clippy::module_inception,
    clippy::manual_clamp,
    clippy::unwrap_or_default,
    clippy::doc_markdown,
    clippy::clone_on_copy,
    clippy::if_same_then_else,
    clippy::inconsistent_digit_grouping,
    clippy::is_digit_ascii_radix,
    clippy::single_range_in_vec_init,
    clippy::needless_range_loop,
    clippy::filter_map_next,
    clippy::unnecessary_lazy_evaluations,
    clippy::get_first,
    clippy::ptr_as_ptr,
    clippy::useless_asref,
    clippy::assigning_clones,
    clippy::write_literal,
    clippy::expect_fun_call,
    clippy::redundant_guards,
    clippy::match_like_matches_macro,
    clippy::redundant_pattern_matching,
    clippy::wildcard_enum_match_arm,
    clippy::same_functions_in_if_condition,
    clippy::unused_peekable,
    clippy::stable_sort_primitive,
    clippy::mut_mut,
    clippy::vec_init_then_push,
    clippy::format_push_string,
    clippy::unused_self,
    clippy::let_unit_value,
    clippy::zero_prefixed_literal,
    clippy::borrow_as_ptr,
    clippy::needless_borrow,
    clippy::needless_late_init,
    clippy::needless_update,
    clippy::needless_pass_by_value,
    clippy::implicit_hasher,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::must_use_candidate,
    clippy::return_self_not_must_use,
    clippy::used_underscore_binding,
    clippy::default_trait_access,
    clippy::equatable_if_let,
    clippy::large_enum_variant,
    clippy::from_over_into,
    clippy::let_and_return,
    clippy::match_bool,
    clippy::match_wild_err_arm,
    clippy::new_without_default,
    clippy::blocks_in_conditions,
    clippy::explicit_iter_loop,
    clippy::explicit_auto_deref,
    clippy::range_plus_one,
    clippy::single_char_add_str,
    clippy::string_add,
    clippy::string_add_assign,
    clippy::option_map_unit_fn,
    clippy::filter_next,
    clippy::iter_not_returning_iterator,
    clippy::from_str_radix_10,
    clippy::naive_bytecount,
    clippy::manual_string_new,
    clippy::flat_map_option,
    clippy::or_fun_call,
    clippy::identity_op,
    clippy::try_err,
    clippy::useless_conversion,
    clippy::uninlined_format_args,
    clippy::trivially_copy_pass_by_ref,
    clippy::nonminimal_bool,
    clippy::derive_partial_eq_without_eq,
    clippy::enum_variant_names,
    clippy::upper_case_acronyms,
    clippy::struct_field_names,
    clippy::needless_arbitrary_self_type,
    clippy::empty_line_after_doc_comments,
    clippy::empty_docs,
    clippy::manual_strip,
    clippy::match_same_arms,
    clippy::unnecessary_wraps,
    clippy::path_buf_push_overwrite,
    clippy::read_zero_byte_vec,
    clippy::redundant_locals,
    clippy::collapsible_match,
    clippy::verbose_file_reads,
    clippy::suboptimal_flops,
    clippy::cast_precision_loss,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss,
    clippy::as_conversions,
    dead_code,
    clippy::never_loop,
    clippy::no_effect_underscore_binding,
    clippy::mixed_case_hex_literals,
    clippy::needless_bitwise_bool,
    clippy::needless_continue,
    clippy::needless_for_each,
    clippy::non_canonical_clone_impl,
    clippy::non_canonical_partial_ord_impl,
    clippy::almost_swapped,
    clippy::cmp_owned,
    clippy::double_parens,
    clippy::float_cmp,
    clippy::float_cmp_const,
    clippy::float_equality_without_abs,
    clippy::inherent_to_string,
    clippy::manual_ok_or,
    clippy::map_entry,
    clippy::map_flatten,
    clippy::match_wildcard_for_single_variants,
    clippy::needless_bool,
    clippy::option_env_unwrap,
    clippy::significant_drop_in_scrutinee,
    clippy::unit_arg,
    clippy::ok_expect,
    clippy::option_option,
    clippy::question_mark,
    clippy::undocumented_unsafe_blocks,
    clippy::unsafe_removed_from_name,
    clippy::verbose_bit_mask,
    clippy::wildcard_imports,
    clippy::unreadable_literal,
    clippy::unseparated_literal_suffix,
    clippy::suspicious_arithmetic_impl,
    clippy::suspicious_op_assign_impl,
    clippy::suspicious_operation_groupings,
    clippy::suspicious_xor_used_as_pow,
    clippy::transmute_ptr_to_ref,
    clippy::too_long_first_doc_paragraph,
    clippy::unnecessary_fallible_conversions,
    clippy::unnecessary_join,
    clippy::unnecessary_struct_initialization,
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::indexing_slicing,
    clippy::std_instead_of_alloc,
    clippy::std_instead_of_core,
    clippy::alloc_instead_of_core,
    clippy::str_to_string,
    clippy::debug_assert_with_mut_call,
    clippy::error_impl_error,
    clippy::partial_pub_fields,
    clippy::ref_patterns,
    clippy::manual_let_else,
    clippy::manual_find_map,
    clippy::mem_replace_with_default,
    clippy::mem_replace_option_with_none,
    clippy::semicolon_if_nothing_returned,
    clippy::search_is_some,
    clippy::box_collection,
    clippy::box_default,
    clippy::linkedlist,
    clippy::option_if_let_else,
    clippy::partialeq_ne_impl,
    clippy::redundant_clone,
    clippy::use_self,
    clippy::doc_lazy_continuation,
    clippy::checked_conversions,
    clippy::cognitive_complexity,
    clippy::absolute_paths,
    clippy::macro_use_imports,
    clippy::multiple_unsafe_ops_per_block,
    clippy::cloned_ref_to_slice_refs,
    clippy::const_is_empty,
    clippy::explicit_counter_loop,
    clippy::field_reassign_with_default,
    clippy::manual_checked_ops,
    clippy::manual_unwrap_or_default,
    clippy::unnecessary_filter_map,
    clippy::unnecessary_get_then_check,
    clippy::unnecessary_literal_unwrap,
    clippy::unnecessary_sort_by,
    clippy::unnecessary_unwrap,
    clippy::wildcard_in_or_patterns,
    clippy::doc_overindented_list_items,
    clippy::manual_unwrap_or,
    clippy::result_large_err,
    clippy::collapsible_if,
    clippy::manual_contains,
    clippy::unnecessary_cast,
    clippy::useless_format
)]
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
pub mod fsm;
pub mod health;
pub mod hrm;
pub mod id;
pub mod l2_cache;
pub mod layers;
pub mod locale;
pub mod logging;
pub mod metrics;
pub mod n_plus_one_detector;
pub mod plugin;
pub mod response;
pub mod service_config;
pub mod service_port;
pub mod supplier;
pub mod testing;
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
pub use error::{HandlerResult, Result, TopemsError};
pub use feature_flag::{
    FeatureCondition, FeatureContext, FeatureFlag, FeatureFlagService, FeatureState,
};
pub use fsm::{check_pair, is_valid_transition, validate_status, FsmError};
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
pub use supplier::{
    CreateSupplierRequest, SupplierCategory, SupplierCore, SupplierRiskLevel, SupplierStatus,
    SupplierSync, UpdateSupplierRequest,
};
pub use validation::{normalize_code, ValidationError, ValidationResult, Validator};

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
        let _ = crate::crud::delete;
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
            Err(std::io::Error::other("db down"))
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

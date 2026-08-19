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
use anyhow::Result;
use axum::extract::FromRef;
use axum::{
    extract::{Extension, Path, State},
    routing::get,
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use std::sync::Arc;
use utoipa::OpenApi;

use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_bootstrap::{bootstrap_service, resolve_port, run, Application, ServiceConfig};
use topems_shared_core::api_version::{create_api_info_router, register_routes_with_legacy_alias};
use topems_shared_core::cors::create_cors_layer;
use topems_shared_core::logging::request_context_middleware;
use topems_shared_core::response::ApiResponse;
use topems_shared_observability::telemetry::telemetry_middleware;

mod db;
mod event_handlers;
mod middleware;
mod models;
mod modules;
mod services;
mod shared;

use db::schema::init_tables;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) pool: sqlx::PgPool,
    pub(crate) auth_state: AuthState,
    pub(crate) ws_manager: Arc<modules::websocket::WebSocketManager>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for sqlx::PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

impl FromRef<AppState> for Arc<modules::websocket::WebSocketManager> {
    fn from_ref(state: &AppState) -> Self {
        state.ws_manager.clone()
    }
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(modules::openapi::GisApiDoc::openapi())
}

#[tokio::main]
async fn main() -> Result<()> {
    std::env::set_var("SEARCH_PATH", "gis, public");

    let config = ServiceConfig {
        name: "topems-gis",
        port: 8071,
        port_env_var: Some("GIS_PORT"),
        max_db_connections: 20,
        enable_events: false,
        enable_rls: false,
        enable_request_context: false,
        api_prefix: "/api/gis",
        legacy_prefixes: &["/api/v1/gis", "/api/core/gis/v1"],
    };
    let ctx = bootstrap_service(&config).await?;

    // 自定义 Prometheus Gauge
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_gis_custom_metric",
        "This is a custom metric for TOPEMS-GIS",
    )
    .unwrap_or_else(|e| {
        tracing::error!("Failed to create Prometheus gauge: {}", e);
        panic!("Prometheus gauge creation failed")
    });
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap_or_else(|e| {
            tracing::error!("Failed to register Prometheus gauge: {}", e);
            panic!("Prometheus gauge registration failed")
        });
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    // GIS 专属初始化：建表 + 事件订阅 + WebSocket Manager
    init_tables(&ctx.db).await?;
    tracing::info!("✅ 数据库表初始化成功");

    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
        tracing::warn!("⚠️ GIS 事件订阅者启动失败: {}", e);
    }

    let ws_config = modules::websocket::WebSocketConfig::from_env();
    tracing::info!(
        "🔌 WebSocket 配置: max_connections={}, idle_timeout={}s",
        ws_config.max_connections,
        ws_config.idle_timeout_secs
    );
    let state = AppState {
        pool: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        ws_manager: Arc::new(modules::websocket::WebSocketManager::new(ws_config)),
    };

    let cors = create_cors_layer();

    // System routes (public, with app_state)
    let system_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/plugins/info", get(modules::gis_plugin::get_info))
        .route(
            "/api/plugins/health",
            get(modules::gis_plugin::plugin_health_check),
        )
        .route("/health/detailed", get(health_check_detailed))
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .with_state(state.clone());

    // Public business routes (no auth)
    let public_business_routes = Router::new()
        .route("/statistics", get(modules::stats::get_statistics))
        .route(
            "/search",
            axum::routing::get(modules::search::search_locations),
        )
        .route(
            "/geojson/export",
            axum::routing::get(modules::import_export::export_geojson),
        )
        .route(
            "/factory-maps",
            axum::routing::get(modules::factory_map::list_factory_maps),
        )
        .route(
            "/factory-maps/{id}",
            axum::routing::get(modules::factory_map::get_factory_map),
        )
        .route(
            "/device-locations",
            axum::routing::get(modules::device::list_devices),
        )
        .route(
            "/device-locations/{id}",
            axum::routing::get(modules::device::get_device),
        )
        .route(
            "/device-locations/map/{map_id}",
            axum::routing::get(list_device_locations_by_map),
        )
        .route(
            "/pipelines",
            axum::routing::get(modules::pipeline::list_pipelines),
        )
        .route(
            "/pipelines/{id}",
            axum::routing::get(modules::pipeline::get_pipeline),
        )
        .route(
            "/pipelines/map/{map_id}",
            axum::routing::get(modules::pipeline::list_pipelines_by_map),
        )
        .route(
            "/warehouse-locations",
            axum::routing::get(modules::warehouse::list_warehouse_locations),
        )
        .route(
            "/warehouse-locations/{id}",
            axum::routing::get(modules::warehouse::get_warehouse_location),
        )
        .route(
            "/warehouse-locations/map/{map_id}",
            axum::routing::get(modules::warehouse::list_warehouse_locations_by_map),
        )
        .route(
            "/location-photos",
            axum::routing::get(modules::photo::list_location_photos),
        )
        .route(
            "/location-photos/{id}",
            axum::routing::get(modules::photo::get_location_photo),
        )
        .route(
            "/location-photos/map/{map_id}",
            axum::routing::get(modules::photo::list_location_photos_by_map),
        )
        .route(
            "/business-locations",
            axum::routing::get(modules::business::list_business_locations),
        )
        .route(
            "/business-locations/{id}",
            axum::routing::get(modules::business::get_business_location),
        )
        .route(
            "/business-locations/type/{business_type}",
            axum::routing::get(modules::business::list_business_locations_by_type),
        )
        .route(
            "/map-markers",
            axum::routing::get(modules::marker::list_map_markers),
        )
        .route("/maps", axum::routing::get(modules::map::list_maps))
        .route("/maps/{id}", axum::routing::get(modules::map::get_map))
        .route(
            "/maps/{id}/layers",
            axum::routing::get(modules::map::list_map_layers),
        )
        .route(
            "/geodata",
            axum::routing::get(modules::geodata::list_geodata),
        )
        .route(
            "/geodata/{id}",
            axum::routing::get(modules::geodata::get_geodata),
        )
        .route(
            "/geodata/{id}/features",
            axum::routing::get(modules::geodata::list_geofeatures),
        )
        .route(
            "/locations",
            axum::routing::get(modules::location::list_locations),
        )
        .route(
            "/locations/{id}",
            axum::routing::get(modules::location::get_location),
        )
        .route(
            "/devices",
            axum::routing::get(modules::device::list_devices),
        )
        .route(
            "/devices/{id}",
            axum::routing::get(modules::device::get_device),
        )
        .route(
            "/devices/{device_code}/report",
            axum::routing::post(modules::device::report_device_location),
        )
        // WebSocket public endpoints
        .route("/ws/gis/map", get(modules::websocket::websocket_handler))
        .route(
            "/ws/gis/device/{device_code}",
            get(modules::websocket::websocket_device_handler),
        )
        .route("/ws/gis", get(modules::websocket::websocket_handler))
        // Geofence public endpoints
        .route(
            "/fences",
            axum::routing::get(modules::geofence::list_geofences),
        )
        .route(
            "/fences/{id}",
            axum::routing::get(modules::geofence::get_geofence),
        );

    // Protected API (auth + rate limit)
    let protected_api = Router::new()
        .route(
            "/factory-maps",
            axum::routing::post(modules::factory_map::create_factory_map),
        )
        .route(
            "/factory-maps/{id}",
            axum::routing::put(modules::factory_map::update_factory_map),
        )
        .route(
            "/factory-maps/{id}",
            axum::routing::delete(modules::factory_map::delete_factory_map),
        )
        .route(
            "/device-locations",
            axum::routing::post(create_device_location),
        )
        .route(
            "/device-locations/{id}",
            axum::routing::put(update_device_location),
        )
        .route(
            "/device-locations/{id}",
            axum::routing::delete(delete_device_location),
        )
        .route(
            "/pipelines",
            axum::routing::post(modules::pipeline::create_pipeline),
        )
        .route(
            "/pipelines/{id}",
            axum::routing::put(modules::pipeline::update_pipeline),
        )
        .route(
            "/pipelines/{id}",
            axum::routing::delete(modules::pipeline::delete_pipeline),
        )
        .route(
            "/warehouse-locations",
            axum::routing::post(modules::warehouse::create_warehouse_location),
        )
        .route(
            "/warehouse-locations/{id}",
            axum::routing::put(modules::warehouse::update_warehouse_location),
        )
        .route(
            "/warehouse-locations/{id}",
            axum::routing::delete(modules::warehouse::delete_warehouse_location),
        )
        .route(
            "/location-photos",
            axum::routing::post(modules::photo::create_location_photo),
        )
        .route(
            "/location-photos/{id}",
            axum::routing::delete(modules::photo::delete_location_photo),
        )
        .route(
            "/business-locations",
            axum::routing::post(modules::business::create_business_location),
        )
        .route(
            "/business-locations/{id}",
            axum::routing::put(modules::business::update_business_location),
        )
        .route(
            "/business-locations/{id}",
            axum::routing::delete(modules::business::delete_business_location),
        )
        .route(
            "/map-markers",
            axum::routing::post(modules::marker::create_map_marker),
        )
        .route(
            "/map-markers/{id}",
            axum::routing::put(modules::marker::update_map_marker),
        )
        .route(
            "/map-markers/{id}",
            axum::routing::delete(modules::marker::delete_map_marker),
        )
        .route(
            "/import",
            axum::routing::post(modules::import_export::import_data),
        )
        .route(
            "/maps/create",
            axum::routing::post(modules::map::create_map),
        )
        .route("/maps/{id}", axum::routing::put(modules::map::update_map))
        .route(
            "/maps/{id}",
            axum::routing::delete(modules::map::delete_map),
        )
        .route(
            "/maps/{id}/layers",
            axum::routing::post(modules::map::add_map_layer),
        )
        .route(
            "/maps/{id}/layers/{layer_id}",
            axum::routing::delete(modules::map::delete_map_layer),
        )
        .route(
            "/geodata/upload",
            axum::routing::post(modules::geodata::upload_geodata),
        )
        .route(
            "/geodata/{id}",
            axum::routing::put(modules::geodata::update_geodata),
        )
        .route(
            "/geodata/{id}",
            axum::routing::delete(modules::geodata::delete_geodata),
        )
        .route(
            "/geodata/{id}/convert",
            axum::routing::post(modules::geodata::convert_geodata),
        )
        .route(
            "/spatial/buffer",
            axum::routing::post(modules::spatial::buffer_analysis),
        )
        .route(
            "/spatial/intersect",
            axum::routing::post(modules::spatial::intersect_analysis),
        )
        .route(
            "/spatial/union",
            axum::routing::post(modules::spatial::union_analysis),
        )
        .route(
            "/spatial/difference",
            axum::routing::post(modules::spatial::difference_analysis),
        )
        .route(
            "/spatial/within",
            axum::routing::post(modules::spatial::within_analysis),
        )
        .route(
            "/spatial/distance",
            axum::routing::post(modules::spatial::distance_calculation),
        )
        .route(
            "/spatial/nearest",
            axum::routing::post(modules::spatial::nearest_query),
        )
        .route(
            "/spatial/cluster",
            axum::routing::post(modules::spatial::cluster_analysis),
        )
        .route(
            "/locations/create",
            axum::routing::post(modules::location::create_location),
        )
        .route(
            "/locations/{id}",
            axum::routing::put(modules::location::update_location),
        )
        .route(
            "/locations/{id}",
            axum::routing::delete(modules::location::delete_location),
        )
        .route(
            "/locations/search",
            axum::routing::post(modules::location::search_locations),
        )
        .route(
            "/locations/nearby",
            axum::routing::post(modules::location::nearby_locations),
        )
        .route(
            "/locations/route",
            axum::routing::post(modules::location::plan_route),
        )
        .route(
            "/devices/register",
            axum::routing::post(modules::device::register_device),
        )
        .route(
            "/devices/{id}",
            axum::routing::put(modules::device::update_device),
        )
        .route(
            "/devices/{id}",
            axum::routing::delete(modules::device::delete_device),
        )
        .route(
            "/devices/{id}/location",
            axum::routing::post(modules::device::update_device_location),
        )
        .route(
            "/devices/{id}/tracking",
            axum::routing::get(modules::device::get_device_tracking),
        )
        .route(
            "/devices/{id}/history",
            axum::routing::get(modules::device::get_device_history),
        )
        // Geofence protected write endpoints
        .route(
            "/fences",
            axum::routing::post(modules::geofence::create_geofence),
        )
        .route(
            "/fences/{id}",
            axum::routing::put(modules::geofence::update_geofence),
        )
        .route(
            "/fences/{id}",
            axum::routing::delete(modules::geofence::delete_geofence),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            topems_shared_auth::auth::auth_middleware,
        ));

    use topems_shared_auth::security::{
        rate_limit_middleware, RateLimitConfig, RateLimitMiddleware,
    };
    let rate_limit_config = RateLimitConfig::new(200, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let protected_api = protected_api.layer(axum::middleware::from_fn({
        let mw = rate_limiter.clone();
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    }));

    let gis_routes = public_business_routes.merge(protected_api);

    let app = register_routes_with_legacy_alias(
        system_routes,
        config.api_prefix,
        config.legacy_prefixes,
        gis_routes,
    )
    .merge(create_api_info_router("topems-gis"))
    .with_state(state.clone())
    .layer(axum::middleware::from_fn(request_context_middleware))
    .layer(axum::middleware::from_fn(telemetry_middleware))
    .layer(prometheus_layer)
    .layer(cors);

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::gis_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let app = Application {
        router: app,
        port: resolve_port(&config),
        name: config.name,
    };
    run(app).await?;

    Ok(())
}

use crate::models::DeviceLocation;
use topems_shared_bootstrap::{check_database_health, check_iam_health};
use topems_shared_core::health::HealthStatus;
use topems_shared_core::health::ServiceHealth;

async fn health_check(State(state): State<AppState>) -> Json<ApiResponse<String>> {
    let database_health = check_database_health(&state.pool).await;
    let iam_health = check_iam_health().await;

    let overall_status = if database_health.status == HealthStatus::Healthy
        && iam_health.status == HealthStatus::Healthy
    {
        HealthStatus::Healthy
    } else if database_health.status == HealthStatus::Unhealthy
        || iam_health.status == HealthStatus::Unhealthy
    {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let status_str = match overall_status {
        HealthStatus::Healthy => "healthy".to_string(),
        HealthStatus::Degraded => "degraded".to_string(),
        HealthStatus::Unhealthy => "unhealthy".to_string(),
    };

    Json(ApiResponse::success(status_str, "健康检查"))
}

async fn health_check_detailed(State(state): State<AppState>) -> Json<ApiResponse<ServiceHealth>> {
    let dependencies = vec![
        check_database_health(&state.pool).await,
        check_iam_health().await,
    ];

    let all_healthy = dependencies
        .iter()
        .all(|d| d.status == HealthStatus::Healthy);
    let any_unhealthy = dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Unhealthy);

    let overall_status = if all_healthy {
        HealthStatus::Healthy
    } else if any_unhealthy {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let message = match overall_status {
        HealthStatus::Healthy => "所有服务运行正常",
        HealthStatus::Degraded => "部分服务存在问题",
        HealthStatus::Unhealthy => "存在关键服务故障",
    };

    let health =
        ServiceHealth::healthy_with_message("topems-gis", message).with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

async fn list_device_locations_by_map(
    State(pool): State<sqlx::PgPool>,
    Path(map_id): Path<uuid::Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, DeviceLocation>(
        "id, tenant_id, map_id, device_name, device_code, device_type, position, status, description, last_inspected, created_at, updated_at FROM device_locations WHERE map_id = $1 ORDER BY created_at DESC",
    )
    .bind(map_id)
    .fetch_all(&pool)
    .await
    {
        Ok(locations) => Json(ApiResponse::success(
            serde_json::json!({
                "device_locations": locations,
                "total": locations.len()
            }),
            "获取设备位置列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

async fn create_device_location(
    State(pool): State<sqlx::PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<modules::device::CreateDeviceLocation>,
) -> Json<ApiResponse<DeviceLocation>> {
    if let Err(e) = shared::permission::check_permission(
        &pool,
        &claims,
        &shared::permission::GisPermission::DeviceLocationWrite,
    )
    .await
    {
        return e;
    }
    match sqlx::query_as::<_, DeviceLocation>(
        r#"
        INSERT INTO device_locations (map_id, device_name, device_code, device_type, position, status, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#,
    )
    .bind(&payload.map_id)
    .bind(&payload.device_name)
    .bind(&payload.device_code)
    .bind(&payload.device_type)
    .bind(&payload.position)
    .bind(&payload.status)
    .bind(&payload.description)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "创建设备位置成功")),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库插入失败: {}", e),
        )),
    }
}

async fn update_device_location(
    State(pool): State<sqlx::PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<uuid::Uuid>,
    Json(payload): Json<modules::device::CreateDeviceLocation>,
) -> Json<ApiResponse<DeviceLocation>> {
    if let Err(e) = shared::permission::check_permission(
        &pool,
        &claims,
        &shared::permission::GisPermission::DeviceLocationWrite,
    )
    .await
    {
        return e;
    }
    match sqlx::query_as::<_, DeviceLocation>(
        r#"
        UPDATE device_locations 
        SET map_id = $1, device_name = $2, device_code = $3, device_type = $4, position = $5, status = $6, description = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING *
        "#,
    )
    .bind(&payload.map_id)
    .bind(&payload.device_name)
    .bind(&payload.device_code)
    .bind(&payload.device_type)
    .bind(&payload.position)
    .bind(&payload.status)
    .bind(&payload.description)
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(location) => Json(ApiResponse::success(location, "更新设备位置成功")),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::error(404, "设备位置未找到"))
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库更新失败: {}", e),
        )),
    }
}

async fn delete_device_location(
    State(pool): State<sqlx::PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<uuid::Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = shared::permission::check_permission(
        &pool,
        &claims,
        &shared::permission::GisPermission::DeviceLocationWrite,
    )
    .await
    {
        return e;
    }
    match sqlx::query("DELETE FROM device_locations WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除设备位置成功"))
            } else {
                Json(ApiResponse::error(404, "设备位置未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("数据库删除失败: {}", e))),
    }
}

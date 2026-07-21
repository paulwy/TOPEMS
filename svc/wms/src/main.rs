#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(clippy::too_many_arguments)]
#![allow(dead_code)]

mod middleware;
mod models;
mod shared;

pub mod modules;

use anyhow::Result;
use axum::{
    routing::{delete, get, post, put},
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{Encoder, TextEncoder};
use serde::Serialize;
use std::env;
use std::sync::Arc;
use std::time::Instant;
use utoipa::OpenApi;

use topems_shared::{
    auth_middleware, check_http_health, create_api_info_router, create_cors_layer,
    create_database_pool, init_telemetry, rls_middleware, telemetry_middleware, ApiResponse,
    AuthState, DatabaseConfig, DependencyHealth, HealthStatus, ServiceHealth, SystemMetrics,
};

use modules::wms_plugin::{auto_register_to_core, get_plugin_info, plugin_health_check};
use modules::ApiState;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-wms");

    // 设置search_path环境变量（供lib使用）
    env::set_var("SEARCH_PATH", "wms, shared, public");

    let db_config = DatabaseConfig {
        url: env::var("DATABASE_URL").map_err(|_| {
            tracing::error!("DATABASE_URL environment variable is required");
            anyhow::anyhow!("DATABASE_URL environment variable is required")
        })?,
        max_connections: 10,
        min_connections: Some(2),
        connect_timeout: Some(30),
        idle_timeout: Some(60),
        max_lifetime: Some(1800),
        test_interval: Some(60),
        enable_connection_reuse: Some(true),
    };

    let pool = create_database_pool(&db_config).await?;

    tracing::info!("🔗 数据库连接成功");

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let start_time = Instant::now();
    let metrics = Arc::new(SystemMetrics::new());

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: AuthState::from_env(),
        metrics: metrics.clone(),
        start_time,
    };

    let cors = create_cors_layer();

    let (prometheus_layer, _metric_handle) = PrometheusMetricLayer::pair();

    let health_router: Router<ApiState> = Router::new()
        .route("/health", get(health_check))
        .route("/api/health/detailed", get(health_check_detailed))
        .route("/api/metrics", get(get_metrics))
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .route(
            "/metrics",
            get(move || async move {
                let encoder = TextEncoder::new();
                let metrics = prometheus::gather();
                let mut buffer = Vec::new();
                match encoder.encode(&metrics, &mut buffer) {
                    Ok(()) => String::from_utf8(buffer)
                        .unwrap_or_else(|_| "Error: invalid UTF-8 in metrics".to_string()),
                    Err(e) => format!("Error encoding metrics: {}", e),
                }
            }),
        );

    let api_router = modules::create_routes::<ApiState>().with_state(api_state.clone());

    let protected_routes: Router<ApiState> = Router::new()
        .merge(api_router)
        // Frontend aligned routes (WMS module)
        // Inventory
        .route(
            "/inventory",
            get(modules::inventory::list_inventory).post(modules::inventory::create_inventory),
        )
        .route(
            "/inventory/{id}",
            get(modules::inventory::get_inventory)
                .put(modules::inventory::update_inventory)
                .delete(modules::inventory::delete_inventory),
        )
        .route(
            "/inventory/low-stock",
            get(modules::inventory::list_low_stock_inventory),
        )
        .route(
            "/inventory/warehouse/{warehouse_id}",
            get(modules::inventory::list_inventory_by_warehouse),
        )
        .route(
            "/inventory/statistics",
            get(modules::inventory::get_inventory_statistics),
        )
        .route(
            "/inventory/abc-analysis",
            get(modules::inventory::get_abc_analysis),
        )
        .route("/inventory/turnover", get(modules::inventory::get_turnover))
        .route(
            "/inventory/value-by-warehouse",
            get(modules::inventory::get_value_by_warehouse),
        )
        // Warehouse
        .route(
            "/warehouses",
            get(modules::warehouse::list_warehouses).post(modules::warehouse::create_warehouse),
        )
        .route(
            "/warehouses/{id}",
            get(modules::warehouse::get_warehouse)
                .put(modules::warehouse::update_warehouse)
                .delete(modules::warehouse::delete_warehouse),
        )
        // Location
        .route(
            "/locations",
            get(modules::location::list_locations).post(modules::location::create_location),
        )
        .route(
            "/locations/{id}",
            get(modules::location::get_location)
                .put(modules::location::update_location)
                .delete(modules::location::delete_location),
        )
        .route(
            "/locations/batch",
            post(modules::location::batch_create_locations)
                .put(modules::location::batch_update_locations),
        )
        // Inbound Order
        .route(
            "/inbound-orders",
            get(modules::inbound_order::list_inbound_orders)
                .post(modules::inbound_order::create_inbound_order),
        )
        .route(
            "/inbound-orders/{id}",
            get(modules::inbound_order::get_inbound_order)
                .put(modules::inbound_order::update_inbound_order)
                .delete(modules::inbound_order::delete_inbound_order),
        )
        .route(
            "/inbound-orders/{id}/confirm",
            post(modules::inbound_order::confirm_inbound_order),
        )
        .route(
            "/inbound-orders/{id}/receive",
            post(modules::inbound_order::receive_inbound_order),
        )
        // Outbound Order
        .route(
            "/outbound-orders",
            get(modules::outbound_order::list_outbound_orders)
                .post(modules::outbound_order::create_outbound_order),
        )
        .route(
            "/outbound-orders/{id}",
            get(modules::outbound_order::get_outbound_order)
                .put(modules::outbound_order::update_outbound_order)
                .delete(modules::outbound_order::delete_outbound_order),
        )
        .route(
            "/outbound-orders/{id}/confirm",
            post(modules::outbound_order::confirm_outbound_order),
        )
        .route(
            "/outbound-orders/{id}/pick",
            post(modules::outbound_order::pick_outbound_order),
        )
        .route(
            "/outbound-orders/{id}/pack",
            post(modules::outbound_order::pack_outbound_order),
        )
        .route(
            "/outbound-orders/{id}/ship",
            post(modules::outbound_order::ship_outbound_order),
        )
        // Stock Take
        .route(
            "/stock-takes",
            get(modules::stock_take::list_stock_takes).post(modules::stock_take::create_stock_take),
        )
        .route(
            "/stock-takes/{id}",
            get(modules::stock_take::get_stock_take)
                .put(modules::stock_take::update_stock_take)
                .delete(modules::stock_take::delete_stock_take),
        )
        .route(
            "/stock-takes/{id}/start",
            post(modules::stock_take::start_stock_take),
        )
        .route(
            "/stock-takes/{id}/complete",
            post(modules::stock_take::complete_stock_take),
        )
        .route(
            "/stock-takes/{id}/adjust",
            post(modules::stock_take::adjust_stock_take),
        )
        .route(
            "/stock-takes/{id}/items",
            get(modules::stock_take::list_stock_take_items)
                .post(modules::stock_take::create_stock_take_item),
        )
        .route(
            "/stock-takes/{id}/items/{item_id}",
            get(modules::stock_take::get_stock_take_item)
                .put(modules::stock_take::update_stock_take_item)
                .delete(modules::stock_take::delete_stock_take_item),
        )
        .route(
            "/stock-takes/{id}/items/{item_id}/count",
            post(modules::stock_take::count_stock_take),
        )
        // Transfer
        .route(
            "/transfers",
            get(modules::transfer_order::list_transfers)
                .post(modules::transfer_order::create_transfer),
        )
        .route(
            "/transfers/{id}",
            get(modules::transfer_order::get_transfer)
                .put(modules::transfer_order::update_transfer)
                .delete(modules::transfer_order::delete_transfer),
        )
        .route(
            "/transfers/{id}/confirm",
            post(modules::transfer_order::confirm_transfer),
        )
        .route(
            "/transfers/{id}/ship",
            post(modules::transfer_order::ship_transfer),
        )
        .route(
            "/transfers/{id}/receive",
            post(modules::transfer_order::receive_transfer),
        )
        .route(
            "/transfers/{id}/complete",
            post(modules::transfer_order::complete_transfer),
        )
        // Batch
        .route(
            "/batches",
            get(modules::batch::list_batches).post(modules::batch::create_batch),
        )
        .route(
            "/batches/{id}",
            get(modules::batch::get_batch)
                .put(modules::batch::update_batch)
                .delete(modules::batch::delete_batch),
        )
        // Serial Number
        .route(
            "/serial-numbers",
            get(modules::serial_number::list_serial_numbers)
                .post(modules::serial_number::create_serial_number),
        )
        .route(
            "/serial-numbers/{id}",
            get(modules::serial_number::get_serial_number)
                .put(modules::serial_number::update_serial_number)
                .delete(modules::serial_number::delete_serial_number),
        )
        .route(
            "/serial-numbers/{id}/trace",
            get(modules::serial_number::get_trace),
        )
        // Inventory Alert
        .route(
            "/inventory-alerts/rules",
            get(modules::inventory_alert::list_alert_rules)
                .post(modules::inventory_alert::create_alert_rule),
        )
        .route(
            "/inventory-alerts/rules/{id}",
            get(modules::inventory_alert::get_alert_rule)
                .put(modules::inventory_alert::update_alert_rule)
                .delete(modules::inventory_alert::delete_alert_rule),
        )
        .route(
            "/inventory-alerts/records",
            get(modules::inventory_alert::list_alert_records),
        )
        .route(
            "/inventory-alerts/records/{id}",
            get(modules::inventory_alert::get_alert_record),
        )
        .route(
            "/inventory-alerts/records/{id}/confirm",
            post(modules::inventory_alert::confirm_alert_record),
        )
        .route(
            "/inventory-alerts/statistics",
            get(modules::inventory_alert::get_alert_statistics),
        )
        // Wave Pick
        .route(
            "/wave-picks",
            get(modules::wave_pick::list_wave_picks).post(modules::wave_pick::create_wave_pick),
        )
        .route(
            "/wave-picks/{id}",
            get(modules::wave_pick::get_wave_pick)
                .put(modules::wave_pick::update_wave_pick)
                .delete(modules::wave_pick::delete_wave_pick),
        )
        .route(
            "/wave-picks/{id}/start",
            post(modules::wave_pick::start_wave_pick),
        )
        .route(
            "/wave-picks/{id}/complete",
            post(modules::wave_pick::complete_wave_pick),
        )
        .route(
            "/wave-picks/{id}/cancel",
            post(modules::wave_pick::cancel_wave_pick),
        )
        // Smart Replenishment
        .route(
            "/smart-replenishment/suggestions",
            get(modules::smart_replenishment::list_suggestions),
        )
        .route(
            "/smart-replenishment/suggestions/generate",
            post(modules::smart_replenishment::compute_replenishment),
        )
        .route(
            "/smart-replenishment/suggestions/{id}",
            get(modules::smart_replenishment::get_suggestion)
                .post(modules::smart_replenishment::confirm_suggestion),
        )
        .route(
            "/smart-replenishment/rules",
            get(modules::smart_replenishment::list_rules)
                .post(modules::smart_replenishment::create_rule),
        )
        // Audit
        .route("/audit-logs", get(modules::audit::list_audit_logs))
        .route("/audit-logs/{id}", get(modules::audit::get_audit_log))
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            api_state.db.clone(),
            rls_middleware,
        ));

    let app = Router::new()
        .merge(health_router)
        .nest("/api/wms", protected_routes)
        .merge(create_api_info_router("topems-wms"))
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .layer(cors)
        .with_state(api_state.clone());

    let port = env::var("WMS_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .unwrap_or_else(|_| "8041".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-WMS 仓库管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(modules::openapi::WmsApiDoc::openapi())
}

async fn health_check(
    axum::extract::State(state): axum::extract::State<ApiState>,
) -> Json<ApiResponse<String>> {
    let database_health = check_database_health(&state.db).await;
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

async fn health_check_detailed(
    axum::extract::State(state): axum::extract::State<ApiState>,
) -> Json<ApiResponse<ServiceHealth>> {
    let dependencies = vec![
        check_database_health(&state.db).await,
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

    let health = ServiceHealth::healthy_with_message("topems-wms", message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

#[derive(Serialize, Clone)]
struct WmsServiceMetrics {
    service_name: String,
    uptime_seconds: u64,
    uptime_formatted: String,
    request_count: u64,
    error_count: u64,
    active_connections: u64,
    database_pool_size: u32,
    database_pool_idle: usize,
}

async fn get_metrics(
    axum::extract::State(state): axum::extract::State<ApiState>,
) -> Json<ApiResponse<WmsServiceMetrics>> {
    let metrics = WmsServiceMetrics {
        service_name: "topems-wms".to_string(),
        uptime_seconds: state.metrics.get_uptime_seconds(),
        uptime_formatted: state.metrics.get_uptime(),
        request_count: state.metrics.get_request_count(),
        error_count: state.metrics.get_error_count(),
        active_connections: state.metrics.get_active_connections(),
        database_pool_size: state.db.size() as u32,
        database_pool_idle: state.db.num_idle(),
    };

    Json(ApiResponse::success(metrics, "服务指标"))
}

async fn check_database_health(pool: &sqlx::PgPool) -> DependencyHealth {
    match sqlx::query("SELECT 1").execute(pool).await {
        Ok(_) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Healthy,
            message: "数据库连接正常".to_string(),
        },
        Err(e) => {
            tracing::error!("数据库健康检查失败: {}", e);
            DependencyHealth {
                name: "database".to_string(),
                status: HealthStatus::Unhealthy,
                message: format!("数据库连接失败: {}", e),
            }
        }
    }
}

async fn check_iam_health() -> DependencyHealth {
    let iam_url =
        env::var("IAM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let health_url = format!("{}/health", iam_url);

    match check_http_health(&health_url).await {
        Ok(status) => {
            let message = match status {
                HealthStatus::Healthy => "IAM 服务正常",
                HealthStatus::Degraded => "IAM 服务响应异常",
                HealthStatus::Unhealthy => "IAM 服务不可用",
            };
            DependencyHealth {
                name: "iam-service".to_string(),
                status,
                message: message.to_string(),
            }
        }
        Err(e) => {
            tracing::warn!("IAM 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "iam-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("IAM 服务连接异常: {}", e),
            }
        }
    }
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

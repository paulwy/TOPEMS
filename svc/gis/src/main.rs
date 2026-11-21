use anyhow::Result;
use axum::{extract::State, routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use std::sync::Arc;
use utoipa::OpenApi;

use topems_shared_bootstrap::{
    bootstrap_service_shared, check_iam_health, health_status_str, overall_health_message,
    resolve_port, rollup_health_status, run, Application, ServiceConfig,
};
use topems_shared_core::api_version::{create_api_info_router, register_routes_with_legacy_alias};
use topems_shared_core::cors::create_cors_layer;
use topems_shared_core::logging::request_context_middleware;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use topems_shared_observability::telemetry::telemetry_middleware;

use topems_gis::embedded::{self, AppState};

// 二进制复用 lib crate 的模块（避免重复编译产生类型身份不一致）
use topems_gis::{event_handlers, modules};

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(modules::openapi::GisApiDoc::openapi())
}

#[tokio::main]
async fn main() -> Result<()> {
    let config = ServiceConfig {
        name: "topems-gis",
        port: 8071,
        port_env_var: Some("GIS_PORT"),
        max_db_connections: 20,
        enable_events: false,
        enable_rls: true,
        enable_request_context: false,
        api_prefix: "/api/gis",
        legacy_prefixes: &["/api/core/gis/v1"],
        init_telemetry: true,
    };
    let ctx = bootstrap_service_shared(&config).await?;
    // 连接治理 B：模块 schema 作用域固化在 Db 中（事务内 SET LOCAL search_path）。
    // 事件订阅等后台任务按事件租户自建作用域，使用未加请求守卫的 Db。
    let background_db = Db::new(ctx.db.clone(), "gis, public");
    // M-1：请求链路禁止自开事务/租户作用域，统一复用 tenant_middleware 的请求级 RLS 事务（scope_with）。
    let db = background_db
        .clone()
        .deny_request_own_txn()
        .deny_request_tenant_scope();

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

    if let Err(e) = event_handlers::start_event_subscribers(background_db.clone()).await {
        tracing::warn!("⚠️ GIS 事件订阅者启动失败: {}", e);
    }

    let ws_config = modules::websocket::WebSocketConfig::from_env();
    tracing::info!(
        "🔌 WebSocket 配置: max_connections={}, idle_timeout={}s",
        ws_config.max_connections,
        ws_config.idle_timeout_secs
    );
    let state = AppState {
        pool: db,
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

    // 业务路由（公开 + 受保护）：独立部署与 server 统一入口（module-gis）共用同一组装
    let gis_routes = embedded::build_business_router(&state, ctx.db.clone());

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
    .layer(cors)
    // gis 不走 build_application，需手动补 /metrics 鉴权层（最外层）。
    .layer(topems_shared_bootstrap::metrics_auth_layer());

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

use topems_shared_core::health::{DependencyHealth, HealthStatus, ServiceHealth};

async fn health_check(State(state): State<AppState>) -> Json<ApiResponse<String>> {
    let database_health = if state.pool.check_health().await.is_ok() {
        HealthStatus::Healthy
    } else {
        HealthStatus::Unhealthy
    };
    let iam_health = check_iam_health().await;
    let overall_status = rollup_health_status(&[database_health, iam_health.status]);
    let status_str = health_status_str(&overall_status).to_string();
    Json(ApiResponse::success(status_str, "健康检查"))
}

async fn health_check_detailed(State(state): State<AppState>) -> Json<ApiResponse<ServiceHealth>> {
    let database_health = match state.pool.check_health().await {
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
    };
    let dependencies = vec![database_health, check_iam_health().await];
    let statuses: Vec<HealthStatus> = dependencies.iter().map(|d| d.status.clone()).collect();
    let overall_status = rollup_health_status(&statuses);
    let health =
        ServiceHealth::healthy_with_message("topems-gis", overall_health_message(&overall_status))
            .with_dependencies(dependencies);
    Json(ApiResponse::success(health, "详细健康检查"))
}

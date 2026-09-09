use anyhow::Result;
use axum::{extract::State, routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use std::sync::Arc;
use topems_shared_db::database::create_migrate_pool;
use utoipa::OpenApi;

use topems_shared_bootstrap::{bootstrap_service, resolve_port, run, Application, ServiceConfig};
use topems_shared_core::api_version::{create_api_info_router, register_routes_with_legacy_alias};
use topems_shared_core::cors::create_cors_layer;
use topems_shared_core::logging::request_context_middleware;
use topems_shared_core::response::ApiResponse;
use topems_shared_observability::telemetry::telemetry_middleware;

use topems_gis::embedded::{self, AppState};

// 二进制复用 lib crate 的模块（避免重复编译产生类型身份不一致）
use topems_gis::{db, event_handlers, modules, schema_defense};

use db::schema::init_tables;

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
        init_telemetry: true,
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

    // GIS 专属初始化：建表（DDL 走 MIGRATE_URL owner 池，未配置回退运行时池）
    let migrate_pool = create_migrate_pool().await.unwrap_or_else(|e| {
        tracing::warn!("⚠️ GIS MIGRATE_URL 迁移池创建失败，DDL 回退运行时池: {}", e);
        None
    });
    if let Err(e) = init_tables(migrate_pool.as_ref().unwrap_or(&ctx.db)).await {
        tracing::warn!("⚠️ GIS 建表初始化失败: {}", e);
    }
    tracing::info!("✅ 数据库表初始化成功");

    // Schema 防御：增量补列 + 一致性校验（失败不阻塞启动）
    if let Err(e) = schema_defense::run(&ctx.db).await {
        tracing::warn!("GIS schema defense 失败（不阻塞启动）: {}", e);
    }

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

    // 业务路由（公开 + 受保护）：独立部署与 server 统一入口（module-gis）共用同一组装
    let gis_routes = embedded::build_business_router(&state);

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

use topems_shared_bootstrap::{build_detailed_service_health, build_simple_status_response};

async fn health_check(State(state): State<AppState>) -> Json<ApiResponse<String>> {
    build_simple_status_response(&state.pool).await
}

async fn health_check_detailed(
    State(state): State<AppState>,
) -> Json<ApiResponse<topems_shared_core::health::ServiceHealth>> {
    build_detailed_service_health(&state.pool, "topems-gis", None, vec![]).await
}

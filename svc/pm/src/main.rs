pub mod models;
pub mod modules;
pub mod services;
pub mod shared;

use axum::{routing::get, Router};
use axum_prometheus::PrometheusMetricLayer;
use modules::{auth, pm_plugin};
use prometheus::{default_registry, Gauge};
use std::env;
use topems_shared::{
    auth_middleware, build_health_response, create_api_info_router, create_cors_layer,
    create_database_pool, init_telemetry, rls_middleware, telemetry_middleware,
    test_database_connection, wrap_group2_router, AuthState, DatabaseConfig, Result,
    RouteCompatConfig, ServiceHealth,
};
use utoipa::OpenApi;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-pm");

    // 设置search_path环境变量（供lib使用）
    std::env::set_var("SEARCH_PATH", "pm, shared, public");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_pm_custom_metric",
        "This is a custom metric for TOPEMS-PM",
    )
    .unwrap_or_else(|e| {
        tracing::error!("Failed to create Prometheus gauge: {}", e);
        panic!("Prometheus gauge creation failed - check for duplicate metric registrations")
    });
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap_or_else(|e| {
            tracing::error!("Failed to register Prometheus gauge: {}", e);
            panic!(
                "Prometheus gauge registration failed - check for duplicate metric registrations"
            )
        });
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    let db_config = DatabaseConfig {
        url: env::var("DATABASE_URL").map_err(|_| {
            tracing::error!("DATABASE_URL environment variable is required");
            topems_shared::TopemsError::Validation(
                "DATABASE_URL environment variable is required".to_string(),
            )
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
    test_database_connection(&pool).await?;

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let cors = create_cors_layer();

    let auth_state = AuthState::from_env();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route("/api/plugins/info", get(pm_plugin::get_plugin_info))
        .route("/api/plugins/health", get(pm_plugin::plugin_health_check))
        .merge(auth::create_routes());

    let protected_routes = modules::create_routes(pool.clone())
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            rls_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .nest("/api/pm", protected_routes)
        .merge(create_api_info_router("topems-pm"))
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .layer(cors);

    let cfg = RouteCompatConfig::new("pm", "/api/pm", &[]);
    let app = wrap_group2_router(app, cfg);

    let port = std::env::var("PM_PORT").unwrap_or_else(|_| "8023".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-PM 统一项目管理系统启动中...");
    tracing::info!("📦 Port: {}", port);
    tracing::info!("🔒 认证保护已启用");

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        pm_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-pm", true)
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(modules::openapi::ApiDoc::openapi())
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

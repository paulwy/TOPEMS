pub mod api;
pub mod models;
pub mod services;

use api::{auth, plugin};
use axum::{routing::get, Router};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use topems_shared::{
    auth_middleware, build_health_response, create_api_info_router, create_cors_layer,
    create_database_pool, init_logging, test_database_connection, AuthState, DatabaseConfig,
    Result, ServiceHealth,
};
use utoipa::OpenApi;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-pm");

    // 设置search_path环境变量（供lib使用）
    std::env::set_var("SEARCH_PATH", "pm, shared, public");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_pm_custom_metric",
        "This is a custom metric for TOPEMS-PM",
    )
    .unwrap();
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap();
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    let db_config = DatabaseConfig {
        url: "postgres://topems:topems_secret@localhost:5432/topems".to_string(),
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
        .route("/api/plugins/info", get(plugin::get_plugin_info))
        .route("/api/plugins/health", get(plugin::plugin_health_check))
        .merge(auth::create_routes());

    let protected_routes = api::create_routes(pool.clone()).layer(
        axum::middleware::from_fn_with_state(auth_state.clone(), auth_middleware),
    );

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-pm"))
        .layer(prometheus_layer)
        .layer(cors);

    let port = std::env::var("PM_PORT").unwrap_or_else(|_| "8001".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-PM 统一项目管理系统启动中...");
    tracing::info!("📦 Port: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-pm", true)
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(api::openapi::ApiDoc::openapi())
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

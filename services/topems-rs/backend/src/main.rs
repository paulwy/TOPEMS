mod api;
mod cache;
mod models;
mod repositories;
mod services;

use axum::{
    routing::get,
    Router,
};
use topems_shared::{
    auth_middleware,
    create_cors_layer,
    create_database_pool,
    init_logging,
    test_database_connection,
    AuthState,
    Config,
    Result,
    ServiceHealth,
    build_health_response,
    create_api_info_router,
};
use utoipa::OpenApi;
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-rs");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_rs_custom_metric",
        "This is a custom metric for TOPEMS-RS",
    ).unwrap();
    default_registry().register(Box::new(custom_gauge.clone())).unwrap();
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    let config = Config::load().await?;
    let db_config = config.get_database().await;
    tracing::info!("Configuration loaded, environment: {}", config.env());
    tracing::info!("=== DB Config ===");
    tracing::info!("Database URL: {}", db_config.url);
    tracing::info!("Database Name: {}", db_config.name);
    tracing::info!("Database Host: {}", db_config.host);
    tracing::info!("Database Port: {}", db_config.port);
    tracing::info!("Database User: {}", db_config.user);
    tracing::info!("Database Password: {}", db_config.password);

    let pool = create_database_pool(&db_config).await?;
    test_database_connection(&pool).await?;

    let test_result = sqlx::query("SELECT current_database(), current_user").fetch_one(&pool).await;
    tracing::info!("Test query result: {:?}", test_result);
    
    let search_path = sqlx::query("SHOW search_path").fetch_one(&pool).await;
    tracing::info!("Search path: {:?}", search_path);
    
    let schemas = sqlx::query("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name").fetch_all(&pool).await;
    tracing::info!("All schemas: {:?}", schemas);
    
    let schema_name = std::env::var("SCHEMA_NAME").unwrap_or_else(|_| "rs".to_string());
    
    let tables = sqlx::query(&format!("SELECT table_name FROM information_schema.tables WHERE table_schema = '{}'", schema_name))
        .fetch_all(&pool).await;
    tracing::info!("{} tables: {:?}", schema_name.to_uppercase(), tables);
    
    let test_projects_direct = sqlx::query(&format!("SELECT * FROM {} LIMIT 1", schema_name)).fetch_one(&pool).await;
    tracing::info!("Test direct projects query: {:?}", test_projects_direct);

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let auth_state = AuthState::from_env();

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .route("/metrics", get(move || async move { metric_handle.render() }))
        .merge(api::auth::create_routes(pool.clone(), auth_state.clone()).await?);

    let protected_routes = api::create_routes(pool.clone(), auth_state.clone(), config.clone())
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-rs"))
        .layer(prometheus_layer)
        .layer(cors);

    let port = config.get_server().await.port;
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-RS 科研研发管理系统启动中...");
    tracing::info!("📦 Port: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-rs", true)
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(api::openapi::ApiDoc::openapi())
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}
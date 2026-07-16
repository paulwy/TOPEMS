#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(clippy::manual_range_contains)]
#![allow(clippy::map_flatten)]
#![allow(dead_code)]

mod middleware;
mod models;
mod modules;
mod services;
mod shared;

use anyhow::Result;
use axum::{
    extract::{FromRef, State},
    routing::get,
    Json, Router,
};
use std::env;
use std::time::Instant;
use utoipa::OpenApi;

use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use topems_shared::{
    auth_middleware, build_health_response, create_api_info_router, create_cors_layer,
    create_database_pool, init_telemetry, rls_middleware, telemetry_middleware, wrap_group2_router,
    ApiResponse, AuthState, DatabaseConfig, RouteCompatConfig, ServiceHealth,
};

static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

fn get_uptime() -> u64 {
    START_TIME.get_or_init(Instant::now).elapsed().as_secs()
}

use modules::{
    create_bid_price_routes, create_category_routes, create_contract_routes,
    create_data_sync_routes, create_evaluation_routes, create_performance_routes,
    create_product_routes, create_purchase_order_routes, create_scoring_dimension_routes,
    create_statistics_routes, create_supplier_portal_routes, create_supplier_routes,
    create_tender_routes,
};

#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
    auth_state: AuthState,
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

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-srm");
    START_TIME.get_or_init(Instant::now);

    env::set_var("SEARCH_PATH", "srm, shared, public");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_srm_custom_metric",
        "This is a custom metric for TOPEMS-SRM",
    )
    .unwrap_or_else(|e| {
        tracing::error!("Failed to create Prometheus gauge: {}", e);
        panic!("Prometheus gauge creation failed - check for duplicate metric registrations")
    });
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap_or_else(|e| {
            tracing::error!("Failed to register Prometheus gauge: {}", e);
            panic!("Prometheus gauge registration failed - check for duplicate metric registrations")
        });
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    tracing::info!("🚀 TOPEMS-SRM 供应商关系管理系统启动中...");

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

    let app_state = AppState {
        pool: pool.clone(),
        auth_state: AuthState::from_env(),
    };

    let cors = create_cors_layer();

    let health_router = Router::new()
        .route("/health", get(health_check))
        .route("/api/srm/health/detailed", get(health_check_detailed))
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route(
            "/api/plugins/info",
            get(modules::srm_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::srm_plugin::plugin_health_check),
        )
        .with_state(app_state.clone());

    let protected_routes = Router::new()
        .merge(create_supplier_routes(pool.clone()).await?)
        .merge(create_category_routes(pool.clone()).await?)
        .merge(create_evaluation_routes(pool.clone()).await?)
        .merge(create_contract_routes(pool.clone()).await?)
        .merge(create_product_routes(pool.clone()).await?)
        .merge(create_purchase_order_routes(pool.clone()).await?)
        .merge(create_bid_price_routes(pool.clone()).await?)
        .merge(create_tender_routes(pool.clone()).await?)
        .merge(create_supplier_portal_routes(pool.clone()).await?)
        .merge(create_performance_routes(pool.clone()).await?)
        .merge(create_data_sync_routes(pool.clone()).await?)
        .merge(create_scoring_dimension_routes(pool.clone()).await?)
        .merge(create_statistics_routes(pool.clone()))
        .layer(axum::middleware::from_fn_with_state(
            app_state.pool.clone(),
            rls_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.pool.clone(),
            middleware::tenant::tenant_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-srm"))
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(cors)
        .layer(prometheus_layer);

    let cfg = RouteCompatConfig::new("srm", "/api/core/srm", &[]);
    let app = wrap_group2_router(app, cfg);

    let port = env::var("SRM_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .unwrap_or_else(|_| "8042".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("📦 端口: {}", port);
    tracing::info!("✅ TOPEMS-SRM 已就绪");
    tracing::info!("🔒 认证保护已启用");

    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::srm_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-srm", true)
}

#[derive(Debug, Clone, serde::Serialize, PartialEq)]
enum HealthStatus {
    #[serde(rename = "healthy")]
    Healthy,
    #[serde(rename = "degraded")]
    Degraded,
    #[serde(rename = "unhealthy")]
    Unhealthy,
}

#[derive(Debug, Clone, serde::Serialize)]
struct DependencyHealth {
    name: String,
    status: HealthStatus,
    message: String,
}

#[derive(Debug, Clone, serde::Serialize)]
struct DetailedHealth {
    service_name: String,
    status: HealthStatus,
    message: String,
    timestamp: String,
    uptime: Option<u64>,
    dependencies: Option<Vec<DependencyHealth>>,
    response_time_ms: Option<u64>,
    last_check: Option<String>,
}

async fn health_check_detailed(State(state): State<AppState>) -> Json<ApiResponse<DetailedHealth>> {
    let mut dependencies = Vec::new();

    let db_result = sqlx::query("SELECT 1").fetch_one(&state.pool).await;
    let db_health = match db_result {
        Ok(_) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Healthy,
            message: "PostgreSQL 数据库连接正常".to_string(),
        },
        Err(e) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Unhealthy,
            message: format!("数据库连接失败: {}", e),
        },
    };
    dependencies.push(db_health);

    let status = if dependencies
        .iter()
        .all(|d| d.status == HealthStatus::Healthy)
    {
        HealthStatus::Healthy
    } else if dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Unhealthy)
    {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let health = DetailedHealth {
        service_name: "topems-srm".to_string(),
        status,
        message: "健康检查完成".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: Some(get_uptime()),
        dependencies: Some(dependencies),
        response_time_ms: None,
        last_check: Some(chrono::Utc::now().to_rfc3339()),
    };

    Json(ApiResponse::success(health, "健康检查完成"))
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(modules::openapi::SrmApiDoc::openapi())
}

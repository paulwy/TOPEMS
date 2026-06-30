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

mod api;
mod models;
mod services;

use anyhow::Result;
use axum::{extract::State, routing::get, Json, Router};
use std::env;
use std::time::Instant;
use utoipa::OpenApi;

use api::{plugin, ApiState};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use std::sync::Arc;
use std::time::Duration;
use topems_shared::redis::RedisCacheService;
use topems_shared::{
    auth_middleware, build_health_response, create_api_info_router, create_cors_layer,
    create_database_pool, init_telemetry, telemetry_middleware, ApiResponse, AuthState,
    DatabaseConfig, RedisConfig, RedisPool as RedisPoolTrait, ServiceHealth,
};
use tower_http::{compression::CompressionLayer, timeout::TimeoutLayer};

static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

fn get_uptime() -> u64 {
    START_TIME.get_or_init(Instant::now).elapsed().as_secs()
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-scm");
    START_TIME.get_or_init(Instant::now);

    // 设置search_path环境变量（供lib使用）
    env::set_var("SEARCH_PATH", "scm, shared, public");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_scm_custom_metric",
        "This is a custom metric for TOPEMS-SCM",
    )
    .unwrap();
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap();
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    let db_config = DatabaseConfig {
        url: "postgres://topems:topems_secret@localhost:5432/topems".to_string(),
        max_connections: 50,
        min_connections: Some(10),
        connect_timeout: Some(10),
        idle_timeout: Some(300),
        max_lifetime: Some(1800),
        test_interval: Some(60),
        enable_connection_reuse: Some(true),
    };

    let pool = create_database_pool(&db_config).await?;

    tracing::info!("🔗 数据库连接成功");

    let redis_cache = match env::var("REDIS_URL").ok() {
        Some(url) => {
            let redis_config = RedisConfig {
                url,
                max_connections: 20,
                connect_timeout: Some(5),
            };
            let redis_pool = RedisPoolTrait::new(&redis_config).await;
            match redis_pool {
                Ok(pool) => {
                    let cache = Arc::new(RedisCacheService::new(Arc::new(pool)));
                    tracing::info!("✅ Redis 缓存服务已初始化");
                    Some(cache)
                }
                Err(e) => {
                    tracing::warn!("⚠️ Redis 初始化失败: {}", e);
                    None
                }
            }
        }
        None => {
            tracing::info!("ℹ️ 未配置 Redis URL，跳过缓存初始化");
            None
        }
    };

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: AuthState::from_env(),
        cache: redis_cache,
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route("/api/plugins/info", get(plugin::get_plugin_info))
        .route("/api/plugins/health", get(plugin::plugin_health_check))
        .route("/api-docs/openapi.json", get(serve_openapi_json));

    let protected_routes = api::create_routes()
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-scm"))
        .with_state(api_state)
        .layer(cors)
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::new(Duration::from_secs(30)));

    let port = env::var("PORT").unwrap_or_else(|_| "8040".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-SCM 供应链管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-scm", true)
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

async fn health_check_detailed(State(state): State<ApiState>) -> Json<ApiResponse<DetailedHealth>> {
    let mut dependencies = Vec::new();

    let db_result = sqlx::query("SELECT 1").fetch_one(&state.db).await;
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
        service_name: "topems-scm".to_string(),
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
    axum::Json(api::openapi::ScmApiDoc::openapi())
}

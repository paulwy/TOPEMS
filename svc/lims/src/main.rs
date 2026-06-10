mod api;
mod models;
mod services;

use anyhow::Result;
use axum::{
    routing::get,
    serve, Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{Encoder, TextEncoder};
use serde::Serialize;
use tokio::net::TcpListener;
use socket2::{Socket, Domain, Type, Protocol};
use std::sync::Arc;
use std::time::Instant;
use std::env;

use topems_shared::{
    ApiResponse,
    AuthState,
    auth_middleware,
    create_cors_layer,
    init_logging,
    create_database_pool,
    test_database_connection,
    Config,
    ServiceHealth,
    HealthStatus,
    DependencyHealth,
    SystemMetrics,
    check_http_health,
    create_api_info_router,
};
use utoipa::OpenApi;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-lims");

    let config = Config::load().await?;
    tracing::info!("Configuration loaded, environment: {}", config.env());

    let pool = create_database_pool(&config.get_database().await).await?;
    test_database_connection(&pool).await?;

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let start_time = Instant::now();
    let metrics = Arc::new(SystemMetrics::new());
    let auth_state = AuthState::from_env();

    let cors = create_cors_layer();

    let (prometheus_layer, _metric_handle) = PrometheusMetricLayer::pair();

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: auth_state.clone(),
        metrics: metrics.clone(),
        start_time,
    };

    let health_router = Router::new()
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .route("/api/v1/metrics", get(get_metrics))
        .route("/metrics", get(move || async move {
            let encoder = TextEncoder::new();
            let metrics = prometheus::gather();
            let mut buffer = Vec::new();
            encoder.encode(&metrics, &mut buffer).unwrap();
            String::from_utf8(buffer).unwrap()
        }))
        .with_state(api_state.clone());

    let protected_routes = Router::new()
        .merge(api::create_routes(pool.clone(), auth_state.clone(), config.clone()).await?)
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-lims"))
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .layer(prometheus_layer)
        .layer(cors);

    let port = config.get_server().await.port;
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-LIMS 实验室信息管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await?,
        app.into_make_service()
    ).await?;

    Ok(())
}

#[derive(Clone)]
struct ApiState {
    db: sqlx::PgPool,
    auth_state: AuthState,
    metrics: Arc<SystemMetrics>,
    start_time: Instant,
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

    let health = ServiceHealth::healthy_with_message("topems-lims", message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

#[derive(Serialize, Clone)]
struct LimsServiceMetrics {
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
) -> Json<ApiResponse<LimsServiceMetrics>> {
    let metrics = LimsServiceMetrics {
        service_name: "topems-lims".to_string(),
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
    match sqlx::query("SELECT 1")
        .execute(pool)
        .await
    {
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
    let iam_url = env::var("IAM_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
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

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(api::openapi::ApiDoc::openapi())
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}
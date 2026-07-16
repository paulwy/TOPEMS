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
#![allow(unused_imports)]

mod shared;

use anyhow::Result;
use axum::{routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{Encoder, TextEncoder};
use serde::Serialize;
use std::env;
use std::sync::Arc;
use std::time::Instant;

use topems_shared::{
    auth_middleware, check_http_health, create_api_info_router, create_cors_layer,
    create_database_pool, init_telemetry, security_headers_middleware, telemetry_middleware,
    wrap_group2_router, ApiResponse, AuthState, DatabaseConfig, DependencyHealth, HealthStatus,
    RateLimitConfig, RateLimitMiddleware, RouteCompatConfig, SecurityHeadersConfig,
    SecurityHeadersLayer, ServiceHealth, SystemMetrics,
};

mod middleware;
mod models;
mod modules;

use modules::ApiState;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-monitor");

    env::set_var("SEARCH_PATH", "monitor, shared, public");

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

    let rate_limit_config = RateLimitConfig {
        enabled: true,
        requests: 500,
        window_secs: 60,
    };
    let rate_limit_middleware = Arc::new(RateLimitMiddleware::new(rate_limit_config));

    let security_headers_config = SecurityHeadersConfig::default();
    let security_headers_layer = Arc::new(SecurityHeadersLayer::new(security_headers_config));

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: AuthState::from_env(),
        metrics: metrics.clone(),
        start_time,
    };

    let cors = create_cors_layer();

    let (prometheus_layer, _metric_handle) = PrometheusMetricLayer::pair();

    let health_router = Router::new()
        .route("/health", get(health_check))
        .route("/api/health/detailed", get(health_check_detailed))
        .route("/api/metrics", get(get_metrics))
        .route(
            "/api/plugins/health",
            get(modules::monitor_plugin::plugin_health_check),
        )
        .route(
            "/api/plugins/info",
            get(modules::monitor_plugin::get_plugin_info),
        )
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
        )
        .with_state(api_state.clone());

    let protected_routes = modules::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(api_state.clone());

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-monitor"))
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(axum::middleware::from_fn(move |req, next| {
            let middleware = rate_limit_middleware.clone();
            async move { middleware.middleware(req, next).await }
        }))
        .layer(axum::middleware::from_fn(move |req, next| {
            let layer = security_headers_layer.clone();
            async move { security_headers_middleware(layer, req, next).await }
        }))
        .layer(prometheus_layer)
        .layer(cors)
        .with_state(api_state.clone());

    let cfg = RouteCompatConfig::new("monitor", "/api/core/monitor", &[]);
    let app = wrap_group2_router(app, cfg);

    let port = env::var("MONITOR_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .unwrap_or_else(|_| "8062".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-Monitor 系统监控服务启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::monitor_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
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

    let health = ServiceHealth::healthy_with_message("topems-monitor", message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

#[derive(Serialize, Clone)]
struct MonitorServiceMetrics {
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
) -> Json<ApiResponse<MonitorServiceMetrics>> {
    let metrics = MonitorServiceMetrics {
        service_name: "topems-monitor".to_string(),
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

async fn init_db(_db: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

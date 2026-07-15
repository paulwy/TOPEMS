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

use anyhow::Result;
use axum::{extract::State, routing::get, Json, Router};
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
    AuthState, DatabaseConfig, DependencyHealth, FieldEncryptionService, HealthStatus, KeyManager,
    ServiceHealth, SystemMetrics,
};

mod middleware;
mod models;
mod shared;

pub mod modules;

use modules::ApiState;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-crm");

    // 设置search_path环境变量（供lib使用）
    env::set_var("SEARCH_PATH", "crm, shared, public");

    let db_config = DatabaseConfig {
        url: env::var("DATABASE_URL")
            .expect("DATABASE_URL environment variable is required")
            .to_string(),
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

    let encryption_service = init_encryption_service();
    tracing::info!("🔐 字段加密服务初始化成功");

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: AuthState::from_env(),
        metrics: metrics.clone(),
        start_time,
        encryption: Arc::new(encryption_service),
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    let health_router = Router::new()
        .route("/health", get(health_check))
        .route("/api/health/detailed", get(health_check_detailed))
        .route("/api/metrics", get(get_metrics))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .with_state(api_state.clone());

    let protected_routes = modules::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            api_state.db.clone(),
            middleware::tenant::tenant_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            api_state.db.clone(),
            rls_middleware,
        ))
        .with_state(api_state.clone());

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-crm"))
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .layer(cors);

    let port = env::var("CRM_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .unwrap_or_else(|_| "8029".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-CRM 客户关系管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::crm_plugin::auto_register_to_core(core_url.as_deref()).await;
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

    let health = ServiceHealth::healthy_with_message("topems-crm", message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

#[derive(Serialize, Clone)]
struct CrmServiceMetrics {
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
) -> Json<ApiResponse<CrmServiceMetrics>> {
    let metrics = CrmServiceMetrics {
        service_name: "topems-crm".to_string(),
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

fn init_encryption_service() -> FieldEncryptionService {
    let master_key = env::var("ENCRYPTION_MASTER_KEY").unwrap_or_else(|_| {
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef".to_string()
    });
    let key_bytes = hex::decode(&master_key).unwrap_or_else(|_| vec![0x42; 32]);
    let mut key_array = [0u8; 32];
    key_array.copy_from_slice(&key_bytes[..32]);
    let key_manager = KeyManager::new(&key_array);
    FieldEncryptionService::new(key_manager)
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(modules::openapi::CrmApiDoc::openapi())
}

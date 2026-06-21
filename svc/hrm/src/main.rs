#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(dead_code)]

mod api;
mod models;
mod plugin;
mod services;
mod utils;

use anyhow::Result;
use axum::{
    body::Body,
    extract::{Request, State},
    http::header,
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{Encoder, TextEncoder};
use serde::Serialize;
use std::env;
use std::sync::Arc;
use std::time::Instant;
use utoipa::OpenApi;

use api::ApiState;
use topems_shared::{
    check_http_health, config::CacheConfig, create_api_info_router,
    create_cors_layer, create_database_pool, init_logging, verify_jwt_token, ApiResponse, AuthState,
    CacheService, Claims, DatabaseConfig, DependencyHealth, HealthStatus, InMemoryCache,
    RedisCacheService, RedisConfig, RedisPool, ServiceHealth, SystemMetrics,
};

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-hrm");

    env::set_var("SEARCH_PATH", "shared, hrm, public");

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

    tracing::info!("🔗 数据库连接成功");

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let cache = init_cache().await;
    tracing::info!("🗄️ 缓存服务初始化完成");

    let start_time = Instant::now();
    let metrics = Arc::new(SystemMetrics::new());

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: AuthState::from_env(),
        metrics: metrics.clone(),
        start_time,
        cache,
    };

    let cors = create_cors_layer();

    let (prometheus_layer, _metric_handle) = PrometheusMetricLayer::pair();

    let health_router = Router::new()
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .route("/api/v1/metrics", get(get_metrics))
        .route(
            "/metrics",
            get(move || async move {
                let encoder = TextEncoder::new();
                let metrics = prometheus::gather();
                let mut buffer = Vec::new();
                encoder.encode(&metrics, &mut buffer).unwrap();
                String::from_utf8(buffer).unwrap()
            }),
        )
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .with_state(api_state.clone());

    let protected_routes = api::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            hrm_auth_middleware,
        ))
        .with_state(api_state.clone());

    let app = Router::new()
        .merge(health_router)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-hrm"))
        .layer(prometheus_layer)
        .layer(cors);

    let port = env::var("HRM_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .or_else(|_| env::var("PORT"))
        .unwrap_or_else(|_| "8020".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-HRM 人力资源管理系统启动中...");
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

async fn init_cache() -> Arc<dyn CacheService + Send + Sync> {
    match env::var("REDIS_URL") {
        Ok(_) => {
            let redis_config = RedisConfig::default();
            match RedisPool::new(&redis_config).await {
                Ok(pool) => {
                    tracing::info!("✅ 使用 Redis 缓存");
                    Arc::new(RedisCacheService::new(Arc::new(pool)))
                }
                Err(e) => {
                    tracing::warn!("⚠️ Redis 连接失败，回退到内存缓存: {}", e);
                    let cache_config = CacheConfig::default();
                    Arc::new(InMemoryCache::new(cache_config))
                }
            }
        }
        Err(_) => {
            tracing::info!("⚠️ REDIS_URL 未设置，使用内存缓存");
            let cache_config = CacheConfig::default();
            Arc::new(InMemoryCache::new(cache_config))
        }
    }
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

    let health = ServiceHealth::healthy_with_message("topems-hrm", message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

async fn get_metrics(
    axum::extract::State(state): axum::extract::State<ApiState>,
) -> Json<ApiResponse<HrmServiceMetrics>> {
    let metrics = HrmServiceMetrics {
        service_name: "topems-hrm".to_string(),
        uptime_seconds: state.metrics.get_uptime_seconds(),
        uptime_formatted: state.metrics.get_uptime(),
        request_count: state.metrics.get_request_count(),
        error_count: state.metrics.get_error_count(),
        active_connections: state.metrics.get_active_connections(),
        database_pool_size: state.db.size(),
        database_pool_idle: state.db.num_idle(),
    };

    Json(ApiResponse::success(metrics, "服务指标"))
}

#[derive(Serialize, Clone)]
struct HrmServiceMetrics {
    service_name: String,
    uptime_seconds: u64,
    uptime_formatted: String,
    request_count: u64,
    error_count: u64,
    active_connections: u64,
    database_pool_size: u32,
    database_pool_idle: usize,
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

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(api::openapi::ApiDoc::openapi())
}

/// HRM 自定义认证中间件
/// 支持两种认证模式：
/// 1. 代理模式：通过 X-User-Id header 传递用户 ID
/// 2. 直连模式：通过 Authorization header 传递 JWT token
async fn hrm_auth_middleware(
    State(auth_state): State<AuthState>,
    req: Request,
    next: Next,
) -> Response {
    let path = req.uri().path();

    // 公开路径不需要认证
    let public_paths = [
        "/",
        "/health",
        "/api/plugins/info",
        "/api/v1/health/detailed",
        "/api/v1/metrics",
    ];
    if public_paths.contains(&path) || path.starts_with("/metrics") || path.starts_with("/api-docs") {
        return next.run(req).await;
    }

    let (mut parts, body) = req.into_parts();

    // 模式 1: 检查 X-User-Id header（代理模式）
    if let Some(user_id) = parts.headers.get("X-User-Id") {
        if let Ok(user_id_str) = user_id.to_str() {
            // 创建简化的 Claims 用于代理模式
            let claims = Claims {
                sub: user_id_str.to_string(),
                username: user_id_str.to_string(),
                role: "user".to_string(),
                roles: vec!["user".to_string()],
                permissions: vec![],
                is_superuser: false,
                exp: 0,
                iat: 0,
                email: None,
                department: None,
                tenant_id: parts.headers.get("X-Tenant-Id").and_then(|h| h.to_str().ok()).map(|s| s.to_string()),
            };
            parts.extensions.insert(claims);
            let req = Request::from_parts(parts, body);
            return next.run(req).await;
        }
    }

    // 模式 2: 检查 Authorization header（直连模式）
    let auth_header = parts
        .headers
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => {
            return topems_shared::response::api_error::<()>(401, "未授权：缺少有效的认证令牌").into_response();
        }
    };

    match verify_jwt_token(token, &auth_state.jwt_secret) {
        Ok(claims) => {
            parts.extensions.insert(claims);
            let req = Request::from_parts(parts, body);
            next.run(req).await
        }
        Err(e) => {
            tracing::error!("Token verification failed: {}", e);
            topems_shared::response::api_error::<()>(401, &format!("认证失败：{}", e)).into_response()
        }
    }
}

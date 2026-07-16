mod models;
mod services;

pub mod modules;
mod shared;

use anyhow::Result;
use axum::{routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{Encoder, TextEncoder};
use serde::Serialize;
use std::env;
use std::sync::Arc;
use std::time::Instant;
use utoipa::OpenApi;

use modules::ApiState;
use topems_shared::redis::{RedisCacheService, RedisPool as RedisPoolTrait};
use topems_shared::{
    auth_middleware, check_http_health, config::enhanced::DatabaseConfig, config::CacheConfig,
    create_api_info_router, create_cors_layer, init_telemetry, rls_middleware,
    telemetry_middleware, wrap_group2_router, ApiResponse, AuthState, CacheService,
    DependencyHealth, FieldEncryptionService, HealthStatus, RouteCompatConfig, ServiceHealth,
    SystemMetrics,
};

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-hrm");

    env::set_var("SEARCH_PATH", "shared, hrm, public");

    let app = build_routes().await?;

    let port = env::var("HRM_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .or_else(|_| env::var("PORT"))
        .unwrap_or_else(|_| "8020".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-HRM 服务启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn build_routes() -> Result<Router> {
    let database_url = env::var("DATABASE_URL").map_err(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        anyhow::anyhow!("DATABASE_URL environment variable is required")
    })?;
    let db_config = DatabaseConfig {
        url: database_url,
        max_connections: env::var("DB_MAX_CONNECTIONS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(10),
        min_connections: Some(
            env::var("DB_MIN_CONNECTIONS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(2),
        ),
        connect_timeout: Some(
            env::var("DB_CONNECT_TIMEOUT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(30),
        ),
        idle_timeout: Some(
            env::var("DB_IDLE_TIMEOUT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(60),
        ),
        max_lifetime: Some(
            env::var("DB_MAX_LIFETIME")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(1800),
        ),
        test_interval: Some(
            env::var("DB_TEST_INTERVAL")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(60),
        ),
        enable_connection_reuse: Some(true),
    };

    let pool = topems_shared::create_database_pool(&db_config).await?;
    tracing::info!("🔗 数据库连接成功");

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let cache = init_cache().await;
    tracing::info!("🗄️ 缓存服务初始化完成");

    let encryption = init_encryption_service();
    tracing::info!("🔐 字段加密服务初始化完成");

    let start_time = Instant::now();
    let metrics = Arc::new(SystemMetrics::new());

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: AuthState::from_env(),
        metrics: metrics.clone(),
        start_time,
        cache,
        encryption: Arc::new(encryption),
    };

    let (prometheus_layer, _metric_handle) = PrometheusMetricLayer::pair();

    let health_router = Router::new()
        .route("/api/health/detailed", get(health_check_detailed))
        .route("/api/metrics", get(get_metrics))
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
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .with_state(api_state.clone());

    let protected_routes = modules::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            api_state.db.clone(),
            rls_middleware,
        ))
        .with_state(api_state.clone());

    let app = Router::new()
        .merge(health_router)
        .nest("/api/hrm", protected_routes)
        .merge(create_api_info_router("topems-hrm"))
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .layer(create_cors_layer());

    let cfg = RouteCompatConfig::new(
        "hrm",
        "/api/core/hrm",
        &[
            ("employees", "employees"),
            ("departments", "departments"),
            ("contracts", "contracts"),
            ("attendance", "attendance"),
            ("leave", "leave"),
            ("payroll", "payroll"),
            ("performance", "performance"),
            ("recruitment", "recruitment"),
            ("training", "training"),
            ("salary-adjustments", "salary_adjustments"),
            ("setup", "setup"),
        ],
    );
    let app = wrap_group2_router(app, cfg);

    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::hrm_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    Ok(app)
}

async fn simple_health_check(
    axum::extract::State(state): axum::extract::State<ApiState>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("SELECT 1").execute(&state.db).await;
    let status = if result.is_ok() {
        "healthy"
    } else {
        "unhealthy"
    };
    Json(ApiResponse::success(status.to_string(), "健康检查"))
}

async fn init_cache() -> Arc<dyn CacheService + Send + Sync> {
    match env::var("REDIS_URL") {
        Ok(_) => {
            let redis_config = topems_shared::RedisConfig::default();
            match RedisPoolTrait::new(&redis_config).await {
                Ok(pool) => {
                    tracing::info!("✅ 使用 Redis 缓存");
                    Arc::new(RedisCacheService::new(Arc::new(pool)))
                }
                Err(e) => {
                    tracing::warn!("⚠️ Redis 连接失败，回退到内存缓存: {}", e);
                    let cache_config = CacheConfig::default();
                    Arc::new(topems_shared::InMemoryCache::new(cache_config))
                }
            }
        }
        Err(_) => {
            tracing::info!("⚠️ REDIS_URL 未设置，使用内存缓存");
            let cache_config = CacheConfig::default();
            Arc::new(topems_shared::InMemoryCache::new(cache_config))
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

fn init_encryption_service() -> FieldEncryptionService {
    let encryption_key =
        env::var("ENCRYPTION_KEY").unwrap_or_else(|_| {
            tracing::error!("ENCRYPTION_KEY environment variable is required");
            panic!("ENCRYPTION_KEY environment variable is required - service cannot start without encryption key")
        });

    let key_b64 = if let Some(stripped) = encryption_key.strip_prefix("base64:") {
        stripped.to_string()
    } else {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(encryption_key.as_bytes());
        let result = hasher.finalize();
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, result)
    };

    topems_shared::KeyManager::from_base64_key(&key_b64)
        .map(FieldEncryptionService::new)
        .unwrap_or_else(|e| {
            tracing::error!("Failed to initialize encryption service: {}", e);
            panic!(
                "Failed to initialize encryption service with provided ENCRYPTION_KEY: {}",
                e
            )
        })
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(modules::openapi::ApiDoc::openapi())
}

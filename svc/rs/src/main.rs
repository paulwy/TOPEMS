mod cache;
mod middleware;
mod models;
mod modules;
mod repositories;
mod services;
mod shared;

use axum::{routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use serde::Serialize;
use std::env;
use std::sync::Arc;
use std::time::Instant;

use topems_shared::{
    auth_middleware, check_http_health, config::enhanced::DatabaseConfig, create_api_info_router,
    create_cors_layer, create_database_pool, init_telemetry, rls_middleware, telemetry_middleware,
    test_database_connection, ApiResponse, AuthState, Config, DependencyHealth, HealthStatus,
    Result, ServiceHealth, SystemMetrics,
};
use utoipa::OpenApi;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-rs");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_rs_custom_metric",
        "This is a custom metric for TOPEMS-RS",
    )
    .unwrap();
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap();
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    let config = Config::load().await?;
    let db_config = DatabaseConfig {
        url: env::var("DATABASE_URL").unwrap_or_else(|_| {
            env::var("DATABASE_URL")
                .expect("DATABASE_URL environment variable is required")
                .to_string()
        }),
        max_connections: 10,
        min_connections: Some(2),
        connect_timeout: Some(30),
        idle_timeout: Some(60),
        max_lifetime: Some(1800),
        test_interval: Some(60),
        enable_connection_reuse: Some(true),
    };
    tracing::info!("Configuration loaded, environment: {}", config.env());
    tracing::info!("=== DB Config ===");
    tracing::info!("Database URL: {}", db_config.url);

    let pool = create_database_pool(&db_config).await?;
    test_database_connection(&pool).await?;

    let test_result = sqlx::query("SELECT current_database(), current_user")
        .fetch_one(&pool)
        .await;
    tracing::info!("Test query result: {:?}", test_result);

    let search_path = sqlx::query("SHOW search_path").fetch_one(&pool).await;
    tracing::info!("Search path: {:?}", search_path);

    let schemas =
        sqlx::query("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name")
            .fetch_all(&pool)
            .await;
    tracing::info!("All schemas: {:?}", schemas);

    let schema_name = std::env::var("SCHEMA_NAME").unwrap_or_else(|_| "rs".to_string());

    let tables = sqlx::query(&format!(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = '{}'",
        schema_name
    ))
    .fetch_all(&pool)
    .await;
    tracing::info!("{} tables: {:?}", schema_name.to_uppercase(), tables);

    let test_projects_direct = sqlx::query(&format!("SELECT * FROM {} LIMIT 1", schema_name))
        .fetch_one(&pool)
        .await;
    tracing::info!("Test direct projects query: {:?}", test_projects_direct);

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let start_time = Instant::now();
    let metrics = Arc::new(SystemMetrics::new());
    let auth_state = AuthState::from_env();

    let cors = create_cors_layer();

    let api_state = modules::ApiState {
        db: pool.clone(),
        auth_state: auth_state.clone(),
        config: config.clone(),
        metrics: metrics.clone(),
        start_time,
    };

    let public_routes: Router<modules::ApiState> = Router::new()
        .route("/health", get(health_check))
        .route("/api/rs/health/detailed", get(health_check_detailed))
        .route("/api/rs/metrics", get(get_metrics))
        .route("/api-docs/openapi.json", get(serve_openapi_json))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route(
            "/api/plugins/info",
            get(modules::rs_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::rs_plugin::plugin_health_check),
        );

    let protected_routes = modules::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            api_state.db.clone(),
            rls_middleware,
        ))
        .with_state(api_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-rs"))
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .layer(cors)
        .with_state(api_state.clone());

    let port = config.get_server().await.port;
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-RS 科研研发管理系统启动中...");
    tracing::info!("📦 Port: {}", port);
    tracing::info!("🔒 认证保护已启用");

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::rs_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check(
    axum::extract::State(state): axum::extract::State<modules::ApiState>,
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
    axum::extract::State(state): axum::extract::State<modules::ApiState>,
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

    let health = ServiceHealth::healthy_with_message("topems-rs", message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

#[derive(Serialize, Clone)]
struct RsServiceMetrics {
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
    axum::extract::State(state): axum::extract::State<modules::ApiState>,
) -> Json<ApiResponse<RsServiceMetrics>> {
    let metrics = RsServiceMetrics {
        service_name: "topems-rs".to_string(),
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
        std::env::var("IAM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
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
    axum::Json(modules::openapi::ApiDoc::openapi())
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

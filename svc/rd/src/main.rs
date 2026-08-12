#![allow(dead_code)] // serde/utoipa 序列化需要，运行期未直接引用

//! TOPEMS-RD 科研研发管理系统
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + stateful_public 外层嵌套
//!
//! 复杂度：⭐⭐⭐（复杂）
//! - 自定义 modules::ApiState（带 Config / SystemMetrics / start_time / auth_state）
//! - stateful_public：/health + /health/detailed（带 IAM HTTP / DB 双重健康检查
//! - 配置 Config::load() + rs_plugin 自动注册

use axum::{routing::get, Json, Router};
use prometheus::{default_registry, Gauge};
use serde::Serialize;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, check_iam_health, run, Application, ServiceConfig,
};
use topems_shared_core::config::Config;
use topems_shared_core::health::DependencyHealth;
use topems_shared_core::health::HealthStatus;
use topems_shared_core::health::ServiceHealth;
use topems_shared_core::response::ApiResponse;
use utoipa::OpenApi;

mod cache;
mod event_handlers;
mod middleware;
mod models;
pub mod modules;
mod repositories;
mod schema_defense;
mod services;
mod shared;

use modules::ApiState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();

    std::env::set_var("SEARCH_PATH", "rs, public");

    let config_app: Config = Config::load()
        .await
        .map_err(|e| anyhow::anyhow!(e.to_string()))?;
    tracing::info!("Configuration loaded, environment: {}", config_app.env());

    // ── ServiceConfig ──────────────────────────────────────────────
    let config = ServiceConfig {
        name: "topems-rd",
        port: 8053,
        port_env_var: Some("RD_PORT"),
        max_db_connections: 10,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/rd",
        // 兼容 V1 三层前缀：主路径 /api/rd + legacy /api/v1/rd + /api/core/rd/v1
        legacy_prefixes: &["/api/v1/rd", "/api/core/rd/v1"],
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🚀 TOPEMS-RD 科研研发管理系统启动...");

    // ── 自定义 Prometheus Gauge ─────────────────────────────────────
    let custom_gauge = Gauge::new(
        "topems_rd_custom_metric",
        "This is a custom metric for TOPEMS-RD",
    )
    .unwrap_or_else(|e| {
        tracing::error!("Failed to create Prometheus gauge: {}", e);
        panic!("Prometheus gauge creation failed - check for duplicate metric registrations")
    });
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap_or_else(|e| {
            tracing::error!("Failed to register Prometheus gauge: {}", e);
            panic!(
                "Prometheus gauge registration failed - check for duplicate metric registrations"
            )
        });
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    // ── 数据库初始化 ───────────────────────────────────────────────
    if let Err(e) = init_db(&ctx.db).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    // ── 事件订阅者（失败不阻塞启动） ────────────────────────────────
    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), ctx.event_publisher.clone()).await
    {
        tracing::warn!("⚠️ RD 事件订阅者启动失败: {}", e);
    }

    // ── 构建自定义 modules::ApiState ─────────────────────────────────────
    let api_state = ApiState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        config: config_app.clone(),
        metrics: ctx.metrics.clone(),
        start_time: ctx.start_time,
        event_publisher: ctx.event_publisher.clone(),
    };

    // ── public_routes（无状态：/api-docs + plugins） ───────────────
    // 注：标准 /health /metrics 被 stateful_public 覆盖（因为 rd 有自定义健康检查）
    let public_routes = Router::new()
        .route(
            "/api/plugins/info",
            get(modules::rs_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::rs_plugin::plugin_health_check),
        );

    // ── protected_routes（业务路由 + State<ApiState>） ────────────────────
    // auth / rls / rate_limit 中间件由 build_application 在 protected 层自动叠加
    let protected_routes = modules::create_routes().with_state(api_state.clone());

    // ── OpenAPI JSON ─────────────────────────────────────────────────
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::ApiDoc::openapi())
            .unwrap_or_else(|_| "{}".to_string()),
    );

    // ── 组装 Application（build_application 返回 Router<()>） ────────
    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // ── stateful_public（需要 ApiState 的自定义公共路由） ─────────────
    // 外层嵌套：health_check + health_check_detailed 使用自定义 DB/IAM 双重健康检查逻辑
    // + /metrics/json 自定义 JSON 指标端点（区别于标准 Prometheus /metrics）
    let stateful_public = Router::new()
        .route("/health", get(health_check))
        .route("/health/detailed", get(health_check_detailed))
        .route("/metrics/json", get(get_metrics))
        .with_state(api_state.clone());

    // ── 最终 Application 合并 ───────────────────────────────────────
    let final_app = Application {
        router: Router::new().merge(stateful_public).merge(app.router),
        port: app.port,
        name: app.name,
    };

    // ── 启动时自动注册到统一核心 ──────────────────────────────────────
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::rs_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(final_app).await?;
    Ok(())
}

// ── 自定义公共 handler（V1 保留，带 ApiState 依赖） ──────────────────────────

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

    let health = ServiceHealth::healthy_with_message("topems-rd", message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

#[derive(Serialize, Clone)]
struct RdServiceMetrics {
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
) -> Json<ApiResponse<RdServiceMetrics>> {
    let metrics = RdServiceMetrics {
        service_name: "topems-rd".to_string(),
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

async fn init_db(pool: &sqlx::PgPool) -> anyhow::Result<()> {
    if let Err(e) = schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[rd] Schema 防御检查失败: {:?}", e);
    }
    Ok(())
}

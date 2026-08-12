//! TOPEMS-PM 统一项目管理系统
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + run

use anyhow::Result;
use axum::routing::get;
use prometheus::{default_registry, Gauge};
use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};
use topems_shared_service_client::service_client::api::workflow_api::WorkflowApi;
use topems_shared_service_client::TypedServiceClient;
use utoipa::OpenApi;

mod event_handlers;
pub mod models;
pub mod modules;
pub mod schema_defense;
pub mod services;
pub mod shared;

use modules::pm_plugin;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    // 设置search_path环境变量（供lib使用）
    std::env::set_var("SEARCH_PATH", "pm, public, shared");

    // ── ServiceConfig ──────────────────────────────────────────────
    let config = ServiceConfig {
        name: "topems-pm",
        port: 8023,
        port_env_var: Some("PM_PORT"),
        max_db_connections: 10,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/pm",
        legacy_prefixes: &["/api/v1/pm"],
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🚀 TOPEMS-PM 统一项目管理系统启动...");

    // ── 自定义 Prometheus Gauge ───────────────────────────────────────
    let custom_gauge = Gauge::new(
        "topems_pm_custom_metric",
        "This is a custom metric for TOPEMS-PM",
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

    // ── 数据库初始化 ────────────────────────────────────────────────
    if let Err(e) = init_db(&ctx.db).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    // ── 事件订阅者（失败不阻塞启动） ──────────────────────────────────
    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), ctx.event_publisher.clone()).await
    {
        tracing::warn!("⚠️ PM 事件订阅者启动失败: {}", e);
    }

    // ── 工作流服务客户端 ──────────────────────────────────────────────
    let workflow_client =
        TypedServiceClient::<WorkflowApi>::from_env_default().expect("工作流服务客户端初始化失败");
    tracing::info!(
        "🔗 工作流服务客户端初始化成功: {}",
        std::env::var("WORKFLOW_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".into())
    );

    // ── public_routes（无状态：health + plugins） ────────────────────
    let health_state = create_health_state(&ctx, &config);
    let public_routes = create_standard_health_routes(health_state)
        .route("/api/plugins/info", get(pm_plugin::get_plugin_info))
        .route("/api/plugins/health", get(pm_plugin::plugin_health_check));

    // ── protected_routes（业务路由：create_routes 直接调用） ─────────
    // 注：auth / rls / rate_limit 三层中间件由 build_application 自动给 protected 层叠加，
    // 这里保持 modules::create_routes 的 Router 裸返回即可
    let protected_routes = modules::create_routes(
        ctx.db.clone(),
        ctx.event_publisher.clone(),
        workflow_client.clone(),
    );

    // ── OpenAPI JSON ─────────────────────────────────────────────────
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::ApiDoc::openapi())
            .unwrap_or_else(|_| "{}".to_string()),
    );

    // ── 组装 Application ───────────────────────────────────────────
    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // ── 启动时自动注册到统一核心 ──────────────────────────────────────
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        pm_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await?;
    Ok(())
}

async fn init_db(pool: &sqlx::PgPool) -> topems_shared_core::error::Result<()> {
    if let Err(e) = schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[pm] Schema 防御检查失败: {:?}", e);
    }
    Ok(())
}

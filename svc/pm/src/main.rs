//! TOPEMS-PM 统一项目管理系统
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + run

use anyhow::Result;
use axum::routing::get;
use prometheus::{default_registry, Gauge};
use topems_shared_auth::middleware::{require_module_access, require_module_write};
use topems_shared_bootstrap::{
    bootstrap_service_shared, build_application, create_health_state,
    create_standard_health_routes, run, ServiceConfig,
};
use topems_shared_db::scope::Db;
use topems_shared_service_client::service_client::api::workflow_api::WorkflowApi;
use topems_shared_service_client::TypedServiceClient;
use utoipa::OpenApi;

mod event_handlers;
pub mod models;
pub mod modules;
pub mod services;
pub mod shared;

use modules::pm_plugin;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

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
        legacy_prefixes: &[],
        init_telemetry: true,
    };

    let ctx = bootstrap_service_shared(&config).await?;
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

    // ── 事件订阅者（失败不阻塞启动） ──────────────────────────────────
    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), ctx.event_publisher.clone()).await
    {
        tracing::warn!("⚠️ PM 事件订阅者启动失败: {}", e);
    }

    // ── 工作流服务客户端 ──────────────────────────────────────────────
    // U10 降级治理：令牌签发/构建失败时不再 .expect panic，降级为同地址 tokenless 客户端并
    // 告警；下游 unified-core(workflow) 不可达仅影响项目立项审批流，主服务继续启动。
    let workflow_url =
        std::env::var("WORKFLOW_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".into());
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    let workflow_client = match TypedServiceClient::<WorkflowApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "pm-service", &["workflow:read"]))
    {
        Ok(client) => {
            tracing::info!(
                "🔗 工作流服务客户端初始化成功（service token）: {}",
                workflow_url
            );
            client
        }
        Err(e) => {
            tracing::warn!(error = %e, "工作流服务客户端带令牌初始化失败，降级为同地址tokenless客户端；审批流在恢复前将报错，主服务继续启动");
            TypedServiceClient::new(WorkflowApi, &workflow_url)
                .map_err(|e| anyhow::anyhow!("工作流降级客户端也无法构建（HTTP栈异常）: {e}"))?
        }
    };

    // ── public_routes（无状态：health + plugins） ────────────────────
    let health_state = create_health_state(&ctx, &config);
    let public_routes = create_standard_health_routes(health_state)
        .route("/api/plugins/info", get(pm_plugin::get_plugin_info))
        .route("/api/plugins/health", get(pm_plugin::plugin_health_check));

    // ── protected_routes（业务路由：create_routes 直接调用） ─────────
    // 注：auth / rls / rate_limit 三层中间件由 build_application 自动给 protected 层叠加，
    // 这里保持 modules::create_routes 的 Router 裸返回即可
    let db = Db::new(ctx.db.clone(), "pm, public, shared").deny_request_own_txn();
    let protected_routes = modules::create_routes(
        db,
        ctx.db.clone(),
        ctx.event_publisher.clone(),
        workflow_client.clone(),
    )
    .layer(axum::middleware::from_fn_with_state(
        ctx.db.clone(),
        topems_shared_auth::tenant_middleware(),
    ))
    // 模块门只负责「能进 pm + 读」；写仍要求 pm:admin（避免 pm:read 提权）。
    .layer(axum::middleware::from_fn(require_module_write("pm")))
    .layer(axum::middleware::from_fn(require_module_access("pm")));

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

    // D6：事件发布重试后台任务——周期扫描 Redis ZSET 到期项重发（typed 通道直重发；
    // pm 无 searchable 通道，rebuild 回调恒返回 None）。
    {
        let publisher = ctx.event_publisher.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(std::time::Duration::from_secs(15));
            loop {
                tick.tick().await;
                if let Some(p) = &publisher {
                    topems_shared_event::event::commit_retry::run_relay(
                        "pm",
                        p,
                        |_entity_type: &str, _entity_id: uuid::Uuid| async {
                            Option::<serde_json::Value>::None
                        },
                    )
                    .await;
                }
            }
        });
    }

    run(app).await?;
    Ok(())
}

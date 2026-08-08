//! TOPEMS EHS Service
//!
//! Environment Health Safety Service

#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(clippy::redundant_closure)]
#![allow(dead_code)]

mod event_handlers;
mod middleware;
mod models;
mod modules;
mod services;

mod shared;

use std::sync::Arc;

use axum::{extract::State, routing::get, Json, Router};
use utoipa::OpenApi;

use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};
use topems_shared_core::response::ApiResponse;
use topems_shared_service_client::service_client::create_workflow_client;

use shared::cache::InMemoryCache;
use shared::AppState;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "EHS", description = "环境健康安全"),
        (name = "Safety", description = "安全管理"),
        (name = "Inspection", description = "安全检查"),
        (name = "Hazard", description = "隐患管理"),
        (name = "Accident", description = "事故报告"),
        (name = "Emergency", description = "应急预案"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-ehs API",
        version = "1.0.0",
        description = "TOPEMS 环境健康安全服务 - 安全检查、隐患管理、事故报告、应急预案",
    ),
    servers(
        (url = "http://localhost:8052", description = "本地开发环境"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "ehs, public");

    let config = ServiceConfig {
        name: "topems-ehs",
        port: 8052,
        port_env_var: Some("EHS_PORT"),
        max_db_connections: 10,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/ehs",
        legacy_prefixes: &["/api/v1/ehs"],
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = models::init_database(&ctx.db).await {
        tracing::warn!("EHS database init warning: {}", e);
    }
    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), ctx.event_publisher.clone()).await
    {
        tracing::warn!("⚠️ EHS 事件订阅者启动失败: {}", e);
    }

    let workflow_url = std::env::var("WORKFLOW_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let workflow_client = create_workflow_client().expect("工作流服务客户端初始化失败");
    tracing::info!("🔗 工作流服务客户端初始化成功: {}", workflow_url);

    let hazard_cache = Arc::new(InMemoryCache::<serde_json::Value>::new(
        std::time::Duration::from_secs(300),
    ));
    let training_cache = Arc::new(InMemoryCache::<serde_json::Value>::new(
        std::time::Duration::from_secs(120),
    ));
    let dict_cache = Arc::new(InMemoryCache::<String>::new(
        std::time::Duration::from_secs(600),
    ));
    tracing::info!("💾 内存缓存初始化完成（隐患/培训/字典）");

    let api_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config: SimpleHealthConfig::new("topems-ehs").with_db(ctx.db.clone()),
        event_publisher: ctx.event_publisher.clone(),
        workflow_client,
        hazard_cache,
        training_cache,
        dict_cache,
    };

    // Public routes（stateful：/health + /api/plugins/*）
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route(
            "/api/plugins/info",
            get(modules::ehs_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::ehs_plugin::plugin_health_check),
        )
        .with_state(api_state.clone());

    // Protected routes（先 merge 业务路由，然后 tenant_middleware → build_application 再加 auth/rls/rate_limit）
    let protected_routes = Router::new()
        .merge(modules::create_api_routes())
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .with_state(api_state.clone());

    let openapi_json = serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_default();
    let mut app = build_application(
        &ctx,
        &config,
        public_routes,
        protected_routes,
        Some(openapi_json),
    );

    // stateful /api/health/detailed（build_application 内 public_routes 不传 state，补在最外层 merge）
    let stateful_detailed = Router::new()
        .route("/api/health/detailed", get(detailed_health))
        .with_state(api_state);
    app.router = Router::new().merge(stateful_detailed).merge(app.router);

    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::ehs_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await?;
    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS EHS Service API\n\n\
     Environment Health Safety\n\n\
     - /health - Health check"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "ehs-service",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "ehs": "active"
        },
        "dependencies": [
            {
                "name": "postgresql",
                "status": db_status
            }
        ],
        "version": "1.0.0"
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}

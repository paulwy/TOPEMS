use crate::shared::AppState;
use std::sync::Arc;

use axum::{extract::State, routing::get, Json, Router};
use utoipa::OpenApi;

use topems_shared::ApiResponse;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};

mod openapi;
mod schema_defense;
mod shared;

pub mod modules;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "master_data, public");

    let config = ServiceConfig {
        name: "topems-master-data",
        port: 8090,
        port_env_var: Some("MASTER_DATA_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/master-data",
        legacy_prefixes: &[],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    tracing::info!("🚀 TOPEMS Master Data Service starting...");

    // 初始化数据库表 + V69.3 Schema 防御
    if let Err(e) = modules::dict::init_database(&ctx.db).await {
        tracing::warn!("dict::init_database warning: {}", e);
    }
    if let Err(e) = schema_defense::run_schema_migration_and_verify(&ctx.db).await {
        tracing::error!("[master-data] Schema 防御检查失败: {:?}", e);
    }

    // 把 ServiceContext 转换为下游 modules 依赖的 legacy AppState（零改造）
    let app_state = AppState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: Arc::clone(&ctx.metrics),
        start_time: ctx.start_time,
    };

    // 无状态公共路由（/、/api、/api/info）—— 交给 build_application 的顶层 Router<()>
    let public_routes = Router::new().route("/", get(home));

    // 业务路由（modules）+ /health/detailed —— 需要 State<AppState>，先 with_state
    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .route("/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn(require_permission(
            "master-data:admin",
        )))
        .with_state(app_state.clone());

    let openapi_json = Some(
        serde_json::to_string(&openapi::MasterDataApiDoc::openapi())
            .unwrap_or_else(|_| "{}".to_string()),
    );

    let mut app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // 带 State<AppState> 的公共路由（/health, /metrics）—— 在 build_application 外层嵌套
    let stateful_public = Router::new()
        .route("/health", get(health))
        .route(
            "/metrics",
            get(move || async { prometheus_metrics_handler().await }),
        )
        .with_state(app_state);

    app.router = app.router.merge(stateful_public);

    tracing::info!(
        "✅ Master Data Service is running at http://0.0.0.0:{}",
        app.port
    );

    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::master_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await?;
    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS Master Data Service API\n\n\
     Master Data Management - Quality Closed Loop, Auto-Fix, Data Governance AI\n\n\
     - /health - Health check"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    let config = SimpleHealthConfig::new("topems-master-data").with_db(state.db.clone());
    simple_health_check(&config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    use topems_shared_bootstrap::build_detailed_health_response;
    let modules = serde_json::json!({
        "quality_v51": "active",
        "lineage_v52": "active",
        "knowledge_v53": "active",
        "versioning_v54": "active",
        "commercial_v55": "active",
        "disaster_v56": "active",
        "semantic_v57": "active",
        "governance_v58": "active",
        "ai_governance_v59": "active",
        "metadata_v60": "active"
    });
    let resp = build_detailed_health_response(
        &state.db,
        "topems-master-data",
        modules,
        "1.0.0",
        serde_json::json!({}),
    )
    .await;
    Json(ApiResponse::success(resp, "Detailed health check"))
}

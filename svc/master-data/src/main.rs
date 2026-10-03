use crate::shared::AppState;
use std::sync::Arc;

use axum::{extract::State, routing::get, Json, Router};
use utoipa::OpenApi;

use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};
use topems_shared_core::response::ApiResponse;

mod openapi;
mod schema_defense;
mod shared;

pub mod modules;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "public");

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
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;

    tracing::info!("🚀 TOPEMS Master Data Service starting...");

    // U4：注入持久化连接池（v51-v60 MDM 集合快照落库），幂等确保表存在。
    modules::persist::init(ctx.db.clone()).await;

    // 初始化数据库表 + V69.3 Schema 防御
    if let Err(e) = modules::dict::init_database(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await
    {
        tracing::warn!("dict::init_database warning: {}", e);
    }
    if let Err(e) = schema_defense::run_schema_migration_and_verify(
        ctx.migrate_pool.as_ref().unwrap_or(&ctx.db),
    )
    .await
    {
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
        .with_state(app_state.clone())
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ));

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
        .with_state(app_state)
        // stateful_public 在 build_application 返回后才 merge，不会被中央 metrics 层覆盖，
        // 故在此单独补一层（中间件内部仅拦截 /metrics*，其余路径直通）。
        .layer(topems_shared_bootstrap::metrics_auth_layer());

    app.router = app.router.merge(stateful_public);

    tracing::info!(
        "✅ Master Data Service is running at http://0.0.0.0:{}",
        app.port
    );

    // U4：后台近实时 flush——把 10 个 MDM 模块的内存集合快照回写库。
    // 仅在模块已 load/seed 后生效（各 background_flush 内部按 initialized 门控），
    // 避免启动空集合覆盖库内既有快照。
    tokio::spawn(async {
        let mut ticker = tokio::time::interval(std::time::Duration::from_secs(3));
        loop {
            ticker.tick().await;
            modules::quality_v51::background_flush().await;
            modules::lineage_v52::background_flush().await;
            modules::knowledge_v53::background_flush().await;
            modules::versioning_v54::background_flush().await;
            modules::commercial_v55::background_flush().await;
            modules::disaster_v56::background_flush().await;
            modules::semantic_v57::background_flush().await;
            modules::governance_v58::background_flush().await;
            modules::ai_governance_v59::background_flush().await;
            modules::metadata_v60::background_flush().await;
        }
    });

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

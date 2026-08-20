use std::sync::Arc;
use std::time::Instant;

use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};

use topems_shared::ApiResponse;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::health::{
    simple_health_check, ServiceHealth, SimpleHealthConfig, SystemMetrics,
};

mod schema_defense;
mod shared;

pub mod modules;

// 让 handlers 中 `use crate::{AppState, CoreResponse};` 在 binary crate 的根命名空间也能解析
// （注意 binary crate 与 library crate 的 crate:: 根是独立的，这里各自补一份）
pub use shared::{AppState, CoreResponse};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "public");

    let config = ServiceConfig {
        name: "topems-plugin-registry",
        port: 8096,
        port_env_var: Some("PLUGIN_REGISTRY_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api",
        legacy_prefixes: &[],
    };

    let ctx = bootstrap_service(&config).await?;

    tracing::info!(
        "🚀 TOPEMS Plugin Registry Service (拆分自 unified-core / V68.1 A2.2) starting..."
    );

    // 初始化数据库表 + Schema 防御（V69.3）
    if let Err(e) = modules::plugin::init_database(&ctx.db).await {
        tracing::error!("Failed to init plugin-registry database: {:?}", e);
    }

    let start_time = Instant::now();
    let app_state = AppState {
        pool: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: Arc::new(SystemMetrics::new()),
        start_time,
    };

    let public_routes = Router::new().route("/", get(home));

    // checker:ignore R2 — plugin-registry is tenant-agnostic metadata service, no tenant isolation required
    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .route("/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            shared::middleware::jwt_auth_middleware,
        ))
        .with_state(app_state.clone());

    // plugin-registry 暂未独立生成 OpenAPI 文档
    let openapi_json = None::<String>;

    let mut app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    let stateful_public = Router::new()
        .route("/health", get(health))
        .route("/api/plugin/health", get(health))
        .route(
            "/metrics",
            get(move || async { prometheus_metrics_handler().await }),
        )
        .route(
            "/dev/runtime/{code}/register",
            post(modules::plugin::handlers::runtime::register_plugin),
        )
        .with_state(app_state);

    app.router = app.router.merge(stateful_public);

    tracing::info!(
        "✅ Plugin Registry Service (V68.1 A2.2) is running at http://0.0.0.0:{}",
        app.port
    );

    run(app).await?;
    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS Plugin Registry Service\n\n\
     Marketplace · Tenant Plugins · Reviews · Runtime · Upgrade Workflow · Versioning\n\
     (拆分自 unified-core / V68.1 A2.2)\n\n\
     - /health   - Health check\n\
     - /metrics  - Prometheus metrics\n\
     - /health/detailed - Detailed service health"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    let config = SimpleHealthConfig::new("topems-plugin-registry").with_db(state.pool.clone());
    simple_health_check(&config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "topems-plugin-registry",
        "split_from": "unified-core",
        "v68_1_task": "A2.2",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "handlers/tenant_plugins": "active",
            "handlers/marketplace": "active",
            "handlers/runtime": "active",
            "handlers/simple_api": "active",
            "handlers/upgrade_workflow": "active",
            "handlers/automated_upgrade": "active",
            "handlers/versioning": "active",
            "handlers/reviews_stats": "active"
        },
        "dependencies": [
            { "name": "postgresql", "status": db_status }
        ],
        "version": env!("CARGO_PKG_VERSION")
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}

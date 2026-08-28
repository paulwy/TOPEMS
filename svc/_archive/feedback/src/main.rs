//! TOPEMS Feedback Service
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + run

use axum::{routing::get, Router};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};
use utoipa::OpenApi;

use crate::openapi::FeedbackApiDoc;

pub mod handlers;
pub mod models;
pub mod openapi;
pub mod schema_defense;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "public");

    let config = ServiceConfig {
        name: "topems-feedback",
        port: 8087,
        port_env_var: Some("FEEDBACK_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/feedback",
        legacy_prefixes: &["/api/v1/feedback"],
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🚀 TOPEMS Feedback Service starting...");

    handlers::init_feedback_tables(&ctx.db)
        .await
        .expect("Failed to init feedback database");

    // ── public_routes（无状态） ──
    let public_routes = Router::new()
        .route(
            "/",
            get(|| async { "TOPEMS Feedback Service API\n\n- /health - Health check\n" }),
        )
        .route("/health", get(health_handler));

    // ── protected_routes（业务路由：需要 State<PgPool>） ──────────────
    let protected_routes = handlers::feedback_routes()
        .layer(axum::middleware::from_fn(require_permission(
            "feedback:admin",
        )))
        .with_state(ctx.db.clone());

    // ── 组装 Application ─────────────────────────────────────────────
    let openapi_json = Some(
        serde_json::to_string_pretty(&FeedbackApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    tracing::info!(
        "✅ Feedback Service is running at http://0.0.0.0:{} (prefix: {})",
        app.port,
        config.api_prefix
    );

    run(app).await?;
    Ok(())
}

async fn health_handler() -> &'static str {
    "ok"
}

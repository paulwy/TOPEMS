//! TOPEMS Search Service
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + run

use axum::{routing::get, Router};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};

mod handlers;
mod models;
pub mod openapi;
mod scoring;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = ServiceConfig {
        name: "topems-search",
        port: 8082,
        port_env_var: Some("SEARCH_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/search",
        legacy_prefixes: &["/api/v1/search"],
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🚀 TOPEMS Search Service starting...");

    // ── public_routes（无状态） ──────────────────────────────────────
    let public_routes = Router::new()
        .route(
            "/",
            get(|| async {
                "TOPEMS Search Service API\n\nFull-text search service\n- /health - Health check\n"
            }),
        )
        .route("/health", get(handlers::health_handler));

    // ── protected_routes（业务路由：需要 State<PgPool>） ──────────────
    let protected_routes = Router::new()
        .route("/", get(handlers::search_handler))
        .route("/suggestions", get(handlers::suggestions_handler))
        .layer(axum::middleware::from_fn(require_permission(
            "search:admin",
        )))
        .with_state(ctx.db.clone())
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ));

    // ── 组装 Application ─────────────────────────────────────────────
    let app = build_application(&ctx, &config, public_routes, protected_routes, None);

    tracing::info!(
        "✅ Search Service is running at http://0.0.0.0:{} (prefix: {}, legacy: {:?})",
        app.port,
        config.api_prefix,
        config.legacy_prefixes
    );

    run(app).await?;
    Ok(())
}

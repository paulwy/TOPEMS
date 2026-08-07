//! TOPEMS Feedback Service
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + run

use axum::{routing::get, Router};
use topems_shared::get_api_info_handler;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};

mod handlers;

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

    // ── public_routes（无状态，/health 由 build_application 自动提供标准实现） ──
    let public_routes = Router::new().route(
        "/",
        get(|| async { "TOPEMS Feedback Service API\n\n- /health - Health check\n" }),
    );

    // ── protected_routes（业务路由：需要 State<PgPool>） ──────────────
    let protected_routes = handlers::feedback_routes().with_state(ctx.db.clone());

    // ── 组装 Application ─────────────────────────────────────────────
    let app = build_application(&ctx, &config, public_routes, protected_routes, None);

    tracing::info!(
        "✅ Feedback Service is running at http://0.0.0.0:{} (prefix: {})",
        app.port,
        config.api_prefix
    );

    run(app).await?;
    Ok(())
}

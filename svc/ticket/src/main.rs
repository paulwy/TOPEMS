//! TOPEMS Ticket Service
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + run

use axum::{routing::get, Router};
use topems_shared::get_api_info_handler;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};
use utoipa::OpenApi;

mod handlers;
mod models;
mod openapi;
mod sla_service;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "public");

    let config = ServiceConfig {
        name: "topems-ticket",
        port: 8086,
        port_env_var: Some("TICKET_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/ticket",
        legacy_prefixes: &["/api/v1/ticket"],
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🚀 TOPEMS Ticket Service starting...");

    // ── 模块级数据库初始化 ────────────────────────────────────────────
    handlers::init_ticket_tables(&ctx.db)
        .await
        .expect("Failed to init ticket database");
    handlers::init_sla_tables(&ctx.db)
        .await
        .expect("Failed to init SLA database");

    // ── public_routes（无状态） ──────────────────────────────────────
    let public_routes = Router::new()
        .route("/", get(|| async { "TOPEMS Ticket Service API\n\nTicket management + SLA\n- /health - Health check\n- /api-docs/openapi.json - OpenAPI spec\n" }))
        .route("/health", get(|| async { "OK" }))
        .route(
            "/api-docs/openapi.json",
            get(|| async move { axum::Json(openapi::TicketApiDoc::openapi()) }),
        );

    // ── protected_routes（业务路由：需要 State<PgPool>） ──────────────
    let protected_routes = handlers::ticket_routes().with_state(ctx.db.clone());

    // ── 组装 Application ─────────────────────────────────────────────
    let app = build_application(&ctx, &config, public_routes, protected_routes, None);

    tracing::info!(
        "✅ Ticket Service is running at http://0.0.0.0:{} (prefix: {}, legacy: {:?})",
        app.port,
        config.api_prefix,
        config.legacy_prefixes
    );

    run(app).await?;
    Ok(())
}

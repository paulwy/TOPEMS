//! TOPEMS Ticket Service
//!
//! V2 shared-bootstrap 模板：bootstrap_service_shared + build_application + run

use axum::{routing::get, Router};
use topems_shared_auth::middleware::{require_module_access, require_module_write};
use topems_shared_bootstrap::{bootstrap_service_shared, build_application, run, ServiceConfig};
use topems_shared_db::scope::Db;
use utoipa::OpenApi;

mod feedback_compat;
mod handlers;
mod models;
mod openapi;
pub mod sla_service;
mod ticket_ext;
mod util;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = ServiceConfig {
        name: "topems-ticket",
        port: 8086,
        port_env_var: Some("TICKET_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/ticket",
        legacy_prefixes: &[],
        init_telemetry: true,
    };

    let ctx = bootstrap_service_shared(&config).await?;
    // 连接治理 B：共享池之上固化本模块 search_path（显式传值，不依赖 .env）
    let db = Db::new(ctx.db.clone(), "ticket, public")
        .deny_request_own_txn()
        .deny_request_tenant_scope();
    tracing::info!("🚀 TOPEMS Ticket Service starting...");

    // ── 表/索引/触发器/RLS 全部由迁移链维护，启动阶段不再执行任何 DDL ──────────

    // ── public_routes（无状态） ──────────────────────────────────────
    let public_routes = Router::new()
        .route("/", get(|| async { "TOPEMS Ticket Service API\n\nTicket management + SLA\n- /health - Health check\n- /api-docs/openapi.json - OpenAPI spec\n" }))
        .route("/health", get(|| async { "OK" }))
        .route(
            "/api-docs/openapi.json",
            get(|| async move { axum::Json(openapi::TicketApiDoc::openapi()) }),
        );

    // ── protected_routes（业务路由：需要 State<Db>） ──────────────
    let protected_routes = handlers::ticket_routes()
        .merge(feedback_compat::feedback_compat_routes())
        .merge(ticket_ext::ticket_ext_routes())
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        // 模块门只负责「能进 ticket + 读」；写仍要求 ticket:admin（避免只读提权）。
        .layer(axum::middleware::from_fn(require_module_write("ticket")))
        .layer(axum::middleware::from_fn(require_module_access("ticket")))
        .with_state(db);

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

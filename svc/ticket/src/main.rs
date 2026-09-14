//! TOPEMS Ticket Service
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + run

use axum::{routing::get, Router};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};
use utoipa::OpenApi;

mod feedback_compat;
mod handlers;
mod models;
mod openapi;
mod schema_defense;
pub mod sla_service;
mod ticket_ext;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "ticket, public");

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
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🚀 TOPEMS Ticket Service starting...");

    // ── 模块级数据库初始化（DDL 走 owner 迁移连接池，受限业务用户无表 owner 权限）────
    let ddl_pool = ctx.migrate_pool.as_ref().unwrap_or(&ctx.db);
    handlers::init_ticket_tables(ddl_pool)
        .await
        .expect("Failed to init ticket database");
    handlers::init_sla_tables(ddl_pool)
        .await
        .expect("Failed to init SLA database");

    // ── Schema 防御：增量迁移 + 列一致性校验（7 张 ticket 表）──
    if let Err(e) = schema_defense::run_schema_migration_and_verify(ddl_pool).await {
        tracing::warn!("Ticket schema defense 失败（不阻塞启动）: {}", e);
    }

    // ── public_routes（无状态） ──────────────────────────────────────
    let public_routes = Router::new()
        .route("/", get(|| async { "TOPEMS Ticket Service API\n\nTicket management + SLA\n- /health - Health check\n- /api-docs/openapi.json - OpenAPI spec\n" }))
        .route("/health", get(|| async { "OK" }))
        .route(
            "/api-docs/openapi.json",
            get(|| async move { axum::Json(openapi::TicketApiDoc::openapi()) }),
        );

    // ── protected_routes（业务路由：需要 State<PgPool>） ──────────────
    let protected_routes = handlers::ticket_routes()
        .merge(feedback_compat::feedback_compat_routes())
        .merge(ticket_ext::ticket_ext_routes())
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn(require_permission(
            "ticket:admin",
        )))
        .with_state(ctx.db.clone());

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

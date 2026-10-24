//! TOPEMS Search Service
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + run

use axum::{routing::get, Router};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};

mod handlers;
mod models;
pub mod openapi;
mod projection;
mod scoring;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = ServiceConfig {
        name: "topems-search",
        port: 8082,
        port_env_var: Some("SEARCH_PORT"),
        max_db_connections: 10,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/search",
        legacy_prefixes: &["/api/v1/search"],
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🚀 TOPEMS Search Service starting...");

    // B1/F-37 终态：自举实体投影表 + 启动事件订阅者（erp 发事件 → search 本地投影）。
    // 失败不阻塞启动——投影未就绪时客户/订单搜索为空结果，待事件追平。
    if let Err(e) = projection::init_projection_table(&ctx.db).await {
        tracing::warn!("⚠️ search 投影表自举失败: {}", e);
    }
    if let Err(e) = projection::start_projection_subscriber(ctx.db.clone()).await {
        tracing::warn!("⚠️ search 投影订阅者启动失败: {}", e);
    }
    // B1 启动时差距对账：从 erp 快照拉全量补投影（best-effort，erp 不可达不阻塞）
    projection::backfill_projections(&ctx.db).await;

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
        // P3：standalone 与 embedded（search_real_module）对齐挂载 /recent
        .route(
            "/recent",
            get(handlers::list_recent).delete(handlers::clear_recent),
        )
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

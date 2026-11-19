//! TOPEMS Search Service
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + run

use axum::{routing::get, Router};
use topems_shared_auth::middleware::{require_module_access, require_module_write};
use topems_shared_bootstrap::{
    bootstrap_service_with_search_path, build_application, run, ServiceConfig,
};
use topems_shared_db::scope::Db;

mod handlers;
mod mcp;
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
        legacy_prefixes: &[],
        init_telemetry: true,
    };

    let ctx = bootstrap_service_with_search_path(&config, "public").await?;
    tracing::info!("🚀 TOPEMS Search Service starting...");

    // 连接治理 B 试点：模块只拿到 Db（PgPool 私有），所有查询走事务级 search_path。
    // M-1: 请求事务唯一化后，Db 上不再允许自建请求事务（兜底守卫）。
    let db = Db::new(ctx.db.clone(), "public").deny_request_own_txn();

    // B1/F-37 终态：自举实体投影表 + 启动事件订阅者（erp 发事件 → search 本地投影）。
    // 失败不阻塞启动——投影未就绪时客户/订单搜索为空结果，待事件追平。
    if let Err(e) = projection::init_projection_table(&db).await {
        tracing::warn!("⚠️ search 投影表自举失败: {}", e);
    }
    if let Err(e) = projection::start_projection_subscriber(db.clone()).await {
        tracing::warn!("⚠️ search 投影订阅者启动失败: {}", e);
    }
    // B1 启动时差距对账：从 erp 快照拉全量补投影（best-effort，erp 不可达不阻塞）
    projection::backfill_projections(&db).await;

    // ── public_routes（无状态） ──────────────────────────────────────
    let public_routes = Router::new()
        .route(
            "/",
            get(|| async {
                "TOPEMS Search Service API\n\nFull-text search service\n- /health - Health check\n"
            }),
        )
        .route("/health", get(handlers::health_handler));

    // ── protected_routes（业务路由：模块 State 为 Db，无直接 PgPool） ──
    // 注意：根检索端点不在此处 nest 挂载——nest 剥离前缀后路径为 "/"，命中
    // is_public_path 的 "/" 公开豁免，tenant_middleware 跳过注入请求级 RLS 事务，
    // search_handler 提取 Extension<RlsTxnCell> 失败 500（既有 bug，试点验证发现）。
    // 根端点改为 build_application 之后以全路径 merge（见下），与嵌入形态
    // search_real_module 的挂载方式一致。
    let protected_routes = Router::new()
        .route("/suggestions", get(handlers::suggestions_handler))
        // P3：standalone 与 embedded（search_real_module）对齐挂载 /recent
        .route(
            "/recent",
            get(handlers::list_recent).delete(handlers::clear_recent),
        )
        // 模块门只负责「能进 search + 读」；DELETE /recent 等写动作仍要求 search:admin。
        .layer(axum::middleware::from_fn(require_module_write("search")))
        .layer(axum::middleware::from_fn(require_module_access("search")))
        .with_state(db.clone())
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ));

    // ── 组装 Application ─────────────────────────────────────────────
    let app = build_application(&ctx, &config, public_routes, protected_routes, None);

    // 根检索端点（全路径挂载，不经 nest）：兼容无尾斜杠 /api/search 与带尾斜杠
    // /api/search/ 两种形态（axum 0.8 route 严格匹配）。层顺序自外向内：
    // auth（注入 Claims）→ tenant（开启请求级 RLS 事务并注入 RlsTxnCell）→
    // require_permission → handler。该路由同 MCP 一样不受 build_application 内层
    // rate_limit/metrics 层覆盖（试点单端点，与嵌入形态行为对齐）。
    let root_search_routes = Router::new()
        .route("/api/search", get(handlers::search_handler))
        .route("/api/search/", get(handlers::search_handler))
        // 模块门只负责「能进 search + 读」；DELETE /recent 等写动作仍要求 search:admin。
        .layer(axum::middleware::from_fn(require_module_write("search")))
        .layer(axum::middleware::from_fn(require_module_access("search")))
        .with_state(db.clone())
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            ctx.auth_state.clone(),
            topems_shared_auth::auth::auth_middleware,
        ));
    let mut app = app;
    app.router = app.router.merge(root_search_routes);

    // Phase 3 B 档第 1 步：MCP 端点（POST /mcp，Streamable HTTP）。
    // build_application 返回后 merge 有状态路由：MCP 走 server token 认证（MCP_SERVER_TOKEN），
    // 不套业务 JWT/tenant 中间件；注意此路由不受 build_application 内层 rate_limit/metrics 层覆盖
    // （端点是内网 server-token 面，第 1 步不叠加额外限流）。
    app.router = app.router.merge(mcp::mcp_routes().with_state(db.clone()));

    tracing::info!(
        "✅ Search Service is running (port: {}, prefix: {}, legacy: {:?}, mcp: /mcp)",
        app.port,
        config.api_prefix,
        config.legacy_prefixes
    );

    run(app).await?;
    Ok(())
}

//! TOPEMS Lowcode 低代码平台（占位模板）
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + run
//!
//! 状态：后端尚未立项，仅保留启动骨架以便与前端端口/路由/服务发现对齐。
//! 端口：8088（LOWCODE_PORT）
//! 路径前缀：/api/lowcode/*
//! 所有 handler 当前返回 501 Not Implemented。

use axum::Router;
use topems_lowcode::openapi::public_routes;
use topems_lowcode::ApiDoc;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};
use utoipa::OpenApi;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = ServiceConfig {
        name: "topems-lowcode",
        port: 8088,
        port_env_var: Some("LOWCODE_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: false,
        enable_request_context: true,
        api_prefix: "/api/lowcode",
        legacy_prefixes: &["/api/v1/lowcode"],
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🧩 TOPEMS Lowcode Service starting (reserved, V2 shared-bootstrap)...");

    // ── lowcode 为占位服务：所有业务路由无 auth/rls，全入 public_routes ──
    let public_routes = public_routes();

    // ── protected_routes（空：当前尚未立项） ─────────────────────────
    let protected_routes = Router::new();

    // ── OpenAPI JSON ─────────────────────────────────────────────────
    let openapi_json =
        Some(serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|_| "{}".to_string()));

    // ── 组装 Application ─────────────────────────────────────────────
    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    tracing::info!(
        "🧩 Lowcode reserved skeleton (V2) listening on port {}",
        app.port
    );

    run(app).await?;
    Ok(())
}

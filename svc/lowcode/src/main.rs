//! TOPEMS Lowcode 低代码平台（占位模板）
//!
//! V2 shared-bootstrap 模板：bootstrap_service + build_application + run
//!
//! 状态：后端尚未立项，仅保留启动骨架以便与前端端口/路由/服务发现对齐。
//! 端口：8088（LOWCODE_PORT）
//! 路径前缀：/api/lowcode/*
//! 所有 handler 当前返回 501 Not Implemented。

use axum::{http::StatusCode, response::IntoResponse, routing::get, Json, Router};
use topems_shared::get_api_info_handler;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "TOPEMS Lowcode API",
        version = "0.1.0",
        description = "低代码平台 API（占位，待立项实现）"
    ),
    paths(health, list_apps, get_designer_schema)
)]
struct ApiDoc;

/// 501 Not Implemented 通用占位响应
fn not_implemented(feature: &str) -> impl IntoResponse {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(serde_json::json!({
            "code": 501,
            "message": format!("{feature} not implemented — lowcode backend is planned"),
            "status": "reserved"
        })),
    )
}

#[utoipa::path(
    get,
    path = "/health",
    responses((status = 200, description = "服务健康"))
)]
async fn health() -> &'static str {
    "OK"
}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps",
    responses((status = 501, description = "低代码后端待立项"))
)]
async fn list_apps() -> impl IntoResponse {
    not_implemented("List apps")
}

#[utoipa::path(
    get,
    path = "/api/lowcode/designer/schema",
    responses((status = 501, description = "低代码后端待立项"))
)]
async fn get_designer_schema() -> impl IntoResponse {
    not_implemented("Designer schema")
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = ServiceConfig {
        name: "topems-lowcode",
        port: 8088,
        port_env_var: Some("LOWCODE_PORT"),
        max_db_connections: 3,
        enable_events: false,
        enable_rls: false,
        enable_request_context: true,
        api_prefix: "/api/lowcode",
        legacy_prefixes: &["/api/v1/lowcode"],
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🧩 TOPEMS Lowcode Service starting (reserved, V2 shared-bootstrap)...");

    // ── public_routes（无状态） ──────────────────────────────────────
    let app_routes = Router::new()
        .route("/apps", get(list_apps))
        .route("/designer/schema", get(get_designer_schema));

    // lowcode 为占位服务：业务路由无需 auth/rls，放入 public_routes
    let public_routes = Router::new()
        .merge(app_routes)
        .route(
            "/",
            get(|| async {
                "TOPEMS Lowcode Service (reserved) — V2 shared-bootstrap template\n"
            }),
        )
        .route("/health", get(health));

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

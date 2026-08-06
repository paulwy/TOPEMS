//! TOPEMS Lowcode 低代码平台（占位模板）
//!
//! 状态：后端尚未立项，仅保留启动骨架以便与前端端口/路由/服务发现对齐。
//! 端口：8088（LOWCODE_PORT）
//! 路径前缀：/api/lowcode/*
//! 所有 handler 当前返回 501 Not Implemented。

use axum::{http::StatusCode, response::IntoResponse, routing::get, Json, Router};
use std::net::SocketAddr;
use topems_shared::{create_cors_layer, init_telemetry};
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

/// 健康检查
#[utoipa::path(
    get,
    path = "/health",
    responses((status = 200, description = "服务健康"))
)]
async fn health() -> &'static str {
    "OK"
}

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
async fn main() {
    let _telemetry_guard = init_telemetry("topems-lowcode");

    tracing::info!("🧩 TOPEMS Lowcode Service starting (reserved, port 8088)...");

    let cors = create_cors_layer();

    let app_routes = Router::new()
        .route("/apps", get(list_apps))
        .route("/designer/schema", get(get_designer_schema));

    // 注册主路径 + legacy /api/v1 兼容别名
    let core_routes = topems_shared::register_routes_with_legacy_alias(
        Router::new(),
        "/api/lowcode",
        &["/api/v1/lowcode"],
        app_routes,
    );

    let app = Router::new()
        .merge(core_routes)
        .route("/health", get(health))
        .route("/openapi.json", get(|| async { Json(ApiDoc::openapi()) }))
        .layer(cors);

    let port: u16 = std::env::var("LOWCODE_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8088);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    tracing::info!("🧩 Lowcode reserved skeleton listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

use axum::{http::StatusCode, response::IntoResponse, routing::get, Json, Router};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "TOPEMS Lowcode API",
        version = "0.1.0",
        description = "低代码平台 API（占位，待立项实现）"
    ),
    paths(health, list_apps, create_app, get_designer_schema,),
    tags()
)]
pub struct ApiDoc;

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
    security(("BearerAuth" = ["lowcode:read"])),
    path = "/health",
    responses((status = 200, description = "服务健康"))
)]
pub async fn health() -> &'static str {
    "OK"
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lowcode:read"])),
    path = "/api/lowcode/apps",
    responses((status = 501, description = "低代码后端待立项"))
)]
pub async fn list_apps() -> impl IntoResponse {
    not_implemented("List apps")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lowcode:write"])),
    path = "/api/lowcode/apps",
    responses((status = 501, description = "低代码后端待立项"))
)]
pub async fn create_app() -> impl IntoResponse {
    not_implemented("Create app")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lowcode:read"])),
    path = "/api/lowcode/designer/schema",
    responses((status = 501, description = "低代码后端待立项"))
)]
pub async fn get_designer_schema() -> impl IntoResponse {
    not_implemented("Designer schema")
}

pub fn public_routes() -> Router {
    Router::new()
        .route("/apps", get(list_apps).post(create_app))
        .route("/designer/schema", get(get_designer_schema))
        .route(
            "/",
            get(|| async {
                "TOPEMS Lowcode Service (reserved) — V2 shared-bootstrap template\n"
            }),
        )
        .route("/health", get(health))
}

use axum::{
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "TOPEMS Lowcode API",
        version = "0.1.0",
        description = "低代码平台 API（占位，待立项实现）"
    ),
    paths(
        health,
        list_apps,
        create_app,
        get_designer_schema,
        // ===== Lowcode compatibility paths =====
        crate::lowcode_compat::compat_get_api_lowcode_apps_id,
        crate::lowcode_compat::compat_put_api_lowcode_apps_id,
        crate::lowcode_compat::compat_delete_api_lowcode_apps_id,
        crate::lowcode_compat::compat_post_api_lowcode_apps_id_publish,
        crate::lowcode_compat::compat_post_api_lowcode_apps_id_unpublish,
        crate::lowcode_compat::compat_post_api_lowcode_apps_id_duplicate,
        crate::lowcode_compat::compat_get_api_lowcode_apps_id_export,
        crate::lowcode_compat::compat_post_api_lowcode_apps_import,
        crate::lowcode_compat::compat_get_api_lowcode_data_models,
        crate::lowcode_compat::compat_get_api_lowcode_data_models_id,
        crate::lowcode_compat::compat_post_api_lowcode_data_models,
        crate::lowcode_compat::compat_put_api_lowcode_data_models_id,
        crate::lowcode_compat::compat_delete_api_lowcode_data_models_id,
        crate::lowcode_compat::compat_post_api_lowcode_data_models_id_materialize,
        crate::lowcode_compat::compat_get_api_lowcode_apps_appid_data_models,
        crate::lowcode_compat::compat_get_api_lowcode_data_sources,
        crate::lowcode_compat::compat_get_api_lowcode_data_sources_id,
        crate::lowcode_compat::compat_post_api_lowcode_data_sources,
        crate::lowcode_compat::compat_put_api_lowcode_data_sources_id,
        crate::lowcode_compat::compat_delete_api_lowcode_data_sources_id,
        crate::lowcode_compat::compat_get_api_lowcode_forms,
        crate::lowcode_compat::compat_get_api_lowcode_forms_id,
        crate::lowcode_compat::compat_post_api_lowcode_forms,
        crate::lowcode_compat::compat_put_api_lowcode_forms_id,
        crate::lowcode_compat::compat_delete_api_lowcode_forms_id,
        crate::lowcode_compat::compat_post_api_lowcode_forms_id_publish,
        crate::lowcode_compat::compat_get_api_lowcode_forms_id_preview,
        crate::lowcode_compat::compat_get_api_lowcode_apps_appid_forms,
        crate::lowcode_compat::compat_get_api_lowcode_dashboard_stats,
        crate::lowcode_compat::compat_get_api_lowcode_pages,
        crate::lowcode_compat::compat_get_api_lowcode_pages_id,
        crate::lowcode_compat::compat_post_api_lowcode_pages,
        crate::lowcode_compat::compat_put_api_lowcode_pages_id,
        crate::lowcode_compat::compat_delete_api_lowcode_pages_id,
        crate::lowcode_compat::compat_post_api_lowcode_pages_id_publish,
        crate::lowcode_compat::compat_get_api_lowcode_pages_id_preview,
        crate::lowcode_compat::compat_post_api_lowcode_pages_id_set_home,
        crate::lowcode_compat::compat_get_api_lowcode_apps_appid_pages,
        crate::lowcode_compat::compat_post_api_lowcode_pages_pageid_on_form_submit,
        crate::lowcode_compat::compat_get_api_lowcode_workflows,
        crate::lowcode_compat::compat_get_api_lowcode_workflows_id,
        crate::lowcode_compat::compat_post_api_lowcode_workflows,
        crate::lowcode_compat::compat_put_api_lowcode_workflows_id,
        crate::lowcode_compat::compat_delete_api_lowcode_workflows_id,
        crate::lowcode_compat::compat_post_api_lowcode_workflows_id_enable,
        crate::lowcode_compat::compat_post_api_lowcode_workflows_id_disable,
        crate::lowcode_compat::compat_get_api_lowcode_apps_appid_workflows,
    ),
    tags(
        (name = "Lowcode-Compat", description = "Lowcode 前端兼容 OpenAPI 注解"),
    )
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
    path = "/health",
    responses((status = 200, description = "服务健康"))
)]
pub async fn health() -> &'static str {
    "OK"
}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps",
    responses((status = 501, description = "低代码后端待立项"))
)]
pub async fn list_apps() -> impl IntoResponse {
    not_implemented("List apps")
}

#[utoipa::path(
    post,
    path = "/api/lowcode/apps",
    responses((status = 501, description = "低代码后端待立项"))
)]
pub async fn create_app() -> impl IntoResponse {
    not_implemented("Create app")
}

#[utoipa::path(
    get,
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

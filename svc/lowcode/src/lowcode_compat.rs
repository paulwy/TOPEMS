#![allow(dead_code, clippy::empty_loop)]

//! Lowcode compatibility OpenAPI paths.
//!
//! These functions are OpenAPI-only contract entries for frontend
//! `/api/lowcode/*` calls that are not represented by concrete utoipa
//! handlers yet. They do not alter runtime routing behavior.

// ===== Apps =====

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_id() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/apps/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_apps_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/apps/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_apps_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/apps/{id}/publish",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_apps_id_publish() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/apps/{id}/unpublish",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_apps_id_unpublish() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/apps/{id}/duplicate",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_apps_id_duplicate() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{id}/export",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_id_export() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/apps/import",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_apps_import() {}

// ===== Data Models =====

#[utoipa::path(
    get,
    path = "/api/lowcode/data-models",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_data_models() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/data-models/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_data_models_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/data-models",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_data_models() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/data-models/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_data_models_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/data-models/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_data_models_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/data-models/{id}/materialize",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_data_models_id_materialize() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{appId}/data-models",
    tag = "Lowcode-Compat",
    params(("appId" = String, Path, description = "appId")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_appid_data_models() {}

// ===== Data Sources =====

#[utoipa::path(
    get,
    path = "/api/lowcode/data-sources",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_data_sources() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/data-sources/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_data_sources_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/data-sources",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_data_sources() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/data-sources/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_data_sources_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/data-sources/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_data_sources_id() {}

// ===== Forms =====

#[utoipa::path(
    get,
    path = "/api/lowcode/forms",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_forms() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/forms/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_forms_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/forms",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_forms() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/forms/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_forms_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/forms/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_forms_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/forms/{id}/publish",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_forms_id_publish() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/forms/{id}/preview",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_forms_id_preview() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{appId}/forms",
    tag = "Lowcode-Compat",
    params(("appId" = String, Path, description = "appId")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_appid_forms() {}

// ===== Dashboard =====

#[utoipa::path(
    get,
    path = "/api/lowcode/dashboard/stats",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_dashboard_stats() {}

// ===== Pages =====

#[utoipa::path(
    get,
    path = "/api/lowcode/pages",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_pages() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/pages/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_pages_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/pages",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_pages() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/pages/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_pages_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/pages/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_pages_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/pages/{id}/publish",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_pages_id_publish() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/pages/{id}/preview",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_pages_id_preview() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/pages/{id}/set-home",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_pages_id_set_home() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{appId}/pages",
    tag = "Lowcode-Compat",
    params(("appId" = String, Path, description = "appId")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_appid_pages() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/pages/{pageId}/on-form-submit",
    tag = "Lowcode-Compat",
    params(("pageId" = String, Path, description = "pageId")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_pages_pageid_on_form_submit() {}

// ===== Workflows =====

#[utoipa::path(
    get,
    path = "/api/lowcode/workflows",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_workflows() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/workflows/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_workflows_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/workflows",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_workflows() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/workflows/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_workflows_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/workflows/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_workflows_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/workflows/{id}/enable",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_workflows_id_enable() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/workflows/{id}/disable",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_workflows_id_disable() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{appId}/workflows",
    tag = "Lowcode-Compat",
    params(("appId" = String, Path, description = "appId")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_appid_workflows() {}

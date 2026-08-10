#![allow(dead_code, clippy::empty_loop)]

//! RD compatibility OpenAPI paths.
//!
//! These functions are OpenAPI-only contract entries for frontend
//! `/api/rd/*` calls that are not represented by concrete utoipa
//! handlers yet. They do not alter runtime routing behavior.

#[utoipa::path(
    get,
    path = "/api/rd/bugs/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_bugs_id() {}

#[utoipa::path(
    post,
    path = "/api/rd/bugs",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_bugs() {}

#[utoipa::path(
    put,
    path = "/api/rd/bugs/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_put_api_rd_bugs_id() {}

#[utoipa::path(
    delete,
    path = "/api/rd/bugs/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_delete_api_rd_bugs_id() {}

#[utoipa::path(
    get,
    path = "/api/rd/builds/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_builds_id() {}

#[utoipa::path(
    post,
    path = "/api/rd/builds",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_builds() {}

#[utoipa::path(
    get,
    path = "/api/rd/deploys/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_deploys_id() {}

#[utoipa::path(
    post,
    path = "/api/rd/deploys",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_deploys() {}

#[utoipa::path(
    get,
    path = "/api/rd/experiments/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_experiments_id() {}

#[utoipa::path(
    post,
    path = "/api/rd/experiments",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_experiments() {}

#[utoipa::path(
    put,
    path = "/api/rd/experiments/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_put_api_rd_experiments_id() {}

#[utoipa::path(
    delete,
    path = "/api/rd/experiments/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_delete_api_rd_experiments_id() {}

#[utoipa::path(
    get,
    path = "/api/rd/experiments/project/{projectId}",
    tag = "RD-Compat",
    params(("projectId" = String, Path, description = "projectId")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_experiments_project_projectid() {}

#[utoipa::path(
    post,
    path = "/api/rd/experiments/{id}/advance-phase",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_experiments_id_advance_phase() {}

#[utoipa::path(
    get,
    path = "/api/rd/batch-trace/{batchNumber}",
    tag = "RD-Compat",
    params(("batchNumber" = String, Path, description = "batchNumber")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_batch_trace_batchnumber() {}

#[utoipa::path(
    get,
    path = "/api/rd/experiments/{experimentId}/records",
    tag = "RD-Compat",
    params(("experimentId" = String, Path, description = "experimentId")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_experiments_experimentid_records() {}

#[utoipa::path(
    post,
    path = "/api/rd/experiments/{experimentId}/records",
    tag = "RD-Compat",
    params(("experimentId" = String, Path, description = "experimentId")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_experiments_experimentid_records() {}

#[utoipa::path(
    get,
    path = "/api/rd/formulas/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_formulas_id() {}

#[utoipa::path(
    post,
    path = "/api/rd/formulas",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_formulas() {}

#[utoipa::path(
    put,
    path = "/api/rd/formulas/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_put_api_rd_formulas_id() {}

#[utoipa::path(
    delete,
    path = "/api/rd/formulas/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_delete_api_rd_formulas_id() {}

#[utoipa::path(
    get,
    path = "/api/rd/formulas/{formulaId}/versions",
    tag = "RD-Compat",
    params(("formulaId" = String, Path, description = "formulaId")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_formulas_formulaid_versions() {}

#[utoipa::path(
    post,
    path = "/api/rd/formulas/{formulaId}/versions",
    tag = "RD-Compat",
    params(("formulaId" = String, Path, description = "formulaId")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_formulas_formulaid_versions() {}

#[utoipa::path(
    post,
    path = "/api/rd/formulas/{id}/approve",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_formulas_id_approve() {}

#[utoipa::path(
    get,
    path = "/api/rd/health",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_health() {}

#[utoipa::path(
    get,
    path = "/api/rd/materials/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_materials_id() {}

#[utoipa::path(
    post,
    path = "/api/rd/materials",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_materials() {}

#[utoipa::path(
    put,
    path = "/api/rd/materials/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_put_api_rd_materials_id() {}

#[utoipa::path(
    delete,
    path = "/api/rd/materials/{id}",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_delete_api_rd_materials_id() {}

#[utoipa::path(
    delete,
    path = "/api/rd/materials/batch",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_delete_api_rd_materials_batch() {}

#[utoipa::path(
    post,
    path = "/api/rd/materials/import",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_materials_import() {}

#[utoipa::path(
    post,
    path = "/api/rd/projects/batch",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_projects_batch() {}

#[utoipa::path(
    delete,
    path = "/api/rd/projects/batch",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_delete_api_rd_projects_batch() {}

#[utoipa::path(
    post,
    path = "/api/rd/projects/import",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_post_api_rd_projects_import() {}

#[utoipa::path(
    get,
    path = "/api/rd/projects/{id}/dashboard",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_projects_id_dashboard() {}

#[utoipa::path(
    get,
    path = "/api/rd/projects/{id}/gantt",
    tag = "RD-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_projects_id_gantt() {}

#[utoipa::path(
    get,
    path = "/api/rd/statistics",
    tag = "RD-Compat",
    responses((status = 200, description = "RD compatibility endpoint"))
)]
pub async fn compat_get_api_rd_statistics() {}

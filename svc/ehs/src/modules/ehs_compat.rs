//! EHS compatibility OpenAPI paths.
//!
//! OpenAPI-only contract entries for frontend `/api/ehs/*` calls
//! not represented by concrete utoipa handlers yet.

#![allow(dead_code)]
#[utoipa::path(
    delete,
    path = "/api/ehs/checks/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_checks_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/checks/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_checks_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/checks/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_checks_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/drills/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_drills_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/drills/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_drills_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/drills/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_drills_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/environment/monitors/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_environment_monitors_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/environment/monitors/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_environment_monitors_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/environment/monitors/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_environment_monitors_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/environment/records/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_environment_records_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/environmental-compliance/assessments/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_environmental_compliance_assessments_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/environmental-compliance/assessments/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_environmental_compliance_assessments_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/environmental-compliance/assessments/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_environmental_compliance_assessments_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/environmental-compliance/events/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_environmental_compliance_events_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/environmental-compliance/events/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_environmental_compliance_events_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/environmental-compliance/events/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_environmental_compliance_events_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/hazardous-materials/categories/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_hazardous_materials_categories_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/hazardous-materials/categories/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_hazardous_materials_categories_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/hazardous-materials/inventory/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_hazardous_materials_inventory_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/hazardous-materials/inventory/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_hazardous_materials_inventory_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/hazardous-materials/inventory/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_hazardous_materials_inventory_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/hazardous-materials/movements/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_hazardous_materials_movements_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/hazardous-materials/movements/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_hazardous_materials_movements_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/hazardous-materials/movements/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_hazardous_materials_movements_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/hazardous-materials/msds/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_hazardous_materials_msds_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/hazardous-materials/msds/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_hazardous_materials_msds_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/hazardous-materials/msds/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_hazardous_materials_msds_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/hazards/{hazardId}/assessments/{assessmentId}",
    tag = "EHS-Compat",
    params(("hazardId" = String, Path, description = "id"), ("assessmentId" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_hazards_hazardid_assessments_assessmentid() {}

#[utoipa::path(
    post,
    path = "/api/ehs/incidents/{incidentId}/actions",
    tag = "EHS-Compat",
    params(("incidentId" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_incidents_incidentid_actions() {}

#[utoipa::path(
    put,
    path = "/api/ehs/incidents/{incidentId}/actions/{actionId}",
    tag = "EHS-Compat",
    params(("incidentId" = String, Path, description = "id"), ("actionId" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_incidents_incidentid_actions_actionid() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/occupational-diseases/cases/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_occupational_diseases_cases_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-diseases/cases/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_occupational_diseases_cases_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/occupational-diseases/cases/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_occupational_diseases_cases_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/occupational-diseases/detection-records/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_occupational_diseases_detection_records_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-diseases/detection-records/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_occupational_diseases_detection_records_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/occupational-diseases/detection-records/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_occupational_diseases_detection_records_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/occupational-diseases/factors/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_occupational_diseases_factors_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-diseases/factors/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_occupational_diseases_factors_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/occupational-diseases/factors/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_occupational_diseases_factors_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/occupational-diseases/protection-measures/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_occupational_diseases_protection_measures_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-diseases/protection-measures/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_occupational_diseases_protection_measures_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/occupational-diseases/protection-measures/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_occupational_diseases_protection_measures_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/occupational-health/check-plans/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_occupational_health_check_plans_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-health/check-plans/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_occupational_health_check_plans_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/occupational-health/check-plans/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_occupational_health_check_plans_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/occupational-health/check-records/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_occupational_health_check_records_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-health/check-records/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_occupational_health_check_records_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/occupational-health/check-records/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_occupational_health_check_records_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/occupational-health/records/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_occupational_health_records_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/occupational-health/records/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_occupational_health_records_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/occupational-health/records/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_occupational_health_records_id() {}

#[utoipa::path(
    delete,
    path = "/api/ehs/plans/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_delete_api_ehs_plans_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/plans/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_plans_id() {}

#[utoipa::path(
    put,
    path = "/api/ehs/plans/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_put_api_ehs_plans_id() {}

#[utoipa::path(
    get,
    path = "/api/ehs/sync/configs/{id}",
    tag = "EHS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_sync_configs_id() {}
#[utoipa::path(
    post,
    path = "/api/ehs/environmental-compliance/assessments",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_environmental_compliance_assessments() {}

#[utoipa::path(
    post,
    path = "/api/ehs/environmental-compliance/events",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_environmental_compliance_events() {}

#[utoipa::path(
    get,
    path = "/api/ehs/dashboard",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_get_api_ehs_dashboard() {}

#[utoipa::path(
    post,
    path = "/api/ehs/plans",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_plans() {}

#[utoipa::path(
    post,
    path = "/api/ehs/drills",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_drills() {}

#[utoipa::path(
    post,
    path = "/api/ehs/environment/monitors",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_environment_monitors() {}

#[utoipa::path(
    post,
    path = "/api/ehs/hazardous-materials/inventory",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_hazardous_materials_inventory() {}

#[utoipa::path(
    post,
    path = "/api/ehs/hazardous-materials/movements",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_hazardous_materials_movements() {}

#[utoipa::path(
    post,
    path = "/api/ehs/hazardous-materials/msds",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_hazardous_materials_msds() {}

#[utoipa::path(
    post,
    path = "/api/ehs/occupational-diseases/factors",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_occupational_diseases_factors() {}

#[utoipa::path(
    post,
    path = "/api/ehs/occupational-diseases/detection-records",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_occupational_diseases_detection_records() {}

#[utoipa::path(
    post,
    path = "/api/ehs/occupational-diseases/cases",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_occupational_diseases_cases() {}

#[utoipa::path(
    post,
    path = "/api/ehs/occupational-diseases/protection-measures",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_occupational_diseases_protection_measures() {}

#[utoipa::path(
    post,
    path = "/api/ehs/occupational-health/records",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_occupational_health_records() {}

#[utoipa::path(
    post,
    path = "/api/ehs/occupational-health/check-plans",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_occupational_health_check_plans() {}

#[utoipa::path(
    post,
    path = "/api/ehs/occupational-health/check-records",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_occupational_health_check_records() {}

#[utoipa::path(
    post,
    path = "/api/ehs/checks",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_checks() {}

#[utoipa::path(
    post,
    path = "/api/ehs/sync",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_sync() {}

#[utoipa::path(
    post,
    path = "/api/ehs/sync/to-qms",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_sync_to_qms() {}

#[utoipa::path(
    post,
    path = "/api/ehs/sync/to-lims",
    tag = "EHS-Compat",
    responses((status = 200, description = "EHS compatibility endpoint"))
)]
pub async fn compat_post_api_ehs_sync_to_lims() {}

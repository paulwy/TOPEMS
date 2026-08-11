//! QMS compatibility OpenAPI paths.
//!
//! OpenAPI-only contract entries for frontend `/api/qms/*` calls
//! not represented by concrete utoipa handlers yet.

#![allow(dead_code)]
#[utoipa::path(
    post,
    path = "/api/qms/actions",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_actions() {}

#[utoipa::path(
    get,
    path = "/api/qms/actions/{actionId}/items",
    tag = "QMS-Compat",
    params(("actionId" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_actions_actionid_items() {}

#[utoipa::path(
    delete,
    path = "/api/qms/actions/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_actions_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/actions/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_actions_id() {}

#[utoipa::path(
    put,
    path = "/api/qms/actions/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_actions_id() {}

#[utoipa::path(
    post,
    path = "/api/qms/actions/{id}/complete",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_actions_id_complete() {}

#[utoipa::path(
    post,
    path = "/api/qms/apqp/approvals",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_apqp_approvals() {}

#[utoipa::path(
    post,
    path = "/api/qms/apqp/approvals/{id}/process",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_apqp_approvals_id_process() {}

#[utoipa::path(
    post,
    path = "/api/qms/apqp/phases",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_apqp_phases() {}

#[utoipa::path(
    delete,
    path = "/api/qms/apqp/phases/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_apqp_phases_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/apqp/phases/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_apqp_phases_id() {}

#[utoipa::path(
    put,
    path = "/api/qms/apqp/phases/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_apqp_phases_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/apqp/projects",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_apqp_projects() {}

#[utoipa::path(
    post,
    path = "/api/qms/apqp/projects",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_apqp_projects() {}

#[utoipa::path(
    delete,
    path = "/api/qms/apqp/projects/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_apqp_projects_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/apqp/projects/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_apqp_projects_id() {}

#[utoipa::path(
    put,
    path = "/api/qms/apqp/projects/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_apqp_projects_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/apqp/projects/{id}/progress",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_apqp_projects_id_progress() {}

#[utoipa::path(
    post,
    path = "/api/qms/apqp/projects/{id}/transition",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_apqp_projects_id_transition() {}

#[utoipa::path(
    get,
    path = "/api/qms/apqp/risks",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_apqp_risks() {}

#[utoipa::path(
    post,
    path = "/api/qms/apqp/risks",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_apqp_risks() {}

#[utoipa::path(
    delete,
    path = "/api/qms/apqp/risks/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_apqp_risks_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/apqp/risks/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_apqp_risks_id() {}

#[utoipa::path(
    put,
    path = "/api/qms/apqp/risks/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_apqp_risks_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/apqp/tasks",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_apqp_tasks() {}

#[utoipa::path(
    post,
    path = "/api/qms/apqp/tasks",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_apqp_tasks() {}

#[utoipa::path(
    delete,
    path = "/api/qms/apqp/tasks/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_apqp_tasks_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/apqp/tasks/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_apqp_tasks_id() {}

#[utoipa::path(
    put,
    path = "/api/qms/apqp/tasks/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_apqp_tasks_id() {}

#[utoipa::path(
    post,
    path = "/api/qms/audit-findings",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_audit_findings() {}

#[utoipa::path(
    post,
    path = "/api/qms/audit-findings/{findingId}/verify",
    tag = "QMS-Compat",
    params(("findingId" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_audit_findings_findingid_verify() {}

#[utoipa::path(
    get,
    path = "/api/qms/audit-plans",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_audit_plans() {}

#[utoipa::path(
    post,
    path = "/api/qms/audit-plans",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_audit_plans() {}

#[utoipa::path(
    post,
    path = "/api/qms/audit-plans/{id}/complete",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_audit_plans_id_complete() {}

#[utoipa::path(
    post,
    path = "/api/qms/audit-plans/{id}/start",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_audit_plans_id_start() {}

#[utoipa::path(
    post,
    path = "/api/qms/audit-tasks",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_audit_tasks() {}

#[utoipa::path(
    put,
    path = "/api/qms/audit-tasks/{taskId}/complete",
    tag = "QMS-Compat",
    params(("taskId" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_audit_tasks_taskid_complete() {}

#[utoipa::path(
    post,
    path = "/api/qms/checks/{id}/assign",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_checks_id_assign() {}

#[utoipa::path(
    post,
    path = "/api/qms/checks/{id}/audit",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_checks_id_audit() {}

#[utoipa::path(
    get,
    path = "/api/qms/checks/{id}/audits",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_checks_id_audits() {}

#[utoipa::path(
    get,
    path = "/api/qms/checks/{id}/results",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_checks_id_results() {}

#[utoipa::path(
    post,
    path = "/api/qms/checks/{id}/rework",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_checks_id_rework() {}

#[utoipa::path(
    post,
    path = "/api/qms/checks/{id}/submit",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_checks_id_submit() {}

#[utoipa::path(
    get,
    path = "/api/qms/eightd",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_eightd() {}

#[utoipa::path(
    post,
    path = "/api/qms/eightd",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_eightd() {}

#[utoipa::path(
    delete,
    path = "/api/qms/eightd/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_eightd_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/eightd/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_eightd_id() {}

#[utoipa::path(
    put,
    path = "/api/qms/eightd/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_eightd_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/eightd/{id}/audit-logs",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_eightd_id_audit_logs() {}

#[utoipa::path(
    post,
    path = "/api/qms/eightd/{id}/close",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_eightd_id_close() {}

#[utoipa::path(
    put,
    path = "/api/qms/eightd/{id}/d1-team",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_eightd_id_d1_team() {}

#[utoipa::path(
    post,
    path = "/api/qms/eightd/{id}/d3-containment",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_eightd_id_d3_containment() {}

#[utoipa::path(
    post,
    path = "/api/qms/eightd/{id}/d4-root-cause",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_eightd_id_d4_root_cause() {}

#[utoipa::path(
    post,
    path = "/api/qms/eightd/{id}/d5-permanent-action",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_eightd_id_d5_permanent_action() {}

#[utoipa::path(
    post,
    path = "/api/qms/eightd/{id}/d6-verify",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_eightd_id_d6_verify() {}

#[utoipa::path(
    post,
    path = "/api/qms/eightd/{id}/d7-preventive",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_eightd_id_d7_preventive() {}

#[utoipa::path(
    get,
    path = "/api/qms/fmea",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_fmea() {}

#[utoipa::path(
    post,
    path = "/api/qms/fmea",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_fmea() {}

#[utoipa::path(
    get,
    path = "/api/qms/fmea-items",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_fmea_items() {}

#[utoipa::path(
    post,
    path = "/api/qms/fmea-items",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_fmea_items() {}

#[utoipa::path(
    delete,
    path = "/api/qms/fmea-items/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_fmea_items_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/fmea-items/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_fmea_items_id() {}

#[utoipa::path(
    put,
    path = "/api/qms/fmea-items/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_fmea_items_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/fmea/{fmeaId}/statistics",
    tag = "QMS-Compat",
    params(("fmeaId" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_fmea_fmeaid_statistics() {}

#[utoipa::path(
    delete,
    path = "/api/qms/fmea/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_fmea_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/fmea/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_fmea_id() {}

#[utoipa::path(
    put,
    path = "/api/qms/fmea/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_fmea_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/health",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_health() {}

#[utoipa::path(
    delete,
    path = "/api/qms/issues/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_issues_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/issues/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_issues_id() {}

#[utoipa::path(
    put,
    path = "/api/qms/issues/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_issues_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/quality-costs",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_quality_costs() {}

#[utoipa::path(
    post,
    path = "/api/qms/quality-costs",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_quality_costs() {}

#[utoipa::path(
    get,
    path = "/api/qms/quality-costs/statistics",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_quality_costs_statistics() {}

#[utoipa::path(
    get,
    path = "/api/qms/quality-costs/trend",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_quality_costs_trend() {}

#[utoipa::path(
    delete,
    path = "/api/qms/quality-costs/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_quality_costs_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/quality-costs/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_quality_costs_id() {}

#[utoipa::path(
    put,
    path = "/api/qms/quality-costs/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_quality_costs_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/quality-dashboard/overview",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_quality_dashboard_overview() {}

#[utoipa::path(
    get,
    path = "/api/qms/spc/charts",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_spc_charts() {}

#[utoipa::path(
    post,
    path = "/api/qms/spc/charts",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_spc_charts() {}

#[utoipa::path(
    post,
    path = "/api/qms/spc/charts/{chartId}/calculate",
    tag = "QMS-Compat",
    params(("chartId" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_spc_charts_chartid_calculate() {}

#[utoipa::path(
    get,
    path = "/api/qms/spc/charts/{chartId}/data-points",
    tag = "QMS-Compat",
    params(("chartId" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_spc_charts_chartid_data_points() {}

#[utoipa::path(
    delete,
    path = "/api/qms/spc/charts/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_spc_charts_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/spc/charts/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_spc_charts_id() {}

#[utoipa::path(
    put,
    path = "/api/qms/spc/charts/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_put_api_qms_spc_charts_id() {}

#[utoipa::path(
    post,
    path = "/api/qms/spc/data-points",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_spc_data_points() {}

#[utoipa::path(
    get,
    path = "/api/qms/standards/{standardId}/revisions",
    tag = "QMS-Compat",
    params(("standardId" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_standards_standardid_revisions() {}

#[utoipa::path(
    get,
    path = "/api/qms/sync-records",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_sync_records() {}

#[utoipa::path(
    delete,
    path = "/api/qms/sync-records/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_delete_api_qms_sync_records_id() {}

#[utoipa::path(
    get,
    path = "/api/qms/sync-records/{id}",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_get_api_qms_sync_records_id() {}

#[utoipa::path(
    post,
    path = "/api/qms/sync-records/{id}/retry",
    tag = "QMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_sync_records_id_retry() {}

#[utoipa::path(
    post,
    path = "/api/qms/sync/inspection-to-lims",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_sync_inspection_to_lims() {}

#[utoipa::path(
    post,
    path = "/api/qms/sync/issue-to-ehs",
    tag = "QMS-Compat",
    responses((status = 200, description = "QMS compatibility endpoint"))
)]
pub async fn compat_post_api_qms_sync_issue_to_ehs() {}

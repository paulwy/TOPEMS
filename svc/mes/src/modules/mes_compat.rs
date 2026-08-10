//! MES compatibility OpenAPI paths.
//!
//! These functions are OpenAPI-only contract entries for frontend
//! `/api/mes/*` calls that are not represented by concrete utoipa
//! handlers yet. They do not alter runtime routing behavior.
//!
//! The utoipa paths use the `/mes/...` prefix without the `/api`
//! prefix; OpenAPI spec normalization adds `/api` automatically.

// ---------------------------------------------------------------------------
// Anomaly
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/anomaly/alerts",
    tag = "MES-Compat/Anomaly",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_anomaly_alerts() {}

#[utoipa::path(
    get,
    path = "/mes/anomaly/summary",
    tag = "MES-Compat/Anomaly",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_anomaly_summary() {}

#[utoipa::path(
    get,
    path = "/mes/anomaly/equipment/{equipmentId}",
    tag = "MES-Compat/Anomaly",
    params(("equipmentId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_anomaly_equipment_equipmentid() {}

#[utoipa::path(
    get,
    path = "/mes/anomaly/rules",
    tag = "MES-Compat/Anomaly",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_anomaly_rules() {}

#[utoipa::path(
    get,
    path = "/mes/anomaly/rules/{ruleId}",
    tag = "MES-Compat/Anomaly",
    params(("ruleId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_anomaly_rules_ruleid() {}

#[utoipa::path(
    put,
    path = "/mes/anomaly/rules",
    tag = "MES-Compat/Anomaly",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_anomaly_rules() {}

#[utoipa::path(
    post,
    path = "/mes/anomaly/scan",
    tag = "MES-Compat/Anomaly",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_anomaly_scan() {}

#[utoipa::path(
    get,
    path = "/mes/anomaly/trend",
    tag = "MES-Compat/Anomaly",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_anomaly_trend() {}

// ---------------------------------------------------------------------------
// APS
// ---------------------------------------------------------------------------

#[utoipa::path(
    post,
    path = "/mes/aps/schedule",
    tag = "MES-Compat/APS",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_aps_schedule() {}

#[utoipa::path(
    post,
    path = "/mes/aps/schedule/simulate",
    tag = "MES-Compat/APS",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_aps_schedule_simulate() {}

#[utoipa::path(
    post,
    path = "/mes/aps/schedule/check-constraints",
    tag = "MES-Compat/APS",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_aps_schedule_check_constraints() {}

#[utoipa::path(
    get,
    path = "/mes/aps/schedule/optimization-report",
    tag = "MES-Compat/APS",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_aps_schedule_optimization_report() {}

#[utoipa::path(
    get,
    path = "/mes/aps/schedule/bottleneck-analysis",
    tag = "MES-Compat/APS",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_aps_schedule_bottleneck_analysis() {}

#[utoipa::path(
    get,
    path = "/mes/aps/orders/{orderId}/feasibility",
    tag = "MES-Compat/APS",
    params(("orderId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_aps_orders_orderid_feasibility() {}

// ---------------------------------------------------------------------------
// EquipmentOEE
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/equipment-oee/{equipmentId}/efficiency",
    tag = "MES-Compat/EquipmentOEE",
    params(("equipmentId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_equipment_oee_equipmentid_efficiency() {}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/health",
    tag = "MES-Compat/Health",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_health() {}

// ---------------------------------------------------------------------------
// BOMs
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/boms",
    tag = "MES-Compat/BOMs",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_boms() {}

#[utoipa::path(
    get,
    path = "/mes/boms/{id}",
    tag = "MES-Compat/BOMs",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_boms_id() {}

#[utoipa::path(
    post,
    path = "/mes/boms",
    tag = "MES-Compat/BOMs",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_boms() {}

#[utoipa::path(
    put,
    path = "/mes/boms/{id}",
    tag = "MES-Compat/BOMs",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_boms_id() {}

#[utoipa::path(
    delete,
    path = "/mes/boms/{id}",
    tag = "MES-Compat/BOMs",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_boms_id() {}

// ---------------------------------------------------------------------------
// MaterialIssues
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/material-issues",
    tag = "MES-Compat/MaterialIssues",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_material_issues() {}

#[utoipa::path(
    post,
    path = "/mes/material-issues",
    tag = "MES-Compat/MaterialIssues",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_material_issues() {}

// ---------------------------------------------------------------------------
// MaterialReturns
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/material-returns",
    tag = "MES-Compat/MaterialReturns",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_material_returns() {}

#[utoipa::path(
    post,
    path = "/mes/material-returns",
    tag = "MES-Compat/MaterialReturns",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_material_returns() {}

// ---------------------------------------------------------------------------
// MaterialRequirements
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/material-requirements",
    tag = "MES-Compat/MaterialRequirements",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_material_requirements() {}

#[utoipa::path(
    get,
    path = "/mes/material-requirements/{id}",
    tag = "MES-Compat/MaterialRequirements",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_material_requirements_id() {}

#[utoipa::path(
    post,
    path = "/mes/material-requirements",
    tag = "MES-Compat/MaterialRequirements",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_material_requirements() {}

#[utoipa::path(
    put,
    path = "/mes/material-requirements/{id}",
    tag = "MES-Compat/MaterialRequirements",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_material_requirements_id() {}

#[utoipa::path(
    delete,
    path = "/mes/material-requirements/{id}",
    tag = "MES-Compat/MaterialRequirements",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_material_requirements_id() {}

#[utoipa::path(
    post,
    path = "/mes/material-requirements/calculate",
    tag = "MES-Compat/MaterialRequirements",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_material_requirements_calculate() {}

#[utoipa::path(
    put,
    path = "/mes/material-requirements/{id}/confirm",
    tag = "MES-Compat/MaterialRequirements",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_material_requirements_id_confirm() {}

#[utoipa::path(
    put,
    path = "/mes/material-requirements/{id}/release",
    tag = "MES-Compat/MaterialRequirements",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_material_requirements_id_release() {}

// ---------------------------------------------------------------------------
// ProcessRoutes
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/process-routes",
    tag = "MES-Compat/ProcessRoutes",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_process_routes() {}

#[utoipa::path(
    get,
    path = "/mes/process-routes/{id}",
    tag = "MES-Compat/ProcessRoutes",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_process_routes_id() {}

#[utoipa::path(
    post,
    path = "/mes/process-routes",
    tag = "MES-Compat/ProcessRoutes",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_process_routes() {}

#[utoipa::path(
    put,
    path = "/mes/process-routes/{id}",
    tag = "MES-Compat/ProcessRoutes",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_process_routes_id() {}

#[utoipa::path(
    delete,
    path = "/mes/process-routes/{id}",
    tag = "MES-Compat/ProcessRoutes",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_process_routes_id() {}

#[utoipa::path(
    get,
    path = "/mes/process-routes/{routeId}/steps",
    tag = "MES-Compat/ProcessRoutes",
    params(("routeId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_process_routes_routeid_steps() {}

#[utoipa::path(
    post,
    path = "/mes/process-routes/{routeId}/steps",
    tag = "MES-Compat/ProcessRoutes",
    params(("routeId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_process_routes_routeid_steps() {}

#[utoipa::path(
    put,
    path = "/mes/process-routes/{routeId}/steps/{stepId}",
    tag = "MES-Compat/ProcessRoutes",
    params(("routeId" = String, Path, description = "路径参数"), ("stepId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_process_routes_routeid_steps_stepid() {}

#[utoipa::path(
    delete,
    path = "/mes/process-routes/{routeId}/steps/{stepId}",
    tag = "MES-Compat/ProcessRoutes",
    params(("routeId" = String, Path, description = "路径参数"), ("stepId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_process_routes_routeid_steps_stepid() {}

#[utoipa::path(
    put,
    path = "/mes/process-routes/{routeId}/steps/reorder",
    tag = "MES-Compat/ProcessRoutes",
    params(("routeId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_process_routes_routeid_steps_reorder() {}

// ---------------------------------------------------------------------------
// ProcessFlows
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/process-flows",
    tag = "MES-Compat/ProcessFlows",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_process_flows() {}

#[utoipa::path(
    get,
    path = "/mes/process-flows/{id}",
    tag = "MES-Compat/ProcessFlows",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_process_flows_id() {}

#[utoipa::path(
    post,
    path = "/mes/process-flows",
    tag = "MES-Compat/ProcessFlows",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_process_flows() {}

#[utoipa::path(
    put,
    path = "/mes/process-flows/{id}",
    tag = "MES-Compat/ProcessFlows",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_process_flows_id() {}

#[utoipa::path(
    delete,
    path = "/mes/process-flows/{id}",
    tag = "MES-Compat/ProcessFlows",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_process_flows_id() {}

#[utoipa::path(
    get,
    path = "/mes/process-flows/{flowId}/steps",
    tag = "MES-Compat/ProcessFlows",
    params(("flowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_process_flows_flowid_steps() {}

#[utoipa::path(
    post,
    path = "/mes/process-flows/{flowId}/steps",
    tag = "MES-Compat/ProcessFlows",
    params(("flowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_process_flows_flowid_steps() {}

#[utoipa::path(
    put,
    path = "/mes/process-flows/{flowId}/steps/{stepId}",
    tag = "MES-Compat/ProcessFlows",
    params(("flowId" = String, Path, description = "路径参数"), ("stepId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_process_flows_flowid_steps_stepid() {}

#[utoipa::path(
    delete,
    path = "/mes/process-flows/{flowId}/steps/{stepId}",
    tag = "MES-Compat/ProcessFlows",
    params(("flowId" = String, Path, description = "路径参数"), ("stepId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_process_flows_flowid_steps_stepid() {}

#[utoipa::path(
    get,
    path = "/mes/process-flows/{flowId}/capacity",
    tag = "MES-Compat/ProcessFlows",
    params(("flowId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_process_flows_flowid_capacity() {}

// ---------------------------------------------------------------------------
// Processes
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/processes",
    tag = "MES-Compat/Processes",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_processes() {}

#[utoipa::path(
    get,
    path = "/mes/processes/{id}",
    tag = "MES-Compat/Processes",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_processes_id() {}

#[utoipa::path(
    post,
    path = "/mes/processes",
    tag = "MES-Compat/Processes",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_processes() {}

#[utoipa::path(
    put,
    path = "/mes/processes/{id}",
    tag = "MES-Compat/Processes",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_processes_id() {}

#[utoipa::path(
    delete,
    path = "/mes/processes/{id}",
    tag = "MES-Compat/Processes",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_processes_id() {}

#[utoipa::path(
    put,
    path = "/mes/processes/{id}/deactivate",
    tag = "MES-Compat/Processes",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_processes_id_deactivate() {}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/records",
    tag = "MES-Compat/Records",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_records() {}

#[utoipa::path(
    get,
    path = "/mes/records/{id}",
    tag = "MES-Compat/Records",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_records_id() {}

#[utoipa::path(
    post,
    path = "/mes/records",
    tag = "MES-Compat/Records",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_records() {}

#[utoipa::path(
    put,
    path = "/mes/records/{id}",
    tag = "MES-Compat/Records",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_records_id() {}

#[utoipa::path(
    delete,
    path = "/mes/records/{id}",
    tag = "MES-Compat/Records",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_records_id() {}

#[utoipa::path(
    put,
    path = "/mes/records/{id}/complete",
    tag = "MES-Compat/Records",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_records_id_complete() {}

// ---------------------------------------------------------------------------
// Quality
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/quality/inspections",
    tag = "MES-Compat/Quality",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_quality_inspections() {}

#[utoipa::path(
    get,
    path = "/mes/quality/inspections/{id}",
    tag = "MES-Compat/Quality",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_quality_inspections_id() {}

#[utoipa::path(
    post,
    path = "/mes/quality/inspections",
    tag = "MES-Compat/Quality",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_quality_inspections() {}

#[utoipa::path(
    put,
    path = "/mes/quality/inspections/{id}",
    tag = "MES-Compat/Quality",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_quality_inspections_id() {}

#[utoipa::path(
    delete,
    path = "/mes/quality/inspections/{id}",
    tag = "MES-Compat/Quality",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_quality_inspections_id() {}

#[utoipa::path(
    get,
    path = "/mes/quality/patrols",
    tag = "MES-Compat/Quality",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_quality_patrols() {}

#[utoipa::path(
    get,
    path = "/mes/quality/patrols/{id}",
    tag = "MES-Compat/Quality",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_quality_patrols_id() {}

#[utoipa::path(
    post,
    path = "/mes/quality/patrols",
    tag = "MES-Compat/Quality",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_quality_patrols() {}

#[utoipa::path(
    put,
    path = "/mes/quality/patrols/{id}",
    tag = "MES-Compat/Quality",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_quality_patrols_id() {}

#[utoipa::path(
    delete,
    path = "/mes/quality/patrols/{id}",
    tag = "MES-Compat/Quality",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_quality_patrols_id() {}

#[utoipa::path(
    get,
    path = "/mes/quality/patrols/{patrolId}/items",
    tag = "MES-Compat/Quality",
    params(("patrolId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_quality_patrols_patrolid_items() {}

#[utoipa::path(
    post,
    path = "/mes/quality/patrols/{patrolId}/items",
    tag = "MES-Compat/Quality",
    params(("patrolId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_quality_patrols_patrolid_items() {}

#[utoipa::path(
    get,
    path = "/mes/quality/standards",
    tag = "MES-Compat/Quality",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_quality_standards() {}

#[utoipa::path(
    get,
    path = "/mes/quality/standards/{id}",
    tag = "MES-Compat/Quality",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_quality_standards_id() {}

#[utoipa::path(
    post,
    path = "/mes/quality/standards",
    tag = "MES-Compat/Quality",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_quality_standards() {}

#[utoipa::path(
    put,
    path = "/mes/quality/standards/{id}",
    tag = "MES-Compat/Quality",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_quality_standards_id() {}

#[utoipa::path(
    delete,
    path = "/mes/quality/standards/{id}",
    tag = "MES-Compat/Quality",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_quality_standards_id() {}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/teams",
    tag = "MES-Compat/Teams",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_teams() {}

#[utoipa::path(
    get,
    path = "/mes/teams/{id}",
    tag = "MES-Compat/Teams",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_teams_id() {}

#[utoipa::path(
    post,
    path = "/mes/teams",
    tag = "MES-Compat/Teams",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_teams() {}

#[utoipa::path(
    put,
    path = "/mes/teams/{id}",
    tag = "MES-Compat/Teams",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_teams_id() {}

#[utoipa::path(
    delete,
    path = "/mes/teams/{id}",
    tag = "MES-Compat/Teams",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_teams_id() {}

#[utoipa::path(
    get,
    path = "/mes/teams/{teamId}/members",
    tag = "MES-Compat/Teams",
    params(("teamId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_teams_teamid_members() {}

#[utoipa::path(
    post,
    path = "/mes/teams/{teamId}/members",
    tag = "MES-Compat/Teams",
    params(("teamId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_teams_teamid_members() {}

#[utoipa::path(
    delete,
    path = "/mes/teams/{teamId}/members/{memberId}",
    tag = "MES-Compat/Teams",
    params(("teamId" = String, Path, description = "路径参数"), ("memberId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_teams_teamid_members_memberid() {}

// ---------------------------------------------------------------------------
// Traceability
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/traceability/forward/{orderId}",
    tag = "MES-Compat/Traceability",
    params(("orderId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_traceability_forward_orderid() {}

#[utoipa::path(
    get,
    path = "/mes/traceability/backward/{batchNo}",
    tag = "MES-Compat/Traceability",
    params(("batchNo" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_traceability_backward_batchno() {}

#[utoipa::path(
    get,
    path = "/mes/traceability/chain",
    tag = "MES-Compat/Traceability",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_traceability_chain() {}

#[utoipa::path(
    get,
    path = "/mes/traceability/quality-records",
    tag = "MES-Compat/Traceability",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_traceability_quality_records() {}

// ---------------------------------------------------------------------------
// WIPs
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/wips/transfers",
    tag = "MES-Compat/WIPs",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_wips_transfers() {}

// ---------------------------------------------------------------------------
// Workstations
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/mes/workstations",
    tag = "MES-Compat/Workstations",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_workstations() {}

#[utoipa::path(
    get,
    path = "/mes/workstations/{id}",
    tag = "MES-Compat/Workstations",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_get_workstations_id() {}

#[utoipa::path(
    post,
    path = "/mes/workstations",
    tag = "MES-Compat/Workstations",
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_post_workstations() {}

#[utoipa::path(
    put,
    path = "/mes/workstations/{id}",
    tag = "MES-Compat/Workstations",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_workstations_id() {}

#[utoipa::path(
    delete,
    path = "/mes/workstations/{id}",
    tag = "MES-Compat/Workstations",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_delete_workstations_id() {}

#[utoipa::path(
    put,
    path = "/mes/workstations/{id}/activate",
    tag = "MES-Compat/Workstations",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_workstations_id_activate() {}

#[utoipa::path(
    put,
    path = "/mes/workstations/{id}/deactivate",
    tag = "MES-Compat/Workstations",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "MES compatibility endpoint"))
)]
pub async fn compat_put_workstations_id_deactivate() {}

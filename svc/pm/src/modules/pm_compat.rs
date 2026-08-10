//! PM compatibility OpenAPI paths.
//!
//! These functions are OpenAPI-only contract entries for frontend
//! `/api/pm/*` calls that are not represented by concrete utoipa
//! handlers yet. They do not alter runtime routing behavior.

#[utoipa::path(
    delete,
    path = "/api/pm/acceptance-items/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_delete_acceptance_items_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/acceptance-items/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_acceptance_items_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/acceptance-plans/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_acceptance_plans_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/acceptance-plans/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_acceptance_plans_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/acceptance-plans/{planId}/items",
    tag = "PM-Compat",
    params(("planId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_acceptance_plans_planid_items() {}

#[utoipa::path(
    post,
    path = "/api/pm/acceptance-plans/{planId}/items",
    tag = "PM-Compat",
    params(("planId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_acceptance_plans_planid_items() {}

#[utoipa::path(
    post,
    path = "/api/pm/acceptance-plans/{planId}/records",
    tag = "PM-Compat",
    params(("planId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_acceptance_plans_planid_records() {}

#[utoipa::path(
    get,
    path = "/api/pm/acceptance-records/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_acceptance_records_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/acceptance-records/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_acceptance_records_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/budgets/{budgetId}/items",
    tag = "PM-Compat",
    params(("budgetId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_budgets_budgetid_items() {}

#[utoipa::path(
    post,
    path = "/api/pm/budgets/{budgetId}/items",
    tag = "PM-Compat",
    params(("budgetId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_budgets_budgetid_items() {}

#[utoipa::path(
    delete,
    path = "/api/pm/budgets/{budgetId}/items/{itemId}",
    tag = "PM-Compat",
    params(("budgetId" = String, Path, description = "路径参数"), ("itemId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_delete_budgets_budgetid_items_itemid() {}

#[utoipa::path(
    put,
    path = "/api/pm/budgets/{budgetId}/items/{itemId}",
    tag = "PM-Compat",
    params(("budgetId" = String, Path, description = "路径参数"), ("itemId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_budgets_budgetid_items_itemid() {}

#[utoipa::path(
    get,
    path = "/api/pm/budgets/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_budgets_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/budgets/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_budgets_id() {}

#[utoipa::path(
    post,
    path = "/api/pm/budgets/{id}/approve",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_budgets_id_approve() {}

#[utoipa::path(
    post,
    path = "/api/pm/budgets/{id}/submit",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_budgets_id_submit() {}

#[utoipa::path(
    get,
    path = "/api/pm/contract-templates",
    tag = "PM-Compat",
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_contract_templates() {}

#[utoipa::path(
    post,
    path = "/api/pm/contract-templates",
    tag = "PM-Compat",
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_contract_templates() {}

#[utoipa::path(
    delete,
    path = "/api/pm/contract-templates/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_delete_contract_templates_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/contract-templates/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_contract_templates_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/contract-templates/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_contract_templates_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/contracts",
    tag = "PM-Compat",
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_contracts() {}

#[utoipa::path(
    post,
    path = "/api/pm/contracts",
    tag = "PM-Compat",
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_contracts() {}

#[utoipa::path(
    get,
    path = "/api/pm/contracts/{contractId}/milestones",
    tag = "PM-Compat",
    params(("contractId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_contracts_contractid_milestones() {}

#[utoipa::path(
    post,
    path = "/api/pm/contracts/{contractId}/milestones",
    tag = "PM-Compat",
    params(("contractId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_contracts_contractid_milestones() {}

#[utoipa::path(
    delete,
    path = "/api/pm/contracts/{contractId}/milestones/{milestoneId}",
    tag = "PM-Compat",
    params(("contractId" = String, Path, description = "路径参数"), ("milestoneId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_delete_contracts_contractid_milestones_milestoneid() {}

#[utoipa::path(
    put,
    path = "/api/pm/contracts/{contractId}/milestones/{milestoneId}",
    tag = "PM-Compat",
    params(("contractId" = String, Path, description = "路径参数"), ("milestoneId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_contracts_contractid_milestones_milestoneid() {}

#[utoipa::path(
    get,
    path = "/api/pm/contracts/{contractId}/payments",
    tag = "PM-Compat",
    params(("contractId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_contracts_contractid_payments() {}

#[utoipa::path(
    post,
    path = "/api/pm/contracts/{contractId}/payments",
    tag = "PM-Compat",
    params(("contractId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_contracts_contractid_payments() {}

#[utoipa::path(
    delete,
    path = "/api/pm/contracts/{contractId}/payments/{paymentId}",
    tag = "PM-Compat",
    params(("contractId" = String, Path, description = "路径参数"), ("paymentId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_delete_contracts_contractid_payments_paymentid() {}

#[utoipa::path(
    put,
    path = "/api/pm/contracts/{contractId}/payments/{paymentId}",
    tag = "PM-Compat",
    params(("contractId" = String, Path, description = "路径参数"), ("paymentId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_contracts_contractid_payments_paymentid() {}

#[utoipa::path(
    delete,
    path = "/api/pm/contracts/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_delete_contracts_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/contracts/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_contracts_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/contracts/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_contracts_id() {}

#[utoipa::path(
    post,
    path = "/api/pm/contracts/{id}/approve",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_contracts_id_approve() {}

#[utoipa::path(
    post,
    path = "/api/pm/contracts/{id}/reject",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_contracts_id_reject() {}

#[utoipa::path(
    post,
    path = "/api/pm/contracts/{id}/submit",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_contracts_id_submit() {}

#[utoipa::path(
    delete,
    path = "/api/pm/defects/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_delete_defects_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/defects/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_defects_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/defects/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_defects_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/documents/{documentId}/versions",
    tag = "PM-Compat",
    params(("documentId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_documents_documentid_versions() {}

#[utoipa::path(
    post,
    path = "/api/pm/documents/{documentId}/versions",
    tag = "PM-Compat",
    params(("documentId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_documents_documentid_versions() {}

#[utoipa::path(
    delete,
    path = "/api/pm/documents/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_delete_documents_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/documents/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_documents_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/documents/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_documents_id() {}

#[utoipa::path(
    delete,
    path = "/api/pm/folders/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_delete_folders_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/folders/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_folders_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/folders/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_folders_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/notification-settings/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_notification_settings_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/notification-types",
    tag = "PM-Compat",
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_notification_types() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{data.project_id}/notifications",
    tag = "PM-Compat",
    params(("data.project_id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_data_project_id_notifications() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/acceptance-plans",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_acceptance_plans() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/acceptance-plans",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_acceptance_plans() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/acceptance-records",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_acceptance_records() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/budgets",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_budgets() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/budgets",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_budgets() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/contracts",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_contracts() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/contracts",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_contracts() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/defects",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_defects() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/defects",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_defects() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/documents",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_documents() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/documents",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_documents() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/folders",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_folders() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/folders",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_folders() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/notification-settings",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_notification_settings() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/notification-settings",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_notification_settings() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/notifications",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_notifications() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/quality-checks",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_quality_checks() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/quality-checks",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_quality_checks() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/reports",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_reports() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/reports",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_reports() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/reports/generate",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_reports_generate() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/risks",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_risks() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/risks",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_risks() {}

#[utoipa::path(
    get,
    path = "/api/pm/projects/{projectId}/settlements",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_projects_projectid_settlements() {}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{projectId}/settlements",
    tag = "PM-Compat",
    params(("projectId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_projects_projectid_settlements() {}

#[utoipa::path(
    get,
    path = "/api/pm/quality-checks/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_quality_checks_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/quality-checks/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_quality_checks_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/report-templates",
    tag = "PM-Compat",
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_report_templates() {}

#[utoipa::path(
    post,
    path = "/api/pm/report-templates",
    tag = "PM-Compat",
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_report_templates() {}

#[utoipa::path(
    delete,
    path = "/api/pm/report-templates/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_delete_report_templates_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/report-templates/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_report_templates_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/report-templates/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_report_templates_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/reports/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_reports_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/risks/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_risks_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/risks/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_risks_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/risks/{riskId}/events",
    tag = "PM-Compat",
    params(("riskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_risks_riskid_events() {}

#[utoipa::path(
    post,
    path = "/api/pm/risks/{riskId}/events",
    tag = "PM-Compat",
    params(("riskId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_risks_riskid_events() {}

#[utoipa::path(
    delete,
    path = "/api/pm/settlement-items/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_delete_settlement_items_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/settlement-items/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_settlement_items_id() {}

#[utoipa::path(
    get,
    path = "/api/pm/settlements/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_settlements_id() {}

#[utoipa::path(
    put,
    path = "/api/pm/settlements/{id}",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_put_settlements_id() {}

#[utoipa::path(
    post,
    path = "/api/pm/settlements/{id}/approve",
    tag = "PM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_settlements_id_approve() {}

#[utoipa::path(
    get,
    path = "/api/pm/settlements/{settlementId}/adjustments",
    tag = "PM-Compat",
    params(("settlementId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_settlements_settlementid_adjustments() {}

#[utoipa::path(
    post,
    path = "/api/pm/settlements/{settlementId}/adjustments",
    tag = "PM-Compat",
    params(("settlementId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_settlements_settlementid_adjustments() {}

#[utoipa::path(
    get,
    path = "/api/pm/settlements/{settlementId}/items",
    tag = "PM-Compat",
    params(("settlementId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_settlements_settlementid_items() {}

#[utoipa::path(
    post,
    path = "/api/pm/settlements/{settlementId}/items",
    tag = "PM-Compat",
    params(("settlementId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_post_settlements_settlementid_items() {}

#[utoipa::path(
    get,
    path = "/api/pm/statistics",
    tag = "PM-Compat",
    responses((status = 200, description = "PM compatibility endpoint"))
)]
pub async fn compat_get_statistics() {}

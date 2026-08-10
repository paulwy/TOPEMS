//! Integration compatibility OpenAPI paths.
//!
//! OpenAPI-only contract entries for frontend `/api/integration/external-erp/*` calls
//! not represented by concrete utoipa handlers yet.

#![allow(dead_code, clippy::empty_loop)]

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections() {}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_id() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/connections",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_connections() {}

#[utoipa::path(
    put,
    path = "/api/integration/external-erp/connections/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_external_erp_connections_id() {}

#[utoipa::path(
    delete,
    path = "/api/integration/external-erp/connections/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_delete_api_integration_external_erp_connections_id() {}

#[utoipa::path(
    put,
    path = "/api/integration/external-erp/connections/{id}/toggle",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_external_erp_connections_id_toggle() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/connections/test",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_connections_test() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/connections/{id}/sync-status",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_connections_id_sync_status() {}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/company-mappings",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_company_mappings() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/connections/{configId}/company-mappings",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_connections_configid_company_mappings() {}

#[utoipa::path(
    put,
    path = "/api/integration/external-erp/connections/{configId}/company-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_external_erp_connections_configid_company_mappings_mappingid(
) {
}

#[utoipa::path(
    delete,
    path = "/api/integration/external-erp/connections/{configId}/company-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_delete_api_integration_external_erp_connections_configid_company_mappings_mappingid(
) {
}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/export/sync-logs",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_export_sync_logs() {}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/export/mappings",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_export_mappings() {}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/account-mappings",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_account_mappings() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/connections/{configId}/account-mappings/batch",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_connections_configid_account_mappings_batch()
{
}

#[utoipa::path(
    put,
    path = "/api/integration/external-erp/connections/{configId}/account-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_external_erp_connections_configid_account_mappings_mappingid(
) {
}

#[utoipa::path(
    delete,
    path = "/api/integration/external-erp/connections/{configId}/account-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_delete_api_integration_external_erp_connections_configid_account_mappings_mappingid(
) {
}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/connections/{configId}/account-mappings/auto-match",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_connections_configid_account_mappings_auto_match(
) {
}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/customer-mappings",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_customer_mappings() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/connections/{configId}/customer-mappings/batch",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_connections_configid_customer_mappings_batch()
{
}

#[utoipa::path(
    put,
    path = "/api/integration/external-erp/connections/{configId}/customer-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_external_erp_connections_configid_customer_mappings_mappingid(
) {
}

#[utoipa::path(
    delete,
    path = "/api/integration/external-erp/connections/{configId}/customer-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_delete_api_integration_external_erp_connections_configid_customer_mappings_mappingid(
) {
}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/supplier-mappings",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_supplier_mappings() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/connections/{configId}/supplier-mappings/batch",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_connections_configid_supplier_mappings_batch()
{
}

#[utoipa::path(
    put,
    path = "/api/integration/external-erp/connections/{configId}/supplier-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_external_erp_connections_configid_supplier_mappings_mappingid(
) {
}

#[utoipa::path(
    delete,
    path = "/api/integration/external-erp/connections/{configId}/supplier-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_delete_api_integration_external_erp_connections_configid_supplier_mappings_mappingid(
) {
}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/project-mappings",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_project_mappings() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/connections/{configId}/project-mappings/batch",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_connections_configid_project_mappings_batch()
{
}

#[utoipa::path(
    put,
    path = "/api/integration/external-erp/connections/{configId}/project-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_external_erp_connections_configid_project_mappings_mappingid(
) {
}

#[utoipa::path(
    delete,
    path = "/api/integration/external-erp/connections/{configId}/project-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_delete_api_integration_external_erp_connections_configid_project_mappings_mappingid(
) {
}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/department-mappings",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_department_mappings() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/connections/{configId}/department-mappings/batch",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_connections_configid_department_mappings_batch(
) {
}

#[utoipa::path(
    put,
    path = "/api/integration/external-erp/connections/{configId}/department-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_external_erp_connections_configid_department_mappings_mappingid(
) {
}

#[utoipa::path(
    delete,
    path = "/api/integration/external-erp/connections/{configId}/department-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_delete_api_integration_external_erp_connections_configid_department_mappings_mappingid(
) {
}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/employee-mappings",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_employee_mappings() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/connections/{configId}/employee-mappings/batch",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_connections_configid_employee_mappings_batch()
{
}

#[utoipa::path(
    put,
    path = "/api/integration/external-erp/connections/{configId}/employee-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_external_erp_connections_configid_employee_mappings_mappingid(
) {
}

#[utoipa::path(
    delete,
    path = "/api/integration/external-erp/connections/{configId}/employee-mappings/{mappingId}",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id"), ("mappingId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_delete_api_integration_external_erp_connections_configid_employee_mappings_mappingid(
) {
}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/preview/accounts",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_preview_accounts() {}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/preview/customers",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_preview_customers() {}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/preview/suppliers",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_preview_suppliers() {}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/preview/vouchers",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_preview_vouchers() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/sync/accounts",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_sync_accounts() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/sync/customers",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_sync_customers() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/sync/suppliers",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_sync_suppliers() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/sync/projects",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_sync_projects() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/sync/departments",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_sync_departments() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/sync/employees",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_sync_employees() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/sync/vouchers",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_sync_vouchers() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/sync/invoices",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_sync_invoices() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/sync/full",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_sync_full() {}

#[utoipa::path(
    post,
    path = "/api/integration/external-erp/sync/{logId}/cancel",
    tag = "Integration-Compat",
    params(("logId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_external_erp_sync_logid_cancel() {}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/sync-logs",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_sync_logs() {}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/sync-logs/{logId}",
    tag = "Integration-Compat",
    params(("logId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_sync_logs_logid() {}

#[utoipa::path(
    get,
    path = "/api/integration/external-erp/connections/{configId}/sync-statistics",
    tag = "Integration-Compat",
    params(("configId" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_external_erp_connections_configid_sync_statistics() {}
#[utoipa::path(
    get,
    path = "/api/integration/erp/connections",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_erp_connections() {}

#[utoipa::path(
    get,
    path = "/api/integration/erp/connections/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_erp_connections_id() {}

#[utoipa::path(
    post,
    path = "/api/integration/erp/connections",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_erp_connections() {}

#[utoipa::path(
    put,
    path = "/api/integration/erp/connections/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_erp_connections_id() {}

#[utoipa::path(
    delete,
    path = "/api/integration/erp/connections/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_delete_api_integration_erp_connections_id() {}

#[utoipa::path(
    get,
    path = "/api/integration/conversion-rules",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_conversion_rules() {}

#[utoipa::path(
    get,
    path = "/api/integration/conversion-rules/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_conversion_rules_id() {}

#[utoipa::path(
    post,
    path = "/api/integration/conversion-rules",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_conversion_rules() {}

#[utoipa::path(
    put,
    path = "/api/integration/conversion-rules/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_conversion_rules_id() {}

#[utoipa::path(
    delete,
    path = "/api/integration/conversion-rules/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_delete_api_integration_conversion_rules_id() {}

#[utoipa::path(
    get,
    path = "/api/integration/health",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_health() {}

#[utoipa::path(
    get,
    path = "/api/integration/endpoints",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_endpoints() {}

#[utoipa::path(
    get,
    path = "/api/integration/erp/mappings",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_erp_mappings() {}

#[utoipa::path(
    get,
    path = "/api/integration/erp/mappings/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_erp_mappings_id() {}

#[utoipa::path(
    post,
    path = "/api/integration/erp/mappings",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_post_api_integration_erp_mappings() {}

#[utoipa::path(
    put,
    path = "/api/integration/erp/mappings/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_put_api_integration_erp_mappings_id() {}

#[utoipa::path(
    delete,
    path = "/api/integration/erp/mappings/{id}",
    tag = "Integration-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_delete_api_integration_erp_mappings_id() {}

#[utoipa::path(
    get,
    path = "/api/integration/sync-stats",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_sync_stats() {}

#[utoipa::path(
    get,
    path = "/api/integration/sync-stats/history",
    tag = "Integration-Compat",
    responses((status = 200, description = "Integration compatibility endpoint"))
)]
pub async fn compat_get_api_integration_sync_stats_history() {}

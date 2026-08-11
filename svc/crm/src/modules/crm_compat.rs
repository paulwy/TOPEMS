//! CRM compatibility OpenAPI paths.
//!
//! OpenAPI-only contract entries for frontend `/api/crm/*` calls
//! not represented by concrete utoipa handlers yet.

#![allow(dead_code)]
#[utoipa::path(
    get,
    path = "/api/crm/billing",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_billing() {}

#[utoipa::path(
    post,
    path = "/api/crm/billing",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_billing() {}

#[utoipa::path(
    delete,
    path = "/api/crm/billing/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_delete_api_crm_billing_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/billing/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_billing_id() {}

#[utoipa::path(
    put,
    path = "/api/crm/billing/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_put_api_crm_billing_id() {}

#[utoipa::path(
    post,
    path = "/api/crm/billing/{id}/notify",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_billing_id_notify() {}

#[utoipa::path(
    post,
    path = "/api/crm/billing/{id}/paid",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_billing_id_paid() {}

#[utoipa::path(
    post,
    path = "/api/crm/contacts/batch-delete",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_contacts_batchdelete() {}

#[utoipa::path(
    delete,
    path = "/api/crm/contacts/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_delete_api_crm_contacts_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/contacts/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_contacts_id() {}

#[utoipa::path(
    put,
    path = "/api/crm/contacts/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_put_api_crm_contacts_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/customer-scoring",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_customerscoring() {}

#[utoipa::path(
    post,
    path = "/api/crm/customer-scoring",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_customerscoring() {}

#[utoipa::path(
    post,
    path = "/api/crm/customer-scoring/calculate",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_customerscoring_calculate() {}

#[utoipa::path(
    delete,
    path = "/api/crm/customer-scoring/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_delete_api_crm_customerscoring_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/customer-scoring/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_customerscoring_id() {}

#[utoipa::path(
    put,
    path = "/api/crm/customer-scoring/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_put_api_crm_customerscoring_id() {}

#[utoipa::path(
    post,
    path = "/api/crm/customers/batch-delete",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_customers_batchdelete() {}

#[utoipa::path(
    get,
    path = "/api/crm/customers/{customerId}/recommendations",
    tag = "CRM-Compat",
    params(("customerId" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_customers_customerid_recommendations() {}

#[utoipa::path(
    get,
    path = "/api/crm/customers/{id}/tags",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_customers_id_tags() {}

#[utoipa::path(
    post,
    path = "/api/crm/customers/{id}/tags",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_customers_id_tags() {}

#[utoipa::path(
    delete,
    path = "/api/crm/customers/{id}/tags/{tagId}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id"), ("tagId" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_delete_api_crm_customers_id_tags_tagid() {}

#[utoipa::path(
    get,
    path = "/api/crm/dashboard",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_dashboard() {}

#[utoipa::path(
    get,
    path = "/api/crm/health",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_health() {}

#[utoipa::path(
    get,
    path = "/api/crm/interactions",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_interactions() {}

#[utoipa::path(
    post,
    path = "/api/crm/interactions",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_interactions() {}

#[utoipa::path(
    post,
    path = "/api/crm/interactions/batch-delete",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_interactions_batchdelete() {}

#[utoipa::path(
    delete,
    path = "/api/crm/interactions/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_delete_api_crm_interactions_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/interactions/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_interactions_id() {}

#[utoipa::path(
    put,
    path = "/api/crm/interactions/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_put_api_crm_interactions_id() {}

#[utoipa::path(
    post,
    path = "/api/crm/opportunities/batch-delete",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_opportunities_batchdelete() {}

#[utoipa::path(
    get,
    path = "/api/crm/opportunities/forecast",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_opportunities_forecast() {}

#[utoipa::path(
    get,
    path = "/api/crm/opportunities/funnel",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_opportunities_funnel() {}

#[utoipa::path(
    get,
    path = "/api/crm/opportunities/stats",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_opportunities_stats() {}

#[utoipa::path(
    delete,
    path = "/api/crm/opportunities/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_delete_api_crm_opportunities_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/opportunities/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_opportunities_id() {}

#[utoipa::path(
    put,
    path = "/api/crm/opportunities/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_put_api_crm_opportunities_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/recommendations",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_recommendations() {}

#[utoipa::path(
    post,
    path = "/api/crm/recommendations",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_recommendations() {}

#[utoipa::path(
    get,
    path = "/api/crm/recommendations/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_recommendations_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/returns",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_returns() {}

#[utoipa::path(
    post,
    path = "/api/crm/returns",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_returns() {}

#[utoipa::path(
    delete,
    path = "/api/crm/returns/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_delete_api_crm_returns_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/returns/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_returns_id() {}

#[utoipa::path(
    put,
    path = "/api/crm/returns/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_put_api_crm_returns_id() {}

#[utoipa::path(
    post,
    path = "/api/crm/returns/{id}/approve",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_returns_id_approve() {}

#[utoipa::path(
    post,
    path = "/api/crm/returns/{id}/cancel",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_returns_id_cancel() {}

#[utoipa::path(
    post,
    path = "/api/crm/returns/{id}/complete",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_returns_id_complete() {}

#[utoipa::path(
    get,
    path = "/api/crm/returns/{id}/finance-status",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_returns_id_financestatus() {}

#[utoipa::path(
    get,
    path = "/api/crm/returns/{id}/inventory-status",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_returns_id_inventorystatus() {}

#[utoipa::path(
    get,
    path = "/api/crm/returns/{id}/items",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_returns_id_items() {}

#[utoipa::path(
    post,
    path = "/api/crm/returns/{id}/items",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_returns_id_items() {}

#[utoipa::path(
    post,
    path = "/api/crm/returns/{id}/receive",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_returns_id_receive() {}

#[utoipa::path(
    post,
    path = "/api/crm/returns/{id}/reject",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_returns_id_reject() {}

#[utoipa::path(
    get,
    path = "/api/crm/sales-forecast",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_salesforecast() {}

#[utoipa::path(
    post,
    path = "/api/crm/sales-forecast",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_salesforecast() {}

#[utoipa::path(
    post,
    path = "/api/crm/sales-forecast/generate",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_salesforecast_generate() {}

#[utoipa::path(
    delete,
    path = "/api/crm/sales-forecast/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_delete_api_crm_salesforecast_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/sales-forecast/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_salesforecast_id() {}

#[utoipa::path(
    put,
    path = "/api/crm/sales-forecast/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_put_api_crm_salesforecast_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/segments",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_segments() {}

#[utoipa::path(
    post,
    path = "/api/crm/segments",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_segments() {}

#[utoipa::path(
    get,
    path = "/api/crm/segments/auto",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_segments_auto() {}

#[utoipa::path(
    delete,
    path = "/api/crm/segments/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_delete_api_crm_segments_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/segments/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_segments_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/segments/{id}/customers",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_segments_id_customers() {}

#[utoipa::path(
    get,
    path = "/api/crm/tags",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_tags() {}

#[utoipa::path(
    post,
    path = "/api/crm/tags",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_tags() {}

#[utoipa::path(
    delete,
    path = "/api/crm/tags/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_delete_api_crm_tags_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/tags/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_tags_id() {}

#[utoipa::path(
    put,
    path = "/api/crm/tags/{id}",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_put_api_crm_tags_id() {}

#[utoipa::path(
    get,
    path = "/api/crm/tags/{id}/customers",
    tag = "CRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_tags_id_customers() {}
#[utoipa::path(
    get,
    path = "/api/crm/customers/{customerId}/finance",
    tag = "CRM-Compat",
    params(("customerId" = String, Path, description = "customerId")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_customers_customerid_finance() {}

#[utoipa::path(
    put,
    path = "/api/crm/customers/{customerId}/finance",
    tag = "CRM-Compat",
    params(("customerId" = String, Path, description = "customerId")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_put_api_crm_customers_customerid_finance() {}

#[utoipa::path(
    get,
    path = "/api/crm/invoices/{invoiceId}",
    tag = "CRM-Compat",
    params(("invoiceId" = String, Path, description = "invoiceId")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_invoices_invoiceid() {}

#[utoipa::path(
    post,
    path = "/api/crm/invoices",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_invoices() {}

#[utoipa::path(
    put,
    path = "/api/crm/invoices/{invoiceId}",
    tag = "CRM-Compat",
    params(("invoiceId" = String, Path, description = "invoiceId")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_put_api_crm_invoices_invoiceid() {}

#[utoipa::path(
    delete,
    path = "/api/crm/invoices/{invoiceId}",
    tag = "CRM-Compat",
    params(("invoiceId" = String, Path, description = "invoiceId")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_delete_api_crm_invoices_invoiceid() {}

#[utoipa::path(
    post,
    path = "/api/crm/invoices/{invoiceId}/issue",
    tag = "CRM-Compat",
    params(("invoiceId" = String, Path, description = "invoiceId")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_invoices_invoiceid_issue() {}

#[utoipa::path(
    post,
    path = "/api/crm/invoices/{invoiceId}/cancel",
    tag = "CRM-Compat",
    params(("invoiceId" = String, Path, description = "invoiceId")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_invoices_invoiceid_cancel() {}

#[utoipa::path(
    post,
    path = "/api/crm/invoices/{invoiceId}/red-flush",
    tag = "CRM-Compat",
    params(("invoiceId" = String, Path, description = "invoiceId")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_invoices_invoiceid_red_flush() {}

#[utoipa::path(
    get,
    path = "/api/crm/collections/{recordId}",
    tag = "CRM-Compat",
    params(("recordId" = String, Path, description = "recordId")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_collections_recordid() {}

#[utoipa::path(
    post,
    path = "/api/crm/collections",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_collections() {}

#[utoipa::path(
    post,
    path = "/api/crm/collections/{recordId}/confirm",
    tag = "CRM-Compat",
    params(("recordId" = String, Path, description = "recordId")),
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_collections_recordid_confirm() {}

#[utoipa::path(
    post,
    path = "/api/crm/collections/batch-confirm",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_post_api_crm_collections_batch_confirm() {}

#[utoipa::path(
    get,
    path = "/api/crm/reports/receivable-aging",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_reports_receivable_aging() {}

#[utoipa::path(
    get,
    path = "/api/crm/reports/receivable-summary",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_reports_receivable_summary() {}

#[utoipa::path(
    get,
    path = "/api/crm/reports/overdue-receivables",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_reports_overdue_receivables() {}

#[utoipa::path(
    get,
    path = "/api/crm/invoices/export",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_invoices_export() {}

#[utoipa::path(
    get,
    path = "/api/crm/collections/export",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_collections_export() {}

#[utoipa::path(
    get,
    path = "/api/crm/reports/receivable-aging/export",
    tag = "CRM-Compat",
    responses((status = 200, description = "CRM compatibility endpoint"))
)]
pub async fn compat_get_api_crm_reports_receivable_aging_export() {}

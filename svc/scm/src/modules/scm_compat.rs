//! SCM compatibility OpenAPI paths.
//!
//! These functions are OpenAPI-only contract entries for frontend
//! `/api/scm/*` calls that are not represented by concrete utoipa
//! handlers yet. They do not alter runtime routing behavior.

#[utoipa::path(
    get,
    path = "/api/scm/{resource}",
    tag = "SCM-Compat",
    params(("resource" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_resource() {}

#[utoipa::path(
    post,
    path = "/api/scm/{resource}",
    tag = "SCM-Compat",
    params(("resource" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_resource() {}

#[utoipa::path(
    delete,
    path = "/api/scm/{resource}/{id}",
    tag = "SCM-Compat",
    params(("resource" = String, Path, description = "路径参数"), ("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_delete_resource_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/{resource}/{id}",
    tag = "SCM-Compat",
    params(("resource" = String, Path, description = "路径参数"), ("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_resource_id() {}

#[utoipa::path(
    put,
    path = "/api/scm/{resource}/{id}",
    tag = "SCM-Compat",
    params(("resource" = String, Path, description = "路径参数"), ("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_put_resource_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/audit-logs",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_audit_logs() {}

#[utoipa::path(
    get,
    path = "/api/scm/audit-logs/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_audit_logs_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/comparisons",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_comparisons() {}

#[utoipa::path(
    post,
    path = "/api/scm/comparisons",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_comparisons() {}

#[utoipa::path(
    delete,
    path = "/api/scm/comparisons/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_delete_comparisons_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/comparisons/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_comparisons_id() {}

#[utoipa::path(
    put,
    path = "/api/scm/comparisons/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_put_comparisons_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/dashboard/overview",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_dashboard_overview() {}

#[utoipa::path(
    get,
    path = "/api/scm/dashboard/purchase-inbound-outbound",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_dashboard_purchase_inbound_outbound() {}

#[utoipa::path(
    get,
    path = "/api/scm/dashboard/supplier-performance",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_dashboard_supplier_performance() {}

#[utoipa::path(
    get,
    path = "/api/scm/delivery-appointments",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_delivery_appointments() {}

#[utoipa::path(
    post,
    path = "/api/scm/delivery-appointments",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_delivery_appointments() {}

#[utoipa::path(
    delete,
    path = "/api/scm/delivery-appointments/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_delete_delivery_appointments_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/delivery-appointments/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_delivery_appointments_id() {}

#[utoipa::path(
    put,
    path = "/api/scm/delivery-appointments/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_put_delivery_appointments_id() {}

#[utoipa::path(
    post,
    path = "/api/scm/delivery-appointments/{id}/approve",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_delivery_appointments_id_approve() {}

#[utoipa::path(
    post,
    path = "/api/scm/delivery-appointments/{id}/cancel",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_delivery_appointments_id_cancel() {}

#[utoipa::path(
    post,
    path = "/api/scm/delivery-appointments/{id}/complete",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_delivery_appointments_id_complete() {}

#[utoipa::path(
    post,
    path = "/api/scm/delivery-appointments/{id}/confirm-arrival",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_delivery_appointments_id_confirm_arrival() {}

#[utoipa::path(
    post,
    path = "/api/scm/delivery-appointments/{id}/reject",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_delivery_appointments_id_reject() {}

#[utoipa::path(
    get,
    path = "/api/scm/delivery-appointments/stats",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_delivery_appointments_stats() {}

#[utoipa::path(
    get,
    path = "/api/scm/evaluations",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_evaluations() {}

#[utoipa::path(
    post,
    path = "/api/scm/evaluations",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_evaluations() {}

#[utoipa::path(
    delete,
    path = "/api/scm/evaluations/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_delete_evaluations_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/evaluations/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_evaluations_id() {}

#[utoipa::path(
    put,
    path = "/api/scm/evaluations/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_put_evaluations_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/health",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_health() {}

#[utoipa::path(
    get,
    path = "/api/scm/incoming-inspections",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_incoming_inspections() {}

#[utoipa::path(
    post,
    path = "/api/scm/incoming-inspections",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_incoming_inspections() {}

#[utoipa::path(
    delete,
    path = "/api/scm/incoming-inspections/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_delete_incoming_inspections_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/incoming-inspections/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_incoming_inspections_id() {}

#[utoipa::path(
    put,
    path = "/api/scm/incoming-inspections/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_put_incoming_inspections_id() {}

#[utoipa::path(
    post,
    path = "/api/scm/incoming-inspections/{id}/pass",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_incoming_inspections_id_pass() {}

#[utoipa::path(
    post,
    path = "/api/scm/incoming-inspections/{id}/reject",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_incoming_inspections_id_reject() {}

#[utoipa::path(
    get,
    path = "/api/scm/incoming-inspections/{inspectionId}/records",
    tag = "SCM-Compat",
    params(("inspectionId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_incoming_inspections_inspectionid_records() {}

#[utoipa::path(
    post,
    path = "/api/scm/inspection-records",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_inspection_records() {}

#[utoipa::path(
    delete,
    path = "/api/scm/inspection-records/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_delete_inspection_records_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/inspection-records/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_inspection_records_id() {}

#[utoipa::path(
    put,
    path = "/api/scm/inspection-records/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_put_inspection_records_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/inventory-turnover",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_inventory_turnover() {}

#[utoipa::path(
    get,
    path = "/api/scm/inventory-turnover/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_inventory_turnover_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/inventory-turnover/abc-classification",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_inventory_turnover_abc_classification() {}

#[utoipa::path(
    get,
    path = "/api/scm/inventory-turnover/trend",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_inventory_turnover_trend() {}

#[utoipa::path(
    get,
    path = "/api/scm/mrp-suggestions",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_mrp_suggestions() {}

#[utoipa::path(
    get,
    path = "/api/scm/mrp-suggestions/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_mrp_suggestions_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/mrp-suggestions/summary",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_mrp_suggestions_summary() {}

#[utoipa::path(
    get,
    path = "/api/scm/mrp/suggestions",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_mrp_suggestions_2() {}

#[utoipa::path(
    post,
    path = "/api/scm/mrp/suggestions",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_mrp_suggestions() {}

#[utoipa::path(
    delete,
    path = "/api/scm/mrp/suggestions/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_delete_mrp_suggestions_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/mrp/suggestions/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_mrp_suggestions_id_2() {}

#[utoipa::path(
    put,
    path = "/api/scm/mrp/suggestions/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_put_mrp_suggestions_id() {}

#[utoipa::path(
    post,
    path = "/api/scm/mrp/suggestions/{id}/confirm",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_mrp_suggestions_id_confirm() {}

#[utoipa::path(
    get,
    path = "/api/scm/purchase-contracts",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_purchase_contracts() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-contracts",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_contracts() {}

#[utoipa::path(
    delete,
    path = "/api/scm/purchase-contracts/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_delete_purchase_contracts_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/purchase-contracts/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_purchase_contracts_id() {}

#[utoipa::path(
    put,
    path = "/api/scm/purchase-contracts/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_put_purchase_contracts_id() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-contracts/{id}/approve",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_contracts_id_approve() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-contracts/{id}/cancel",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_contracts_id_cancel() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-contracts/{id}/reject",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_contracts_id_reject() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-contracts/{id}/renew",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_contracts_id_renew() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-contracts/{id}/submit",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_contracts_id_submit() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-contracts/{id}/terminate",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_contracts_id_terminate() {}

#[utoipa::path(
    get,
    path = "/api/scm/purchase-items",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_purchase_items() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-items",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_items() {}

#[utoipa::path(
    get,
    path = "/api/scm/purchase-items/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_purchase_items_id() {}

#[utoipa::path(
    put,
    path = "/api/scm/purchase-items/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_put_purchase_items_id() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-orders/{id}/cancel",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_orders_id_cancel() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-orders/{id}/close",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_orders_id_close() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-orders/{id}/confirm",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_orders_id_confirm() {}

#[utoipa::path(
    get,
    path = "/api/scm/purchase-requisitions",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_purchase_requisitions() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-requisitions",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_requisitions() {}

#[utoipa::path(
    delete,
    path = "/api/scm/purchase-requisitions/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_delete_purchase_requisitions_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/purchase-requisitions/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_purchase_requisitions_id() {}

#[utoipa::path(
    put,
    path = "/api/scm/purchase-requisitions/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_put_purchase_requisitions_id() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-requisitions/{id}/approve",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_requisitions_id_approve() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-requisitions/{id}/cancel",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_requisitions_id_cancel() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-requisitions/{id}/convert-to-order",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_requisitions_id_convert_to_order() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-requisitions/{id}/reject",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_requisitions_id_reject() {}

#[utoipa::path(
    post,
    path = "/api/scm/purchase-requisitions/{id}/submit",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_purchase_requisitions_id_submit() {}

#[utoipa::path(
    get,
    path = "/api/scm/quotes",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_quotes() {}

#[utoipa::path(
    post,
    path = "/api/scm/quotes",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_quotes() {}

#[utoipa::path(
    get,
    path = "/api/scm/supplier-admissions",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_supplier_admissions() {}

#[utoipa::path(
    post,
    path = "/api/scm/supplier-admissions",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_supplier_admissions() {}

#[utoipa::path(
    delete,
    path = "/api/scm/supplier-admissions/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_delete_supplier_admissions_id() {}

#[utoipa::path(
    get,
    path = "/api/scm/supplier-admissions/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_supplier_admissions_id() {}

#[utoipa::path(
    put,
    path = "/api/scm/supplier-admissions/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_put_supplier_admissions_id() {}

#[utoipa::path(
    post,
    path = "/api/scm/supplier-admissions/{id}/activate-supplier",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_supplier_admissions_id_activate_supplier() {}

#[utoipa::path(
    post,
    path = "/api/scm/supplier-admissions/{id}/approve",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_supplier_admissions_id_approve() {}

#[utoipa::path(
    post,
    path = "/api/scm/supplier-admissions/{id}/audit",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_supplier_admissions_id_audit() {}

#[utoipa::path(
    post,
    path = "/api/scm/supplier-admissions/{id}/reject",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_supplier_admissions_id_reject() {}

#[utoipa::path(
    post,
    path = "/api/scm/supplier-admissions/{id}/submit",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_supplier_admissions_id_submit() {}

#[utoipa::path(
    get,
    path = "/api/scm/sync-records",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_sync_records() {}

#[utoipa::path(
    post,
    path = "/api/scm/sync-records",
    tag = "SCM-Compat",
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_sync_records() {}

#[utoipa::path(
    get,
    path = "/api/scm/sync-records/{id}",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_sync_records_id() {}

#[utoipa::path(
    post,
    path = "/api/scm/sync-records/{id}/retry",
    tag = "SCM-Compat",
    params(("id" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_sync_records_id_retry() {}

#[utoipa::path(
    get,
    path = "/api/scm/sync-records/{syncId}/details",
    tag = "SCM-Compat",
    params(("syncId" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_get_sync_records_syncid_details() {}

#[utoipa::path(
    post,
    path = "/api/scm/sync/srm/{syncType}",
    tag = "SCM-Compat",
    params(("syncType" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_sync_srm_synctype() {}

#[utoipa::path(
    post,
    path = "/api/scm/sync/wms/{syncType}",
    tag = "SCM-Compat",
    params(("syncType" = String, Path, description = "路径参数")),
    responses((status = 200, description = "SCM compatibility endpoint"))
)]
pub async fn compat_post_sync_wms_synctype() {}

// ===== SCM-Compat: missing purchase-orders & suppliers endpoints (path prefix mismatch) =====

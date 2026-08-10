#![allow(dead_code, clippy::empty_loop)]

//! SRM compatibility OpenAPI paths.
//!
//! OpenAPI-only contract entries for frontend `/api/srm/*` calls
//! not represented by concrete utoipa handlers yet.

// === Supplier Evaluations ===

#[utoipa::path(
    get,
    path = "/api/srm/supplier-evaluations",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_supplier_evaluations() {}

#[utoipa::path(
    get,
    path = "/api/srm/supplier-evaluations/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_supplier_evaluations_id() {}

#[utoipa::path(
    post,
    path = "/api/srm/supplier-evaluations",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_supplier_evaluations() {}

#[utoipa::path(
    put,
    path = "/api/srm/supplier-evaluations/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_put_api_srm_supplier_evaluations_id() {}

#[utoipa::path(
    delete,
    path = "/api/srm/supplier-evaluations/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_delete_api_srm_supplier_evaluations_id() {}

// === Purchase Orders ===

#[utoipa::path(
    get,
    path = "/api/srm/purchase-orders",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_purchase_orders() {}

#[utoipa::path(
    get,
    path = "/api/srm/purchase-orders/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_purchase_orders_id() {}

#[utoipa::path(
    post,
    path = "/api/srm/purchase-orders",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_purchase_orders() {}

#[utoipa::path(
    put,
    path = "/api/srm/purchase-orders/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_put_api_srm_purchase_orders_id() {}

#[utoipa::path(
    delete,
    path = "/api/srm/purchase-orders/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_delete_api_srm_purchase_orders_id() {}

// === Supplier Contracts ===

#[utoipa::path(
    get,
    path = "/api/srm/supplier-contracts",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_supplier_contracts() {}

#[utoipa::path(
    get,
    path = "/api/srm/supplier-contracts/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_supplier_contracts_id() {}

#[utoipa::path(
    post,
    path = "/api/srm/supplier-contracts",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_supplier_contracts() {}

#[utoipa::path(
    put,
    path = "/api/srm/supplier-contracts/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_put_api_srm_supplier_contracts_id() {}

#[utoipa::path(
    delete,
    path = "/api/srm/supplier-contracts/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_delete_api_srm_supplier_contracts_id() {}

// === Statistics ===

#[utoipa::path(
    get,
    path = "/api/srm/statistics",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_statistics() {}

#[utoipa::path(
    get,
    path = "/api/srm/statistics/detailed",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_statistics_detailed() {}

#[utoipa::path(
    get,
    path = "/api/srm/suppliers-with-stats",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_suppliers_with_stats() {}

// === Scoring Dimensions ===

#[utoipa::path(
    get,
    path = "/api/srm/scoring-dimensions",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_scoring_dimensions() {}

#[utoipa::path(
    get,
    path = "/api/srm/scoring-dimensions/active",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_scoring_dimensions_active() {}

#[utoipa::path(
    get,
    path = "/api/srm/scoring-dimensions/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_scoring_dimensions_id() {}

#[utoipa::path(
    post,
    path = "/api/srm/scoring-dimensions",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_scoring_dimensions() {}

#[utoipa::path(
    put,
    path = "/api/srm/scoring-dimensions/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_put_api_srm_scoring_dimensions_id() {}

#[utoipa::path(
    delete,
    path = "/api/srm/scoring-dimensions/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_delete_api_srm_scoring_dimensions_id() {}

// === Performance ===

#[utoipa::path(
    get,
    path = "/api/srm/performance/reports",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_performance_reports() {}

#[utoipa::path(
    get,
    path = "/api/srm/performance/reports/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_performance_reports_id() {}

#[utoipa::path(
    get,
    path = "/api/srm/performance/summary",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_performance_summary() {}

#[utoipa::path(
    get,
    path = "/api/srm/performance/score-level-distribution",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_performance_score_level_distribution() {}

#[utoipa::path(
    get,
    path = "/api/srm/performance/top-suppliers",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_performance_top_suppliers() {}

#[utoipa::path(
    get,
    path = "/api/srm/performance/trend",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_performance_trend() {}

#[utoipa::path(
    get,
    path = "/api/srm/performance/compare",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_performance_compare() {}

// === Health ===

#[utoipa::path(
    get,
    path = "/api/srm/health",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_health() {}

// === Supplier Portal ===

#[utoipa::path(
    get,
    path = "/api/srm/supplier-portal/{supplierId}/stats",
    tag = "SRM-Compat",
    params(("supplierId" = String, Path, description = "supplierId")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_supplier_portal_supplierid_stats() {}

#[utoipa::path(
    get,
    path = "/api/srm/supplier-portal/{supplierId}/orders",
    tag = "SRM-Compat",
    params(("supplierId" = String, Path, description = "supplierId")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_supplier_portal_supplierid_orders() {}

#[utoipa::path(
    get,
    path = "/api/srm/supplier-portal/{supplierId}/invoices",
    tag = "SRM-Compat",
    params(("supplierId" = String, Path, description = "supplierId")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_supplier_portal_supplierid_invoices() {}

#[utoipa::path(
    get,
    path = "/api/srm/supplier-portal/{supplierId}/deliveries",
    tag = "SRM-Compat",
    params(("supplierId" = String, Path, description = "supplierId")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_supplier_portal_supplierid_deliveries() {}

#[utoipa::path(
    get,
    path = "/api/srm/supplier-portal/announcements",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_supplier_portal_announcements() {}

// === Inquiries ===

#[utoipa::path(
    get,
    path = "/api/srm/inquiries",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_inquiries() {}

#[utoipa::path(
    get,
    path = "/api/srm/inquiries/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_inquiries_id() {}

#[utoipa::path(
    post,
    path = "/api/srm/inquiries",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_inquiries() {}

#[utoipa::path(
    put,
    path = "/api/srm/inquiries/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_put_api_srm_inquiries_id() {}

#[utoipa::path(
    delete,
    path = "/api/srm/inquiries/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_delete_api_srm_inquiries_id() {}

#[utoipa::path(
    post,
    path = "/api/srm/inquiries/{id}/publish",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_inquiries_id_publish() {}

#[utoipa::path(
    post,
    path = "/api/srm/inquiries/{id}/close",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_inquiries_id_close() {}

// === Quotations ===

#[utoipa::path(
    get,
    path = "/api/srm/quotations/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_quotations_id() {}

#[utoipa::path(
    post,
    path = "/api/srm/quotations",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_quotations() {}

#[utoipa::path(
    put,
    path = "/api/srm/quotations/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_put_api_srm_quotations_id() {}

#[utoipa::path(
    post,
    path = "/api/srm/quotations/{id}/award",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_quotations_id_award() {}

#[utoipa::path(
    post,
    path = "/api/srm/quotations/{id}/reject",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_quotations_id_reject() {}

// === Biddings ===

#[utoipa::path(
    get,
    path = "/api/srm/biddings",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_biddings() {}

#[utoipa::path(
    get,
    path = "/api/srm/biddings/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_biddings_id() {}

#[utoipa::path(
    post,
    path = "/api/srm/biddings",
    tag = "SRM-Compat",
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_biddings() {}

#[utoipa::path(
    put,
    path = "/api/srm/biddings/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_put_api_srm_biddings_id() {}

#[utoipa::path(
    delete,
    path = "/api/srm/biddings/{id}",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_delete_api_srm_biddings_id() {}

#[utoipa::path(
    post,
    path = "/api/srm/biddings/{id}/publish",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_biddings_id_publish() {}

#[utoipa::path(
    post,
    path = "/api/srm/biddings/{id}/open",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_biddings_id_open() {}

#[utoipa::path(
    post,
    path = "/api/srm/biddings/{id}/evaluate",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_biddings_id_evaluate() {}

#[utoipa::path(
    post,
    path = "/api/srm/biddings/{id}/award",
    tag = "SRM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_post_api_srm_biddings_id_award() {}

#[utoipa::path(
    get,
    path = "/api/srm/biddings/{biddingId}/suppliers",
    tag = "SRM-Compat",
    params(("biddingId" = String, Path, description = "biddingId")),
    responses((status = 200, description = "SRM compatibility endpoint"))
)]
pub async fn compat_get_api_srm_biddings_biddingid_suppliers() {}

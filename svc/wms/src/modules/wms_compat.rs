//! WMS compatibility OpenAPI paths.
//!
//! OpenAPI-only contract entries for frontend `/api/wms/*` calls
//! not represented by concrete utoipa handlers yet.

#![allow(dead_code, clippy::empty_loop)]

#[utoipa::path(
    get,
    path = "/api/wms/audit-logs/modules",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_audit_logs_modules() {}

#[utoipa::path(
    get,
    path = "/api/wms/batches/expiring-soon",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_batches_expiring_soon() {}

#[utoipa::path(
    get,
    path = "/api/wms/batches/expired",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_batches_expired() {}

#[utoipa::path(
    post,
    path = "/api/wms/batches/{id}/adjust-quantity",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_batches_id_adjust_quantity() {}

#[utoipa::path(
    post,
    path = "/api/wms/batches/{id}/transfer-location",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_batches_id_transfer_location() {}

#[utoipa::path(
    get,
    path = "/api/wms/dashboard",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_dashboard() {}

#[utoipa::path(
    get,
    path = "/api/wms/smart-replenishment/suggestions",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_smart_replenishment_suggestions() {}

#[utoipa::path(
    get,
    path = "/api/wms/smart-replenishment/suggestions/{id}",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_smart_replenishment_suggestions_id() {}

#[utoipa::path(
    post,
    path = "/api/wms/smart-replenishment/suggestions/generate",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_smart_replenishment_suggestions_generate() {}

#[utoipa::path(
    get,
    path = "/api/wms/smart-replenishment/statistics",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_smart_replenishment_statistics() {}

#[utoipa::path(
    get,
    path = "/api/wms/smart-replenishment/orders",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_smart_replenishment_orders() {}

#[utoipa::path(
    get,
    path = "/api/wms/smart-replenishment/orders/{id}",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_smart_replenishment_orders_id() {}

#[utoipa::path(
    post,
    path = "/api/wms/smart-replenishment/orders",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_smart_replenishment_orders() {}

#[utoipa::path(
    put,
    path = "/api/wms/smart-replenishment/orders/{id}",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_put_api_wms_smart_replenishment_orders_id() {}

#[utoipa::path(
    delete,
    path = "/api/wms/smart-replenishment/orders/{id}",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_delete_api_wms_smart_replenishment_orders_id() {}

#[utoipa::path(
    get,
    path = "/api/wms/smart-replenishment/orders/{order_id}/items",
    tag = "WMS-Compat",
    params(("order_id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_smart_replenishment_orders_order_id_items() {}

#[utoipa::path(
    post,
    path = "/api/wms/smart-replenishment/orders/{id}/confirm",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_smart_replenishment_orders_id_confirm() {}

#[utoipa::path(
    post,
    path = "/api/wms/smart-replenishment/orders/{id}/complete",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_smart_replenishment_orders_id_complete() {}

#[utoipa::path(
    get,
    path = "/api/wms/smart-replenishment/safety-stock",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_smart_replenishment_safety_stock() {}

#[utoipa::path(
    get,
    path = "/api/wms/smart-replenishment/safety-stock/{id}",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_smart_replenishment_safety_stock_id() {}

#[utoipa::path(
    put,
    path = "/api/wms/smart-replenishment/safety-stock/{id}",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_put_api_wms_smart_replenishment_safety_stock_id() {}

#[utoipa::path(
    post,
    path = "/api/wms/smart-replenishment/safety-stock/batch-update",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_smart_replenishment_safety_stock_batch_update() {}

#[utoipa::path(
    post,
    path = "/api/wms/smart-replenishment/safety-stock/calculate",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_smart_replenishment_safety_stock_calculate() {}

#[utoipa::path(
    get,
    path = "/api/wms/serial-numbers/by-serial/{serialNo}",
    tag = "WMS-Compat",
    params(("serialNo" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_serial_numbers_by_serial_serialno() {}

#[utoipa::path(
    get,
    path = "/api/wms/serial-numbers/by-batch/{batchNo}",
    tag = "WMS-Compat",
    params(("batchNo" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_serial_numbers_by_batch_batchno() {}

#[utoipa::path(
    post,
    path = "/api/wms/serial-numbers/{id}/transfer-location",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_serial_numbers_id_transfer_location() {}

#[utoipa::path(
    get,
    path = "/api/wms/serial-numbers/{id}/trace",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_serial_numbers_id_trace() {}

#[utoipa::path(
    get,
    path = "/api/wms/sync-records",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_sync_records() {}

#[utoipa::path(
    get,
    path = "/api/wms/sync-records/{id}",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_sync_records_id() {}

#[utoipa::path(
    get,
    path = "/api/wms/sync-records/{sync_record_id}/items",
    tag = "WMS-Compat",
    params(("sync_record_id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_sync_records_sync_record_id_items() {}

#[utoipa::path(
    post,
    path = "/api/wms/sync-records/{id}/retry",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_sync_records_id_retry() {}

#[utoipa::path(
    post,
    path = "/api/wms/sync-records/{id}/retry-items",
    tag = "WMS-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_sync_records_id_retry_items() {}

#[utoipa::path(
    get,
    path = "/api/wms/sync-records/statistics",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_get_api_wms_sync_records_statistics() {}

#[utoipa::path(
    post,
    path = "/api/wms/sync/scm",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_sync_scm() {}

#[utoipa::path(
    post,
    path = "/api/wms/sync/scm/inventory",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_sync_scm_inventory() {}

#[utoipa::path(
    post,
    path = "/api/wms/sync/scm/orders",
    tag = "WMS-Compat",
    responses((status = 200, description = "WMS compatibility endpoint"))
)]
pub async fn compat_post_api_wms_sync_scm_orders() {}

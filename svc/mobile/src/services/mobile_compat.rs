#![allow(dead_code, clippy::empty_loop)]

//! Mobile compatibility OpenAPI paths.
//!
//! OpenAPI-only contract entries for frontend `/api/mobile/*` calls
//! not represented by concrete utoipa handlers yet.

#[utoipa::path(
    get,
    path = "/api/mobile/mobile/dashboard/stats",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_get_api_mobile_mobile_dashboard_stats() {}

#[utoipa::path(
    get,
    path = "/api/mobile/mobile/workbench",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_get_api_mobile_mobile_workbench() {}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile/patrol-records",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_mobile_patrol_records() {}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile/scan-records",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_mobile_scan_records() {}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile/scan",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_mobile_scan() {}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile/photo-evidences",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_mobile_photo_evidences() {}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile/audio-recordings",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_mobile_audio_recordings() {}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile/video-recordings",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_mobile_video_recordings() {}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile/mobile-tasks",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_mobile_mobile_tasks() {}

#[utoipa::path(
    put,
    path = "/api/mobile/mobile/mobile-tasks/{id}/status",
    tag = "Mobile-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_put_api_mobile_mobile_mobile_tasks_param_status() {}

#[utoipa::path(
    get,
    path = "/api/mobile/attendance/stats",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_get_api_mobile_attendance_stats() {}

#[utoipa::path(
    post,
    path = "/api/mobile/attendance/check-in",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_attendance_check_in() {}

#[utoipa::path(
    post,
    path = "/api/mobile/attendance/check-out",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_attendance_check_out() {}

#[utoipa::path(
    post,
    path = "/api/mobile/attendance/leaves",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_attendance_leaves() {}

#[utoipa::path(
    get,
    path = "/api/mobile/mobile/inventory/items/{id}",
    tag = "Mobile-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_get_api_mobile_mobile_inventory_items_param() {}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile/inventory/stocktake/{taskId}/records",
    tag = "Mobile-Compat",
    params(("taskId" = String, Path, description = "taskId")),
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_mobile_inventory_stocktake_param_records() {}

#[utoipa::path(
    get,
    path = "/api/mobile/mobile/quality/tasks/{id}",
    tag = "Mobile-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_get_api_mobile_mobile_quality_tasks_param() {}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile/quality/defects",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_mobile_quality_defects() {}

#[utoipa::path(
    put,
    path = "/api/mobile/mobile/quality/tasks/{id}/status",
    tag = "Mobile-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_put_api_mobile_mobile_quality_tasks_param_status() {}

#[utoipa::path(
    get,
    path = "/api/mobile/mobile/production/orders/{id}",
    tag = "Mobile-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_get_api_mobile_mobile_production_orders_param() {}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile/production/work-reports",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_mobile_production_work_reports() {}

#[utoipa::path(
    put,
    path = "/api/mobile/mobile/push/templates/{id}",
    tag = "Mobile-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_put_api_mobile_mobile_push_templates_param() {}

#[utoipa::path(
    get,
    path = "/api/mobile/mobile/offline/sync-status",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_get_api_mobile_mobile_offline_sync_status() {}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile/offline/sync",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_post_api_mobile_mobile_offline_sync() {}

#[utoipa::path(
    get,
    path = "/api/mobile/health",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_get_api_mobile_health() {}

#[utoipa::path(
    get,
    path = "/api/mobile/mobile/push/config",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_get_api_mobile_mobile_push_config() {}

#[utoipa::path(
    put,
    path = "/api/mobile/mobile/push/config",
    tag = "Mobile-Compat",
    responses((status = 200, description = "Mobile compatibility endpoint"))
)]
pub async fn compat_put_api_mobile_mobile_push_config() {}

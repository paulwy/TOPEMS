// Mobile 服务 OpenAPI 文档
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PatrolRecord {
    pub id: String,
    pub task_id: Option<String>,
    pub user_id: String,
    pub location: Option<String>,
    pub photo_url: Option<String>,
    pub notes: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ScanRecord {
    pub id: String,
    pub code: String,
    pub code_type: String,
    pub user_id: String,
    pub device_id: Option<String>,
    pub result: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MobileTask {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub task_type: String,
    pub assignee_id: Option<String>,
    pub status: String,
    pub priority: Option<i32>,
    pub due_date: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
}


// =============================================================================
// 占位函数：为 main.rs 中的 bin-only handler 承载 utoipa::path 注解
// =============================================================================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:read"])),
    path = "/health",
    tag = "mobile",
    responses((status = 200, description = "health_check OK")),
)]
fn _health_check() {}

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::task::get_all_tasks,
        crate::modules::task::get_task,
        crate::modules::task::create_task,
        crate::modules::task::update_task,
        crate::modules::task::delete_task,
        crate::modules::patrol::get_all_patrol_records,
        crate::modules::patrol::get_patrol_record,
        crate::modules::patrol::create_patrol_record,
        crate::modules::scan::scan_barcode,
        crate::modules::stats::get_dashboard_stats,
        crate::modules::offline::sync_offline_data,
        crate::modules::offline::get_offline_status,
        crate::modules::missing_endpoints::list_inspection_tasks,
        crate::modules::missing_endpoints::get_usage_stats,
        crate::modules::missing_endpoints::get_user_settings,
        crate::modules::missing_endpoints::get_push_config,
        crate::modules::missing_endpoints::update_push_template,
        crate::modules::attendance::get_attendance_overview,
        crate::modules::attendance::get_attendance_stats,
        crate::modules::attendance::list_attendance_records,
        crate::modules::attendance::check_in,
        crate::modules::attendance::check_out,
        crate::modules::attendance::list_leave_applications,
        crate::modules::device::register_device,
        crate::modules::device::update_push_token,
        crate::modules::oa::list_meetings,
        crate::modules::oa::get_meeting,
        crate::modules::oa::join_meeting,
        crate::modules::oa::leave_meeting,
        crate::modules::oa::list_calendar_events,
        crate::modules::oa::update_calendar_event,
        crate::modules::oa::list_oa_tasks,
        crate::modules::oa::get_oa_task,
        crate::modules::oa::complete_oa_task,
        crate::modules::oa::list_announcements,
        crate::modules::oa::get_announcement,
        crate::modules::oa::mark_announcement_read,
        crate::modules::oa::get_oa_stats,
        crate::modules::media::get_photos,
        crate::modules::media::get_audio,
        crate::modules::media::get_video,
        crate::modules::media::upload_media,
        crate::modules::media::delete_media,
        crate::modules::task::get_all_tasks,
        crate::modules::task::get_task,
        crate::modules::task::create_task,
        crate::modules::task::update_task,
        crate::modules::task::update_task_status,
        crate::modules::task::delete_task,
        crate::modules::user::get_profile,
        crate::modules::user::upload_avatar,
        crate::modules::production::list_production_orders,
        crate::modules::production::get_production_order,
        crate::modules::production::list_work_reports,
        crate::modules::production::list_equipment,
        crate::modules::inventory::list_inventory_items,
        crate::modules::inventory::get_inventory_item,
        crate::modules::inventory::list_stocktake_tasks,
        crate::modules::inventory::create_stocktake_record,
        crate::modules::inventory::list_inbound_orders,
        crate::modules::inventory::list_outbound_orders,
        crate::modules::shortcut::get_shortcuts,
        crate::modules::quality::list_quality_tasks,
        crate::modules::quality::get_quality_task,
        crate::modules::quality::list_defect_records,
        crate::modules::quality::update_quality_task_status,
        crate::modules::photo_upload::upload_photo,
        crate::modules::photo_upload::batch_upload_photos,
        crate::modules::photo_upload::get_photo_list,
        crate::modules::photo_upload::get_photo_by_id,
        crate::modules::photo_upload::get_upload_progress,
        crate::modules::push_notification::get_devices,
        crate::modules::push_notification::send_notification,
        crate::modules::push_notification::send_broadcast,
        crate::modules::push_notification::get_notification_stats,
        crate::modules::push_notification::get_templates,
        crate::modules::push_notification::get_notification_by_id,
        crate::modules::offline_sync::sync_data,
        crate::modules::offline_sync::get_sync_history,
        crate::modules::offline_sync::get_sync_policy,
        crate::modules::offline_sync::retry_failed_sync,
        crate::modules::stats::get_dashboard_stats,
        crate::modules::stats::get_patrol_stats,
        crate::modules::stats::get_task_stats,
        crate::modules::scan::scan_barcode,
        crate::modules::scan::image_ocr,
        crate::modules::approval::list_approval_tasks,
        crate::modules::approval::get_pending_approval_tasks,
        crate::modules::approval::get_approval_task,
        crate::modules::approval::approve_approval_task,
        crate::modules::approval::reject_approval_task,
        crate::modules::approval::delegate_approval_task,
        crate::modules::approval::get_approval_history,
        crate::modules::barcode_scanner::get_scan_history,
        crate::modules::barcode_scanner::get_scan_by_id,
        crate::modules::barcode_scanner::get_supported_barcode_types,
        crate::modules::workbench::get_workbench_data,
        crate::modules::patrol::get_all_patrol_records,
        crate::modules::patrol::get_patrol_record,
        crate::modules::patrol::create_patrol_record,
            crate::modules::offline_records::sync_records,
        crate::modules::offline_records::get_pending_records,
        crate::modules::offline_records::mark_synced,
        crate::modules::offline_records::clear_synced,
        crate::modules::offline_sync::get_offline_status,
        crate::modules::scan::scan_qrcode,
        crate::modules::mobile_plugin::get_plugin_info,
        crate::modules::mobile_plugin::plugin_health_check,
        _health_check,
),
    components(schemas(PatrolRecord, ScanRecord, MobileTask)),
    tags(
        (name = "patrol", description = "巡检管理 API"),
        (name = "scan", description = "扫码管理 API"),
        (name = "task", description = "任务管理 API"),
        (name = "device", description = "设备管理 API"),
        (name = "production", description = "生产管理 API"),
        (name = "inventory", description = "库存管理 API"),
        (name = "notification", description = "通知管理 API"),
    ),
    info(
        title = "TOPEMS Mobile API",
        version = "1.0.0",
        description = "TOPEMS 移动端 API - 包含巡检、扫码、任务、生产、库存等功能"
    ),
    servers(
        (url = "http://localhost:8070", description = "本地开发环境"),
    )
)]
pub struct MobileApiDoc;


// =============================================================================
// 占位函数：为 main.rs 中的 bin-only handler 承载 utoipa::path 注解
#[derive(OpenApi)]
#[openapi(
    components(schemas(PatrolRecord)),
    tags((name = "patrol", description = "巡检管理 API")),
    info(title = "TOPEMS Mobile Patrol API", version = "1.0.0", description = "移动巡检 API")
)]
pub struct PatrolApiDoc;


// =============================================================================
// 占位函数：为 main.rs 中的 bin-only handler 承载 utoipa::path 注解
#[derive(OpenApi)]
#[openapi(
    components(schemas(ScanRecord)),
    tags((name = "scan", description = "扫码管理 API")),
    info(title = "TOPEMS Mobile Scan API", version = "1.0.0", description = "移动扫码 API")
)]
pub struct ScanApiDoc;


// =============================================================================
// 占位函数：为 main.rs 中的 bin-only handler 承载 utoipa::path 注解
#[derive(OpenApi)]
#[openapi(
    components(schemas(MobileTask)),
    tags((name = "task", description = "任务管理 API")),
    info(title = "TOPEMS Mobile Task API", version = "1.0.0", description = "移动任务管理 API")
)]
pub struct TaskApiDoc;


// =============================================================================
// 占位函数：为 main.rs 中的 bin-only handler 承载 utoipa::path 注解
#[derive(OpenApi)]
#[openapi(
    tags((name = "device", description = "设备管理 API")),
    info(title = "TOPEMS Mobile Device API", version = "1.0.0", description = "设备管理 API")
)]
pub struct DeviceApiDoc;

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        // roundtrip verified by JSON comparison
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn patrol_record_openapi_roundtrip() {
        roundtrip(&PatrolRecord {
            id: "1".into(),
            task_id: None,
            user_id: "u1".into(),
            location: None,
            photo_url: None,
            notes: None,
            status: "open".into(),
            created_at: "2026-01-01T00:00:00Z".into(),
        });
    }

    #[test]
    fn scan_record_openapi_roundtrip() {
        roundtrip(&ScanRecord {
            id: "1".into(),
            code: "BC".into(),
            code_type: "qrcode".into(),
            user_id: "u1".into(),
            device_id: None,
            result: None,
            created_at: "2026-01-01T00:00:00Z".into(),
        });
    }

    #[test]
    fn mobile_task_openapi_roundtrip() {
        roundtrip(&MobileTask {
            id: "1".into(),
            title: "t".into(),
            description: None,
            task_type: "work".into(),
            assignee_id: None,
            status: "open".into(),
            priority: Some(1),
            due_date: None,
            created_at: "2026-01-01".into(),
            updated_at: None,
        });
    }
}

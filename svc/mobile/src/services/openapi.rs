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
        // === mobile_compat (OpenAPI-only) ===
        crate::services::mobile_compat::compat_get_api_mobile_mobile_dashboard_stats,
        crate::services::mobile_compat::compat_get_api_mobile_mobile_workbench,
        crate::services::mobile_compat::compat_post_api_mobile_mobile_patrol_records,
        crate::services::mobile_compat::compat_post_api_mobile_mobile_scan_records,
        crate::services::mobile_compat::compat_post_api_mobile_mobile_scan,
        crate::services::mobile_compat::compat_post_api_mobile_mobile_photo_evidences,
        crate::services::mobile_compat::compat_post_api_mobile_mobile_audio_recordings,
        crate::services::mobile_compat::compat_post_api_mobile_mobile_video_recordings,
        crate::services::mobile_compat::compat_post_api_mobile_mobile_mobile_tasks,
        crate::services::mobile_compat::compat_put_api_mobile_mobile_mobile_tasks_param_status,
        crate::services::mobile_compat::compat_get_api_mobile_attendance_stats,
        crate::services::mobile_compat::compat_post_api_mobile_attendance_check_in,
        crate::services::mobile_compat::compat_post_api_mobile_attendance_check_out,
        crate::services::mobile_compat::compat_post_api_mobile_attendance_leaves,
        crate::services::mobile_compat::compat_get_api_mobile_mobile_inventory_items_param,
        crate::services::mobile_compat::compat_post_api_mobile_mobile_inventory_stocktake_param_records,
        crate::services::mobile_compat::compat_get_api_mobile_mobile_quality_tasks_param,
        crate::services::mobile_compat::compat_post_api_mobile_mobile_quality_defects,
        crate::services::mobile_compat::compat_put_api_mobile_mobile_quality_tasks_param_status,
        crate::services::mobile_compat::compat_get_api_mobile_mobile_production_orders_param,
        crate::services::mobile_compat::compat_post_api_mobile_mobile_production_work_reports,
        crate::services::mobile_compat::compat_put_api_mobile_mobile_push_templates_param,
        crate::services::mobile_compat::compat_get_api_mobile_mobile_offline_sync_status,
        crate::services::mobile_compat::compat_post_api_mobile_mobile_offline_sync,
        crate::services::mobile_compat::compat_get_api_mobile_health,
        // === mobile_compat supplement (OpenAPI-only) ===
        crate::services::mobile_compat::compat_get_api_mobile_mobile_push_config,
        crate::services::mobile_compat::compat_put_api_mobile_mobile_push_config,
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
        (name = "Mobile-Compat", description = "Mobile 前端兼容 OpenAPI 注解"),
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

#[derive(OpenApi)]
#[openapi(
    components(schemas(PatrolRecord)),
    tags((name = "patrol", description = "巡检管理 API")),
    info(title = "TOPEMS Mobile Patrol API", version = "1.0.0", description = "移动巡检 API")
)]
pub struct PatrolApiDoc;

#[derive(OpenApi)]
#[openapi(
    components(schemas(ScanRecord)),
    tags((name = "scan", description = "扫码管理 API")),
    info(title = "TOPEMS Mobile Scan API", version = "1.0.0", description = "移动扫码 API")
)]
pub struct ScanApiDoc;

#[derive(OpenApi)]
#[openapi(
    components(schemas(MobileTask)),
    tags((name = "task", description = "任务管理 API")),
    info(title = "TOPEMS Mobile Task API", version = "1.0.0", description = "移动任务管理 API")
)]
pub struct TaskApiDoc;

#[derive(OpenApi)]
#[openapi(
    tags((name = "device", description = "设备管理 API")),
    info(title = "TOPEMS Mobile Device API", version = "1.0.0", description = "设备管理 API")
)]
pub struct DeviceApiDoc;

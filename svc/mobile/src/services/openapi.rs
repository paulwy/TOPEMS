// Mobile 服务 OpenAPI 文档
use utoipa::{OpenApi, ToSchema};
use serde::{Deserialize, Serialize};

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
        crate::api::patrol::list_patrols,
        crate::api::patrol::create_patrol,
        crate::api::patrol::get_patrol,
        crate::api::patrol::update_patrol,
    ),
    components(schemas(PatrolRecord)),
    tags((name = "patrol", description = "巡检管理 API")),
    info(title = "TOPEMS Mobile Patrol API", version = "1.0.0", description = "移动巡检 API")
)]
pub struct PatrolApiDoc;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::scan::list_scans,
        crate::api::scan::create_scan,
        crate::api::scan::get_scan,
    ),
    components(schemas(ScanRecord)),
    tags((name = "scan", description = "扫码管理 API")),
    info(title = "TOPEMS Mobile Scan API", version = "1.0.0", description = "移动扫码 API")
)]
pub struct ScanApiDoc;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::task::list_tasks,
        crate::api::task::create_task,
        crate::api::task::get_task,
        crate::api::task::update_task,
        crate::api::task::assign_task,
    ),
    components(schemas(MobileTask)),
    tags((name = "task", description = "任务管理 API")),
    info(title = "TOPEMS Mobile Task API", version = "1.0.0", description = "移动任务管理 API")
)]
pub struct TaskApiDoc;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::device::register_device,
        crate::api::device::get_device,
        crate::api::device::update_device,
        crate::api::device::list_devices,
    ),
    tags((name = "device", description = "设备管理 API")),
    info(title = "TOPEMS Mobile Device API", version = "1.0.0", description = "设备管理 API")
)]
pub struct DeviceApiDoc;

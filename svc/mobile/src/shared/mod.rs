pub mod permission;

use axum::extract::State;
use axum::Json;
use serde_json::json;
use uuid::Uuid;

use crate::db::repository::*;
use crate::models::*;
use topems_shared::ApiResponse;


use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::AuthState;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::{
    api::hrm_api::HrmApi, api::mes_api::MesApi, api::notification_api::NotificationApi,
    api::qms_api::QmsApi, api::wms_api::WmsApi, TypedServiceClient, WorkflowApi,
};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub wms_client: TypedServiceClient<WmsApi>,
    pub hrm_client: TypedServiceClient<HrmApi>,
    pub workflow_client: TypedServiceClient<WorkflowApi>,
    pub notification_client: TypedServiceClient<NotificationApi>,
    pub mes_api_client: TypedServiceClient<MesApi>,
    pub qms_api_client: TypedServiceClient<QmsApi>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<WmsApi> {
    fn from_ref(state: &AppState) -> Self {
        state.wms_client.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<MesApi> {
    fn from_ref(state: &AppState) -> Self {
        state.mes_api_client.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<QmsApi> {
    fn from_ref(state: &AppState) -> Self {
        state.qms_api_client.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<HrmApi> {
    fn from_ref(state: &AppState) -> Self {
        state.hrm_client.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<WorkflowApi> {
    fn from_ref(state: &AppState) -> Self {
        state.workflow_client.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<NotificationApi> {
    fn from_ref(state: &AppState) -> Self {
        state.notification_client.clone()
    }
}
use crate::modules::approval::{
    approve_approval_task, delegate_approval_task, get_approval_history, get_approval_task,
    get_pending_approval_tasks, list_approval_tasks, reject_approval_task,
};
use crate::modules::attendance::{
    apply_leave, check_in, check_out, get_attendance_overview, get_attendance_stats,
    list_attendance_records, list_leave_applications,
};
use crate::modules::barcode_scanner::{
    delete_scan_record, get_scan_by_id, get_scan_history, get_supported_barcode_types, scan_barcode,
};
use crate::modules::device::{register_device, update_push_token};
use crate::modules::inventory::{
    create_stocktake_record, get_inventory_item, list_inbound_orders, list_inventory_items,
    list_outbound_orders, list_stocktake_tasks,
};
use crate::modules::media::{delete_media, get_audio, get_photos, get_video, upload_media};
use crate::modules::offline::{get_offline_status, sync_offline_data};
use crate::modules::offline_records::{
    clear_synced as clear_offline_synced, get_pending_records as get_offline_pending_records,
    mark_synced as mark_offline_record_synced, sync_records as sync_offline_records,
};
use crate::modules::offline_sync::{
    get_offline_status as get_offline_sync_status, get_sync_history, get_sync_policy,
    retry_failed_sync, sync_data, update_sync_policy,
};
use crate::modules::patrol::{
    create_patrol_record, delete_patrol_record, get_all_patrol_records, get_patrol_record,
    update_patrol_record,
};
use crate::modules::photo_upload::{
    batch_upload_photos, delete_photo, get_photo_by_id, get_photo_list, get_upload_progress,
    upload_photo,
};
use crate::modules::production::{
    get_production_order, list_equipment, list_production_orders, list_work_reports,
    submit_work_report,
};
use crate::modules::push_notification::{
    create_template, get_devices, get_notification_by_id, get_notification_list,
    get_notification_stats, get_templates, register_device as register_push_device, send_broadcast,
    send_notification,
};
use crate::modules::quality::{
    get_quality_task, list_defect_records, list_quality_tasks, report_defect,
    update_quality_task_status,
};
use crate::modules::scan::{image_ocr, scan_qrcode};
use crate::modules::shortcut::{create_shortcut, get_shortcuts};
use crate::modules::stats::{get_dashboard_stats, get_patrol_stats, get_task_stats};
use crate::modules::task::{
    create_task, delete_task, get_all_tasks, get_task, update_task, update_task_status,
};
use crate::modules::user::{get_profile, update_profile, upload_avatar};
use crate::modules::workbench::get_workbench_data;
use crate::modules::missing_endpoints::{
    get_push_config, get_usage_stats, get_user_settings, list_inspection_tasks, update_push_config,
    update_push_template,
};
use crate::modules::oa::{
    complete_oa_task, create_calendar_event, create_meeting, create_oa_task, delete_calendar_event,
    delete_meeting, delete_oa_task, get_announcement, get_meeting, get_oa_stats, get_oa_task,
    join_meeting, leave_meeting, list_announcements, list_calendar_events, list_meetings,
    list_oa_tasks, mark_announcement_read, update_calendar_event, update_meeting, update_oa_task,
};
use crate::modules::mobile_plugin::create_routes;
use axum::Router;

/// 6 个服务客户端统一初始化（service token：最小权限 + 短时效），
/// 供 main.rs 与 server 嵌入模式复用（2026-09-17 提炼）。
#[allow(clippy::type_complexity)]
pub async fn build_service_clients(
    jwt_secret: &str,
) -> (
    TypedServiceClient<WmsApi>,
    TypedServiceClient<HrmApi>,
    TypedServiceClient<WorkflowApi>,
    TypedServiceClient<NotificationApi>,
    TypedServiceClient<MesApi>,
    TypedServiceClient<QmsApi>,
) {
    let wms_client = match TypedServiceClient::<WmsApi>::from_env_default()
        .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["wms:admin"]))
    {
        Ok(client) => {
            tracing::info!("✅ WMS服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ WMS服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(WmsApi, "http://localhost:8041")
                .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["wms:admin"]))
                .expect("hardcoded fallback URL is valid")
        }
    };

    let mes_api_client = match TypedServiceClient::<MesApi>::from_env_default()
        .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["mes:admin"]))
    {
        Ok(client) => {
            tracing::info!("✅ MES API服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ MES API服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(MesApi, "http://localhost:8030")
                .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["mes:admin"]))
                .expect("hardcoded fallback URL is valid")
        }
    };

    let qms_api_client = match TypedServiceClient::<QmsApi>::from_env_default()
        .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["qms:admin"]))
    {
        Ok(client) => {
            tracing::info!("✅ QMS API服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ QMS API服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(QmsApi, "http://localhost:8050")
                .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["qms:admin"]))
                .expect("hardcoded fallback URL is valid")
        }
    };

    let hrm_client = match TypedServiceClient::<HrmApi>::from_env_default()
        .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["hrm:admin"]))
    {
        Ok(client) => {
            tracing::info!("✅ HRM服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ HRM服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(HrmApi, "http://localhost:8020")
                .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["hrm:admin"]))
                .expect("hardcoded fallback URL is valid")
        }
    };

    let workflow_client = match TypedServiceClient::<WorkflowApi>::from_env_default()
        .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["workflow:read"]))
    {
        Ok(client) => {
            tracing::info!("✅ Workflow服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ Workflow服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(WorkflowApi, "http://localhost:8000")
                .and_then(|c| {
                    c.with_service_token(jwt_secret, "mobile-service", &["workflow:read"])
                })
                .expect("hardcoded fallback URL is valid")
        }
    };

    let notification_client = match TypedServiceClient::<NotificationApi>::from_env_default()
        .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["notification:read"]))
    {
        Ok(client) => {
            tracing::info!("✅ Notification服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ Notification服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(NotificationApi, "http://localhost:8000")
                .and_then(|c| {
                    c.with_service_token(jwt_secret, "mobile-service", &["notification:read"])
                })
                .expect("hardcoded fallback URL is valid")
        }
    };

    (
        wms_client,
        hrm_client,
        workflow_client,
        notification_client,
        mes_api_client,
        qms_api_client,
    )
}

pub fn build_protected_routes(state: AppState) -> Router<AppState> {
    axum::Router::new()
        // 由 main.rs 原有 protected 路由提炼（2026-09-17）
        .route(
            "/inspection/tasks",
            axum::routing::get(list_inspection_tasks),
        )
        .route("/analytics/usage", axum::routing::get(get_usage_stats))
        .route("/user/settings", axum::routing::get(get_user_settings))
        .route(
            "/push/config",
            axum::routing::get(get_push_config).put(update_push_config),
        )
        .route(
            "/push/templates/{id}",
            axum::routing::put(update_push_template),
        )
        // Approval Routes（V68.1 挂载：原 modules/approval.rs 已实现但未注册，前端 mobile/approval.ts 7 方法据此对齐）
        .route("/approvals", axum::routing::get(list_approval_tasks))
        .route(
            "/approvals/pending",
            axum::routing::get(get_pending_approval_tasks),
        )
        .route(
            "/approvals/history",
            axum::routing::get(get_approval_history),
        )
        .route("/approvals/{id}", axum::routing::get(get_approval_task))
        .route(
            "/approvals/{id}/approve",
            axum::routing::post(approve_approval_task),
        )
        .route(
            "/approvals/{id}/reject",
            axum::routing::post(reject_approval_task),
        )
        .route(
            "/approvals/{id}/delegate",
            axum::routing::post(delegate_approval_task),
        )
        // Workbench Routes
        .route("/workbench", axum::routing::get(get_workbench_data))
        // Stats Routes
        .route("/stats/dashboard", axum::routing::get(get_dashboard_stats))
        .route("/stats/patrol", axum::routing::get(get_patrol_stats))
        .route("/stats/task", axum::routing::get(get_task_stats))
        // User Routes
        .route(
            "/user/profile",
            axum::routing::get(get_profile).put(update_profile),
        )
        .route("/user/avatar", axum::routing::post(upload_avatar))
        // Scan Routes
        .route("/scan/barcode", axum::routing::post(scan_barcode))
        .route("/scan/qrcode", axum::routing::post(scan_qrcode))
        .route("/scan/image-ocr", axum::routing::post(image_ocr))
        // Offline Routes
        .route("/offline/sync", axum::routing::post(sync_offline_data))
        .route("/offline/status", axum::routing::get(get_offline_status))
        // Device Routes
        .route("/devices/register", axum::routing::post(register_device))
        .route("/devices/token", axum::routing::put(update_push_token))
        // Shortcut Routes
        .route(
            "/shortcuts",
            axum::routing::get(get_shortcuts).post(create_shortcut),
        )
        // Patrol Routes
        .route(
            "/patrol-records",
            axum::routing::get(get_all_patrol_records).post(create_patrol_record),
        )
        .route(
            "/patrol-records/{id}",
            axum::routing::get(get_patrol_record)
                .put(update_patrol_record)
                .delete(delete_patrol_record),
        )
        // Task Routes
        .route(
            "/mobile-tasks",
            axum::routing::get(get_all_tasks).post(create_task),
        )
        .route(
            "/mobile-tasks/{id}",
            axum::routing::get(get_task)
                .put(update_task)
                .delete(delete_task),
        )
        .route(
            "/mobile-tasks/{id}/status",
            axum::routing::post(update_task_status),
        )
        // Attendance Routes
        .route("/attendance", axum::routing::get(get_attendance_overview))
        .route(
            "/attendance/stats",
            axum::routing::get(get_attendance_stats),
        )
        .route(
            "/attendance/records",
            axum::routing::get(list_attendance_records),
        )
        .route("/attendance/check-in", axum::routing::post(check_in))
        .route("/attendance/check-out", axum::routing::post(check_out))
        .route(
            "/attendance/leaves",
            axum::routing::get(list_leave_applications).post(apply_leave),
        )
        // Media Routes
        .route("/media/photos", axum::routing::get(get_photos))
        .route("/media/audio", axum::routing::get(get_audio))
        .route("/media/video", axum::routing::get(get_video))
        .route(
            "/media/upload/{file_type}",
            axum::routing::post(upload_media),
        )
        .route(
            "/media/{file_type}/{id}",
            axum::routing::delete(delete_media),
        )
        // Legacy Routes
        .route("/dashboard/stats", axum::routing::get(get_dashboard_stats))
        .route(
            "/scan-records",
            axum::routing::get(list_scan_records).post(create_scan_record),
        )
        .route(
            "/photo-evidences",
            axum::routing::get(list_photo_evidences).post(create_photo_evidence),
        )
        .route(
            "/audio-recordings",
            axum::routing::get(list_audio_recordings).post(create_audio_recording),
        )
        .route(
            "/video-recordings",
            axum::routing::get(list_video_recordings).post(create_video_recording),
        )
        // Enhanced Offline Sync Routes
        .route("/offline/sync-data", axum::routing::post(sync_data))
        .route(
            "/offline/sync-status",
            axum::routing::get(get_offline_sync_status),
        )
        .route(
            "/offline/sync-history",
            axum::routing::get(get_sync_history),
        )
        .route(
            "/offline/sync-policy",
            axum::routing::get(get_sync_policy).put(update_sync_policy),
        )
        .route(
            "/offline/retry-failed",
            axum::routing::post(retry_failed_sync),
        )
        // 离线操作记录 CRUD
        .route(
            "/offline/records",
            axum::routing::post(sync_offline_records),
        )
        .route(
            "/offline/records/pending",
            axum::routing::get(get_offline_pending_records),
        )
        .route(
            "/offline/records/{record_id}/synced",
            axum::routing::post(mark_offline_record_synced),
        )
        .route(
            "/offline/records/synced/clear",
            axum::routing::delete(clear_offline_synced),
        )
        // Push Notification Routes
        .route("/push/devices", axum::routing::get(get_devices))
        .route(
            "/push/devices/register",
            axum::routing::post(register_push_device),
        )
        .route(
            "/push/notifications",
            axum::routing::post(send_notification).get(get_notification_list),
        )
        .route(
            "/push/notifications/broadcast",
            axum::routing::post(send_broadcast),
        )
        .route(
            "/push/notifications/stats",
            axum::routing::get(get_notification_stats),
        )
        .route(
            "/push/notifications/{id}",
            axum::routing::get(get_notification_by_id),
        )
        .route(
            "/push/templates",
            axum::routing::get(get_templates).post(create_template),
        )
        // Barcode Scanner Routes
        .route("/barcode/scan", axum::routing::post(scan_barcode))
        .route("/barcode/history", axum::routing::get(get_scan_history))
        .route(
            "/barcode/history/{id}",
            axum::routing::get(get_scan_by_id).delete(delete_scan_record),
        )
        .route(
            "/barcode/types",
            axum::routing::get(get_supported_barcode_types),
        )
        // Photo Upload Routes
        .route("/photos/upload", axum::routing::post(upload_photo))
        .route(
            "/photos/batch-upload",
            axum::routing::post(batch_upload_photos),
        )
        .route("/photos", axum::routing::get(get_photo_list))
        .route(
            "/photos/{id}",
            axum::routing::get(get_photo_by_id).delete(delete_photo),
        )
        .route(
            "/photos/{id}/progress",
            axum::routing::get(get_upload_progress),
        )
        // Inventory Routes
        .route("/inventory/items", axum::routing::get(list_inventory_items))
        .route(
            "/inventory/items/{id}",
            axum::routing::get(get_inventory_item),
        )
        .route(
            "/inventory/stocktake",
            axum::routing::get(list_stocktake_tasks),
        )
        .route(
            "/inventory/stocktake/{task_id}/records",
            axum::routing::post(create_stocktake_record),
        )
        .route(
            "/inventory/inbound",
            axum::routing::get(list_inbound_orders),
        )
        .route(
            "/inventory/outbound",
            axum::routing::get(list_outbound_orders),
        )
        // Quality Routes
        .route("/quality/tasks", axum::routing::get(list_quality_tasks))
        .route("/quality/tasks/{id}", axum::routing::get(get_quality_task))
        .route(
            "/quality/tasks/{id}/status",
            axum::routing::put(update_quality_task_status),
        )
        .route(
            "/quality/defects",
            axum::routing::get(list_defect_records).post(report_defect),
        )
        // Production Routes
        .route(
            "/production/orders",
            axum::routing::get(list_production_orders),
        )
        .route(
            "/production/orders/{id}",
            axum::routing::get(get_production_order),
        )
        .route(
            "/production/work-reports",
            axum::routing::get(list_work_reports).post(submit_work_report),
        )
        .route("/production/equipment", axum::routing::get(list_equipment))
        // ===== OA 办公协同（缺口#14） =====
        .route(
            "/meetings",
            axum::routing::get(list_meetings).post(create_meeting),
        )
        .route(
            "/meetings/{id}",
            axum::routing::get(get_meeting)
                .put(update_meeting)
                .delete(delete_meeting),
        )
        .route("/meetings/{id}/join", axum::routing::post(join_meeting))
        .route("/meetings/{id}/leave", axum::routing::post(leave_meeting))
        .route(
            "/calendar/events",
            axum::routing::get(list_calendar_events).post(create_calendar_event),
        )
        .route(
            "/calendar/events/{id}",
            axum::routing::put(update_calendar_event).delete(delete_calendar_event),
        )
        .route(
            "/tasks",
            axum::routing::get(list_oa_tasks).post(create_oa_task),
        )
        .route(
            "/tasks/{id}",
            axum::routing::get(get_oa_task)
                .put(update_oa_task)
                .delete(delete_oa_task),
        )
        .route(
            "/tasks/{id}/complete",
            axum::routing::post(complete_oa_task),
        )
        .route("/announcements", axum::routing::get(list_announcements))
        .route("/announcements/{id}", axum::routing::get(get_announcement))
        .route(
            "/announcements/{id}/read",
            axum::routing::post(mark_announcement_read),
        )
        .route("/oa/stats", axum::routing::get(get_oa_stats))
}

async fn list_patrol_records(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_patrol_records(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取巡逻记录失败: {}", e);
            vec![]
        }
    };
    let total = records.len() as i64;
    Json(ApiResponse::success(
        json!({ "items": records, "total": total }),
        "获取巡逻记录成功",
    ))
}

async fn list_scan_records(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_scan_records(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取扫码记录失败: {}", e);
            vec![]
        }
    };
    let total = records.len() as i64;
    Json(ApiResponse::success(
        json!({ "items": records, "total": total }),
        "获取扫码记录成功",
    ))
}

async fn create_scan_record(
    State(state): State<AppState>,
    Json(payload): Json<CreateScanRecord>,
) -> Json<ApiResponse<ScanRecord>> {
    let tenant_id = Uuid::new_v4();
    match db_create_scan_record(&state.pool, tenant_id, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建扫码记录成功")),
        Err(e) => {
            tracing::error!("创建扫码记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建扫码记录失败: {}", e)))
        }
    }
}

async fn list_photo_evidences(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_photo_evidence(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取照片记录失败: {}", e);
            vec![]
        }
    };
    Json(ApiResponse::success(
        json!({ "items": records, "total": records.len() }),
        "获取照片记录成功",
    ))
}

async fn create_photo_evidence(
    State(state): State<AppState>,
    Json(payload): Json<CreatePhotoEvidence>,
) -> Json<ApiResponse<PhotoEvidence>> {
    let tenant_id = Uuid::new_v4();
    match db_create_photo_evidence(&state.pool, tenant_id, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建照片记录成功")),
        Err(e) => {
            tracing::error!("创建照片记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建照片记录失败: {}", e)))
        }
    }
}

async fn list_audio_recordings(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_audio_recordings(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取音频记录失败: {}", e);
            vec![]
        }
    };
    Json(ApiResponse::success(
        json!({ "items": records, "total": records.len() }),
        "获取音频记录成功",
    ))
}

async fn create_audio_recording(
    State(state): State<AppState>,
    Json(payload): Json<CreateAudioRecording>,
) -> Json<ApiResponse<AudioRecording>> {
    let tenant_id = Uuid::new_v4();
    match db_create_audio_recording(&state.pool, tenant_id, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建音频记录成功")),
        Err(e) => {
            tracing::error!("创建音频记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建音频记录失败: {}", e)))
        }
    }
}

async fn list_video_recordings(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_video_recordings(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取视频记录失败: {}", e);
            vec![]
        }
    };
    Json(ApiResponse::success(
        json!({ "items": records, "total": records.len() }),
        "获取视频记录成功",
    ))
}

async fn create_video_recording(
    State(state): State<AppState>,
    Json(payload): Json<CreateVideoRecording>,
) -> Json<ApiResponse<VideoRecording>> {
    let tenant_id = Uuid::new_v4();
    match db_create_video_recording(&state.pool, tenant_id, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建视频记录成功")),
        Err(e) => {
            tracing::error!("创建视频记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建视频记录失败: {}", e)))
        }
    }
}


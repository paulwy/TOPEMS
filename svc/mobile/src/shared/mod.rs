pub mod permission;

use axum::extract::State;
use axum::Extension;
use axum::Json;
use serde_json::json;
use uuid::Uuid;

use crate::db::repository::*;
use crate::models::*;
use topems_shared_core::{response::ApiResponse, TopemsError};

use axum::extract::FromRef;
use std::sync::Arc;
use topems_shared_auth::auth::AuthState;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_db::scope::Db;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::{
    api::crm_api::CrmApi, api::hrm_api::HrmApi, api::mes_api::MesApi,
    api::notification_api::NotificationApi, api::qms_api::QmsApi, api::wms_api::WmsApi,
    TypedServiceClient, WorkflowApi,
};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: Db,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub wms_client: TypedServiceClient<WmsApi>,
    pub hrm_client: TypedServiceClient<HrmApi>,
    pub workflow_client: TypedServiceClient<WorkflowApi>,
    pub notification_client: TypedServiceClient<NotificationApi>,
    pub mes_api_client: TypedServiceClient<MesApi>,
    pub qms_api_client: TypedServiceClient<QmsApi>,
    pub crm_client: TypedServiceClient<CrmApi>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for Db {
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

impl FromRef<AppState> for TypedServiceClient<CrmApi> {
    fn from_ref(state: &AppState) -> Self {
        state.crm_client.clone()
    }
}
use crate::modules::approval::{
    approve_approval_task, delegate_approval_task, get_approval_history, get_approval_task,
    get_pending_approval_tasks, list_approval_tasks, reject_approval_task,
};
use crate::modules::attendance::{
    apply_leave, check_in, check_out, create_attendance_record, delete_attendance_record,
    get_attendance_overview, get_attendance_record_by_id, get_attendance_statistics,
    get_attendance_stats, get_today_attendance, list_attendance_records, list_attendance_shifts,
    list_leave_applications, update_attendance_record,
};
use crate::modules::barcode_scanner::{
    delete_scan_record, get_scan_by_id, get_scan_history, get_supported_barcode_types, scan_barcode,
};
use crate::modules::customer::{
    create_customer, delete_customer, get_customer, list_customers, update_customer,
};
use crate::modules::device::{
    activate_device, disable_device, get_device_by_id, get_device_stats, list_my_devices,
    register_device, test_push_device, unregister_device, update_device, update_push_token,
};
use crate::modules::document::{
    create_document, delete_document, get_document, get_document_categories, list_documents,
    update_document,
};
use crate::modules::inventory::{
    create_inventory_item, create_stocktake_record, delete_inventory_item, get_inventory_item,
    list_inbound_orders, list_inventory_items, list_low_stock_items, list_outbound_orders,
    list_stocktake_tasks, scan_inventory, update_inventory_item,
};
use crate::modules::media::{delete_media, get_audio, get_photos, get_video, upload_media};
use crate::modules::missing_endpoints::{
    get_push_config, get_usage_stats, list_inspection_tasks, update_push_config,
    update_push_template,
};
use crate::modules::notifications::{
    delete_notification, delete_read_notifications, get_notification, get_unread_count,
    list_notifications, mark_all_notifications_read, mark_notification_read,
};
use crate::modules::oa::{
    add_event_attendee, complete_oa_task, create_calendar_event, create_meeting, create_oa_task,
    delete_calendar_event, delete_meeting, delete_oa_task, get_announcement, get_meeting,
    get_oa_stats, get_oa_task, get_schedule_event, join_meeting, leave_meeting, list_announcements,
    list_attending_events, list_calendar_events, list_meetings, list_month_events, list_my_events,
    list_oa_tasks, list_today_events, list_week_events, mark_announcement_read,
    remove_event_attendee, update_calendar_event, update_event_status, update_meeting,
    update_oa_task,
};
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
// 批 37：create/update/delete_production_order 三端点前端零声明（C 类），handler 已删除。
// get_equipment 此前写好但未挂路由（前端封装备斗期零调用），现挂 /production/equipment/{id}。
use crate::modules::production::{
    complete_production_order, get_equipment, get_production_order, get_today_production_orders,
    get_workstation_orders, list_equipment, list_production_orders, list_work_reports,
    start_production_order, submit_work_report,
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
use crate::modules::stats::{
    acknowledge_alert, get_dashboard_alerts, get_dashboard_charts, get_dashboard_kpis,
    get_dashboard_stats, get_patrol_stats, get_quick_actions, get_recent_activities,
    get_task_stats,
};
use crate::modules::task::{
    batch_update_status, complete_task, create_task, delete_task, get_all_tasks, get_my_tasks,
    get_overdue_tasks, get_pending_tasks, get_task, reopen_task, search_tasks, update_task,
    update_task_status,
};
use crate::modules::user::{
    change_password, get_department_members, get_permissions, get_profile, get_user_by_id,
    get_user_settings, list_users, update_profile, update_user_settings, update_user_status,
    upload_avatar,
};
use crate::modules::workbench::get_workbench_data;
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
    TypedServiceClient<CrmApi>,
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
            TypedServiceClient::new(WmsApi, "http://localhost:8099")
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
            TypedServiceClient::new(
                MesApi,
                std::env::var("MES_SERVICE_URL")
                    .unwrap_or_else(|_| "http://localhost:8099".to_string()),
            )
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
            TypedServiceClient::new(QmsApi, "http://localhost:8099")
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
            TypedServiceClient::new(HrmApi, "http://localhost:8099")
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
            TypedServiceClient::new(WorkflowApi, "http://localhost:8099")
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
            TypedServiceClient::new(NotificationApi, "http://localhost:8099")
                .and_then(|c| {
                    c.with_service_token(jwt_secret, "mobile-service", &["notification:read"])
                })
                .expect("hardcoded fallback URL is valid")
        }
    };

    let crm_client = match TypedServiceClient::<CrmApi>::from_env_default()
        .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["crm:admin"]))
    {
        Ok(client) => {
            tracing::info!("✅ CRM服务客户端初始化成功（service token）");
            client
        }
        Err(e) => {
            tracing::warn!(
                "⚠️ CRM服务客户端初始化失败（不阻塞启动）, 使用默认地址: {}",
                e
            );
            TypedServiceClient::new(CrmApi, "http://localhost:8099")
                .and_then(|c| c.with_service_token(jwt_secret, "mobile-service", &["crm:admin"]))
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
        crm_client,
    )
}

pub fn build_protected_routes(_state: AppState) -> Router<AppState> {
    axum::Router::new()
        // 由 main.rs 原有 protected 路由提炼（2026-09-17）
        .route(
            "/inspection/tasks",
            axum::routing::get(list_inspection_tasks),
        )
        .route("/analytics/usage", axum::routing::get(get_usage_stats))
        .route(
            "/user/settings",
            axum::routing::get(get_user_settings).put(update_user_settings),
        )
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
        .route(
            "/attendance",
            axum::routing::get(get_attendance_overview).post(create_attendance_record),
        )
        .route(
            "/attendance/{id}",
            axum::routing::get(get_attendance_record_by_id)
                .put(update_attendance_record)
                .delete(delete_attendance_record),
        )
        // 前端契约 /attendance/overview 别名（页面 MobileAttendancePage 使用）
        .route(
            "/attendance/overview",
            axum::routing::get(get_attendance_overview),
        )
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
        // 前端契约 /attendance/statistics、/attendance/shifts（attendance.ts 声明，上游未接入时降级）
        .route(
            "/attendance/statistics",
            axum::routing::get(get_attendance_statistics),
        )
        .route(
            "/attendance/shifts",
            axum::routing::get(list_attendance_shifts),
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
        // Production Routes（批 37：create/update/delete 为 C 类死端点已删，只保留读）
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
        // 批 37：get_equipment 此前写好但未挂路由（只被 contract_fallback 的 detail_missing 顶着）。
        // 现由真实 handler 接管，MES 未接入时降级 200 + null。
        .route(
            "/production/equipment/{id}",
            axum::routing::get(get_equipment),
        )
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
        // ===== 页面级别名路由（前端 mobile api/*.ts 单数路径对齐，2026-10-05）=====
        // approval（前端 /approval/tasks 单数 → approval.rs 复数实现）
        .route("/approval/tasks", axum::routing::get(list_approval_tasks))
        .route(
            "/approval/tasks/pending",
            axum::routing::get(get_pending_approval_tasks),
        )
        .route(
            "/approval/history",
            axum::routing::get(get_approval_history),
        )
        .route(
            "/approval/tasks/{id}",
            axum::routing::get(get_approval_task),
        )
        .route(
            "/approval/tasks/{id}/approve",
            axum::routing::post(approve_approval_task),
        )
        .route(
            "/approval/tasks/{id}/reject",
            axum::routing::post(reject_approval_task),
        )
        .route(
            "/approval/tasks/{id}/delegate",
            axum::routing::post(delegate_approval_task),
        )
        // task（前端 /task 单数 → task.rs 实现，原未挂载）
        .route("/task", axum::routing::get(get_all_tasks).post(create_task))
        .route(
            "/task/{id}",
            axum::routing::get(get_task)
                .put(update_task)
                .delete(delete_task),
        )
        .route("/task/my", axum::routing::get(get_my_tasks))
        .route("/task/pending", axum::routing::get(get_pending_tasks))
        .route("/task/overdue", axum::routing::get(get_overdue_tasks))
        .route("/task/{id}/complete", axum::routing::post(complete_task))
        .route("/task/{id}/reopen", axum::routing::post(reopen_task))
        .route("/task/search", axum::routing::get(search_tasks))
        .route(
            "/task/batch/status",
            axum::routing::post(batch_update_status),
        )
        // device（前端 /device 单数 → device.rs）
        .route("/device/register", axum::routing::post(register_device))
        .route("/device", axum::routing::get(list_my_devices))
        .route("/device/my", axum::routing::get(list_my_devices))
        .route("/device/stats", axum::routing::get(get_device_stats))
        .route(
            "/device/{id}",
            axum::routing::get(get_device_by_id)
                .put(update_device)
                .delete(unregister_device),
        )
        .route(
            "/device/{id}/activate",
            axum::routing::post(activate_device),
        )
        .route("/device/{id}/disable", axum::routing::post(disable_device))
        .route(
            "/device/{id}/test-push",
            axum::routing::post(test_push_device),
        )
        // dashboard 剩余（前端 /dashboard/activities → 最近动态聚合）
        .route(
            "/dashboard/activities",
            axum::routing::get(get_recent_activities),
        )
        // customer（批 36：前端实际调 /customers（复数），此前真实 handler 挂在 /customer（单数）
        // 导致前端全部流量命中 contract_fallback 的候选路由（读恒空、写 mutate_ok 假成功）。
        // 现对齐前端路径，并由本处真实 handler 接管；contract_fallback 中对应的 /customers 系已移除。
        .route(
            "/customers",
            axum::routing::get(list_customers).post(create_customer),
        )
        .route(
            "/customers/{id}",
            axum::routing::get(get_customer)
                .put(update_customer)
                .delete(delete_customer),
        )
        // production 操作（前端 /production/orders/{id}/start|complete → MES）
        .route(
            "/production/orders/{id}/start",
            axum::routing::post(start_production_order),
        )
        .route(
            "/production/orders/{id}/complete",
            axum::routing::post(complete_production_order),
        )
        // production 死代码兜底（前端 /production/orders/today、/production/workstations/{wid}/orders）
        .route(
            "/production/orders/today",
            axum::routing::get(get_today_production_orders),
        )
        .route(
            "/production/workstations/{workstationId}/orders",
            axum::routing::get(get_workstation_orders),
        )
        // attendance today（前端 /attendance/today → HRM 记录按日过滤）
        .route(
            "/attendance/today",
            axum::routing::get(get_today_attendance),
        )
        // user change-password（前端 /user/change-password → unified-core）
        .route(
            "/user/change-password",
            axum::routing::post(change_password),
        )
        // user 死代码兜底（前端 /user 列表、/{id}、department、status、permissions）
        .route("/user", axum::routing::get(list_users))
        .route("/user/{id}", axum::routing::get(get_user_by_id))
        .route(
            "/user/department/{departmentId}",
            axum::routing::get(get_department_members),
        )
        .route("/user/{id}/status", axum::routing::put(update_user_status))
        .route("/user/permissions", axum::routing::get(get_permissions))
        // documents（前端 /documents → mobile 本地表 CRUD）
        .route(
            "/documents",
            axum::routing::get(list_documents).post(create_document),
        )
        .route(
            "/documents/categories",
            axum::routing::get(get_document_categories),
        )
        .route(
            "/documents/{id}",
            axum::routing::get(get_document)
                .put(update_document)
                .delete(delete_document),
        )
        // schedule（前端 /schedule/events → oa calendar events）
        .route(
            "/schedule/events",
            axum::routing::get(list_calendar_events).post(create_calendar_event),
        )
        .route(
            "/schedule/events/{id}",
            axum::routing::get(get_schedule_event)
                .put(update_calendar_event)
                .delete(delete_calendar_event),
        )
        // schedule 死代码兜底（前端 today/week/month/my/attending/status/attendees）
        .route(
            "/schedule/events/today",
            axum::routing::get(list_today_events),
        )
        .route(
            "/schedule/events/week",
            axum::routing::get(list_week_events),
        )
        .route(
            "/schedule/events/month",
            axum::routing::get(list_month_events),
        )
        .route("/schedule/events/my", axum::routing::get(list_my_events))
        .route(
            "/schedule/events/attending",
            axum::routing::get(list_attending_events),
        )
        .route(
            "/schedule/events/{id}/status",
            axum::routing::put(update_event_status),
        )
        .route(
            "/schedule/events/{id}/attendees",
            axum::routing::post(add_event_attendee),
        )
        .route(
            "/schedule/events/{id}/attendees/{userId}",
            axum::routing::delete(remove_event_attendee),
        )
        // dashboard announcements（前端 /dashboard/announcements → oa announcements）
        .route(
            "/dashboard/announcements",
            axum::routing::get(list_announcements),
        )
        .route(
            "/dashboard/announcements/{id}/read",
            axum::routing::post(mark_announcement_read),
        )
        // dashboard 死代码兜底（前端 quick-actions/kpis/charts/alerts）
        .route(
            "/dashboard/quick-actions",
            axum::routing::get(get_quick_actions),
        )
        .route("/dashboard/kpis", axum::routing::get(get_dashboard_kpis))
        .route(
            "/dashboard/charts",
            axum::routing::get(get_dashboard_charts),
        )
        .route(
            "/dashboard/alerts",
            axum::routing::get(get_dashboard_alerts),
        )
        .route(
            "/dashboard/alerts/{id}/acknowledge",
            axum::routing::post(acknowledge_alert),
        )
        // inventory（前端裸 /inventory → items）
        .route(
            "/inventory",
            axum::routing::get(list_inventory_items).post(create_inventory_item),
        )
        .route(
            "/inventory/{id}",
            axum::routing::get(get_inventory_item)
                .put(update_inventory_item)
                .delete(delete_inventory_item),
        )
        .route(
            "/inventory/low-stock",
            axum::routing::get(list_low_stock_items),
        )
        .route("/inventory/scan", axum::routing::get(scan_inventory))
        // notifications（前端 /notifications 族 → notifications.rs 全量 handler）
        .route("/notifications", axum::routing::get(list_notifications))
        .route(
            "/notifications/unread-count",
            axum::routing::get(get_unread_count),
        )
        .route(
            "/notifications/{id}",
            axum::routing::get(get_notification).delete(delete_notification),
        )
        .route(
            "/notifications/{id}/read",
            axum::routing::put(mark_notification_read),
        )
        .route(
            "/notifications/read-all",
            axum::routing::put(mark_all_notifications_read),
        )
        .route(
            "/notifications/read",
            axum::routing::delete(delete_read_notifications),
        )
}

#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
async fn list_patrol_records(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::success(
            json!({ "items": Vec::<serde_json::Value>::new(), "total": 0 }),
            "获取巡逻记录成功",
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("获取巡逻记录失败: {}", e);
            return ApiResponse::success(
                json!({ "items": Vec::<serde_json::Value>::new(), "total": 0 }),
                "获取巡逻记录成功",
            );
        }
    };
    let records = match db_get_patrol_records(&mut scope, None).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取巡逻记录失败: {}", e);
            vec![]
        }
    };
    let _ = scope.commit().await;
    let total = records.len() as i64;
    ApiResponse::success(
        json!({ "items": records, "total": total }),
        "获取巡逻记录成功",
    )
}

#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
async fn list_scan_records(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::success(
            json!({ "items": Vec::<serde_json::Value>::new(), "total": 0 }),
            "获取扫码记录成功",
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("获取扫码记录失败: {}", e);
            return ApiResponse::success(
                json!({ "items": Vec::<serde_json::Value>::new(), "total": 0 }),
                "获取扫码记录成功",
            );
        }
    };
    let records = match db_get_scan_records(&mut scope, None).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取扫码记录失败: {}", e);
            vec![]
        }
    };
    let _ = scope.commit().await;
    let total = records.len() as i64;
    ApiResponse::success(
        json!({ "items": records, "total": total }),
        "获取扫码记录成功",
    )
}

async fn create_scan_record(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<CreateScanRecord>,
) -> ApiResponse<ScanRecord> {
    let tenant_id = Uuid::new_v4();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::internal("创建扫码记录失败", "RLS 事务缺失"));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("创建扫码记录失败: {}", e);
            return ApiResponse::from(TopemsError::internal("创建扫码记录失败", e));
        }
    };
    match db_create_scan_record(&mut scope, tenant_id, payload).await {
        Ok(record) => {
            let _ = scope.commit().await;
            ApiResponse::success(record, "创建扫码记录成功")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("创建扫码记录失败: {}", e);
            ApiResponse::from(TopemsError::internal("创建扫码记录失败", e))
        }
    }
}

async fn list_photo_evidences(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::success(
            json!({ "items": Vec::<serde_json::Value>::new(), "total": 0 }),
            "获取照片记录成功",
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("获取照片记录失败: {}", e);
            return ApiResponse::success(
                json!({ "items": Vec::<serde_json::Value>::new(), "total": 0 }),
                "获取照片记录成功",
            );
        }
    };
    let records = match db_get_photo_evidence(&mut scope, None).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取照片记录失败: {}", e);
            vec![]
        }
    };
    let _ = scope.commit().await;
    ApiResponse::success(
        json!({ "items": records, "total": records.len() }),
        "获取照片记录成功",
    )
}

async fn create_photo_evidence(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<CreatePhotoEvidence>,
) -> ApiResponse<PhotoEvidence> {
    let tenant_id = Uuid::new_v4();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::internal("创建照片记录失败", "RLS 事务缺失"));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("创建照片记录失败: {}", e);
            return ApiResponse::from(TopemsError::internal("创建照片记录失败", e));
        }
    };
    match db_create_photo_evidence(&mut scope, tenant_id, payload).await {
        Ok(record) => {
            let _ = scope.commit().await;
            ApiResponse::success(record, "创建照片记录成功")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("创建照片记录失败: {}", e);
            ApiResponse::from(TopemsError::internal("创建照片记录失败", e))
        }
    }
}

async fn list_audio_recordings(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::success(
            json!({ "items": Vec::<serde_json::Value>::new(), "total": 0 }),
            "获取音频记录成功",
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("获取音频记录失败: {}", e);
            return ApiResponse::success(
                json!({ "items": Vec::<serde_json::Value>::new(), "total": 0 }),
                "获取音频记录成功",
            );
        }
    };
    let records = match db_get_audio_recordings(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取音频记录失败: {}", e);
            vec![]
        }
    };
    let _ = scope.commit().await;
    ApiResponse::success(
        json!({ "items": records, "total": records.len() }),
        "获取音频记录成功",
    )
}

async fn create_audio_recording(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<CreateAudioRecording>,
) -> ApiResponse<AudioRecording> {
    let tenant_id = Uuid::new_v4();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::internal("创建音频记录失败", "RLS 事务缺失"));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("创建音频记录失败: {}", e);
            return ApiResponse::from(TopemsError::internal("创建音频记录失败", e));
        }
    };
    match db_create_audio_recording(&mut scope, tenant_id, payload).await {
        Ok(record) => {
            let _ = scope.commit().await;
            ApiResponse::success(record, "创建音频记录成功")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("创建音频记录失败: {}", e);
            ApiResponse::from(TopemsError::internal("创建音频记录失败", e))
        }
    }
}

async fn list_video_recordings(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::success(
            json!({ "items": Vec::<serde_json::Value>::new(), "total": 0 }),
            "获取视频记录成功",
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("获取视频记录失败: {}", e);
            return ApiResponse::success(
                json!({ "items": Vec::<serde_json::Value>::new(), "total": 0 }),
                "获取视频记录成功",
            );
        }
    };
    let records = match db_get_video_recordings(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取视频记录失败: {}", e);
            vec![]
        }
    };
    let _ = scope.commit().await;
    ApiResponse::success(
        json!({ "items": records, "total": records.len() }),
        "获取视频记录成功",
    )
}

async fn create_video_recording(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<CreateVideoRecording>,
) -> ApiResponse<VideoRecording> {
    let tenant_id = Uuid::new_v4();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::internal("创建视频记录失败", "RLS 事务缺失"));
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("创建视频记录失败: {}", e);
            return ApiResponse::from(TopemsError::internal("创建视频记录失败", e));
        }
    };
    match db_create_video_recording(&mut scope, tenant_id, payload).await {
        Ok(record) => {
            let _ = scope.commit().await;
            ApiResponse::success(record, "创建视频记录成功")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("创建视频记录失败: {}", e);
            ApiResponse::from(TopemsError::internal("创建视频记录失败", e))
        }
    }
}

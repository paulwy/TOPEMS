#![allow(dead_code)]

mod db;
mod models;
mod modules;
mod services;
mod shared;

use axum::{
    extract::{FromRef, State},
    Json, Router,
};
use dotenv::dotenv;
use serde_json::json;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;
use uuid::Uuid;

use topems_shared::{
    auth_middleware, build_health_response, create_api_info_router, create_cors_layer,
    init_telemetry, rls_middleware, telemetry_middleware, wrap_group2_router, ApiResponse,
    AuthState, RouteCompatConfig, ServiceHealth,
};

use db::repository::*;
use models::*;
use modules::attendance::{
    apply_leave, check_in, check_out, get_attendance_overview, get_attendance_stats,
    list_attendance_records, list_leave_applications,
};
use modules::auth::{login, logout, refresh_token, verify_code};
use modules::barcode_scanner::{
    delete_scan_record, get_scan_by_id, get_scan_history, get_supported_barcode_types, scan_barcode,
};
use modules::device::{register_device, update_push_token};
use modules::inventory::{
    create_stocktake_record, get_inventory_item, list_inbound_orders, list_inventory_items,
    list_outbound_orders, list_stocktake_tasks,
};
use modules::media::{delete_media, get_audio, get_photos, get_video, upload_media};
use modules::mobile_approval::{
    approve_task, get_approval_by_id, get_approval_stats, get_approved_approvals,
    get_pending_approvals, get_rejected_approvals, reject_task, transfer_task,
};
use modules::notification::{get_notifications, get_unread_count, mark_all_read, mark_read};
use modules::offline::{get_offline_status, sync_offline_data};
use modules::offline_sync::{
    get_offline_status as get_offline_sync_status, get_sync_history, get_sync_policy,
    retry_failed_sync, sync_data, update_sync_policy,
};
use modules::patrol::{
    create_patrol_record, delete_patrol_record, get_all_patrol_records, get_patrol_record,
    update_patrol_record,
};
use modules::photo_upload::{
    batch_upload_photos, delete_photo, get_photo_by_id, get_photo_list, get_upload_progress,
    upload_photo,
};
use modules::production::{
    get_production_order, list_equipment, list_production_orders, list_work_reports,
    submit_work_report,
};
use modules::push_notification::{
    create_template, get_devices, get_notification_by_id, get_notification_list,
    get_notification_stats, get_templates, register_device as register_push_device, send_broadcast,
    send_notification,
};
use modules::quality::{
    get_quality_task, list_defect_records, list_quality_tasks, report_defect,
    update_quality_task_status,
};
use modules::scan::{image_ocr, scan_qrcode};
use modules::shortcut::{create_shortcut, get_shortcuts};
use modules::stats::{get_dashboard_stats, get_patrol_stats, get_task_stats};
use modules::task::{
    create_task, delete_task, get_all_tasks, get_task, update_task, update_task_status,
};
use modules::user::{get_profile, update_profile, upload_avatar};
use modules::workbench::get_workbench_data;

use modules::mobile_plugin::create_routes;
use shared::AppState;

async fn health_check() -> ServiceHealth {
    build_health_response("topems-mobile", true)
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

async fn list_mobile_tasks(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_mobile_tasks(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取移动任务失败: {}", e);
            vec![]
        }
    };
    let total = records.len() as i64;
    Json(ApiResponse::success(
        json!({ "items": records, "total": total }),
        "获取移动任务成功",
    ))
}

async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    let sql_statements = include_str!("../init.sql");
    for stmt in sql_statements.split(';').filter(|s| !s.trim().is_empty()) {
        sqlx::query(stmt.trim()).execute(pool).await?;
    }
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-mobile");

    let database_url = env::var("DATABASE_URL").map_err(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        anyhow::anyhow!("DATABASE_URL environment variable is required")
    })?;

    let pool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
    {
        Ok(p) => {
            tracing::info!("🔗 数据库连接成功");
            if let Err(e) = init_database(&p).await {
                tracing::warn!("数据库初始化警告: {}", e);
            } else {
                tracing::info!("✅ 数据库表初始化完成");
            }
            p
        }
        Err(e) => {
            tracing::error!("数据库连接失败: {}", e);
            panic!("无法连接到数据库: {}", e);
        }
    };

    let app_state = AppState {
        auth_state: AuthState::from_env(),
        pool: pool.clone(),
    };
    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/auth/login", axum::routing::post(login))
        .route("/auth/verify-code", axum::routing::post(verify_code))
        .merge(create_routes());

    let protected_routes = Router::new()
        // Workbench Routes
        .route("/workbench", axum::routing::get(get_workbench_data))
        // Stats Routes
        .route("/stats/dashboard", axum::routing::get(get_dashboard_stats))
        .route("/stats/patrol", axum::routing::get(get_patrol_stats))
        .route("/stats/task", axum::routing::get(get_task_stats))
        // Auth Routes
        .route("/auth/logout", axum::routing::post(logout))
        .route("/auth/refresh", axum::routing::post(refresh_token))
        // User Routes
        .route(
            "/user/profile",
            axum::routing::get(get_profile).put(update_profile),
        )
        .route("/user/avatar", axum::routing::post(upload_avatar))
        // Notification Routes
        .route("/notifications", axum::routing::get(get_notifications))
        .route(
            "/notifications/unread-count",
            axum::routing::get(get_unread_count),
        )
        .route("/notifications/read-all", axum::routing::put(mark_all_read))
        .route("/notifications/{id}/read", axum::routing::put(mark_read))
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
        // Mobile Approval Routes
        .route(
            "/approvals/pending",
            axum::routing::get(get_pending_approvals),
        )
        .route(
            "/approvals/approved",
            axum::routing::get(get_approved_approvals),
        )
        .route(
            "/approvals/rejected",
            axum::routing::get(get_rejected_approvals),
        )
        .route("/approvals/stats", axum::routing::get(get_approval_stats))
        .route("/approvals/{id}", axum::routing::get(get_approval_by_id))
        .route("/approvals/{id}/approve", axum::routing::post(approve_task))
        .route("/approvals/{id}/reject", axum::routing::post(reject_task))
        .route(
            "/approvals/{id}/transfer",
            axum::routing::post(transfer_task),
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
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.pool.clone(),
            rls_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .nest("/api/mobile", protected_routes)
        .merge(create_api_info_router("topems-mobile"))
        .with_state(app_state)
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(cors);

    let cfg = RouteCompatConfig::new("mobile", "/api/mobile", &[]);
    let app = wrap_group2_router(app, cfg);

    let port = env::var("MOBILE_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .unwrap_or_else(|_| "8070".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-MOBILE 统一移动工作台启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::mobile_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

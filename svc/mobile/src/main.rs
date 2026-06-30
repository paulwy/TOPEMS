#![allow(dead_code)]

mod api;
mod db;
mod models;
mod plugin;

use axum::{
    extract::{FromRef, State},
    Json, Router,
};
use dotenv::dotenv;
use serde_json::json;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;

use topems_shared::{
    auth_middleware, build_health_response, create_api_info_router, create_cors_layer,
    init_telemetry, telemetry_middleware, ApiResponse, AuthState, ServiceHealth,
};

use api::auth::{login, logout, refresh_token, verify_code};
use api::barcode_scanner::{
    delete_scan_record, get_scan_by_id, get_scan_history, get_supported_barcode_types, scan_barcode,
};
use api::device::{register_device, update_push_token};
use api::media::{delete_media, get_audio, get_photos, get_video, upload_media};
use api::mobile_approval::{
    approve_task, get_approval_by_id, get_approval_stats, get_approved_approvals,
    get_pending_approvals, get_rejected_approvals, reject_task, transfer_task,
};
use api::notification::{get_notifications, get_unread_count, mark_all_read, mark_read};
use api::offline::{get_offline_status, sync_offline_data};
use api::offline_sync::{
    get_offline_status as get_offline_sync_status, get_sync_history, get_sync_policy,
    retry_failed_sync, sync_data, update_sync_policy,
};
use api::patrol::{
    create_patrol_record, delete_patrol_record, get_all_patrol_records, get_patrol_record,
    update_patrol_record,
};
use api::photo_upload::{
    batch_upload_photos, delete_photo, get_photo_by_id, get_photo_list, get_upload_progress,
    upload_photo,
};
use api::push_notification::{
    create_template, get_devices, get_notification_by_id, get_notification_list,
    get_notification_stats, get_templates, register_device as register_push_device, send_broadcast,
    send_notification,
};
use api::scan::{image_ocr, scan_barcode as scan_qr_barcode, scan_qrcode};
use api::shortcut::{create_shortcut, get_shortcuts};
use api::stats::{get_dashboard_stats, get_patrol_stats, get_task_stats};
use api::task::{
    create_task, delete_task, get_all_tasks, get_task, update_task, update_task_status,
};
use api::user::{get_profile, update_profile, upload_avatar};
use api::workbench::get_workbench_data;
use db::repository::*;
use models::*;

use plugin::create_routes;

#[derive(Clone)]
struct AppState {
    auth_state: AuthState,
    pool: PgPool,
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
    match db_create_scan_record(&state.pool, payload).await {
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
    match db_create_photo_evidence(&state.pool, payload).await {
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
    match db_create_audio_recording(&state.pool, payload).await {
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
    match db_create_video_recording(&state.pool, payload).await {
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

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

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
        .route("/api/mobile/auth/login", axum::routing::post(login))
        .route(
            "/api/mobile/auth/verify-code",
            axum::routing::post(verify_code),
        )
        .merge(create_routes());

    let protected_routes = Router::new()
        // Workbench Routes
        .route(
            "/api/mobile/workbench",
            axum::routing::get(get_workbench_data),
        )
        // Stats Routes
        .route(
            "/api/mobile/stats/dashboard",
            axum::routing::get(get_dashboard_stats),
        )
        .route(
            "/api/mobile/stats/patrol",
            axum::routing::get(get_patrol_stats),
        )
        .route("/api/mobile/stats/task", axum::routing::get(get_task_stats))
        // Auth Routes
        .route("/api/mobile/auth/logout", axum::routing::post(logout))
        .route(
            "/api/mobile/auth/refresh",
            axum::routing::post(refresh_token),
        )
        // User Routes
        .route(
            "/api/mobile/user/profile",
            axum::routing::get(get_profile).put(update_profile),
        )
        .route(
            "/api/mobile/user/avatar",
            axum::routing::post(upload_avatar),
        )
        // Notification Routes
        .route(
            "/api/mobile/notifications",
            axum::routing::get(get_notifications),
        )
        .route(
            "/api/mobile/notifications/unread-count",
            axum::routing::get(get_unread_count),
        )
        .route(
            "/api/mobile/notifications/read-all",
            axum::routing::put(mark_all_read),
        )
        .route(
            "/api/mobile/notifications/:id/read",
            axum::routing::put(mark_read),
        )
        // Scan Routes
        .route(
            "/api/mobile/scan/barcode",
            axum::routing::post(scan_barcode),
        )
        .route("/api/mobile/scan/qrcode", axum::routing::post(scan_qrcode))
        .route("/api/mobile/scan/image-ocr", axum::routing::post(image_ocr))
        // Offline Routes
        .route(
            "/api/mobile/offline/sync",
            axum::routing::post(sync_offline_data),
        )
        .route(
            "/api/mobile/offline/status",
            axum::routing::get(get_offline_status),
        )
        // Device Routes
        .route(
            "/api/mobile/devices/register",
            axum::routing::post(register_device),
        )
        .route(
            "/api/mobile/devices/token",
            axum::routing::put(update_push_token),
        )
        // Shortcut Routes
        .route(
            "/api/mobile/shortcuts",
            axum::routing::get(get_shortcuts).post(create_shortcut),
        )
        // Patrol Routes
        .route(
            "/api/mobile/patrol-records",
            axum::routing::get(get_all_patrol_records).post(create_patrol_record),
        )
        .route(
            "/api/mobile/patrol-records/{id}",
            axum::routing::get(get_patrol_record)
                .put(update_patrol_record)
                .delete(delete_patrol_record),
        )
        // Task Routes
        .route(
            "/api/mobile/mobile-tasks",
            axum::routing::get(get_all_tasks).post(create_task),
        )
        .route(
            "/api/mobile/mobile-tasks/{id}",
            axum::routing::get(get_task)
                .put(update_task)
                .delete(delete_task),
        )
        .route(
            "/api/mobile/mobile-tasks/{id}/status",
            axum::routing::post(update_task_status),
        )
        // Media Routes
        .route("/api/mobile/media/photos", axum::routing::get(get_photos))
        .route("/api/mobile/media/audio", axum::routing::get(get_audio))
        .route("/api/mobile/media/video", axum::routing::get(get_video))
        .route(
            "/api/mobile/media/upload/{file_type}",
            axum::routing::post(upload_media),
        )
        .route(
            "/api/mobile/media/{file_type}/{id}",
            axum::routing::delete(delete_media),
        )
        // Legacy Routes
        .route(
            "/api/mobile/dashboard/stats",
            axum::routing::get(get_dashboard_stats),
        )
        .route(
            "/api/mobile/scan-records",
            axum::routing::get(list_scan_records).post(create_scan_record),
        )
        .route(
            "/api/mobile/photo-evidences",
            axum::routing::get(list_photo_evidences).post(create_photo_evidence),
        )
        .route(
            "/api/mobile/audio-recordings",
            axum::routing::get(list_audio_recordings).post(create_audio_recording),
        )
        .route(
            "/api/mobile/video-recordings",
            axum::routing::get(list_video_recordings).post(create_video_recording),
        )
        // Enhanced Offline Sync Routes
        .route(
            "/api/mobile/offline/sync-data",
            axum::routing::post(sync_data),
        )
        .route(
            "/api/mobile/offline/sync-status",
            axum::routing::get(get_offline_sync_status),
        )
        .route(
            "/api/mobile/offline/sync-history",
            axum::routing::get(get_sync_history),
        )
        .route(
            "/api/mobile/offline/sync-policy",
            axum::routing::get(get_sync_policy).put(update_sync_policy),
        )
        .route(
            "/api/mobile/offline/retry-failed",
            axum::routing::post(retry_failed_sync),
        )
        // Push Notification Routes
        .route("/api/mobile/push/devices", axum::routing::get(get_devices))
        .route(
            "/api/mobile/push/devices/register",
            axum::routing::post(register_push_device),
        )
        .route(
            "/api/mobile/push/notifications",
            axum::routing::post(send_notification).get(get_notification_list),
        )
        .route(
            "/api/mobile/push/notifications/broadcast",
            axum::routing::post(send_broadcast),
        )
        .route(
            "/api/mobile/push/notifications/stats",
            axum::routing::get(get_notification_stats),
        )
        .route(
            "/api/mobile/push/notifications/{id}",
            axum::routing::get(get_notification_by_id),
        )
        .route(
            "/api/mobile/push/templates",
            axum::routing::get(get_templates).post(create_template),
        )
        // Barcode Scanner Routes
        .route(
            "/api/mobile/barcode/scan",
            axum::routing::post(scan_barcode),
        )
        .route(
            "/api/mobile/barcode/history",
            axum::routing::get(get_scan_history),
        )
        .route(
            "/api/mobile/barcode/history/{id}",
            axum::routing::get(get_scan_by_id).delete(delete_scan_record),
        )
        .route(
            "/api/mobile/barcode/types",
            axum::routing::get(get_supported_barcode_types),
        )
        // Photo Upload Routes
        .route(
            "/api/mobile/photos/upload",
            axum::routing::post(upload_photo),
        )
        .route(
            "/api/mobile/photos/batch-upload",
            axum::routing::post(batch_upload_photos),
        )
        .route("/api/mobile/photos", axum::routing::get(get_photo_list))
        .route(
            "/api/mobile/photos/{id}",
            axum::routing::get(get_photo_by_id).delete(delete_photo),
        )
        .route(
            "/api/mobile/photos/{id}/progress",
            axum::routing::get(get_upload_progress),
        )
        // Mobile Approval Routes
        .route(
            "/api/mobile/approvals/pending",
            axum::routing::get(get_pending_approvals),
        )
        .route(
            "/api/mobile/approvals/approved",
            axum::routing::get(get_approved_approvals),
        )
        .route(
            "/api/mobile/approvals/rejected",
            axum::routing::get(get_rejected_approvals),
        )
        .route(
            "/api/mobile/approvals/stats",
            axum::routing::get(get_approval_stats),
        )
        .route(
            "/api/mobile/approvals/{id}",
            axum::routing::get(get_approval_by_id),
        )
        .route(
            "/api/mobile/approvals/{id}/approve",
            axum::routing::post(approve_task),
        )
        .route(
            "/api/mobile/approvals/{id}/reject",
            axum::routing::post(reject_task),
        )
        .route(
            "/api/mobile/approvals/{id}/transfer",
            axum::routing::post(transfer_task),
        )
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-mobile"))
        .with_state(app_state)
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(cors);

    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "8070".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-MOBILE 统一移动工作台启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

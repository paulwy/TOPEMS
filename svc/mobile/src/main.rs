#![allow(dead_code)]

mod api;
mod db;
mod models;

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
    init_logging, ApiResponse, AuthState, ServiceHealth,
};

use api::auth::{login, logout, refresh_token, verify_code};
use api::device::{register_device, update_push_token};
use api::media::{delete_media, get_audio, get_photos, get_video, upload_media};
use api::notification::{get_notifications, get_unread_count, mark_all_read};
use api::offline::{get_offline_status, sync_offline_data};
use api::patrol::{
    create_patrol_record, delete_patrol_record, get_all_patrol_records, get_patrol_record,
    update_patrol_record,
};
use api::scan::{image_ocr, scan_barcode, scan_qrcode};
use api::shortcut::{create_shortcut, get_shortcuts};
use api::stats::{get_dashboard_stats, get_patrol_stats, get_task_stats};
use api::task::{
    create_task, delete_task, get_all_tasks, get_task, update_task, update_task_status,
};
use api::user::{get_profile, update_profile, upload_avatar};
use db::repository::*;
use models::*;

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

    init_logging("topems-mobile");

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
        .route("/api/v1/auth/login", axum::routing::post(login))
        .route("/api/v1/auth/verify-code", axum::routing::post(verify_code));

    let protected_routes = Router::new()
        // Stats Routes
        .route(
            "/api/v1/stats/dashboard",
            axum::routing::get(get_dashboard_stats),
        )
        .route("/api/v1/stats/patrol", axum::routing::get(get_patrol_stats))
        .route("/api/v1/stats/task", axum::routing::get(get_task_stats))
        // Auth Routes
        .route("/api/v1/auth/logout", axum::routing::post(logout))
        .route("/api/v1/auth/refresh", axum::routing::post(refresh_token))
        // User Routes
        .route(
            "/api/v1/user/profile",
            axum::routing::get(get_profile).put(update_profile),
        )
        .route("/api/v1/user/avatar", axum::routing::post(upload_avatar))
        // Notification Routes
        .route(
            "/api/v1/notifications",
            axum::routing::get(get_notifications),
        )
        .route(
            "/api/v1/notifications/unread-count",
            axum::routing::get(get_unread_count),
        )
        .route(
            "/api/v1/notifications/read-all",
            axum::routing::put(mark_all_read),
        )
        // Scan Routes
        .route("/api/v1/scan/barcode", axum::routing::post(scan_barcode))
        .route("/api/v1/scan/qrcode", axum::routing::post(scan_qrcode))
        .route("/api/v1/scan/image-ocr", axum::routing::post(image_ocr))
        // Offline Routes
        .route(
            "/api/v1/offline/sync",
            axum::routing::post(sync_offline_data),
        )
        .route(
            "/api/v1/offline/status",
            axum::routing::get(get_offline_status),
        )
        // Device Routes
        .route(
            "/api/v1/devices/register",
            axum::routing::post(register_device),
        )
        .route(
            "/api/v1/devices/token",
            axum::routing::put(update_push_token),
        )
        // Shortcut Routes
        .route(
            "/api/v1/shortcuts",
            axum::routing::get(get_shortcuts).post(create_shortcut),
        )
        // Patrol Routes
        .route(
            "/api/v1/patrol-records",
            axum::routing::get(get_all_patrol_records).post(create_patrol_record),
        )
        .route(
            "/api/v1/patrol-records/{id}",
            axum::routing::get(get_patrol_record)
                .put(update_patrol_record)
                .delete(delete_patrol_record),
        )
        // Task Routes
        .route(
            "/api/v1/mobile-tasks",
            axum::routing::get(get_all_tasks).post(create_task),
        )
        .route(
            "/api/v1/mobile-tasks/{id}",
            axum::routing::get(get_task)
                .put(update_task)
                .delete(delete_task),
        )
        .route(
            "/api/v1/mobile-tasks/{id}/status",
            axum::routing::post(update_task_status),
        )
        // Media Routes
        .route("/api/v1/media/photos", axum::routing::get(get_photos))
        .route("/api/v1/media/audio", axum::routing::get(get_audio))
        .route("/api/v1/media/video", axum::routing::get(get_video))
        .route(
            "/api/v1/media/upload/{file_type}",
            axum::routing::post(upload_media),
        )
        .route(
            "/api/v1/media/{file_type}/{id}",
            axum::routing::delete(delete_media),
        )
        // Legacy Routes
        .route(
            "/api/v1/dashboard/stats",
            axum::routing::get(get_dashboard_stats),
        )
        .route(
            "/api/v1/scan-records",
            axum::routing::get(list_scan_records).post(create_scan_record),
        )
        .route(
            "/api/v1/photo-evidences",
            axum::routing::get(list_photo_evidences).post(create_photo_evidence),
        )
        .route(
            "/api/v1/audio-recordings",
            axum::routing::get(list_audio_recordings).post(create_audio_recording),
        )
        .route(
            "/api/v1/video-recordings",
            axum::routing::get(list_video_recordings).post(create_video_recording),
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
        .layer(cors);

    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "8070".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-MOBILE 统一移动工作台启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

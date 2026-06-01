

mod models;
mod db;

use axum::{
    extract::{FromRef, Path, State},
    Json, Router,
};
use serde_json::json;
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use dotenv::dotenv;
use sqlx::PgPool;

use topems_shared::{ApiResponse, AuthState, create_cors_layer};

use models::*;
use db::repository::*;

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

async fn health_check() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("OK".to_string(), "移动服务工作正常"))
}

async fn get_dashboard_stats(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let (patrol_count, scan_count, _photo_count, task_count) = match db_get_dashboard_stats(&state.pool).await {
        Ok(stats) => stats,
        Err(e) => {
            tracing::error!("获取统计数据失败: {}", e);
            (0, 0, 0, 0)
        }
    };

    Json(ApiResponse::success(
        json!({
            "today_patrols": patrol_count,
            "today_scans": scan_count,
            "pending_tasks": 0,
            "in_progress_tasks": 0,
            "completed_tasks": task_count
        }),
        "获取统计数据成功"
    ))
}

async fn list_patrol_records(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_patrol_records(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取巡逻记录失败: {}", e);
            vec![]
        }
    };
    let total = records.len() as i64;
    Json(ApiResponse::success(json!({ "items": records, "total": total }), "获取巡逻记录成功"))
}

async fn create_patrol_record(State(state): State<AppState>, Json(payload): Json<CreatePatrolRecord>) -> Json<ApiResponse<PatrolRecord>> {
    match db_create_patrol_record(&state.pool, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建巡逻记录成功")),
        Err(e) => {
            tracing::error!("创建巡逻记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建巡逻记录失败: {}", e)))
        }
    }
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
    Json(ApiResponse::success(json!({ "items": records, "total": total }), "获取扫码记录成功"))
}

async fn create_scan_record(State(state): State<AppState>, Json(payload): Json<CreateScanRecord>) -> Json<ApiResponse<ScanRecord>> {
    match db_create_scan_record(&state.pool, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建扫码记录成功")),
        Err(e) => {
            tracing::error!("创建扫码记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建扫码记录失败: {}", e)))
        }
    }
}

async fn list_photo_evidences(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_photo_evidence(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取照片记录失败: {}", e);
            vec![]
        }
    };
    Json(ApiResponse::success(json!({ "items": records, "total": records.len() }), "获取照片记录成功"))
}

async fn create_photo_evidence(State(state): State<AppState>, Json(payload): Json<CreatePhotoEvidence>) -> Json<ApiResponse<PhotoEvidence>> {
    match db_create_photo_evidence(&state.pool, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建照片记录成功")),
        Err(e) => {
            tracing::error!("创建照片记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建照片记录失败: {}", e)))
        }
    }
}

async fn list_audio_recordings(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_audio_recordings(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取音频记录失败: {}", e);
            vec![]
        }
    };
    Json(ApiResponse::success(json!({ "items": records, "total": records.len() }), "获取音频记录成功"))
}

async fn create_audio_recording(State(state): State<AppState>, Json(payload): Json<CreateAudioRecording>) -> Json<ApiResponse<AudioRecording>> {
    match db_create_audio_recording(&state.pool, payload).await {
        Ok(record) => Json(ApiResponse::success(record, "创建音频记录成功")),
        Err(e) => {
            tracing::error!("创建音频记录失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建音频记录失败: {}", e)))
        }
    }
}

async fn list_video_recordings(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_video_recordings(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取视频记录失败: {}", e);
            vec![]
        }
    };
    Json(ApiResponse::success(json!({ "items": records, "total": records.len() }), "获取视频记录成功"))
}

async fn create_video_recording(State(state): State<AppState>, Json(payload): Json<CreateVideoRecording>) -> Json<ApiResponse<VideoRecording>> {
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
    Json(ApiResponse::success(json!({ "items": records, "total": total }), "获取移动任务成功"))
}

async fn create_mobile_task(State(state): State<AppState>, Json(payload): Json<CreateMobileTask>) -> Json<ApiResponse<MobileTask>> {
    match db_create_mobile_task(&state.pool, payload).await {
        Ok(task) => Json(ApiResponse::success(task, "创建移动任务成功")),
        Err(e) => {
            tracing::error!("创建移动任务失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建移动任务失败: {}", e)))
        }
    }
}

async fn update_task_status(State(state): State<AppState>, Path(id): Path<uuid::Uuid>, Json(payload): Json<UpdateTaskStatus>) -> Json<ApiResponse<MobileTask>> {
    match db_update_task_status(&state.pool, id, &payload.status).await {
        Ok(Some(task)) => Json(ApiResponse::success(task, "更新任务状态成功")),
        Ok(None) => Json(ApiResponse::error(404, "任务不存在")),
        Err(e) => {
            tracing::error!("更新任务状态失败: {}", e);
            Json(ApiResponse::error(500, &format!("更新任务状态失败: {}", e)))
        }
    }
}

async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(include_str!("../init.sql"))
        .execute(pool)
        .await?;
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());
    
    let pool = match PgPool::connect(&database_url).await {
        Ok(p) => {
            tracing::info!("数据库连接成功");
            if let Err(e) = init_database(&p).await {
                tracing::warn!("数据库初始化警告: {}", e);
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
        pool: pool.clone()
    };
    let cors = create_cors_layer();

    let app = Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/api/v1/dashboard/stats", axum::routing::get(get_dashboard_stats))
        .route("/api/v1/patrol-records", axum::routing::get(list_patrol_records).post(create_patrol_record))
        .route("/api/v1/scan-records", axum::routing::get(list_scan_records).post(create_scan_record))
        .route("/api/v1/photo-evidences", axum::routing::get(list_photo_evidences).post(create_photo_evidence))
        .route("/api/v1/audio-recordings", axum::routing::get(list_audio_recordings).post(create_audio_recording))
        .route("/api/v1/video-recordings", axum::routing::get(list_video_recordings).post(create_video_recording))
        .route("/api/v1/mobile-tasks", axum::routing::get(list_mobile_tasks).post(create_mobile_task))
        .route("/api/v1/mobile-tasks/:id/status", axum::routing::put(update_task_status))
        .with_state(app_state)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8019".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-MOBILE 统一移动工作台启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

mod models;

use axum::{
    extract::{FromRef, Path, State},
    Json, Router,
};
use serde_json::json;
use std::sync::{Arc, Mutex};
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

use models::{
    PatrolRecord, CreatePatrolRecord,
    ScanRecord, CreateScanRecord,
    MobileTask, CreateMobileTask, UpdateTaskStatus,
};

#[derive(Clone)]
struct AppState {
    patrol_records: Arc<Mutex<Vec<PatrolRecord>>>,
    scan_records: Arc<Mutex<Vec<ScanRecord>>>,
    mobile_tasks: Arc<Mutex<Vec<MobileTask>>>,
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl AppState {
    fn new(auth_state: AuthState) -> Self {
        AppState {
            patrol_records: Arc::new(Mutex::new(Vec::new())),
            scan_records: Arc::new(Mutex::new(Vec::new())),
            mobile_tasks: Arc::new(Mutex::new(Vec::new())),
            auth_state,
        }
    }
}

async fn health_check() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(json!({
        "service": "topems-mobile",
        "status": "healthy"
    }), "服务健康检查"))
}

async fn list_patrol_records(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let records = state.patrol_records.lock().unwrap();
    Json(ApiResponse::success(json!({
        "patrol_records": records.clone(),
        "total": records.len()
    }), "获取巡逻记录成功"))
}

async fn create_patrol_record(
    State(state): State<AppState>,
    Json(payload): Json<CreatePatrolRecord>,
) -> Json<ApiResponse<PatrolRecord>> {
    let mut records = state.patrol_records.lock().unwrap();
    
    let record = PatrolRecord {
        id: uuid::Uuid::new_v4(),
        title: payload.title,
        description: payload.description,
        location_lat: payload.location_lat,
        location_lng: payload.location_lng,
        address: payload.address,
        patrol_type: payload.patrol_type,
        status: payload.status.unwrap_or("completed".to_string()),
        checked_by: payload.checked_by,
        checked_at: chrono::Utc::now(),
        created_at: chrono::Utc::now(),
    };
    
    records.push(record.clone());
    Json(ApiResponse::success(record, "创建巡逻记录成功"))
}

async fn list_scan_records(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let records = state.scan_records.lock().unwrap();
    Json(ApiResponse::success(json!({
        "scan_records": records.clone(),
        "total": records.len()
    }), "获取扫码记录成功"))
}

async fn create_scan_record(
    State(state): State<AppState>,
    Json(payload): Json<CreateScanRecord>,
) -> Json<ApiResponse<ScanRecord>> {
    let mut records = state.scan_records.lock().unwrap();
    
    let record = ScanRecord {
        id: uuid::Uuid::new_v4(),
        barcode: payload.barcode,
        location_lat: payload.location_lat,
        location_lng: payload.location_lng,
        item_type: payload.item_type,
        quantity: payload.quantity,
        operator: payload.operator,
        scanned_at: chrono::Utc::now(),
        created_at: chrono::Utc::now(),
    };
    
    records.push(record.clone());
    Json(ApiResponse::success(record, "创建扫码记录成功"))
}

async fn list_mobile_tasks(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let tasks = state.mobile_tasks.lock().unwrap();
    Json(ApiResponse::success(json!({
        "mobile_tasks": tasks.clone(),
        "total": tasks.len()
    }), "获取移动任务成功"))
}

async fn create_mobile_task(
    State(state): State<AppState>,
    Json(payload): Json<CreateMobileTask>,
) -> Json<ApiResponse<MobileTask>> {
    let mut tasks = state.mobile_tasks.lock().unwrap();
    
    let task = MobileTask {
        id: uuid::Uuid::new_v4(),
        title: payload.title,
        description: payload.description,
        task_type: payload.task_type,
        priority: payload.priority.unwrap_or("normal".to_string()),
        status: "pending".to_string(),
        assignee: payload.assignee,
        location_lat: payload.location_lat,
        location_lng: payload.location_lng,
        due_date: payload.due_date.map(|d| chrono::NaiveDate::parse_from_str(&d, "%Y-%m-%d").unwrap_or(chrono::Utc::now().date_naive())),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };
    
    tasks.push(task.clone());
    Json(ApiResponse::success(task, "创建移动任务成功"))
}

async fn update_task_status(
    State(state): State<AppState>,
    Path(id): Path<uuid::Uuid>,
    Json(payload): Json<UpdateTaskStatus>,
) -> Json<ApiResponse<MobileTask>> {
    let mut tasks = state.mobile_tasks.lock().unwrap();
    if let Some(index) = tasks.iter_mut().position(|t| t.id == id) {
        tasks[index].status = payload.status;
        tasks[index].updated_at = chrono::Utc::now();
        return Json(ApiResponse::success(tasks[index].clone(), "更新任务状态成功"));
    }
    Json(ApiResponse::<MobileTask>::error(404, "任务未找到"))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });

    let auth_state = AuthState::new(jwt_secret);
    let app_state = AppState::new(auth_state);

    let cors = create_cors_layer();

    let app = Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/api/v1/patrol-records", axum::routing::get(list_patrol_records).post(create_patrol_record))
        .route("/api/v1/scan-records", axum::routing::get(list_scan_records).post(create_scan_record))
        .route("/api/v1/mobile-tasks", axum::routing::get(list_mobile_tasks).post(create_mobile_task))
        .route("/api/v1/mobile-tasks/{id}/status", axum::routing::put(update_task_status))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8018".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-MOBILE 统一移动工作台启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

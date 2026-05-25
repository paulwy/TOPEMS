use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Hazard {
    id: String,
    hazard_id: String,
    description: String,
    risk_level: String,
    location: String,
    status: String,
    reported_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateHazardRequest {
    description: String,
    risk_level: String,
    location: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Incident {
    id: String,
    incident_id: String,
    title: String,
    type_: String,
    severity: String,
    status: String,
    occurred_date: String,
    department: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateIncidentRequest {
    title: String,
    type_: String,
    severity: String,
    department: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EquipmentInspection {
    id: String,
    equipment_name: String,
    equipment_id: String,
    inspection_date: String,
    inspector: String,
    status: String,
    remarks: String,
    next_check_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateEquipmentInspectionRequest {
    equipment_name: String,
    equipment_id: String,
    inspector: String,
    status: String,
    remarks: String,
    next_check_date: Option<String>,
}

#[derive(Debug)]
struct AppState {
    hazards: Mutex<Vec<Hazard>>,
    incidents: Mutex<Vec<Incident>>,
    inspections: Mutex<Vec<EquipmentInspection>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    message: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_ehs=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-EHS 安全环保职业健康系统启动中...");
    dotenv::dotenv().ok();

    let state = Arc::new(AppState {
        hazards: Mutex::new(vec![
            Hazard {
                id: "1".to_string(),
                hazard_id: "HZ-2026-001".to_string(),
                description: "化学品存储区通风不足".to_string(),
                risk_level: "中风险".to_string(),
                location: "原料仓库 A区".to_string(),
                status: "整改中".to_string(),
                reported_date: "2026-05-18".to_string(),
            },
        ]),
        incidents: Mutex::new(vec![
            Incident {
                id: "1".to_string(),
                incident_id: "INC-2026-001".to_string(),
                title: "反应釜泄漏未遂事件".to_string(),
                type_: "安全事件".to_string(),
                severity: "中等".to_string(),
                status: "已处理".to_string(),
                occurred_date: "2026-05-15".to_string(),
                department: "生产部".to_string(),
            },
        ]),
        inspections: Mutex::new(vec![
            EquipmentInspection {
                id: "1".to_string(),
                equipment_name: "消防设施年度检查".to_string(),
                equipment_id: "EQ-FIRE-001".to_string(),
                inspection_date: "2026-05-20".to_string(),
                inspector: "王安全".to_string(),
                status: "合格".to_string(),
                remarks: "所有设施正常".to_string(),
                next_check_date: Some("2027-05-20".to_string()),
            },
        ]),
    });

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/hazards", get(list_hazards).post(create_hazard))
        .route("/api/v1/incidents", get(list_incidents).post(create_incident))
        .route("/api/v1/equipment-inspections", get(list_inspections).post(create_inspection))
        .with_state(state);

    let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8008".to_string())
        .parse()
        .unwrap_or(8008);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS-EHS 服务运行在 http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

async fn home() -> &'static str {
    "TOPEMS-EHS 安全环保职业健康系统 API"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse {
        success: true,
        data: Some("TOPEMS-EHS is running!".to_string()),
        message: "OK".to_string(),
    })
}

async fn list_hazards(State(state): State<Arc<AppState>>) -> Json<ApiResponse<Vec<Hazard>>> {
    let hazards = state.hazards.lock().unwrap();
    Json(ApiResponse {
        success: true,
        data: Some(hazards.clone()),
        message: "Success".to_string(),
    })
}

async fn create_hazard(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateHazardRequest>,
) -> Json<ApiResponse<Hazard>> {
    let count = state.hazards.lock().unwrap().len() + 1;
    let hazard = Hazard {
        id: Uuid::new_v4().to_string(),
        hazard_id: format!("HZ-2026-{:03}", count),
        description: request.description,
        risk_level: request.risk_level,
        location: request.location,
        status: "待处理".to_string(),
        reported_date: Utc::now().format("%Y-%m-%d").to_string(),
    };

    state.hazards.lock().unwrap().push(hazard.clone());
    
    Json(ApiResponse {
        success: true,
        data: Some(hazard),
        message: "创建成功".to_string(),
    })
}

async fn list_incidents(State(state): State<Arc<AppState>>) -> Json<ApiResponse<Vec<Incident>>> {
    let incidents = state.incidents.lock().unwrap();
    Json(ApiResponse {
        success: true,
        data: Some(incidents.clone()),
        message: "Success".to_string(),
    })
}

async fn create_incident(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateIncidentRequest>,
) -> Json<ApiResponse<Incident>> {
    let count = state.incidents.lock().unwrap().len() + 1;
    let incident = Incident {
        id: Uuid::new_v4().to_string(),
        incident_id: format!("INC-2026-{:03}", count),
        title: request.title,
        type_: request.type_,
        severity: request.severity,
        status: "调查中".to_string(),
        occurred_date: Utc::now().format("%Y-%m-%d").to_string(),
        department: request.department,
    };

    state.incidents.lock().unwrap().push(incident.clone());
    
    Json(ApiResponse {
        success: true,
        data: Some(incident),
        message: "创建成功".to_string(),
    })
}

async fn list_inspections(State(state): State<Arc<AppState>>) -> Json<ApiResponse<Vec<EquipmentInspection>>> {
    let inspections = state.inspections.lock().unwrap();
    Json(ApiResponse {
        success: true,
        data: Some(inspections.clone()),
        message: "Success".to_string(),
    })
}

async fn create_inspection(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateEquipmentInspectionRequest>,
) -> Json<ApiResponse<EquipmentInspection>> {
    let inspection = EquipmentInspection {
        id: Uuid::new_v4().to_string(),
        equipment_name: request.equipment_name,
        equipment_id: request.equipment_id,
        inspection_date: Utc::now().format("%Y-%m-%d").to_string(),
        inspector: request.inspector,
        status: request.status,
        remarks: request.remarks,
        next_check_date: request.next_check_date,
    };

    state.inspections.lock().unwrap().push(inspection.clone());
    
    Json(ApiResponse {
        success: true,
        data: Some(inspection),
        message: "创建成功".to_string(),
    })
}

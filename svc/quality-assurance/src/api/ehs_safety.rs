use axum::{extract::Path, extract::State, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/qa/ehs/safety", get(list_inspections).post(create_inspection))
        .route("/api/qa/ehs/safety/{id}", get(get_inspection))
}

#[derive(Debug, Deserialize)]
pub struct SafetyQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SafetyInspection {
    pub id: String,
    pub inspection_no: String,
    pub title: String,
    pub description: Option<String>,
    pub inspection_type: Option<String>,
    pub location: Option<String>,
    pub inspector: Option<String>,
    pub inspected_at: Option<String>,
    pub result: Option<String>,
    pub status: String,
}

pub async fn list_inspections(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<SafetyInspection>>> {
    tracing::info!("Listing safety inspections");
    Json(ApiResponse::success(Vec::<SafetyInspection>::new(), "获取安全检查列表成功"))
}

pub async fn create_inspection(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<SafetyInspection>> {
    tracing::info!("Creating safety inspection: {:?}", req);
    Json(ApiResponse::success(
        SafetyInspection {
            id: uuid::Uuid::new_v4().to_string(),
            inspection_no: format!("SI-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            title: "安全检查".to_string(),
            description: None,
            inspection_type: None,
            location: None,
            inspector: None,
            inspected_at: None,
            result: None,
            status: "pending".to_string(),
        },
        "安全检查创建成功",
    ))
}

pub async fn get_inspection(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<SafetyInspection>> {
    tracing::info!("Getting safety inspection: {}", id);
    Json(ApiResponse::success(
        SafetyInspection {
            id,
            inspection_no: "SI-001".to_string(),
            title: "月度安全检查".to_string(),
            description: Some("车间安全检查".to_string()),
            inspection_type: Some("定期检查".to_string()),
            location: Some("生产车间A".to_string()),
            inspector: Some("安全员A".to_string()),
            inspected_at: Some(chrono::Utc::now().to_rfc3339()),
            result: Some("合格".to_string()),
            status: "completed".to_string(),
        },
        "获取安全检查成功",
    ))
}

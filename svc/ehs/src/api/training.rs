//! Training handlers

use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/ehs/training", get(list_trainings).post(create_training))
        .route("/api/ehs/training/{id}", get(get_training))
}

#[derive(Debug, Deserialize)]
pub struct TrainingQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Training {
    pub id: String,
    pub training_no: String,
    pub title: String,
    pub content: Option<String>,
    pub trainer: Option<String>,
    pub training_type: Option<String>,
    pub duration_hours: Option<i32>,
    pub scheduled_at: Option<String>,
    pub status: String,
}

pub async fn list_trainings(
    State(_state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<Training>>> {
    tracing::info!("Listing trainings");
    Json(ApiResponse::success(Vec::<Training>::new(), "获取培训列表成功"))
}

pub async fn create_training(
    State(_state): State<crate::AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Training>> {
    tracing::info!("Creating training: {:?}", req);
    Json(ApiResponse::success(
        Training {
            id: uuid::Uuid::new_v4().to_string(),
            training_no: format!("TRN-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            title: "安全培训".to_string(),
            content: None,
            trainer: None,
            training_type: None,
            duration_hours: Some(4),
            scheduled_at: None,
            status: "scheduled".to_string(),
        },
        "培训创建成功",
    ))
}

pub async fn get_training(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Training>> {
    tracing::info!("Getting training: {}", id);
    Json(ApiResponse::success(
        Training {
            id,
            training_no: "TRN-001".to_string(),
            title: "消防安全培训".to_string(),
            content: Some("灭火器使用方法".to_string()),
            trainer: Some("安全主管A".to_string()),
            training_type: Some("安全培训".to_string()),
            duration_hours: Some(4),
            scheduled_at: Some(chrono::Utc::now().to_rfc3339()),
            status: "completed".to_string(),
        },
        "获取培训成功",
    ))
}

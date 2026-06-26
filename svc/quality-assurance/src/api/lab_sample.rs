use axum::{extract::Path, extract::State, routing::{get, post, put}, Json, Router};
use serde::{Deserialize, Serialize};

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/qa/lab/sample", get(list_samples).post(register_sample))
        .route("/api/qa/lab/sample/{id}", get(get_sample).put(update_sample))
}

#[derive(Debug, Deserialize)]
pub struct SampleQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Sample {
    pub id: String,
    pub sample_no: String,
    pub sample_name: String,
    pub sample_type: Option<String>,
    pub source: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub status: String,
}

pub async fn list_samples(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<Sample>>> {
    tracing::info!("Listing lab samples");
    Json(ApiResponse::success(Vec::<Sample>::new(), "获取样品列表成功"))
}

pub async fn register_sample(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Sample>> {
    tracing::info!("Registering sample: {:?}", req);
    Json(ApiResponse::success(
        Sample {
            id: uuid::Uuid::new_v4().to_string(),
            sample_no: format!("SMP-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            sample_name: "样品".to_string(),
            sample_type: None,
            source: None,
            quantity: Some(100.0),
            unit: Some("g".to_string()),
            status: "received".to_string(),
        },
        "样品登记成功",
    ))
}

pub async fn get_sample(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Sample>> {
    tracing::info!("Getting sample: {}", id);
    Json(ApiResponse::success(
        Sample {
            id,
            sample_no: "SMP-001".to_string(),
            sample_name: "样品".to_string(),
            sample_type: Some("原材料".to_string()),
            source: Some("供应商A".to_string()),
            quantity: Some(100.0),
            unit: Some("g".to_string()),
            status: "received".to_string(),
        },
        "获取样品成功",
    ))
}

pub async fn update_sample(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Sample>> {
    tracing::info!("Updating sample {}: {:?}", id, req);
    Json(ApiResponse::success(
        Sample {
            id,
            sample_no: "SMP-001".to_string(),
            sample_name: "样品".to_string(),
            sample_type: Some("原材料".to_string()),
            source: Some("供应商A".to_string()),
            quantity: Some(100.0),
            unit: Some("g".to_string()),
            status: "received".to_string(),
        },
        "样品更新成功",
    ))
}

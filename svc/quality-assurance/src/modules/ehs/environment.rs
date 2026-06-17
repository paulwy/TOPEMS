//! Environment handlers

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct EnvironmentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EnvironmentRecord {
    pub id: String,
    pub record_no: String,
    pub monitor_type: Option<String>,
    pub monitor_point: Option<String>,
    pub data: serde_json::Value,
    pub status: String,
    pub monitored_at: Option<String>,
}

pub async fn list_records(
    State(_state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<EnvironmentRecord>>> {
    tracing::info!("Listing environment records");
    Json(ApiResponse::success(Vec::<EnvironmentRecord>::new(), "获取环境记录列表成功"))
}

pub async fn create_record(
    State(_state): State<crate::AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<EnvironmentRecord>> {
    tracing::info!("Creating environment record: {:?}", req);
    Json(ApiResponse::success(
        EnvironmentRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!("ENV-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            monitor_type: Some("废气".to_string()),
            monitor_point: Some("排放口A".to_string()),
            data: serde_json::json!({"pm25": 35, "so2": 0.02}),
            status: "normal".to_string(),
            monitored_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "环境记录创建成功",
    ))
}

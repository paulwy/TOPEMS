//! Inspection Record handlers

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct RecordQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct InspectionRecord {
    pub id: String,
    pub record_no: String,
    pub task_id: String,
    pub test_data: serde_json::Value,
    pub conclusion: String,
    pub recorded_by: String,
    pub recorded_at: String,
}

pub async fn list_records(
    State(_state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<InspectionRecord>>> {
    tracing::info!("Listing inspection records");
    Json(ApiResponse::success(Vec::<InspectionRecord>::new(), "获取检测记录列表成功"))
}

pub async fn create_record(
    State(_state): State<crate::AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<InspectionRecord>> {
    tracing::info!("Creating record: {:?}", req);
    Json(ApiResponse::success(
        InspectionRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!("REC-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            task_id: uuid::Uuid::new_v4().to_string(),
            test_data: serde_json::json!({}),
            conclusion: "合格".to_string(),
            recorded_by: "检测员A".to_string(),
            recorded_at: chrono::Utc::now().to_rfc3339(),
        },
        "检测记录创建成功",
    ))
}

pub async fn get_record(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<InspectionRecord>> {
    tracing::info!("Getting record: {}", id);
    Json(ApiResponse::success(
        InspectionRecord {
            id,
            record_no: "REC-001".to_string(),
            task_id: uuid::Uuid::new_v4().to_string(),
            test_data: serde_json::json!({"item1": 10.5, "item2": 20.3}),
            conclusion: "合格".to_string(),
            recorded_by: "检测员A".to_string(),
            recorded_at: chrono::Utc::now().to_rfc3339(),
        },
        "获取检测记录成功",
    ))
}

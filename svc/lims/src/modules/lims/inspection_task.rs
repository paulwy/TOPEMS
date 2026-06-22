//! Inspection Task handlers

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct TaskQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InspectionTask {
    pub id: String,
    pub task_no: String,
    pub sample_id: String,
    pub test_item: String,
    pub method: Option<String>,
    pub status: String,
    pub assigned_to: Option<String>,
    pub conclusion: Option<String>,
}

pub async fn list_tasks(
    State(_state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<InspectionTask>>> {
    tracing::info!("Listing inspection tasks");
    Json(ApiResponse::success(Vec::<InspectionTask>::new(), "获取检测任务列表成功"))
}

pub async fn create_task(
    State(_state): State<crate::AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<InspectionTask>> {
    tracing::info!("Creating task: {:?}", req);
    Json(ApiResponse::success(
        InspectionTask {
            id: uuid::Uuid::new_v4().to_string(),
            task_no: format!("TSK-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            sample_id: uuid::Uuid::new_v4().to_string(),
            test_item: "检测项目".to_string(),
            method: None,
            status: "pending".to_string(),
            assigned_to: None,
            conclusion: None,
        },
        "检测任务创建成功",
    ))
}

pub async fn get_task(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<InspectionTask>> {
    tracing::info!("Getting task: {}", id);
    Json(ApiResponse::success(
        InspectionTask {
            id,
            task_no: "TSK-001".to_string(),
            sample_id: uuid::Uuid::new_v4().to_string(),
            test_item: "检测项目".to_string(),
            method: Some("标准方法".to_string()),
            status: "pending".to_string(),
            assigned_to: Some("检测员A".to_string()),
            conclusion: None,
        },
        "获取检测任务成功",
    ))
}

pub async fn submit_result(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<InspectionTask>> {
    tracing::info!("Submitting result for task {}: {:?}", id, req);
    Json(ApiResponse::success(
        InspectionTask {
            id,
            task_no: "TSK-001".to_string(),
            sample_id: uuid::Uuid::new_v4().to_string(),
            test_item: "检测项目".to_string(),
            method: Some("标准方法".to_string()),
            status: "completed".to_string(),
            assigned_to: Some("检测员A".to_string()),
            conclusion: Some("合格".to_string()),
        },
        "提交检测结果成功",
    ))
}

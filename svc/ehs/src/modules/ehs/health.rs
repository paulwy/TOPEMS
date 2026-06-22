//! Health handlers

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct HealthQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HealthRecord {
    pub id: String,
    pub record_no: String,
    pub employee_name: Option<String>,
    pub check_type: Option<String>,
    pub check_date: Option<String>,
    pub result: Option<String>,
    pub status: String,
}

pub async fn list_records(
    State(_state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<HealthRecord>>> {
    tracing::info!("Listing health records");
    Json(ApiResponse::success(Vec::<HealthRecord>::new(), "获取健康记录列表成功"))
}

pub async fn create_record(
    State(_state): State<crate::AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<HealthRecord>> {
    tracing::info!("Creating health record: {:?}", req);
    Json(ApiResponse::success(
        HealthRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!("HLT-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            employee_name: Some("员工A".to_string()),
            check_type: Some("年度体检".to_string()),
            check_date: Some(chrono::Utc::now().to_rfc3339()),
            result: Some("正常".to_string()),
            status: "normal".to_string(),
        },
        "健康记录创建成功",
    ))
}

//! Accident handlers

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct AccidentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Accident {
    pub id: String,
    pub accident_no: String,
    pub title: String,
    pub description: Option<String>,
    pub accident_type: Option<String>,
    pub severity: String,
    pub location: Option<String>,
    pub occurred_at: Option<String>,
    pub casualties: Option<i32>,
    pub economic_loss: Option<f64>,
    pub status: String,
}

pub async fn list_accidents(
    State(_state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<Accident>>> {
    tracing::info!("Listing accidents");
    Json(ApiResponse::success(Vec::<Accident>::new(), "获取事故列表成功"))
}

pub async fn report_accident(
    State(_state): State<crate::AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Accident>> {
    tracing::info!("Reporting accident: {:?}", req);
    Json(ApiResponse::success(
        Accident {
            id: uuid::Uuid::new_v4().to_string(),
            accident_no: format!("ACC-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            title: "事故".to_string(),
            description: None,
            accident_type: None,
            severity: "minor".to_string(),
            location: None,
            occurred_at: None,
            casualties: Some(0),
            economic_loss: Some(0.0),
            status: "reported".to_string(),
        },
        "事故报告成功",
    ))
}

pub async fn get_accident(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Accident>> {
    tracing::info!("Getting accident: {}", id);
    Json(ApiResponse::success(
        Accident {
            id,
            accident_no: "ACC-001".to_string(),
            title: "机械伤害事故".to_string(),
            description: Some("操作工手指受伤".to_string()),
            accident_type: Some("机械伤害".to_string()),
            severity: "minor".to_string(),
            location: Some("生产车间B".to_string()),
            occurred_at: Some(chrono::Utc::now().to_rfc3339()),
            casualties: Some(1),
            economic_loss: Some(5000.0),
            status: "investigating".to_string(),
        },
        "获取事故成功",
    ))
}

pub async fn update_accident(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Accident>> {
    tracing::info!("Updating accident {}: {:?}", id, req);
    Json(ApiResponse::success(
        Accident {
            id,
            accident_no: "ACC-001".to_string(),
            title: "机械伤害事故".to_string(),
            description: Some("操作工手指受伤".to_string()),
            accident_type: Some("机械伤害".to_string()),
            severity: "minor".to_string(),
            location: Some("生产车间B".to_string()),
            occurred_at: Some(chrono::Utc::now().to_rfc3339()),
            casualties: Some(1),
            economic_loss: Some(5000.0),
            status: "closed".to_string(),
        },
        "事故更新成功",
    ))
}

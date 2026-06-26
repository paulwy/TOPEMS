use axum::{extract::Path, extract::State, routing::{get, post, put}, Json, Router};
use serde::{Deserialize, Serialize};

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/qa/quality/issue", get(list_issues).post(create_issue))
        .route("/api/qa/quality/issue/{id}", get(get_issue).put(update_issue))
        .route("/api/qa/quality/issue/{id}/resolve", post(resolve_issue))
}

#[derive(Debug, Deserialize)]
pub struct IssueQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct QualityIssue {
    pub id: String,
    pub issue_no: String,
    pub title: String,
    pub description: Option<String>,
    pub severity: String,
    pub status: String,
}

pub async fn list_issues(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<QualityIssue>>> {
    tracing::info!("Listing quality issues");
    Json(ApiResponse::success(Vec::<QualityIssue>::new(), "获取质量问题列表成功"))
}

pub async fn create_issue(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<QualityIssue>> {
    tracing::info!("Creating issue: {:?}", req);
    Json(ApiResponse::success(
        QualityIssue {
            id: uuid::Uuid::new_v4().to_string(),
            issue_no: format!("QI-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            title: "质量问题".to_string(),
            description: None,
            severity: "medium".to_string(),
            status: "open".to_string(),
        },
        "质量问题创建成功",
    ))
}

pub async fn get_issue(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<QualityIssue>> {
    tracing::info!("Getting issue: {}", id);
    Json(ApiResponse::success(
        QualityIssue {
            id,
            issue_no: "QI-001".to_string(),
            title: "质量问题".to_string(),
            description: Some("质量问题描述".to_string()),
            severity: "medium".to_string(),
            status: "open".to_string(),
        },
        "获取质量问题成功",
    ))
}

pub async fn update_issue(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<QualityIssue>> {
    tracing::info!("Updating issue {}: {:?}", id, req);
    Json(ApiResponse::success(
        QualityIssue {
            id,
            issue_no: "QI-001".to_string(),
            title: "质量问题".to_string(),
            description: Some("质量问题描述".to_string()),
            severity: "medium".to_string(),
            status: "open".to_string(),
        },
        "质量问题更新成功",
    ))
}

pub async fn resolve_issue(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<QualityIssue>> {
    tracing::info!("Resolving issue {}: {:?}", id, req);
    Json(ApiResponse::success(
        QualityIssue {
            id,
            issue_no: "QI-001".to_string(),
            title: "质量问题".to_string(),
            description: Some("质量问题描述".to_string()),
            severity: "medium".to_string(),
            status: "resolved".to_string(),
        },
        "质量问题已解决",
    ))
}

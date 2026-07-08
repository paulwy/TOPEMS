//! Hazard management handlers - Reporting, classification, rectification, verification, and closure

use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/ehs/issues", get(list_hazards).post(create_hazard))
        .route(
            "/api/ehs/issues/{id}",
            get(get_hazard).put(update_hazard).delete(delete_hazard),
        )
        .route(
            "/api/ehs/issues/{id}/rectification",
            post(start_rectification).put(update_rectification),
        )
        .route(
            "/api/ehs/issues/{id}/rectification/submit",
            post(submit_rectification),
        )
        .route("/api/ehs/issues/{id}/verification", post(verify_hazard))
        .route("/api/ehs/issues/{id}/close", post(close_hazard))
}

#[derive(Debug, Deserialize)]
pub struct HazardQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub level: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Hazard {
    pub id: String,
    pub hazard_no: String,
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub level: String,
    pub source: String,
    pub location: Option<String>,
    pub reported_by: Option<String>,
    pub reported_at: Option<String>,
    pub status: String,
    pub inspection_id: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HazardDetail {
    pub hazard: Hazard,
    pub rectification: Option<Rectification>,
    pub verification: Option<Verification>,
}

#[derive(Debug, Serialize)]
pub struct Rectification {
    pub id: String,
    pub hazard_id: String,
    pub description: String,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub progress: i32,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Verification {
    pub id: String,
    pub hazard_id: String,
    pub verifier: Option<String>,
    pub result: String,
    pub remarks: Option<String>,
    pub verified_at: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateHazardRequest {
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub level: String,
    pub source: String,
    pub location: Option<String>,
    pub reported_by: Option<String>,
    pub inspection_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRectificationRequest {
    pub description: String,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRectificationRequest {
    pub description: Option<String>,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
    pub progress: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVerificationRequest {
    pub verifier: Option<String>,
    pub result: String,
    pub remarks: Option<String>,
}

pub async fn list_hazards(State(_state): State<crate::AppState>) -> Json<ApiResponse<Vec<Hazard>>> {
    tracing::info!("Listing hazards");
    Json(ApiResponse::success(
        Vec::<Hazard>::new(),
        "获取隐患列表成功",
    ))
}

pub async fn create_hazard(
    State(_state): State<crate::AppState>,
    Json(req): Json<CreateHazardRequest>,
) -> Json<ApiResponse<Hazard>> {
    tracing::info!("Creating hazard: {:?}", req);
    Json(ApiResponse::success(
        Hazard {
            id: uuid::Uuid::new_v4().to_string(),
            hazard_no: format!(
                "HZ-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: req.title,
            description: req.description,
            category: req.category,
            level: req.level,
            source: req.source,
            location: req.location,
            reported_by: req.reported_by,
            reported_at: Some(chrono::Utc::now().to_rfc3339()),
            status: "reported".to_string(),
            inspection_id: req.inspection_id,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "隐患上报成功",
    ))
}

pub async fn get_hazard(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<HazardDetail>> {
    tracing::info!("Getting hazard: {}", id);
    Json(ApiResponse::success(
        HazardDetail {
            hazard: Hazard {
                id: id.clone(),
                hazard_no: "HZ-2024001".to_string(),
                title: "消防通道堵塞".to_string(),
                description: Some("生产车间A区消防通道被货物堵塞".to_string()),
                category: "消防".to_string(),
                level: "medium".to_string(),
                source: "inspection".to_string(),
                location: Some("生产车间A区".to_string()),
                reported_by: Some("安全员A".to_string()),
                reported_at: Some(chrono::Utc::now().to_rfc3339()),
                status: "rectifying".to_string(),
                inspection_id: Some("IR-2024001".to_string()),
                created_at: Some(chrono::Utc::now().to_rfc3339()),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),
            },
            rectification: Some(Rectification {
                id: "rect-001".to_string(),
                hazard_id: id.clone(),
                description: "清理消防通道，移走堵塞货物".to_string(),
                responsible: Some("仓库管理员B".to_string()),
                deadline: Some("2024-01-30".to_string()),
                status: "in_progress".to_string(),
                progress: 50,
                started_at: Some(chrono::Utc::now().to_rfc3339()),
                completed_at: None,
                created_at: Some(chrono::Utc::now().to_rfc3339()),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),
            }),
            verification: None,
        },
        "获取隐患详情成功",
    ))
}

pub async fn update_hazard(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Hazard>> {
    tracing::info!("Updating hazard {}: {:?}", id, req);
    Json(ApiResponse::success(
        Hazard {
            id,
            hazard_no: "HZ-2024001".to_string(),
            title: "消防通道堵塞".to_string(),
            description: Some("生产车间A区消防通道被货物堵塞".to_string()),
            category: "消防".to_string(),
            level: "medium".to_string(),
            source: "inspection".to_string(),
            location: Some("生产车间A区".to_string()),
            reported_by: Some("安全员A".to_string()),
            reported_at: Some(chrono::Utc::now().to_rfc3339()),
            status: "rectifying".to_string(),
            inspection_id: Some("IR-2024001".to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "隐患更新成功",
    ))
}

pub async fn delete_hazard(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::info!("Deleting hazard: {}", id);
    Json(ApiResponse::success((), "隐患删除成功"))
}

pub async fn start_rectification(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateRectificationRequest>,
) -> Json<ApiResponse<Rectification>> {
    tracing::info!("Starting rectification for hazard {}: {:?}", id, req);
    Json(ApiResponse::success(
        Rectification {
            id: uuid::Uuid::new_v4().to_string(),
            hazard_id: id,
            description: req.description,
            responsible: req.responsible,
            deadline: req.deadline,
            status: "in_progress".to_string(),
            progress: 0,
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "整改方案创建成功",
    ))
}

pub async fn update_rectification(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateRectificationRequest>,
) -> Json<ApiResponse<Rectification>> {
    tracing::info!("Updating rectification {}: {:?}", id, req);
    let status = req
        .status
        .or(req.progress.and_then(|p| {
            if p >= 100 {
                Some("completed".to_string())
            } else {
                Some("in_progress".to_string())
            }
        }))
        .unwrap_or("in_progress".to_string());
    let completed_at = if status == "completed" {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };

    Json(ApiResponse::success(
        Rectification {
            id,
            hazard_id: "hazard-001".to_string(),
            description: req
                .description
                .unwrap_or_else(|| "清理消防通道".to_string()),
            responsible: req.responsible.or(Some("仓库管理员B".to_string())),
            deadline: req.deadline.or(Some("2024-01-30".to_string())),
            status,
            progress: req.progress.unwrap_or(50),
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "整改进度更新成功",
    ))
}

pub async fn submit_rectification(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Rectification>> {
    tracing::info!("Submitting rectification for hazard: {}", id);
    Json(ApiResponse::success(
        Rectification {
            id: "rect-001".to_string(),
            hazard_id: id,
            description: "清理消防通道，移走堵塞货物".to_string(),
            responsible: Some("仓库管理员B".to_string()),
            deadline: Some("2024-01-30".to_string()),
            status: "submitted".to_string(),
            progress: 100,
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at: Some(chrono::Utc::now().to_rfc3339()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "整改完成并提交验收",
    ))
}

pub async fn verify_hazard(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateVerificationRequest>,
) -> Json<ApiResponse<Verification>> {
    tracing::info!("Verifying hazard {}: {:?}", id, req);
    Json(ApiResponse::success(
        Verification {
            id: uuid::Uuid::new_v4().to_string(),
            hazard_id: id,
            verifier: req.verifier,
            result: req.result,
            remarks: req.remarks,
            verified_at: Some(chrono::Utc::now().to_rfc3339()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "隐患验收完成",
    ))
}

pub async fn close_hazard(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Hazard>> {
    tracing::info!("Closing hazard: {}", id);
    Json(ApiResponse::success(
        Hazard {
            id,
            hazard_no: "HZ-2024001".to_string(),
            title: "消防通道堵塞".to_string(),
            description: Some("生产车间A区消防通道被货物堵塞".to_string()),
            category: "消防".to_string(),
            level: "medium".to_string(),
            source: "inspection".to_string(),
            location: Some("生产车间A区".to_string()),
            reported_by: Some("安全员A".to_string()),
            reported_at: Some(chrono::Utc::now().to_rfc3339()),
            status: "closed".to_string(),
            inspection_id: Some("IR-2024001".to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "隐患已闭环",
    ))
}

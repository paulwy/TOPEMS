//! Accident handlers - Reporting, investigation, treatment, and review

use axum::{extract::State, routing::{get, post, put}, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/ehs/incidents", get(list_accidents).post(report_accident))
        .route("/api/ehs/incidents/{id}", get(get_accident).put(update_accident).delete(delete_accident))
        .route("/api/ehs/incidents/{id}/investigation", post(start_investigation).put(update_investigation))
        .route("/api/ehs/incidents/{id}/investigation/complete", post(complete_investigation))
        .route("/api/ehs/incidents/{id}/treatment", post(create_treatment))
        .route("/api/ehs/incidents/{id}/treatment/actions/{action_id}", put(update_treatment_action))
        .route("/api/ehs/incidents/{id}/treatment/complete", post(complete_treatment))
        .route("/api/ehs/incidents/{id}/review", post(create_review))
        .route("/api/ehs/incidents/{id}/close", post(close_accident))
}

#[derive(Debug, Deserialize)]
pub struct AccidentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub severity: Option<String>,
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
    pub reported_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AccidentDetail {
    pub accident: Accident,
    pub investigation: Option<Investigation>,
    pub treatment: Option<Treatment>,
    pub review: Option<Review>,
}

#[derive(Debug, Serialize)]
pub struct Investigation {
    pub id: String,
    pub accident_id: String,
    pub team: Option<Vec<String>>,
    pub findings: Option<String>,
    pub root_cause: Option<String>,
    pub timeline: Option<Vec<Event>>,
    pub status: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Event {
    pub time: String,
    pub description: String,
}

#[derive(Debug, Serialize)]
pub struct Treatment {
    pub id: String,
    pub accident_id: String,
    pub actions: Vec<TreatmentAction>,
    pub responsible: Option<String>,
    pub status: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TreatmentAction {
    pub id: String,
    pub description: String,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Review {
    pub id: String,
    pub accident_id: String,
    pub summary: Option<String>,
    pub lessons_learned: Option<Vec<String>>,
    pub recommendations: Option<Vec<String>>,
    pub reviewer: Option<String>,
    pub reviewed_at: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAccidentRequest {
    pub title: String,
    pub description: Option<String>,
    pub accident_type: Option<String>,
    pub severity: String,
    pub location: Option<String>,
    pub occurred_at: Option<String>,
    pub casualties: Option<i32>,
    pub economic_loss: Option<f64>,
    pub reported_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvestigationRequest {
    pub team: Option<Vec<String>>,
    pub findings: Option<String>,
    pub root_cause: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInvestigationRequest {
    pub findings: Option<String>,
    pub root_cause: Option<String>,
    pub timeline: Option<Vec<Event>>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTreatmentRequest {
    pub actions: Vec<CreateTreatmentActionRequest>,
    pub responsible: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTreatmentActionRequest {
    pub description: String,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTreatmentActionRequest {
    pub status: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateReviewRequest {
    pub summary: Option<String>,
    pub lessons_learned: Option<Vec<String>>,
    pub recommendations: Option<Vec<String>>,
    pub reviewer: Option<String>,
}

pub async fn list_accidents(
    State(_state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<Accident>>> {
    tracing::info!("Listing accidents");
    Json(ApiResponse::success(Vec::<Accident>::new(), "获取事故列表成功"))
}

pub async fn report_accident(
    State(_state): State<crate::AppState>,
    Json(req): Json<CreateAccidentRequest>,
) -> Json<ApiResponse<Accident>> {
    tracing::info!("Reporting accident: {:?}", req);
    Json(ApiResponse::success(
        Accident {
            id: uuid::Uuid::new_v4().to_string(),
            accident_no: format!("ACC-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            title: req.title,
            description: req.description,
            accident_type: req.accident_type,
            severity: req.severity,
            location: req.location,
            occurred_at: req.occurred_at.or(Some(chrono::Utc::now().to_rfc3339())),
            casualties: req.casualties.or(Some(0)),
            economic_loss: req.economic_loss.or(Some(0.0)),
            status: "reported".to_string(),
            reported_by: req.reported_by,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "事故报告成功",
    ))
}

pub async fn get_accident(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AccidentDetail>> {
    tracing::info!("Getting accident: {}", id);
    Json(ApiResponse::success(
        AccidentDetail {
            accident: Accident {
                id: id.clone(),
                accident_no: "ACC-2024001".to_string(),
                title: "机械伤害事故".to_string(),
                description: Some("操作工手指被机器夹伤".to_string()),
                accident_type: Some("机械伤害".to_string()),
                severity: "minor".to_string(),
                location: Some("生产车间B".to_string()),
                occurred_at: Some(chrono::Utc::now().to_rfc3339()),
                casualties: Some(1),
                economic_loss: Some(5000.0),
                status: "investigating".to_string(),
                reported_by: Some("张三".to_string()),
                created_at: Some(chrono::Utc::now().to_rfc3339()),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),
            },
            investigation: Some(Investigation {
                id: "inv-001".to_string(),
                accident_id: id.clone(),
                team: Some(vec!["李四".to_string(), "王五".to_string()]),
                findings: Some("操作工未佩戴防护手套，操作时注意力不集中".to_string()),
                root_cause: Some("安全意识不足，未遵守操作规程".to_string()),
                timeline: Some(vec![
                    Event { time: "10:00".to_string(), description: "事故发生".to_string() },
                    Event { time: "10:05".to_string(), description: "上报事故".to_string() },
                    Event { time: "10:30".to_string(), description: "成立调查组".to_string() },
                ]),
                status: "in_progress".to_string(),
                started_at: Some(chrono::Utc::now().to_rfc3339()),
                completed_at: None,
                created_at: Some(chrono::Utc::now().to_rfc3339()),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),
            }),
            treatment: None,
            review: None,
        },
        "获取事故详情成功",
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
            accident_no: "ACC-2024001".to_string(),
            title: "机械伤害事故".to_string(),
            description: Some("操作工手指被机器夹伤".to_string()),
            accident_type: Some("机械伤害".to_string()),
            severity: "minor".to_string(),
            location: Some("生产车间B".to_string()),
            occurred_at: Some(chrono::Utc::now().to_rfc3339()),
            casualties: Some(1),
            economic_loss: Some(5000.0),
            status: "investigating".to_string(),
            reported_by: Some("张三".to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "事故更新成功",
    ))
}

pub async fn delete_accident(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::info!("Deleting accident: {}", id);
    Json(ApiResponse::success((), "事故删除成功"))
}

pub async fn start_investigation(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateInvestigationRequest>,
) -> Json<ApiResponse<Investigation>> {
    tracing::info!("Starting investigation for accident {}: {:?}", id, req);
    Json(ApiResponse::success(
        Investigation {
            id: uuid::Uuid::new_v4().to_string(),
            accident_id: id,
            team: req.team,
            findings: req.findings,
            root_cause: req.root_cause,
            timeline: None,
            status: "in_progress".to_string(),
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "调查启动成功",
    ))
}

pub async fn update_investigation(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateInvestigationRequest>,
) -> Json<ApiResponse<Investigation>> {
    tracing::info!("Updating investigation {}: {:?}", id, req);
    let status = req.status.unwrap_or("in_progress".to_string());
    let completed_at = if status == "completed" { Some(chrono::Utc::now().to_rfc3339()) } else { None };
    
    Json(ApiResponse::success(
        Investigation {
            id,
            accident_id: "accident-001".to_string(),
            team: Some(vec!["李四".to_string(), "王五".to_string()]),
            findings: req.findings.or(Some("调查中".to_string())),
            root_cause: req.root_cause,
            timeline: req.timeline,
            status,
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "调查更新成功",
    ))
}

pub async fn complete_investigation(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Investigation>> {
    tracing::info!("Completing investigation for accident: {}", id);
    Json(ApiResponse::success(
        Investigation {
            id: "inv-001".to_string(),
            accident_id: id,
            team: Some(vec!["李四".to_string(), "王五".to_string()]),
            findings: Some("操作工未佩戴防护手套，操作时注意力不集中".to_string()),
            root_cause: Some("安全意识不足，未遵守操作规程".to_string()),
            timeline: Some(vec![
                Event { time: "10:00".to_string(), description: "事故发生".to_string() },
                Event { time: "10:05".to_string(), description: "上报事故".to_string() },
                Event { time: "10:30".to_string(), description: "成立调查组".to_string() },
                Event { time: "14:00".to_string(), description: "调查结束".to_string() },
            ]),
            status: "completed".to_string(),
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at: Some(chrono::Utc::now().to_rfc3339()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "调查完成",
    ))
}

pub async fn create_treatment(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateTreatmentRequest>,
) -> Json<ApiResponse<Treatment>> {
    tracing::info!("Creating treatment for accident {}: {:?}", id, req);
    let actions = req.actions.into_iter().enumerate().map(|(i, a)| TreatmentAction {
        id: format!("action-{}", i + 1),
        description: a.description,
        responsible: a.responsible,
        deadline: a.deadline,
        status: "pending".to_string(),
        completed_at: None,
    }).collect();
    
    Json(ApiResponse::success(
        Treatment {
            id: uuid::Uuid::new_v4().to_string(),
            accident_id: id,
            actions,
            responsible: req.responsible,
            status: "in_progress".to_string(),
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "处理方案创建成功",
    ))
}

pub async fn update_treatment_action(
    State(_state): State<crate::AppState>,
    axum::extract::Path((accident_id, action_id)): axum::extract::Path<(String, String)>,
    Json(req): Json<UpdateTreatmentActionRequest>,
) -> Json<ApiResponse<TreatmentAction>> {
    tracing::info!("Updating treatment action {} for accident {}: {:?}", action_id, accident_id, req);
    Json(ApiResponse::success(
        TreatmentAction {
            id: action_id,
            description: "加强安全培训".to_string(),
            responsible: Some("安全部门".to_string()),
            deadline: Some("2024-02-15".to_string()),
            status: req.status.unwrap_or("in_progress".to_string()),
            completed_at: req.completed_at,
        },
        "处理措施更新成功",
    ))
}

pub async fn complete_treatment(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Treatment>> {
    tracing::info!("Completing treatment for accident: {}", id);
    Json(ApiResponse::success(
        Treatment {
            id: "treat-001".to_string(),
            accident_id: id,
            actions: vec![
                TreatmentAction {
                    id: "action-1".to_string(),
                    description: "加强安全培训".to_string(),
                    responsible: Some("安全部门".to_string()),
                    deadline: Some("2024-02-15".to_string()),
                    status: "completed".to_string(),
                    completed_at: Some(chrono::Utc::now().to_rfc3339()),
                },
                TreatmentAction {
                    id: "action-2".to_string(),
                    description: "加装防护装置".to_string(),
                    responsible: Some("设备部门".to_string()),
                    deadline: Some("2024-02-20".to_string()),
                    status: "completed".to_string(),
                    completed_at: Some(chrono::Utc::now().to_rfc3339()),
                },
            ],
            responsible: Some("安全经理".to_string()),
            status: "completed".to_string(),
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at: Some(chrono::Utc::now().to_rfc3339()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "处理完成",
    ))
}

pub async fn create_review(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateReviewRequest>,
) -> Json<ApiResponse<Review>> {
    tracing::info!("Creating review for accident {}: {:?}", id, req);
    Json(ApiResponse::success(
        Review {
            id: uuid::Uuid::new_v4().to_string(),
            accident_id: id,
            summary: req.summary,
            lessons_learned: req.lessons_learned,
            recommendations: req.recommendations,
            reviewer: req.reviewer,
            reviewed_at: Some(chrono::Utc::now().to_rfc3339()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "复盘完成",
    ))
}

pub async fn close_accident(
    State(_state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Accident>> {
    tracing::info!("Closing accident: {}", id);
    Json(ApiResponse::success(
        Accident {
            id,
            accident_no: "ACC-2024001".to_string(),
            title: "机械伤害事故".to_string(),
            description: Some("操作工手指被机器夹伤".to_string()),
            accident_type: Some("机械伤害".to_string()),
            severity: "minor".to_string(),
            location: Some("生产车间B".to_string()),
            occurred_at: Some(chrono::Utc::now().to_rfc3339()),
            casualties: Some(1),
            economic_loss: Some(5000.0),
            status: "closed".to_string(),
            reported_by: Some("张三".to_string()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
        },
        "事故已结案",
    ))
}
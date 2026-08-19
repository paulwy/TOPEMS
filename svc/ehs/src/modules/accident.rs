//! Accident handlers - Reporting, investigation, treatment, and review

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::AppState;

fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/incidents", get(list_accidents).post(report_accident))
        .route(
            "/incidents/{id}",
            get(get_accident)
                .put(update_accident)
                .delete(delete_accident),
        )
        .route(
            "/incidents/{id}/investigation",
            post(start_investigation).put(update_investigation),
        )
        .route(
            "/incidents/{id}/investigation/complete",
            post(complete_investigation),
        )
        .route("/incidents/{id}/treatment", post(create_treatment))
        .route(
            "/incidents/{id}/treatment/actions/{action_id}",
            put(update_treatment_action),
        )
        .route(
            "/incidents/{id}/treatment/complete",
            post(complete_treatment),
        )
        .route("/incidents/{id}/review", post(create_review))
        .route("/incidents/{id}/close", post(close_accident))
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

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct AccidentDetail {
    pub accident: Accident,
    pub investigation: Option<Investigation>,
    pub treatment: Option<Treatment>,
    pub review: Option<Review>,

    pub tenant_id: Uuid,
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

    pub tenant_id: Uuid,
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

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct TreatmentAction {
    pub id: String,
    pub description: String,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub completed_at: Option<String>,

    pub tenant_id: Uuid,
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

    pub tenant_id: Uuid,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/incidents",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_accidents(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<Accident>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing accidents");
    Json(ApiResponse::success(
        Vec::<Accident>::new(),
        "获取事故列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents",
    request_body = CreateAccidentRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn report_accident(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateAccidentRequest>,
) -> Json<ApiResponse<Accident>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Reporting accident: {:?}", req);
    Json(ApiResponse::success(
        Accident {
            id: uuid::Uuid::new_v4().to_string(),
            accident_no: format!(
                "ACC-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
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

            tenant_id,
        },
        "事故报告成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/incidents/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_accident(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AccidentDetail>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting accident: {}", id);
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

                tenant_id,
            },
            investigation: Some(Investigation {
                id: "inv-001".to_string(),
                accident_id: id.clone(),
                team: Some(vec!["李四".to_string(), "王五".to_string()]),
                findings: Some("操作工未佩戴防护手套，操作时注意力不集中".to_string()),
                root_cause: Some("安全意识不足，未遵守操作规程".to_string()),
                timeline: Some(vec![
                    Event {
                        time: "10:00".to_string(),
                        description: "事故发生".to_string(),
                    },
                    Event {
                        time: "10:05".to_string(),
                        description: "上报事故".to_string(),
                    },
                    Event {
                        time: "10:30".to_string(),
                        description: "成立调查组".to_string(),
                    },
                ]),
                status: "in_progress".to_string(),
                started_at: Some(chrono::Utc::now().to_rfc3339()),
                completed_at: None,
                created_at: Some(chrono::Utc::now().to_rfc3339()),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),

                tenant_id,
            }),
            treatment: None,
            review: None,
            tenant_id,
        },
        "获取事故详情成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/incidents/{id}",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_accident(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Accident>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Updating accident {}: {:?}", id, req);
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

            tenant_id,
        },
        "事故更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/incidents/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_accident(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Deleting accident: {}", id);
    Json(ApiResponse::success((), "事故删除成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents/{id}/investigation",
    request_body = CreateInvestigationRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn start_investigation(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateInvestigationRequest>,
) -> Json<ApiResponse<Investigation>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Starting investigation for accident {}: {:?}", id, req);
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

            tenant_id,
        },
        "调查启动成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/incidents/{id}/investigation",
    request_body = UpdateInvestigationRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_investigation(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateInvestigationRequest>,
) -> Json<ApiResponse<Investigation>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Updating investigation {}: {:?}", id, req);
    let status = req.status.unwrap_or("in_progress".to_string());
    let completed_at = if status == "completed" {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };

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

            tenant_id,
        },
        "调查更新成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents/{id}/investigation/complete",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn complete_investigation(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Investigation>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Completing investigation for accident: {}", id);
    Json(ApiResponse::success(
        Investigation {
            id: "inv-001".to_string(),
            accident_id: id,
            team: Some(vec!["李四".to_string(), "王五".to_string()]),
            findings: Some("操作工未佩戴防护手套，操作时注意力不集中".to_string()),
            root_cause: Some("安全意识不足，未遵守操作规程".to_string()),
            timeline: Some(vec![
                Event {
                    time: "10:00".to_string(),
                    description: "事故发生".to_string(),
                },
                Event {
                    time: "10:05".to_string(),
                    description: "上报事故".to_string(),
                },
                Event {
                    time: "10:30".to_string(),
                    description: "成立调查组".to_string(),
                },
                Event {
                    time: "14:00".to_string(),
                    description: "调查结束".to_string(),
                },
            ]),
            status: "completed".to_string(),
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at: Some(chrono::Utc::now().to_rfc3339()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "调查完成",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents/{id}/treatment",
    request_body = CreateTreatmentRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn create_treatment(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateTreatmentRequest>,
) -> Json<ApiResponse<Treatment>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating treatment for accident {}: {:?}", id, req);
    let actions = req
        .actions
        .into_iter()
        .enumerate()
        .map(|(i, a)| TreatmentAction {
            id: format!("action-{}", i + 1),
            description: a.description,
            responsible: a.responsible,
            deadline: a.deadline,
            status: "pending".to_string(),
            completed_at: None,

            tenant_id,
        })
        .collect();

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

            tenant_id,
        },
        "处理方案创建成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/incidents/{id}/treatment/actions/{action_id}",
    request_body = UpdateTreatmentActionRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id"),
        ("action_id" = String, Path, description = "action_id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_treatment_action(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path((accident_id, action_id)): axum::extract::Path<(String, String)>,
    Json(req): Json<UpdateTreatmentActionRequest>,
) -> Json<ApiResponse<TreatmentAction>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!(
        "Updating treatment action {} for accident {}: {:?}",
        action_id,
        accident_id,
        req
    );
    Json(ApiResponse::success(
        TreatmentAction {
            id: action_id,
            description: "加强安全培训".to_string(),
            responsible: Some("安全部门".to_string()),
            deadline: Some("2024-02-15".to_string()),
            status: req.status.unwrap_or("in_progress".to_string()),
            completed_at: req.completed_at,

            tenant_id,
        },
        "处理措施更新成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents/{id}/treatment/complete",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn complete_treatment(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Treatment>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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

                    tenant_id,
                },
                TreatmentAction {
                    id: "action-2".to_string(),
                    description: "加装防护装置".to_string(),
                    responsible: Some("设备部门".to_string()),
                    deadline: Some("2024-02-20".to_string()),
                    status: "completed".to_string(),
                    completed_at: Some(chrono::Utc::now().to_rfc3339()),

                    tenant_id,
                },
            ],
            responsible: Some("安全经理".to_string()),
            status: "completed".to_string(),
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at: Some(chrono::Utc::now().to_rfc3339()),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "处理完成",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents/{id}/review",
    request_body = CreateReviewRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn create_review(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateReviewRequest>,
) -> Json<ApiResponse<Review>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating review for accident {}: {:?}", id, req);
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

            tenant_id,
        },
        "复盘完成",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents/{id}/close",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn close_accident(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Accident>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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

            tenant_id,
        },
        "事故已结案",
    ))
}

pub fn classify_accident(
    deaths: u32,
    serious_injuries: u32,
    direct_loss_yuan: f64,
) -> &'static str {
    if deaths >= 30 || serious_injuries >= 100 || direct_loss_yuan >= 100_000_000.0 {
        "特别重大"
    } else if deaths >= 10 || serious_injuries >= 50 || direct_loss_yuan >= 50_000_000.0 {
        "重大"
    } else if deaths >= 3 || serious_injuries >= 10 || direct_loss_yuan >= 10_000_000.0 {
        "较大"
    } else {
        "一般"
    }
}

pub fn response_target_hours(level: &str) -> f64 {
    match level {
        "特别重大" => 1.0,
        "重大" => 2.0,
        "较大" => 4.0,
        "一般" => 8.0,
        _ => 8.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_general() {
        assert_eq!(classify_accident(0, 0, 0.0), "一般");
        assert_eq!(classify_accident(1, 2, 100_000.0), "一般");
        assert_eq!(classify_accident(2, 9, 9_999_999.0), "一般");
    }

    #[test]
    fn test_classify_larger_boundary() {
        assert_eq!(classify_accident(3, 0, 0.0), "较大");
        assert_eq!(classify_accident(0, 10, 0.0), "较大");
        assert_eq!(classify_accident(0, 0, 10_000_000.0), "较大");
        assert_eq!(classify_accident(9, 49, 49_999_999.0), "较大");
    }

    #[test]
    fn test_classify_major() {
        assert_eq!(classify_accident(10, 0, 0.0), "重大");
        assert_eq!(classify_accident(0, 50, 0.0), "重大");
        assert_eq!(classify_accident(0, 0, 50_000_000.0), "重大");
        assert_eq!(classify_accident(29, 99, 99_999_999.0), "重大");
    }

    #[test]
    fn test_classify_especially_major() {
        assert_eq!(classify_accident(30, 0, 0.0), "特别重大");
        assert_eq!(classify_accident(0, 100, 0.0), "特别重大");
        assert_eq!(classify_accident(0, 0, 100_000_000.0), "特别重大");
        assert_eq!(classify_accident(100, 200, 500_000_000.0), "特别重大");
    }

    #[test]
    fn test_classify_combined_conditions() {
        assert_eq!(classify_accident(5, 20, 20_000_000.0), "较大");
        assert_eq!(classify_accident(15, 30, 30_000_000.0), "重大");
        assert_eq!(classify_accident(25, 80, 80_000_000.0), "重大");
    }

    #[test]
    fn test_response_target() {
        assert_eq!(response_target_hours("特别重大"), 1.0);
        assert_eq!(response_target_hours("重大"), 2.0);
        assert_eq!(response_target_hours("较大"), 4.0);
        assert_eq!(response_target_hours("一般"), 8.0);
        assert_eq!(response_target_hours("未知"), 8.0);
        assert_eq!(response_target_hours(""), 8.0);
    }
}

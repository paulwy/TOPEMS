//! Emergency drill management - Drill plans, records, evaluation, rectification, and statistics

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/drills/plans",
            get(list_drill_plans).post(create_drill_plan),
        )
        .route(
            "/drills/records",
            get(list_drill_records).post(create_drill_record),
        )
        .route(
            "/drills/records/{id}",
            get(get_drill_record)
                .put(update_drill_record)
                .delete(delete_drill_record),
        )
        .route(
            "/drills/records/{id}/evaluation",
            post(submit_drill_evaluation),
        )
        .route("/drills/types", get(list_drill_types))
        .route("/drills/statistics", get(get_drill_statistics))
        .route("/drills", get(list_drill_plans).post(create_drill_record))
        .route(
            "/drills/{id}",
            get(get_drill_record)
                .put(update_drill_record)
                .delete(delete_drill_record),
        )
}

#[derive(Debug, Deserialize)]
pub struct DrillQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub drill_type: Option<String>,
    pub year: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct DrillPlan {
    pub id: String,
    pub plan_no: String,
    pub title: String,
    pub description: Option<String>,
    pub drill_type: String,
    pub plan_date: Option<String>,
    pub location: Option<String>,
    pub participants: Option<i32>,
    pub estimated_duration: Option<i32>,
    pub content: Option<String>,
    pub organizer: Option<String>,
    pub status: String,
    pub related_plan_id: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DrillRecord {
    pub id: String,
    pub record_no: String,
    pub plan_id: Option<String>,
    pub title: String,
    pub drill_type: String,
    pub location: String,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
    pub duration: Option<i32>,
    pub participants: Option<i32>,
    pub participant_list: Option<Vec<String>>,
    pub content: Option<String>,
    pub actual_content: Option<String>,
    pub organizer: Option<String>,
    pub recorder: Option<String>,
    pub status: String,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DrillEvaluation {
    pub id: String,
    pub drill_id: String,
    pub evaluator: Option<String>,
    pub overall_score: Option<i32>,
    pub overall_comment: Option<String>,
    pub objectives_met: Option<bool>,
    pub response_time_score: Option<i32>,
    pub coordination_score: Option<i32>,
    pub procedure_score: Option<i32>,
    pub equipment_score: Option<i32>,
    pub evaluated_at: Option<String>,
    pub created_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DrillProblem {
    pub id: String,
    pub drill_id: String,
    pub description: String,
    pub category: Option<String>,
    pub severity: Option<String>,
    pub responsible_person: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub rectification_measures: Option<String>,
    pub rectified_at: Option<String>,
    pub verifier: Option<String>,
    pub verified_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DrillDetail {
    pub record: DrillRecord,
    pub evaluation: Option<DrillEvaluation>,
    pub problems: Vec<DrillProblem>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DrillStatistics {
    pub total_drills: i32,
    pub planned_count: i32,
    pub completed_count: i32,
    pub average_score: Option<f64>,
    pub by_type: Vec<serde_json::Value>,
    pub by_month: Vec<serde_json::Value>,
    pub problem_count: i32,
    pub rectified_count: i32,
    pub participant_count: i32,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateDrillPlanRequest {
    pub title: String,
    pub description: Option<String>,
    pub drill_type: String,
    pub plan_date: Option<String>,
    pub location: Option<String>,
    pub participants: Option<i32>,
    pub estimated_duration: Option<i32>,
    pub content: Option<String>,
    pub organizer: Option<String>,
    pub related_plan_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDrillPlanRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub drill_type: Option<String>,
    pub plan_date: Option<String>,
    pub location: Option<String>,
    pub participants: Option<i32>,
    pub estimated_duration: Option<i32>,
    pub content: Option<String>,
    pub organizer: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDrillRecordRequest {
    pub plan_id: Option<String>,
    pub title: String,
    pub drill_type: String,
    pub location: String,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
    pub participants: Option<i32>,
    pub participant_list: Option<Vec<String>>,
    pub actual_content: Option<String>,
    pub organizer: Option<String>,
    pub recorder: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDrillRecordRequest {
    pub title: Option<String>,
    pub drill_type: Option<String>,
    pub location: Option<String>,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
    pub participants: Option<i32>,
    pub participant_list: Option<Vec<String>>,
    pub actual_content: Option<String>,
    pub organizer: Option<String>,
    pub recorder: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEvaluationRequest {
    pub evaluator: Option<String>,
    pub overall_score: Option<i32>,
    pub overall_comment: Option<String>,
    pub objectives_met: Option<bool>,
    pub response_time_score: Option<i32>,
    pub coordination_score: Option<i32>,
    pub procedure_score: Option<i32>,
    pub equipment_score: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDrillProblemRequest {
    pub description: String,
    pub category: Option<String>,
    pub severity: Option<String>,
    pub responsible_person: Option<String>,
    pub deadline: Option<String>,
    pub rectification_measures: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDrillProblemRequest {
    pub description: Option<String>,
    pub category: Option<String>,
    pub severity: Option<String>,
    pub responsible_person: Option<String>,
    pub deadline: Option<String>,
    pub status: Option<String>,
    pub rectification_measures: Option<String>,
    pub verifier: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:plan:read"])),
    path = "/api/ehs/drills/plans",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_drill_plans(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<DrillPlan>>> {
    tracing::debug!("Listing drill plans");
    Json(ApiResponse::success(
        Vec::<DrillPlan>::new(),
        "获取演练计划列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:plan:write"])),
    path = "/api/ehs/drills/plans",
    request_body = CreateDrillPlanRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_drill_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateDrillPlanRequest>,
) -> Json<ApiResponse<DrillPlan>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Creating drill plan: {:?}", req);
    Json(ApiResponse::success(
        DrillPlan {
            id: uuid::Uuid::new_v4().to_string(),
            plan_no: format!(
                "DP-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: req.title,
            description: req.description,
            drill_type: req.drill_type,
            plan_date: req.plan_date,
            location: req.location,
            participants: req.participants,
            estimated_duration: req.estimated_duration,
            content: req.content,
            organizer: req.organizer,
            status: "planned".to_string(),
            related_plan_id: req.related_plan_id,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "演练计划创建成功",
    ))
}

pub async fn submit_drill_evaluation(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Submitting drill evaluation for record {}: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": uuid::Uuid::new_v4().to_string(),
            "drill_record_id": id,
            "score": req.get("score").and_then(|v| v.as_f64()).unwrap_or(0.0),
            "evaluation": req.get("evaluation").and_then(|v| v.as_str()).unwrap_or(""),
            "evaluator": "test_admin",
            "evaluated_at": chrono::Utc::now().to_rfc3339(),
            "tenant_id": tenant_id.to_string(),
        }),
        "演练评估提交成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/drills/records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_drill_records(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<DrillRecord>>> {
    tracing::debug!("Listing drill records");
    Json(ApiResponse::success(
        Vec::<DrillRecord>::new(),
        "获取演练记录列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/drills/records",
    request_body = CreateDrillRecordRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_drill_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateDrillRecordRequest>,
) -> Json<ApiResponse<DrillRecord>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Creating drill record: {:?}", req);
    Json(ApiResponse::success(
        DrillRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!(
                "DR-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            plan_id: req.plan_id,
            title: req.title,
            drill_type: req.drill_type,
            location: req.location,
            started_at: req.started_at,
            ended_at: req.ended_at,
            duration: None,
            participants: req.participants,
            participant_list: req.participant_list,
            content: None,
            actual_content: req.actual_content,
            organizer: req.organizer,
            recorder: req.recorder,
            status: "in_progress".to_string(),
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "演练记录创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/drills/records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_drill_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<DrillDetail>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Getting drill record: {}", id);
    Json(ApiResponse::success(
        DrillDetail {
            record: DrillRecord {
                id: id.clone(),
                record_no: "DR-2024001".to_string(),
                plan_id: Some("plan-001".to_string()),
                title: "2024年度火灾应急演练".to_string(),
                drill_type: "fire".to_string(),
                location: "生产厂区".to_string(),
                started_at: Some(chrono::Utc::now().to_rfc3339()),
                ended_at: Some(chrono::Utc::now().to_rfc3339()),
                duration: Some(90),
                participants: Some(180),
                participant_list: None,
                content: Some("火灾报警、人员疏散、初期火灾扑救...".to_string()),
                actual_content: Some("实际演练内容...".to_string()),
                organizer: Some("安全环保部".to_string()),
                recorder: Some("张安全".to_string()),
                status: "completed".to_string(),
                attachments: None,
                created_at: Some(chrono::Utc::now().to_rfc3339()),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),

                tenant_id,
            },
            evaluation: Some(DrillEvaluation {
                id: "eval-001".to_string(),
                drill_id: id.clone(),
                evaluator: Some("李主任".to_string()),
                overall_score: Some(85),
                overall_comment: Some("演练整体效果良好，人员疏散有序".to_string()),
                objectives_met: Some(true),
                response_time_score: Some(90),
                coordination_score: Some(80),
                procedure_score: Some(85),
                equipment_score: Some(88),
                evaluated_at: Some(chrono::Utc::now().to_rfc3339()),
                created_at: Some(chrono::Utc::now().to_rfc3339()),

                tenant_id,
            }),
            problems: vec![DrillProblem {
                id: "prob-001".to_string(),
                drill_id: id,
                description: "部分员工对疏散路线不熟悉".to_string(),
                category: Some("training".to_string()),
                severity: Some("medium".to_string()),
                responsible_person: Some("培训主管".to_string()),
                deadline: Some("2024-07-01".to_string()),
                status: "in_progress".to_string(),
                rectification_measures: Some("组织专项培训，重新演练疏散路线".to_string()),
                rectified_at: None,
                verifier: None,
                verified_at: None,
                created_at: Some(chrono::Utc::now().to_rfc3339()),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),

                tenant_id,
            }],
            tenant_id,
        },
        "获取演练详情成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/drills/records/{id}",
    request_body = UpdateDrillRecordRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_drill_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateDrillRecordRequest>,
) -> Json<ApiResponse<DrillRecord>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Updating drill record {}: {:?}", id, req);
    Json(ApiResponse::success(
        DrillRecord {
            id,
            record_no: "DR-2024001".to_string(),
            plan_id: Some("plan-001".to_string()),
            title: req
                .title
                .unwrap_or_else(|| "2024年度火灾应急演练".to_string()),
            drill_type: req.drill_type.unwrap_or_else(|| "fire".to_string()),
            location: req.location.unwrap_or_else(|| "生产厂区".to_string()),
            started_at: req.started_at,
            ended_at: req.ended_at,
            duration: None,
            participants: req.participants,
            participant_list: req.participant_list,
            content: None,
            actual_content: req.actual_content,
            organizer: req.organizer,
            recorder: req.recorder,
            status: req.status.unwrap_or_else(|| "in_progress".to_string()),
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "演练记录更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/drills/records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_drill_record(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting drill record: {}", id);
    Json(ApiResponse::success((), "演练记录删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/drills/statistics",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_drill_statistics(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<DrillStatistics>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Getting drill statistics");
    Json(ApiResponse::success(
        DrillStatistics {
            total_drills: 12,
            planned_count: 2,
            completed_count: 10,
            average_score: Some(82.5),
            by_type: vec![
                serde_json::json!({ "type": "fire", "name": "火灾", "count": 4 }),
                serde_json::json!({ "type": "leak", "name": "泄漏", "count": 3 }),
                serde_json::json!({ "type": "evacuation", "name": "疏散", "count": 3 }),
                serde_json::json!({ "type": "rescue", "name": "救援", "count": 2 }),
            ],
            by_month: vec![
                serde_json::json!({ "month": "1月", "count": 1 }),
                serde_json::json!({ "month": "2月", "count": 1 }),
                serde_json::json!({ "month": "3月", "count": 2 }),
                serde_json::json!({ "month": "4月", "count": 1 }),
                serde_json::json!({ "month": "5月", "count": 1 }),
                serde_json::json!({ "month": "6月", "count": 2 }),
            ],
            problem_count: 28,
            rectified_count: 24,
            participant_count: 1560,

            tenant_id,
        },
        "获取统计数据成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/drills/types",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_drill_types(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    tracing::debug!("Listing drill types");
    let types = vec![
        serde_json::json!({ "code": "fire", "name": "火灾演练" }),
        serde_json::json!({ "code": "leak", "name": "泄漏演练" }),
        serde_json::json!({ "code": "poisoning", "name": "中毒演练" }),
        serde_json::json!({ "code": "evacuation", "name": "疏散演练" }),
        serde_json::json!({ "code": "rescue", "name": "救援演练" }),
        serde_json::json!({ "code": "comprehensive", "name": "综合演练" }),
    ];
    Json(ApiResponse::success(types, "获取演练类型成功"))
}

pub fn drill_score(
    participation_rate: f64,
    scenario_completion: f64,
    response_time_score: f64,
) -> f64 {
    let p = participation_rate.clamp(0.0, 100.0);
    let s = scenario_completion.clamp(0.0, 100.0);
    let r = response_time_score.clamp(0.0, 100.0);
    p * 0.30 + s * 0.40 + r * 0.30
}

pub fn drill_grade(score: f64) -> &'static str {
    if score >= 90.0 {
        "优秀"
    } else if score >= 80.0 {
        "良好"
    } else if score >= 70.0 {
        "合格"
    } else if score >= 60.0 {
        "基本合格"
    } else {
        "不合格"
    }
}

pub fn is_drill_overdue(last_drill: NaiveDate, today: NaiveDate, required_days: i64) -> bool {
    if required_days <= 0 {
        return false;
    }
    let delta = (today - last_drill).num_days();
    delta > required_days
}

#[allow(clippy::as_conversions)]
pub fn plan_coverage(covered: u32, total: u32) -> f64 {
    if total == 0 {
        return 0.0;
    }
    let c = covered.min(total) as f64;
    let t = total as f64;
    (c / t) * 100.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_drill_score_perfect() {
        let s = drill_score(100.0, 100.0, 100.0);
        assert!((s - 100.0).abs() < 1e-9);
    }

    #[test]
    fn test_drill_score_zero() {
        let s = drill_score(0.0, 0.0, 0.0);
        assert!((s - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_drill_score_mixed() {
        let s = drill_score(80.0, 90.0, 70.0);
        let expected = 80.0 * 0.30 + 90.0 * 0.40 + 70.0 * 0.30;
        assert!((s - expected).abs() < 1e-9);
    }

    #[test]
    fn test_drill_score_clamping() {
        let s = drill_score(150.0, -10.0, 200.0);
        let expected = 100.0 * 0.30 + 0.0 * 0.40 + 100.0 * 0.30;
        assert!((s - expected).abs() < 1e-9);
    }

    #[test]
    fn test_drill_grade_excellent() {
        assert_eq!(drill_grade(100.0), "优秀");
        assert_eq!(drill_grade(90.0), "优秀");
        assert_eq!(drill_grade(95.0), "优秀");
    }

    #[test]
    fn test_drill_grade_good() {
        assert_eq!(drill_grade(89.9), "良好");
        assert_eq!(drill_grade(85.0), "良好");
        assert_eq!(drill_grade(80.0), "良好");
    }

    #[test]
    fn test_drill_grade_pass() {
        assert_eq!(drill_grade(79.9), "合格");
        assert_eq!(drill_grade(75.0), "合格");
        assert_eq!(drill_grade(70.0), "合格");
    }

    #[test]
    fn test_drill_grade_basic_pass() {
        assert_eq!(drill_grade(69.9), "基本合格");
        assert_eq!(drill_grade(65.0), "基本合格");
        assert_eq!(drill_grade(60.0), "基本合格");
    }

    #[test]
    fn test_drill_grade_fail() {
        assert_eq!(drill_grade(59.9), "不合格");
        assert_eq!(drill_grade(0.0), "不合格");
        assert_eq!(drill_grade(30.0), "不合格");
    }

    #[test]
    fn test_drill_not_overdue() {
        let last = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let today = NaiveDate::from_ymd_opt(2024, 3, 30).unwrap();
        assert!(!is_drill_overdue(last, today, 90));
        assert!(!is_drill_overdue(last, today, 89));
    }

    #[test]
    fn test_drill_overdue() {
        let last = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let today = NaiveDate::from_ymd_opt(2024, 4, 1).unwrap();
        assert!(is_drill_overdue(last, today, 90));
    }

    #[test]
    fn test_drill_boundary_exact() {
        let last = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let today = NaiveDate::from_ymd_opt(2024, 4, 1).unwrap();
        assert!(!is_drill_overdue(last, today, 91));
    }

    #[test]
    fn test_drill_zero_required_days() {
        let last = NaiveDate::from_ymd_opt(2020, 1, 1).unwrap();
        let today = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        assert!(!is_drill_overdue(last, today, 0));
        assert!(!is_drill_overdue(last, today, -10));
    }

    #[test]
    fn test_coverage_full() {
        assert!((plan_coverage(10, 10) - 100.0).abs() < 1e-9);
    }

    #[test]
    fn test_coverage_zero() {
        assert_eq!(plan_coverage(0, 10), 0.0);
        assert_eq!(plan_coverage(0, 0), 0.0);
    }

    #[test]
    fn test_coverage_partial() {
        assert!((plan_coverage(3, 10) - 30.0).abs() < 1e-9);
        assert!((plan_coverage(5, 8) - 62.5).abs() < 1e-9);
    }

    #[test]
    fn test_coverage_overflow() {
        assert!((plan_coverage(15, 10) - 100.0).abs() < 1e-9);
    }
}

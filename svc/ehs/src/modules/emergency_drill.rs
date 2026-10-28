//! Emergency drill management - Drill plans, records, evaluation, rectification, and statistics

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::Row;
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
        .route("/drills", get(list_drill_records).post(create_drill_record))
        .route(
            "/drills/{id}",
            get(get_drill_record)
                .put(update_drill_record)
                .delete(delete_drill_record),
        )
}

#[derive(Debug, Deserialize)]
pub struct DrillPlanQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub drill_type: Option<String>,
    pub year: Option<i32>,
    pub q: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDrillEvaluationRequest {
    pub evaluator: Option<String>,
    pub overall_score: Option<i32>,
    pub overall_comment: Option<String>,
    pub objectives_met: Option<bool>,
    pub response_time_score: Option<i32>,
    pub coordination_score: Option<i32>,
    pub procedure_score: Option<i32>,
    pub equipment_score: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct DrillType {
    pub code: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct DrillQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
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
    pub drill_no: String,
    pub plan_id: Option<String>,
    pub drill_name: String,
    pub drill_date: Option<String>,
    pub participants: Option<Vec<String>>,
    pub duration_hours: Option<f64>,
    pub location: Option<String>,
    pub summary: Option<String>,
    pub issues_found: Option<String>,
    pub improvements: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub status: String,
    pub created_by: Option<String>,
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
    pub drill_name: String,
    pub drill_date: Option<String>,
    pub participants: Option<Vec<String>>,
    pub duration_hours: Option<f64>,
    pub location: Option<String>,
    pub summary: Option<String>,
    pub issues_found: Option<String>,
    pub improvements: Option<String>,
    pub attachments: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDrillRecordRequest {
    pub drill_name: Option<String>,
    pub drill_date: Option<String>,
    pub participants: Option<Vec<String>>,
    pub duration_hours: Option<f64>,
    pub location: Option<String>,
    pub summary: Option<String>,
    pub issues_found: Option<String>,
    pub improvements: Option<String>,
    pub attachments: Option<Vec<String>>,
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<DrillPlanQuery>,
) -> ApiResponse<Vec<DrillPlan>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(s) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(s.clone());
    }
    if let Some(t) = &q.drill_type {
        where_clause.push_str(&format!(" AND drill_type = ${}", params.len() + 1));
        params.push(t.clone());
    }
    if let Some(y) = q.year {
        where_clause.push_str(&format!(
            " AND EXTRACT(YEAR FROM plan_date) = ${}",
            params.len() + 1
        ));
        params.push(y.to_string());
    }
    if let Some(k) = &q.q {
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR plan_no ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        let like = format!("%{k}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, plan_no, title, description, drill_type,
               plan_date::text AS plan_date, location, participants, estimated_duration,
               content, organizer, status, related_plan_id::text AS related_plan_id,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_drill_plans
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list drill plans: {}", e);
            return ApiResponse::server_error("获取演练计划列表失败");
        }
    };

    let plans: Vec<DrillPlan> = rows
        .iter()
        .map(|r| DrillPlan {
            id: r.try_get::<String, _>("id").unwrap_or_default(),
            plan_no: r.try_get::<String, _>("plan_no").unwrap_or_default(),
            title: r.try_get::<String, _>("title").unwrap_or_default(),
            description: r.try_get::<Option<String>, _>("description").ok().flatten(),
            drill_type: r.try_get::<String, _>("drill_type").unwrap_or_default(),
            plan_date: r.try_get::<Option<String>, _>("plan_date").ok().flatten(),
            location: r.try_get::<Option<String>, _>("location").ok().flatten(),
            participants: r.try_get::<Option<i32>, _>("participants").ok().flatten(),
            estimated_duration: r
                .try_get::<Option<i32>, _>("estimated_duration")
                .ok()
                .flatten(),
            content: r.try_get::<Option<String>, _>("content").ok().flatten(),
            organizer: r.try_get::<Option<String>, _>("organizer").ok().flatten(),
            status: r
                .try_get::<String, _>("status")
                .unwrap_or_else(|_| "planned".to_string()),
            related_plan_id: r
                .try_get::<Option<String>, _>("related_plan_id")
                .ok()
                .flatten(),
            created_at: r.try_get::<Option<String>, _>("created_at").ok().flatten(),
            updated_at: r.try_get::<Option<String>, _>("updated_at").ok().flatten(),
            tenant_id: r
                .try_get::<Option<Uuid>, _>("tenant_id")
                .ok()
                .flatten()
                .unwrap_or_default(),
        })
        .collect();

    ApiResponse::success(plans, "获取演练计划列表成功")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateDrillPlanRequest>,
) -> ApiResponse<DrillPlan> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(Uuid::nil);

    let now = chrono::Utc::now();
    let plan_no = format!(
        "DP-{}-{}",
        now.format("%Y%m%d"),
        &Uuid::new_v4().simple().to_string()[..6]
    );

    let result = sqlx::query(
        r#"
        INSERT INTO ehs.qa_ehs_drill_plans (
            plan_no, title, description, drill_type, plan_date, location,
            participants, estimated_duration, content, organizer, status,
            related_plan_id, tenant_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, 'planned'), $12, $13, NOW(), NOW())
        RETURNING
            id::text AS id, plan_no, title, description, drill_type,
            plan_date::text AS plan_date, location, participants, estimated_duration,
            content, organizer, status, related_plan_id::text AS related_plan_id,
            created_at::text AS created_at, updated_at::text AS updated_at,
            tenant_id::text AS tenant_id
        "#
    )
    .bind(&plan_no)
    .bind(&req.title)
    .bind(req.description.as_deref())
    .bind(&req.drill_type)
    .bind(req.plan_date.as_deref())
    .bind(req.location.as_deref())
    .bind(req.participants)
    .bind(req.estimated_duration)
    .bind(req.content.as_deref())
    .bind(req.organizer.as_deref())
    .bind(req.related_plan_id.as_deref())
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create drill plan: {}", e);
            return ApiResponse::server_error("创建演练计划失败");
        }
    };

    let plan = DrillPlan {
        id: row.try_get::<String, _>("id").unwrap_or_default(),
        plan_no: row.try_get::<String, _>("plan_no").unwrap_or_default(),
        title: row.try_get::<String, _>("title").unwrap_or_default(),
        description: row
            .try_get::<Option<String>, _>("description")
            .ok()
            .flatten(),
        drill_type: row.try_get::<String, _>("drill_type").unwrap_or_default(),
        plan_date: row.try_get::<Option<String>, _>("plan_date").ok().flatten(),
        location: row.try_get::<Option<String>, _>("location").ok().flatten(),
        participants: row.try_get::<Option<i32>, _>("participants").ok().flatten(),
        estimated_duration: row
            .try_get::<Option<i32>, _>("estimated_duration")
            .ok()
            .flatten(),
        content: row.try_get::<Option<String>, _>("content").ok().flatten(),
        organizer: row.try_get::<Option<String>, _>("organizer").ok().flatten(),
        status: row
            .try_get::<String, _>("status")
            .unwrap_or_else(|_| "planned".to_string()),
        related_plan_id: row
            .try_get::<Option<String>, _>("related_plan_id")
            .ok()
            .flatten(),
        created_at: row
            .try_get::<Option<String>, _>("created_at")
            .ok()
            .flatten(),
        updated_at: row
            .try_get::<Option<String>, _>("updated_at")
            .ok()
            .flatten(),
        tenant_id: row
            .try_get::<Option<Uuid>, _>("tenant_id")
            .ok()
            .flatten()
            .unwrap_or_default(),
    };

    ApiResponse::success(plan, "创建演练计划成功")
}
pub async fn submit_drill_evaluation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateDrillEvaluationRequest>,
) -> ApiResponse<DrillEvaluation> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(Uuid::nil);

    // drill_id 有外键指向 ehs.qa_ehs_drill_records：先校验存在性，避免直接 INSERT 触发 500 外键违约
    match sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM ehs.qa_ehs_drill_records WHERE id = $1::uuid AND deleted_at IS NULL",
    )
    .bind(&id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(_)) => {}
        Ok(None) => return ApiResponse::not_found("演练记录不存在"),
        Err(e) => {
            tracing::error!("Failed to check drill record: {}", e);
            return ApiResponse::server_error("提交演练评估失败");
        }
    }

    let result = sqlx::query(
        r#"
        INSERT INTO ehs.qa_ehs_drill_evaluations (
            drill_id, evaluator, overall_score, overall_comment, objectives_met,
            response_time_score, coordination_score, procedure_score, equipment_score,
            evaluated_at, tenant_id, created_at
        ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, NOW())
        RETURNING
            id::text AS id, drill_id::text AS drill_id, evaluator, overall_score,
            overall_comment, objectives_met, response_time_score, coordination_score,
            procedure_score, equipment_score, evaluated_at::text AS evaluated_at,
            created_at::text AS created_at, tenant_id::text AS tenant_id
        "#,
    )
    .bind(&id)
    .bind(req.evaluator.as_deref())
    .bind(req.overall_score)
    .bind(req.overall_comment.as_deref())
    .bind(req.objectives_met)
    .bind(req.response_time_score)
    .bind(req.coordination_score)
    .bind(req.procedure_score)
    .bind(req.equipment_score)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to submit drill evaluation: {}", e);
            return ApiResponse::server_error("提交演练评估失败");
        }
    };

    let eval = DrillEvaluation {
        id: row.try_get::<String, _>("id").unwrap_or_default(),
        drill_id: row.try_get::<String, _>("drill_id").unwrap_or_default(),
        evaluator: row.try_get::<Option<String>, _>("evaluator").ok().flatten(),
        overall_score: row
            .try_get::<Option<i32>, _>("overall_score")
            .ok()
            .flatten(),
        overall_comment: row
            .try_get::<Option<String>, _>("overall_comment")
            .ok()
            .flatten(),
        objectives_met: row
            .try_get::<Option<bool>, _>("objectives_met")
            .ok()
            .flatten(),
        response_time_score: row
            .try_get::<Option<i32>, _>("response_time_score")
            .ok()
            .flatten(),
        coordination_score: row
            .try_get::<Option<i32>, _>("coordination_score")
            .ok()
            .flatten(),
        procedure_score: row
            .try_get::<Option<i32>, _>("procedure_score")
            .ok()
            .flatten(),
        equipment_score: row
            .try_get::<Option<i32>, _>("equipment_score")
            .ok()
            .flatten(),
        evaluated_at: row
            .try_get::<Option<String>, _>("evaluated_at")
            .ok()
            .flatten(),
        created_at: row
            .try_get::<Option<String>, _>("created_at")
            .ok()
            .flatten(),
        tenant_id: row
            .try_get::<Option<Uuid>, _>("tenant_id")
            .ok()
            .flatten()
            .unwrap_or_default(),
    };

    ApiResponse::success(eval, "提交演练评估成功")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/drills/records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_drill_records(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<DrillQuery>,
) -> ApiResponse<Vec<DrillRecord>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(s) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(s.clone());
    }
    if let Some(t) = &q.drill_type {
        where_clause.push_str(&format!(" AND drill_type = ${}", params.len() + 1));
        params.push(t.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR record_no ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        let like = format!("%{search}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, record_no AS drill_no, plan_id::text AS plan_id, title AS drill_name,
               started_at::text AS drill_date, participant_list AS participants,
               duration::float8 AS duration_hours, location, actual_content AS summary,
               issues_found, improvements, attachments, status, created_by,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_drill_records
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list drill records: {}", e);
            return ApiResponse::server_error("获取演练记录列表失败");
        }
    };
    let list: Vec<DrillRecord> = rows.iter().map(drill_record_from_row).collect();
    ApiResponse::success(list, "获取演练记录列表成功")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateDrillRecordRequest>,
) -> ApiResponse<DrillRecord> {
    let tenant_id = resolve_tenant_id(&claims);
    let record_no = format!("DR-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let participants: serde_json::Value = req
        .participants
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));
    let attachments: serde_json::Value = req
        .attachments
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));
    #[allow(clippy::cast_possible_truncation, clippy::as_conversions)]
    let duration = req.duration_hours.map(|v| v as i32);

    let sql = r#"
        INSERT INTO ehs.qa_ehs_drill_records
            (record_no, plan_id, title, started_at, duration, participant_list,
             location, actual_content, issues_found, improvements, attachments,
             status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id::text AS id, record_no AS drill_no, plan_id::text AS plan_id, title AS drill_name,
                  started_at::text AS drill_date, participant_list AS participants,
                  duration::float8 AS duration_hours, location, actual_content AS summary,
                  issues_found, improvements, attachments, status, created_by,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&record_no)
        .bind(&req.plan_id)
        .bind(&req.drill_name)
        .bind(&req.drill_date)
        .bind(duration)
        .bind(participants)
        .bind(&req.location)
        .bind(&req.summary)
        .bind(&req.issues_found)
        .bind(&req.improvements)
        .bind(attachments)
        .bind("in_progress")
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create drill record: {}", e);
            return ApiResponse::server_error("演练记录创建失败");
        }
    };
    let record = drill_record_from_row(&row);
    ApiResponse::success(record, "演练记录创建成功")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<DrillRecord> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        SELECT id::text AS id, record_no AS drill_no, plan_id::text AS plan_id, title AS drill_name,
               started_at::text AS drill_date, participant_list AS participants,
               duration::float8 AS duration_hours, location, actual_content AS summary,
               issues_found, improvements, attachments, status, created_by,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_drill_records
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let row = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("演练记录不存在"),
        Err(e) => {
            tracing::error!("Failed to get drill record: {}", e);
            return ApiResponse::server_error("获取演练详情失败");
        }
    };
    let record = drill_record_from_row(&row);
    ApiResponse::success(record, "获取演练详情成功")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateDrillRecordRequest>,
) -> ApiResponse<DrillRecord> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = req.drill_name {
        sets.push(format!("title = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.drill_date {
        sets.push(format!("started_at = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.duration_hours {
        sets.push(format!("duration = ${}", params.len() + 1));
        #[allow(clippy::cast_possible_truncation, clippy::as_conversions)]
        params.push((v as i32).to_string());
    }
    if let Some(v) = req.participants {
        sets.push(format!("participant_list = ${}", params.len() + 1));
        params.push(serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(v) = req.location {
        sets.push(format!("location = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.summary {
        sets.push(format!("actual_content = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.issues_found {
        sets.push(format!("issues_found = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.improvements {
        sets.push(format!("improvements = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.attachments {
        sets.push(format!("attachments = ${}", params.len() + 1));
        params.push(serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(v) = req.status {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v);
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_drill_records
        SET {set_clause}
        WHERE id::text = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, record_no AS drill_no, plan_id::text AS plan_id, title AS drill_name,
                  started_at::text AS drill_date, participant_list AS participants,
                  duration::float8 AS duration_hours, location, actual_content AS summary,
                  issues_found, improvements, attachments, status, created_by,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("演练记录不存在"),
        Err(e) => {
            tracing::error!("Failed to update drill record: {}", e);
            return ApiResponse::server_error("演练记录更新失败");
        }
    };
    let record = drill_record_from_row(&row);
    ApiResponse::success(record, "演练记录更新成功")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        UPDATE ehs.qa_ehs_drill_records
        SET deleted_at = now()
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete drill record: {}", e);
            return ApiResponse::server_error("演练记录删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("演练记录不存在");
    }
    ApiResponse::success((), "演练记录删除成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/drills/statistics",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_drill_statistics(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> ApiResponse<DrillStatistics> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let tc = "($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL";

    let total_drills: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM ehs.qa_ehs_drill_records WHERE {}",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let planned_count: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM ehs.qa_ehs_drill_plans WHERE {}",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let completed_count: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM ehs.qa_ehs_drill_records WHERE {} AND status = 'completed'",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let average_score: Option<f64> = sqlx::query_scalar(&format!(
        "SELECT AVG(overall_score)::float8 FROM ehs.qa_ehs_drill_evaluations WHERE {}",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(None);
    let problem_count: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM ehs.qa_ehs_drill_problems WHERE {}",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let rectified_count: i64 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM ehs.qa_ehs_drill_problems WHERE {} AND status = 'rectified'",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let mut by_type: Vec<serde_json::Value> = Vec::new();
    if let Ok(rows) = sqlx::query(&format!(
        "SELECT drill_type, COUNT(*)::int8 AS cnt FROM ehs.qa_ehs_drill_records WHERE {} GROUP BY drill_type ORDER BY cnt DESC",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_all(&state.pool)
    .await
    {
        for r in rows {
            by_type.push(serde_json::json!({
                "type": r.try_get::<String, _>("drill_type").unwrap_or_default(),
                "name": r.try_get::<String, _>("drill_type").unwrap_or_default(),
                "count": r.try_get::<i64, _>("cnt").unwrap_or(0),
            }));
        }
    }

    let mut by_month: Vec<serde_json::Value> = Vec::new();
    if let Ok(rows) = sqlx::query(&format!(
        "SELECT to_char(started_at, 'YYYY-MM') AS month, COUNT(*)::int8 AS cnt FROM ehs.qa_ehs_drill_records WHERE {} GROUP BY 1 ORDER BY 1",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_all(&state.pool)
    .await
    {
        for r in rows {
            by_month.push(serde_json::json!({
                "month": r.try_get::<String, _>("month").unwrap_or_default(),
                "count": r.try_get::<i64, _>("cnt").unwrap_or(0),
            }));
        }
    }

    ApiResponse::success(
        DrillStatistics {
            total_drills: i32::try_from(total_drills).unwrap_or(i32::MAX),
            planned_count: i32::try_from(planned_count).unwrap_or(i32::MAX),
            completed_count: i32::try_from(completed_count).unwrap_or(i32::MAX),
            average_score,
            by_type,
            by_month,
            problem_count: i32::try_from(problem_count).unwrap_or(i32::MAX),
            rectified_count: i32::try_from(rectified_count).unwrap_or(i32::MAX),
            participant_count: 0,
            tenant_id: tenant_bind.parse().unwrap_or_default(),
        },
        "获取演练统计成功",
    )
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/drills/types",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_drill_types(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> ApiResponse<Vec<DrillType>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let tc = "($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL";

    let mut types: Vec<DrillType> = Vec::new();
    let sql = format!(
        "SELECT drill_type FROM ehs.qa_ehs_drill_plans WHERE {tc} AND drill_type IS NOT NULL AND drill_type <> ''          UNION          SELECT drill_type FROM ehs.qa_ehs_drill_records WHERE {tc} AND drill_type IS NOT NULL AND drill_type <> ''          ORDER BY 1"
    );
    if let Ok(rows) = sqlx::query(&sql)
        .bind(&tenant_bind)
        .fetch_all(&state.pool)
        .await
    {
        for r in rows {
            let code = r.try_get::<String, _>("drill_type").unwrap_or_default();
            types.push(DrillType {
                code: code.clone(),
                name: code,
            });
        }
    }

    ApiResponse::success(types, "获取演练类型成功")
}

fn resolve_tenant_id(claims: &Claims) -> uuid::Uuid {
    if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }
}

/// qa_ehs_drill_records 行 → DrillRecord（SELECT 列别名对齐本函数字段）
fn drill_record_from_row(r: &sqlx::postgres::PgRow) -> DrillRecord {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let participants: Option<serde_json::Value> = r.try_get("participants").ok().flatten();
    let participants = participants.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    let attachments: Option<serde_json::Value> = r.try_get("attachments").ok().flatten();
    let attachments = attachments.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    DrillRecord {
        id: r.try_get("id").unwrap_or_default(),
        drill_no: r.try_get("drill_no").unwrap_or_default(),
        plan_id: r.try_get("plan_id").ok().flatten(),
        drill_name: r.try_get("drill_name").unwrap_or_default(),
        drill_date: r.try_get("drill_date").ok().flatten(),
        participants,
        duration_hours: r.try_get("duration_hours").ok().flatten(),
        location: r.try_get("location").ok().flatten(),
        summary: r.try_get("summary").ok().flatten(),
        issues_found: r.try_get("issues_found").ok().flatten(),
        improvements: r.try_get("improvements").ok().flatten(),
        attachments,
        status: r
            .try_get("status")
            .unwrap_or_else(|_| "in_progress".to_string()),
        created_by: r.try_get("created_by").ok().flatten(),
        created_at: r.try_get::<String, _>("created_at").ok(),
        updated_at: r.try_get::<String, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
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

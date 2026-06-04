use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post, put, delete},
    Json,
    Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::risk::{
    ProjectRisk,
    RiskEvent,
    CreateRiskEventRequest,
    CreateRiskRequest,
    UpdateRiskRequest,
};

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/api/v1/projects/{project_id}/risks", get(get_project_risks).post(create_risk))
        .route("/api/v1/risks/{id}", get(get_risk).put(update_risk))
        .route("/api/v1/risks/{id}/events", get(get_risk_events).post(create_risk_event))
        .with_state(pool)
}

async fn get_project_risks(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectRisk>>> {
    let risks = sqlx::query_as::<_, ProjectRisk>("SELECT * FROM pm.project_risks WHERE project_id = $1 ORDER BY risk_score DESC")
        .bind(project_id)
        .fetch_all(&pool)
        .await;

    match risks {
        Ok(r) => Json(ApiResponse::success(r, "获取项目风险列表成功")),
        Err(e) => {
            tracing::error!("获取风险失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取风险失败"))
        }
    }
}

async fn get_risk(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectRisk>> {
    let risk = sqlx::query_as::<_, ProjectRisk>("SELECT * FROM pm.project_risks WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await;

    match risk {
        Ok(r) => Json(ApiResponse::success(r, "获取风险详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "风险不存在")),
        Err(e) => {
            tracing::error!("获取风险失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取风险失败"))
        }
    }
}

async fn create_risk(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateRiskRequest>,
) -> Json<ApiResponse<ProjectRisk>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let risk = sqlx::query_as::<_, ProjectRisk>(
        "INSERT INTO pm.project_risks (id, project_id, risk_code, risk_name, risk_description, risk_category, risk_subcategory, likelihood, impact, risk_score, status, mitigation_strategy, contingency_plan, trigger_condition, warning_threshold, owner, response_due_date, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'identified', $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *"
    )
    .bind(id)
    .bind(project_id)
    .bind(req.risk_code)
    .bind(&req.risk_name)
    .bind(req.risk_description)
    .bind(req.risk_category)
    .bind(req.risk_subcategory)
    .bind(&req.likelihood)
    .bind(&req.impact)
    .bind(req.risk_score)
    .bind(req.mitigation_strategy)
    .bind(req.contingency_plan)
    .bind(req.trigger_condition)
    .bind(req.warning_threshold.unwrap_or(80))
    .bind(req.owner)
    .bind(parse_date_opt(&req.response_due_date))
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match risk {
        Ok(r) => Json(ApiResponse::success(r, "创建风险成功")),
        Err(e) => {
            tracing::error!("创建风险失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "创建风险失败"))
        }
    }
}

async fn update_risk(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateRiskRequest>,
) -> Json<ApiResponse<ProjectRisk>> {
    let risk = sqlx::query_as::<_, ProjectRisk>(
        "UPDATE pm.project_risks SET
            risk_name = COALESCE($1, risk_name),
            risk_description = COALESCE($2, risk_description),
            risk_category = COALESCE($3, risk_category),
            risk_subcategory = COALESCE($4, risk_subcategory),
            likelihood = COALESCE($5, likelihood),
            impact = COALESCE($6, impact),
            risk_score = COALESCE($7, risk_score),
            status = COALESCE($8, status),
            mitigation_strategy = COALESCE($9, mitigation_strategy),
            contingency_plan = COALESCE($10, contingency_plan),
            trigger_condition = COALESCE($11, trigger_condition),
            warning_threshold = COALESCE($12, warning_threshold),
            owner = COALESCE($13, owner),
            response_due_date = COALESCE($14, response_due_date),
            updated_at = $15
        WHERE id = $16 RETURNING *"
    )
    .bind(req.risk_name)
    .bind(req.risk_description)
    .bind(req.risk_category)
    .bind(req.risk_subcategory)
    .bind(req.likelihood)
    .bind(req.impact)
    .bind(req.risk_score)
    .bind(req.status)
    .bind(req.mitigation_strategy)
    .bind(req.contingency_plan)
    .bind(req.trigger_condition)
    .bind(req.warning_threshold)
    .bind(req.owner)
    .bind(parse_date_opt(&req.response_due_date))
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match risk {
        Ok(r) => Json(ApiResponse::success(r, "更新风险成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "风险不存在")),
        Err(e) => {
            tracing::error!("更新风险失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "更新风险失败"))
        }
    }
}

async fn get_risk_events(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<RiskEvent>>> {
    let events = sqlx::query_as::<_, RiskEvent>("SELECT * FROM pm.risk_events WHERE risk_id = $1 ORDER BY occurred_at DESC")
        .bind(id)
        .fetch_all(&pool)
        .await;

    match events {
        Ok(e) => Json(ApiResponse::success(e, "获取风险事件列表成功")),
        Err(e) => {
            tracing::error!("获取风险事件失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取风险事件失败"))
        }
    }
}

async fn create_risk_event(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateRiskEventRequest>,
) -> Json<ApiResponse<RiskEvent>> {
    let event_id = Uuid::new_v4();
    let now = Utc::now();
    
    let event = sqlx::query_as::<_, RiskEvent>(
        "INSERT INTO pm.risk_events (id, risk_id, event_type, event_description, occurred_at, reported_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $5) RETURNING *"
    )
    .bind(event_id)
    .bind(id)
    .bind(&req.event_type)
    .bind(req.event_description)
    .bind(now)
    .bind(req.reported_by)
    .fetch_one(&pool)
    .await;

    match event {
        Ok(e) => Json(ApiResponse::success(e, "创建风险事件成功")),
        Err(e) => {
            tracing::error!("创建风险事件失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "创建风险事件失败"))
        }
    }
}

fn parse_date_opt(date_str: &Option<String>) -> Option<chrono::DateTime<chrono::Utc>> {
    date_str.as_ref().and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|d| d.with_timezone(&chrono::Utc))
}
//! Accident handlers - Reporting, investigation, treatment, and review

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::resolve_create_tenant;
use topems_shared_core::response::ApiResponse;
use topems_shared_event::event::commit_retry;
use utoipa::ToSchema;

use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/accidents", get(list_accidents))
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
        .route(
            "/incidents/{id}/actions",
            get(list_incident_actions).post(create_incident_action),
        )
        .route(
            "/incidents/{id}/actions/{action_id}",
            put(update_incident_action),
        )
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
    pub occurred_at: Option<DateTime<Utc>>,
    pub casualties: Option<i32>,
    pub economic_loss: Option<f64>,
    pub status: String,
    pub reported_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

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
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
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
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct TreatmentAction {
    pub id: String,
    pub description: String,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub completed_at: Option<DateTime<Utc>>,

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
    pub reviewed_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateInvestigationRequest {
    pub team: Option<Vec<String>>,
    pub findings: Option<String>,
    pub root_cause: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateInvestigationRequest {
    pub findings: Option<String>,
    pub root_cause: Option<String>,
    pub timeline: Option<Vec<Event>>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTreatmentRequest {
    pub actions: Vec<CreateTreatmentActionRequest>,
    pub responsible: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTreatmentActionRequest {
    pub description: String,
    pub responsible: Option<String>,
    pub deadline: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateTreatmentActionRequest {
    pub status: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<AccidentQuery>,
) -> ApiResponse<Vec<Accident>> {
    let tenant_bind: String = resolve_tenant_id(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(status) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(status.clone());
    }
    if let Some(severity) = &q.severity {
        where_clause.push_str(&format!(" AND severity = ${}", params.len() + 1));
        params.push(severity.clone());
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, accident_no, title, description, accident_type, severity,
               location, occurred_at AS occurred_at, casualties,
               economic_loss::text AS economic_loss, status, reported_by,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_accidents
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );

    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list accidents: {}", e);
            return ApiResponse::server_error("获取事故列表失败");
        }
    };

    let list: Vec<Accident> = rows.iter().map(accident_from_row).collect();
    ApiResponse::success(list, "获取事故列表成功")
}

/// 行映射（SELECT 列均对齐 accident_from_row 别名）
fn accident_from_row(r: &sqlx::postgres::PgRow) -> Accident {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    Accident {
        id: r.try_get("id").unwrap_or_default(),
        accident_no: r.try_get("accident_no").unwrap_or_default(),
        title: r.try_get("title").unwrap_or_default(),
        description: r.try_get("description").ok().flatten(),
        accident_type: r.try_get("accident_type").ok().flatten(),
        severity: r.try_get("severity").unwrap_or_else(|_| "一般".to_string()),
        location: r.try_get("location").ok().flatten(),
        occurred_at: r.try_get("occurred_at").ok().flatten(),
        casualties: r.try_get("casualties").ok().flatten(),
        economic_loss: r
            .try_get::<String, _>("economic_loss")
            .ok()
            .and_then(|s| s.parse::<f64>().ok()),
        status: r
            .try_get("status")
            .unwrap_or_else(|_| "reported".to_string()),
        reported_by: r.try_get("reported_by").ok().flatten(),
        created_at: r.try_get("created_at").ok().flatten(),
        updated_at: r.try_get("updated_at").ok().flatten(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateAccidentRequest>,
) -> ApiResponse<Accident> {
    // 生产端契约：事故上报必须带租户；无租户的公共行无法产生可归属的 EhsAccidentReported，
    // 直接拒绝，禁止落 nil 租户行或用 nil 发事件。
    let tenant_id = match resolve_create_tenant(&claims) {
        Ok(Some(t)) => t,
        Ok(None) => return ApiResponse::bad_request("缺少租户上下文，拒绝上报事故"),
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    tracing::debug!("Reporting accident: {:?}", req);
    let accident_no = format!(
        "ACC-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let id = uuid::Uuid::new_v4();
    let occurred_at = req
        .occurred_at
        .as_deref()
        .and_then(|t| chrono::DateTime::parse_from_rfc3339(t).ok())
        .map(|d| d.with_timezone(&chrono::Utc));
    let accident = Accident {
        id: id.to_string(),
        accident_no: accident_no.clone(),
        title: req.title.clone(),
        description: req.description.clone(),
        accident_type: req.accident_type.clone(),
        severity: req.severity.clone(),
        location: req.location.clone(),
        occurred_at: occurred_at.clone(),
        casualties: req.casualties.or(Some(0)),
        economic_loss: req.economic_loss.or(Some(0.0)),
        status: "reported".to_string(),
        reported_by: req.reported_by.clone(),
        created_at: Some(chrono::Utc::now()),
        updated_at: Some(chrono::Utc::now()),
        tenant_id,
    };

    // 真写入：INSERT ehs.qa_ehs_accidents
    let insert = sqlx::query(
        r#"INSERT INTO ehs.qa_ehs_accidents
            (id, accident_no, title, description, accident_type, severity, location,
             occurred_at, casualties, economic_loss, status, reported_by, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)"#,
    )
    .bind(id)
    .bind(&accident.accident_no)
    .bind(&accident.title)
    .bind(&accident.description)
    .bind(&accident.accident_type)
    .bind(&accident.severity)
    .bind(&accident.location)
    .bind(accident.occurred_at)
    .bind(accident.casualties)
    .bind(accident.economic_loss)
    .bind(&accident.status)
    .bind(&accident.reported_by)
    .bind(tenant_id);
    if let Err(e) = insert.execute(&state.pool).await {
        tracing::error!("Failed to insert accident: {}", e);
        return ApiResponse::server_error("事故上报失败");
    }

    // 发布端补全：EhsAccidentReported（→ integration → LIMS 建样/任务联动）
    if let Some(ref publisher) = state.event_publisher {
        let publisher = publisher.clone();
        let accident_id = Uuid::parse_str(&accident.id).unwrap_or_else(|_| Uuid::nil());
        let accident_no = accident.accident_no.clone();
        let title = accident.title.clone();
        let severity = accident.severity.clone();
        let location = accident.location.clone();
        let occurred_at = accident.occurred_at.map(|d| d.to_rfc3339());
        tokio::spawn(async move {
            let payload = topems_shared_event::event::EhsAccidentReportedPayload {
                tenant_id,
                accident_id,
                accident_no,
                title,
                severity,
                location,
                occurred_at,
            };
            let et = topems_shared_event::event::EventType::EhsAccidentReported;
            if let Err(e) = publisher.publish_event(et, &payload).await {
                tracing::warn!("[ehs] EhsAccidentReported 事件发布失败: {}，入重试队列", e);
                // D6：发布失败入 Redis ZSET，由 main.rs 15s run_relay 重发（typed 通道直重发 payload）。
                commit_retry::push_retry_typed("ehs", et, &payload).await;
            }
        });
    }

    ApiResponse::success(accident, "事故报告成功")
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/incidents/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "事故 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_accident(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<AccidentDetail> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::debug!("Getting accident detail: {}", id);

    let row = sqlx::query(
        r#"SELECT id::text AS id, accident_no, title, description, accident_type, severity,
                  location, occurred_at AS occurred_at, casualties,
                  economic_loss::text AS economic_loss, status, reported_by,
                  created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
           FROM ehs.qa_ehs_accidents
           WHERE ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
             AND id = $1::uuid AND deleted_at IS NULL"#,
    )
    .bind(&id)
    .bind(&tenant_bind)
    .fetch_optional(&state.pool)
    .await;

    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("事故不存在"),
        Err(e) => {
            tracing::error!("Failed to get accident: {}", e);
            return ApiResponse::server_error("获取事故详情失败");
        }
    };
    let accident = accident_from_row(&row);

    ApiResponse::success(
        AccidentDetail {
            accident,
            investigation: None,
            treatment: None,
            review: None,
            tenant_id: tenant_id_from_row(&row),
        },
        "获取事故详情成功",
    )
}

fn tenant_id_from_row(r: &sqlx::postgres::PgRow) -> Uuid {
    let t: String = r.try_get("tenant_id").unwrap_or_default();
    Uuid::parse_str(&t).unwrap_or_default()
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "事故 ID")),
    request_body = CreateAccidentRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn update_accident(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateAccidentRequest>,
) -> ApiResponse<Accident> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::debug!("Updating accident {}: {:?}", id, req);

    let result = sqlx::query(
        r#"UPDATE ehs.qa_ehs_accidents
           SET title=$1, description=$2, accident_type=$3, severity=$4, location=$5,
               occurred_at=$6, casualties=$7, economic_loss=$8, updated_at=now()
           WHERE ($9 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $9)
             AND id = $10::uuid AND deleted_at IS NULL
           RETURNING id::text AS id, accident_no, title, description, accident_type, severity,
                     location, occurred_at AS occurred_at, casualties,
                     economic_loss::text AS economic_loss, status, reported_by,
                     created_at AS created_at, updated_at AS updated_at,
                     tenant_id::text AS tenant_id"#,
    )
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.accident_type)
    .bind(&req.severity)
    .bind(&req.location)
    .bind(req.occurred_at.and_then(|t| {
        chrono::DateTime::parse_from_rfc3339(&t)
            .ok()
            .map(|d| d.with_timezone(&chrono::Utc))
    }))
    .bind(req.casualties.unwrap_or(0))
    .bind(req.economic_loss.unwrap_or(0.0))
    .bind(&tenant_bind)
    .bind(&id);
    let row = match result.fetch_optional(&state.pool).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("事故不存在"),
        Err(e) => {
            tracing::error!("Failed to update accident: {}", e);
            return ApiResponse::server_error("事故更新失败");
        }
    };
    ApiResponse::success(accident_from_row(&row), "事故更新成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "事故 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_accident(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<serde_json::Value> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::debug!("Deleting accident: {}", id);
    let r = sqlx::query(
        "UPDATE ehs.qa_ehs_accidents SET deleted_at=now() \
         WHERE ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2) AND id = $1::uuid AND deleted_at IS NULL",
    )
    .bind(&id)
    .bind(&tenant_bind)
    .execute(&state.pool)
    .await;
    match r {
        Ok(_) => ApiResponse::success(serde_json::json!({}), "事故删除成功"),
        Err(e) => {
            tracing::error!("Failed to delete accident: {}", e);
            ApiResponse::server_error("事故删除失败")
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:investigation:admin"])),
    path = "/api/ehs/incidents/{id}/investigation",
    tag = "ehs",
    params(("id" = String, Path, description = "事故 ID")),
    request_body = CreateInvestigationRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn start_investigation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateInvestigationRequest>,
) -> ApiResponse<Investigation> {
    let tenant_id = resolve_tenant_id(&claims);
    // 连接级租户上下文：复用请求级 RLS 事务，裸池写入在严格 RLS 策略下会被拒绝。
    let db = topems_shared_db::scope::Db::new(state.pool.clone(), "ehs, public, shared");
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    tracing::debug!("Starting investigation for accident {}: {:?}", id, req);
    let inv_id = uuid::Uuid::new_v4();
    let row = sqlx::query(
        r#"INSERT INTO ehs.qa_ehs_investigations (id, accident_id, team, findings, root_cause, status, started_at, tenant_id)
           VALUES ($1, $2, $3::jsonb, $4, $5, 'in_progress', now(), $6)
           RETURNING id::text AS id, accident_id::text AS accident_id, team, findings, root_cause,
                     timeline, status, started_at AS started_at, completed_at AS completed_at,
                     created_at AS created_at, updated_at AS updated_at, tenant_id::text AS tenant_id"#,
    )
    .bind(inv_id)
    .bind(Uuid::parse_str(&id).unwrap_or_default())
    .bind(serde_json::to_string(&req.team).unwrap_or_else(|_| "null".into()))
    .bind(&req.findings)
    .bind(&req.root_cause)
    .bind(tenant_id);
    let row = match row.fetch_one(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to start investigation: {}", e);
            return ApiResponse::server_error("调查启动失败");
        }
    };
    ApiResponse::success(investigation_from_row(&row), "调查已启动")
}

fn investigation_from_row(r: &sqlx::postgres::PgRow) -> Investigation {
    Investigation {
        id: r.try_get("id").unwrap_or_default(),
        accident_id: r.try_get("accident_id").unwrap_or_default(),
        team: r
            .try_get::<Option<serde_json::Value>, _>("team")
            .ok()
            .flatten()
            .and_then(|v| serde_json::from_value(v).ok()),
        findings: r.try_get("findings").ok().flatten(),
        root_cause: r.try_get("root_cause").ok().flatten(),
        timeline: r
            .try_get::<Option<serde_json::Value>, _>("timeline")
            .ok()
            .flatten()
            .and_then(|v| serde_json::from_value(v).ok()),
        status: r
            .try_get("status")
            .unwrap_or_else(|_| "in_progress".to_string()),
        started_at: r.try_get("started_at").ok().flatten(),
        completed_at: r.try_get("completed_at").ok().flatten(),
        created_at: r.try_get("created_at").ok().flatten(),
        updated_at: r.try_get("updated_at").ok().flatten(),
        tenant_id: Uuid::parse_str(&r.try_get::<String, _>("tenant_id").unwrap_or_default())
            .unwrap_or_default(),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:investigation:admin"])),
    path = "/api/ehs/incidents/{id}/investigation",
    tag = "ehs",
    params(("id" = String, Path, description = "事故 ID")),
    request_body = UpdateInvestigationRequest,
    responses((status = 200, description = "OK")),
)]
// gate: admin-only
pub async fn update_investigation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateInvestigationRequest>,
) -> ApiResponse<Investigation> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::debug!("Updating investigation for accident {}: {:?}", id, req);
    let row = sqlx::query(
        r#"UPDATE ehs.qa_ehs_investigations
           SET findings=COALESCE($1, findings), root_cause=COALESCE($2, root_cause),
               timeline=$3::jsonb, status=COALESCE($4, status), updated_at=now()
           WHERE ($5 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $5)
             AND accident_id = $6::uuid AND deleted_at IS NULL
           RETURNING id::text AS id, accident_id::text AS accident_id, team, findings, root_cause,
                     timeline, status, started_at AS started_at, completed_at AS completed_at,
                     created_at AS created_at, updated_at AS updated_at, tenant_id::text AS tenant_id"#,
    )
    .bind(&req.findings)
    .bind(&req.root_cause)
    .bind(serde_json::to_string(&req.timeline).unwrap_or_else(|_| "null".into()))
    .bind(&req.status)
    .bind(&tenant_bind)
    .bind(&id)
    .fetch_optional(&state.pool)
    .await;
    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("调查记录不存在"),
        Err(e) => {
            tracing::error!("Failed to update investigation: {}", e);
            return ApiResponse::server_error("调查更新失败");
        }
    };
    ApiResponse::success(investigation_from_row(&row), "调查更新成功")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents/{id}/treatment",
    tag = "ehs",
    params(("id" = String, Path, description = "事故 ID")),
    request_body = CreateTreatmentRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn create_treatment(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateTreatmentRequest>,
) -> ApiResponse<Treatment> {
    let tenant_id = resolve_tenant_id(&claims);
    tracing::debug!("Creating treatment for accident {}: {:?}", id, req);
    let tx_id = uuid::Uuid::new_v4();
    let accident_uuid = Uuid::parse_str(&id).unwrap_or_default();

    // INSERT treatment 主行
    if let Err(e) = sqlx::query(
        r#"INSERT INTO ehs.qa_ehs_treatments (id, accident_id, responsible, status, started_at, tenant_id)
           VALUES ($1, $2, $3, 'in_progress', now(), $4)"#,
    )
    .bind(tx_id)
    .bind(accident_uuid)
    .bind(&req.responsible)
    .bind(tenant_id)
    .execute(&state.pool)
    .await
    {
        tracing::error!("Failed to insert treatment: {}", e);
        return ApiResponse::server_error("处理方案创建失败");
    }

    // INSERT treatment_actions（多行）
    let mut actions = Vec::with_capacity(req.actions.len());
    for a in req.actions {
        let act_id = uuid::Uuid::new_v4();
        if let Err(e) = sqlx::query(
            r#"INSERT INTO ehs.qa_ehs_treatment_actions (id, treatment_id, description, responsible, deadline, status, tenant_id)
               VALUES ($1, $2, $3, $4, $5, 'pending', $6)"#,
        )
        .bind(act_id)
        .bind(tx_id)
        .bind(&a.description)
        .bind(&a.responsible)
        .bind(a.deadline.clone().and_then(|d| chrono::DateTime::parse_from_rfc3339(&d).ok().map(|t| t.with_timezone(&chrono::Utc))))
        .bind(tenant_id)
        .execute(&state.pool)
        .await
        {
            tracing::error!("Failed to insert treatment action: {}", e);
        }
        actions.push(TreatmentAction {
            id: act_id.to_string(),
            description: a.description,
            responsible: a.responsible,
            deadline: a.deadline,
            status: "pending".to_string(),
            completed_at: None,
            tenant_id,
        });
    }

    ApiResponse::success(
        Treatment {
            id: tx_id.to_string(),
            accident_id: id,
            actions,
            responsible: req.responsible,
            status: "in_progress".to_string(),
            started_at: Some(chrono::Utc::now()),
            completed_at: None,
            created_at: Some(chrono::Utc::now()),
            updated_at: Some(chrono::Utc::now()),
            tenant_id,
        },
        "处理方案已创建",
    )
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents/{id}/treatment/actions/{action_id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "事故 ID"),
        ("action_id" = String, Path, description = "处置行动 ID")
    ),
    request_body = UpdateTreatmentActionRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn update_treatment_action(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path((_id, action_id)): axum::extract::Path<(String, String)>,
    Json(req): Json<UpdateTreatmentActionRequest>,
) -> ApiResponse<TreatmentAction> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::debug!("Updating treatment action {}: {:?}", action_id, req);
    let row = sqlx::query(
        r#"UPDATE ehs.qa_ehs_treatment_actions
           SET status=COALESCE($1, status), completed_at=$2, updated_at=now()
           WHERE ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $3)
             AND id = $4::uuid AND deleted_at IS NULL
           RETURNING id::text AS id, description, responsible, deadline::text AS deadline,
                     status, completed_at AS completed_at, tenant_id::text AS tenant_id"#,
    )
    .bind(&req.status)
    .bind(req.completed_at.and_then(|d| {
        chrono::DateTime::parse_from_rfc3339(&d)
            .ok()
            .map(|t| t.with_timezone(&chrono::Utc))
    }))
    .bind(&tenant_bind)
    .bind(&action_id)
    .fetch_optional(&state.pool)
    .await;
    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("处置行动不存在"),
        Err(e) => {
            tracing::error!("Failed to update treatment action: {}", e);
            return ApiResponse::server_error("处置行动更新失败");
        }
    };
    ApiResponse::success(
        TreatmentAction {
            id: row.try_get("id").unwrap_or_default(),
            description: row.try_get("description").unwrap_or_default(),
            responsible: row.try_get("responsible").ok().flatten(),
            deadline: row.try_get("deadline").ok().flatten(),
            status: row
                .try_get("status")
                .unwrap_or_else(|_| "pending".to_string()),
            completed_at: row.try_get("completed_at").ok().flatten(),
            tenant_id: Uuid::parse_str(&row.try_get::<String, _>("tenant_id").unwrap_or_default())
                .unwrap_or_default(),
        },
        "处置行动更新成功",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/incidents/{id}/close",
    tag = "ehs",
    params(("id" = String, Path, description = "事故 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn close_accident(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<Accident> {
    tracing::info!("Closing accident: {}", id);

    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let row = sqlx::query(
        r#"UPDATE ehs.qa_ehs_accidents SET status='closed', updated_at=now()
           WHERE ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
             AND id = $1::uuid AND deleted_at IS NULL
           RETURNING id::text AS id, accident_no, title, description, accident_type, severity,
                     location, occurred_at AS occurred_at, casualties,
                     economic_loss::text AS economic_loss, status, reported_by,
                     created_at AS created_at, updated_at AS updated_at,
                     tenant_id::text AS tenant_id"#,
    )
    .bind(&id)
    .bind(&tenant_bind)
    .fetch_optional(&state.pool)
    .await;
    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("事故不存在"),
        Err(e) => {
            tracing::error!("Failed to close accident: {}", e);
            return ApiResponse::server_error("事故关闭失败");
        }
    };
    ApiResponse::success(accident_from_row(&row), "事故已关闭")
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:investigation:admin"])),
    path = "/api/ehs/incidents/{id}/investigation/complete",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
// gate: admin-only
pub async fn complete_investigation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<Investigation> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::info!("Completing investigation for accident: {}", id);
    let row = sqlx::query(
        r#"UPDATE ehs.qa_ehs_investigations
           SET status='completed', completed_at=now(), updated_at=now()
           WHERE ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $3)
             AND accident_id = $1::uuid AND deleted_at IS NULL
           RETURNING id::text AS id, accident_id::text AS accident_id, team, findings, root_cause,
                     timeline, status, started_at AS started_at, completed_at AS completed_at,
                     created_at AS created_at, updated_at AS updated_at, tenant_id::text AS tenant_id"#,
    )
    .bind(&id)
    .bind(&tenant_bind)
    .bind(&tenant_bind)
    .fetch_optional(&state.pool)
    .await;
    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("调查记录不存在"),
        Err(e) => {
            tracing::error!("Failed to complete investigation: {}", e);
            return ApiResponse::server_error("调查完成失败");
        }
    };
    ApiResponse::success(investigation_from_row(&row), "调查完成")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<Treatment> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::info!("Completing treatment for accident: {}", id);
    // UPDATE treatments 主行 + 其下 actions 全部置 completed
    let result = sqlx::query(
        r#"UPDATE ehs.qa_ehs_treatments SET status='completed', completed_at=now(), updated_at=now()
           WHERE ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
             AND accident_id = $1::uuid AND deleted_at IS NULL
           RETURNING id::text AS id, accident_id::text AS accident_id, responsible, status,
                     started_at AS started_at, completed_at AS completed_at,
                     created_at AS created_at, updated_at AS updated_at, tenant_id::text AS tenant_id"#,
    )
    .bind(&id)
    .bind(&tenant_bind)
    .fetch_optional(&state.pool)
    .await;
    let row = match result {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("处理方案不存在"),
        Err(e) => {
            tracing::error!("Failed to complete treatment: {}", e);
            return ApiResponse::server_error("处理完成失败");
        }
    };
    let _ = sqlx::query(
        "UPDATE ehs.qa_ehs_treatment_actions SET status='completed', completed_at=now() \
         WHERE treatment_id = (SELECT id FROM ehs.qa_ehs_treatments WHERE accident_id=$1::uuid AND deleted_at IS NULL LIMIT 1) \
           AND deleted_at IS NULL",
    )
    .bind(&id)
    .execute(&state.pool)
    .await;
    ApiResponse::success(
        Treatment {
            id: row.try_get("id").unwrap_or_default(),
            accident_id: row.try_get("accident_id").unwrap_or_default(),
            actions: Vec::new(),
            responsible: row.try_get("responsible").ok().flatten(),
            status: row
                .try_get("status")
                .unwrap_or_else(|_| "completed".to_string()),
            started_at: row.try_get("started_at").ok().flatten(),
            completed_at: row.try_get("completed_at").ok().flatten(),
            created_at: row.try_get("created_at").ok().flatten(),
            updated_at: row.try_get("updated_at").ok().flatten(),
            tenant_id: Uuid::parse_str(&row.try_get::<String, _>("tenant_id").unwrap_or_default())
                .unwrap_or_default(),
        },
        "处理完成",
    )
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateReviewRequest>,
) -> ApiResponse<Review> {
    let tenant_id = resolve_tenant_id(&claims);
    // 连接级租户上下文：复用请求级 RLS 事务，裸池写入在严格 RLS 策略下会被拒绝。
    let db = topems_shared_db::scope::Db::new(state.pool.clone(), "ehs, public, shared");
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    tracing::debug!("Creating review for accident {}: {:?}", id, req);
    let rev_id = uuid::Uuid::new_v4();
    let row = sqlx::query(
        r#"INSERT INTO ehs.qa_ehs_reviews (id, accident_id, summary, lessons_learned, recommendations, reviewer, reviewed_at, tenant_id)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, now(), $7)
           RETURNING id::text AS id, accident_id::text AS accident_id, summary,
                     lessons_learned, recommendations, reviewer,
                     reviewed_at AS reviewed_at, created_at AS created_at, tenant_id::text AS tenant_id"#,
    )
    .bind(rev_id)
    .bind(Uuid::parse_str(&id).unwrap_or_default())
    .bind(&req.summary)
    .bind(serde_json::to_string(&req.lessons_learned).unwrap_or_else(|_| "null".into()))
    .bind(serde_json::to_string(&req.recommendations).unwrap_or_else(|_| "null".into()))
    .bind(&req.reviewer)
    .bind(tenant_id);
    let row = match row.fetch_one(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create review: {}", e);
            return ApiResponse::server_error("复盘创建失败");
        }
    };
    ApiResponse::success(
        Review {
            id: row.try_get("id").unwrap_or_default(),
            accident_id: row.try_get("accident_id").unwrap_or_default(),
            summary: row.try_get("summary").ok().flatten(),
            lessons_learned: row
                .try_get::<Option<serde_json::Value>, _>("lessons_learned")
                .ok()
                .flatten()
                .and_then(|v| serde_json::from_value(v).ok()),
            recommendations: row
                .try_get::<Option<serde_json::Value>, _>("recommendations")
                .ok()
                .flatten()
                .and_then(|v| serde_json::from_value(v).ok()),
            reviewer: row.try_get("reviewer").ok().flatten(),
            reviewed_at: row.try_get("reviewed_at").ok().flatten(),
            created_at: row.try_get("created_at").ok().flatten(),
            tenant_id: Uuid::parse_str(&row.try_get::<String, _>("tenant_id").unwrap_or_default())
                .unwrap_or_default(),
        },
        "复盘完成",
    )
}

pub async fn list_incident_actions(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<Vec<serde_json::Value>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let rows = sqlx::query(
        r#"SELECT id::text AS id, title, status, created_at AS created_at
           FROM ehs.qa_ehs_incident_actions
           WHERE ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $3)
             AND accident_id = $1::uuid AND deleted_at IS NULL
           ORDER BY created_at DESC"#,
    )
    .bind(&id)
    .bind(&tenant_bind)
    .bind(&tenant_bind)
    .fetch_all(&state.pool)
    .await;
    match rows {
        Ok(r) => {
            let list: Vec<serde_json::Value> = r
                .iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.try_get::<String, _>("id").unwrap_or_default(),
                        "title": row.try_get::<String, _>("title").unwrap_or_default(),
                        "status": row.try_get::<String, _>("status").unwrap_or_default(),
                        "created_at": row.try_get::<DateTime<Utc>, _>("created_at").ok(),
                    })
                })
                .collect();
            ApiResponse::success(list, "获取事故行动列表成功")
        }
        Err(e) => {
            tracing::error!("Failed to list incident actions: {}", e);
            ApiResponse::server_error("获取事故行动列表失败")
        }
    }
}

pub async fn create_incident_action(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = resolve_tenant_id(&claims);
    // 连接级租户上下文：复用请求级 RLS 事务，裸池写入在严格 RLS 策略下会被拒绝。
    let db = topems_shared_db::scope::Db::new(state.pool.clone(), "ehs, public, shared");
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let act_id = uuid::Uuid::new_v4();
    let title = req
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("处置行动");
    if let Err(e) = sqlx::query(
        r#"INSERT INTO ehs.qa_ehs_incident_actions (id, accident_id, title, status, tenant_id)
           VALUES ($1, $2, $3, 'pending', $4)"#,
    )
    .bind(act_id)
    .bind(Uuid::parse_str(&id).unwrap_or_default())
    .bind(title)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        tracing::error!("Failed to insert incident action: {}", e);
        return ApiResponse::server_error("事故行动创建失败");
    }
    ApiResponse::success(
        serde_json::json!({
            "id": act_id.to_string(),
            "incident_id": id,
            "title": title,
            "status": "pending",
            "tenant_id": tenant_id.to_string(),
            "created_at": chrono::Utc::now(),
        }),
        "事故行动创建成功",
    )
}

pub async fn update_incident_action(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path((_id, action_id)): axum::extract::Path<(String, String)>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let status = req
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("in_progress");
    let r = sqlx::query(
        "UPDATE ehs.qa_ehs_incident_actions SET status=$1, updated_at=now() \
         WHERE ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2) \
           AND id = $3::uuid AND deleted_at IS NULL",
    )
    .bind(status)
    .bind(&tenant_bind)
    .bind(&action_id)
    .execute(&state.pool)
    .await;
    match r {
        Ok(_) => ApiResponse::success(
            serde_json::json!({
                "id": action_id,
                "status": status,
                "updated_at": chrono::Utc::now(),
            }),
            "事故行动更新成功",
        ),
        Err(e) => {
            tracing::error!("Failed to update incident action: {}", e);
            ApiResponse::server_error("事故行动更新失败")
        }
    }
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

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::TopemsError;
use uuid::Uuid;

use super::recruitment_status::{
    parse_optional, CandidateStatus, InterviewStatus, JobOpeningStatus,
};
use super::ApiState;

/// 响应兜底：把库里可能的未知历史值收敛到枚举词表
fn normalize_opening(mut v: JobOpening) -> JobOpening {
    v.status = JobOpeningStatus::normalize(&v.status).to_string();
    v
}
fn normalize_candidate(mut v: Candidate) -> Candidate {
    v.status = CandidateStatus::normalize(&v.status).to_string();
    v
}
fn normalize_interview(mut v: Interview) -> Interview {
    v.status = InterviewStatus::normalize(&v.status).to_string();
    v
}
use crate::modules::audit::log_audit_event;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobOpening {
    pub id: Uuid,
    pub title: String,
    pub code: Option<String>,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub employment_type: Option<String>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub salary_min: Option<BigDecimal>,
    pub salary_max: Option<BigDecimal>,
    pub status: String,
    pub publish_date: Option<chrono::DateTime<chrono::Utc>>,
    pub close_date: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Candidate {
    pub id: Uuid,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position_id: Option<Uuid>,
    pub job_opening_id: Option<Uuid>,
    pub resume_path: Option<String>,
    pub source: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Interview {
    pub id: Uuid,
    pub candidate_id: Uuid,
    pub interviewer_id: Option<Uuid>,
    pub round: i32,
    pub scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
    pub actual_at: Option<chrono::DateTime<chrono::Utc>>,
    pub duration_minutes: i32,
    pub status: String,
    pub result: Option<String>,
    pub notes: Option<String>,
    pub score: Option<BigDecimal>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateJobOpeningRequest {
    pub title: String,
    pub code: Option<String>,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub employment_type: Option<String>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub salary_min: Option<BigDecimal>,
    pub salary_max: Option<BigDecimal>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateJobOpeningRequest {
    pub title: Option<String>,
    pub code: Option<String>,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub employment_type: Option<String>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub salary_min: Option<BigDecimal>,
    pub salary_max: Option<BigDecimal>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateCandidateRequest {
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position_id: Option<Uuid>,
    pub job_opening_id: Option<Uuid>,
    pub resume_path: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateCandidateRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position_id: Option<Uuid>,
    pub job_opening_id: Option<Uuid>,
    pub resume_path: Option<String>,
    pub source: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateInterviewRequest {
    pub candidate_id: Uuid,
    pub interviewer_id: Option<Uuid>,
    pub round: Option<i32>,
    pub scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
    pub duration_minutes: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateInterviewRequest {
    pub interviewer_id: Option<Uuid>,
    pub round: Option<i32>,
    pub scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
    pub actual_at: Option<chrono::DateTime<chrono::Utc>>,
    pub duration_minutes: Option<i32>,
    pub status: Option<String>,
    pub result: Option<String>,
    pub notes: Option<String>,
    pub score: Option<BigDecimal>,
}

#[derive(Debug, Clone, Deserialize, utoipa::ToSchema)]
pub struct JobOpeningQueryParams {
    pub page: Option<i64>,
    #[serde(alias = "page_size")]
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub department_id: Option<Uuid>,
    pub status: Option<String>,
    pub employment_type: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/job-openings",
            get(list_job_openings).post(create_job_opening),
        )
        .route(
            "/job-openings/{id}",
            get(get_job_opening)
                .put(update_job_opening)
                .delete(delete_job_opening),
        )
        .route("/job-openings/{id}/publish", put(publish_job_opening))
        .route("/job-openings/{id}/close", put(close_job_opening))
        .route("/candidates", get(list_candidates).post(create_candidate))
        .route(
            "/candidates/{id}",
            get(get_candidate)
                .put(update_candidate)
                .delete(delete_candidate),
        )
        .route("/interviews", get(list_interviews).post(create_interview))
        .route(
            "/interviews/{id}",
            get(get_interview)
                .put(update_interview)
                .delete(delete_interview),
        )
        .route("/interviews/{id}/complete", put(complete_interview))
}

#[utoipa::path(
    get,
    path = "/job-openings",
    tag = "recruitment",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页大小"),
        ("search" = Option<String>, Query, description = "搜索关键字"),
        ("department_id" = Option<Uuid>, Query, description = "部门ID"),
        ("status" = Option<String>, Query, description = "状态"),
        ("employment_type" = Option<String>, Query, description = "用工类型")
    ),
    responses(
        (status = 200, description = "获取招聘职位列表成功", body = serde_json::Value),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn list_job_openings(
    State(_state): State<ApiState>,
    Query(params): Query<JobOpeningQueryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let parsed_status_filter: Option<String> =
        match JobOpeningStatus::parse_filter(params.status.as_deref()) {
            Ok(v) => v.map(|x| x.as_db_str().to_string()),
            Err(_) => return ApiResponse::bad_request("非法的招聘职位状态筛选值"),
        };
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let search = params.search.unwrap_or_default();
    let dept_id = params.department_id;
    let status_filter = parsed_status_filter;
    let employment_type_filter = params.employment_type;

    let result = sqlx::query_as::<_, JobOpening>(
        only_own_schema_query!("hrm", r#"
        SELECT id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, publish_date, close_date, created_at, updated_at
        FROM hrm.job_openings
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR $1 = '' OR title ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
          AND ($2::uuid IS NULL OR department_id = $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR employment_type = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#),
    )
    .bind(&search)
    .bind(dept_id)
    .bind(&status_filter)
    .bind(&employment_type_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("hrm", r#"
                SELECT COUNT(*) FROM hrm.job_openings
                WHERE deleted_at IS NULL
                  AND ($1::text IS NULL OR $1 = '' OR title ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
                  AND ($2::uuid IS NULL OR department_id = $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::text IS NULL OR employment_type = $4)
                "#),
            )
            .bind(&search)
            .bind(dept_id)
            .bind(&status_filter)
            .bind(&employment_type_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": items.into_iter().map(normalize_opening).collect::<Vec<_>>(),
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            )
        }
        Err(e) => {
            tracing::error!("查询职位列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("查询职位列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:recruitment:write"])),
    path = "/job-openings",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn create_job_opening(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateJobOpeningRequest>,
) -> ApiResponse<JobOpening> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.title.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "职位标题不能为空".to_string(),
        ));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    let result = sqlx::query_as::<_, JobOpening>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.job_openings (id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $15, $12, $13, $14)
        RETURNING id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, publish_date, close_date, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(&req.title)
    .bind(&req.code)
    .bind(req.department_id)
    .bind(req.position_id)
    .bind(&req.employment_type)
    .bind(&req.location)
    .bind(&req.description)
    .bind(&req.requirements)
    .bind(&req.salary_min)
    .bind(&req.salary_max)
    .bind(now)
    .bind(now)
    .bind(claims_tenant)
    .bind(JobOpeningStatus::DEFAULT.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(opening) => (
            ApiResponse::success(normalize_opening(opening.clone()), "职位创建成功"),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建职位失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("创建职位失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(opening) = &result {
        serde_json::to_value(opening).ok()
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
        "create".to_string(),
        "job_opening".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/job-openings/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn get_job_opening(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<JobOpening> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, JobOpening>(
        only_own_schema_query!("hrm", "SELECT id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, publish_date, close_date, created_at, updated_at FROM hrm.job_openings WHERE deleted_at IS NULL AND id = $1")
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(opening)) => ApiResponse::success(normalize_opening(opening), "查询成功"),
        Ok(None) => ApiResponse::<JobOpening>::not_found("职位不存在"),
        Err(e) => {
            tracing::error!("查询职位失败: {}", e);
            ApiResponse::<JobOpening>::server_error("查询职位失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:recruitment:write"])),
    path = "/job-openings/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn update_job_opening(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateJobOpeningRequest>,
) -> ApiResponse<JobOpening> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, JobOpening>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.job_openings
        SET
            title = COALESCE($1, title),
            code = COALESCE($2, code),
            department_id = COALESCE($3, department_id),
            position_id = COALESCE($4, position_id),
            employment_type = COALESCE($5, employment_type),
            location = COALESCE($6, location),
            description = COALESCE($7, description),
            requirements = COALESCE($8, requirements),
            salary_min = COALESCE($9, salary_min),
            salary_max = COALESCE($10, salary_max),
            updated_at = $11
        WHERE deleted_at IS NULL AND id = $12
        RETURNING id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, publish_date, close_date, created_at, updated_at
        "#)
    )
    .bind(&req.title)
    .bind(&req.code)
    .bind(req.department_id)
    .bind(req.position_id)
    .bind(&req.employment_type)
    .bind(&req.location)
    .bind(&req.description)
    .bind(&req.requirements)
    .bind(&req.salary_min)
    .bind(&req.salary_max)
    .bind(now)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(opening)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_opening(opening), "职位更新成功")
        }
        Ok(None) => ApiResponse::<JobOpening>::not_found("职位不存在"),
        Err(e) => {
            tracing::error!("更新职位失败: {}", e);
            ApiResponse::<JobOpening>::server_error("更新职位失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["hrm:recruitment:write"])),
    path = "/job-openings/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn delete_job_opening(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(
        only_own_schema_query!("hrm", "UPDATE hrm.job_openings SET deleted_at = NOW() WHERE deleted_at IS NULL AND id = $1 AND status = $2"),
    )
    .bind(id)
    .bind(JobOpeningStatus::Draft.as_db_str())
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            ApiResponse::success(id.to_string(), "职位已删除"),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound(
                "职位不存在或已发布".to_string(),
            )),
            "error".to_string(),
            Some("职位不存在或已发布".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除职位失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("删除职位失败".to_string())),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
        "delete".to_string(),
        "job_opening".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    put,
    security(("bearerAuth" = [])),
    path = "/job-openings/{id}/publish",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn publish_job_opening(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<JobOpening> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, JobOpening>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.job_openings
        SET status = $3, publish_date = $2, updated_at = $2
        WHERE deleted_at IS NULL AND id = $1 AND status = $4
        RETURNING id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, publish_date, close_date, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(now)
    .bind(JobOpeningStatus::Published.as_db_str())
    .bind(JobOpeningStatus::Draft.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(opening)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_opening(opening), "职位已发布")
        }
        Ok(None) => ApiResponse::<JobOpening>::not_found("职位不存在或状态不正确"),
        Err(e) => {
            tracing::error!("发布职位失败: {}", e);
            ApiResponse::<JobOpening>::server_error("发布职位失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("bearerAuth" = [])),
    path = "/job-openings/{id}/close",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn close_job_opening(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<JobOpening> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, JobOpening>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.job_openings
        SET status = $3, close_date = $2, updated_at = $2
        WHERE deleted_at IS NULL AND id = $1 AND status = $4
        RETURNING id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, publish_date, close_date, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(now)
    .bind(JobOpeningStatus::Closed.as_db_str())
    .bind(JobOpeningStatus::Published.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(opening)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_opening(opening), "职位已关闭")
        }
        Ok(None) => ApiResponse::<JobOpening>::not_found("职位不存在或状态不正确"),
        Err(e) => {
            tracing::error!("关闭职位失败: {}", e);
            ApiResponse::<JobOpening>::server_error("关闭职位失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/candidates",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn list_candidates(
    State(_state): State<ApiState>,
    Query(params): Query<JobOpeningQueryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let parsed_status_filter: Option<String> =
        match CandidateStatus::parse_filter(params.status.as_deref()) {
            Ok(v) => v.map(|x| x.as_db_str().to_string()),
            Err(_) => return ApiResponse::bad_request("非法的候选人状态筛选值"),
        };
    let search = params.search.unwrap_or_default();
    let job_opening_id = params.department_id;
    let status_filter = parsed_status_filter;

    let result = sqlx::query_as::<_, Candidate>(
        only_own_schema_query!("hrm", r#"
        SELECT id, name, email, phone, position_id, job_opening_id, resume_path, source, status, created_at, updated_at
        FROM hrm.candidates
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
          AND ($2::uuid IS NULL OR job_opening_id = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#),
    )
    .bind(&search)
    .bind(job_opening_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("hrm", r#"
                SELECT COUNT(*) FROM hrm.candidates
                WHERE deleted_at IS NULL
                  AND ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
                  AND ($2::uuid IS NULL OR job_opening_id = $2)
                  AND ($3::text IS NULL OR status = $3)
                "#),
            )
            .bind(&search)
            .bind(job_opening_id)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": items.into_iter().map(normalize_candidate).collect::<Vec<_>>(),
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            )
        }
        Err(e) => {
            tracing::error!("查询候选人列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("查询候选人列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:recruitment:write"])),
    path = "/candidates",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn create_candidate(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateCandidateRequest>,
) -> ApiResponse<Candidate> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.name.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "候选人姓名不能为空".to_string(),
        ));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    let result = sqlx::query_as::<_, Candidate>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.candidates (id, name, email, phone, position_id, job_opening_id, resume_path, source, status, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $12, $9, $10, $11)
        RETURNING id, name, email, phone, position_id, job_opening_id, resume_path, source, status, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(req.position_id)
    .bind(req.job_opening_id)
    .bind(&req.resume_path)
    .bind(&req.source)
    .bind(now)
    .bind(now)
    .bind(claims_tenant)
    .bind(CandidateStatus::DEFAULT.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(candidate) => (
            ApiResponse::success(normalize_candidate(candidate.clone()), "候选人添加成功"),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("添加候选人失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("添加候选人失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(candidate) = &result {
        serde_json::to_value(candidate).ok()
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
        "create".to_string(),
        "candidate".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/candidates/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn get_candidate(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Candidate> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, Candidate>(
        only_own_schema_query!("hrm", "SELECT id, name, email, phone, position_id, job_opening_id, resume_path, source, status, created_at, updated_at FROM hrm.candidates WHERE deleted_at IS NULL AND id = $1")
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(candidate)) => ApiResponse::success(normalize_candidate(candidate), "查询成功"),
        Ok(None) => ApiResponse::<Candidate>::not_found("候选人不存在"),
        Err(e) => {
            tracing::error!("查询候选人失败: {}", e);
            ApiResponse::<Candidate>::server_error("查询候选人失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:recruitment:write"])),
    path = "/candidates/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn update_candidate(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateCandidateRequest>,
) -> ApiResponse<Candidate> {
    let status = match parse_optional(
        CandidateStatus::from_db_str,
        CandidateStatus::as_db_str,
        req.status.as_deref(),
    ) {
        Ok(v) => v,
        Err(_) => return ApiResponse::bad_request("非法的候选人状态"),
    };
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, Candidate>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.candidates
        SET
            name = COALESCE($1, name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            position_id = COALESCE($4, position_id),
            job_opening_id = COALESCE($5, job_opening_id),
            resume_path = COALESCE($6, resume_path),
            source = COALESCE($7, source),
            status = COALESCE($8, status),
            updated_at = $9
        WHERE deleted_at IS NULL AND id = $10
        RETURNING id, name, email, phone, position_id, job_opening_id, resume_path, source, status, created_at, updated_at
        "#)
    )
    .bind(&req.name)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(req.position_id)
    .bind(req.job_opening_id)
    .bind(&req.resume_path)
    .bind(&req.source)
    .bind(status)
    .bind(now)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(candidate)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_candidate(candidate), "候选人信息更新成功")
        }
        Ok(None) => ApiResponse::<Candidate>::not_found("候选人不存在"),
        Err(e) => {
            tracing::error!("更新候选人失败: {}", e);
            ApiResponse::<Candidate>::server_error("更新候选人失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["hrm:recruitment:write"])),
    path = "/candidates/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn delete_candidate(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.candidates SET deleted_at = NOW() WHERE deleted_at IS NULL AND id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            ApiResponse::success(id.to_string(), "候选人已删除"),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound("候选人不存在".to_string())),
            "error".to_string(),
            Some("候选人不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除候选人失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("删除候选人失败".to_string())),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
        "delete".to_string(),
        "candidate".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/interviews",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn list_interviews(
    State(_state): State<ApiState>,
    Query(params): Query<JobOpeningQueryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let parsed_status_filter: Option<String> =
        match InterviewStatus::parse_filter(params.status.as_deref()) {
            Ok(v) => v.map(|x| x.as_db_str().to_string()),
            Err(_) => return ApiResponse::bad_request("非法的面试状态筛选值"),
        };
    let candidate_id = params.department_id;
    let status_filter = parsed_status_filter;

    let result = sqlx::query_as::<_, Interview>(
        only_own_schema_query!("hrm", r#"
        SELECT id, candidate_id, interviewer_id, round, scheduled_at, actual_at, duration_minutes, status, result, notes, score, created_at, updated_at
        FROM hrm.interviews
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR candidate_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY scheduled_at DESC
        LIMIT $3 OFFSET $4
        "#),
    )
    .bind(candidate_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.interviews
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR candidate_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#
            ))
            .bind(candidate_id)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": items.into_iter().map(normalize_interview).collect::<Vec<_>>(),
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            )
        }
        Err(e) => {
            tracing::error!("查询面试列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("查询面试列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:recruitment:write"])),
    path = "/interviews",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn create_interview(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateInterviewRequest>,
) -> ApiResponse<Interview> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let now = Utc::now();
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);
    let round = req.round.unwrap_or(1);
    let duration = req.duration_minutes.unwrap_or(30);

    let result = sqlx::query_as::<_, Interview>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.interviews (id, candidate_id, interviewer_id, round, scheduled_at, duration_minutes, status, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $10, $7, $8, $9)
        RETURNING id, candidate_id, interviewer_id, round, scheduled_at, actual_at, duration_minutes, status, result, notes, score, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(req.candidate_id)
    .bind(req.interviewer_id)
    .bind(round)
    .bind(req.scheduled_at)
    .bind(duration)
    .bind(now)
    .bind(now)
    .bind(claims_tenant)
    .bind(InterviewStatus::DEFAULT.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(interview) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(normalize_interview(interview), "面试安排成功")
        }
        Err(e) => {
            tracing::error!("安排面试失败: {}", e);
            ApiResponse::<Interview>::server_error("安排面试失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/interviews/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn get_interview(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Interview> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, Interview>(
        only_own_schema_query!("hrm", "SELECT id, candidate_id, interviewer_id, round, scheduled_at, actual_at, duration_minutes, status, result, notes, score, created_at, updated_at FROM hrm.interviews WHERE deleted_at IS NULL AND id = $1")
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(interview)) => ApiResponse::success(normalize_interview(interview), "查询成功"),
        Ok(None) => ApiResponse::<Interview>::not_found("面试不存在"),
        Err(e) => {
            tracing::error!("查询面试失败: {}", e);
            ApiResponse::<Interview>::server_error("查询面试失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:recruitment:write"])),
    path = "/interviews/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn update_interview(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateInterviewRequest>,
) -> ApiResponse<Interview> {
    let status = match parse_optional(
        InterviewStatus::from_db_str,
        InterviewStatus::as_db_str,
        req.status.as_deref(),
    ) {
        Ok(v) => v,
        Err(_) => return ApiResponse::bad_request("非法的面试状态"),
    };
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, Interview>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.interviews
        SET
            interviewer_id = COALESCE($1, interviewer_id),
            round = COALESCE($2, round),
            scheduled_at = COALESCE($3, scheduled_at),
            actual_at = COALESCE($4, actual_at),
            duration_minutes = COALESCE($5, duration_minutes),
            status = COALESCE($6, status),
            result = COALESCE($7, result),
            notes = COALESCE($8, notes),
            score = COALESCE($9, score),
            updated_at = $10
        WHERE deleted_at IS NULL AND id = $11
        RETURNING id, candidate_id, interviewer_id, round, scheduled_at, actual_at, duration_minutes, status, result, notes, score, created_at, updated_at
        "#)
    )
    .bind(req.interviewer_id)
    .bind(req.round)
    .bind(req.scheduled_at)
    .bind(req.actual_at)
    .bind(req.duration_minutes)
    .bind(status)
    .bind(&req.result)
    .bind(&req.notes)
    .bind(&req.score)
    .bind(now)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(interview)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_interview(interview), "面试信息更新成功")
        }
        Ok(None) => ApiResponse::<Interview>::not_found("面试不存在"),
        Err(e) => {
            tracing::error!("更新面试失败: {}", e);
            ApiResponse::<Interview>::server_error("更新面试失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["hrm:recruitment:write"])),
    path = "/interviews/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn delete_interview(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.interviews SET deleted_at = NOW() WHERE deleted_at IS NULL AND id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(_) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(id.to_string(), "面试已取消")
        }
        Err(e) => {
            tracing::error!("取消面试失败: {}", e);
            ApiResponse::<String>::server_error("取消面试失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("bearerAuth" = [])),
    path = "/interviews/{id}/complete",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "recruitment"
)]
pub async fn complete_interview(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateInterviewRequest>,
) -> ApiResponse<Interview> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, Interview>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.interviews
        SET
            actual_at = COALESCE($1, NOW()),
            status = $7,
            result = COALESCE($2, result),
            notes = COALESCE($3, notes),
            score = COALESCE($4, score),
            updated_at = $5
        WHERE deleted_at IS NULL AND id = $6 AND status = $8
        RETURNING id, candidate_id, interviewer_id, round, scheduled_at, actual_at, duration_minutes, status, result, notes, score, created_at, updated_at
        "#)
    )
    .bind(req.actual_at)
    .bind(&req.result)
    .bind(&req.notes)
    .bind(&req.score)
    .bind(now)
    .bind(id)
    .bind(InterviewStatus::Completed.as_db_str())
    .bind(InterviewStatus::Scheduled.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(interview)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_interview(interview), "面试已完成")
        }
        Ok(None) => ApiResponse::<Interview>::not_found("面试不存在或状态不正确"),
        Err(e) => {
            tracing::error!("完成面试失败: {}", e);
            ApiResponse::<Interview>::server_error("完成面试失败")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bigdecimal::BigDecimal;
    use chrono::{DateTime, Utc};

    fn roundtrip<T: serde::Serialize + for<'de> serde::Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    fn dec(n: i64) -> BigDecimal {
        BigDecimal::from(n)
    }

    fn dt() -> DateTime<Utc> {
        Utc::now()
    }

    #[test]
    fn roundtrip_job_opening() {
        roundtrip(&JobOpening {
            id: Uuid::new_v4(),
            title: "后端工程师".to_string(),
            code: Some("HR-001".to_string()),
            department_id: None,
            position_id: None,
            employment_type: Some("全职".to_string()),
            location: Some("北京".to_string()),
            description: None,
            requirements: None,
            salary_min: Some(dec(20000)),
            salary_max: Some(dec(40000)),
            status: "open".to_string(),
            publish_date: Some(dt()),
            close_date: None,
            created_at: dt(),
            updated_at: dt(),
        });
    }

    #[test]
    fn roundtrip_candidate() {
        roundtrip(&Candidate {
            id: Uuid::new_v4(),
            name: "张三".to_string(),
            email: Some("z@x.com".to_string()),
            phone: None,
            position_id: None,
            job_opening_id: None,
            resume_path: None,
            source: Some("LinkedIn".to_string()),
            status: "applied".to_string(),
            created_at: dt(),
            updated_at: dt(),
        });
    }

    #[test]
    fn roundtrip_interview() {
        roundtrip(&Interview {
            id: Uuid::new_v4(),
            candidate_id: Uuid::new_v4(),
            interviewer_id: None,
            round: 1,
            scheduled_at: Some(dt()),
            actual_at: None,
            duration_minutes: 60,
            status: "scheduled".to_string(),
            result: None,
            notes: None,
            score: None,
            created_at: dt(),
            updated_at: dt(),
        });
    }

    #[test]
    fn roundtrip_create_job_opening_request() {
        roundtrip(&CreateJobOpeningRequest {
            title: "前端工程师".to_string(),
            code: None,
            department_id: None,
            position_id: None,
            employment_type: None,
            location: None,
            description: None,
            requirements: None,
            salary_min: None,
            salary_max: None,
        });
    }

    #[test]
    fn roundtrip_update_job_opening_request() {
        roundtrip(&UpdateJobOpeningRequest {
            title: None,
            code: Some("HR-002".to_string()),
            department_id: None,
            position_id: None,
            employment_type: None,
            location: None,
            description: None,
            requirements: None,
            salary_min: None,
            salary_max: None,
        });
    }

    #[test]
    fn roundtrip_create_candidate_request() {
        roundtrip(&CreateCandidateRequest {
            name: "李四".to_string(),
            email: Some("l@x.com".to_string()),
            phone: None,
            position_id: None,
            job_opening_id: None,
            resume_path: None,
            source: None,
        });
    }

    #[test]
    fn roundtrip_update_candidate_request() {
        roundtrip(&UpdateCandidateRequest {
            name: None,
            email: None,
            phone: None,
            position_id: None,
            job_opening_id: None,
            resume_path: None,
            source: None,
            status: Some("interview".to_string()),
        });
    }

    #[test]
    fn roundtrip_create_interview_request() {
        roundtrip(&CreateInterviewRequest {
            candidate_id: Uuid::new_v4(),
            interviewer_id: None,
            round: Some(1),
            scheduled_at: Some(dt()),
            duration_minutes: Some(60),
        });
    }

    #[test]
    fn roundtrip_update_interview_request() {
        roundtrip(&UpdateInterviewRequest {
            interviewer_id: Some(Uuid::new_v4()),
            round: None,
            scheduled_at: None,
            actual_at: None,
            duration_minutes: None,
            status: Some("completed".to_string()),
            result: Some("passed".to_string()),
            notes: Some("表现良好".to_string()),
            score: Some(dec(85)),
        });
    }
}

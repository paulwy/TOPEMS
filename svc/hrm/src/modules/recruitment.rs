use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use crate::modules::audit::log_audit_event;
use topems_shared_core::response::{api_error, ApiResponse};

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

#[derive(Debug, Clone, Deserialize)]
pub struct JobOpeningQueryParams {
    pub page: Option<i64>,
    #[serde(alias = "pagesize")]
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

async fn list_job_openings(
    State(state): State<ApiState>,
    Query(params): Query<JobOpeningQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let search = params.search.unwrap_or_default();
    let dept_id = params.department_id;
    let status_filter = params.status;
    let employment_type_filter = params.employment_type;

    let result = sqlx::query_as::<_, JobOpening>(
        r#"
        SELECT id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, publish_date, close_date, created_at, updated_at
        FROM hrm.job_openings
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR $1 = '' OR title ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
          AND ($2::uuid IS NULL OR department_id = $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR employment_type = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&search)
    .bind(dept_id)
    .bind(&status_filter)
    .bind(&employment_type_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM hrm.job_openings
                WHERE deleted_at IS NULL
                  AND ($1::text IS NULL OR $1 = '' OR title ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
                  AND ($2::uuid IS NULL OR department_id = $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::text IS NULL OR employment_type = $4)
                "#,
            )
            .bind(&search)
            .bind(dept_id)
            .bind(&status_filter)
            .bind(&employment_type_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询职位列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询职位列表失败",
            ))
        }
    }
}

async fn create_job_opening(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateJobOpeningRequest>,
) -> Json<ApiResponse<JobOpening>> {
    if req.title.is_empty() {
        return Json(api_error(400, "职位标题不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, JobOpening>(
        r#"
        INSERT INTO hrm.job_openings (id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', $12, $13)
        RETURNING id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, publish_date, close_date, created_at, updated_at
        "#
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
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(opening) => (
            Json(ApiResponse::success(opening.clone(), "职位创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建职位失败: {}", e);
            (
                Json(api_error(500, "创建职位失败")),
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
        &state.db,
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

    response
}

async fn get_job_opening(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<JobOpening>> {
    let result = sqlx::query_as::<_, JobOpening>(
        "SELECT id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, publish_date, close_date, created_at, updated_at FROM hrm.job_openings WHERE deleted_at IS NULL AND id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(opening)) => Json(ApiResponse::success(opening, "查询成功")),
        Ok(None) => Json(ApiResponse::<JobOpening>::error(404, "职位不存在")),
        Err(e) => {
            tracing::error!("查询职位失败: {}", e);
            Json(ApiResponse::<JobOpening>::error(500, "查询职位失败"))
        }
    }
}

async fn update_job_opening(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateJobOpeningRequest>,
) -> Json<ApiResponse<JobOpening>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, JobOpening>(
        r#"
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
        "#
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
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(opening)) => Json(ApiResponse::success(opening, "职位更新成功")),
        Ok(None) => Json(ApiResponse::<JobOpening>::error(404, "职位不存在")),
        Err(e) => {
            tracing::error!("更新职位失败: {}", e);
            Json(ApiResponse::<JobOpening>::error(500, "更新职位失败"))
        }
    }
}

async fn delete_job_opening(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(
        "UPDATE hrm.job_openings SET deleted_at = NOW() WHERE deleted_at IS NULL AND id = $1 AND status = 'draft'",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success(id.to_string(), "职位已删除")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "职位不存在或已发布")),
            "error".to_string(),
            Some("职位不存在或已发布".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除职位失败: {}", e);
            (
                Json(api_error(500, "删除职位失败")),
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
        &state.db,
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

    response
}

async fn publish_job_opening(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<JobOpening>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, JobOpening>(
        r#"
        UPDATE hrm.job_openings
        SET status = 'published', publish_date = $2, updated_at = $2
        WHERE deleted_at IS NULL AND id = $1 AND status = 'draft'
        RETURNING id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, publish_date, close_date, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(opening)) => Json(ApiResponse::success(opening, "职位已发布")),
        Ok(None) => Json(ApiResponse::<JobOpening>::error(
            404,
            "职位不存在或状态不正确",
        )),
        Err(e) => {
            tracing::error!("发布职位失败: {}", e);
            Json(ApiResponse::<JobOpening>::error(500, "发布职位失败"))
        }
    }
}

async fn close_job_opening(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<JobOpening>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, JobOpening>(
        r#"
        UPDATE hrm.job_openings
        SET status = 'closed', close_date = $2, updated_at = $2
        WHERE deleted_at IS NULL AND id = $1 AND status = 'published'
        RETURNING id, title, code, department_id, position_id, employment_type, location, description, requirements, salary_min, salary_max, status, publish_date, close_date, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(opening)) => Json(ApiResponse::success(opening, "职位已关闭")),
        Ok(None) => Json(ApiResponse::<JobOpening>::error(
            404,
            "职位不存在或状态不正确",
        )),
        Err(e) => {
            tracing::error!("关闭职位失败: {}", e);
            Json(ApiResponse::<JobOpening>::error(500, "关闭职位失败"))
        }
    }
}

async fn list_candidates(
    State(state): State<ApiState>,
    Query(params): Query<JobOpeningQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let search = params.search.unwrap_or_default();
    let job_opening_id = params.department_id;
    let status_filter = params.status;

    let result = sqlx::query_as::<_, Candidate>(
        r#"
        SELECT id, name, email, phone, position_id, job_opening_id, resume_path, source, status, created_at, updated_at
        FROM hrm.candidates
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
          AND ($2::uuid IS NULL OR job_opening_id = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search)
    .bind(job_opening_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM hrm.candidates
                WHERE deleted_at IS NULL
                  AND ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
                  AND ($2::uuid IS NULL OR job_opening_id = $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(&search)
            .bind(job_opening_id)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询候选人列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询候选人列表失败",
            ))
        }
    }
}

async fn create_candidate(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateCandidateRequest>,
) -> Json<ApiResponse<Candidate>> {
    if req.name.is_empty() {
        return Json(api_error(400, "候选人姓名不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Candidate>(
        r#"
        INSERT INTO hrm.candidates (id, name, email, phone, position_id, job_opening_id, resume_path, source, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new', $9, $10)
        RETURNING id, name, email, phone, position_id, job_opening_id, resume_path, source, status, created_at, updated_at
        "#
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
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(candidate) => (
            Json(ApiResponse::success(candidate.clone(), "候选人添加成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("添加候选人失败: {}", e);
            (
                Json(api_error(500, "添加候选人失败")),
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
        &state.db,
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

    response
}

async fn get_candidate(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Candidate>> {
    let result = sqlx::query_as::<_, Candidate>(
        "SELECT id, name, email, phone, position_id, job_opening_id, resume_path, source, status, created_at, updated_at FROM hrm.candidates WHERE deleted_at IS NULL AND id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(candidate)) => Json(ApiResponse::success(candidate, "查询成功")),
        Ok(None) => Json(ApiResponse::<Candidate>::error(404, "候选人不存在")),
        Err(e) => {
            tracing::error!("查询候选人失败: {}", e);
            Json(ApiResponse::<Candidate>::error(500, "查询候选人失败"))
        }
    }
}

async fn update_candidate(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCandidateRequest>,
) -> Json<ApiResponse<Candidate>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Candidate>(
        r#"
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
        "#
    )
    .bind(&req.name)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(req.position_id)
    .bind(req.job_opening_id)
    .bind(&req.resume_path)
    .bind(&req.source)
    .bind(&req.status)
    .bind(now)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(candidate)) => Json(ApiResponse::success(candidate, "候选人信息更新成功")),
        Ok(None) => Json(ApiResponse::<Candidate>::error(404, "候选人不存在")),
        Err(e) => {
            tracing::error!("更新候选人失败: {}", e);
            Json(ApiResponse::<Candidate>::error(500, "更新候选人失败"))
        }
    }
}

async fn delete_candidate(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(
        "UPDATE hrm.candidates SET deleted_at = NOW() WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success(id.to_string(), "候选人已删除")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "候选人不存在")),
            "error".to_string(),
            Some("候选人不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除候选人失败: {}", e);
            (
                Json(api_error(500, "删除候选人失败")),
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
        &state.db,
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

    response
}

async fn list_interviews(
    State(state): State<ApiState>,
    Query(params): Query<JobOpeningQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let candidate_id = params.department_id;
    let status_filter = params.status;

    let result = sqlx::query_as::<_, Interview>(
        r#"
        SELECT id, candidate_id, interviewer_id, round, scheduled_at, actual_at, duration_minutes, status, result, notes, score, created_at, updated_at
        FROM hrm.interviews
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR candidate_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY scheduled_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(candidate_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM hrm.interviews
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR candidate_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(candidate_id)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询面试列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询面试列表失败",
            ))
        }
    }
}

async fn create_interview(
    State(state): State<ApiState>,
    Json(req): Json<CreateInterviewRequest>,
) -> Json<ApiResponse<Interview>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let round = req.round.unwrap_or(1);
    let duration = req.duration_minutes.unwrap_or(30);

    let result = sqlx::query_as::<_, Interview>(
        r#"
        INSERT INTO hrm.interviews (id, candidate_id, interviewer_id, round, scheduled_at, duration_minutes, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, $8)
        RETURNING id, candidate_id, interviewer_id, round, scheduled_at, actual_at, duration_minutes, status, result, notes, score, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(req.candidate_id)
    .bind(req.interviewer_id)
    .bind(round)
    .bind(req.scheduled_at)
    .bind(duration)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(interview) => Json(ApiResponse::success(interview, "面试安排成功")),
        Err(e) => {
            tracing::error!("安排面试失败: {}", e);
            Json(ApiResponse::<Interview>::error(500, "安排面试失败"))
        }
    }
}

async fn get_interview(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Interview>> {
    let result = sqlx::query_as::<_, Interview>(
        "SELECT id, candidate_id, interviewer_id, round, scheduled_at, actual_at, duration_minutes, status, result, notes, score, created_at, updated_at FROM hrm.interviews WHERE deleted_at IS NULL AND id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(interview)) => Json(ApiResponse::success(interview, "查询成功")),
        Ok(None) => Json(ApiResponse::<Interview>::error(404, "面试不存在")),
        Err(e) => {
            tracing::error!("查询面试失败: {}", e);
            Json(ApiResponse::<Interview>::error(500, "查询面试失败"))
        }
    }
}

async fn update_interview(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInterviewRequest>,
) -> Json<ApiResponse<Interview>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Interview>(
        r#"
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
        "#
    )
    .bind(req.interviewer_id)
    .bind(req.round)
    .bind(req.scheduled_at)
    .bind(req.actual_at)
    .bind(req.duration_minutes)
    .bind(&req.status)
    .bind(&req.result)
    .bind(&req.notes)
    .bind(&req.score)
    .bind(now)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(interview)) => Json(ApiResponse::success(interview, "面试信息更新成功")),
        Ok(None) => Json(ApiResponse::<Interview>::error(404, "面试不存在")),
        Err(e) => {
            tracing::error!("更新面试失败: {}", e);
            Json(ApiResponse::<Interview>::error(500, "更新面试失败"))
        }
    }
}

async fn delete_interview(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(
        "UPDATE hrm.interviews SET deleted_at = NOW() WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id.to_string(), "面试已取消")),
        Err(e) => {
            tracing::error!("取消面试失败: {}", e);
            Json(ApiResponse::<String>::error(500, "取消面试失败"))
        }
    }
}

async fn complete_interview(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInterviewRequest>,
) -> Json<ApiResponse<Interview>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Interview>(
        r#"
        UPDATE hrm.interviews
        SET
            actual_at = COALESCE($1, NOW()),
            status = 'completed',
            result = COALESCE($2, result),
            notes = COALESCE($3, notes),
            score = COALESCE($4, score),
            updated_at = $5
        WHERE deleted_at IS NULL AND id = $6 AND status = 'scheduled'
        RETURNING id, candidate_id, interviewer_id, round, scheduled_at, actual_at, duration_minutes, status, result, notes, score, created_at, updated_at
        "#
    )
    .bind(req.actual_at)
    .bind(&req.result)
    .bind(&req.notes)
    .bind(&req.score)
    .bind(now)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(interview)) => Json(ApiResponse::success(interview, "面试已完成")),
        Ok(None) => Json(ApiResponse::<Interview>::error(
            404,
            "面试不存在或状态不正确",
        )),
        Err(e) => {
            tracing::error!("完成面试失败: {}", e);
            Json(ApiResponse::<Interview>::error(500, "完成面试失败"))
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

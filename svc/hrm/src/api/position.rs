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
use crate::api::audit::log_audit_event;
use topems_shared::{api_error, ApiResponse, PaginatedResult, PaginationQuery};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Position {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub company_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub level: Option<String>,
    pub min_salary: Option<BigDecimal>,
    pub max_salary: Option<BigDecimal>,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePositionRequest {
    pub organization_id: Uuid,
    pub company_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub level: Option<String>,
    pub min_salary: Option<BigDecimal>,
    pub max_salary: Option<BigDecimal>,
    pub description: Option<String>,
    pub requirements: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdatePositionRequest {
    pub company_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub name: Option<String>,
    pub code: Option<String>,
    pub level: Option<String>,
    pub min_salary: Option<BigDecimal>,
    pub max_salary: Option<BigDecimal>,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QueryParams {
    #[serde(flatten)]
    pub pagination: PaginationQuery,
    pub search: Option<String>,
    pub department_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/hrm.positions",
            get(list_positions).post(create_position),
        )
        .route(
            "/api/hrm.positions/{id}",
            get(get_position)
                .put(update_position)
                .delete(delete_position),
        )
}

async fn list_positions(
    State(state): State<ApiState>,
    Query(params): Query<QueryParams>,
) -> Json<ApiResponse<PaginatedResult<Position>>> {
    let pagination = params.pagination;
    let offset = pagination.offset();
    let page_size = pagination.page_size();

    let search = params.search.unwrap_or_default();
    let dept_id = params.department_id;
    let company_id = params.company_id;
    let status_filter = params.status;

    let result = sqlx::query_as::<_, Position>(
        r#"
        SELECT id, organization_id, company_id, department_id, name, code, level, min_salary, max_salary, description, requirements, status, created_at, updated_at
        FROM hrm.positions
        WHERE ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
          AND ($2::uuid IS NULL OR department_id = $2)
          AND ($3::uuid IS NULL OR company_id = $3)
          AND ($4::text IS NULL OR status = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&search)
    .bind(dept_id)
    .bind(company_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM hrm.positions
                WHERE ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
                  AND ($2::uuid IS NULL OR department_id = $2)
                  AND ($3::uuid IS NULL OR company_id = $3)
                  AND ($4::text IS NULL OR status = $4)
                "#,
            )
            .bind(&search)
            .bind(dept_id)
            .bind(company_id)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResult::new(items, total, pagination.page(), page_size),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询岗位列表失败: {}", e);
            Json(ApiResponse::<PaginatedResult<Position>>::error(
                500,
                "查询岗位列表失败",
            ))
        }
    }
}

async fn create_position(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreatePositionRequest>,
) -> Json<ApiResponse<Position>> {
    if req.name.is_empty() {
        return Json(api_error(400, "岗位名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Position>(
        r#"
        INSERT INTO hrm.positions (id, organization_id, company_id, department_id, name, code, level, min_salary, max_salary, description, requirements, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12, $13)
        RETURNING id, organization_id, company_id, department_id, name, code, level, min_salary, max_salary, description, requirements, status, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(req.organization_id)
    .bind(req.company_id)
    .bind(req.department_id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.level)
    .bind(&req.min_salary)
    .bind(&req.max_salary)
    .bind(&req.description)
    .bind(&req.requirements)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(position) => (
            Json(ApiResponse::success(position.clone(), "岗位创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建岗位失败: {}", e);
            (
                Json(api_error(500, "创建岗位失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(position) = &result {
        serde_json::to_value(position).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "position".to_string(),
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

async fn get_position(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Position>> {
    let result = sqlx::query_as::<_, Position>(
        "SELECT id, organization_id, company_id, department_id, name, code, level, min_salary, max_salary, description, requirements, status, created_at, updated_at FROM hrm.positions WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(position)) => Json(ApiResponse::success(position, "查询成功")),
        Ok(None) => Json(ApiResponse::<Position>::error(404, "岗位不存在")),
        Err(e) => {
            tracing::error!("查询岗位失败: {}", e);
            Json(ApiResponse::<Position>::error(500, "查询岗位失败"))
        }
    }
}

async fn update_position(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePositionRequest>,
) -> Json<ApiResponse<Position>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Position>(
        r#"
        UPDATE hrm.positions
        SET
            company_id = COALESCE($1, company_id),
            department_id = COALESCE($2, department_id),
            name = COALESCE($3, name),
            code = COALESCE($4, code),
            level = COALESCE($5, level),
            min_salary = COALESCE($6, min_salary),
            max_salary = COALESCE($7, max_salary),
            description = COALESCE($8, description),
            requirements = COALESCE($9, requirements),
            status = COALESCE($10, status),
            updated_at = $11
        WHERE id = $12
        RETURNING id, organization_id, company_id, department_id, name, code, level, min_salary, max_salary, description, requirements, status, created_at, updated_at
        "#
    )
    .bind(req.company_id)
    .bind(req.department_id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.level)
    .bind(&req.min_salary)
    .bind(&req.max_salary)
    .bind(&req.description)
    .bind(&req.requirements)
    .bind(&req.status)
    .bind(now)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(position)) => Json(ApiResponse::success(position, "岗位更新成功")),
        Ok(None) => Json(ApiResponse::<Position>::error(404, "岗位不存在")),
        Err(e) => {
            tracing::error!("更新岗位失败: {}", e);
            Json(ApiResponse::<Position>::error(500, "更新岗位失败"))
        }
    }
}

async fn delete_position(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM hrm.positions WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success(id.to_string(), "岗位删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "岗位不存在")),
            "error".to_string(),
            Some("岗位不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除岗位失败: {}", e);
            (
                Json(api_error(500, "删除岗位失败")),
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
        "position".to_string(),
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

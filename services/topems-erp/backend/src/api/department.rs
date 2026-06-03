use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{CreateDepartmentRequest, Department, UpdateDepartmentRequest};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};
use crate::api::audit::log_audit_event;
use crate::utils::validate_required_field;
use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/departments", get(list_departments).post(create_department))
        .route(
            "/api/v1/departments/{id}",
            get(get_department).put(update_department).delete(delete_department),
        )
}

async fn list_departments(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Department>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    if search_pattern.is_none() && status_filter.is_none() && page == 1 && page_size >= 100 {
        if let Some(cached) = state.department_cache.get("all_departments") {
            let total = cached.len() as i64;
            let departments = cached.into_iter().take(page_size as usize).collect();
            return Json(ApiResponse::success(
                PaginatedResponse::new(departments, total, page, page_size),
                "获取部门列表成功(缓存)",
            ));
        }
    }

    let result = sqlx::query_as::<_, Department>(
        r#"
        SELECT id, name, code, parent_id, company_id, description, status, created_at, updated_at
        FROM departments
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(departments) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM departments
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            if search_pattern.is_none() && status_filter.is_none() {
                state.department_cache.set("all_departments".to_string(), departments.clone());
            }

            Json(ApiResponse::success(
                PaginatedResponse::new(departments, total, page, page_size),
                "获取部门列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取部门列表失败: {}", e);
            Json(api_error(500, "获取部门列表失败"))
        }
    }
}

async fn create_department(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateDepartmentRequest>,
) -> Json<ApiResponse<Department>> {
    if let Err(e) = validate_required_field("部门名称", &req.name) {
        return Json(api_error(400, &e));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Department>(
        r#"
        INSERT INTO departments (id, name, code, parent_id, company_id, description, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
        RETURNING id, name, code, parent_id, company_id, description, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(req.parent_id)
    .bind(req.company_id)
    .bind(&req.description)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(department) => {
            state.department_cache.remove("all_departments");
            (
                Json(ApiResponse::success(department.clone(), "部门创建成功")),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("创建部门失败: {}", e);
            (
                Json(api_error(500, "部门创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(department) = &result {
        serde_json::to_value(department).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "department".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_department(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Department>> {
    let result = sqlx::query_as::<_, Department>(
        r#"
        SELECT id, name, code, parent_id, company_id, description, status, created_at, updated_at
        FROM departments WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(department)) => Json(ApiResponse::success(department, "获取部门成功")),
        Ok(None) => Json(api_error(404, "部门不存在")),
        Err(e) => {
            tracing::error!("获取部门失败: {}", e);
            Json(api_error(500, "获取部门失败"))
        }
    }
}

async fn update_department(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateDepartmentRequest>,
) -> Json<ApiResponse<Department>> {
    let existing = sqlx::query_as::<_, Department>(
        "SELECT id, name, code, parent_id, company_id, description, status, created_at, updated_at FROM departments WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(d)) => d,
        Ok(None) => return Json(api_error(404, "部门不存在")),
        Err(e) => return Json(api_error(500, &format!("查询部门失败: {}", e))),
    };

    // 先获取 request_data，避免所有权问题
    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let code = req.code.or(existing.code);
    let parent_id = req.parent_id.or(existing.parent_id);
    let company_id = req.company_id.or(existing.company_id);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Department>(
        r#"
        UPDATE departments SET
            name = $2, code = $3, parent_id = $4, company_id = $5, description = $6, status = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, name, code, parent_id, company_id, description, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&code)
    .bind(parent_id)
    .bind(company_id)
    .bind(&description)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(department) => {
            state.department_cache.remove("all_departments");
            (
                Json(ApiResponse::success(department.clone(), "部门更新成功")),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("更新部门失败: {}", e);
            (
                Json(api_error(500, "部门更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(department) = &result {
        serde_json::to_value(department).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "department".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_department(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM departments WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            state.department_cache.remove("all_departments");
            (
                Json(ApiResponse::success("".to_string(), "部门删除成功")),
                "success".to_string(),
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "部门不存在")),
            "error".to_string(),
            Some("部门不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除部门失败: {}", e);
            (
                Json(api_error(500, "部门删除失败")),
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
        "department".to_string(),
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

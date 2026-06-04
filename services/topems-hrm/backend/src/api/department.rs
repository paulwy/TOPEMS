use axum::{
    extract::{Path, Query, State},
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{CreateDepartmentRequest, Department, UpdateDepartmentRequest};
use topems_shared::{ApiResponse, api_error};
use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/departments", get(list_departments).post(create_department))
        .route(
            "/api/v1/departments/{id}",
            get(get_department).put(update_department).delete(delete_department),
        )
}

#[derive(Debug, Deserialize)]
pub struct DepartmentPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

async fn list_departments(
    State(state): State<ApiState>,
    Query(params): Query<DepartmentPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Department>(
        r#"
        SELECT id, name, code, parent_id, manager_id, description, status, created_at, updated_at
        FROM hrm.departments
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
                SELECT COUNT(*) FROM hrm.departments
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "departments": departments,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
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
    Json(req): Json<CreateDepartmentRequest>,
) -> Json<ApiResponse<Department>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Department>(
        r#"
        INSERT INTO hrm.departments (
            id, name, code, parent_id, manager_id, description, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
        RETURNING id, name, code, parent_id, manager_id, description, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.parent_id)
    .bind(&req.manager_id)
    .bind(&req.description)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(department) => Json(ApiResponse::success(department, "部门创建成功")),
        Err(e) => {
            tracing::error!("创建部门失败: {}", e);
            Json(api_error(500, "部门创建失败"))
        }
    }
}

async fn get_department(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Department>> {
    let result = sqlx::query_as::<_, Department>(
        r#"
        SELECT id, name, code, parent_id, manager_id, description, status, created_at, updated_at
        FROM hrm.departments WHERE id = $1
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
    Json(req): Json<UpdateDepartmentRequest>,
) -> Json<ApiResponse<Department>> {
    let existing = sqlx::query_as::<_, Department>(
        "SELECT id, name, code, parent_id, manager_id, description, status, created_at, updated_at FROM hrm.departments WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(d)) => d,
        Ok(None) => return Json(api_error(404, "部门不存在")),
        Err(e) => return Json(api_error(500, &format!("查询部门失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let code = req.code.or(existing.code);
    let parent_id = req.parent_id.or(existing.parent_id);
    let manager_id = req.manager_id.or(existing.manager_id);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Department>(
        r#"
        UPDATE hrm.departments SET
            name = $2, code = $3, parent_id = $4, manager_id = $5, 
            description = $6, status = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, name, code, parent_id, manager_id, description, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&code)
    .bind(&parent_id)
    .bind(&manager_id)
    .bind(&description)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(department) => Json(ApiResponse::success(department, "部门更新成功")),
        Err(e) => {
            tracing::error!("更新部门失败: {}", e);
            Json(api_error(500, "部门更新失败"))
        }
    }
}

async fn delete_department(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM hrm.departments WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "部门删除成功")),
        Ok(_) => Json(api_error(404, "部门不存在")),
        Err(e) => {
            tracing::error!("删除部门失败: {}", e);
            Json(api_error(500, "部门删除失败"))
        }
    }
}

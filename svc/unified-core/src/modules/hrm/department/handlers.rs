use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    CreateDepartmentRequest, Department, DepartmentListResponse, DepartmentQuery,
    UpdateDepartmentRequest,
};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001")
        .expect("hardcoded default UUID should always be valid")
}

pub async fn list_departments(
    State(state): State<AppState>,
    Query(query): Query<DepartmentQuery>,
) -> Json<ApiResponse<DepartmentListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_hrm_departments
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::uuid IS NULL OR parent_id = $3)
             AND ($4::text IS NULL OR name ILIKE '%' || $4 || '%')"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.parent_id)
    .bind(query.search.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询部门总数失败: {}", e);
            return Json(api_error(500, "查询部门总数失败"));
        }
    };

    let items: Vec<Department> = match sqlx::query_as(
        r#"SELECT id, tenant_id, name, parent_id, manager_id, sort_order, status,
                  created_at, updated_at
           FROM core_hrm_departments
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::uuid IS NULL OR parent_id = $3)
             AND ($4::text IS NULL OR name ILIKE '%' || $4 || '%')
           ORDER BY sort_order ASC, created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.parent_id)
    .bind(query.search.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询部门列表失败: {}", e);
            return Json(api_error(500, "查询部门列表失败"));
        }
    };

    Json(api_success(DepartmentListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_department(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Department>> {
    let tenant_id = default_tenant_id();

    let dept: Option<Department> = match sqlx::query_as(
        r#"SELECT id, tenant_id, name, parent_id, manager_id, sort_order, status,
                  created_at, updated_at
           FROM core_hrm_departments WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询部门详情失败: {}", e);
            return Json(api_error(500, "查询部门详情失败"));
        }
    };

    match dept {
        Some(dept) => Json(api_success(dept)),
        None => Json(api_error(404, "部门不存在")),
    }
}

pub async fn create_department(
    State(state): State<AppState>,
    Json(req): Json<CreateDepartmentRequest>,
) -> Json<ApiResponse<Department>> {
    if req.name.trim().is_empty() {
        return Json(api_error(400, "部门名称不能为空"));
    }

    let tenant_id = default_tenant_id();

    let dept: Department = match sqlx::query_as(
        r#"INSERT INTO core_hrm_departments
               (tenant_id, name, parent_id, manager_id, sort_order, status)
           VALUES ($1, $2, $3, $4, $5, 'active')
           RETURNING id, tenant_id, name, parent_id, manager_id, sort_order, status,
                     created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.name)
    .bind(req.parent_id)
    .bind(req.manager_id)
    .bind(req.sort_order.unwrap_or(0))
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建部门失败: {}", e);
            return Json(api_error(500, "创建部门失败"));
        }
    };

    Json(api_success(dept))
}

pub async fn update_department(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDepartmentRequest>,
) -> Json<ApiResponse<Department>> {
    let tenant_id = default_tenant_id();

    let dept: Option<Department> = match sqlx::query_as(
        r#"UPDATE core_hrm_departments
           SET name = COALESCE($1, name),
               parent_id = COALESCE($2, parent_id),
               manager_id = COALESCE($3, manager_id),
               sort_order = COALESCE($4, sort_order),
               status = COALESCE($5, status),
               updated_at = NOW()
           WHERE id = $6 AND tenant_id = $7
           RETURNING id, tenant_id, name, parent_id, manager_id, sort_order, status,
                     created_at, updated_at"#,
    )
    .bind(req.name)
    .bind(req.parent_id)
    .bind(req.manager_id)
    .bind(req.sort_order)
    .bind(req.status)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新部门失败: {}", e);
            return Json(api_error(500, "更新部门失败"));
        }
    };

    match dept {
        Some(dept) => Json(api_success(dept)),
        None => Json(api_error(404, "部门不存在")),
    }
}

pub async fn delete_department(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result =
        sqlx::query(r#"DELETE FROM core_hrm_departments WHERE id = $1 AND tenant_id = $2"#)
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "部门不存在")),
        Err(e) => {
            tracing::error!("删除部门失败: {}", e);
            Json(api_error(500, "删除部门失败"))
        }
    }
}

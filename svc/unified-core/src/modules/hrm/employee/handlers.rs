use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    CreateEmployeeRequest, Employee, EmployeeListResponse, EmployeeQuery, UpdateEmployeeRequest,
};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001")
        .expect("hardcoded default UUID should always be valid")
}

pub async fn list_employees(
    State(state): State<AppState>,
    Query(query): Query<EmployeeQuery>,
) -> Json<ApiResponse<EmployeeListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_hrm_employees
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::uuid IS NULL OR department_id = $3)
             AND ($4::text IS NULL OR employee_no ILIKE '%' || $4 || '%' OR name ILIKE '%' || $4 || '%')"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.department_id)
    .bind(query.search.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询员工总数失败: {}", e);
            return Json(api_error(500, "查询员工总数失败"));
        }
    };

    let items: Vec<Employee> = match sqlx::query_as(
        r#"SELECT id, tenant_id, employee_no, name, gender, birth_date, phone, email,
                  department_id, position, hire_date, leave_date, status, created_at, updated_at
           FROM core_hrm_employees
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::uuid IS NULL OR department_id = $3)
             AND ($4::text IS NULL OR employee_no ILIKE '%' || $4 || '%' OR name ILIKE '%' || $4 || '%')
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.department_id)
    .bind(query.search.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询员工列表失败: {}", e);
            return Json(api_error(500, "查询员工列表失败"));
        }
    };

    Json(api_success(EmployeeListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_employee(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Employee>> {
    let tenant_id = default_tenant_id();

    let employee: Option<Employee> = match sqlx::query_as(
        r#"SELECT id, tenant_id, employee_no, name, gender, birth_date, phone, email,
                  department_id, position, hire_date, leave_date, status, created_at, updated_at
           FROM core_hrm_employees WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询员工详情失败: {}", e);
            return Json(api_error(500, "查询员工详情失败"));
        }
    };

    match employee {
        Some(employee) => Json(api_success(employee)),
        None => Json(api_error(404, "员工不存在")),
    }
}

pub async fn create_employee(
    State(state): State<AppState>,
    Json(req): Json<CreateEmployeeRequest>,
) -> Json<ApiResponse<Employee>> {
    if req.employee_no.trim().is_empty() {
        return Json(api_error(400, "员工编号不能为空"));
    }
    if req.name.trim().is_empty() {
        return Json(api_error(400, "员工姓名不能为空"));
    }

    let tenant_id = default_tenant_id();

    let employee: Employee = match sqlx::query_as(
        r#"INSERT INTO core_hrm_employees
               (tenant_id, employee_no, name, gender, birth_date, phone, email,
                department_id, position, hire_date, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
           RETURNING id, tenant_id, employee_no, name, gender, birth_date, phone, email,
                     department_id, position, hire_date, leave_date, status, created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.employee_no)
    .bind(req.name)
    .bind(req.gender)
    .bind(req.birth_date)
    .bind(req.phone)
    .bind(req.email)
    .bind(req.department_id)
    .bind(req.position)
    .bind(req.hire_date)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建员工失败: {}", e);
            return Json(api_error(500, "创建员工失败"));
        }
    };

    Json(api_success(employee))
}

pub async fn update_employee(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateEmployeeRequest>,
) -> Json<ApiResponse<Employee>> {
    let tenant_id = default_tenant_id();

    let employee: Option<Employee> = match sqlx::query_as(
        r#"UPDATE core_hrm_employees
           SET employee_no = COALESCE($1, employee_no),
               name = COALESCE($2, name),
               gender = COALESCE($3, gender),
               birth_date = COALESCE($4, birth_date),
               phone = COALESCE($5, phone),
               email = COALESCE($6, email),
               department_id = COALESCE($7, department_id),
               position = COALESCE($8, position),
               hire_date = COALESCE($9, hire_date),
               leave_date = COALESCE($10, leave_date),
               status = COALESCE($11, status),
               updated_at = NOW()
           WHERE id = $12 AND tenant_id = $13
           RETURNING id, tenant_id, employee_no, name, gender, birth_date, phone, email,
                     department_id, position, hire_date, leave_date, status, created_at, updated_at"#,
    )
    .bind(req.employee_no)
    .bind(req.name)
    .bind(req.gender)
    .bind(req.birth_date)
    .bind(req.phone)
    .bind(req.email)
    .bind(req.department_id)
    .bind(req.position)
    .bind(req.hire_date)
    .bind(req.leave_date)
    .bind(req.status)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新员工失败: {}", e);
            return Json(api_error(500, "更新员工失败"));
        }
    };

    match employee {
        Some(employee) => Json(api_success(employee)),
        None => Json(api_error(404, "员工不存在")),
    }
}

pub async fn delete_employee(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result = sqlx::query(r#"DELETE FROM core_hrm_employees WHERE id = $1 AND tenant_id = $2"#)
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "员工不存在")),
        Err(e) => {
            tracing::error!("删除员工失败: {}", e);
            Json(api_error(500, "删除员工失败"))
        }
    }
}

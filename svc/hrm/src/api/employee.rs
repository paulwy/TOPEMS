use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{CreateEmployeeRequest, Employee, UpdateEmployeeRequest};
use crate::api::audit::log_audit_event;
use topems_shared::{ApiResponse, api_error};
use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/employees", get(list_employees).post(create_employee))
        .route(
            "/api/v1/employees/{id}",
            get(get_employee).put(update_employee).delete(delete_employee),
        )
}

#[derive(Debug, Deserialize)]
pub struct EmployeePaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub department_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
}

async fn list_employees(
    State(state): State<ApiState>,
    Query(params): Query<EmployeePaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let dept_filter = params.department_id;
    let company_filter = params.company_id;

    let result = sqlx::query_as::<_, Employee>(
        r#"
        SELECT id, organization_id, company_id, department_id, position_id,
               employee_number, name, gender, birth_date, hire_date,
               position, job_title, email, phone,
               emergency_contact_name, emergency_contact_phone, address, status,
               created_at, updated_at
        FROM hrm.employees
        WHERE ($1::text IS NULL OR name ILIKE $1 OR employee_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR department_id = $3)
          AND ($4::uuid IS NULL OR company_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(dept_filter)
    .bind(company_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(employees) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM hrm.employees
                WHERE ($1::text IS NULL OR name ILIKE $1 OR employee_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR department_id = $3)
                  AND ($4::uuid IS NULL OR company_id = $4)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(dept_filter)
            .bind(company_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "employees": employees,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取员工列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取员工列表失败: {}", e);
            Json(api_error(500, "获取员工列表失败"))
        }
    }
}

async fn create_employee(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateEmployeeRequest>,
) -> Json<ApiResponse<Employee>> {
    if req.name.is_empty() {
        return Json(api_error(400, "员工姓名不能为空"));
    }

    if req.employee_number.is_empty() {
        return Json(api_error(400, "员工编号不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Employee>(
        r#"
        INSERT INTO hrm.employees (
            id, organization_id, company_id, department_id, position_id,
            employee_number, name, gender, birth_date, hire_date,
            position, job_title, email, phone,
            emergency_contact_name, emergency_contact_phone, address,
            status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active', $18, $19)
        RETURNING id, organization_id, company_id, department_id, position_id,
                  employee_number, name, gender, birth_date, hire_date,
                  position, job_title, email, phone,
                  emergency_contact_name, emergency_contact_phone, address, status,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.organization_id)
    .bind(req.company_id)
    .bind(req.department_id)
    .bind(req.position_id)
    .bind(&req.employee_number)
    .bind(&req.name)
    .bind(&req.gender)
    .bind(req.birth_date)
    .bind(req.hire_date)
    .bind(&req.position)
    .bind(&req.job_title)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(&req.emergency_contact_name)
    .bind(&req.emergency_contact_phone)
    .bind(&req.address)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(employee) => (
            Json(ApiResponse::success(employee.clone(), "员工创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建员工失败: {}", e);
            (
                Json(api_error(500, "员工创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(employee) = &result {
        serde_json::to_value(employee).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "employee".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_employee(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Employee>> {
    let result = sqlx::query_as::<_, Employee>(
        r#"
        SELECT id, organization_id, company_id, department_id, position_id,
               employee_number, name, gender, birth_date, hire_date,
               position, job_title, email, phone,
               emergency_contact_name, emergency_contact_phone, address, status,
               created_at, updated_at
        FROM hrm.employees WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(employee)) => Json(ApiResponse::success(employee, "获取员工成功")),
        Ok(None) => Json(api_error(404, "员工不存在")),
        Err(e) => {
            tracing::error!("获取员工失败: {}", e);
            Json(api_error(500, "获取员工失败"))
        }
    }
}

async fn update_employee(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateEmployeeRequest>,
) -> Json<ApiResponse<Employee>> {
    let existing = sqlx::query_as::<_, Employee>(
        r#"
        SELECT id, organization_id, company_id, department_id, position_id,
               employee_number, name, gender, birth_date, hire_date,
               position, job_title, email, phone,
               emergency_contact_name, emergency_contact_phone, address, status,
               created_at, updated_at FROM hrm.employees WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(api_error(404, "员工不存在")),
        Err(e) => return Json(api_error(500, &format!("查询员工失败: {}", e))),
    };

    // 先获取 request_data，避免所有权问题
    let request_data = serde_json::to_value(&req).ok();

    let company_id = req.company_id.or(existing.company_id);
    let department_id = req.department_id.or(existing.department_id);
    let position_id = req.position_id.or(existing.position_id);
    let name = req.name.unwrap_or(existing.name);
    let gender = req.gender.or(existing.gender);
    let birth_date = req.birth_date.or(existing.birth_date);
    let hire_date = req.hire_date.or(existing.hire_date);
    let position = req.position.or(existing.position);
    let job_title = req.job_title.or(existing.job_title);
    let email = req.email.or(existing.email);
    let phone = req.phone.or(existing.phone);
    let emergency_contact_name = req.emergency_contact_name.or(existing.emergency_contact_name);
    let emergency_contact_phone = req.emergency_contact_phone.or(existing.emergency_contact_phone);
    let address = req.address.or(existing.address);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Employee>(
        r#"
        UPDATE hrm.employees SET
            organization_id = $2, company_id = $3, department_id = $4, position_id = $5,
            name = $6, gender = $7, birth_date = $8, hire_date = $9,
            position = $10, job_title = $11, email = $12, phone = $13,
            emergency_contact_name = $14, emergency_contact_phone = $15, address = $16,
            status = $17, updated_at = $18
        WHERE id = $1
        RETURNING id, organization_id, company_id, department_id, position_id,
                  employee_number, name, gender, birth_date, hire_date,
                  position, job_title, email, phone,
                  emergency_contact_name, emergency_contact_phone, address, status,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(existing.organization_id)
    .bind(company_id)
    .bind(department_id)
    .bind(position_id)
    .bind(&name)
    .bind(&gender)
    .bind(birth_date)
    .bind(hire_date)
    .bind(&position)
    .bind(&job_title)
    .bind(&email)
    .bind(&phone)
    .bind(&emergency_contact_name)
    .bind(&emergency_contact_phone)
    .bind(&address)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(employee) => (
            Json(ApiResponse::success(employee.clone(), "员工更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新员工失败: {}", e);
            (
                Json(api_error(500, "员工更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(employee) = &result {
        serde_json::to_value(employee).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "employee".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn delete_employee(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM hrm.employees WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "员工删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "员工不存在")),
            "error",
            Some("员工不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除员工失败: {}", e);
            (
                Json(api_error(500, "员工删除失败")),
                "error",
                Some(e.to_string())
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
        "employee".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

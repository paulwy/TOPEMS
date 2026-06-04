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
use crate::services::iam_client::{CreateUserRequest, IamClient};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};
use crate::api::audit::log_audit_event;
use crate::utils::{validate_required_field, validate_email, validate_phone};
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
        .route("/api/v1/employees", get(list_employees).post(create_employee))
        .route(
            "/api/v1/employees/{id}",
            get(get_employee).put(update_employee).delete(delete_employee),
        )
}

async fn list_employees(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Employee>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    if search_pattern.is_none() && status_filter.is_none() && page == 1 && page_size >= 100 {
        if let Some(cached) = state.employee_cache.get("all_employees") {
            let total = cached.len() as i64;
            let employees = cached.into_iter().take(page_size as usize).collect();
            return Json(ApiResponse::success(
                PaginatedResponse::new(employees, total, page, page_size),
                "获取员工列表成功(缓存)",
            ));
        }
    }

    let result = sqlx::query_as::<_, Employee>(
        r#"
        SELECT id, employee_number, name, gender, birth_date, hire_date, department_id, position, email, phone, status, user_id, created_at, updated_at
        FROM erp.employees
        WHERE ($1::text IS NULL OR name ILIKE $1 OR employee_number ILIKE $1)
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
        Ok(employees) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM erp.employees
                WHERE ($1::text IS NULL OR name ILIKE $1 OR employee_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            if search_pattern.is_none() && status_filter.is_none() {
                state.employee_cache.set("all_employees".to_string(), employees.clone());
            }

            Json(ApiResponse::success(
                PaginatedResponse::new(employees, total, page, page_size),
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
    if let Err(e) = validate_required_field("员工姓名", &req.name) {
        return Json(api_error(400, &e));
    }

    if let Err(e) = validate_required_field("员工编号", &req.employee_number) {
        return Json(api_error(400, &e));
    }

    if let Some(email) = &req.email {
        if !validate_email(email) {
            return Json(api_error(400, "邮箱格式不正确"));
        }
    }

    if let Some(phone) = &req.phone {
        if !validate_phone(phone) {
            return Json(api_error(400, "手机号格式不正确"));
        }
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let username = req.email.clone().unwrap_or_else(|| req.employee_number.clone());
    let email = req.email.clone().unwrap_or_else(|| format!("{}@topems.local", req.employee_number));

    let iam_client = IamClient::new();
    let user_req = CreateUserRequest {
        username: username.clone(),
        email: email.clone(),
        password: req.password.clone(),
        full_name: Some(req.name.clone()),
    };

    let iam_user = match iam_client.create_user(user_req).await {
        Ok(user) => user,
        Err(e) => {
            tracing::error!("创建 IAM 用户失败: {}", e);
            return Json(api_error(500, &format!("创建用户账号失败: {}", e)));
        }
    };

    let result = sqlx::query_as::<_, Employee>(
        r#"
        INSERT INTO erp.employees (id, employee_number, name, gender, birth_date, hire_date, department_id, position, email, phone, status, user_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, $12, $13)
        RETURNING id, employee_number, name, gender, birth_date, hire_date, department_id, position, email, phone, status, user_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.employee_number)
    .bind(&req.name)
    .bind(&req.gender)
    .bind(req.birth_date)
    .bind(req.hire_date)
    .bind(req.department_id)
    .bind(&req.position)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(iam_user.id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(employee) => {
            state.employee_cache.remove("all_employees");
            (
                Json(ApiResponse::success(employee.clone(), "员工创建成功")),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("创建员工失败: {}", e);
            (
                Json(api_error(500, "员工创建失败")),
                "error".to_string(),
                Some(e.to_string()),
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
        status,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_employee(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Employee>> {
    let result = sqlx::query_as::<_, Employee>(
        r#"
        SELECT id, employee_number, name, gender, birth_date, hire_date, department_id, position, email, phone, status, user_id, created_at, updated_at
        FROM erp.employees WHERE id = $1
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
        "SELECT id, employee_number, name, gender, birth_date, hire_date, department_id, position, email, phone, status, user_id, created_at, updated_at FROM erp.employees WHERE id = $1",
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

    let name = req.name.unwrap_or(existing.name);
    let gender = req.gender.or(existing.gender);
    let birth_date = req.birth_date.or(existing.birth_date);
    let hire_date = req.hire_date.or(existing.hire_date);
    let department_id = req.department_id.or(existing.department_id);
    let position = req.position.or(existing.position);
    let email = req.email.or(existing.email);
    let phone = req.phone.or(existing.phone);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Employee>(
        r#"
        UPDATE erp.employees SET
            name = $2, gender = $3, birth_date = $4, hire_date = $5, department_id = $6, position = $7, email = $8, phone = $9, status = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, employee_number, name, gender, birth_date, hire_date, department_id, position, email, phone, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&gender)
    .bind(birth_date)
    .bind(hire_date)
    .bind(department_id)
    .bind(&position)
    .bind(&email)
    .bind(&phone)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(employee) => {
            state.employee_cache.remove("all_employees");
            (
                Json(ApiResponse::success(employee.clone(), "员工更新成功")),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("更新员工失败: {}", e);
            (
                Json(api_error(500, "员工更新失败")),
                "error".to_string(),
                Some(e.to_string()),
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
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_employee(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let employee_result = sqlx::query_as::<_, Employee>(
        "SELECT id, user_id FROM erp.employees WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let employee = match employee_result {
        Ok(Some(e)) => e,
        Ok(None) => return Json(api_error(404, "员工不存在")),
        Err(e) => return Json(api_error(500, &format!("查询员工失败: {}", e))),
    };

    let result = sqlx::query("DELETE FROM erp.employees WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    if result.is_ok() {
        if let Some(user_id) = employee.user_id {
            let iam_client = IamClient::new();
            if let Err(e) = iam_client.delete_user(user_id).await {
                tracing::warn!("删除 IAM 用户失败: {}", e);
            }
        }
    }

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            state.employee_cache.remove("all_employees");
            (
                Json(ApiResponse::success("".to_string(), "员工删除成功")),
                "success".to_string(),
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "员工不存在")),
            "error".to_string(),
            Some("员工不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除员工失败: {}", e);
            (
                Json(api_error(500, "员工删除失败")),
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
        "employee".to_string(),
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

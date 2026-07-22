use axum::{routing::*, Json, Router};
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;

use super::ApiState;
use crate::models::{CreateEmployeeRequest, Employee, UpdateEmployeeRequest};
use crate::modules::audit::log_audit_event;
use crate::services::employee_service::EmployeeService;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::{
    api_error, event::EventType, event::HrmEmployeeCreatedPayload, event::MasterDataAction,
    ApiResponse, Claims,
};

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/employees", get(list_employees).post(create_employee))
        .route(
            "/employees/{id}",
            get(get_employee)
                .put(update_employee)
                .delete(delete_employee),
        )
        .route("/employees/{id}/details", get(get_employee_details))
        .route("/employees/export", post(export_employees))
}

const EMPLOYEE_CACHE_TTL: u64 = 3600;

fn employee_cache_key(id: &Uuid) -> String {
    format!("employee:{}", id)
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "page": 1,
    "page_size": 20,
    "search": "张三",
    "status": "active",
    "department_id": "550e8400-e29b-41d4-a716-446655440002",
    "company_id": "550e8400-e29b-41d4-a716-446655440001"
}))]
pub struct EmployeePaginationParams {
    #[schema(example = 1)]
    pub page: Option<i64>,
    #[schema(example = 20)]
    pub page_size: Option<i64>,
    #[schema(example = "张三")]
    pub search: Option<String>,
    #[schema(example = "active")]
    pub status: Option<String>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440002")]
    pub department_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440001")]
    pub company_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "ids": ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"],
    "format": "csv"
}))]
pub struct ExportRequest {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440001")]
    pub ids: Option<Vec<Uuid>>,
    #[schema(example = "csv")]
    pub format: Option<String>,
}

#[utoipa::path(
    get,
    path = "/employees",
    tag = "employees",
    responses(
        (status = 200, description = "获取员工列表成功", body = [Employee]),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足")
    )
)]
async fn list_employees(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Query(params): axum::extract::Query<EmployeePaginationParams>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let tenant_id = get_tenant_id(&claims, &headers);
    let service = EmployeeService::new(state.db.clone(), (*state.encryption).clone(), tenant_id);
    let result = service
        .list_employees(
            page,
            page_size,
            params.search,
            params.status,
            params.department_id,
            params.company_id,
        )
        .await;

    Json(result)
}

#[utoipa::path(
    get,
    path = "/employees/{id}",
    tag = "employees",
    responses(
        (status = 200, description = "获取员工成功", body = Employee),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 404, description = "员工不存在")
    )
)]
async fn get_employee(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Employee>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeRead).await {
        return e;
    }

    let cache_key = employee_cache_key(&id);

    if let Some(cached) = state.employee_cache.get(&cache_key) {
        return Json(ApiResponse::success(cached, "从本地内存缓存获取员工成功"));
    }

    if let Ok(Some(cached)) = state.cache.get(&cache_key).await {
        if let Ok(employee) = serde_json::from_str::<Employee>(&cached) {
            state.employee_cache.set(cache_key, employee.clone());
            return Json(ApiResponse::success(employee, "从缓存获取员工成功"));
        }
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let service = EmployeeService::new(state.db.clone(), (*state.encryption).clone(), tenant_id);
    let result = service.get_employee(&id).await;

    if let ApiResponse {
        code: 200,
        data: Some(employee),
        ..
    } = &result
    {
        state
            .employee_cache
            .set(cache_key.clone(), employee.clone());
        let _ = state
            .cache
            .set(
                &cache_key,
                &serde_json::to_string(employee).unwrap_or_default(),
                Some(EMPLOYEE_CACHE_TTL),
            )
            .await;
    }

    Json(result)
}

#[utoipa::path(
    get,
    path = "/employees/{id}/details",
    tag = "employees",
    responses(
        (status = 200, description = "获取员工详细信息成功"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 404, description = "员工不存在")
    )
)]
async fn get_employee_details(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeRead).await {
        return e;
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query(
        r#"
        SELECT 
            e.id, e.tenant_id, e.company_id, e.department_id, e.position_id,
            e.employee_number, e.name, e.gender, e.hire_date,
            e.email, e.phone, e.status,
            e.created_at, e.updated_at,
            d.name as department_name,
            c.name as company_name,
            p.name as position_name
        FROM hrm.employees e
        LEFT JOIN hrm.departments d ON e.department_id = d.id
        LEFT JOIN hrm.companies c ON e.company_id = c.id
        LEFT JOIN hrm.positions p ON e.position_id = p.id
        WHERE e.id = $1 AND e.tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => {
            use sqlx::Row;
            let details = serde_json::json!({
                "id": row.get::<uuid::Uuid, _>("id"),
                "company_id": row.get::<Option<uuid::Uuid>, _>("company_id"),
                "company_name": row.get::<Option<String>, _>("company_name"),
                "department_id": row.get::<Option<uuid::Uuid>, _>("department_id"),
                "department_name": row.get::<Option<String>, _>("department_name"),
                "position_id": row.get::<Option<uuid::Uuid>, _>("position_id"),
                "position_name": row.get::<Option<String>, _>("position_name"),
                "employee_number": row.get::<String, _>("employee_number"),
                "name": row.get::<String, _>("name"),
                "gender": row.get::<Option<String>, _>("gender"),
                "hire_date": row.get::<Option<chrono::NaiveDate>, _>("hire_date"),
                "email": row.get::<Option<String>, _>("email"),
                "phone": row.get::<Option<String>, _>("phone"),
                "status": row.get::<String, _>("status"),
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
            });
            Json(ApiResponse::success(details, "获取员工详细信息成功"))
        }
        Ok(None) => Json(api_error(404, "员工不存在")),
        Err(e) => {
            tracing::error!("获取员工详细信息失败: {}", e);
            Json(api_error(500, "获取员工详细信息失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/employees",
    tag = "employees",
    responses(
        (status = 200, description = "员工创建成功", body = Employee),
        (status = 400, description = "参数错误"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 409, description = "员工编号已存在")
    )
)]
async fn create_employee(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Json(req): axum::extract::Json<CreateEmployeeRequest>,
) -> Json<ApiResponse<Employee>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeWrite).await {
        return e;
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let service = EmployeeService::new(state.db.clone(), (*state.encryption).clone(), tenant_id);
    let result = service.create_employee(req).await;

    let status_str: String;
    let error_msg: Option<String>;
    let data_value: Option<serde_json::Value>;

    match &result {
        ApiResponse {
            code: 200,
            data: Some(employee),
            ..
        } => {
            let _ = state
                .cache
                .set(
                    &employee_cache_key(&employee.id),
                    &serde_json::to_string(employee).unwrap_or_default(),
                    Some(EMPLOYEE_CACHE_TTL),
                )
                .await;

            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let emp_id = employee.id;
                let emp_name = employee.name.clone();
                let emp_email = employee.email.clone().unwrap_or_default();
                let dept_id = employee.department_id;
                tokio::spawn(async move {
                    let payload = HrmEmployeeCreatedPayload {
                        employee_id: emp_id,
                        name: emp_name,
                        email: emp_email,
                        department_id: dept_id,
                    };
                    if let Err(e) = publisher
                        .publish_event(EventType::HrmEmployeeCreated, payload)
                        .await
                    {
                        tracing::warn!(
                            "[hrm] HrmEmployeeCreated 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[hrm] HrmEmployeeCreated 事件发布成功 - employee_id={}",
                            emp_id
                        );
                    }
                });
            }

            // 发布 MDM 主数据事件
            let mdm_service = crate::services::mdm_event_service::MdmEventService::new();
            let emp_id = employee.id;
            let emp_number = employee.employee_number.clone();
            let emp_name = employee.name.clone();
            let emp_email = employee.email.clone();
            let emp_phone = employee.phone.clone();
            let dept_id = employee.department_id;
            let emp_status = employee.status.clone();
            let tenant = tenant_id;
            tokio::spawn(async move {
                mdm_service
                    .publish_employee_event(
                        tenant,
                        emp_id,
                        &emp_number,
                        &emp_name,
                        emp_email.as_deref(),
                        emp_phone.as_deref(),
                        dept_id,
                        &emp_status,
                        MasterDataAction::Created,
                        None,
                    )
                    .await;
            });

            status_str = "success".to_string();
            error_msg = None;
            data_value = serde_json::to_value(employee).ok();
        }
        _ => {
            status_str = "error".to_string();
            error_msg = Some(result.message.clone());
            data_value = None;
        }
    }

    log_audit_event(
        &state.db,
        "create".to_string(),
        "employee".to_string(),
        None,
        None,
        None,
        None,
        None,
        data_value,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    Json(result)
}

#[utoipa::path(
    put,
    path = "/employees/{id}",
    tag = "employees",
    responses(
        (status = 200, description = "员工更新成功", body = Employee),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 404, description = "员工不存在")
    )
)]
async fn update_employee(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: axum::http::HeaderMap,
    axum::extract::Json(req): axum::extract::Json<UpdateEmployeeRequest>,
) -> Json<ApiResponse<Employee>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeWrite).await {
        return e;
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let service = EmployeeService::new(state.db.clone(), (*state.encryption).clone(), tenant_id);
    let result = service.update_employee(&id, req).await;

    if result.code == 200 {
        state.employee_cache.remove(&employee_cache_key(&id));
        let _ = state
            .cache
            .set(
                &employee_cache_key(&id),
                &result
                    .data
                    .as_ref()
                    .and_then(|e| serde_json::to_string(e).ok())
                    .unwrap_or_default(),
                Some(EMPLOYEE_CACHE_TTL),
            )
            .await;

        // 发布 MDM 主数据事件
        if let Some(employee) = &result.data {
            let mdm_service = crate::services::mdm_event_service::MdmEventService::new();
            let emp_id = employee.id;
            let emp_number = employee.employee_number.clone();
            let emp_name = employee.name.clone();
            let emp_email = employee.email.clone();
            let emp_phone = employee.phone.clone();
            let dept_id = employee.department_id;
            let emp_status = employee.status.clone();
            let tenant = tenant_id;
            tokio::spawn(async move {
                mdm_service
                    .publish_employee_event(
                        tenant,
                        emp_id,
                        &emp_number,
                        &emp_name,
                        emp_email.as_deref(),
                        emp_phone.as_deref(),
                        dept_id,
                        &emp_status,
                        MasterDataAction::Updated,
                        None,
                    )
                    .await;
            });
        }
    }

    log_audit_event(
        &state.db,
        "update".to_string(),
        "employee".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        None,
        if result.code == 200 {
            "success"
        } else {
            "error"
        }
        .to_string(),
        None,
        &headers,
    )
    .await;

    Json(result)
}

#[utoipa::path(
    delete,
    path = "/employees/{id}",
    tag = "employees",
    responses(
        (status = 200, description = "员工删除成功"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 404, description = "员工不存在")
    )
)]
async fn delete_employee(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeWrite).await {
        return e;
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let service = EmployeeService::new(state.db.clone(), (*state.encryption).clone(), tenant_id);
    let result = service.delete_employee(&id).await;

    if result.code == 200 {
        state.employee_cache.remove(&employee_cache_key(&id));
        let _ = state.cache.delete(&employee_cache_key(&id)).await;

        // 发布 MDM 主数据删除事件
        let mdm_service = crate::services::mdm_event_service::MdmEventService::new();
        let del_id = id;
        let tenant = tenant_id;
        tokio::spawn(async move {
            mdm_service
                .publish_employee_event(
                    tenant,
                    del_id,
                    "DELETED",
                    "DELETED",
                    None,
                    None,
                    None,
                    "deleted",
                    MasterDataAction::Deleted,
                    None,
                )
                .await;
        });
    }

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "employee".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        None,
        if result.code == 200 {
            "success"
        } else {
            "error"
        }
        .to_string(),
        None,
        &headers,
    )
    .await;

    Json(result)
}

#[utoipa::path(
    post,
    path = "/employees/export",
    tag = "employees",
    responses(
        (status = 200, description = "导出成功"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足")
    )
)]
async fn export_employees(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Json(req): axum::extract::Json<ExportRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeRead).await {
        return e;
    }

    let format = req.format.unwrap_or_else(|| "csv".to_string());

    // 导出数量限制，防止大结果集导致的性能问题
    const MAX_EXPORT_COUNT: i64 = 10000;

    let tenant_id = get_tenant_id(&claims, &headers);

    let employees = match &req.ids {
        Some(ids) => {
            if ids.is_empty() {
                return Json(api_error(400, "导出员工ID列表不能为空"));
            }
            if ids.len() as i64 > MAX_EXPORT_COUNT {
                return Json(api_error(
                    400,
                    &format!("导出数量不能超过 {}", MAX_EXPORT_COUNT),
                ));
            }
            sqlx::query_as::<_, Employee>(
                r#"
                SELECT id, tenant_id, company_id, department_id, position_id,
                       employee_number, name, gender, hire_date,
                       email, phone, status,
                       created_at, updated_at
                FROM hrm.employees
                WHERE tenant_id = $2 AND id = ANY($1)
                LIMIT $3
                "#,
            )
            .bind(ids)
            .bind(tenant_id)
            .bind(MAX_EXPORT_COUNT)
            .fetch_all(&state.db)
            .await
        }
        None => {
            sqlx::query_as::<_, Employee>(
                r#"
                SELECT id, tenant_id, company_id, department_id, position_id,
                       employee_number, name, gender, hire_date,
                       email, phone, status,
                       created_at, updated_at
                FROM hrm.employees
                WHERE tenant_id = $1
                LIMIT $2
                "#,
            )
            .bind(tenant_id)
            .bind(MAX_EXPORT_COUNT)
            .fetch_all(&state.db)
            .await
        }
    };

    match employees {
        Ok(emps) => {
            let data = serde_json::json!({
                "format": format,
                "count": emps.len(),
                "data": emps
            });
            Json(ApiResponse::success(data, "导出成功"))
        }
        Err(e) => {
            tracing::error!("导出员工失败: {}", e);
            Json(api_error(500, "导出失败"))
        }
    }
}

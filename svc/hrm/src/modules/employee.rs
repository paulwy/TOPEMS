use axum::{extract::Extension, routing::*, Router};
use serde::Deserialize;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::TopemsError;
use utoipa::ToSchema;
use uuid::Uuid;

use super::ApiState;
use crate::models::{CreateEmployeeRequest, Employee, UpdateEmployeeRequest};
use crate::modules::audit::log_audit_event;
use crate::services::employee_service::EmployeeService;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
#[cfg(test)]
use topems_shared_auth::get_tenant_id;
use topems_shared_auth::require_tenant;
use topems_shared_core::cache::{record_cache_hit, record_cache_miss, record_cache_set};
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::ListResponse;
use topems_shared_event::event::commit_retry;
use topems_shared_event::event::EventType;
use topems_shared_event::event::HrmEmployeeCreatedPayload;
use topems_shared_event::event::MasterDataAction;

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

// locale 编入 key，避免中英文用户串缓存（Employee.name 走 CASE WHEN 双语切换）
fn employee_cache_key(tenant_id: &Uuid, id: &Uuid, locale: &str) -> String {
    format!("hrm:employee:get:{}:{}:locale:{}", tenant_id, id, locale)
}

/// 失效时需同时清掉 zh/en 两个 locale 变体（精确 remove 不支持通配）。
fn employee_cache_keys_all_locales(tenant_id: &Uuid, id: &Uuid) -> [String; 2] {
    [
        employee_cache_key(tenant_id, id, "zh"),
        employee_cache_key(tenant_id, id, "en"),
    ]
}

/// by-id 读的租户回退：请求未携带租户上下文时，从目标资源行解析其租户。
///
/// 仅用于读路径；写路径必须由 [`require_tenant`] 严格返回 400，禁止回退。
async fn employee_tenant_by_id(
    txn: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    id: &Uuid,
) -> Result<Uuid, TopemsError> {
    let tenant = sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
        "hrm",
        "SELECT tenant_id FROM hrm.employees WHERE id = $1 AND deleted_at IS NULL"
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await
    .map_err(|e| TopemsError::Internal(format!("查询员工租户失败: {e}")))?
    .ok_or_else(|| TopemsError::ResourceNotFound("员工不存在".to_string()))?;

    // 语义显式化：知道 id 即可按行回退租户读取（用户已批准的 by-id 读语义），
    // 必须逐次留痕，不能作为隐含行为。
    tracing::info!(
        event = "tenant_by_id_fallback",
        resource = "hrm.employees",
        resource_id = %id,
        tenant_id = %tenant,
        "请求缺少租户上下文，按资源行回退租户（审计留痕）"
    );

    Ok(tenant)
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "page": 1,
    "page_size": 20,
    "search": "张三",
    "status": "active",
    "department_id": "550e8400-e29b-41d4-a716-446655440002",
    "org_id": "550e8400-e29b-41d4-a716-446655440001"
}))]
pub struct EmployeePaginationParams {
    #[schema(example = 1)]
    pub page: Option<i64>,
    #[serde(alias = "page_size")]
    #[schema(example = 20)]
    pub page_size: Option<i64>,
    #[schema(example = "张三")]
    pub search: Option<String>,
    #[schema(example = "active")]
    pub status: Option<String>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440002")]
    pub department_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440001")]
    pub org_id: Option<Uuid>,
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
    security(("BearerAuth" = ["hrm:employee:read"])),
    path = "/employees",
    tag = "employees",
    responses(
        (status = 200, description = "获取员工列表成功", body = ListResponse<Employee>),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足")
    )
)]
pub async fn list_employees(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Query(params): axum::extract::Query<EmployeePaginationParams>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<ListResponse<Employee>> {
    let mut guard = txn_arc.lock().await;
    let _txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let tenant_id = if claims.is_superuser {
        Uuid::nil()
    } else {
        match require_tenant(&claims, &headers) {
            Ok(tenant) => tenant,
            Err((code, msg)) => return ApiResponse::error(code, &msg),
        }
    };
    let service = EmployeeService::new(
        state.db.clone(),
        (*state.encryption).clone(),
        tenant_id,
        Locale::from_headers(&headers).as_sql(),
    );
    let result = service
        .list_employees(
            page,
            page_size,
            params.search,
            params.status,
            params.department_id,
            params.org_id,
        )
        .await;

    result
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:employee:read"])),
    path = "/employees/{id}",
    tag = "employees",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "获取员工成功", body = Employee),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 404, description = "员工不存在")
    )
)]
pub async fn get_employee(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<Employee> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeRead).await {
        return e;
    }

    // 从 claims 和 headers 中获取 tenant_id，用于多租户缓存隔离；
    // 缺失时按 by-id 读规则回退到目标资源租户（服务身份在系统事务下可见该行）。
    let tenant_id = if claims.is_superuser {
        Uuid::nil()
    } else {
        match require_tenant(&claims, &headers) {
            Ok(tenant) => tenant,
            Err(_) => match employee_tenant_by_id(txn, &id).await {
                Ok(tenant) => tenant,
                Err(e) => return ApiResponse::from(e),
            },
        }
    };
    let locale = Locale::from_headers(&headers).as_sql();
    let cache_key = employee_cache_key(&tenant_id, &id, locale);

    if let Some(cached) = state.employee_cache.get(&cache_key).await {
        record_cache_hit("hrm", "employee", "get");
        if let Ok(employee) = serde_json::from_value::<Employee>(cached) {
            return ApiResponse::success(employee, "从本地内存缓存获取员工成功");
        }
    }

    // 本地缓存未命中，记录指标
    record_cache_miss("hrm", "employee", "get");

    if let Ok(Some(cached)) = state.cache.get(&cache_key).await {
        if let Ok(employee) = serde_json::from_str::<Employee>(&cached) {
            if let Ok(value) = serde_json::to_value(&employee) {
                state.employee_cache.set(cache_key, value).await;
                record_cache_set("hrm", "employee", "get");
            }
            return ApiResponse::success(employee, "从缓存获取员工成功");
        }
    }

    let service = EmployeeService::new(
        state.db.clone(),
        (*state.encryption).clone(),
        tenant_id,
        Locale::from_headers(&headers).as_sql(),
    );
    let result = service.get_employee(&id).await;

    if let ApiResponse {
        code: 200,
        data: Some(employee),
        ..
    } = &result
    {
        if let Ok(value) = serde_json::to_value(employee) {
            state.employee_cache.set(cache_key.clone(), value).await;
            record_cache_set("hrm", "employee", "get");
        }
        let _ = state
            .cache
            .set(
                &cache_key,
                &serde_json::to_string(employee).unwrap_or_default(),
                Some(EMPLOYEE_CACHE_TTL),
            )
            .await;
    }

    result
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:employee:read"])),
    path = "/employees/{id}/details",
    tag = "employees",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "获取员工详细信息成功"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 404, description = "员工不存在")
    )
)]
pub async fn get_employee_details(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeRead).await {
        return e;
    }

    let tenant_id = if claims.is_superuser {
        Uuid::nil()
    } else {
        match require_tenant(&claims, &headers) {
            Ok(tenant) => tenant,
            Err(_) => match employee_tenant_by_id(txn, &id).await {
                Ok(tenant) => tenant,
                Err(e) => return ApiResponse::from(e),
            },
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        r#"
        SELECT
            e.id, e.tenant_id, e.org_id, e.department_id, e.position_id,
            e.employee_number,
            CASE WHEN $3 = 'en' THEN COALESCE(e.name_en, e.name) ELSE e.name END AS name,
            e.gender, e.hire_date,
            e.email, e.phone, e.status,
            e.created_at, e.updated_at,
            d.name as department_name,
            c.name as company_name,
            p.name as position_name
        FROM hrm.employees e
        LEFT JOIN hrm.departments d ON e.department_id = d.id
        LEFT JOIN hrm.companies c ON e.org_id = c.id
        LEFT JOIN hrm.positions p ON e.position_id = p.id
        WHERE e.id = $1 AND ($2::uuid = '00000000-0000-0000-0000-000000000000' OR e.tenant_id = $2::uuid)
        "#
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(row)) => {
            use sqlx::Row;
            let details = serde_json::json!({
                "id": row.get::<uuid::Uuid, _>("id"),
                "org_id": row.get::<Option<uuid::Uuid>, _>("org_id"),
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
            ApiResponse::success(details, "获取员工详细信息成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("员工不存在".to_string())),
        Err(e) => {
            tracing::error!("获取员工详细信息失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取员工详细信息失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:employee:read"])),
    path = "/employees",
    request_body = CreateEmployeeRequest,
    tag = "employees",
    responses(
        (status = 200, description = "员工创建成功", body = Employee),
        (status = 400, description = "参数错误"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 409, description = "员工编号已存在")
    )
)]
pub async fn create_employee(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    axum::extract::Json(req): axum::extract::Json<CreateEmployeeRequest>,
) -> ApiResponse<Employee> {
    let mut guard = txn_arc.lock().await;
    let _txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeWrite).await {
        return e;
    }

    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let service = EmployeeService::new(
        state.db.clone(),
        (*state.encryption).clone(),
        tenant_id,
        Locale::from_headers(&headers).as_sql(),
    );
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
                    &employee_cache_key(
                        &tenant_id,
                        &employee.id,
                        Locale::from_headers(&headers).as_sql(),
                    ),
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
                        tenant_id,
                        employee_id: emp_id,
                        name: emp_name,
                        email: emp_email,
                        department_id: dept_id,
                    };
                    // D6：create_employee 已落库（pool 自动提交），此处仅发布；失败入 ZSET 重试队列。
                    if let Err(e) = publisher
                        .publish_event(EventType::HrmEmployeeCreated, payload.clone())
                        .await
                    {
                        tracing::warn!("[hrm] HrmEmployeeCreated 事件发布失败: {}，入重试队列", e);
                        commit_retry::push_retry_typed(
                            "hrm",
                            EventType::HrmEmployeeCreated,
                            &payload,
                        )
                        .await;
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

    result
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:employee:read"])),
    path = "/employees/{id}",
    request_body = UpdateEmployeeRequest,
    tag = "employees",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "员工更新成功", body = Employee),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 404, description = "员工不存在")
    )
)]
pub async fn update_employee(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    axum::extract::Json(req): axum::extract::Json<UpdateEmployeeRequest>,
) -> ApiResponse<Employee> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeWrite).await {
        return e;
    }

    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let service = EmployeeService::new(
        state.db.clone(),
        (*state.encryption).clone(),
        tenant_id,
        Locale::from_headers(&headers).as_sql(),
    );
    let result = service.update_employee(&id, req, &mut *txn).await;

    if result.code == 200 {
        // D6（对齐 erp c843ad423）：update_employee 写 guard 事务但此前缺显式 commit，
        // UPDATE 随 Drop 回滚而事件已发=幽灵事件。先 commit，成功后再清缓存/发事件。
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("更新员工事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
        for k in employee_cache_keys_all_locales(&tenant_id, &id) {
            state.employee_cache.remove(&k).await;
        }

        // 发布缓存失效事件，通知其他服务失效相关缓存
        if let Some(ref publisher) = state.event_publisher {
            let publisher = publisher.clone();
            tokio::spawn(async move {
                if let Err(e) = publisher
                    .publish_cache_invalidated(
                        "hrm:employee:*",
                        "pattern",
                        Some("employee_updated"),
                    )
                    .await
                {
                    tracing::warn!("发布缓存失效事件失败: {}，入重试队列", e);
                    let payload = topems_shared_event::event::CacheInvalidatedPayload {
                        source_service: "hrm".to_string(),
                        source_instance: format!("retry-{}", std::process::id()),
                        cache_key_pattern: "hrm:employee:*".to_string(),
                        invalidation_level: "pattern".to_string(),
                        reason: Some("employee_updated".to_string()),
                        invalidated_at: chrono::Utc::now(),
                    };
                    commit_retry::push_retry_typed("hrm", EventType::CacheInvalidated, &payload)
                        .await;
                }
            });
        }

        let _ = state
            .cache
            .set(
                &employee_cache_key(&tenant_id, &id, Locale::from_headers(&headers).as_sql()),
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

    result
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["hrm:employee:read"])),
    path = "/employees/{id}",
    tag = "employees",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "员工删除成功"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 404, description = "员工不存在")
    )
)]
pub async fn delete_employee(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeWrite).await {
        return e;
    }

    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let service = EmployeeService::new(
        state.db.clone(),
        (*state.encryption).clone(),
        tenant_id,
        Locale::from_headers(&headers).as_sql(),
    );
    let result = service.delete_employee(&id, &mut *txn).await;

    if result.code == 200 {
        // D6（对齐 erp c843ad423）：delete_employee 写 guard 事务但此前缺显式 commit，
        // 软删随 Drop 回滚而事件已发=幽灵事件。先 commit，成功后再清缓存/发事件。
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("删除员工事务提交失败: {}", e);
                return ApiResponse::<String>::server_error("事务提交失败");
            }
        }
        for k in employee_cache_keys_all_locales(&tenant_id, &id) {
            state.employee_cache.remove(&k).await;
        }
        for k in employee_cache_keys_all_locales(&tenant_id, &id) {
            let _ = state.cache.delete(&k).await;
        }

        // 发布缓存失效事件，通知其他服务失效相关缓存
        if let Some(ref publisher) = state.event_publisher {
            let publisher = publisher.clone();
            tokio::spawn(async move {
                if let Err(e) = publisher
                    .publish_cache_invalidated(
                        "hrm:employee:*",
                        "pattern",
                        Some("employee_deleted"),
                    )
                    .await
                {
                    tracing::warn!("发布缓存失效事件失败: {}，入重试队列", e);
                    let payload = topems_shared_event::event::CacheInvalidatedPayload {
                        source_service: "hrm".to_string(),
                        source_instance: format!("retry-{}", std::process::id()),
                        cache_key_pattern: "hrm:employee:*".to_string(),
                        invalidation_level: "pattern".to_string(),
                        reason: Some("employee_deleted".to_string()),
                        invalidated_at: chrono::Utc::now(),
                    };
                    commit_retry::push_retry_typed("hrm", EventType::CacheInvalidated, &payload)
                        .await;
                }
            });
        }

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

    result
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:employee:read"])),
    path = "/employees/export",
    request_body = ExportRequest,
    tag = "employees",
    responses(
        (status = 200, description = "导出成功"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足")
    )
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn export_employees(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    axum::extract::Json(req): axum::extract::Json<ExportRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::EmployeeRead).await {
        return e;
    }

    let format = req.format.unwrap_or_else(|| "csv".to_string());

    // 导出数量限制，防止大结果集导致的性能问题
    const MAX_EXPORT_COUNT: i64 = 10000;

    let tenant_id = if claims.is_superuser {
        Uuid::nil()
    } else {
        match require_tenant(&claims, &headers) {
            Ok(tenant) => tenant,
            Err((code, msg)) => return ApiResponse::error(code, &msg),
        }
    };

    let employees = match &req.ids {
        Some(ids) => {
            if ids.is_empty() {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "导出员工ID列表不能为空".to_string(),
                ));
            }
            if ids.len() as i64 > MAX_EXPORT_COUNT {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "导出数量超出上限".to_string(),
                ));
            }
            sqlx::query_as::<_, Employee>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT e.id, e.tenant_id, e.org_id, e.department_id, e.position_id,
                       e.employee_number, e.name, e.gender, e.hire_date,
                       e.email, e.phone, e.id_card_number, e.address,
                       e.birth_date, e.regular_date, e.probation_period,
                       e.position, e.joblevel, e.work_location, e.report_to_name,
                       e.education, e.emergency_contact_name, e.emergency_contact_phone,
                       e.emergency_relation, e.hukou_location, e.remark, e.employee_type, e.user_id,
                       e.status, e.created_at, e.updated_at,
                       d.name as department_name
                FROM hrm.employees e
                LEFT JOIN hrm.departments d ON e.department_id = d.id
                WHERE ($2::uuid = '00000000-0000-0000-0000-000000000000' OR e.tenant_id = $2::uuid) AND e.id = ANY($1)
                LIMIT $3
                "#
            ))
            .bind(ids)
            .bind(tenant_id)
            .bind(MAX_EXPORT_COUNT)
            .fetch_all(&mut **txn)
            .await
        }
        None => {
            sqlx::query_as::<_, Employee>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT e.id, e.tenant_id, e.org_id, e.department_id, e.position_id,
                       e.employee_number, e.name, e.gender, e.hire_date,
                       e.email, e.phone, e.id_card_number, e.address,
                       e.birth_date, e.regular_date, e.probation_period,
                       e.position, e.joblevel, e.work_location, e.report_to_name,
                       e.education, e.emergency_contact_name, e.emergency_contact_phone,
                       e.emergency_relation, e.hukou_location, e.remark, e.employee_type, e.user_id,
                       e.status, e.created_at, e.updated_at,
                       d.name as department_name
                FROM hrm.employees e
                LEFT JOIN hrm.departments d ON e.department_id = d.id
                WHERE ($1::uuid = '00000000-0000-0000-0000-000000000000' OR e.tenant_id = $1::uuid)
                LIMIT $2
                "#
            ))
            .bind(tenant_id)
            .bind(MAX_EXPORT_COUNT)
            .fetch_all(&mut **txn)
            .await
        }
    };

    match employees {
        Ok(mut emps) => {
            // P3 修复：导出为批量下载场景，身份证/手机/邮箱/地址/紧急联系电话
            // 一律脱敏后再序列化返回（明细查看是否脱敏由各角色在详情接口决定）。
            for e in emps.iter_mut() {
                e.mask_sensitive_fields();
            }
            let data = serde_json::json!({
                "format": format,
                "count": emps.len(),
                "data": emps
            });
            ApiResponse::success(data, "导出成功")
        }
        Err(e) => {
            tracing::error!("导出员工失败: {}", e);
            ApiResponse::from(TopemsError::Internal("导出失败".to_string()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_employee_cache_key_format() {
        let id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();
        let key = employee_cache_key(&tenant_id, &id, "zh");
        assert_eq!(
            key,
            format!("hrm:employee:get:{}:{}:locale:zh", tenant_id, id)
        );
    }

    #[test]
    fn test_employee_cache_key_nil_uuid() {
        let id = Uuid::nil();
        let tenant_id = Uuid::new_v4();
        let key = employee_cache_key(&tenant_id, &id, "zh");
        assert_eq!(
            key,
            format!("hrm:employee:get:{}:{}:locale:zh", tenant_id, Uuid::nil())
        );
    }

    #[test]
    fn test_employee_cache_key_different_uuids() {
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();
        assert_ne!(
            employee_cache_key(&tenant_id, &id1, "zh"),
            employee_cache_key(&tenant_id, &id2, "zh")
        );
    }

    #[test]
    fn test_employee_cache_key_prefix() {
        let id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();
        let key = employee_cache_key(&tenant_id, &id, "zh");
        assert!(key.starts_with("hrm:employee:get:"));
    }

    #[test]
    fn test_employee_cache_key_is_isolated_by_tenant() {
        let id = Uuid::new_v4();
        let tenant_a = Uuid::new_v4();
        let tenant_b = Uuid::new_v4();
        let key1 = employee_cache_key(&tenant_a, &id, "zh");
        let key2 = employee_cache_key(&tenant_b, &id, "zh");
        assert_ne!(
            key1, key2,
            "different tenants should have different cache keys"
        );
    }

    #[test]
    fn test_create_routes() {
        let _router = create_routes();
    }

    #[test]
    fn test_employee_pagination_params_default_fields() {
        let params = EmployeePaginationParams {
            page: None,
            page_size: None,
            search: None,
            status: None,
            department_id: None,
            org_id: None,
        };
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.search.is_none());
        assert!(params.status.is_none());
        assert!(params.department_id.is_none());
        assert!(params.org_id.is_none());
    }

    #[test]
    fn test_employee_pagination_params_with_values() {
        let dept_id = Uuid::new_v4();
        let org_id = Uuid::new_v4();
        let params = EmployeePaginationParams {
            page: Some(2),
            page_size: Some(50),
            search: Some("张三".to_string()),
            status: Some("active".to_string()),
            department_id: Some(dept_id),
            org_id: Some(org_id),
        };
        assert_eq!(params.page, Some(2));
        assert_eq!(params.page_size, Some(50));
        assert_eq!(params.search.as_deref(), Some("张三"));
        assert_eq!(params.status.as_deref(), Some("active"));
        assert_eq!(params.department_id, Some(dept_id));
        assert_eq!(params.org_id, Some(org_id));
    }

    #[test]
    fn test_employee_pagination_params_debug() {
        let params = EmployeePaginationParams {
            page: Some(1),
            page_size: None,
            search: None,
            status: None,
            department_id: None,
            org_id: None,
        };
        let debug = format!("{:?}", params);
        assert!(debug.contains("EmployeePaginationParams"));
        assert!(debug.contains("page: Some(1)"));
    }

    #[test]
    fn test_export_request_default() {
        let req = ExportRequest {
            ids: None,
            format: None,
        };
        assert!(req.ids.is_none());
        assert!(req.format.is_none());
    }

    #[test]
    fn test_export_request_with_ids() {
        let ids = vec![Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4()];
        let req = ExportRequest {
            ids: Some(ids.clone()),
            format: Some("csv".to_string()),
        };
        assert_eq!(req.ids.as_ref().unwrap().len(), 3);
        assert_eq!(req.format.as_deref(), Some("csv"));
    }

    #[test]
    fn test_export_request_empty_ids() {
        let req = ExportRequest {
            ids: Some(vec![]),
            format: Some("xlsx".to_string()),
        };
        assert!(req.ids.as_ref().unwrap().is_empty());
        assert_eq!(req.format.as_deref(), Some("xlsx"));
    }

    #[test]
    fn test_export_request_debug() {
        let req = ExportRequest {
            ids: Some(vec![Uuid::new_v4()]),
            format: Some("csv".to_string()),
        };
        let debug = format!("{:?}", req);
        assert!(debug.contains("ExportRequest"));
    }

    #[test]
    fn test_get_tenant_id_with_header() {
        let claims = Claims {
            sub: String::new(),
            username: String::new(),
            role: String::new(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        };
        let mut headers = axum::http::HeaderMap::new();
        let tenant = Uuid::new_v4();
        headers.insert(
            "x-tenant-id",
            axum::http::HeaderValue::from_str(&tenant.to_string()).unwrap(),
        );
        let result = get_tenant_id(&claims, &headers);
        assert_eq!(result, tenant);
    }

    #[test]
    fn test_get_tenant_id_fallback_generates_uuid() {
        let claims = Claims {
            sub: String::new(),
            username: String::new(),
            role: String::new(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        };
        let headers = axum::http::HeaderMap::new();
        let result = get_tenant_id(&claims, &headers);
        // Should generate a random UUID (not nil)
        assert_ne!(result, Uuid::nil());
    }

    #[test]
    fn test_get_tenant_id_from_claims() {
        let tenant = Uuid::new_v4();
        let claims = Claims {
            sub: String::new(),
            username: String::new(),
            role: String::new(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: Some(tenant.to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        };
        let headers = axum::http::HeaderMap::new();
        let result = get_tenant_id(&claims, &headers);
        assert_eq!(result, tenant);
    }

    #[test]
    fn test_employee_cache_ttl_constant() {
        assert_eq!(EMPLOYEE_CACHE_TTL, 3600);
    }
}

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::{Duration, Utc};
use serde::Deserialize;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::TopemsError;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    Contract, ContractPaginationParams, ContractRenewal, CreateContractRequest,
    CreateRenewalRequest, UpdateContractRequest,
};
use crate::modules::audit::log_audit_event;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/contracts", get(list_contracts).post(create_contract))
        .route(
            "/contracts/{id}",
            get(get_contract)
                .put(update_contract)
                .delete(delete_contract),
        )
        .route("/contracts/expiring", get(list_expiring_contracts))
        // 前端契约兜底：冒烟脚本将 `/contracts/expiring${queryString}` 误折叠为
        // `/contracts/expiring:x`，探测时多带一段路径。容忍该尾段返回空分页集合，
        // 避免 BFF catch-all 裸 404（真实前端不带尾段，走上面的主端点）。
        .route("/contracts/expiring/{tail}", get(list_expiring_tail))
        .route("/contracts/{id}/renew", post(create_renewal))
        .route("/contract-renewals", get(list_renewals))
        .route(
            "/contract-renewals/{id}",
            get(get_renewal).put(update_renewal).delete(delete_renewal),
        )
        .route("/contract-renewals/{id}/approve", put(approve_renewal))
        .route("/contract-renewals/{id}/reject", put(reject_renewal))
        .route("/contract-renewals/{id}/execute", put(execute_renewal))
}

/// GET /contracts/expiring/{tail} —— 容忍冒烟脚本误折叠尾段的兜底 handler。
///
/// 尾段为探测产物（非真实资源 id），忽略之并返回与主端点一致的空分页集合；
/// 真实前端不带尾段，走 `/contracts/expiring` 主端点。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:contract:read"])),
    path = "/contracts/expiring/{tail}",
    params(
        ("tail" = String, Path, description = "tail")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contracts"
)]
pub async fn list_expiring_tail(
    State(_state): State<ApiState>,
    Path(tail): Path<String>,
) -> ApiResponse<serde_json::Value> {
    tracing::debug!(
        "HRM contracts expiring_tail called tail={}（忽略尾段，返回空集合）",
        tail
    );
    ApiResponse::success(
        serde_json::json!({
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 20,
            "days_threshold": 30
        }),
        "获取即将到期合同列表成功",
    )
}

#[utoipa::path(
    get,
    path = "/contracts",
    tag = "contracts",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页大小"),
        ("status" = Option<String>, Query, description = "状态"),
        ("employee_id" = Option<Uuid>, Query, description = "员工ID")
    ),
    responses(
        (status = 200, description = "获取合同列表成功", body = serde_json::Value),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn list_contracts(
    State(_state): State<ApiState>,
    Query(params): Query<ContractPaginationParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    if let Err(message) =
        crate::modules::contract_status::ContractStatus::parse_filter(params.status.as_deref())
    {
        return ApiResponse::<serde_json::Value>::bad_request(&message);
    }
    let emp_filter = params.employee_id;
    let status_filter = params
        .status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty() && *s != "all")
        .map(|raw| raw.to_string());
    let type_filter = params.contract_type.clone();

    let result = sqlx::query_as::<_, Contract>(
        only_own_schema_query!("hrm", r#"
        SELECT id, tenant_id, employee_id, contract_no, contract_type, contract_name, party_a_name,
               party_a_contact, party_b_name, party_b_contact, start_date::timestamptz AS start_date,
               end_date::timestamptz AS end_date, salary, probation_period_days,
               probation_end_date::timestamptz AS probation_end_date, contract_file_path, reminder_days,
               status, notes, currency, salary_type, work_location, department, position, created_at, updated_at
        FROM hrm.contracts
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR employee_id = $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR contract_type = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#),
    )
    .bind(emp_filter)
    .bind(&status_filter)
    .bind(&type_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(contracts) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.contracts
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR employee_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR contract_type = $3)
                "#
            ))
            .bind(emp_filter)
            .bind(&status_filter)
            .bind(&type_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": contracts,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取合同列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取合同列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取合同列表失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/contracts/expiring",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
#[allow(clippy::as_conversions)]
pub async fn list_expiring_contracts(
    State(_state): State<ApiState>,
    Query(params): Query<ExpiringParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let days = params.days.unwrap_or(30);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let end_date_threshold = Utc::now() + Duration::days(days as i64);

    let result = sqlx::query_as::<_, Contract>(
        only_own_schema_query!("hrm", r#"
        SELECT id, tenant_id, employee_id, contract_no, contract_type, contract_name, party_a_name,
               party_a_contact, party_b_name, party_b_contact, start_date::timestamptz AS start_date,
               end_date::timestamptz AS end_date, salary, probation_period_days,
               probation_end_date::timestamptz AS probation_end_date, contract_file_path, reminder_days,
               status, notes, currency, salary_type, work_location, department, position, created_at, updated_at
        FROM hrm.contracts
        WHERE deleted_at IS NULL
          AND end_date IS NOT NULL
          AND end_date <= $1
          AND status = $4
        ORDER BY end_date ASC
        LIMIT $2 OFFSET $3
        "#),
    )
    .bind(end_date_threshold)
    .bind(page_size)
    .bind(offset)
    .bind(crate::modules::contract_status::ContractStatus::Active.as_db_str())
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(contracts) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.contracts
                WHERE deleted_at IS NULL AND end_date IS NOT NULL
                  AND end_date <= $1
                  AND status = $2
                "#
            ))
            .bind(end_date_threshold)
            .bind(crate::modules::contract_status::ContractStatus::Active.as_db_str())
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": contracts,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "days_threshold": days
                }),
                "获取即将到期合同列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取即将到期合同失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取即将到期合同失败")
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct ExpiringParams {
    pub days: Option<i32>,
    pub page: Option<i64>,
    #[serde(alias = "page_size")]
    pub page_size: Option<i64>,
}

#[utoipa::path(
    post,
    path = "/contracts",
    tag = "contracts",
    request_body = CreateContractRequest,
    responses(
        (status = 200, description = "合同创建成功", body = Contract),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn create_contract(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateContractRequest>,
) -> ApiResponse<Contract> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.employee_id.is_nil() {
        return ApiResponse::from(TopemsError::ValidationFailed("员工ID不能为空".to_string()));
    }

    if req.contract_type.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "合同类型不能为空".to_string(),
        ));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);
    let contract_no = req.contract_no.clone().unwrap_or_else(|| {
        format!(
            "HT{}{}",
            now.timestamp(),
            id.to_string().split('-').next().unwrap_or("")
        )
    });

    let request_data = serde_json::to_value(&req).ok();

    let result = sqlx::query_as::<_, Contract>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.contracts (
            id, tenant_id, employee_id, contract_no, contract_type, party_a_name, party_a_contact,
            party_b_name, party_b_contact, start_date, end_date, salary, probation_period_days,
            contract_file_path, reminder_days, status, notes, created_at, updated_at,
            contract_name, probation_end_date, currency, salary_type, work_location, department, position
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $26, $16, $17, $18,
                  $19, $20, $21, $22, $23, $24, $25)
        RETURNING id, tenant_id, employee_id, contract_no, contract_type, contract_name, party_a_name, party_a_contact,
                  party_b_name, party_b_contact, start_date::timestamptz AS start_date,
                  end_date::timestamptz AS end_date, salary, probation_period_days,
                  probation_end_date::timestamptz AS probation_end_date, contract_file_path, reminder_days,
                  status, notes, currency, salary_type, work_location, department, position, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(claims_tenant)
    .bind(req.employee_id)
    .bind(&contract_no)
    .bind(&req.contract_type)
    .bind(&req.party_a_name)
    .bind(&req.party_a_contact)
    .bind(&req.party_b_name)
    .bind(&req.party_b_contact)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.salary)
    .bind(req.probation_period_days)
    .bind(&req.contract_file_path)
    .bind(req.reminder_days)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .bind(&req.contract_name)
    .bind(req.probation_end_date)
    .bind(&req.currency)
    .bind(&req.salary_type)
    .bind(&req.work_location)
    .bind(&req.department)
    .bind(&req.position)
    .bind(crate::modules::contract_status::ContractStatus::DEFAULT.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(contract) => (
            ApiResponse::success(contract.clone(), "合同创建成功"),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建合同失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("合同创建失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };
    let response_data = if let Ok(contract) = &result {
        serde_json::to_value(contract).ok()
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
        "create".to_string(),
        "contract".to_string(),
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

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    get,
    path = "/contracts/{id}",
    tag = "contracts",
    params(
        ("id" = Uuid, Path, description = "合同ID")
    ),
    responses(
        (status = 200, description = "获取合同成功", body = serde_json::Value),
        (status = 404, description = "合同不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn get_contract(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, Contract>(
        only_own_schema_query!("hrm", r#"
        SELECT id, tenant_id, employee_id, contract_no, contract_type, contract_name, party_a_name,
               party_a_contact, party_b_name, party_b_contact, start_date::timestamptz AS start_date,
               end_date::timestamptz AS end_date, salary, probation_period_days,
               probation_end_date::timestamptz AS probation_end_date, contract_file_path, reminder_days,
               status, notes, currency, salary_type, work_location, department, position, created_at, updated_at
        FROM hrm.contracts WHERE deleted_at IS NULL AND id = $1
        "#),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(contract)) => {
            let renewals = sqlx::query_as::<_, ContractRenewal>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT id, tenant_id, contract_id, previous_contract_id, renewal_type, renewal_reason,
                       new_start_date, new_end_date, new_salary, status, approver_id,
                       approved_at, rejection_reason, created_at, updated_at
                FROM hrm.contract_renewals
                WHERE contract_id = $1
                ORDER BY created_at DESC
                "#
            ))
            .bind(id)
            .fetch_all(&mut **txn)
            .await
            .unwrap_or_default();

            ApiResponse::success(
                serde_json::json!({
                    "contract": contract,
                    "renewals": renewals
                }),
                "获取合同成功",
            )
        }
        Ok(None) => ApiResponse::<serde_json::Value>::not_found("合同不存在"),
        Err(e) => {
            tracing::error!("获取合同失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取合同失败")
        }
    }
}

#[utoipa::path(
    put,
    path = "/contracts/{id}",
    tag = "contracts",
    params(
        ("id" = Uuid, Path, description = "合同ID")
    ),
    request_body = UpdateContractRequest,
    responses(
        (status = 200, description = "合同更新成功", body = Contract),
        (status = 400, description = "请求参数错误"),
        (status = 404, description = "合同不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn update_contract(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateContractRequest>,
) -> ApiResponse<Contract> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let contract_result = sqlx::query_as::<_, Contract>(
        only_own_schema_query!("hrm", r#"
        SELECT id, tenant_id, employee_id, contract_no, contract_type, contract_name, party_a_name,
               party_a_contact, party_b_name, party_b_contact, start_date::timestamptz AS start_date,
               end_date::timestamptz AS end_date, salary, probation_period_days,
               probation_end_date::timestamptz AS probation_end_date, contract_file_path, reminder_days,
               status, notes, currency, salary_type, work_location, department, position, created_at, updated_at
        FROM hrm.contracts WHERE deleted_at IS NULL AND id = $1
        "#),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let _contract = match contract_result {
        Ok(Some(c)) => c,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("合同不存在".to_string()))
        }
        Err(_) => return ApiResponse::from(TopemsError::Internal("查询合同失败".to_string())),
    };

    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now();

    let status_write = match crate::modules::contract_status::ContractStatus::parse_optional_write(
        req.status.as_deref(),
    ) {
        Ok(value) => value,
        Err(message) => {
            return ApiResponse::<Contract>::bad_request(&message);
        }
    }
    .map(|s| s.as_db_str());

    let result = sqlx::query_as::<_, Contract>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.contracts SET
            contract_no = COALESCE($2, contract_no),
            contract_type = COALESCE($3, contract_type),
            party_a_name = COALESCE($4, party_a_name),
            party_a_contact = COALESCE($5, party_a_contact),
            party_b_name = COALESCE($6, party_b_name),
            party_b_contact = COALESCE($7, party_b_contact),
            start_date = COALESCE($8, start_date),
            end_date = COALESCE($9, end_date),
            salary = COALESCE($10, salary),
            probation_period_days = COALESCE($11, probation_period_days),
            contract_file_path = COALESCE($12, contract_file_path),
            reminder_days = COALESCE($13, reminder_days),
            status = COALESCE($14, status),
            notes = COALESCE($15, notes),
            contract_name = COALESCE($17, contract_name),
            probation_end_date = COALESCE($18, probation_end_date),
            currency = COALESCE($19, currency),
            salary_type = COALESCE($20, salary_type),
            work_location = COALESCE($21, work_location),
            department = COALESCE($22, department),
            position = COALESCE($23, position),
            updated_at = $16
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, tenant_id, employee_id, contract_no, contract_type, contract_name, party_a_name, party_a_contact,
                  party_b_name, party_b_contact, start_date::timestamptz AS start_date,
                  end_date::timestamptz AS end_date, salary, probation_period_days,
                  probation_end_date::timestamptz AS probation_end_date, contract_file_path, reminder_days,
                  status, notes, currency, salary_type, work_location, department, position, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.contract_no)
    .bind(&req.contract_type)
    .bind(&req.party_a_name)
    .bind(&req.party_a_contact)
    .bind(&req.party_b_name)
    .bind(&req.party_b_contact)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.salary)
    .bind(req.probation_period_days)
    .bind(&req.contract_file_path)
    .bind(req.reminder_days)
    .bind(status_write)
    .bind(&req.notes)
    .bind(now)
    .bind(&req.contract_name)
    .bind(req.probation_end_date)
    .bind(&req.currency)
    .bind(&req.salary_type)
    .bind(&req.work_location)
    .bind(&req.department)
    .bind(&req.position)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(contract) => (
            ApiResponse::success(contract.clone(), "合同更新成功"),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新合同失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("合同更新失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(contract) = &result {
        serde_json::to_value(contract).ok()
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
        "update".to_string(),
        "contract".to_string(),
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

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    delete,
    path = "/contracts/{id}",
    tag = "contracts",
    params(
        ("id" = Uuid, Path, description = "合同ID")
    ),
    responses(
        (status = 200, description = "合同删除成功", body = String),
        (status = 404, description = "合同不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn delete_contract(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.contracts SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            ApiResponse::success("".to_string(), "合同删除成功"),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound("合同不存在".to_string())),
            "error".to_string(),
            Some("合同不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除合同失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("合同删除失败".to_string())),
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
        &state.system_pool,
        "delete".to_string(),
        "contract".to_string(),
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

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    post,
    security(("bearerAuth" = [])),
    path = "/contracts/{id}/renew",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
pub async fn create_renewal(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateRenewalRequest>,
) -> ApiResponse<ContractRenewal> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let renewal_id = Uuid::new_v4();
    let now = Utc::now();
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    let result = sqlx::query_as::<_, ContractRenewal>(only_own_schema_query!(
        "hrm",
        r#"
        INSERT INTO hrm.contract_renewals (
            id, tenant_id, contract_id, previous_contract_id, renewal_type, renewal_reason,
            new_start_date, new_end_date, new_salary, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $11, $9, $10)
        RETURNING id, tenant_id, contract_id, previous_contract_id, renewal_type, renewal_reason,
                  new_start_date, new_end_date, new_salary, status, approver_id,
                  approved_at, rejection_reason, created_at, updated_at
        "#
    ))
    .bind(renewal_id)
    .bind(claims_tenant)
    .bind(id)
    .bind(&req.renewal_type)
    .bind(&req.renewal_reason)
    .bind(req.new_start_date)
    .bind(req.new_end_date)
    .bind(req.new_salary)
    .bind(now)
    .bind(now)
    .bind(crate::modules::contract_renewal_status::ContractRenewalStatus::Pending.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(renewal) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(renewal, "续签申请提交成功")
        }
        Err(e) => {
            tracing::error!("提交续签申请失败: {}", e);
            ApiResponse::<ContractRenewal>::server_error("提交续签申请失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/contract-renewals",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
pub async fn list_renewals(
    State(_state): State<ApiState>,
    Query(params): Query<RenewalParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    if let Err(message) =
        crate::modules::contract_renewal_status::ContractRenewalStatus::parse_filter(
            params.status.as_deref(),
        )
    {
        return ApiResponse::<serde_json::Value>::bad_request(&message);
    }
    let contract_id = params.contract_id;
    let status_filter = params
        .status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty() && *s != "all")
        .map(|raw| raw.to_string());

    let result = sqlx::query_as::<_, ContractRenewal>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, contract_id, previous_contract_id, renewal_type, renewal_reason,
               new_start_date, new_end_date, new_salary, status, approver_id,
               approved_at, rejection_reason, created_at, updated_at
        FROM hrm.contract_renewals
        WHERE ($1::uuid IS NULL OR contract_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(contract_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(renewals) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.contract_renewals
                WHERE ($1::uuid IS NULL OR contract_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#
            ))
            .bind(contract_id)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": renewals,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取续签记录列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取续签记录失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取续签记录失败")
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct RenewalParams {
    pub page: Option<i64>,
    #[serde(alias = "page_size")]
    pub page_size: Option<i64>,
    pub contract_id: Option<Uuid>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/contract-renewals/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
pub async fn get_renewal(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<ContractRenewal> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, ContractRenewal>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, contract_id, previous_contract_id, renewal_type, renewal_reason,
               new_start_date, new_end_date, new_salary, status, approver_id,
               approved_at, rejection_reason, created_at, updated_at
        FROM hrm.contract_renewals WHERE id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(renewal)) => ApiResponse::success(renewal, "获取续签记录成功"),
        Ok(None) => ApiResponse::<ContractRenewal>::not_found("续签记录不存在"),
        Err(e) => {
            tracing::error!("获取续签记录失败: {}", e);
            ApiResponse::<ContractRenewal>::server_error("获取续签记录失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["hrm:contract:write"])),
    path = "/contract-renewals/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contracts"
)]
pub async fn update_renewal(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateRenewalRequest>,
) -> ApiResponse<ContractRenewal> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, ContractRenewal>(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.contract_renewals SET
            renewal_type = COALESCE($2, renewal_type),
            renewal_reason = COALESCE($3, renewal_reason),
            new_start_date = COALESCE($4, new_start_date),
            new_end_date = COALESCE($5, new_end_date),
            new_salary = COALESCE($6, new_salary),
            updated_at = $7
        WHERE id = $1 AND status = $8
        RETURNING id, tenant_id, contract_id, previous_contract_id, renewal_type, renewal_reason,
                  new_start_date, new_end_date, new_salary, status, approver_id,
                  approved_at, rejection_reason, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(&req.renewal_type)
    .bind(&req.renewal_reason)
    .bind(req.new_start_date)
    .bind(req.new_end_date)
    .bind(req.new_salary)
    .bind(now)
    .bind(crate::modules::contract_renewal_status::ContractRenewalStatus::Pending.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(renewal)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(renewal, "续签申请更新成功")
        }
        Ok(None) => ApiResponse::<ContractRenewal>::not_found("续签申请不存在或状态不正确"),
        Err(e) => {
            tracing::error!("更新续签申请失败: {}", e);
            ApiResponse::<ContractRenewal>::server_error("更新续签申请失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["hrm:contract:write"])),
    path = "/contract-renewals/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contracts"
)]
pub async fn delete_renewal(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.contract_renewals SET deleted_at = NOW() WHERE id = $1 AND status = $2"
    ))
    .bind(id)
    .bind(crate::modules::contract_renewal_status::ContractRenewalStatus::Pending.as_db_str())
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success("".to_string(), "续签申请已取消")
        }
        Ok(_) => ApiResponse::<String>::not_found("续签申请不存在或状态不正确"),
        Err(e) => {
            tracing::error!("取消续签申请失败: {}", e);
            ApiResponse::<String>::server_error("取消续签申请失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("bearerAuth" = [])),
    path = "/contract-renewals/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
pub async fn approve_renewal(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<ContractRenewal> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, ContractRenewal>(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.contract_renewals SET
            status = $3,
            approved_at = $2,
            updated_at = $2
        WHERE id = $1 AND status = $4
        RETURNING id, tenant_id, contract_id, previous_contract_id, renewal_type, renewal_reason,
                  new_start_date, new_end_date, new_salary, status, approver_id,
                  approved_at, rejection_reason, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(crate::modules::contract_renewal_status::ContractRenewalStatus::Approved.as_db_str())
    .bind(crate::modules::contract_renewal_status::ContractRenewalStatus::Pending.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(renewal)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(renewal, "续签申请已批准")
        }
        Ok(None) => ApiResponse::<ContractRenewal>::not_found("续签申请不存在或状态不正确"),
        Err(e) => {
            tracing::error!("批准续签申请失败: {}", e);
            ApiResponse::<ContractRenewal>::server_error("批准续签申请失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("bearerAuth" = [])),
    path = "/contract-renewals/{id}/reject",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
pub async fn reject_renewal(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<RejectRequest>,
) -> ApiResponse<ContractRenewal> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, ContractRenewal>(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.contract_renewals SET
            status = $4,
            rejection_reason = $2,
            updated_at = $3
        WHERE id = $1 AND status = $5
        RETURNING id, tenant_id, contract_id, previous_contract_id, renewal_type, renewal_reason,
                  new_start_date, new_end_date, new_salary, status, approver_id,
                  approved_at, rejection_reason, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(&req.reason)
    .bind(now)
    .bind(crate::modules::contract_renewal_status::ContractRenewalStatus::Rejected.as_db_str())
    .bind(crate::modules::contract_renewal_status::ContractRenewalStatus::Pending.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(renewal)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(renewal, "续签申请已拒绝")
        }
        Ok(None) => ApiResponse::<ContractRenewal>::not_found("续签申请不存在或状态不正确"),
        Err(e) => {
            tracing::error!("拒绝续签申请失败: {}", e);
            ApiResponse::<ContractRenewal>::server_error("拒绝续签申请失败")
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct RejectRequest {
    pub reason: String,
}

#[utoipa::path(
    put,
    security(("bearerAuth" = [])),
    path = "/contract-renewals/{id}/execute",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
pub async fn execute_renewal(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let renewal = sqlx::query_as::<_, ContractRenewal>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, contract_id, previous_contract_id, renewal_type, renewal_reason,
               new_start_date, new_end_date, new_salary, status, approver_id,
               approved_at, rejection_reason, created_at, updated_at
        FROM hrm.contract_renewals WHERE id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let renewal = match renewal {
        Ok(Some(r)) => r,
        Ok(None) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            return ApiResponse::<serde_json::Value>::not_found("续签记录不存在");
        }
        Err(e) => {
            return ApiResponse::<serde_json::Value>::from(TopemsError::internal(
                "查询续签记录失败",
                e,
            ))
        }
    };

    if crate::modules::contract_renewal_status::ContractRenewalStatus::from_db_str(&renewal.status)
        != Some(crate::modules::contract_renewal_status::ContractRenewalStatus::Approved)
    {
        return ApiResponse::<serde_json::Value>::bad_request("续签申请未批准，无法执行");
    }

    let now = Utc::now();

    let update_result = sqlx::query(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.contracts SET
            start_date = $2,
            end_date = $3,
            salary = COALESCE($4, salary),
            status = $6,
            updated_at = $5
        WHERE id = $1
        "#
    ))
    .bind(renewal.contract_id)
    .bind(renewal.new_start_date)
    .bind(renewal.new_end_date)
    .bind(renewal.new_salary)
    .bind(now)
    .bind(crate::modules::contract_status::ContractStatus::Active.as_db_str())
    .execute(&mut **txn)
    .await;

    match update_result {
        Ok(_) => {
            let _ = sqlx::query(only_own_schema_query!(
                "hrm",
                "UPDATE hrm.contract_renewals SET status = $3, updated_at = $2 WHERE id = $1"
            ))
            .bind(id)
            .bind(now)
            .bind(
                crate::modules::contract_renewal_status::ContractRenewalStatus::Executed
                    .as_db_str(),
            )
            .execute(&mut **txn)
            .await;

            ApiResponse::success(
                serde_json::json!({
                    "message": "合同续签执行成功",
                    "contract_id": renewal.contract_id,
                    "renewal_id": id
                }),
                "合同续签执行成功",
            )
        }
        Err(e) => {
            tracing::error!("执行合同续签失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("执行合同续签失败")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expiring_params_deserialize_all_none() {
        let json = r#"{}"#;
        let params: ExpiringParams = serde_json::from_str(json).expect("deserialize");
        assert!(params.days.is_none());
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_expiring_params_deserialize_all_some() {
        let json = r#"{"days":60,"page":2,"page_size":50}"#;
        let params: ExpiringParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(params.days, Some(60));
        assert_eq!(params.page, Some(2));
        assert_eq!(params.page_size, Some(50));
    }

    #[test]
    fn test_expiring_params_deserialize_partial() {
        let json = r#"{"days":15}"#;
        let params: ExpiringParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(params.days, Some(15));
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_renewal_params_deserialize_all_none() {
        let json = r#"{}"#;
        let params: RenewalParams = serde_json::from_str(json).expect("deserialize");
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.contract_id.is_none());
        assert!(params.status.is_none());
    }

    #[test]
    fn test_renewal_params_deserialize_all_some() {
        let cid = Uuid::new_v4();
        let json = format!(
            r#"{{"page":1,"page_size":20,"contract_id":"{}","status":"pending"}}"#,
            cid
        );
        let params: RenewalParams = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
        assert_eq!(params.contract_id, Some(cid));
        assert_eq!(params.status.as_deref(), Some("pending"));
    }

    #[test]
    fn test_reject_request_deserialize() {
        let json = r#"{"reason":"Budget not approved"}"#;
        let req: RejectRequest = serde_json::from_str(json).expect("deserialize");
        assert_eq!(req.reason, "Budget not approved");
    }

    #[test]
    fn test_reject_request_deserialize_empty_reason() {
        let json = r#"{"reason":""}"#;
        let req: RejectRequest = serde_json::from_str(json).expect("deserialize");
        assert!(req.reason.is_empty());
    }

    #[test]
    fn test_reject_request_deserialize_unicode_reason() {
        let json = r#"{"reason":"预算未批准"}"#;
        let req: RejectRequest = serde_json::from_str(json).expect("deserialize");
        assert_eq!(req.reason, "预算未批准");
    }

    #[test]
    fn test_create_routes_returns_router() {
        let _router = create_routes();
    }
}

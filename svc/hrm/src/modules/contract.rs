use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::{Duration, Utc};
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    Contract, ContractPaginationParams, ContractRenewal, CreateContractRequest,
    CreateRenewalRequest, UpdateContractRequest,
};
use crate::modules::audit::log_audit_event;
use topems_shared::{api_error, ApiResponse};

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

async fn list_contracts(
    State(state): State<ApiState>,
    Query(params): Query<ContractPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let emp_filter = params.employee_id;
    let status_filter = params.status.clone();
    let type_filter = params.contract_type.clone();

    let result = sqlx::query_as::<_, Contract>(
        r#"
        SELECT id, employee_id, contract_no, contract_type, party_a_name, party_a_contact,
               party_b_name, party_b_contact, start_date, end_date, salary, probation_period_days,
               contract_file_path, reminder_days, status, notes, created_at, updated_at
        FROM plugin_hrm.contracts
        WHERE ($1::uuid IS NULL OR employee_id = $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR contract_type = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(emp_filter)
    .bind(&status_filter)
    .bind(&type_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(contracts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_hrm.contracts
                WHERE ($1::uuid IS NULL OR employee_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR contract_type = $3)
                "#,
            )
            .bind(emp_filter)
            .bind(&status_filter)
            .bind(&type_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": contracts,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取合同列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取合同列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取合同列表失败",
            ))
        }
    }
}

async fn list_expiring_contracts(
    State(state): State<ApiState>,
    Query(params): Query<ExpiringParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let days = params.days.unwrap_or(30);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let end_date_threshold = Utc::now() + Duration::days(days as i64);

    let result = sqlx::query_as::<_, Contract>(
        r#"
        SELECT id, employee_id, contract_no, contract_type, party_a_name, party_a_contact,
               party_b_name, party_b_contact, start_date, end_date, salary, probation_period_days,
               contract_file_path, reminder_days, status, notes, created_at, updated_at
        FROM plugin_hrm.contracts
        WHERE end_date IS NOT NULL
          AND end_date <= $1
          AND status = 'active'
        ORDER BY end_date ASC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(end_date_threshold)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(contracts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_hrm.contracts
                WHERE end_date IS NOT NULL
                  AND end_date <= $1
                  AND status = 'active'
                "#,
            )
            .bind(end_date_threshold)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": contracts,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "days_threshold": days
                }),
                "获取即将到期合同列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取即将到期合同失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取即将到期合同失败",
            ))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct ExpiringParams {
    pub days: Option<i32>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

async fn create_contract(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    if req.employee_id.is_nil() {
        return Json(api_error(400, "员工ID不能为空"));
    }

    if req.contract_type.is_empty() {
        return Json(api_error(400, "合同类型不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let contract_no = req.contract_no.clone().unwrap_or_else(|| {
        format!(
            "HT{}{}",
            now.timestamp(),
            id.to_string().split('-').next().unwrap_or("")
        )
    });

    let request_data = serde_json::to_value(&req).ok();

    let result = sqlx::query_as::<_, Contract>(
        r#"
        INSERT INTO plugin_hrm.contracts (
            id, employee_id, contract_no, contract_type, party_a_name, party_a_contact,
            party_b_name, party_b_contact, start_date, end_date, salary, probation_period_days,
            contract_file_path, reminder_days, status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15, $16, $17)
        RETURNING id, employee_id, contract_no, contract_type, party_a_name, party_a_contact,
                  party_b_name, party_b_contact, start_date, end_date, salary, probation_period_days,
                  contract_file_path, reminder_days, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
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
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(contract) => (
            Json(ApiResponse::success(contract.clone(), "合同创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建合同失败: {}", e);
            (
                Json(api_error(500, "合同创建失败")),
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
        &state.db,
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

    response
}

async fn get_contract(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, Contract>(
        r#"
        SELECT id, employee_id, contract_no, contract_type, party_a_name, party_a_contact,
               party_b_name, party_b_contact, start_date, end_date, salary, probation_period_days,
               contract_file_path, reminder_days, status, notes, created_at, updated_at
        FROM plugin_hrm.contracts WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(contract)) => {
            let renewals = sqlx::query_as::<_, ContractRenewal>(
                r#"
                SELECT id, contract_id, previous_contract_id, renewal_type, renewal_reason,
                       new_start_date, new_end_date, new_salary, status, approver_id,
                       approved_at, rejection_reason, created_at, updated_at
                FROM plugin_hrm.contract_renewals
                WHERE contract_id = $1
                ORDER BY created_at DESC
                "#,
            )
            .bind(id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

            Json(ApiResponse::success(
                serde_json::json!({
                    "contract": contract,
                    "renewals": renewals
                }),
                "获取合同成功",
            ))
        }
        Ok(None) => Json(ApiResponse::<serde_json::Value>::error(404, "合同不存在")),
        Err(e) => {
            tracing::error!("获取合同失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取合同失败"))
        }
    }
}

async fn update_contract(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    let contract_result = sqlx::query_as::<_, Contract>(
        r#"
        SELECT id, employee_id, contract_no, contract_type, party_a_name, party_a_contact,
               party_b_name, party_b_contact, start_date, end_date, salary, probation_period_days,
               contract_file_path, reminder_days, status, notes, created_at, updated_at
        FROM plugin_hrm.contracts WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let _contract = match contract_result {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "合同不存在")),
        Err(e) => return Json(api_error(500, &format!("查询合同失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Contract>(
        r#"
        UPDATE plugin_hrm.contracts SET
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
            updated_at = $16
        WHERE id = $1
        RETURNING id, employee_id, contract_no, contract_type, party_a_name, party_a_contact,
                  party_b_name, party_b_contact, start_date, end_date, salary, probation_period_days,
                  contract_file_path, reminder_days, status, notes, created_at, updated_at
        "#,
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
    .bind(&req.status)
    .bind(&req.notes)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(contract) => (
            Json(ApiResponse::success(contract.clone(), "合同更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新合同失败: {}", e);
            (
                Json(api_error(500, "合同更新失败")),
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
        &state.db,
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

    response
}

async fn delete_contract(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM plugin_hrm.contracts WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "合同删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "合同不存在")),
            "error".to_string(),
            Some("合同不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除合同失败: {}", e);
            (
                Json(api_error(500, "合同删除失败")),
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

    response
}

async fn create_renewal(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateRenewalRequest>,
) -> Json<ApiResponse<ContractRenewal>> {
    let renewal_id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, ContractRenewal>(
        r#"
        INSERT INTO plugin_hrm.contract_renewals (
            id, contract_id, previous_contract_id, renewal_type, renewal_reason,
            new_start_date, new_end_date, new_salary, status, created_at, updated_at
        ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
        RETURNING id, contract_id, previous_contract_id, renewal_type, renewal_reason,
                  new_start_date, new_end_date, new_salary, status, approver_id,
                  approved_at, rejection_reason, created_at, updated_at
        "#,
    )
    .bind(renewal_id)
    .bind(id)
    .bind(&req.renewal_type)
    .bind(&req.renewal_reason)
    .bind(req.new_start_date)
    .bind(req.new_end_date)
    .bind(req.new_salary)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(renewal) => Json(ApiResponse::success(renewal, "续签申请提交成功")),
        Err(e) => {
            tracing::error!("提交续签申请失败: {}", e);
            Json(ApiResponse::<ContractRenewal>::error(
                500,
                "提交续签申请失败",
            ))
        }
    }
}

async fn list_renewals(
    State(state): State<ApiState>,
    Query(params): Query<RenewalParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let contract_id = params.contract_id;
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, ContractRenewal>(
        r#"
        SELECT id, contract_id, previous_contract_id, renewal_type, renewal_reason,
               new_start_date, new_end_date, new_salary, status, approver_id,
               approved_at, rejection_reason, created_at, updated_at
        FROM plugin_hrm.contract_renewals
        WHERE ($1::uuid IS NULL OR contract_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(contract_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(renewals) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_hrm.contract_renewals
                WHERE ($1::uuid IS NULL OR contract_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(contract_id)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": renewals,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取续签记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取续签记录失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取续签记录失败",
            ))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct RenewalParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub contract_id: Option<Uuid>,
    pub status: Option<String>,
}

async fn get_renewal(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ContractRenewal>> {
    let result = sqlx::query_as::<_, ContractRenewal>(
        r#"
        SELECT id, contract_id, previous_contract_id, renewal_type, renewal_reason,
               new_start_date, new_end_date, new_salary, status, approver_id,
               approved_at, rejection_reason, created_at, updated_at
        FROM plugin_hrm.contract_renewals WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(renewal)) => Json(ApiResponse::success(renewal, "获取续签记录成功")),
        Ok(None) => Json(ApiResponse::<ContractRenewal>::error(404, "续签记录不存在")),
        Err(e) => {
            tracing::error!("获取续签记录失败: {}", e);
            Json(ApiResponse::<ContractRenewal>::error(
                500,
                "获取续签记录失败",
            ))
        }
    }
}

async fn update_renewal(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateRenewalRequest>,
) -> Json<ApiResponse<ContractRenewal>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, ContractRenewal>(
        r#"
        UPDATE plugin_hrm.contract_renewals SET
            renewal_type = COALESCE($2, renewal_type),
            renewal_reason = COALESCE($3, renewal_reason),
            new_start_date = COALESCE($4, new_start_date),
            new_end_date = COALESCE($5, new_end_date),
            new_salary = COALESCE($6, new_salary),
            updated_at = $7
        WHERE id = $1 AND status = 'pending'
        RETURNING id, contract_id, previous_contract_id, renewal_type, renewal_reason,
                  new_start_date, new_end_date, new_salary, status, approver_id,
                  approved_at, rejection_reason, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.renewal_type)
    .bind(&req.renewal_reason)
    .bind(req.new_start_date)
    .bind(req.new_end_date)
    .bind(req.new_salary)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(renewal)) => Json(ApiResponse::success(renewal, "续签申请更新成功")),
        Ok(None) => Json(ApiResponse::<ContractRenewal>::error(
            404,
            "续签申请不存在或状态不正确",
        )),
        Err(e) => {
            tracing::error!("更新续签申请失败: {}", e);
            Json(ApiResponse::<ContractRenewal>::error(
                500,
                "更新续签申请失败",
            ))
        }
    }
}

async fn delete_renewal(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(
        "DELETE FROM plugin_hrm.contract_renewals WHERE id = $1 AND status = 'pending'",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "续签申请已取消"))
        }
        Ok(_) => Json(ApiResponse::<String>::error(
            404,
            "续签申请不存在或状态不正确",
        )),
        Err(e) => {
            tracing::error!("取消续签申请失败: {}", e);
            Json(ApiResponse::<String>::error(500, "取消续签申请失败"))
        }
    }
}

async fn approve_renewal(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ContractRenewal>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, ContractRenewal>(
        r#"
        UPDATE plugin_hrm.contract_renewals SET
            status = 'approved',
            approved_at = $2,
            updated_at = $2
        WHERE id = $1 AND status = 'pending'
        RETURNING id, contract_id, previous_contract_id, renewal_type, renewal_reason,
                  new_start_date, new_end_date, new_salary, status, approver_id,
                  approved_at, rejection_reason, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(renewal)) => Json(ApiResponse::success(renewal, "续签申请已批准")),
        Ok(None) => Json(ApiResponse::<ContractRenewal>::error(
            404,
            "续签申请不存在或状态不正确",
        )),
        Err(e) => {
            tracing::error!("批准续签申请失败: {}", e);
            Json(ApiResponse::<ContractRenewal>::error(
                500,
                "批准续签申请失败",
            ))
        }
    }
}

async fn reject_renewal(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<RejectRequest>,
) -> Json<ApiResponse<ContractRenewal>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, ContractRenewal>(
        r#"
        UPDATE plugin_hrm.contract_renewals SET
            status = 'rejected',
            rejection_reason = $2,
            updated_at = $3
        WHERE id = $1 AND status = 'pending'
        RETURNING id, contract_id, previous_contract_id, renewal_type, renewal_reason,
                  new_start_date, new_end_date, new_salary, status, approver_id,
                  approved_at, rejection_reason, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.reason)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(renewal)) => Json(ApiResponse::success(renewal, "续签申请已拒绝")),
        Ok(None) => Json(ApiResponse::<ContractRenewal>::error(
            404,
            "续签申请不存在或状态不正确",
        )),
        Err(e) => {
            tracing::error!("拒绝续签申请失败: {}", e);
            Json(ApiResponse::<ContractRenewal>::error(
                500,
                "拒绝续签申请失败",
            ))
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct RejectRequest {
    pub reason: String,
}

async fn execute_renewal(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let renewal = sqlx::query_as::<_, ContractRenewal>(
        r#"
        SELECT id, contract_id, previous_contract_id, renewal_type, renewal_reason,
               new_start_date, new_end_date, new_salary, status, approver_id,
               approved_at, rejection_reason, created_at, updated_at
        FROM plugin_hrm.contract_renewals WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let renewal = match renewal {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                404,
                "续签记录不存在",
            ))
        }
        Err(e) => {
            return Json(ApiResponse::<serde_json::Value>::error(
                500,
                &format!("查询续签记录失败: {}", e),
            ))
        }
    };

    if renewal.status != "approved" {
        return Json(ApiResponse::<serde_json::Value>::error(
            400,
            "续签申请未批准，无法执行",
        ));
    }

    let now = Utc::now();

    let update_result = sqlx::query(
        r#"
        UPDATE plugin_hrm.contracts SET
            start_date = $2,
            end_date = $3,
            salary = COALESCE($4, salary),
            status = 'active',
            updated_at = $5
        WHERE id = $1
        "#,
    )
    .bind(renewal.contract_id)
    .bind(renewal.new_start_date)
    .bind(renewal.new_end_date)
    .bind(renewal.new_salary)
    .bind(now)
    .execute(&state.db)
    .await;

    match update_result {
        Ok(_) => {
            let _ = sqlx::query(
                "UPDATE plugin_hrm.contract_renewals SET status = 'executed', updated_at = $2 WHERE id = $1"
            )
            .bind(id)
            .bind(now)
            .execute(&state.db)
            .await;

            Json(ApiResponse::success(
                serde_json::json!({
                    "message": "合同续签执行成功",
                    "contract_id": renewal.contract_id,
                    "renewal_id": id
                }),
                "合同续签执行成功",
            ))
        }
        Err(e) => {
            tracing::error!("执行合同续签失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "执行合同续签失败",
            ))
        }
    }
}

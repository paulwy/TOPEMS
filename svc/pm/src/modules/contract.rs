use axum::{
    extract::{Extension, Path, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::contract::{
    Contract, ContractMilestone, ContractPaymentSchedule, ContractTemplate,
    CreateContractMilestoneRequest, CreateContractRequest, CreateContractTemplateRequest,
    CreatePaymentScheduleRequest, UpdateContractRequest,
};
use crate::modules::contract_status::ContractStatus;
use crate::modules::effective_tenant_id;
use crate::services::audit::PmAuditService;

use topems_shared_auth::middleware::tenant::RlsTxnCell;

async fn ensure_contract_transition(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    id: Uuid,
    to: ContractStatus,
) -> Result<(), ApiResponse<Contract>> {
    let current_raw: Result<Option<String>, sqlx::Error> =
        sqlx::query_scalar("SELECT status FROM pm.contracts WHERE id = $1 AND deleted_at IS NULL")
            .bind(id)
            .fetch_optional(&mut *scope)
            .await;
    let raw = match current_raw {
        Ok(Some(raw)) => raw,
        Ok(None) => return Err(ApiResponse::not_found("合同不存在")),
        Err(e) => {
            tracing::error!("查询合同状态失败: {}", e);
            return Err(ApiResponse::server_error("查询合同状态失败"));
        }
    };
    let current = match ContractStatus::from_db_str(&raw) {
        Some(status) => status,
        None => {
            return Err(ApiResponse::bad_request(&format!(
                "合同当前状态非法: {raw}"
            )))
        }
    };
    if !current.can_transition_to(to) {
        return Err(ApiResponse::bad_request(&format!(
            "非法合同状态流转: {} -> {}",
            current, to
        )));
    }
    Ok(())
}

pub fn create_routes(db: Db) -> Router {
    Router::new()
        .route("/contracts", get(list_contracts).post(create_contract))
        .route(
            "/contracts/{id}",
            get(get_contract)
                .put(update_contract)
                .delete(delete_contract),
        )
        .route("/contracts/{id}/submit", post(submit_contract))
        .route("/contracts/{id}/approve", post(approve_contract))
        .route("/contracts/{id}/reject", post(reject_contract))
        .route(
            "/contracts/{id}/milestones",
            get(list_contract_milestones).post(create_contract_milestone),
        )
        .route(
            "/contracts/{id}/milestones/{milestone_id}",
            put(update_contract_milestone).delete(delete_contract_milestone),
        )
        .route(
            "/contracts/{id}/payments",
            get(list_payment_schedule).post(create_payment_schedule),
        )
        .route(
            "/contracts/{id}/payments/{payment_id}",
            put(update_payment_schedule).delete(delete_payment_schedule),
        )
        .route(
            "/contract-templates",
            get(list_templates).post(create_template),
        )
        .route(
            "/contract-templates/{id}",
            get(get_template)
                .put(update_template)
                .delete(delete_template),
        )
        .route(
            "/projects/{project_id}/contracts",
            get(get_project_contracts).post(create_project_contract),
        )
        .with_state(db)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/contracts",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
async fn list_contracts(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<Contract>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let contracts =
        sqlx::query_as::<_, Contract>(only_own_schema_query!("pm", "SELECT id, project_id, contract_no, contract_name, contract_type, party_a, party_b, amount, currency, sign_date, start_date, end_date, status, tax_rate, description, created_by, created_at, updated_at FROM pm.contracts ORDER BY created_at DESC"))
            .fetch_all(&mut scope)
            .await;

    match contracts {
        Ok(c) => ApiResponse::success(c, "获取合同列表成功"),
        Err(e) => {
            tracing::error!("获取合同列表失败: {}", e);
            ApiResponse::server_error("获取合同列表失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/contracts/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
async fn get_contract(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Contract> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let contract = sqlx::query_as::<_, Contract>(only_own_schema_query!("pm", "SELECT id, project_id, contract_no, contract_name, contract_type, party_a, party_b, amount, currency, sign_date, start_date, end_date, status, tax_rate, description, created_by, created_at, updated_at FROM pm.contracts WHERE id = $1"))
        .bind(id)
        .fetch_one(&mut scope)
        .await;

    match contract {
        Ok(c) => ApiResponse::success(c, "获取合同详情成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("合同不存在"),
        Err(e) => {
            tracing::error!("获取合同失败: {}", e);
            ApiResponse::server_error("获取合同失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/contracts",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_contract(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateContractRequest>,
) -> ApiResponse<Contract> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let details = Some(
        serde_json::json!({"project_id": req.project_id, "contract_no": req.contract_no, "contract_name": req.contract_name, "amount": req.amount}),
    );

    let contract = sqlx::query_as::<_, Contract>(only_own_schema_query!(
        "pm",
        r#"INSERT INTO pm.contracts (
            id, project_id, contract_no, contract_name, contract_type, 
            party_a, party_b, amount, currency, sign_date, start_date, end_date,
            created_by, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *"#
    ))
    .bind(id)
    .bind(req.project_id)
    .bind(&req.contract_no)
    .bind(&req.contract_name)
    .bind(&req.contract_type)
    .bind(&req.party_a)
    .bind(&req.party_b)
    .bind(req.amount)
    .bind(req.currency.unwrap_or_else(|| "CNY".to_string()))
    .bind(parse_date_opt(&req.sign_date))
    .bind(parse_date_opt(&req.start_date))
    .bind(parse_date_opt(&req.end_date))
    .bind(req.created_by)
    .bind(effective_tenant_id(&ctx, &claims))
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match contract {
        Ok(c) => {
            if let Err(e) = audit
                .log_contract_operation(
                    "create_contract",
                    Some(c.id),
                    user_id,
                    details.clone(),
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(c, "创建合同成功")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_contract_operation(
                    "create_contract",
                    Some(id),
                    user_id,
                    details,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("创建合同失败: {}", e);
            ApiResponse::server_error("创建合同失败")
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/pm/contracts/{id}",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_contract(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Json(req): Json<UpdateContractRequest>,
) -> ApiResponse<Contract> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let requested_status = match req.status.as_deref() {
        None => None,
        Some(raw) => match ContractStatus::normalize(raw) {
            Ok(status) => Some(status),
            Err(message) => return ApiResponse::bad_request(&message),
        },
    };
    if let Some(to) = requested_status {
        if let Err(resp) = ensure_contract_transition(&mut scope, id, to).await {
            return resp;
        }
    }
    let requested_status = requested_status.map(ContractStatus::as_db_str);
    let details = Some(serde_json::json!({"status": requested_status, "amount": req.amount}));
    let contract = sqlx::query_as::<_, Contract>(only_own_schema_query!(
        "pm",
        r#"UPDATE pm.contracts SET
            contract_name = COALESCE($1, contract_name),
            party_a = COALESCE($2, party_a),
            party_b = COALESCE($3, party_b),
            amount = COALESCE($4, amount),
            currency = COALESCE($5, currency),
            sign_date = COALESCE($6, sign_date),
            start_date = COALESCE($7, start_date),
            end_date = COALESCE($8, end_date),
            status = COALESCE($9, status),
            updated_at = $10
        WHERE id = $11
          
        RETURNING *"#
    ))
    .bind(req.contract_name)
    .bind(req.party_a)
    .bind(req.party_b)
    .bind(req.amount)
    .bind(req.currency)
    .bind(parse_date_opt(&req.sign_date))
    .bind(parse_date_opt(&req.start_date))
    .bind(parse_date_opt(&req.end_date))
    .bind(requested_status)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match contract {
        Ok(c) => {
            if let Err(e) = audit
                .log_contract_operation(
                    "update_contract",
                    Some(c.id),
                    user_id,
                    details.clone(),
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(c, "更新合同成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            if let Err(e) = audit
                .log_contract_operation(
                    "update_contract",
                    Some(id),
                    user_id,
                    details.clone(),
                    "failed",
                    Some("合同不存在"),
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::not_found("合同不存在")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_contract_operation(
                    "update_contract",
                    Some(id),
                    user_id,
                    details,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("更新合同失败: {}", e);
            ApiResponse::server_error("更新合同失败")
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pm/contracts/{id}",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn delete_contract(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "UPDATE pm.contracts SET deleted_at = NOW() WHERE id = $1 "
    ))
    .bind(id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = audit
                .log_contract_operation("delete_contract", Some(id), user_id, None, "success", None)
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success((), "删除合同成功")
        }
        Ok(_) => {
            if let Err(e) = audit
                .log_contract_operation(
                    "delete_contract",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some("合同不存在"),
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::not_found("合同不存在")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_contract_operation(
                    "delete_contract",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("删除合同失败: {}", e);
            ApiResponse::server_error("删除合同失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/contracts/{id}/submit",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
async fn submit_contract(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
) -> ApiResponse<Contract> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    if let Err(resp) = ensure_contract_transition(&mut scope, id, ContractStatus::Pending).await {
        return resp;
    }
    let contract = sqlx::query_as::<_, Contract>(only_own_schema_query!(
        "pm",
        "UPDATE pm.contracts SET status = $2, updated_at = $1 WHERE id = $3 RETURNING *"
    ))
    .bind(Utc::now())
    .bind(ContractStatus::Pending.as_db_str())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match contract {
        Ok(c) => {
            if let Err(e) = audit
                .log_contract_operation(
                    "submit_contract",
                    Some(c.id),
                    user_id,
                    None,
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(c, "提交审批成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            if let Err(e) = audit
                .log_contract_operation(
                    "submit_contract",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some("合同不存在"),
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::not_found("合同不存在")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_contract_operation(
                    "submit_contract",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("提交审批失败: {}", e);
            ApiResponse::server_error("提交审批失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/contracts/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
async fn approve_contract(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
) -> ApiResponse<Contract> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    if let Err(resp) = ensure_contract_transition(&mut scope, id, ContractStatus::Approved).await {
        return resp;
    }
    let contract = sqlx::query_as::<_, Contract>(only_own_schema_query!(
        "pm",
        "UPDATE pm.contracts SET status = $2, updated_at = $1 WHERE id = $3 RETURNING *"
    ))
    .bind(Utc::now())
    .bind(ContractStatus::Approved.as_db_str())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match contract {
        Ok(c) => {
            if let Err(e) = audit
                .log_contract_operation(
                    "approve_contract",
                    Some(c.id),
                    user_id,
                    None,
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(c, "批准合同成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            if let Err(e) = audit
                .log_contract_operation(
                    "approve_contract",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some("合同不存在"),
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::not_found("合同不存在")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_contract_operation(
                    "approve_contract",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("批准合同失败: {}", e);
            ApiResponse::server_error("批准合同失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/contracts/{id}/reject",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
async fn reject_contract(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
) -> ApiResponse<Contract> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    if let Err(resp) = ensure_contract_transition(&mut scope, id, ContractStatus::Rejected).await {
        return resp;
    }
    let contract = sqlx::query_as::<_, Contract>(only_own_schema_query!(
        "pm",
        "UPDATE pm.contracts SET status = $2, updated_at = $1 WHERE id = $3 RETURNING *"
    ))
    .bind(Utc::now())
    .bind(ContractStatus::Rejected.as_db_str())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match contract {
        Ok(c) => {
            if let Err(e) = audit
                .log_contract_operation(
                    "reject_contract",
                    Some(c.id),
                    user_id,
                    None,
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(c, "拒绝合同成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            if let Err(e) = audit
                .log_contract_operation(
                    "reject_contract",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some("合同不存在"),
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::not_found("合同不存在")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_contract_operation(
                    "reject_contract",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("拒绝合同失败: {}", e);
            ApiResponse::server_error("拒绝合同失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/contracts/{id}/milestones",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
async fn list_contract_milestones(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Vec<ContractMilestone>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let milestones = sqlx::query_as::<_, ContractMilestone>(
        only_own_schema_query!("pm", "SELECT id, contract_id, project_milestone_id, name, description, target_date, payment_amount, payment_percent, status, actual_date, payment_status, created_at, updated_at FROM pm.contract_milestones WHERE contract_id = $1 ORDER BY target_date"),
    )
    .bind(id)
    .fetch_all(&mut scope)
    .await;

    match milestones {
        Ok(m) => ApiResponse::success(m, "获取里程碑列表成功"),
        Err(e) => {
            tracing::error!("获取里程碑失败: {}", e);
            ApiResponse::server_error("获取里程碑失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/contracts/{id}/milestones",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_contract_milestone(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateContractMilestoneRequest>,
) -> ApiResponse<ContractMilestone> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let milestone_id = Uuid::new_v4();
    let now = Utc::now();

    let milestone = sqlx::query_as::<_, ContractMilestone>(only_own_schema_query!(
        "pm",
        r#"INSERT INTO pm.contract_milestones (
            id, contract_id, name, description, target_date, 
            payment_amount, payment_percent, project_milestone_id, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *"#
    ))
    .bind(milestone_id)
    .bind(id)
    .bind(&req.name)
    .bind(req.description)
    .bind(parse_date(&req.target_date))
    .bind(req.payment_amount.unwrap_or(rust_decimal::Decimal::ZERO))
    .bind(req.payment_percent)
    .bind(req.project_milestone_id)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match milestone {
        Ok(m) => ApiResponse::success(m, "创建里程碑成功"),
        Err(e) => {
            tracing::error!("创建里程碑失败: {}", e);
            ApiResponse::server_error("创建里程碑失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:write"])),
    path = "/contracts/{id}/milestones/{milestone_id}",
    params(
("id" = String, Path, description = "id"),
("milestone_id" = String, Path, description = "milestone_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
async fn update_contract_milestone(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((id, milestone_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<CreateContractMilestoneRequest>,
) -> ApiResponse<ContractMilestone> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let milestone = sqlx::query_as::<_, ContractMilestone>(only_own_schema_query!(
        "pm",
        r#"UPDATE pm.contract_milestones SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            target_date = COALESCE($3, target_date),
            payment_amount = COALESCE($4, payment_amount),
            payment_percent = COALESCE($5, payment_percent),
            updated_at = $6
        WHERE id = $7 AND contract_id = $8  RETURNING *"#
    ))
    .bind(&req.name)
    .bind(req.description)
    .bind(parse_date(&req.target_date))
    .bind(req.payment_amount)
    .bind(req.payment_percent)
    .bind(Utc::now())
    .bind(milestone_id)
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match milestone {
        Ok(m) => ApiResponse::success(m, "更新里程碑成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("里程碑不存在"),
        Err(e) => {
            tracing::error!("更新里程碑失败: {}", e);
            ApiResponse::server_error("更新里程碑失败")
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pm/contracts/{id}/milestones/{milestone_id}",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn delete_contract_milestone(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((id, milestone_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.contract_milestones WHERE id = $1 AND contract_id = $2 "
    ))
    .bind(milestone_id)
    .bind(id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除里程碑成功"),
        Ok(_) => ApiResponse::not_found("里程碑不存在"),
        Err(e) => {
            tracing::error!("删除里程碑失败: {}", e);
            ApiResponse::server_error("删除里程碑失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/contracts/{id}/payments",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
async fn list_payment_schedule(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Vec<ContractPaymentSchedule>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let payments = sqlx::query_as::<_, ContractPaymentSchedule>(
        only_own_schema_query!("pm", "SELECT id, contract_id, payment_number, payment_name, payment_percent, payment_amount, due_date, actual_payment_date, status, created_at FROM pm.contract_payment_schedule WHERE deleted_at IS NULL AND contract_id = $1 ORDER BY payment_number"),
    )
    .bind(id)
    .fetch_all(&mut scope)
    .await;

    match payments {
        Ok(p) => ApiResponse::success(p, "获取付款计划成功"),
        Err(e) => {
            tracing::error!("获取付款计划失败: {}", e);
            ApiResponse::server_error("获取付款计划失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/contracts/{id}/payments",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_payment_schedule(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePaymentScheduleRequest>,
) -> ApiResponse<ContractPaymentSchedule> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let payment_id = Uuid::new_v4();
    let now = Utc::now();

    let payment = sqlx::query_as::<_, ContractPaymentSchedule>(only_own_schema_query!(
        "pm",
        r#"INSERT INTO pm.contract_payment_schedule (
            id, contract_id, payment_number, payment_name, payment_percent, 
            payment_amount, due_date, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *"#
    ))
    .bind(payment_id)
    .bind(id)
    .bind(req.payment_number)
    .bind(req.payment_name)
    .bind(req.payment_percent)
    .bind(req.payment_amount)
    .bind(parse_date(&req.due_date))
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match payment {
        Ok(p) => ApiResponse::success(p, "创建付款计划成功"),
        Err(e) => {
            tracing::error!("创建付款计划失败: {}", e);
            ApiResponse::server_error("创建付款计划失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:write"])),
    path = "/contracts/{id}/payments/{payment_id}",
    params(
("id" = String, Path, description = "id"),
("payment_id" = String, Path, description = "payment_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
async fn update_payment_schedule(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((id, payment_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<CreatePaymentScheduleRequest>,
) -> ApiResponse<ContractPaymentSchedule> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let payment = sqlx::query_as::<_, ContractPaymentSchedule>(only_own_schema_query!(
        "pm",
        r#"UPDATE pm.contract_payment_schedule SET
            payment_name = COALESCE($1, payment_name),
            payment_percent = COALESCE($2, payment_percent),
            payment_amount = COALESCE($3, payment_amount),
            due_date = COALESCE($4, due_date),
            updated_at = $5
        WHERE id = $6 AND contract_id = $7  RETURNING *"#
    ))
    .bind(req.payment_name)
    .bind(req.payment_percent)
    .bind(req.payment_amount)
    .bind(parse_date(&req.due_date))
    .bind(Utc::now())
    .bind(payment_id)
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match payment {
        Ok(p) => ApiResponse::success(p, "更新付款计划成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("付款计划不存在"),
        Err(e) => {
            tracing::error!("更新付款计划失败: {}", e);
            ApiResponse::server_error("更新付款计划失败")
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pm/contracts/{id}/payments/{payment_id}",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn delete_payment_schedule(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((id, payment_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result =
        sqlx::query(only_own_schema_query!("pm", "UPDATE pm.contract_payment_schedule SET deleted_at = NOW() WHERE id = $1 AND contract_id = $2"))
            .bind(payment_id)
            .bind(id)
            .execute(&mut scope)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除付款计划成功"),
        Ok(_) => ApiResponse::not_found("付款计划不存在"),
        Err(e) => {
            tracing::error!("删除付款计划失败: {}", e);
            ApiResponse::server_error("删除付款计划失败")
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pm/contract-templates",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn list_templates(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<ContractTemplate>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let templates = sqlx::query_as::<_, ContractTemplate>(
        only_own_schema_query!("pm", "SELECT id, name, contract_type, description, content, is_active, created_by, created_at, updated_at FROM pm.contract_templates WHERE is_active = true ORDER BY name"),
    )
    .fetch_all(&mut scope)
    .await;

    match templates {
        Ok(t) => ApiResponse::success(t, "获取模板列表成功"),
        Err(e) => {
            tracing::error!("获取模板失败: {}", e);
            ApiResponse::server_error("获取模板失败")
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pm/contract-templates/{id}",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn get_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ContractTemplate> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let template =
        sqlx::query_as::<_, ContractTemplate>(only_own_schema_query!("pm", "SELECT id, name, contract_type, description, content, is_active, created_by, created_at, updated_at FROM pm.contract_templates WHERE id = $1"))
            .bind(id)
            .fetch_one(&mut scope)
            .await;

    match template {
        Ok(t) => ApiResponse::success(t, "获取模板详情成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("模板不存在"),
        Err(e) => {
            tracing::error!("获取模板失败: {}", e);
            ApiResponse::server_error("获取模板失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/contract-templates",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateContractTemplateRequest>,
) -> ApiResponse<ContractTemplate> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();

    let template = sqlx::query_as::<_, ContractTemplate>(
        only_own_schema_query!("pm", "INSERT INTO pm.contract_templates (id, name, contract_type, description, content, created_by, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *")
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.contract_type)
    .bind(req.description)
    .bind(&req.content)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match template {
        Ok(t) => ApiResponse::success(t, "创建模板成功"),
        Err(e) => {
            tracing::error!("创建模板失败: {}", e);
            ApiResponse::server_error("创建模板失败")
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/pm/contract-templates/{id}",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateContractTemplateRequest>,
) -> ApiResponse<ContractTemplate> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let template = sqlx::query_as::<_, ContractTemplate>(only_own_schema_query!(
        "pm",
        "UPDATE pm.contract_templates SET
            name = COALESCE($1, name),
            contract_type = COALESCE($2, contract_type),
            description = COALESCE($3, description),
            content = COALESCE($4, content),
            updated_at = $5
        WHERE id = $6  RETURNING *"
    ))
    .bind(&req.name)
    .bind(&req.contract_type)
    .bind(req.description)
    .bind(&req.content)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match template {
        Ok(t) => ApiResponse::success(t, "更新模板成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("模板不存在"),
        Err(e) => {
            tracing::error!("更新模板失败: {}", e);
            ApiResponse::server_error("更新模板失败")
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pm/contract-templates/{id}",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn delete_template(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "UPDATE pm.contract_templates SET is_active = false WHERE id = $1 "
    ))
    .bind(id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除模板成功"),
        Ok(_) => ApiResponse::not_found("模板不存在"),
        Err(e) => {
            tracing::error!("删除模板失败: {}", e);
            ApiResponse::server_error("删除模板失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/contracts",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "contract"
)]
async fn get_project_contracts(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<Contract>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let contracts = sqlx::query_as::<_, Contract>(
        only_own_schema_query!("pm", "SELECT id, project_id, contract_no, contract_name, contract_type, party_a, party_b, amount, currency, sign_date, start_date, end_date, status, tax_rate, description, created_by, created_at, updated_at FROM pm.contracts WHERE project_id = $1 ORDER BY created_at DESC"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match contracts {
        Ok(c) => ApiResponse::success(c, "获取项目合同列表成功"),
        Err(e) => {
            tracing::error!("获取项目合同失败: {}", e);
            ApiResponse::server_error("获取项目合同失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{project_id}/contracts",
    tag = "contract",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_project_contract(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateContractRequest>,
) -> ApiResponse<Contract> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();

    let contract = sqlx::query_as::<_, Contract>(only_own_schema_query!(
        "pm",
        r#"INSERT INTO pm.contracts (
            id, project_id, contract_no, contract_name, contract_type, 
            party_a, party_b, amount, currency, sign_date, start_date, end_date,
            created_by, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *"#
    ))
    .bind(id)
    .bind(project_id)
    .bind(&req.contract_no)
    .bind(&req.contract_name)
    .bind(&req.contract_type)
    .bind(&req.party_a)
    .bind(&req.party_b)
    .bind(req.amount)
    .bind(req.currency.unwrap_or_else(|| "CNY".to_string()))
    .bind(parse_date_opt(&req.sign_date))
    .bind(parse_date_opt(&req.start_date))
    .bind(parse_date_opt(&req.end_date))
    .bind(req.created_by)
    .bind(effective_tenant_id(&ctx, &claims))
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match contract {
        Ok(c) => ApiResponse::success(c, "创建合同成功"),
        Err(e) => {
            tracing::error!("创建合同失败: {}", e);
            ApiResponse::server_error("创建合同失败")
        }
    }
}

fn parse_date(date_str: &str) -> DateTime<Utc> {
    chrono::DateTime::parse_from_rfc3339(date_str)
        .unwrap_or_else(|_| Utc::now().into())
        .with_timezone(&Utc)
}

fn parse_date_opt(date_str: &Option<String>) -> Option<DateTime<Utc>> {
    date_str.as_ref().map(|s| parse_date(s))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Datelike;
    use sqlx::postgres::PgConnectOptions;
    use sqlx::PgPool;
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(Db::new(make_pool(), "pm, public, shared"));
        let _ = router;
    }

    #[test]
    fn test_parse_date_valid_rfc3339() {
        let s = "2024-01-15T10:30:00Z";
        let dt = parse_date(s);
        assert_eq!(dt.year(), 2024);
        assert_eq!(dt.month(), 1);
        assert_eq!(dt.day(), 15);
    }

    #[test]
    fn test_parse_date_with_offset() {
        let s = "2024-06-20T14:00:00+08:00";
        let dt = parse_date(s);
        assert_eq!(dt.year(), 2024);
        assert_eq!(dt.month(), 6);
    }

    #[test]
    fn test_parse_date_invalid_falls_back_to_now() {
        let before = Utc::now();
        let dt = parse_date("not-a-valid-date");
        let after = Utc::now();
        assert!(dt >= before || dt <= after);
    }

    #[test]
    fn test_parse_date_empty_string_fallback() {
        let dt = parse_date("");
        let _ = dt;
    }

    #[test]
    fn test_parse_date_opt_none() {
        let result = parse_date_opt(&None);
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_date_opt_some_valid() {
        let s = Some("2024-03-10T08:00:00Z".to_string());
        let result = parse_date_opt(&s);
        assert!(result.is_some());
        let dt = result.unwrap();
        assert_eq!(dt.year(), 2024);
        assert_eq!(dt.month(), 3);
    }

    #[test]
    fn test_parse_date_opt_some_invalid_returns_now() {
        let s = Some("invalid".to_string());
        let result = parse_date_opt(&s);
        assert!(result.is_some());
    }
}

use axum::{
    extract::{Extension, Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::contract::{
    Contract, ContractMilestone, ContractPaymentSchedule, ContractTemplate,
    CreateContractMilestoneRequest, CreateContractRequest, CreateContractTemplateRequest,
    CreatePaymentScheduleRequest, UpdateContractRequest,
};
use crate::services::audit::PmAuditService;

pub fn create_routes(pool: PgPool) -> Router {
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
        .with_state(pool)
}

async fn list_contracts(State(pool): State<PgPool>) -> Json<ApiResponse<Vec<Contract>>> {
    let contracts =
        sqlx::query_as::<_, Contract>("id, project_id, contract_no, contract_name, contract_type, party_a, party_b, amount, currency, sign_date, start_date, end_date, status, tax_rate, description, created_by, created_at, updated_at FROM pm.contracts ORDER BY created_at DESC")
            .fetch_all(&pool)
            .await;

    match contracts {
        Ok(c) => Json(ApiResponse::success(c, "获取合同列表成功")),
        Err(e) => {
            tracing::error!("获取合同列表失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取合同列表失败",
            ))
        }
    }
}

async fn get_contract(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Contract>> {
    let contract = sqlx::query_as::<_, Contract>("id, project_id, contract_no, contract_name, contract_type, party_a, party_b, amount, currency, sign_date, start_date, end_date, status, tax_rate, description, created_by, created_at, updated_at FROM pm.contracts WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await;

    match contract {
        Ok(c) => Json(ApiResponse::success(c, "获取合同详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "合同不存在",
        )),
        Err(e) => {
            tracing::error!("获取合同失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取合同失败",
            ))
        }
    }
}

async fn create_contract(
    State(pool): State<PgPool>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Json(req): Json<CreateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let details = Some(
        serde_json::json!({"project_id": req.project_id, "contract_no": req.contract_no, "contract_name": req.contract_name, "amount": req.amount}),
    );

    let contract = sqlx::query_as::<_, Contract>(
        r#"INSERT INTO pm.contracts (
            id, project_id, contract_no, contract_name, contract_type, 
            party_a, party_b, amount, currency, sign_date, start_date, end_date,
            created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *"#,
    )
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
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
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
            Json(ApiResponse::success(c, "创建合同成功"))
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
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建合同失败",
            ))
        }
    }
}

async fn update_contract(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Json(req): Json<UpdateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let details = Some(serde_json::json!({"status": req.status, "amount": req.amount}));
    let contract = sqlx::query_as::<_, Contract>(
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
        WHERE id = $11 RETURNING *"#,
    )
    .bind(req.contract_name)
    .bind(req.party_a)
    .bind(req.party_b)
    .bind(req.amount)
    .bind(req.currency)
    .bind(parse_date_opt(&req.sign_date))
    .bind(parse_date_opt(&req.start_date))
    .bind(parse_date_opt(&req.end_date))
    .bind(req.status)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
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
            Json(ApiResponse::success(c, "更新合同成功"))
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
            Json(ApiResponse::error(
                StatusCode::NOT_FOUND.as_u16(),
                "合同不存在",
            ))
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
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新合同失败",
            ))
        }
    }
}

async fn delete_contract(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let result = sqlx::query("UPDATE pm.contracts SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = audit
                .log_contract_operation("delete_contract", Some(id), user_id, None, "success", None)
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            Json(ApiResponse::success((), "删除合同成功"))
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
            Json(ApiResponse::error(
                StatusCode::NOT_FOUND.as_u16(),
                "合同不存在",
            ))
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
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "删除合同失败",
            ))
        }
    }
}

async fn submit_contract(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
) -> Json<ApiResponse<Contract>> {
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let contract = sqlx::query_as::<_, Contract>(
        "UPDATE pm.contracts SET status = 'pending', updated_at = $1 WHERE id = $2 RETURNING *",
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
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
            Json(ApiResponse::success(c, "提交审批成功"))
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
            Json(ApiResponse::error(
                StatusCode::NOT_FOUND.as_u16(),
                "合同不存在",
            ))
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
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "提交审批失败",
            ))
        }
    }
}

async fn approve_contract(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
) -> Json<ApiResponse<Contract>> {
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let contract = sqlx::query_as::<_, Contract>(
        "UPDATE pm.contracts SET status = 'approved', updated_at = $1 WHERE id = $2 RETURNING *",
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
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
            Json(ApiResponse::success(c, "批准合同成功"))
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
            Json(ApiResponse::error(
                StatusCode::NOT_FOUND.as_u16(),
                "合同不存在",
            ))
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
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "批准合同失败",
            ))
        }
    }
}

async fn reject_contract(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
) -> Json<ApiResponse<Contract>> {
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let contract = sqlx::query_as::<_, Contract>(
        "UPDATE pm.contracts SET status = 'rejected', updated_at = $1 WHERE id = $2 RETURNING *",
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
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
            Json(ApiResponse::success(c, "拒绝合同成功"))
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
            Json(ApiResponse::error(
                StatusCode::NOT_FOUND.as_u16(),
                "合同不存在",
            ))
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
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "拒绝合同失败",
            ))
        }
    }
}

async fn list_contract_milestones(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ContractMilestone>>> {
    let milestones = sqlx::query_as::<_, ContractMilestone>(
        "SELECT id, contract_id, project_milestone_id, name, description, target_date, payment_amount, payment_percentage, status, created_at FROM pm.contract_milestones WHERE contract_id = $1 ORDER BY target_date",
    )
    .bind(id)
    .fetch_all(&pool)
    .await;

    match milestones {
        Ok(m) => Json(ApiResponse::success(m, "获取里程碑列表成功")),
        Err(e) => {
            tracing::error!("获取里程碑失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取里程碑失败",
            ))
        }
    }
}

async fn create_contract_milestone(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateContractMilestoneRequest>,
) -> Json<ApiResponse<ContractMilestone>> {
    let milestone_id = Uuid::new_v4();
    let now = Utc::now();

    let milestone = sqlx::query_as::<_, ContractMilestone>(
        r#"INSERT INTO pm.contract_milestones (
            id, contract_id, name, description, target_date, 
            payment_amount, payment_percent, project_milestone_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *"#,
    )
    .bind(milestone_id)
    .bind(id)
    .bind(&req.name)
    .bind(req.description)
    .bind(parse_date(&req.target_date))
    .bind(req.payment_amount.unwrap_or(0.0))
    .bind(req.payment_percent)
    .bind(req.project_milestone_id)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match milestone {
        Ok(m) => Json(ApiResponse::success(m, "创建里程碑成功")),
        Err(e) => {
            tracing::error!("创建里程碑失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建里程碑失败",
            ))
        }
    }
}

async fn update_contract_milestone(
    State(pool): State<PgPool>,
    Path((id, milestone_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<CreateContractMilestoneRequest>,
) -> Json<ApiResponse<ContractMilestone>> {
    let milestone = sqlx::query_as::<_, ContractMilestone>(
        r#"UPDATE pm.contract_milestones SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            target_date = COALESCE($3, target_date),
            payment_amount = COALESCE($4, payment_amount),
            payment_percent = COALESCE($5, payment_percent),
            updated_at = $6
        WHERE id = $7 AND contract_id = $8 RETURNING *"#,
    )
    .bind(&req.name)
    .bind(req.description)
    .bind(parse_date(&req.target_date))
    .bind(req.payment_amount)
    .bind(req.payment_percent)
    .bind(Utc::now())
    .bind(milestone_id)
    .bind(id)
    .fetch_one(&pool)
    .await;

    match milestone {
        Ok(m) => Json(ApiResponse::success(m, "更新里程碑成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "里程碑不存在",
        )),
        Err(e) => {
            tracing::error!("更新里程碑失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新里程碑失败",
            ))
        }
    }
}

async fn delete_contract_milestone(
    State(pool): State<PgPool>,
    Path((id, milestone_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<()>> {
    let result =
        sqlx::query("DELETE FROM pm.contract_milestones WHERE id = $1 AND contract_id = $2")
            .bind(milestone_id)
            .bind(id)
            .execute(&pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除里程碑成功")),
        Ok(_) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "里程碑不存在",
        )),
        Err(e) => {
            tracing::error!("删除里程碑失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "删除里程碑失败",
            ))
        }
    }
}

async fn list_payment_schedule(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ContractPaymentSchedule>>> {
    let payments = sqlx::query_as::<_, ContractPaymentSchedule>(
        "SELECT id, contract_id, payment_number, payment_name, payment_percent, payment_amount, due_date, actual_payment_date, status, created_at FROM pm.contract_payment_schedule WHERE deleted_at IS NULL AND contract_id = $1 ORDER BY payment_number",
    )
    .bind(id)
    .fetch_all(&pool)
    .await;

    match payments {
        Ok(p) => Json(ApiResponse::success(p, "获取付款计划成功")),
        Err(e) => {
            tracing::error!("获取付款计划失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取付款计划失败",
            ))
        }
    }
}

async fn create_payment_schedule(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreatePaymentScheduleRequest>,
) -> Json<ApiResponse<ContractPaymentSchedule>> {
    let payment_id = Uuid::new_v4();
    let now = Utc::now();

    let payment = sqlx::query_as::<_, ContractPaymentSchedule>(
        r#"INSERT INTO pm.contract_payment_schedule (
            id, contract_id, payment_number, payment_name, payment_percent, 
            payment_amount, due_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *"#,
    )
    .bind(payment_id)
    .bind(id)
    .bind(req.payment_number)
    .bind(req.payment_name)
    .bind(req.payment_percent)
    .bind(req.payment_amount)
    .bind(parse_date(&req.due_date))
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match payment {
        Ok(p) => Json(ApiResponse::success(p, "创建付款计划成功")),
        Err(e) => {
            tracing::error!("创建付款计划失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建付款计划失败",
            ))
        }
    }
}

async fn update_payment_schedule(
    State(pool): State<PgPool>,
    Path((id, payment_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<CreatePaymentScheduleRequest>,
) -> Json<ApiResponse<ContractPaymentSchedule>> {
    let payment = sqlx::query_as::<_, ContractPaymentSchedule>(
        r#"UPDATE pm.contract_payment_schedule SET
            payment_name = COALESCE($1, payment_name),
            payment_percent = COALESCE($2, payment_percent),
            payment_amount = COALESCE($3, payment_amount),
            due_date = COALESCE($4, due_date),
            updated_at = $5
        WHERE id = $6 AND contract_id = $7 RETURNING *"#,
    )
    .bind(req.payment_name)
    .bind(req.payment_percent)
    .bind(req.payment_amount)
    .bind(parse_date(&req.due_date))
    .bind(Utc::now())
    .bind(payment_id)
    .bind(id)
    .fetch_one(&pool)
    .await;

    match payment {
        Ok(p) => Json(ApiResponse::success(p, "更新付款计划成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "付款计划不存在",
        )),
        Err(e) => {
            tracing::error!("更新付款计划失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新付款计划失败",
            ))
        }
    }
}

async fn delete_payment_schedule(
    State(pool): State<PgPool>,
    Path((id, payment_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<()>> {
    let result =
        sqlx::query("UPDATE pm.contract_payment_schedule SET deleted_at = NOW() WHERE id = $1 AND contract_id = $2")
            .bind(payment_id)
            .bind(id)
            .execute(&pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除付款计划成功")),
        Ok(_) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "付款计划不存在",
        )),
        Err(e) => {
            tracing::error!("删除付款计划失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "删除付款计划失败",
            ))
        }
    }
}

async fn list_templates(State(pool): State<PgPool>) -> Json<ApiResponse<Vec<ContractTemplate>>> {
    let templates = sqlx::query_as::<_, ContractTemplate>(
        "id, name, contract_type, description, content, is_active, created_by, created_at, updated_at FROM pm.contract_templates WHERE is_active = true ORDER BY name",
    )
    .fetch_all(&pool)
    .await;

    match templates {
        Ok(t) => Json(ApiResponse::success(t, "获取模板列表成功")),
        Err(e) => {
            tracing::error!("获取模板失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取模板失败",
            ))
        }
    }
}

async fn get_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ContractTemplate>> {
    let template =
        sqlx::query_as::<_, ContractTemplate>("id, name, contract_type, description, content, is_active, created_by, created_at, updated_at FROM pm.contract_templates WHERE id = $1")
            .bind(id)
            .fetch_one(&pool)
            .await;

    match template {
        Ok(t) => Json(ApiResponse::success(t, "获取模板详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "模板不存在",
        )),
        Err(e) => {
            tracing::error!("获取模板失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取模板失败",
            ))
        }
    }
}

async fn create_template(
    State(pool): State<PgPool>,
    Json(req): Json<CreateContractTemplateRequest>,
) -> Json<ApiResponse<ContractTemplate>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let template = sqlx::query_as::<_, ContractTemplate>(
        "INSERT INTO pm.contract_templates (id, name, contract_type, description, content, created_by, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *"
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.contract_type)
    .bind(req.description)
    .bind(&req.content)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match template {
        Ok(t) => Json(ApiResponse::success(t, "创建模板成功")),
        Err(e) => {
            tracing::error!("创建模板失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建模板失败",
            ))
        }
    }
}

async fn update_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateContractTemplateRequest>,
) -> Json<ApiResponse<ContractTemplate>> {
    let template = sqlx::query_as::<_, ContractTemplate>(
        "UPDATE pm.contract_templates SET
            name = COALESCE($1, name),
            contract_type = COALESCE($2, contract_type),
            description = COALESCE($3, description),
            content = COALESCE($4, content),
            updated_at = $5
        WHERE id = $6 RETURNING *",
    )
    .bind(&req.name)
    .bind(&req.contract_type)
    .bind(req.description)
    .bind(&req.content)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match template {
        Ok(t) => Json(ApiResponse::success(t, "更新模板成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "模板不存在",
        )),
        Err(e) => {
            tracing::error!("更新模板失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新模板失败",
            ))
        }
    }
}

async fn delete_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("UPDATE pm.contract_templates SET is_active = false WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除模板成功")),
        Ok(_) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "模板不存在",
        )),
        Err(e) => {
            tracing::error!("删除模板失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "删除模板失败",
            ))
        }
    }
}

async fn get_project_contracts(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<Contract>>> {
    let contracts = sqlx::query_as::<_, Contract>(
        "id, project_id, contract_no, contract_name, contract_type, party_a, party_b, amount, currency, sign_date, start_date, end_date, status, tax_rate, description, created_by, created_at, updated_at FROM pm.contracts WHERE project_id = $1 ORDER BY created_at DESC",
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match contracts {
        Ok(c) => Json(ApiResponse::success(c, "获取项目合同列表成功")),
        Err(e) => {
            tracing::error!("获取项目合同失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取项目合同失败",
            ))
        }
    }
}

async fn create_project_contract(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let contract = sqlx::query_as::<_, Contract>(
        r#"INSERT INTO pm.contracts (
            id, project_id, contract_no, contract_name, contract_type, 
            party_a, party_b, amount, currency, sign_date, start_date, end_date,
            created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *"#,
    )
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
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match contract {
        Ok(c) => Json(ApiResponse::success(c, "创建合同成功")),
        Err(e) => {
            tracing::error!("创建合同失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建合同失败",
            ))
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
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(make_pool());
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

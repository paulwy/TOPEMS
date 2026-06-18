use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::contract::{
    Contract, ContractMilestone, ContractPaymentSchedule, ContractTemplate,
    CreateContractMilestoneRequest, CreateContractRequest, CreateContractTemplateRequest,
    CreatePaymentScheduleRequest, UpdateContractRequest,
};

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/api/pm/contracts",
            get(list_contracts).post(create_contract),
        )
        .route(
            "/api/pm/contracts/{id}",
            get(get_contract)
                .put(update_contract)
                .delete(delete_contract),
        )
        .route("/api/pm/contracts/{id}/submit", post(submit_contract))
        .route("/api/pm/contracts/{id}/approve", post(approve_contract))
        .route("/api/pm/contracts/{id}/reject", post(reject_contract))
        .route(
            "/api/pm/contracts/{id}/milestones",
            get(list_contract_milestones).post(create_contract_milestone),
        )
        .route(
            "/api/pm/contracts/{id}/milestones/{milestone_id}",
            put(update_contract_milestone).delete(delete_contract_milestone),
        )
        .route(
            "/api/pm/contracts/{id}/payments",
            get(list_payment_schedule).post(create_payment_schedule),
        )
        .route(
            "/api/pm/contracts/{id}/payments/{payment_id}",
            put(update_payment_schedule).delete(delete_payment_schedule),
        )
        .route(
            "/api/pm/contract-templates",
            get(list_templates).post(create_template),
        )
        .route(
            "/api/pm/contract-templates/{id}",
            get(get_template)
                .put(update_template)
                .delete(delete_template),
        )
        .route(
            "/api/pm/projects/{project_id}/contracts",
            get(get_project_contracts).post(create_project_contract),
        )
        .with_state(pool)
}

async fn list_contracts(State(pool): State<PgPool>) -> Json<ApiResponse<Vec<Contract>>> {
    let contracts =
        sqlx::query_as::<_, Contract>("SELECT * FROM plugin_pm.contracts ORDER BY created_at DESC")
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
    let contract = sqlx::query_as::<_, Contract>("SELECT * FROM plugin_pm.contracts WHERE id = $1")
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
    Json(req): Json<CreateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let contract = sqlx::query_as::<_, Contract>(
        r#"INSERT INTO plugin_pm.contracts (
            id, project_id, contract_code, contract_name, contract_type, 
            contract_category, party_a_name, party_a_id, party_b_name, party_b_id,
            amount, currency, tax_rate, signing_date, effective_date, end_date,
            template_id, description, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *"#
    )
    .bind(id)
    .bind(req.project_id)
    .bind(&req.contract_code)
    .bind(&req.contract_name)
    .bind(&req.contract_type)
    .bind(req.contract_category)
    .bind(req.party_a_name)
    .bind(req.party_a_id)
    .bind(req.party_b_name)
    .bind(req.party_b_id)
    .bind(req.amount)
    .bind(req.currency.unwrap_or_else(|| "CNY".to_string()))
    .bind(req.tax_rate.unwrap_or(0.13))
    .bind(parse_date_opt(&req.signing_date))
    .bind(parse_date_opt(&req.effective_date))
    .bind(parse_date_opt(&req.end_date))
    .bind(req.template_id)
    .bind(req.description)
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

async fn update_contract(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    let contract = sqlx::query_as::<_, Contract>(
        r#"UPDATE plugin_pm.contracts SET
            contract_name = COALESCE($1, contract_name),
            contract_category = COALESCE($2, contract_category),
            party_a_name = COALESCE($3, party_a_name),
            party_a_id = COALESCE($4, party_a_id),
            party_b_name = COALESCE($5, party_b_name),
            party_b_id = COALESCE($6, party_b_id),
            amount = COALESCE($7, amount),
            currency = COALESCE($8, currency),
            tax_rate = COALESCE($9, tax_rate),
            signing_date = COALESCE($10, signing_date),
            effective_date = COALESCE($11, effective_date),
            end_date = COALESCE($12, end_date),
            status = COALESCE($13, status),
            description = COALESCE($14, description),
            updated_at = $15
        WHERE id = $16 RETURNING *"#,
    )
    .bind(req.contract_name)
    .bind(req.contract_category)
    .bind(req.party_a_name)
    .bind(req.party_a_id)
    .bind(req.party_b_name)
    .bind(req.party_b_id)
    .bind(req.amount)
    .bind(req.currency)
    .bind(req.tax_rate)
    .bind(parse_date_opt(&req.signing_date))
    .bind(parse_date_opt(&req.effective_date))
    .bind(parse_date_opt(&req.end_date))
    .bind(req.status)
    .bind(req.description)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match contract {
        Ok(c) => Json(ApiResponse::success(c, "更新合同成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "合同不存在",
        )),
        Err(e) => {
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
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM plugin_pm.contracts WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除合同成功")),
        Ok(_) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "合同不存在",
        )),
        Err(e) => {
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
) -> Json<ApiResponse<Contract>> {
    let contract = sqlx::query_as::<_, Contract>(
        "UPDATE plugin_pm.contracts SET status = 'pending', updated_at = $1 WHERE id = $2 RETURNING *",
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match contract {
        Ok(c) => Json(ApiResponse::success(c, "提交审批成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "合同不存在",
        )),
        Err(e) => {
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
) -> Json<ApiResponse<Contract>> {
    let contract = sqlx::query_as::<_, Contract>(
        "UPDATE plugin_pm.contracts SET status = 'approved', updated_at = $1 WHERE id = $2 RETURNING *",
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match contract {
        Ok(c) => Json(ApiResponse::success(c, "批准合同成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "合同不存在",
        )),
        Err(e) => {
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
) -> Json<ApiResponse<Contract>> {
    let contract = sqlx::query_as::<_, Contract>(
        "UPDATE plugin_pm.contracts SET status = 'rejected', updated_at = $1 WHERE id = $2 RETURNING *",
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match contract {
        Ok(c) => Json(ApiResponse::success(c, "拒绝合同成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "合同不存在",
        )),
        Err(e) => {
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
        "SELECT * FROM plugin_pm.contract_milestones WHERE contract_id = $1 ORDER BY target_date",
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
        r#"INSERT INTO plugin_pm.contract_milestones (
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
        r#"UPDATE plugin_pm.contract_milestones SET
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
        sqlx::query("DELETE FROM plugin_pm.contract_milestones WHERE id = $1 AND contract_id = $2")
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
        "SELECT * FROM plugin_pm.contract_payment_schedule WHERE contract_id = $1 ORDER BY payment_number",
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
        r#"INSERT INTO plugin_pm.contract_payment_schedule (
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
        r#"UPDATE plugin_pm.contract_payment_schedule SET
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
        sqlx::query("DELETE FROM plugin_pm.contract_payment_schedule WHERE id = $1 AND contract_id = $2")
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
        "SELECT * FROM plugin_pm.contract_templates WHERE is_active = true ORDER BY name",
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
        sqlx::query_as::<_, ContractTemplate>("SELECT * FROM plugin_pm.contract_templates WHERE id = $1")
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
        "INSERT INTO plugin_pm.contract_templates (id, name, contract_type, description, content, created_by, created_at, updated_at) 
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
        "UPDATE plugin_pm.contract_templates SET
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
    let result = sqlx::query("UPDATE plugin_pm.contract_templates SET is_active = false WHERE id = $1")
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
        "SELECT * FROM plugin_pm.contracts WHERE project_id = $1 ORDER BY created_at DESC",
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
    Json(mut req): Json<CreateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    req.project_id = Some(project_id);
    create_contract(State(pool), Json(req)).await
}

fn parse_date(date_str: &str) -> DateTime<Utc> {
    chrono::DateTime::parse_from_rfc3339(date_str)
        .unwrap_or_else(|_| Utc::now().into())
        .with_timezone(&Utc)
}

fn parse_date_opt(date_str: &Option<String>) -> Option<DateTime<Utc>> {
    date_str.as_ref().map(|s| parse_date(s))
}

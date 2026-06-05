use axum::{
    extract::{Path, Query, State},
    routing::*,
    Json, Router,
};
use uuid::Uuid;

use crate::models::{
    project_contract::{ContractPaginationParams, CreateContractRequest, ProjectContract, UpdateContractRequest},
};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};
use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/contracts", get(list_contracts).post(create_contract))
        .route("/api/v1/contracts/{id}", get(get_contract).put(update_contract).delete(delete_contract))
        .route("/api/v1/contracts/project/{project_id}", get(get_project_contracts))
}

async fn create_contract(
    State(state): State<ApiState>,
    Json(payload): Json<CreateContractRequest>,
) -> Json<ApiResponse<ProjectContract>> {
    let contract_type = payload.contract_type.to_string();
    let currency = payload.currency.unwrap_or_else(|| "CNY".to_string());
    let tax_amount = payload.tax_amount.unwrap_or(0.0);
    let total_amount = payload.amount + tax_amount;
    let status = "DRAFT".to_string();

    let result = sqlx::query_as::<_, ProjectContract>(
        r#"
        INSERT INTO project_contracts (
            project_id, contract_no, contract_type, party_a, party_b, subject,
            amount, tax_amount, total_amount, currency, signing_date, effective_date,
            expiration_date, status, payment_terms, attachment_ids, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
        "#,
    )
    .bind(&payload.project_id)
    .bind(&payload.contract_no)
    .bind(&contract_type)
    .bind(&payload.party_a)
    .bind(&payload.party_b)
    .bind(&payload.subject)
    .bind(&payload.amount)
    .bind(&tax_amount)
    .bind(&total_amount)
    .bind(&currency)
    .bind(&payload.signing_date)
    .bind(&payload.effective_date)
    .bind(&payload.expiration_date)
    .bind(&status)
    .bind(&payload.payment_terms)
    .bind(&payload.attachment_ids)
    .bind("admin")
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(contract) => Json(ApiResponse::success(contract, "合同创建成功")),
        Err(e) => {
            tracing::error!("创建合同失败: {}", e);
            Json(api_error(500, "创建合同失败"))
        }
    }
}

async fn get_contract(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectContract>> {
    let result = sqlx::query_as::<_, ProjectContract>(
        r#"SELECT * FROM project_contracts WHERE id = $1"#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(contract)) => Json(ApiResponse::success(contract, "获取合同成功")),
        Ok(None) => Json(api_error(404, "合同不存在")),
        Err(e) => {
            tracing::error!("获取合同失败: {}", e);
            Json(api_error(500, "获取合同失败"))
        }
    }
}

async fn get_project_contracts(
    State(state): State<ApiState>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectContract>>> {
    let result = sqlx::query_as::<_, ProjectContract>(
        r#"SELECT * FROM project_contracts WHERE project_id = $1 ORDER BY created_at DESC"#,
    )
    .bind(project_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(contracts) => Json(ApiResponse::success(contracts, "获取项目合同成功")),
        Err(e) => {
            tracing::error!("获取项目合同失败: {}", e);
            Json(api_error(500, "获取项目合同失败"))
        }
    }
}

async fn update_contract(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateContractRequest>,
) -> Json<ApiResponse<ProjectContract>> {
    let result = sqlx::query_as::<_, ProjectContract>(
        r#"
        UPDATE project_contracts SET
            contract_no = COALESCE($1, contract_no),
            contract_type = COALESCE($2, contract_type),
            party_a = COALESCE($3, party_a),
            party_b = COALESCE($4, party_b),
            subject = COALESCE($5, subject),
            amount = COALESCE($6, amount),
            tax_amount = COALESCE($7, tax_amount),
            expiration_date = COALESCE($8, expiration_date),
            status = COALESCE($9::text, status),
            payment_terms = COALESCE($10, payment_terms),
            attachment_ids = COALESCE($11, attachment_ids),
            updated_at = NOW()
        WHERE id = $12
        RETURNING *
        "#,
    )
    .bind(&payload.contract_no)
    .bind(&payload.contract_type)
    .bind(&payload.party_a)
    .bind(&payload.party_b)
    .bind(&payload.subject)
    .bind(&payload.amount)
    .bind(&payload.tax_amount)
    .bind(&payload.expiration_date)
    .bind(&payload.status)
    .bind(&payload.payment_terms)
    .bind(&payload.attachment_ids)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(contract)) => Json(ApiResponse::success(contract, "更新合同成功")),
        Ok(None) => Json(api_error(404, "合同不存在")),
        Err(e) => {
            tracing::error!("更新合同失败: {}", e);
            Json(api_error(500, "更新合同失败"))
        }
    }
}

async fn delete_contract(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(
        r#"DELETE FROM project_contracts WHERE id = $1"#,
    )
    .bind(id)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "删除合同成功"))
        }
        Ok(_) => Json(api_error(404, "合同不存在")),
        Err(e) => {
            tracing::error!("删除合同失败: {}", e);
            Json(api_error(500, "删除合同失败"))
        }
    }
}

async fn list_contracts(
    State(state): State<ApiState>,
    Query(params): Query<ContractPaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<ProjectContract>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let (contracts, total): (Vec<ProjectContract>, i64) = if params.project_id.is_some() {
        let contracts_result = sqlx::query_as(
            r#"
            SELECT * FROM project_contracts 
            WHERE project_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&params.project_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

        let count_result = sqlx::query_scalar(
            "SELECT COUNT(*) FROM project_contracts WHERE project_id = $1"
        )
        .bind(&params.project_id)
        .fetch_one(&state.db)
        .await;

        match (contracts_result, count_result) {
            (Ok(c), Ok(t)) => (c, t),
            (Err(e), _) | (_, Err(e)) => {
                tracing::error!("获取合同列表失败: {}", e);
                return Json(api_error(500, "获取合同列表失败"));
            }
        }
    } else if params.contract_type.is_some() {
        let contracts_result = sqlx::query_as(
            r#"
            SELECT * FROM project_contracts 
            WHERE contract_type = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&params.contract_type)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

        let count_result = sqlx::query_scalar(
            "SELECT COUNT(*) FROM project_contracts WHERE contract_type = $1"
        )
        .bind(&params.contract_type)
        .fetch_one(&state.db)
        .await;

        match (contracts_result, count_result) {
            (Ok(c), Ok(t)) => (c, t),
            (Err(e), _) | (_, Err(e)) => {
                tracing::error!("获取合同列表失败: {}", e);
                return Json(api_error(500, "获取合同列表失败"));
            }
        }
    } else if params.status.is_some() {
        let contracts_result = sqlx::query_as(
            r#"
            SELECT * FROM project_contracts 
            WHERE status = $1::text 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&params.status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

        let count_result = sqlx::query_scalar(
            "SELECT COUNT(*) FROM project_contracts WHERE status = $1::text"
        )
        .bind(&params.status)
        .fetch_one(&state.db)
        .await;

        match (contracts_result, count_result) {
            (Ok(c), Ok(t)) => (c, t),
            (Err(e), _) | (_, Err(e)) => {
                tracing::error!("获取合同列表失败: {}", e);
                return Json(api_error(500, "获取合同列表失败"));
            }
        }
    } else {
        let contracts_result = sqlx::query_as(
            r#"
            SELECT * FROM project_contracts 
            ORDER BY created_at DESC 
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

        let count_result = sqlx::query_scalar("SELECT COUNT(*) FROM project_contracts")
            .fetch_one(&state.db)
            .await;

        match (contracts_result, count_result) {
            (Ok(c), Ok(t)) => (c, t),
            (Err(e), _) | (_, Err(e)) => {
                tracing::error!("获取合同列表失败: {}", e);
                return Json(api_error(500, "获取合同列表失败"));
            }
        }
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(contracts, total, page, page_size),
        "获取合同列表成功",
    ))
}

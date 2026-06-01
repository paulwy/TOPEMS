use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde_json::json;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::models::{
    project_contract::{
        ContractPaginationParams, CreateContractRequest,
        ProjectContract, UpdateContractRequest,
    },
};

pub async fn create_contract(
    pool: axum::extract::Extension<PgPool>,
    Json(payload): Json<CreateContractRequest>,
) -> Result<Json<ProjectContract>, (StatusCode, String)> {
    let contract_type = payload.contract_type.to_string();
    let currency = payload.currency.unwrap_or_else(|| "CNY".to_string());
    let tax_amount = payload.tax_amount.unwrap_or(0.0);
    let total_amount = payload.amount + tax_amount;
    let status = "DRAFT".to_string();

    let contract = sqlx::query_as::<_, ProjectContract>(
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
    .fetch_one(&*pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(contract))
}

pub async fn get_contract(
    pool: axum::extract::Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ProjectContract>, (StatusCode, String)> {
    let contract = sqlx::query_as::<_, ProjectContract>(
        r#"SELECT * FROM project_contracts WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (StatusCode::NOT_FOUND, "Contract not found".to_string()),
        _ => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    })?;

    Ok(Json(contract))
}

pub async fn get_project_contracts(
    pool: axum::extract::Extension<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Result<Json<Vec<ProjectContract>>, (StatusCode, String)> {
    let contracts = sqlx::query_as::<_, ProjectContract>(
        r#"SELECT * FROM project_contracts WHERE project_id = $1 ORDER BY created_at DESC"#,
    )
    .bind(project_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(contracts))
}

pub async fn update_contract(
    pool: axum::extract::Extension<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateContractRequest>,
) -> Result<Json<ProjectContract>, (StatusCode, String)> {
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
        "#
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
    .fetch_one(&*pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (StatusCode::NOT_FOUND, "Contract not found".to_string()),
        _ => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    })?;

    Ok(Json(result))
}

pub async fn delete_contract(
    pool: axum::extract::Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query(
        r#"DELETE FROM project_contracts WHERE id = $1"#,
    )
    .bind(id)
    .execute(&*pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Contract not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_contracts(
    pool: axum::extract::Extension<PgPool>,
    Query(params): Query<ContractPaginationParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let (contracts, total): (Vec<ProjectContract>, i64) = if params.project_id.is_some() {
        let contracts: Vec<ProjectContract> = sqlx::query_as(
            r#"
            SELECT * FROM project_contracts 
            WHERE project_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(&params.project_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&*pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM project_contracts WHERE project_id = $1"
        )
        .bind(&params.project_id)
        .fetch_one(&*pool)
        .await
        .unwrap_or(0);

        (contracts, total)
    } else if params.contract_type.is_some() {
        let contracts: Vec<ProjectContract> = sqlx::query_as(
            r#"
            SELECT * FROM project_contracts 
            WHERE contract_type = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(&params.contract_type)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&*pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM project_contracts WHERE contract_type = $1"
        )
        .bind(&params.contract_type)
        .fetch_one(&*pool)
        .await
        .unwrap_or(0);

        (contracts, total)
    } else if params.status.is_some() {
        let contracts: Vec<ProjectContract> = sqlx::query_as(
            r#"
            SELECT * FROM project_contracts 
            WHERE status = $1::text
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(&params.status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&*pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM project_contracts WHERE status = $1::text"
        )
        .bind(&params.status)
        .fetch_one(&*pool)
        .await
        .unwrap_or(0);

        (contracts, total)
    } else {
        let contracts: Vec<ProjectContract> = sqlx::query_as(
            r#"
            SELECT * FROM project_contracts 
            ORDER BY created_at DESC 
            LIMIT $1 OFFSET $2
            "#
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&*pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM project_contracts")
            .fetch_one(&*pool)
            .await
            .unwrap_or(0);

        (contracts, total)
    };

    let result = json!({
        "data": contracts,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) / page_size
    });

    Ok(Json(result))
}
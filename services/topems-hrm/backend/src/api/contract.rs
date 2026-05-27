use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateContractRequest, Contract, UpdateContractRequest};
use topems_shared::ApiResponse;

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/contracts", get(list_contracts).post(create_contract))
        .route(
            "/api/v1/contracts/{id}",
            get(get_contract).put(update_contract).delete(delete_contract),
        )
        .with_state(state);

    Ok(app)
}

#[derive(Debug, Deserialize)]
pub struct ContractPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub employee_id: Option<Uuid>,
    pub status: Option<String>,
}

async fn list_contracts(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ContractPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let emp_filter = params.employee_id;
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Contract>(
        r#"
        SELECT id, employee_id, contract_type, start_date, end_date, 
               salary, status, notes, created_at, updated_at
        FROM contracts
        WHERE ($1::uuid IS NULL OR employee_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&emp_filter)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(contracts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM contracts
                WHERE ($1::uuid IS NULL OR employee_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&emp_filter)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "contracts": contracts,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取合同列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取合同列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取合同列表失败"))
        }
    }
}

async fn create_contract(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Contract>(
        r#"
        INSERT INTO contracts (
            id, employee_id, contract_type, start_date, end_date, 
            salary, status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9)
        RETURNING id, employee_id, contract_type, start_date, end_date, 
                  salary, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.employee_id)
    .bind(&req.contract_type)
    .bind(&req.start_date)
    .bind(&req.end_date)
    .bind(&req.salary)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(contract) => Json(ApiResponse::success(contract, "合同创建成功")),
        Err(e) => {
            tracing::error!("创建合同失败: {}", e);
            Json(ApiResponse::<Contract>::error(500, "合同创建失败"))
        }
    }
}

async fn get_contract(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Contract>> {
    let result = sqlx::query_as::<_, Contract>(
        r#"
        SELECT id, employee_id, contract_type, start_date, end_date, 
               salary, status, notes, created_at, updated_at
        FROM contracts WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(contract)) => Json(ApiResponse::success(contract, "获取合同成功")),
        Ok(None) => Json(ApiResponse::<Contract>::error(404, "合同不存在")),
        Err(e) => {
            tracing::error!("获取合同失败: {}", e);
            Json(ApiResponse::<Contract>::error(500, "获取合同失败"))
        }
    }
}

async fn update_contract(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateContractRequest>,
) -> Json<ApiResponse<Contract>> {
    let existing = sqlx::query_as::<_, Contract>(
        r#"
        SELECT id, employee_id, contract_type, start_date, end_date, 
               salary, status, notes, created_at, updated_at FROM contracts WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(ApiResponse::<Contract>::error(404, "合同不存在")),
        Err(e) => return Json(ApiResponse::<Contract>::error(500, &format!("查询合同失败: {}", e))),
    };

    let contract_type = req.contract_type.unwrap_or(existing.contract_type);
    let start_date = req.start_date.unwrap_or(existing.start_date);
    let end_date = req.end_date.or(existing.end_date);
    let salary = req.salary.or(existing.salary);
    let status = req.status.unwrap_or(existing.status);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Contract>(
        r#"
        UPDATE contracts SET
            contract_type = $2, start_date = $3, end_date = $4, 
            salary = $5, status = $6, notes = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, employee_id, contract_type, start_date, end_date, 
                  salary, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&contract_type)
    .bind(&start_date)
    .bind(&end_date)
    .bind(&salary)
    .bind(&status)
    .bind(&notes)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(contract) => Json(ApiResponse::success(contract, "合同更新成功")),
        Err(e) => {
            tracing::error!("更新合同失败: {}", e);
            Json(ApiResponse::<Contract>::error(500, "合同更新失败"))
        }
    }
}

async fn delete_contract(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM contracts WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "合同删除成功")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "合同不存在")),
        Err(e) => {
            tracing::error!("删除合同失败: {}", e);
            Json(ApiResponse::<String>::error(500, "合同删除失败"))
        }
    }
}

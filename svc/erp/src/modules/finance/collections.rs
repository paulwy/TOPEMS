#![allow(dead_code)]

use axum::extract::{Extension, Json, Query, State};

use uuid::Uuid;

use super::super::ApiState;
use super::PaginationParams;
use crate::models::finance::{CollectionRecord, CreateCollectionRequest};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

pub async fn list_collections(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<CollectionRecord>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, CollectionRecord>(
        r#"
        SELECT id, collection_no, customer_id, customer_name, amount, collection_date, invoice_ids, bank_account_id, bank_account_no, bank_name, voucher_id, voucher_no, status, created_at, created_by
        FROM collections
        WHERE ($1::text IS NULL OR customer_name ILIKE $1 OR collection_no ILIKE $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(params.search.as_ref().map(|s| format!("%{}%", s)))
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(collections) => {
            let total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM collections WHERE ($1::text IS NULL OR customer_name ILIKE $1 OR collection_no ILIKE $1)",
            )
            .bind(params.search.as_ref().map(|s| format!("%{}%", s)))
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(collections, total, page, page_size),
                "获取收款记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取收款记录失败: {}", e);
            Json(api_error(500, "获取收款列表失败"))
        }
    }
}

pub async fn create_collection(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateCollectionRequest>,
) -> Json<ApiResponse<CollectionRecord>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let collection_no = req.collection_no.unwrap_or_else(|| {
        format!(
            "COL{}{:04}",
            now.format("%Y%m"),
            rand::random::<u16>() % 10000
        )
    });

    let result = sqlx::query_as::<_, CollectionRecord>(
        r#"
        INSERT INTO collections (id, collection_no, customer_id, customer_name, amount, collection_date, invoice_ids, bank_account_id, bank_account_no, bank_name, status, created_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'recorded', $11, $12)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&collection_no)
    .bind(&req.customer_id)
    .bind(&req.customer_name)
    .bind(req.amount)
    .bind(&req.collection_date)
    .bind(req.invoice_ids.as_ref().map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null)))
    .bind(&req.bank_account_id)
    .bind(&req.bank_account_no)
    .bind(&req.bank_name)
    .bind(now)
    .bind(None::<Uuid>)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(collection) => Json(ApiResponse::success(collection, "创建收款记录成功")),
        Err(e) => {
            tracing::error!("创建收款记录失败: {}", e);
            Json(api_error(500, "创建收款记录失败"))
        }
    }
}

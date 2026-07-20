#![allow(dead_code)]

use axum::extract::{Extension, Json, Query, State};

use uuid::Uuid;

use super::super::ApiState;
use super::PaginationParams;
use crate::models::finance::{CreatePaymentRequest, PaymentRecord};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

pub async fn list_payments(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<PaymentRecord>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, PaymentRecord>(
        r#"
        SELECT id, payment_no, supplier_id, supplier_name, amount, payment_date, invoice_ids, bank_account_id, bank_account_no, bank_name, voucher_id, voucher_no, status, created_at, created_by
        FROM payments
        WHERE ($1::text IS NULL OR supplier_name ILIKE $1 OR payment_no ILIKE $1)
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
        Ok(payments) => {
            let total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM payments WHERE ($1::text IS NULL OR supplier_name ILIKE $1 OR payment_no ILIKE $1)",
            )
            .bind(params.search.as_ref().map(|s| format!("%{}%", s)))
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(payments, total, page, page_size),
                "获取付款记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取付款记录失败: {}", e);
            Json(api_error(500, "获取付款列表失败"))
        }
    }
}

pub async fn create_payment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePaymentRequest>,
) -> Json<ApiResponse<PaymentRecord>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let payment_no = req.payment_no.unwrap_or_else(|| {
        format!(
            "PAY{}{:04}",
            now.format("%Y%m"),
            rand::random::<u16>() % 10000
        )
    });

    let result = sqlx::query_as::<_, PaymentRecord>(
        r#"
        INSERT INTO payments (id, payment_no, supplier_id, supplier_name, amount, payment_date, invoice_ids, bank_account_id, bank_account_no, bank_name, status, created_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'recorded', $11, $12)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&payment_no)
    .bind(&req.supplier_id)
    .bind(&req.supplier_name)
    .bind(req.amount)
    .bind(&req.payment_date)
    .bind(req.invoice_ids.as_ref().map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null)))
    .bind(&req.bank_account_id)
    .bind(&req.bank_account_no)
    .bind(&req.bank_name)
    .bind(now)
    .bind(None::<Uuid>)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(payment) => Json(ApiResponse::success(payment, "创建付款记录成功")),
        Err(e) => {
            tracing::error!("创建付款记录失败: {}", e);
            Json(api_error(500, "创建付款记录失败"))
        }
    }
}

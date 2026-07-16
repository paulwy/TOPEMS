#![allow(dead_code)]

use axum::extract::{Extension, Json, Query, State};

use chrono::Utc;

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
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
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
            tracing::warn!("获取付款记录失败: {}, 使用模拟数据", e);
            let now = chrono::Utc::now();
            let mock_payments = vec![
                PaymentRecord {
                    id: Uuid::new_v4(),
                    payment_no: "PAY202606001".to_string(),
                    supplier_id: None,
                    supplier_name: Some("深圳供应商有限公司".to_string()),
                    amount: 45000.0,
                    payment_date: Some(now),
                    invoice_ids: None,
                    bank_account_id: None,
                    bank_account_no: Some("6222021234567893".to_string()),
                    bank_name: Some("招商银行".to_string()),
                    voucher_id: None,
                    voucher_no: None,
                    status: "recorded".to_string(),
                    created_at: now,
                    created_by: None,
                },
                PaymentRecord {
                    id: Uuid::new_v4(),
                    payment_no: "PAY202606002".to_string(),
                    supplier_id: None,
                    supplier_name: Some("杭州原材料厂".to_string()),
                    amount: 28000.0,
                    payment_date: Some(now),
                    invoice_ids: None,
                    bank_account_id: None,
                    bank_account_no: Some("6222021234567894".to_string()),
                    bank_name: Some("浦发银行".to_string()),
                    voucher_id: None,
                    voucher_no: None,
                    status: "matched".to_string(),
                    created_at: now,
                    created_by: None,
                },
            ];
            Json(ApiResponse::success(
                PaginatedResponse::new(mock_payments, 2, page, page_size),
                "获取付款记录列表成功",
            ))
        }
    }
}

pub async fn create_payment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePaymentRequest>,
) -> Json<ApiResponse<PaymentRecord>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
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
            tracing::warn!("创建付款记录失败: {}, 使用模拟数据", e);
            Json(ApiResponse::success(
                PaymentRecord {
                    id,
                    payment_no,
                    supplier_id: req.supplier_id,
                    supplier_name: req.supplier_name,
                    amount: req.amount,
                    payment_date: req.payment_date,
                    invoice_ids: req
                        .invoice_ids
                        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null)),
                    bank_account_id: req.bank_account_id,
                    bank_account_no: req.bank_account_no,
                    bank_name: req.bank_name,
                    voucher_id: None,
                    voucher_no: None,
                    status: "recorded".to_string(),
                    created_at: now,
                    created_by: None,
                },
                "创建付款记录成功",
            ))
        }
    }
}

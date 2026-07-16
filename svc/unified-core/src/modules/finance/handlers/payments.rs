use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::super::models::{
    CreatePaymentRequest, Payment, PaymentDetailResponse, PaymentItem, PaymentListResponse,
    PaymentQuery, UpdatePaymentRequest,
};
use super::utils::{default_tenant_id, generate_payment_no};

pub async fn list_payments(
    State(state): State<AppState>,
    Query(query): Query<PaymentQuery>,
) -> Json<ApiResponse<PaymentListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_finance_payments
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR payment_date >= $3)
             AND ($4::text IS NULL OR payment_date <= $4)"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.start_date.clone())
    .bind(query.end_date.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询付款单总数失败: {}", e);
            return Json(api_error(500, "查询付款单总数失败"));
        }
    };

    let items: Vec<Payment> = match sqlx::query_as(
        r#"SELECT id, tenant_id, payment_no, supplier_id, supplier_name, payment_method,
                  bank_account_id, bank_name, bank_account_no, total_amount, currency,
                  payment_date, actual_payment_date, status, remark, voucher_id, created_by,
                  created_at, updated_at
           FROM core_finance_payments
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR payment_date >= $3)
             AND ($4::text IS NULL OR payment_date <= $4)
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.start_date.clone())
    .bind(query.end_date.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询付款单列表失败: {}", e);
            return Json(api_error(500, "查询付款单列表失败"));
        }
    };

    Json(api_success(PaymentListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_payment(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PaymentDetailResponse>> {
    let tenant_id = default_tenant_id();

    let payment: Option<Payment> = match sqlx::query_as(
        r#"SELECT id, tenant_id, payment_no, supplier_id, supplier_name, payment_method,
                  bank_account_id, bank_name, bank_account_no, total_amount, currency,
                  payment_date, actual_payment_date, status, remark, voucher_id, created_by,
                  created_at, updated_at
           FROM core_finance_payments WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询付款单详情失败: {}", e);
            return Json(api_error(500, "查询付款单详情失败"));
        }
    };

    let payment = match payment {
        Some(p) => p,
        None => return Json(api_error(404, "付款单不存在")),
    };

    let items: Vec<PaymentItem> = match sqlx::query_as(
        r#"SELECT id, payment_id, line_no, invoice_id, invoice_no, payable_amount,
                  payment_amount, remark, created_at
           FROM core_finance_payment_items WHERE payment_id = $1
           ORDER BY line_no ASC NULLS LAST"#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询付款明细失败: {}", e);
            return Json(api_error(500, "查询付款明细失败"));
        }
    };

    Json(api_success(PaymentDetailResponse { payment, items }))
}

pub async fn create_payment(
    State(state): State<AppState>,
    Json(req): Json<CreatePaymentRequest>,
) -> Json<ApiResponse<PaymentDetailResponse>> {
    if req.payment_method.trim().is_empty() {
        return Json(api_error(400, "付款方式不能为空"));
    }

    let tenant_id = default_tenant_id();
    let payment_no = generate_payment_no();
    let currency = req.currency.unwrap_or_else(|| "CNY".to_string());

    let payment: Payment = match sqlx::query_as(
        r#"INSERT INTO core_finance_payments
               (tenant_id, payment_no, supplier_id, supplier_name, payment_method,
                bank_account_id, bank_name, bank_account_no, total_amount, currency,
                payment_date, remark, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft')
           RETURNING id, tenant_id, payment_no, supplier_id, supplier_name, payment_method,
                     bank_account_id, bank_name, bank_account_no, total_amount, currency,
                     payment_date, actual_payment_date, status, remark, voucher_id, created_by,
                     created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(&payment_no)
    .bind(req.supplier_id)
    .bind(req.supplier_name.clone())
    .bind(req.payment_method.clone())
    .bind(req.bank_account_id)
    .bind(req.bank_name.clone())
    .bind(req.bank_account_no.clone())
    .bind(req.total_amount)
    .bind(&currency)
    .bind(req.payment_date)
    .bind(req.remark.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建付款单失败: {}", e);
            return Json(api_error(500, "创建付款单失败"));
        }
    };

    for (index, item) in req.items.iter().enumerate() {
        let _ = sqlx::query(
            r#"INSERT INTO core_finance_payment_items
                   (payment_id, line_no, invoice_id, invoice_no, payable_amount,
                    payment_amount, remark)
               VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
        )
        .bind(payment.id)
        .bind((index + 1) as i32)
        .bind(item.invoice_id)
        .bind(item.invoice_no.clone())
        .bind(item.payable_amount)
        .bind(item.payment_amount)
        .bind(item.remark.clone())
        .execute(&state.pool)
        .await;
    }

    let items: Vec<PaymentItem> = match sqlx::query_as(
        r#"SELECT id, payment_id, line_no, invoice_id, invoice_no, payable_amount,
                  payment_amount, remark, created_at
           FROM core_finance_payment_items WHERE payment_id = $1
           ORDER BY line_no ASC NULLS LAST"#,
    )
    .bind(payment.id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询付款明细失败: {}", e);
            return Json(api_error(500, "查询付款明细失败"));
        }
    };

    Json(api_success(PaymentDetailResponse { payment, items }))
}

pub async fn update_payment(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePaymentRequest>,
) -> Json<ApiResponse<PaymentDetailResponse>> {
    let tenant_id = default_tenant_id();

    let payment: Option<Payment> = match sqlx::query_as(
        r#"UPDATE core_finance_payments
           SET supplier_id = COALESCE($1, supplier_id),
               supplier_name = COALESCE($2, supplier_name),
               payment_method = COALESCE($3, payment_method),
               bank_account_id = COALESCE($4, bank_account_id),
               bank_name = COALESCE($5, bank_name),
               bank_account_no = COALESCE($6, bank_account_no),
               total_amount = COALESCE($7, total_amount),
               currency = COALESCE($8, currency),
               payment_date = COALESCE($9, payment_date),
               remark = COALESCE($10, remark),
               updated_at = NOW()
           WHERE id = $11 AND tenant_id = $12 AND status = 'draft'
           RETURNING id, tenant_id, payment_no, supplier_id, supplier_name, payment_method,
                     bank_account_id, bank_name, bank_account_no, total_amount, currency,
                     payment_date, actual_payment_date, status, remark, voucher_id, created_by,
                     created_at, updated_at"#,
    )
    .bind(req.supplier_id)
    .bind(req.supplier_name)
    .bind(req.payment_method)
    .bind(req.bank_account_id)
    .bind(req.bank_name)
    .bind(req.bank_account_no)
    .bind(req.total_amount)
    .bind(req.currency)
    .bind(req.payment_date)
    .bind(req.remark)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新付款单失败: {}", e);
            return Json(api_error(500, "更新付款单失败"));
        }
    };

    let payment = match payment {
        Some(p) => p,
        None => return Json(api_error(404, "付款单不存在或状态不可编辑")),
    };

    if let Some(items) = req.items {
        let _ = sqlx::query(r#"DELETE FROM core_finance_payment_items WHERE payment_id = $1"#)
            .bind(id)
            .execute(&state.pool)
            .await;

        for (index, item) in items.iter().enumerate() {
            let _ = sqlx::query(
                r#"INSERT INTO core_finance_payment_items
                       (payment_id, line_no, invoice_id, invoice_no, payable_amount,
                        payment_amount, remark)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
            )
            .bind(id)
            .bind((index + 1) as i32)
            .bind(item.invoice_id)
            .bind(item.invoice_no.clone())
            .bind(item.payable_amount)
            .bind(item.payment_amount)
            .bind(item.remark.clone())
            .execute(&state.pool)
            .await;
        }
    }

    let items: Vec<PaymentItem> = match sqlx::query_as(
        r#"SELECT id, payment_id, line_no, invoice_id, invoice_no, payable_amount,
                  payment_amount, remark, created_at
           FROM core_finance_payment_items WHERE payment_id = $1
           ORDER BY line_no ASC NULLS LAST"#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询付款明细失败: {}", e);
            return Json(api_error(500, "查询付款明细失败"));
        }
    };

    Json(api_success(PaymentDetailResponse { payment, items }))
}

pub async fn delete_payment(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let _ = sqlx::query(r#"DELETE FROM core_finance_payment_items WHERE payment_id = $1"#)
        .bind(id)
        .execute(&state.pool)
        .await;

    let result = sqlx::query(
        r#"DELETE FROM core_finance_payments WHERE id = $1 AND tenant_id = $2 AND status = 'draft'"#,
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "付款单不存在或状态不可删除")),
        Err(e) => {
            tracing::error!("删除付款单失败: {}", e);
            Json(api_error(500, "删除付款单失败"))
        }
    }
}

pub async fn submit_payment(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Payment>> {
    let tenant_id = default_tenant_id();

    let payment: Option<Payment> = match sqlx::query_as(
        r#"UPDATE core_finance_payments
           SET status = 'submitted', updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
           RETURNING id, tenant_id, payment_no, supplier_id, supplier_name, payment_method,
                     bank_account_id, bank_name, bank_account_no, total_amount, currency,
                     payment_date, actual_payment_date, status, remark, voucher_id, created_by,
                     created_at, updated_at"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("提交付款单失败: {}", e);
            return Json(api_error(500, "提交付款单失败"));
        }
    };

    match payment {
        Some(payment) => Json(api_success(payment)),
        None => Json(api_error(404, "付款单不存在或状态不可提交")),
    }
}

pub async fn approve_payment(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Payment>> {
    let tenant_id = default_tenant_id();

    let payment: Option<Payment> = match sqlx::query_as(
        r#"UPDATE core_finance_payments
           SET status = 'approved', updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2 AND status = 'submitted'
           RETURNING id, tenant_id, payment_no, supplier_id, supplier_name, payment_method,
                     bank_account_id, bank_name, bank_account_no, total_amount, currency,
                     payment_date, actual_payment_date, status, remark, voucher_id, created_by,
                     created_at, updated_at"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("审批付款单失败: {}", e);
            return Json(api_error(500, "审批付款单失败"));
        }
    };

    match payment {
        Some(payment) => Json(api_success(payment)),
        None => Json(api_error(404, "付款单不存在或状态不可审批")),
    }
}

pub async fn reject_payment(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Payment>> {
    let tenant_id = default_tenant_id();

    let payment: Option<Payment> = match sqlx::query_as(
        r#"UPDATE core_finance_payments
           SET status = 'rejected', updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2 AND status = 'submitted'
           RETURNING id, tenant_id, payment_no, supplier_id, supplier_name, payment_method,
                     bank_account_id, bank_name, bank_account_no, total_amount, currency,
                     payment_date, actual_payment_date, status, remark, voucher_id, created_by,
                     created_at, updated_at"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("拒绝付款单失败: {}", e);
            return Json(api_error(500, "拒绝付款单失败"));
        }
    };

    match payment {
        Some(payment) => Json(api_success(payment)),
        None => Json(api_error(404, "付款单不存在或状态不可拒绝")),
    }
}

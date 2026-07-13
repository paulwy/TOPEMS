use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Datelike, Local, NaiveDate, Utc};
use sqlx::Row;
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    CreatePaymentItemRequest, CreatePaymentRequest, Payment, PaymentDetailResponse, PaymentItem,
    PaymentListResponse, PaymentQuery, UpdatePaymentRequest,
};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
}

fn generate_payment_no() -> String {
    let now = chrono::Local::now();
    format!(
        "PY{}{:06}",
        now.format("%Y%m%d"),
        rand::random::<u32>() % 1000000
    )
}

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

use super::models::{
    Account, AccountBalance, AccountListResponse, AccountOpeningBalance, AccountQuery,
    BatchOperationResult, CreateAccountRequest, CreateVoucherRequest, UpdateAccountRequest,
    Voucher, VoucherDetailResponse, VoucherEntry, VoucherListResponse, VoucherQuery,
};

pub async fn list_accounts(
    State(state): State<AppState>,
    Query(query): Query<AccountQuery>,
) -> Json<ApiResponse<AccountListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.pagesize.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_finance_accounts WHERE tenant_id = $1
           AND ($2::text IS NULL OR status = $2)
           AND ($3::text IS NULL OR parent_id = $3)
           AND ($4::integer IS NULL OR level = $4)
           AND ($5::text IS NULL OR (code LIKE '%' || $5 || '%' OR name LIKE '%' || $5 || '%'))"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.parent_id.clone())
    .bind(query.level)
    .bind(query.keyword.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询科目总数失败: {}", e);
            return Json(api_error(500, "查询科目总数失败"));
        }
    };

    let accounts: Vec<Account> = match sqlx::query_as(
        r#"SELECT * FROM core_finance_accounts WHERE tenant_id = $1
           AND ($2::text IS NULL OR status = $2)
           AND ($3::text IS NULL OR parent_id = $3)
           AND ($4::integer IS NULL OR level = $4)
           AND ($5::text IS NULL OR (code LIKE '%' || $5 || '%' OR name LIKE '%' || $5 || '%'))
           ORDER BY code ASC LIMIT $6 OFFSET $7"#,
    )
    .bind(tenant_id)
    .bind(query.status)
    .bind(query.parent_id)
    .bind(query.level)
    .bind(query.keyword)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询科目列表失败: {}", e);
            return Json(api_error(500, "查询科目列表失败"));
        }
    };

    Json(api_success(AccountListResponse {
        items: accounts,
        total,
        page,
        page_size,
    }))
}

pub async fn get_account(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Account>> {
    let tenant_id = default_tenant_id();

    let account: Option<Account> = match sqlx::query_as(
        "SELECT * FROM core_finance_accounts WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询科目失败: {}", e);
            return Json(api_error(500, "查询科目失败"));
        }
    };

    match account {
        Some(account) => Json(api_success(account)),
        None => Json(api_error(404, "科目不存在")),
    }
}

pub async fn create_account(
    State(state): State<AppState>,
    Json(req): Json<CreateAccountRequest>,
) -> Json<ApiResponse<Account>> {
    let tenant_id = default_tenant_id();

    let level = if let Some(parent_id) = req.parent_id {
        let parent: (i32,) =
            match sqlx::query_as("SELECT level FROM core_finance_accounts WHERE id = $1")
                .bind(parent_id)
                .fetch_one(&state.pool)
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("查询父科目失败: {}", e);
                    return Json(api_error(404, "父科目不存在"));
                }
            };
        parent.0 + 1
    } else {
        1
    };

    let account: Account = match sqlx::query_as(
        r#"INSERT INTO core_finance_accounts (tenant_id, code, name, parent_id, account_type, level, currency, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(req.code)
    .bind(req.name)
    .bind(req.parent_id)
    .bind(req.account_type)
    .bind(level)
    .bind(req.currency)
    .bind(req.description)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建科目失败: {}", e);
            return Json(api_error(500, "创建科目失败"));
        }
    };

    Json(api_success(account))
}

pub async fn update_account(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAccountRequest>,
) -> Json<ApiResponse<Account>> {
    let tenant_id = default_tenant_id();

    let account: Option<Account> = match sqlx::query_as(
        r#"UPDATE core_finance_accounts
           SET code = COALESCE($1, code),
               name = COALESCE($2, name),
               parent_id = COALESCE($3, parent_id),
               account_type = COALESCE($4, account_type),
               currency = COALESCE($5, currency),
               description = COALESCE($6, description),
               status = COALESCE($7, status),
               updated_at = NOW()
           WHERE tenant_id = $8 AND id = $9
           RETURNING *"#,
    )
    .bind(req.code)
    .bind(req.name)
    .bind(req.parent_id)
    .bind(req.account_type)
    .bind(req.currency)
    .bind(req.description)
    .bind(req.status)
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新科目失败: {}", e);
            return Json(api_error(500, "更新科目失败"));
        }
    };

    match account {
        Some(account) => Json(api_success(account)),
        None => Json(api_error(404, "科目不存在")),
    }
}

pub async fn delete_account(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let has_children: bool = match sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM core_finance_accounts WHERE parent_id = $1)",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("检查科目子节点失败: {}", e);
            return Json(api_error(500, "检查科目子节点失败"));
        }
    };

    if has_children {
        return Json(api_error(400, "存在子科目，无法删除"));
    }

    let result = sqlx::query("DELETE FROM core_finance_accounts WHERE tenant_id = $1 AND id = $2")
        .bind(tenant_id)
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "科目不存在")),
        Err(e) => {
            tracing::error!("删除科目失败: {}", e);
            Json(api_error(500, "删除科目失败"))
        }
    }
}

pub async fn get_account_tree(State(state): State<AppState>) -> Json<ApiResponse<Vec<Account>>> {
    let tenant_id = default_tenant_id();

    let accounts: Vec<Account> = match sqlx::query_as(
        "SELECT * FROM core_finance_accounts WHERE tenant_id = $1 ORDER BY code ASC",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询科目树失败: {}", e);
            return Json(api_error(500, "查询科目树失败"));
        }
    };

    Json(api_success(accounts))
}

pub async fn get_account_balances(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<AccountBalance>>> {
    let tenant_id = default_tenant_id();

    let balances: Vec<AccountBalance> = match sqlx::query_as(
        r#"SELECT a.id as account_id, a.code as account_code, a.name as account_name,
                  COALESCE(SUM(e.debit), 0) as debit,
                  COALESCE(SUM(e.credit), 0) as credit,
                  COALESCE(SUM(e.debit), 0) - COALESCE(SUM(e.credit), 0) as balance
           FROM core_finance_accounts a
           LEFT JOIN core_finance_voucher_entries e ON a.id = e.account_id
           WHERE a.tenant_id = $1
           GROUP BY a.id, a.code, a.name
           ORDER BY a.code ASC"#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询科目余额失败: {}", e);
            return Json(api_error(500, "查询科目余额失败"));
        }
    };

    Json(api_success(balances))
}

pub async fn get_opening_balances(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<AccountOpeningBalance>>> {
    let tenant_id = default_tenant_id();

    let balances: Vec<AccountOpeningBalance> = match sqlx::query_as(
        "SELECT * FROM core_finance_account_opening_balances WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询期初余额失败: {}", e);
            return Json(api_error(500, "查询期初余额失败"));
        }
    };

    Json(api_success(balances))
}

pub async fn set_opening_balance(
    State(state): State<AppState>,
    Path(account_id): Path<Uuid>,
) -> Json<ApiResponse<AccountOpeningBalance>> {
    let tenant_id = default_tenant_id();

    let balance: Option<AccountOpeningBalance> = match sqlx::query_as(
        r#"INSERT INTO core_finance_account_opening_balances (tenant_id, account_id, period, debit, credit)
           VALUES ($1, $2, '202401', 0, 0)
           ON CONFLICT (tenant_id, account_id, period) DO UPDATE SET debit = EXCLUDED.debit, credit = EXCLUDED.credit
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(account_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("设置期初余额失败: {}", e);
            return Json(api_error(500, "设置期初余额失败"));
        }
    };

    match balance {
        Some(balance) => Json(api_success(balance)),
        None => Json(api_error(500, "设置期初余额失败")),
    }
}

pub async fn carry_forward_opening_balance(
    State(state): State<AppState>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let _ = sqlx::query(
        r#"INSERT INTO core_finance_account_opening_balances (tenant_id, account_id, period, debit, credit)
           SELECT tenant_id, account_id, '202402', debit, credit
           FROM core_finance_account_opening_balances
           WHERE tenant_id = $1 AND period = '202401'
           ON CONFLICT (tenant_id, account_id, period) DO NOTHING"#,
    )
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    Json(api_success(true))
}

fn generate_voucher_no() -> String {
    let now = chrono::Local::now();
    format!(
        "V{}{:06}",
        now.format("%Y%m%d"),
        rand::random::<u32>() % 1000000
    )
}

pub async fn list_vouchers(
    State(state): State<AppState>,
    Query(query): Query<VoucherQuery>,
) -> Json<ApiResponse<VoucherListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_finance_vouchers
           WHERE tenant_id = $1
           AND ($2::text IS NULL OR voucher_type = $2)
           AND ($3::text IS NULL OR period = $3)
           AND ($4::text IS NULL OR status = $4)"#,
    )
    .bind(tenant_id)
    .bind(query.voucher_type.clone())
    .bind(query.period.clone())
    .bind(query.status.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证总数失败: {}", e);
            return Json(api_error(500, "查询凭证总数失败"));
        }
    };

    let vouchers: Vec<Voucher> = match sqlx::query_as(
        r#"SELECT * FROM core_finance_vouchers
           WHERE tenant_id = $1
           AND ($2::text IS NULL OR voucher_type = $2)
           AND ($3::text IS NULL OR period = $3)
           AND ($4::text IS NULL OR status = $4)
           ORDER BY voucher_date DESC, voucher_no DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(query.voucher_type)
    .bind(query.period)
    .bind(query.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证列表失败: {}", e);
            return Json(api_error(500, "查询凭证列表失败"));
        }
    };

    Json(api_success(VoucherListResponse {
        items: vouchers,
        total,
        page,
        page_size,
    }))
}

pub async fn get_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<VoucherDetailResponse>> {
    let tenant_id = default_tenant_id();

    let voucher: Option<Voucher> = match sqlx::query_as(
        "SELECT * FROM core_finance_vouchers WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证失败: {}", e);
            return Json(api_error(500, "查询凭证失败"));
        }
    };

    let voucher = match voucher {
        Some(v) => v,
        None => return Json(api_error(404, "凭证不存在")),
    };

    let entries: Vec<VoucherEntry> = match sqlx::query_as(
        "SELECT * FROM core_finance_voucher_entries WHERE voucher_id = $1 ORDER BY line_no ASC",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证分录失败: {}", e);
            return Json(api_error(500, "查询凭证分录失败"));
        }
    };

    Json(api_success(VoucherDetailResponse { voucher, entries }))
}

pub async fn get_voucher_entries(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<VoucherEntry>>> {
    let entries: Vec<VoucherEntry> = match sqlx::query_as(
        "SELECT * FROM core_finance_voucher_entries WHERE voucher_id = $1 ORDER BY line_no ASC",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证分录失败: {}", e);
            return Json(api_error(500, "查询凭证分录失败"));
        }
    };

    Json(api_success(entries))
}

pub async fn create_voucher(
    State(state): State<AppState>,
    Json(req): Json<CreateVoucherRequest>,
) -> Json<ApiResponse<VoucherDetailResponse>> {
    let tenant_id = default_tenant_id();
    let voucher_no = generate_voucher_no();

    let voucher_date = match chrono::NaiveDate::parse_from_str(&req.voucher_date, "%Y-%m-%d") {
        Ok(v) => v,
        Err(_) => return Json(api_error(400, "日期格式不正确")),
    };

    let period = req
        .period
        .unwrap_or_else(|| format!("{}{:02}", voucher_date.year(), voucher_date.month()));

    let voucher: Voucher = match sqlx::query_as(
        r#"INSERT INTO core_finance_vouchers (tenant_id, voucher_no, voucher_type, period, voucher_date, summary)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(voucher_no)
    .bind(req.voucher_type)
    .bind(period)
    .bind(voucher_date)
    .bind(req.summary)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建凭证失败: {}", e);
            return Json(api_error(500, "创建凭证失败"));
        }
    };

    for (index, entry) in req.entries.iter().enumerate() {
        let account_id = match Uuid::parse_str(&entry.account_id) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let account: Option<(String, String)> =
            match sqlx::query_as("SELECT code, name FROM core_finance_accounts WHERE id = $1")
                .bind(account_id)
                .fetch_optional(&state.pool)
                .await
            {
                Ok(v) => v,
                Err(_) => None,
            };

        if let Some((account_code, account_name)) = account {
            let _ = sqlx::query(
                r#"INSERT INTO core_finance_voucher_entries
                   (voucher_id, line_no, account_id, account_code, account_name, debit, credit, summary)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
            )
            .bind(voucher.id)
            .bind((index + 1) as i32)
            .bind(account_id)
            .bind(account_code)
            .bind(account_name)
            .bind(entry.debit)
            .bind(entry.credit)
            .bind(entry.summary.clone())
            .execute(&state.pool)
            .await;
        }
    }

    let entries: Vec<VoucherEntry> = match sqlx::query_as(
        "SELECT * FROM core_finance_voucher_entries WHERE voucher_id = $1 ORDER BY line_no ASC",
    )
    .bind(voucher.id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证分录失败: {}", e);
            return Json(api_error(500, "查询凭证分录失败"));
        }
    };

    Json(api_success(VoucherDetailResponse { voucher, entries }))
}

pub async fn update_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateVoucherRequest>,
) -> Json<ApiResponse<Voucher>> {
    let tenant_id = default_tenant_id();

    let voucher_date = match chrono::NaiveDate::parse_from_str(&req.voucher_date, "%Y-%m-%d") {
        Ok(v) => v,
        Err(_) => return Json(api_error(400, "日期格式不正确")),
    };

    let period = req
        .period
        .unwrap_or_else(|| format!("{}{:02}", voucher_date.year(), voucher_date.month()));

    let voucher: Option<Voucher> = match sqlx::query_as(
        r#"UPDATE core_finance_vouchers
           SET voucher_type = $1, period = $2, voucher_date = $3, summary = $4, updated_at = NOW()
           WHERE tenant_id = $5 AND id = $6 AND status = 'draft'
           RETURNING *"#,
    )
    .bind(req.voucher_type)
    .bind(period)
    .bind(voucher_date)
    .bind(req.summary)
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新凭证失败: {}", e);
            return Json(api_error(500, "更新凭证失败"));
        }
    };

    match voucher {
        Some(voucher) => Json(api_success(voucher)),
        None => Json(api_error(404, "凭证不存在或状态不可修改")),
    }
}

pub async fn delete_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result = sqlx::query(
        "DELETE FROM core_finance_vouchers WHERE tenant_id = $1 AND id = $2 AND status = 'draft'",
    )
    .bind(tenant_id)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "凭证不存在或状态不可删除")),
        Err(e) => {
            tracing::error!("删除凭证失败: {}", e);
            Json(api_error(500, "删除凭证失败"))
        }
    }
}

pub async fn submit_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let tenant_id = default_tenant_id();

    let voucher: Option<Voucher> = match sqlx::query_as(
        r#"UPDATE core_finance_vouchers
           SET status = 'submitted', updated_at = NOW()
           WHERE tenant_id = $1 AND id = $2 AND status = 'draft'
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("提交凭证失败: {}", e);
            return Json(api_error(500, "提交凭证失败"));
        }
    };

    match voucher {
        Some(voucher) => Json(api_success(voucher)),
        None => Json(api_error(404, "凭证不存在或状态不可提交")),
    }
}

pub async fn approve_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let tenant_id = default_tenant_id();

    let voucher: Option<Voucher> = match sqlx::query_as(
        r#"UPDATE core_finance_vouchers
           SET status = 'approved', updated_at = NOW()
           WHERE tenant_id = $1 AND id = $2 AND status = 'submitted'
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("审批凭证失败: {}", e);
            return Json(api_error(500, "审批凭证失败"));
        }
    };

    match voucher {
        Some(voucher) => Json(api_success(voucher)),
        None => Json(api_error(404, "凭证不存在或状态不可审批")),
    }
}

pub async fn post_voucher(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Voucher>> {
    let tenant_id = default_tenant_id();

    let voucher: Option<Voucher> = match sqlx::query_as(
        r#"UPDATE core_finance_vouchers
           SET status = 'posted', updated_at = NOW()
           WHERE tenant_id = $1 AND id = $2 AND status = 'approved'
           RETURNING *"#,
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("过账凭证失败: {}", e);
            return Json(api_error(500, "过账凭证失败"));
        }
    };

    match voucher {
        Some(voucher) => Json(api_success(voucher)),
        None => Json(api_error(404, "凭证不存在或状态不可过账")),
    }
}

pub async fn batch_approve_vouchers(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<BatchOperationResult>> {
    let ids: Vec<Uuid> = match body.get("ids").and_then(|v| v.as_array()) {
        Some(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().and_then(|s| Uuid::parse_str(s).ok()))
            .collect(),
        None => return Json(api_error(400, "缺少 ids 参数")),
    };

    let tenant_id = default_tenant_id();
    let mut success = 0;
    let mut failed = 0;
    let mut errors: Vec<String> = Vec::new();

    for id in ids {
        let result = sqlx::query(
            r#"UPDATE core_finance_vouchers
               SET status = 'approved', updated_at = NOW()
               WHERE tenant_id = $1 AND id = $2 AND status = 'submitted'"#,
        )
        .bind(tenant_id)
        .bind(id)
        .execute(&state.pool)
        .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => success += 1,
            Ok(_) => {
                failed += 1;
                errors.push(format!("凭证 {} 审批失败", id));
            }
            Err(e) => {
                failed += 1;
                errors.push(format!("凭证 {} 错误: {}", id, e));
            }
        }
    }

    Json(api_success(BatchOperationResult {
        success,
        failed,
        errors,
    }))
}

pub async fn batch_post_vouchers(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<BatchOperationResult>> {
    let ids: Vec<Uuid> = match body.get("ids").and_then(|v| v.as_array()) {
        Some(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().and_then(|s| Uuid::parse_str(s).ok()))
            .collect(),
        None => return Json(api_error(400, "缺少 ids 参数")),
    };

    let tenant_id = default_tenant_id();
    let mut success = 0;
    let mut failed = 0;
    let mut errors: Vec<String> = Vec::new();

    for id in ids {
        let result = sqlx::query(
            r#"UPDATE core_finance_vouchers
               SET status = 'posted', updated_at = NOW()
               WHERE tenant_id = $1 AND id = $2 AND status = 'approved'"#,
        )
        .bind(tenant_id)
        .bind(id)
        .execute(&state.pool)
        .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => success += 1,
            Ok(_) => {
                failed += 1;
                errors.push(format!("凭证 {} 过账失败", id));
            }
            Err(e) => {
                failed += 1;
                errors.push(format!("凭证 {} 错误: {}", id, e));
            }
        }
    }

    Json(api_success(BatchOperationResult {
        success,
        failed,
        errors,
    }))
}

pub async fn batch_delete_vouchers(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<BatchOperationResult>> {
    let ids: Vec<Uuid> = match body.get("ids").and_then(|v| v.as_array()) {
        Some(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().and_then(|s| Uuid::parse_str(s).ok()))
            .collect(),
        None => return Json(api_error(400, "缺少 ids 参数")),
    };

    let tenant_id = default_tenant_id();
    let mut success = 0;
    let mut failed = 0;
    let mut errors: Vec<String> = Vec::new();

    for id in ids {
        let result = sqlx::query(
            "DELETE FROM core_finance_vouchers WHERE tenant_id = $1 AND id = $2 AND status = 'draft'",
        )
        .bind(tenant_id)
        .bind(id)
        .execute(&state.pool)
        .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => success += 1,
            Ok(_) => {
                failed += 1;
                errors.push(format!("凭证 {} 删除失败", id));
            }
            Err(e) => {
                failed += 1;
                errors.push(format!("凭证 {} 错误: {}", id, e));
            }
        }
    }

    Json(api_success(BatchOperationResult {
        success,
        failed,
        errors,
    }))
}

pub async fn get_next_voucher_no(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(api_success(
        serde_json::json!({ "voucher_no": generate_voucher_no() }),
    ))
}

pub async fn list_voucher_templates(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let tenant_id = default_tenant_id();

    let rows = match sqlx::query(
        r#"SELECT id, name, voucher_type, applicable_module, status, is_default, created_at
           FROM core_finance_voucher_templates WHERE tenant_id = $1"#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证模板失败: {}", e);
            return Json(api_error(500, "查询凭证模板失败"));
        }
    };

    let templates: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|row| {
            serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "voucher_type": row.get::<String, _>("voucher_type"),
                "applicable_module": row.get::<Option<String>, _>("applicable_module"),
                "status": row.get::<String, _>("status"),
                "is_default": row.get::<bool, _>("is_default"),
                "created_at": row.get::<DateTime<Utc>, _>("created_at"),
            })
        })
        .collect();

    Json(api_success(templates))
}

pub async fn get_voucher_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = default_tenant_id();

    let row = match sqlx::query(
        r#"SELECT id, name, voucher_type, applicable_module, status, is_default, template_data, created_at
           FROM core_finance_voucher_templates WHERE tenant_id = $1 AND id = $2"#,
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询凭证模板失败: {}", e);
            return Json(api_error(500, "查询凭证模板失败"));
        }
    };

    let template = match row {
        Some(row) => serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "name": row.get::<String, _>("name"),
            "voucher_type": row.get::<String, _>("voucher_type"),
            "applicable_module": row.get::<Option<String>, _>("applicable_module"),
            "status": row.get::<String, _>("status"),
            "is_default": row.get::<bool, _>("is_default"),
            "template_data": row.get::<serde_json::Value, _>("template_data"),
            "created_at": row.get::<DateTime<Utc>, _>("created_at"),
        }),
        None => return Json(api_error(404, "凭证模板不存在")),
    };

    Json(api_success(template))
}

pub async fn create_voucher_template(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = default_tenant_id();
    let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let voucher_type = body
        .get("voucher_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let is_default = body
        .get("is_default")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let template_data = body
        .get("template_data")
        .cloned()
        .unwrap_or(serde_json::json!({}));

    if name.is_empty() || voucher_type.is_empty() {
        return Json(api_error(400, "名称和类型不能为空"));
    }

    let row = match sqlx::query(
        r#"INSERT INTO core_finance_voucher_templates
           (tenant_id, name, voucher_type, status, is_default, template_data)
           VALUES ($1, $2, $3, 'active', $4, $5)
           RETURNING id, name, voucher_type, status, is_default, created_at"#,
    )
    .bind(tenant_id)
    .bind(name)
    .bind(voucher_type)
    .bind(is_default)
    .bind(template_data)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建凭证模板失败: {}", e);
            return Json(api_error(500, "创建凭证模板失败"));
        }
    };

    let template = match row {
        Some(row) => serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "name": row.get::<String, _>("name"),
            "voucher_type": row.get::<String, _>("voucher_type"),
            "status": row.get::<String, _>("status"),
            "is_default": row.get::<bool, _>("is_default"),
            "created_at": row.get::<DateTime<Utc>, _>("created_at"),
        }),
        None => return Json(api_error(500, "创建凭证模板失败")),
    };

    Json(api_success(template))
}

pub async fn update_voucher_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = default_tenant_id();
    let name = body.get("name").and_then(|v| v.as_str());
    let voucher_type = body.get("voucher_type").and_then(|v| v.as_str());
    let is_default = body.get("is_default").and_then(|v| v.as_bool());

    let row = match sqlx::query(
        r#"UPDATE core_finance_voucher_templates
           SET name = COALESCE($1, name),
               voucher_type = COALESCE($2, voucher_type),
               is_default = COALESCE($3, is_default),
               updated_at = NOW()
           WHERE tenant_id = $4 AND id = $5
           RETURNING id, name, voucher_type, status, is_default, created_at"#,
    )
    .bind(name)
    .bind(voucher_type)
    .bind(is_default)
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新凭证模板失败: {}", e);
            return Json(api_error(500, "更新凭证模板失败"));
        }
    };

    let template = match row {
        Some(row) => serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "name": row.get::<String, _>("name"),
            "voucher_type": row.get::<String, _>("voucher_type"),
            "status": row.get::<String, _>("status"),
            "is_default": row.get::<bool, _>("is_default"),
            "created_at": row.get::<DateTime<Utc>, _>("created_at"),
        }),
        None => return Json(api_error(404, "凭证模板不存在")),
    };

    Json(api_success(template))
}

pub async fn delete_voucher_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result =
        sqlx::query("DELETE FROM core_finance_voucher_templates WHERE tenant_id = $1 AND id = $2")
            .bind(tenant_id)
            .bind(id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "凭证模板不存在")),
        Err(e) => {
            tracing::error!("删除凭证模板失败: {}", e);
            Json(api_error(500, "删除凭证模板失败"))
        }
    }
}

pub async fn copy_voucher_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = default_tenant_id();
    let new_name = body
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("复制模板");

    let row = match sqlx::query(
        r#"INSERT INTO core_finance_voucher_templates
           (tenant_id, name, voucher_type, applicable_module, status, is_default, template_data)
           SELECT $1, $2, voucher_type, applicable_module, status, false, template_data
           FROM core_finance_voucher_templates WHERE tenant_id = $3 AND id = $4
           RETURNING id, name, voucher_type, status, is_default, created_at"#,
    )
    .bind(tenant_id)
    .bind(new_name)
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("复制凭证模板失败: {}", e);
            return Json(api_error(500, "复制凭证模板失败"));
        }
    };

    let template = match row {
        Some(row) => serde_json::json!({
            "id": row.get::<Uuid, _>("id"),
            "name": row.get::<String, _>("name"),
            "voucher_type": row.get::<String, _>("voucher_type"),
            "status": row.get::<String, _>("status"),
            "is_default": row.get::<bool, _>("is_default"),
            "created_at": row.get::<DateTime<Utc>, _>("created_at"),
        }),
        None => return Json(api_error(404, "凭证模板不存在")),
    };

    Json(api_success(template))
}

pub async fn set_default_voucher_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let _ = sqlx::query(
        r#"UPDATE core_finance_voucher_templates SET is_default = false WHERE tenant_id = $1"#,
    )
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    let result = sqlx::query(
        r#"UPDATE core_finance_voucher_templates SET is_default = true WHERE tenant_id = $1 AND id = $2"#,
    )
    .bind(tenant_id)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "凭证模板不存在")),
        Err(e) => {
            tracing::error!("设置默认凭证模板失败: {}", e);
            Json(api_error(500, "设置默认凭证模板失败"))
        }
    }
}

pub async fn get_current_period(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = chrono::Local::now();
    let period = format!("{}{:02}", now.year(), now.month());

    Json(api_success(serde_json::json!({
        "period": period,
        "year": now.year(),
        "month": now.month()
    })))
}

pub async fn list_periods(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let tenant_id = default_tenant_id();

    let rows = match sqlx::query(
        r#"SELECT period, year, month, start_date, end_date, status
           FROM core_finance_periods WHERE tenant_id = $1 ORDER BY period DESC"#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询期间失败: {}", e);
            return Json(api_error(500, "查询期间失败"));
        }
    };

    let periods: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|row| {
            serde_json::json!({
                "period": row.get::<String, _>("period"),
                "year": row.get::<i32, _>("year"),
                "month": row.get::<i32, _>("month"),
                "start_date": row.get::<NaiveDate, _>("start_date"),
                "end_date": row.get::<NaiveDate, _>("end_date"),
                "status": row.get::<String, _>("status"),
            })
        })
        .collect();

    Json(api_success(periods))
}

pub async fn open_period(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();
    let period = body.get("period").and_then(|v| v.as_str()).unwrap_or("");

    if period.is_empty() {
        return Json(api_error(400, "期间不能为空"));
    }

    let result = sqlx::query(
        r#"UPDATE core_finance_periods SET status = 'open', updated_at = NOW()
           WHERE tenant_id = $1 AND period = $2"#,
    )
    .bind(tenant_id)
    .bind(period)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "期间不存在")),
        Err(e) => {
            tracing::error!("打开期间失败: {}", e);
            Json(api_error(500, "打开期间失败"))
        }
    }
}

pub async fn close_period(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();
    let period = body.get("period").and_then(|v| v.as_str()).unwrap_or("");

    if period.is_empty() {
        return Json(api_error(400, "期间不能为空"));
    }

    let result = sqlx::query(
        r#"UPDATE core_finance_periods SET status = 'closed', updated_at = NOW()
           WHERE tenant_id = $1 AND period = $2"#,
    )
    .bind(tenant_id)
    .bind(period)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "期间不存在")),
        Err(e) => {
            tracing::error!("关闭期间失败: {}", e);
            Json(api_error(500, "关闭期间失败"))
        }
    }
}

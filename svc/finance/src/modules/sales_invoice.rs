//! 销售发票 / 回款 / 应收报表模块（known_gap B 组补全，2026-09-09）
//!
//! 归属决策：发票/回款/应收域归 finance（财务域）。前端 apps/web/src/api/crmFinance
//! 17 个方法改指 apiClient.finance，路径与本节路由一一对应。
//!
//! 端点：
//! - GET    /sales-invoices                  — 销售发票分页列表（customer/status/date 过滤）
//! - GET    /sales-invoices/{id}             — 发票详情
//! - POST   /sales-invoices                  — 新建（draft）
//! - PUT    /sales-invoices/{id}             — 更新（仅 draft）
//! - DELETE /sales-invoices/{id}             — 删除（仅 draft）
//! - POST   /sales-invoices/{id}/issue       — 开具（draft→issued）
//! - POST   /sales-invoices/{id}/cancel      — 取消（→cancelled，记录原因）
//! - POST   /sales-invoices/{id}/red-flush   — 红冲（生成负数发票并取消原票）
//! - GET    /sales-invoices/export           — 导出
//! - GET    /sales-collections                     — 回款记录分页
//! - GET    /sales-collections/{id}                — 回款详情
//! - POST   /sales-collections                     — 登记回款
//! - POST   /sales-collections/{id}/confirm        — 确认回款
//! - POST   /sales-collections/batch-confirm       — 批量确认
//! - GET    /sales-collections/export              — 回款导出
//! - GET    /reports/receivable-aging        — 应收账龄
//! - GET    /reports/receivable-summary      — 应收汇总
//! - GET    /reports/overdue-receivables     — 逾期应收
//! - GET    /reports/receivable-aging/export — 账龄导出
//!
//! 数据口径：全部基于 finance.sales_invoices / finance.erp_collection_records 真实表；
//! paid_amount 由回款确认累计回写；报表由表内数据现算，不做估算。

use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::{get_tenant_id_from_claims, Claims};
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::shared::AppState;

// ========== 请求/响应类型（对齐前端 crmFinance 契约）==========

#[derive(Debug, Serialize)]
pub struct SalesInvoiceOut {
    pub id: Uuid,
    pub invoice_number: String,
    pub customer_id: Uuid,
    pub customer_name: String,
    pub invoice_date: String,
    pub due_date: Option<String>,
    pub amount: Decimal,
    pub tax_amount: Decimal,
    pub total_amount: Decimal,
    pub paid_amount: Decimal,
    pub status: String,
    pub invoice_type: String,
    pub cancel_reason: Option<String>,
    pub red_flush_of: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceCreatePayload {
    pub invoice_number: String,
    pub customer_id: Uuid,
    #[serde(default)]
    pub customer_name: String,
    #[serde(default)]
    pub invoice_date: Option<String>,
    #[serde(default)]
    pub due_date: Option<String>,
    #[serde(default)]
    pub amount: Decimal,
    #[serde(default)]
    pub tax_amount: Decimal,
    #[serde(default = "default_total_calc", rename = "totalAmount")]
    pub total_amount: Decimal,
    #[serde(default)]
    pub invoice_type: String,
}

fn default_total_calc() -> Decimal {
    Decimal::ZERO
}

#[derive(Debug, Deserialize)]
pub struct InvoiceUpdatePayload {
    #[serde(default)]
    pub customer_name: Option<String>,
    #[serde(default)]
    pub due_date: Option<String>,
    #[serde(default)]
    pub amount: Option<Decimal>,
    #[serde(default)]
    pub tax_amount: Option<Decimal>,
    #[serde(default)]
    pub invoice_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CancelPayload {
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct RedFlushPayload {
    #[serde(default)]
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceListQuery {
    pub customer_id: Option<Uuid>,
    pub invoice_type: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize)]
#[allow(non_snake_case)]
pub struct Paginated<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub pageSize: i64,
    pub total_pages: i64,
    pub totalPages: i64,
}

#[derive(Debug, Serialize)]
pub struct CollectionOut {
    pub id: Uuid,
    pub collection_number: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub invoice_id: Option<Uuid>,
    pub collection_date: Option<String>,
    pub amount: Decimal,
    pub payment_method: Option<String>,
    pub bank_account: Option<String>,
    pub remark: Option<String>,
    pub status: Option<String>,
    pub confirmed_by: Option<String>,
    pub confirmed_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CollectionCreatePayload {
    #[serde(default)]
    pub collection_number: String,
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub customer_name: Option<String>,
    #[serde(default)]
    pub invoice_id: Option<Uuid>,
    #[serde(default)]
    pub collection_date: Option<String>,
    #[serde(default)]
    pub amount: Decimal,
    #[serde(default)]
    pub payment_method: Option<String>,
    #[serde(default)]
    pub bank_account: Option<String>,
    #[serde(default)]
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchConfirmPayload {
    pub record_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CollectionListQuery {
    pub customer_id: Option<Uuid>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub payment_method: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct AgingBucket {
    pub bucket: String,
    pub total_amount: f64,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct ReceivableSummary {
    pub total_receivable: f64,
    pub total_paid: f64,
    pub outstanding: f64,
    pub invoice_count: i64,
    pub overdue_amount: f64,
}

#[derive(Debug, Serialize)]
pub struct OverdueItem {
    pub id: Uuid,
    pub invoice_number: String,
    pub customer_name: String,
    pub due_date: Option<String>,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub outstanding: f64,
    pub overdue_days: i64,
}

// ========== 工具 ==========

fn today() -> chrono::NaiveDate {
    chrono::Utc::now().date_naive()
}

fn days_overdue(due: Option<chrono::NaiveDate>, now: chrono::NaiveDate) -> i64 {
    match due {
        Some(d) => (now - d).num_days().max(0),
        None => 0,
    }
}

// ========== 发票 ==========

async fn fetch_invoice(
    pool: &sqlx::PgPool,
    tenant_id: Option<Uuid>,
    id: Uuid,
) -> Result<Option<SalesInvoiceOut>, sqlx::Error> {
    let row = sqlx::query(
        "SELECT id, invoice_number, customer_id, customer_name,
                to_char(invoice_date, 'YYYY-MM-DD') AS invoice_date,
                CASE WHEN due_date IS NULL THEN NULL ELSE to_char(due_date, 'YYYY-MM-DD') END AS due_date,
                amount, tax_amount, total_amount, paid_amount,
                status, invoice_type, cancel_reason, red_flush_of
         FROM finance.sales_invoices WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| SalesInvoiceOut {
        id: r.get("id"),
        invoice_number: r.get("invoice_number"),
        customer_id: r.get("customer_id"),
        customer_name: r.get("customer_name"),
        invoice_date: r.get("invoice_date"),
        due_date: r.get("due_date"),
        amount: r.get("amount"),
        tax_amount: r.get("tax_amount"),
        total_amount: r.get("total_amount"),
        paid_amount: r.get("paid_amount"),
        status: r.get("status"),
        invoice_type: r.get("invoice_type"),
        cancel_reason: r.get("cancel_reason"),
        red_flush_of: r.get("red_flush_of"),
    }))
}

/// GET /sales-invoices
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:sales_invoice:read"])),
    path = "/api/finance/sales-invoices",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn list_sales_invoices(
    State(state): State<AppState>,
    Query(params): Query<InvoiceListQuery>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Paginated<SalesInvoiceOut>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let where_sql = "($1::uuid IS NULL OR tenant_id = $1)
        AND ($2::uuid IS NULL OR customer_id = $2)
        AND ($3::text IS NULL OR status = $3)
        AND ($4::text IS NULL OR invoice_type = $4)
        AND ($5::date IS NULL OR invoice_date >= $5::date)
        AND ($6::date IS NULL OR invoice_date <= $6::date)";

    let total: i64 = match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM finance.sales_invoices WHERE {where_sql}"
    )))
    .bind(tenant_id)
    .bind(params.customer_id)
    .bind(&params.status)
    .bind(&params.invoice_type)
    .bind(&params.start_date)
    .bind(&params.end_date)
    .fetch_one(&state.pool)
    .await
    {
        Ok(r) => r.get(0),
        Err(e) => {
            return ApiResponse::<Paginated<SalesInvoiceOut>>::from(TopemsError::internal(
                "获取销售发票列表失败",
                e,
            ))
        }
    };

    let items = match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT id, invoice_number, customer_id, customer_name,
                to_char(invoice_date, 'YYYY-MM-DD') AS invoice_date,
                CASE WHEN due_date IS NULL THEN NULL ELSE to_char(due_date, 'YYYY-MM-DD') END AS due_date,
                amount, tax_amount, total_amount, paid_amount,
                status, invoice_type, cancel_reason, red_flush_of
         FROM finance.sales_invoices WHERE {where_sql}
         ORDER BY created_at DESC LIMIT $7 OFFSET $8"
    )))
    .bind(tenant_id)
    .bind(params.customer_id)
    .bind(&params.status)
    .bind(&params.invoice_type)
    .bind(&params.start_date)
    .bind(&params.end_date)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows
            .iter()
            .map(|r| SalesInvoiceOut {
                id: r.get("id"),
                invoice_number: r.get("invoice_number"),
                customer_id: r.get("customer_id"),
                customer_name: r.get("customer_name"),
                invoice_date: r.get("invoice_date"),
                due_date: r.get("due_date"),
                amount: r.get("amount"),
                tax_amount: r.get("tax_amount"),
                total_amount: r.get("total_amount"),
                paid_amount: r.get("paid_amount"),
                status: r.get("status"),
                invoice_type: r.get("invoice_type"),
                cancel_reason: r.get("cancel_reason"),
                red_flush_of: r.get("red_flush_of"),
            })
            .collect(),
        Err(e) => return crate::shared::err_resp(e),
    };

    ApiResponse::success(
        Paginated {
            total_pages: if page_size > 0 {
                (total + page_size - 1) / page_size
            } else {
                0
            },
            page_size,
            pageSize: page_size,
            totalPages: if page_size > 0 {
                (total + page_size - 1) / page_size
            } else {
                0
            },
            items,
            total,
            page,
        },
        "Success",
    )
}

/// GET /sales-invoices/{id}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:sales_invoice:read"])),
    path = "/api/finance/sales-invoices/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn get_sales_invoice(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<SalesInvoiceOut> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match fetch_invoice(&state.pool, tenant_id, id).await {
        Ok(Some(inv)) => ApiResponse::success(inv, "Success"),
        Ok(None) => ApiResponse::<SalesInvoiceOut>::not_found("发票不存在"),
        Err(e) => crate::shared::err_resp(e),
    }
}

/// 发票类型合法值（与 DB CHECK 约束一致）：tax / 普通发票 / 专用发票
fn validate_invoice_type(v: &str) -> bool {
    matches!(v, "tax" | "普通发票" | "专用发票")
}

/// POST /sales-invoices
pub async fn create_sales_invoice(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<InvoiceCreatePayload>,
) -> ApiResponse<SalesInvoiceOut> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let inv_type = if payload.invoice_type.is_empty() {
        "tax".to_string()
    } else {
        if !validate_invoice_type(&payload.invoice_type) {
            return ApiResponse::<SalesInvoiceOut>::unprocessable(
                "invoice_type 仅支持 tax/普通发票/专用发票",
            );
        }
        payload.invoice_type.clone()
    };
    let total = if payload.total_amount > Decimal::ZERO {
        payload.total_amount
    } else {
        payload.amount + payload.tax_amount
    };
    let inv_date = payload.invoice_date.unwrap_or_else(|| today().to_string());
    let due = payload.due_date.clone();

    match sqlx::query(
        "INSERT INTO finance.sales_invoices
            (tenant_id, invoice_number, customer_id, customer_name, invoice_date, due_date,
             amount, tax_amount, total_amount, invoice_type)
         VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10)
         RETURNING id",
    )
    .bind(tenant_id)
    .bind(&payload.invoice_number)
    .bind(payload.customer_id)
    .bind(&payload.customer_name)
    .bind(&inv_date)
    .bind(&due)
    .bind(payload.amount)
    .bind(payload.tax_amount)
    .bind(total)
    .bind(&inv_type)
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => {
            let id: Uuid = row.get("id");
            match fetch_invoice(&state.pool, Some(tenant_id), id).await {
                Ok(Some(inv)) => ApiResponse::success(inv, "Created"),
                _ => ApiResponse::<SalesInvoiceOut>::server_error("创建后读取失败"),
            }
        }
        Err(e) => {
            if e.as_database_error().and_then(|db| db.code()).as_deref() == Some("23505") {
                return ApiResponse::<SalesInvoiceOut>::conflict("发票编号已存在，请勿重复创建");
            }
            crate::shared::err_resp(e)
        }
    }
}

/// PUT /sales-invoices/{id}（仅 draft 可编辑）
pub async fn update_sales_invoice(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<InvoiceUpdatePayload>,
) -> ApiResponse<SalesInvoiceOut> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    if let Some(t) = &payload.invoice_type {
        if !validate_invoice_type(t) {
            return ApiResponse::<SalesInvoiceOut>::unprocessable(
                "invoice_type 仅支持 tax/普通发票/专用发票",
            );
        }
    }
    match sqlx::query(
        "UPDATE finance.sales_invoices SET
            customer_name = COALESCE($3, customer_name),
            due_date = COALESCE($4::date, due_date),
            amount = COALESCE($5, amount),
            tax_amount = COALESCE($6, tax_amount),
            invoice_type = COALESCE($7, invoice_type),
            total_amount = COALESCE($5, amount) + COALESCE($6, tax_amount),
            updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
         RETURNING id",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&payload.customer_name)
    .bind(&payload.due_date)
    .bind(payload.amount)
    .bind(payload.tax_amount)
    .bind(&payload.invoice_type)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => {
            let id: Uuid = row.get("id");
            match fetch_invoice(&state.pool, Some(tenant_id), id).await {
                Ok(Some(inv)) => ApiResponse::success(inv, "Success"),
                _ => ApiResponse::<SalesInvoiceOut>::server_error("更新后读取失败"),
            }
        }
        Ok(None) => ApiResponse::<SalesInvoiceOut>::conflict("仅草稿可编辑或发票不存在"),
        Err(e) => crate::shared::err_resp(e),
    }
}

/// DELETE /sales-invoices/{id}（仅 draft）
pub async fn delete_sales_invoice(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<String> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match sqlx::query(
        "DELETE FROM finance.sales_invoices WHERE id = $1 AND tenant_id = $2 AND status = 'draft'",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success(id.to_string(), "Success"),
        Ok(_) => ApiResponse::<String>::conflict("仅草稿可删除或发票不存在"),
        Err(e) => crate::shared::err_resp(e),
    }
}

/// POST /sales-invoices/{id}/issue（draft→issued）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:sales_invoice:write"])),
    path = "/api/finance/sales-invoices/{id}/issue",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn issue_sales_invoice(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<SalesInvoiceOut> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match sqlx::query(
        "UPDATE finance.sales_invoices SET status = 'issued', issued_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
         RETURNING id",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => {
            let id: Uuid = row.get("id");
            match fetch_invoice(&state.pool, Some(tenant_id), id).await {
                Ok(Some(inv)) => ApiResponse::success(inv, "Success"),
                _ => ApiResponse::<SalesInvoiceOut>::server_error("开具后读取失败"),
            }
        }
        Ok(None) => ApiResponse::<SalesInvoiceOut>::conflict("仅草稿可开具"),
        Err(e) => crate::shared::err_resp(e),
    }
}

/// POST /sales-invoices/{id}/cancel
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:sales_invoice:write"])),
    path = "/api/finance/sales-invoices/{id}/cancel",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn cancel_sales_invoice(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CancelPayload>,
) -> ApiResponse<SalesInvoiceOut> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match sqlx::query(
        "UPDATE finance.sales_invoices SET status = 'cancelled', cancel_reason = $3,
                cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND status IN ('draft', 'issued')
         RETURNING id",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&payload.reason)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => {
            let id: Uuid = row.get("id");
            match fetch_invoice(&state.pool, Some(tenant_id), id).await {
                Ok(Some(inv)) => ApiResponse::success(inv, "Success"),
                _ => ApiResponse::<SalesInvoiceOut>::server_error("取消后读取失败"),
            }
        }
        Ok(None) => ApiResponse::<SalesInvoiceOut>::conflict("该状态不可取消"),
        Err(e) => crate::shared::err_resp(e),
    }
}

/// POST /sales-invoices/{id}/red-flush（红冲：取消原票 + 生成负数发票）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:sales_invoice:write"])),
    path = "/api/finance/sales-invoices/{id}/red-flush",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn red_flush_sales_invoice(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<RedFlushPayload>,
) -> ApiResponse<SalesInvoiceOut> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let now = today();

    let original = match fetch_invoice(&state.pool, Some(tenant_id), id).await {
        Ok(Some(inv)) => inv,
        _ => return ApiResponse::<SalesInvoiceOut>::not_found("发票不存在"),
    };
    if original.status != "issued" {
        return ApiResponse::<SalesInvoiceOut>::conflict("仅已开具发票可红冲");
    }

    // 取消原票
    if let Err(e) = sqlx::query(
        "UPDATE finance.sales_invoices SET status = 'cancelled', cancel_reason = $3,
                cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(payload.reason.clone().unwrap_or_else(|| "红冲".to_string()))
    .execute(&state.pool)
    .await
    {
        return crate::shared::err_resp(e);
    }

    // 生成负数发票（金额取负）
    let red_number = format!("RF-{}-{}", original.invoice_number, now.format("%Y%m%d"));
    match sqlx::query(
        "INSERT INTO finance.sales_invoices
            (tenant_id, invoice_number, customer_id, customer_name, invoice_date, due_date,
             amount, tax_amount, total_amount, status, invoice_type, cancel_reason, red_flush_of)
         VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, 'cancelled', $10, $11, $12)
         RETURNING id",
    )
    .bind(tenant_id)
    .bind(&red_number)
    .bind(original.customer_id)
    .bind(&original.customer_name)
    .bind(now.to_string())
    .bind(&original.due_date)
    .bind(-original.amount)
    .bind(-original.tax_amount)
    .bind(-original.total_amount)
    .bind(&original.invoice_type)
    .bind(payload.reason.clone().unwrap_or_else(|| "红冲".to_string()))
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => {
            let red_id: Uuid = row.get("id");
            match fetch_invoice(&state.pool, Some(tenant_id), red_id).await {
                Ok(Some(inv)) => ApiResponse::success(inv, "Success"),
                _ => ApiResponse::<SalesInvoiceOut>::server_error("红冲后读取失败"),
            }
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

// ========== 回款 ==========

async fn fetch_collection<'e, E>(
    executor: E,
    tenant_id: Option<Uuid>,
    id: Uuid,
) -> Result<Option<CollectionOut>, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Postgres>,
{
    let row = sqlx::query(
        "SELECT id,
                COALESCE(collection_no, '') AS collection_number,
                (SELECT si.id FROM finance.sales_invoices si
                 WHERE si.invoice_number = erc.invoice_no AND si.tenant_id = erc.tenant_id) AS invoice_id,
                customer_id, customer_name,
                CASE WHEN collection_date IS NULL THEN NULL ELSE to_char(collection_date, 'YYYY-MM-DD') END AS collection_date,
                amount, payment_method, NULL AS bank_account, remark, status, confirmed_by,
                confirmed_at
         FROM finance.erp_collection_records erc
         WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(executor)
    .await?;
    Ok(row.map(|r| CollectionOut {
        id: r.get("id"),
        collection_number: r.get("collection_number"),
        customer_id: r.get("customer_id"),
        customer_name: r.get("customer_name"),
        invoice_id: r.get("invoice_id"),
        collection_date: r.get("collection_date"),
        amount: r.get("amount"),
        payment_method: r.get("payment_method"),
        bank_account: r.get("bank_account"),
        remark: r.get("remark"),
        status: r.get("status"),
        confirmed_by: r.get("confirmed_by"),
        confirmed_at: r.get("confirmed_at"),
    }))
}

/// GET /sales-collections
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:sales_invoice:read"])),
    path = "/api/finance/sales-collections",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn list_collections(
    State(state): State<AppState>,
    Query(params): Query<CollectionListQuery>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Paginated<CollectionOut>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let where_sql = "($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL
        AND ($2::uuid IS NULL OR customer_id = $2)
        AND ($3::date IS NULL OR collection_date >= $3::date)
        AND ($4::date IS NULL OR collection_date <= $4::date)
        AND ($5::text IS NULL OR payment_method = $5)";

    let total: i64 = match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM finance.erp_collection_records WHERE {where_sql}"
    )))
    .bind(tenant_id)
    .bind(params.customer_id)
    .bind(&params.start_date)
    .bind(&params.end_date)
    .bind(&params.payment_method)
    .fetch_one(&state.pool)
    .await
    {
        Ok(r) => r.get(0),
        Err(e) => {
            return ApiResponse::<Paginated<CollectionOut>>::from(TopemsError::internal(
                "获取回款列表失败",
                e,
            ))
        }
    };

    let items = match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT id,
                COALESCE(collection_no, '') AS collection_number,
                (SELECT si.id FROM finance.sales_invoices si
                 WHERE si.invoice_number = erc.invoice_no AND si.tenant_id = erc.tenant_id) AS invoice_id,
                customer_id, customer_name,
                CASE WHEN collection_date IS NULL THEN NULL ELSE to_char(collection_date, 'YYYY-MM-DD') END AS collection_date,
                amount, payment_method, NULL AS bank_account, remark, status, confirmed_by,
                confirmed_at
         FROM finance.erp_collection_records erc WHERE {where_sql}
         ORDER BY created_at DESC LIMIT $6 OFFSET $7"
    )))
    .bind(tenant_id)
    .bind(params.customer_id)
    .bind(&params.start_date)
    .bind(&params.end_date)
    .bind(&params.payment_method)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows
            .iter()
            .map(|r| CollectionOut {
                id: r.get("id"),
                collection_number: r.get("collection_number"),
                customer_id: r.get("customer_id"),
                customer_name: r.get("customer_name"),
                invoice_id: r.get("invoice_id"),
                collection_date: r.get("collection_date"),
                amount: r.get("amount"),
                payment_method: r.get("payment_method"),
                bank_account: r.get("bank_account"),
                remark: r.get("remark"),
                status: r.get("status"),
                confirmed_by: r.get("confirmed_by"),
                confirmed_at: r.get("confirmed_at"),
            })
            .collect(),
        Err(e) => return crate::shared::err_resp(e),
    };

    ApiResponse::success(
        Paginated {
            total_pages: if page_size > 0 {
                (total + page_size - 1) / page_size
            } else {
                0
            },
            page_size,
            pageSize: page_size,
            totalPages: if page_size > 0 {
                (total + page_size - 1) / page_size
            } else {
                0
            },
            items,
            total,
            page,
        },
        "Success",
    )
}

/// GET /sales-collections/{id}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:sales_invoice:read"])),
    path = "/api/finance/sales-collections/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn get_collection(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<CollectionOut> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    match fetch_collection(&state.pool, tenant_id, id).await {
        Ok(Some(c)) => ApiResponse::success(c, "Success"),
        Ok(None) => ApiResponse::<CollectionOut>::not_found("回款记录不存在"),
        Err(e) => crate::shared::err_resp(e),
    }
}

/// POST /sales-collections
pub async fn create_collection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(payload): Json<CollectionCreatePayload>,
) -> ApiResponse<CollectionOut> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    // 连接级租户上下文：复用请求级 RLS 事务，裸池写入在严格 RLS 策略下会被拒绝。
    // 写入后必须在本事务内读回，否则中间件提交前用池读不到新行。
    let db = topems_shared_db::scope::Db::new(state.pool.clone(), "finance, public, shared");
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let number = if payload.collection_number.is_empty() {
        format!(
            "CL-{}-{}",
            chrono::Utc::now().format("%Y%m%d%H%M%S"),
            &Uuid::new_v4().simple().to_string()[..8]
        )
    } else {
        payload.collection_number.clone()
    };
    let col_date = payload
        .collection_date
        .clone()
        .unwrap_or_else(|| today().to_string());

    // 前端传销售发票 uuid → 落库存发票号文本（erp_collection_records.invoice_no）
    let invoice_number: Option<String> = match payload.invoice_id {
        Some(inv_id) => sqlx::query_scalar(
            "SELECT invoice_number FROM finance.sales_invoices WHERE id = $1 AND tenant_id = $2",
        )
        .bind(inv_id)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await
        .unwrap_or(None),
        None => None,
    };

    match sqlx::query(
        "INSERT INTO finance.erp_collection_records
            (tenant_id, collection_no, customer_id, customer_name, invoice_no, collection_date,
             amount, payment_method, remark, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, 'pending', NULL)
         RETURNING id",
    )
    .bind(tenant_id)
    .bind(&number)
    .bind(payload.customer_id)
    .bind(&payload.customer_name)
    .bind(&invoice_number)
    .bind(&col_date)
    .bind(payload.amount)
    .bind(&payload.payment_method)
    .bind(&payload.remark)
    .fetch_one(&mut scope)
    .await
    {
        Ok(row) => {
            let id: Uuid = row.get("id");
            match fetch_collection(&mut scope, Some(tenant_id), id).await {
                Ok(Some(c)) => ApiResponse::success(c, "Created"),
                _ => ApiResponse::<CollectionOut>::server_error("创建后读取失败"),
            }
        }
        Err(e) => crate::shared::err_resp(e),
    }
}

/// POST /sales-collections/{id}/confirm（回款确认：回写发票 paid_amount）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:sales_invoice:write"])),
    path = "/api/finance/sales-collections/{id}/confirm",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn confirm_collection(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<CollectionOut> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let pool = &state.pool;

    // 整段在单事务内完成：FOR UPDATE 锁定回款记录 + 关联发票余额，
    // 消除先读后写的 TOCTOU 窗口；并在 UPDATE 上叠加原子谓词防并发重复确认，
    // 回写发票前校验确认额不得超过应收余额（超收封顶）。
    let mut tx = match pool.begin().await {
        Ok(t) => t,
        Err(e) => return crate::shared::err_resp(e),
    };

    let rec = match sqlx::query(
        "SELECT erc.amount, COALESCE(erc.status, 'pending') AS status,
                (SELECT si.id FROM finance.sales_invoices si WHERE si.invoice_number = erc.invoice_no AND si.tenant_id = erc.tenant_id) AS invoice_id
         FROM finance.erp_collection_records erc
         WHERE erc.id = $1 AND erc.tenant_id = $2 AND erc.deleted_at IS NULL
         FOR UPDATE",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::<CollectionOut>::not_found("回款记录不存在"),
        Err(e) => return crate::shared::err_resp(e),
    };
    let amount: Decimal = rec.get("amount");
    let status: String = rec.get("status");
    let invoice_id: Option<Uuid> = rec.get("invoice_id");
    if status == "confirmed" {
        return ApiResponse::<CollectionOut>::conflict("回款记录已确认，请勿重复确认");
    }

    // 原子谓词：AND status != 'confirmed' AND deleted_at IS NULL。
    // 并发下另一事务已确认时 rows_affected=0，显式拒绝（409），不再静默成功。
    let affected = match sqlx::query(
        "UPDATE finance.erp_collection_records
         SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND status != 'confirmed' AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&mut *tx)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => return crate::shared::err_resp(e),
    };
    if affected == 0 {
        return ApiResponse::<CollectionOut>::conflict("回款记录已被其他请求确认，请勿重复确认");
    }

    // 回写发票：FOR UPDATE 锁定发票，超收封顶——确认额不得超过应收余额（total - paid）。
    if let Some(inv_id) = invoice_id {
        let inv = match sqlx::query(
            "SELECT total_amount, paid_amount FROM finance.sales_invoices
             WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
        )
        .bind(inv_id)
        .bind(tenant_id)
        .fetch_optional(&mut *tx)
        .await
        {
            Ok(Some(r)) => r,
            Ok(None) => return ApiResponse::<CollectionOut>::not_found("关联发票不存在"),
            Err(e) => return crate::shared::err_resp(e),
        };
        let total: Decimal = inv.get("total_amount");
        let paid: Decimal = inv.get("paid_amount");
        let balance = total - paid;
        if amount > balance {
            return ApiResponse::<CollectionOut>::bad_request(&format!(
                "确认金额 {} 超过应收余额 {}，拒绝超收",
                amount, balance
            ));
        }
        if let Err(e) = sqlx::query(
            "UPDATE finance.sales_invoices
             SET paid_amount = paid_amount + $3,
                 status = CASE WHEN paid_amount + $3 >= total_amount THEN 'paid' ELSE status END,
                 updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2",
        )
        .bind(inv_id)
        .bind(tenant_id)
        .bind(amount)
        .execute(&mut *tx)
        .await
        {
            return crate::shared::err_resp(e);
        }
    }

    if let Err(e) = tx.commit().await {
        return crate::shared::err_resp(e);
    }

    match fetch_collection(pool, Some(tenant_id), id).await {
        Ok(Some(c)) => ApiResponse::success(c, "Success"),
        _ => ApiResponse::<CollectionOut>::server_error("确认后读取失败"),
    }
}

/// POST /sales-collections/batch-confirm
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:sales_invoice:write"])),
    path = "/api/finance/sales-collections/batch-confirm",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn batch_confirm_collections(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<BatchConfirmPayload>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut success = 0i64;
    let mut failed = 0i64;

    // 整批单事务：与单条 confirm_collection 同一口径——确认回款 + 回写发票
    // paid_amount/状态（原子增量 paid_amount = paid_amount + $amount，按余额翻 'paid'）。
    // 同一张发票多笔回款在同一事务内逐笔累加，自身写入对自身可见；任一笔 DB 错误整体回滚。
    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => return crate::shared::err_resp(e),
    };

    for rid in payload.record_ids {
        // 与单条 confirm_collection 1011-1027 相同的读取口径：金额 + 匹配发票 + 状态
        let rec = match sqlx::query(
            "SELECT amount, (SELECT si.id FROM finance.sales_invoices si WHERE si.invoice_number = erc.invoice_no AND si.tenant_id = erc.tenant_id) AS invoice_id, COALESCE(status, 'pending') AS status FROM finance.erp_collection_records erc
             WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
        )
        .bind(rid)
        .bind(tenant_id)
        .fetch_optional(&mut *tx)
        .await
        {
            Ok(r) => r,
            Err(e) => return crate::shared::err_resp(e),
        };

        let row = match rec {
            Some(r) => r,
            None => {
                failed += 1;
                continue;
            }
        };
        let status: String = row.get("status");
        if status == "confirmed" {
            failed += 1;
            continue;
        }
        let invoice_id: Option<Uuid> = row.get("invoice_id");
        let amount: Decimal = row.get("amount");

        // 超收封顶（与单条 confirm_collection 同口径）：确认额不得超过应收余额。
        // 超限则该笔计失败，不写 erc 也不回写发票，避免半写。
        if let Some(inv_id) = invoice_id {
            let inv = match sqlx::query(
                "SELECT total_amount, paid_amount FROM finance.sales_invoices
                 WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
            )
            .bind(inv_id)
            .bind(tenant_id)
            .fetch_optional(&mut *tx)
            .await
            {
                Ok(Some(r)) => r,
                Ok(None) => {
                    failed += 1;
                    continue;
                }
                Err(e) => return crate::shared::err_resp(e),
            };
            let total: Decimal = inv.get("total_amount");
            let paid: Decimal = inv.get("paid_amount");
            if amount > total - paid {
                failed += 1;
                continue;
            }
        }

        let affected = match sqlx::query(
            "UPDATE finance.erp_collection_records
             SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2 AND status != 'confirmed' AND deleted_at IS NULL",
        )
        .bind(rid)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await
        {
            Ok(r) => r.rows_affected(),
            Err(e) => return crate::shared::err_resp(e),
        };
        if affected == 0 {
            // 并发下已被其他事务确认
            failed += 1;
            continue;
        }

        // 回写发票：与单条 confirm_collection 相同语句
        if let Some(inv_id) = invoice_id {
            if let Err(e) = sqlx::query(
                "UPDATE finance.sales_invoices
                 SET paid_amount = paid_amount + $3,
                     status = CASE WHEN paid_amount + $3 >= total_amount THEN 'paid' ELSE status END,
                     updated_at = NOW()
                 WHERE id = $1 AND tenant_id = $2",
            )
            .bind(inv_id)
            .bind(tenant_id)
            .bind(amount)
            .execute(&mut *tx)
            .await
            {
                return crate::shared::err_resp(e);
            }
        }
        success += 1;
    }

    if let Err(e) = tx.commit().await {
        return crate::shared::err_resp(e);
    }

    ApiResponse::success(
        serde_json::json!({ "success": success, "failed": failed }),
        "Success",
    )
}

// ========== 应收报表 ==========

fn aging_bucket(days: i64) -> &'static str {
    match days {
        0..=30 => "0-30天",
        31..=60 => "31-60天",
        61..=90 => "61-90天",
        _ => "90天以上",
    }
}

/// GET /reports/receivable-aging
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:sales_invoice:read"])),
    path = "/api/finance/reports/receivable-aging",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn get_receivable_aging(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<AgingBucket>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let now = today();
    let rows = match sqlx::query(
        "SELECT id, due_date, total_amount::float8, paid_amount::float8, status
         FROM finance.sales_invoices
         WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status IN ('issued', 'overdue')",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => return crate::shared::err_resp(e),
    };

    use std::collections::HashMap;
    let mut buckets: HashMap<&'static str, (f64, i64)> = HashMap::new();
    for r in rows {
        let due: Option<chrono::NaiveDate> = r.get("due_date");
        let outstanding: f64 = r.get::<f64, _>("total_amount") - r.get::<f64, _>("paid_amount");
        let b = aging_bucket(days_overdue(due, now));
        let entry = buckets.entry(b).or_insert((0.0, 0));
        entry.0 += outstanding.max(0.0);
        entry.1 += 1;
    }

    let order = ["0-30天", "31-60天", "61-90天", "90天以上"];
    let items = order
        .iter()
        .map(|name| {
            let (amount, count) = buckets.get(name).copied().unwrap_or((0.0, 0));
            AgingBucket {
                bucket: name.to_string(),
                total_amount: (amount * 100.0).round() / 100.0,
                count,
            }
        })
        .collect();

    ApiResponse::success(items, "Success")
}

/// GET /reports/receivable-summary
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:sales_invoice:read"])),
    path = "/api/finance/reports/receivable-summary",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn get_receivable_summary(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<ReceivableSummary> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let now = today();
    // 口径：draft 未开票计入应收总额（前端应收概览口径），cancelled 红冲/取消票剔除；
    // 账龄/逾期报表只统计 issued/overdue 生效应收（见 get_receivable_aging / get_overdue_receivables）
    let rows = match sqlx::query(
        "SELECT total_amount::float8, paid_amount::float8, due_date, status
         FROM finance.sales_invoices WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status <> 'cancelled'",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => return crate::shared::err_resp(e),
    };

    let mut total_receivable = 0.0;
    let mut total_paid = 0.0;
    let mut overdue_amount = 0.0;
    let mut count = 0i64;
    for r in rows {
        let t: f64 = r.get("total_amount");
        let p: f64 = r.get("paid_amount");
        total_receivable += t;
        total_paid += p;
        count += 1;
        let due: Option<chrono::NaiveDate> = r.get("due_date");
        if days_overdue(due, now) > 0 && t - p > 0.0 {
            overdue_amount += t - p;
        }
    }

    ApiResponse::success(
        ReceivableSummary {
            total_receivable: (total_receivable * 100.0).round() / 100.0,
            total_paid: (total_paid * 100.0).round() / 100.0,
            outstanding: ((total_receivable - total_paid) * 100.0).round() / 100.0,
            invoice_count: count,
            overdue_amount: (overdue_amount * 100.0).round() / 100.0,
        },
        "Success",
    )
}

/// GET /reports/overdue-receivables
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:sales_invoice:read"])),
    path = "/api/finance/reports/overdue-receivables",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn get_overdue_receivables(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<OverdueItem>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let now = today();
    let rows = match sqlx::query(
        "SELECT id, invoice_number, customer_name,
                CASE WHEN due_date IS NULL THEN NULL ELSE to_char(due_date, 'YYYY-MM-DD') END AS due_date,
                total_amount::float8, paid_amount::float8, due_date AS d
         FROM finance.sales_invoices
         WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status IN ('issued', 'overdue')",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => return crate::shared::err_resp(e),
    };

    let mut items = Vec::new();
    for r in rows {
        let total: f64 = r.get("total_amount");
        let paid: f64 = r.get("paid_amount");
        let outstanding = total - paid;
        if outstanding <= 0.0 {
            continue;
        }
        let due: Option<chrono::NaiveDate> = r.get("d");
        let od = days_overdue(due, now);
        if od <= 0 {
            continue;
        }
        items.push(OverdueItem {
            id: r.get("id"),
            invoice_number: r.get("invoice_number"),
            customer_name: r.get("customer_name"),
            due_date: r.get("due_date"),
            total_amount: total,
            paid_amount: paid,
            outstanding: (outstanding * 100.0).round() / 100.0,
            overdue_days: od,
        });
    }
    items.sort_by(|a, b| b.overdue_days.cmp(&a.overdue_days));

    ApiResponse::success(items, "Success")
}

// ========== 导出（CSV 文本返回，供前端下载）==========

fn csv_escape(v: &str) -> String {
    if v.contains(',') || v.contains('"') || v.contains('\n') {
        format!("\"{}\"", v.replace('"', "\"\""))
    } else {
        v.to_string()
    }
}

/// GET /sales-invoices/export
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:sales_invoice:read"])),
    path = "/api/finance/sales-invoices/export",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn export_sales_invoices(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<String> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let rows = match sqlx::query(
        "SELECT invoice_number, customer_name,
                to_char(invoice_date, 'YYYY-MM-DD') AS invoice_date,
                total_amount::float8, paid_amount::float8, status
         FROM finance.sales_invoices WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(r) => r,
        Err(e) => return crate::shared::err_resp(e),
    };

    let mut csv = String::from("发票号,客户,开票日期,总额,已收,状态\n");
    for r in rows {
        csv.push_str(&format!(
            "{},{},{},{},{},{}\n",
            csv_escape(&r.get::<String, _>("invoice_number")),
            csv_escape(&r.get::<String, _>("customer_name")),
            r.get::<String, _>("invoice_date"),
            r.get::<f64, _>("total_amount"),
            r.get::<f64, _>("paid_amount"),
            r.get::<String, _>("status"),
        ));
    }
    ApiResponse::success(csv, "Success")
}

/// GET /sales-collections/export
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:sales_invoice:read"])),
    path = "/api/finance/sales-collections/export",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn export_collections(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<String> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let rows = match sqlx::query(
        "SELECT COALESCE(collection_no, '') AS no, COALESCE(customer_name, '') AS cname,
                CASE WHEN collection_date IS NULL THEN '' ELSE to_char(collection_date, 'YYYY-MM-DD') END AS d,
                amount::float8, COALESCE(payment_method, '') AS pm, COALESCE(status, '') AS st
         FROM finance.erp_collection_records
         WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL ORDER BY created_at",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(r) => r,
        Err(e) => return crate::shared::err_resp(e),
    };

    let mut csv = String::from("回款单号,客户,回款日期,金额,支付方式,状态\n");
    for r in rows {
        csv.push_str(&format!(
            "{},{},{},{},{},{}\n",
            csv_escape(&r.get::<String, _>("no")),
            csv_escape(&r.get::<String, _>("cname")),
            r.get::<String, _>("d"),
            r.get::<f64, _>("amount"),
            csv_escape(&r.get::<String, _>("pm")),
            csv_escape(&r.get::<String, _>("st")),
        ));
    }
    ApiResponse::success(csv, "Success")
}

/// GET /reports/receivable-aging/export
#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:sales_invoice:read"])),
    path = "/api/finance/reports/receivable-aging/export",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SalesInvoice"
)]
pub async fn export_receivable_aging(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<String> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let rows = match sqlx::query(
        "SELECT invoice_number, customer_name,
                CASE WHEN due_date IS NULL THEN NULL ELSE to_char(due_date, 'YYYY-MM-DD') END AS due_date,
                total_amount::float8, paid_amount::float8, due_date AS d
         FROM finance.sales_invoices
         WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status IN ('issued', 'overdue')",
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(r) => r,
        Err(e) => return crate::shared::err_resp(e),
    };

    let now = today();
    let mut csv = String::from("发票号,客户,到期日,总额,已收,未收,账龄\n");
    for r in rows {
        let total: f64 = r.get("total_amount");
        let paid: f64 = r.get("paid_amount");
        let due: Option<chrono::NaiveDate> = r.get("d");
        let outstanding = (total - paid).max(0.0);
        let bucket = aging_bucket(days_overdue(due, now));
        csv.push_str(&format!(
            "{},{},{},{},{},{},{}\n",
            csv_escape(&r.get::<String, _>("invoice_number")),
            csv_escape(&r.get::<String, _>("customer_name")),
            r.get::<Option<String>, _>("due_date").unwrap_or_default(),
            total,
            paid,
            (outstanding * 100.0).round() / 100.0,
            bucket,
        ));
    }
    ApiResponse::success(csv, "Success")
}

// ========== 路由 ==========

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/sales-invoices",
            get(list_sales_invoices).post(create_sales_invoice),
        )
        .route(
            "/sales-invoices/{id}",
            get(get_sales_invoice)
                .put(update_sales_invoice)
                .delete(delete_sales_invoice),
        )
        .route(
            "/sales-invoices/{id}/issue",
            axum::routing::post(issue_sales_invoice),
        )
        .route(
            "/sales-invoices/{id}/cancel",
            axum::routing::post(cancel_sales_invoice),
        )
        .route(
            "/sales-invoices/{id}/red-flush",
            axum::routing::post(red_flush_sales_invoice),
        )
        .route("/sales-invoices/export", get(export_sales_invoices))
        .route(
            "/sales-collections",
            get(list_collections).post(create_collection),
        )
        .route("/sales-collections/{id}", get(get_collection))
        .route(
            "/sales-collections/{id}/confirm",
            axum::routing::post(confirm_collection),
        )
        .route(
            "/sales-collections/batch-confirm",
            axum::routing::post(batch_confirm_collections),
        )
        .route("/sales-collections/export", get(export_collections))
        .route("/reports/receivable-aging", get(get_receivable_aging))
        .route("/reports/receivable-summary", get(get_receivable_summary))
        .route("/reports/overdue-receivables", get(get_overdue_receivables))
        .route(
            "/reports/receivable-aging/export",
            get(export_receivable_aging),
        )
}

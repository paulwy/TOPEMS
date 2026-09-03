//! ERP 财务凭证 API（服务间编排入口）
//!
//! 供 HRM 等外部服务通过 HTTP 创建财务凭证，替代跨服务直写 erp 表。
//! 参考 event_handlers 的销售凭证逻辑，schema 归属 erp。

use axum::{extract::State, routing::post, Json, Router};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::modules::ApiState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct CreateVoucherRequest {
    pub voucher_number: String,
    pub voucher_date: DateTime<Utc>,
    pub period: String,
    pub summary: String,
    pub maker_id: Uuid,
    pub maker_name: Option<String>,
    pub total_debit: Decimal,
    pub total_credit: Decimal,
    pub source_system: String,
    pub source_id: String,
    pub department_id: Option<Uuid>,
    pub entries: Vec<VoucherEntryRequest>,
}

#[derive(Debug, Deserialize)]
pub struct VoucherEntryRequest {
    pub line_number: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub summary: String,
    pub debit_amount: Decimal,
    pub credit_amount: Decimal,
    pub department_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct CreateVoucherResponse {
    pub success: bool,
    pub voucher_id: Uuid,
    pub voucher_number: String,
}

pub async fn create_voucher(
    State(state): State<ApiState>,
    Json(req): Json<CreateVoucherRequest>,
) -> Json<ApiResponse<CreateVoucherResponse>> {
    let voucher_id = Uuid::new_v4();
    let now = Utc::now();
    let department_id = req.department_id.unwrap_or_else(Uuid::nil);

    let voucher_result = sqlx::query(
        r#"INSERT INTO erp.financial_vouchers
           (id, voucher_number, voucher_date, period, summary, maker_id, maker_name, status, total_debit, total_credit, source_system, source_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10, $11, $12, $13)"#,
    )
    .bind(voucher_id)
    .bind(&req.voucher_number)
    .bind(req.voucher_date)
    .bind(&req.period)
    .bind(&req.summary)
    .bind(req.maker_id)
    .bind(req.maker_name.clone().unwrap_or_else(|| "系统".to_string()))
    .bind(req.total_debit)
    .bind(req.total_credit)
    .bind(&req.source_system)
    .bind(&req.source_id)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await;

    match voucher_result {
        Ok(_) => {
            for entry in req.entries {
                let item_id = Uuid::new_v4();
                let _ = sqlx::query(
                    r#"INSERT INTO erp.voucher_items
                       (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, department_id, created_at, updated_at)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"#,
                )
                .bind(item_id)
                .bind(voucher_id)
                .bind(entry.line_number)
                .bind(entry.subject_code)
                .bind(entry.subject_name)
                .bind(entry.summary)
                .bind(entry.debit_amount)
                .bind(entry.credit_amount)
                .bind(entry.department_id.unwrap_or(department_id))
                .bind(now)
                .bind(now)
                .execute(&state.db)
                .await;
            }

            tracing::info!(
                "[erp] Created voucher {} via API (source_system={}, source_id={})",
                req.voucher_number,
                req.source_system,
                req.source_id
            );

            Json(ApiResponse::success(
                CreateVoucherResponse {
                    success: true,
                    voucher_id,
                    voucher_number: req.voucher_number.clone(),
                },
                "财务凭证创建成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &format!("创建财务凭证失败: {}", e))),
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new().route("/vouchers", post(create_voucher))
}

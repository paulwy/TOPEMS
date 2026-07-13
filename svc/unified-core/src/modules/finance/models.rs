use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Payment {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub payment_no: String,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub payment_method: String,
    pub bank_account_id: Option<Uuid>,
    pub bank_name: Option<String>,
    pub bank_account_no: Option<String>,
    pub total_amount: Decimal,
    pub currency: String,
    pub payment_date: Option<NaiveDate>,
    pub actual_payment_date: Option<NaiveDate>,
    pub status: String,
    pub remark: Option<String>,
    pub voucher_id: Option<Uuid>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PaymentItem {
    pub id: Uuid,
    pub payment_id: Uuid,
    pub line_no: Option<i32>,
    pub invoice_id: Option<Uuid>,
    pub invoice_no: Option<String>,
    pub payable_amount: Decimal,
    pub payment_amount: Decimal,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaymentRequest {
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub payment_method: String,
    pub bank_account_id: Option<Uuid>,
    pub bank_name: Option<String>,
    pub bank_account_no: Option<String>,
    pub total_amount: Decimal,
    pub currency: Option<String>,
    pub payment_date: Option<NaiveDate>,
    pub remark: Option<String>,
    pub items: Vec<CreatePaymentItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaymentItemRequest {
    pub invoice_id: Option<Uuid>,
    pub invoice_no: Option<String>,
    pub payable_amount: Decimal,
    pub payment_amount: Decimal,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePaymentRequest {
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub payment_method: Option<String>,
    pub bank_account_id: Option<Uuid>,
    pub bank_name: Option<String>,
    pub bank_account_no: Option<String>,
    pub total_amount: Option<Decimal>,
    pub currency: Option<String>,
    pub payment_date: Option<NaiveDate>,
    pub remark: Option<String>,
    pub items: Option<Vec<CreatePaymentItemRequest>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentQuery {
    pub supplier_id: Option<Uuid>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentListResponse {
    pub items: Vec<Payment>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentDetailResponse {
    pub payment: Payment,
    pub items: Vec<PaymentItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Account {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub account_type: String,
    pub level: i32,
    pub currency: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAccountRequest {
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub account_type: String,
    pub currency: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAccountRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub parent_id: Option<Uuid>,
    pub account_type: Option<String>,
    pub currency: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountQuery {
    pub category: Option<String>,
    pub parent_id: Option<Uuid>,
    pub level: Option<i32>,
    pub status: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountListResponse {
    pub items: Vec<Account>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AccountBalance {
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: String,
    pub debit: Decimal,
    pub credit: Decimal,
    pub balance: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AccountOpeningBalance {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub account_id: Uuid,
    pub period: String,
    pub debit: Decimal,
    pub credit: Decimal,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Voucher {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub voucher_no: String,
    pub voucher_type: String,
    pub period: String,
    pub voucher_date: NaiveDate,
    pub summary: Option<String>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VoucherEntry {
    pub id: Uuid,
    pub voucher_id: Uuid,
    pub line_no: i32,
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: String,
    pub debit: Decimal,
    pub credit: Decimal,
    pub summary: Option<String>,
    pub department_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub counterparty_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVoucherRequest {
    pub voucher_type: String,
    pub period: Option<String>,
    pub voucher_date: String,
    pub summary: Option<String>,
    pub entries: Vec<CreateVoucherEntryRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVoucherEntryRequest {
    pub account_id: String,
    pub debit: Decimal,
    pub credit: Decimal,
    pub summary: Option<String>,
    pub department_id: Option<String>,
    pub project_id: Option<String>,
    pub counterparty_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoucherQuery {
    pub voucher_type: Option<String>,
    pub period: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoucherListResponse {
    pub items: Vec<Voucher>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoucherDetailResponse {
    pub voucher: Voucher,
    pub entries: Vec<VoucherEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOperationResult {
    pub success: i64,
    pub failed: i64,
    pub errors: Vec<String>,
}

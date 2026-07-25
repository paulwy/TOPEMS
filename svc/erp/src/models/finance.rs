use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use super::uuid_helpers::option_uuid;

// ============================================================
// V37.0 Phase 5: 已移除以下已迁移到 Finance 服务的类型
// - ExpenseStatus / ReceivableStatus / PayableStatus
// - Expense / CreateExpenseRequest / UpdateExpenseRequest
// - Budget / CreateBudgetRequest / UpdateBudgetRequest
// - Receivable / CreateReceivableRequest / UpdateReceivableRequest
// - Payable / CreatePayableRequest / UpdatePayableRequest
// - AccountBalance / AccountingPeriod
// - Reconciliation / CreateReconciliationRequest / ReconciliationRecord / ReconciliationRule / ReconciliationQuery
// ============================================================
// V39.0 Phase 7: 凭证模块完整迁移到 Finance 服务
// - Finance 服务已补全 update/delete/unpost 接口
// - ERP finance_proxy.rs 已补全凭证代理路由（update/delete/unpost/batch/export）
// - 凭证 CRUD 全部通过 /api/erp/finance/v2/vouchers/* 代理到 Finance 服务
// - 以下凭证相关类型仍被 ERP 本地 voucher 模块引用（modules/voucher/），
//   待 voucher 模块完全退役后方可删除
// - collections/payments/aging 模块不引用凭证类型，仅保留 voucher_id/voucher_no 字段关联
// ============================================================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct AccountingSubject {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: i32,
    pub parent_code: Option<String>,
    pub description: Option<String>,
    pub is_cash_flow: bool,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateAccountingSubjectRequest {
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: i32,
    pub parent_code: Option<String>,
    pub description: Option<String>,
    pub is_cash_flow: Option<bool>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateAccountingSubjectRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub parent_code: Option<String>,
    pub description: Option<String>,
    pub is_cash_flow: Option<bool>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct FinancialVoucher {
    pub id: Uuid,
    pub voucher_number: String,
    pub voucher_date: DateTime<Utc>,
    pub period: String,
    pub attachment_count: Option<i32>,
    pub summary: Option<String>,
    pub maker_id: Option<Uuid>,
    pub maker_name: Option<String>,
    pub checker_id: Option<Uuid>,
    pub checker_name: Option<String>,
    pub bookkeeper_id: Option<Uuid>,
    pub bookkeeper_name: Option<String>,
    pub status: String,
    pub total_debit: f64,
    pub total_credit: f64,
    pub source_system: Option<String>,
    pub source_id: Option<String>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateFinancialVoucherRequest {
    pub voucher_number: String,
    pub voucher_date: DateTime<Utc>,
    pub period: String,
    pub attachment_count: Option<i32>,
    pub summary: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub maker_id: Option<Uuid>,
    pub maker_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    pub items: Vec<VoucherItemRequest>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateFinancialVoucherRequest {
    pub voucher_date: Option<DateTime<Utc>>,
    pub period: Option<String>,
    pub attachment_count: Option<i32>,
    pub summary: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub checker_id: Option<Uuid>,
    pub checker_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub bookkeeper_id: Option<Uuid>,
    pub bookkeeper_name: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct VoucherItem {
    pub id: Uuid,
    pub voucher_id: Uuid,
    pub line_number: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub summary: Option<String>,
    pub debit_amount: f64,
    pub credit_amount: f64,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub price: Option<f64>,
    pub department_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct VoucherItemRequest {
    pub line_number: i32,
    pub subject_code: String,
    pub subject_name: Option<String>,
    pub summary: Option<String>,
    pub debit_amount: f64,
    pub credit_amount: f64,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub price: Option<f64>,
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct U8VoucherImportRequest {
    pub file_name: String,
    pub file_content: String,
    pub import_mode: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct U8VoucherData {
    pub voucher_number: String,
    pub voucher_date: String,
    pub period: String,
    pub summary: String,
    pub maker: String,
    pub items: Vec<U8VoucherItem>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct U8VoucherItem {
    pub line_number: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub summary: String,
    pub debit_amount: f64,
    pub credit_amount: f64,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct VoucherImportResult {
    pub success_count: i32,
    pub failed_count: i32,
    pub errors: Vec<String>,
    pub imported_vouchers: Vec<FinancialVoucher>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct VoucherTemplate {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
    pub applicable_modules: Option<serde_json::Value>,
    pub applicable_companies: Option<serde_json::Value>,
    pub condition: Option<String>,
    pub entries: Option<serde_json::Value>,
    pub status: String,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateVoucherTemplateRequest {
    pub code: String,
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
    pub applicable_modules: Option<Vec<String>>,
    pub applicable_companies: Option<Vec<String>>,
    pub condition: Option<String>,
    pub entries: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateVoucherTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub applicable_modules: Option<Vec<String>>,
    pub applicable_companies: Option<Vec<String>>,
    pub condition: Option<String>,
    pub entries: Option<Vec<serde_json::Value>>,
    pub status: Option<String>,
    pub is_default: Option<bool>,
}

// ============================================================
// 收款 / 付款记录（ERP 本地保留，未迁移到 Finance 服务）
// voucher_id / voucher_no 字段仅用于收付款与凭证的关联引用，
// 不依赖 FinancialVoucher 类型。
// ============================================================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct CollectionRecord {
    pub id: Uuid,
    pub collection_no: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub amount: f64,
    pub collection_date: Option<DateTime<Utc>>,
    pub invoice_ids: Option<serde_json::Value>,
    pub bank_account_id: Option<Uuid>,
    pub bank_account_no: Option<String>,
    pub bank_name: Option<String>,
    pub voucher_id: Option<Uuid>,
    pub voucher_no: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateCollectionRequest {
    pub collection_no: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub amount: f64,
    pub collection_date: Option<DateTime<Utc>>,
    pub invoice_ids: Option<Vec<String>>,
    #[serde(default, with = "option_uuid")]
    pub bank_account_id: Option<Uuid>,
    pub bank_account_no: Option<String>,
    pub bank_name: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct PaymentRecord {
    pub id: Uuid,
    pub payment_no: String,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub amount: f64,
    pub payment_date: Option<DateTime<Utc>>,
    pub invoice_ids: Option<serde_json::Value>,
    pub bank_account_id: Option<Uuid>,
    pub bank_account_no: Option<String>,
    pub bank_name: Option<String>,
    pub voucher_id: Option<Uuid>,
    pub voucher_no: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreatePaymentRequest {
    pub payment_no: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub amount: f64,
    pub payment_date: Option<DateTime<Utc>>,
    pub invoice_ids: Option<Vec<String>>,
    #[serde(default, with = "option_uuid")]
    pub bank_account_id: Option<Uuid>,
    pub bank_account_no: Option<String>,
    pub bank_name: Option<String>,
    pub remark: Option<String>,
}

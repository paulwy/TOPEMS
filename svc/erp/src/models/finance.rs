use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Decimal, FromRow};
use utoipa::ToSchema;
use uuid::Uuid;

use super::uuid_helpers::option_uuid;

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

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ExpenseStatus {
    #[default]
    Pending,
    Approved,
    Reimbursed,
    Rejected,
}

impl std::fmt::Display for ExpenseStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExpenseStatus::Pending => write!(f, "PENDING"),
            ExpenseStatus::Approved => write!(f, "APPROVED"),
            ExpenseStatus::Reimbursed => write!(f, "REIMBURSED"),
            ExpenseStatus::Rejected => write!(f, "REJECTED"),
        }
    }
}

impl From<String> for ExpenseStatus {
    fn from(s: String) -> Self {
        match s.to_uppercase().as_str() {
            "PENDING" => ExpenseStatus::Pending,
            "APPROVED" => ExpenseStatus::Approved,
            "REIMBURSED" => ExpenseStatus::Reimbursed,
            "REJECTED" => ExpenseStatus::Rejected,
            _ => ExpenseStatus::Pending,
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReceivableStatus {
    #[default]
    Pending,
    Partial,
    Paid,
    Overdue,
}

impl std::fmt::Display for ReceivableStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ReceivableStatus::Pending => write!(f, "PENDING"),
            ReceivableStatus::Partial => write!(f, "PARTIAL"),
            ReceivableStatus::Paid => write!(f, "PAID"),
            ReceivableStatus::Overdue => write!(f, "OVERDUE"),
        }
    }
}

impl From<String> for ReceivableStatus {
    fn from(s: String) -> Self {
        match s.to_uppercase().as_str() {
            "PENDING" => ReceivableStatus::Pending,
            "PARTIAL" => ReceivableStatus::Partial,
            "PAID" => ReceivableStatus::Paid,
            "OVERDUE" => ReceivableStatus::Overdue,
            _ => ReceivableStatus::Pending,
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PayableStatus {
    #[default]
    Pending,
    Partial,
    Paid,
    Overdue,
}

impl std::fmt::Display for PayableStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PayableStatus::Pending => write!(f, "PENDING"),
            PayableStatus::Partial => write!(f, "PARTIAL"),
            PayableStatus::Paid => write!(f, "PAID"),
            PayableStatus::Overdue => write!(f, "OVERDUE"),
        }
    }
}

impl From<String> for PayableStatus {
    fn from(s: String) -> Self {
        match s.to_uppercase().as_str() {
            "PENDING" => PayableStatus::Pending,
            "PARTIAL" => PayableStatus::Partial,
            "PAID" => PayableStatus::Paid,
            "OVERDUE" => PayableStatus::Overdue,
            _ => PayableStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Expense {
    pub id: Uuid,
    pub expense_number: String,
    pub applicant_name: Option<String>,
    pub department_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub budget_item_id: Option<Uuid>,
    pub expense_type: Option<String>,
    pub amount: f64,
    pub description: Option<String>,
    pub expense_date: Option<DateTime<Utc>>,
    pub receipt_count: Option<i32>,
    pub status: String,
    pub approver_id: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub reimbursed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateExpenseRequest {
    pub expense_number: String,
    pub applicant_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub budget_item_id: Option<Uuid>,
    pub expense_type: Option<String>,
    pub amount: f64,
    pub description: Option<String>,
    pub expense_date: Option<DateTime<Utc>>,
    pub receipt_count: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateExpenseRequest {
    pub applicant_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub budget_item_id: Option<Uuid>,
    pub expense_type: Option<String>,
    pub amount: Option<f64>,
    pub description: Option<String>,
    pub expense_date: Option<DateTime<Utc>>,
    pub receipt_count: Option<i32>,
    pub status: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub approver_id: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub reimbursed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Budget {
    pub id: Uuid,
    pub organization_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub budget_type: Option<String>,
    pub fiscal_year: String,
    pub total_budget: Decimal,
    pub used_amount: Decimal,
    pub remaining_amount: Decimal,
    pub usage_rate: Decimal,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateBudgetRequest {
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    pub budget_type: Option<String>,
    pub fiscal_year: String,
    pub total_budget: Decimal,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateBudgetRequest {
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    pub budget_type: Option<String>,
    pub fiscal_year: Option<String>,
    pub total_budget: Option<Decimal>,
    pub used_amount: Option<Decimal>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Receivable {
    pub id: Uuid,
    pub invoice_number: String,
    pub customer_name: Option<String>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub project_name: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: String,
    pub received_amount: f64,
    pub payment_schedule: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateReceivableRequest {
    pub invoice_number: String,
    pub customer_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    pub project_name: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub payment_schedule: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateReceivableRequest {
    pub customer_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    pub project_name: Option<String>,
    pub amount: Option<f64>,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub received_amount: Option<f64>,
    pub payment_schedule: Option<serde_json::Value>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Payable {
    pub id: Uuid,
    pub invoice_number: String,
    pub supplier_name: Option<String>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub category: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: String,
    pub paid_amount: f64,
    pub payment_schedule: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreatePayableRequest {
    pub invoice_number: String,
    pub supplier_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    pub category: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub payment_schedule: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdatePayableRequest {
    pub supplier_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    pub category: Option<String>,
    pub amount: Option<f64>,
    pub invoice_date: Option<DateTime<Utc>>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub paid_amount: Option<f64>,
    pub payment_schedule: Option<serde_json::Value>,
}

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

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AccountBalance {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub subject_code: String,
    pub subject_name: Option<String>,
    pub period: String,
    pub opening_debit: Decimal,
    pub opening_credit: Decimal,
    pub period_debit: Decimal,
    pub period_credit: Decimal,
    pub closing_debit: Decimal,
    pub closing_credit: Decimal,
    pub balance: Decimal,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AccountingPeriod {
    pub id: Uuid,
    pub period: String,
    pub year: i32,
    pub month: i32,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub status: String,
    pub fiscal_year: String,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
}

// ============================================================
//  V19.2/V19.3 财务对账模型 - V19.5 恢复
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct Reconciliation {
    pub id: Uuid,
    pub reconciliation_no: String,
    pub reconciliation_type: String,
    pub status: String,
    pub period: String,
    pub reference_id: Option<String>,
    pub total_amount: Decimal,
    pub reconciled_amount: Decimal,
    pub discrepancy_amount: Decimal,
    pub tenant_id: Uuid,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateReconciliationRequest {
    pub reconciliation_type: String,
    pub period: String,
    pub reference_id: Option<String>,
    pub total_amount: Option<Decimal>,
    pub record_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct ReconciliationRecord {
    pub id: Uuid,
    pub reconciliation_id: Uuid,
    pub record_type: String,
    pub record_id: String,
    pub amount: Decimal,
    pub matched_amount: Decimal,
    pub status: String,
    pub matched_record_id: Option<Uuid>,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct ReconciliationRule {
    pub id: Uuid,
    pub rule_name: String,
    pub reconciliation_type: String,
    pub match_field: String,
    pub tolerance: Decimal,
    pub priority: i32,
    pub enabled: bool,
    pub tenant_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct ReconciliationQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub reconciliation_type: Option<String>,
    pub status: Option<String>,
    pub period: Option<String>,
    pub reference_id: Option<String>,
    pub ref_id: Option<String>,
    pub ref_type: Option<String>,
}

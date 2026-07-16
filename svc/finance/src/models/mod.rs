use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::fmt;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Account {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub account_type: AccountType,
    pub level: i32,
    pub currency: String,
    pub is_enabled: bool,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "account_type")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum AccountType {
    Asset,
    Liability,
    Equity,
    Income,
    Expense,
    Cost,
}

impl fmt::Display for AccountType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AccountType::Asset => write!(f, "asset"),
            AccountType::Liability => write!(f, "liability"),
            AccountType::Equity => write!(f, "equity"),
            AccountType::Income => write!(f, "income"),
            AccountType::Expense => write!(f, "expense"),
            AccountType::Cost => write!(f, "cost"),
        }
    }
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Voucher {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub voucher_no: String,
    pub voucher_date: DateTime<Utc>,
    pub period: String,
    pub voucher_type: VoucherType,
    pub total_debit: Decimal,
    pub total_credit: Decimal,
    pub status: VoucherStatus,
    pub description: Option<String>,
    pub created_by: String,
    pub approved_by: Option<String>,
    pub posted_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "voucher_type")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum VoucherType {
    General,
    Payment,
    Receipt,
    Transfer,
}

impl fmt::Display for VoucherType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            VoucherType::General => write!(f, "general"),
            VoucherType::Payment => write!(f, "payment"),
            VoucherType::Receipt => write!(f, "receipt"),
            VoucherType::Transfer => write!(f, "transfer"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "voucher_status")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum VoucherStatus {
    Draft,
    Submitted,
    Approved,
    Posted,
    Rejected,
    Cancelled,
}

impl fmt::Display for VoucherStatus {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            VoucherStatus::Draft => write!(f, "draft"),
            VoucherStatus::Submitted => write!(f, "submitted"),
            VoucherStatus::Approved => write!(f, "approved"),
            VoucherStatus::Posted => write!(f, "posted"),
            VoucherStatus::Rejected => write!(f, "rejected"),
            VoucherStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct VoucherLine {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub voucher_id: Uuid,
    pub line_no: i32,
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: String,
    pub description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
    pub project_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct LedgerEntry {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: String,
    pub voucher_id: Uuid,
    pub voucher_no: String,
    pub voucher_date: DateTime<Utc>,
    pub period: String,
    pub description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
    pub balance: Decimal,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct TrialBalance {
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: String,
    pub account_type: AccountType,
    pub debit_balance: Decimal,
    pub credit_balance: Decimal,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Period {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub year: i32,
    pub month: i32,
    pub period_name: String,
    pub status: PeriodStatus,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
    pub closed_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "period_status")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum PeriodStatus {
    Open,
    Closing,
    Closed,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateAccountRequest {
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub account_type: AccountType,
    pub currency: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateVoucherRequest {
    #[serde(deserialize_with = "deserialize_date")]
    pub voucher_date: DateTime<Utc>,
    pub voucher_type: VoucherType,
    pub lines: Vec<VoucherLineRequest>,
    pub description: Option<String>,
}

fn deserialize_date<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    if let Ok(dt) = DateTime::parse_from_rfc3339(&s) {
        return Ok(dt.with_timezone(&Utc));
    }
    if let Ok(naive) = chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d") {
        return Ok(naive
            .and_hms_opt(0, 0, 0)
            .ok_or_else(|| serde::de::Error::custom(format!("Invalid date format: {}", s)))?);
    }
    Err(serde::de::Error::custom(format!(
        "Invalid date format: {}",
        s
    )))
}

#[derive(Debug, Clone, Deserialize)]
pub struct VoucherLineRequest {
    pub account_code: String,
    pub description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
    pub project_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PostVoucherRequest {
    pub voucher_id: Uuid,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ClosePeriodRequest {
    pub year: i32,
    pub month: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct YearEndCloseRequest {
    pub year: i32,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct YearEndCloseResult {
    pub voucher_id: Uuid,
    pub voucher_no: String,
    pub total_income: Decimal,
    pub total_expense: Decimal,
    pub net_profit: Decimal,
    pub income_accounts_closed: i32,
    pub expense_accounts_closed: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct VoucherResponse {
    pub id: Uuid,
    pub voucher_no: String,
    pub voucher_date: DateTime<Utc>,
    pub voucher_type: VoucherType,
    pub status: VoucherStatus,
    pub total_debit: Decimal,
    pub total_credit: Decimal,
    pub lines: Vec<VoucherLine>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct LedgerQueryParams {
    pub account_id: Option<Uuid>,
    pub account_code: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub period: Option<String>,
}

#[derive(Debug, Clone)]
pub struct JournalReport {
    pub period: String,
    pub entries: Vec<JournalEntry>,
    pub total_debit: Decimal,
    pub total_credit: Decimal,
}

#[derive(Debug, Clone)]
pub struct JournalEntry {
    pub voucher_no: String,
    pub voucher_date: DateTime<Utc>,
    pub account_code: String,
    pub account_name: String,
    pub description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct BalanceSheet {
    pub period: String,
    pub assets: Vec<BalanceItem>,
    pub liabilities: Vec<BalanceItem>,
    pub equity: Vec<BalanceItem>,
    pub total_assets: Decimal,
    pub total_liabilities: Decimal,
    pub total_equity: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct BalanceItem {
    pub account_code: String,
    pub account_name: String,
    pub amount: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct IncomeStatement {
    pub period: String,
    pub revenues: Vec<IncomeItem>,
    pub expenses: Vec<IncomeItem>,
    pub total_revenue: Decimal,
    pub total_expense: Decimal,
    pub net_income: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct IncomeItem {
    pub account_code: String,
    pub account_name: String,
    pub amount: Decimal,
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "aux_type")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum AuxType {
    Project,
    Department,
    Customer,
    Supplier,
    Employee,
    Custom1,
    Custom2,
    Custom3,
}

impl fmt::Display for AuxType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AuxType::Project => write!(f, "project"),
            AuxType::Department => write!(f, "department"),
            AuxType::Customer => write!(f, "customer"),
            AuxType::Supplier => write!(f, "supplier"),
            AuxType::Employee => write!(f, "employee"),
            AuxType::Custom1 => write!(f, "custom1"),
            AuxType::Custom2 => write!(f, "custom2"),
            AuxType::Custom3 => write!(f, "custom3"),
        }
    }
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct AuxiliaryAccount {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub aux_type: AuxType,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub level: i32,
    pub is_enabled: bool,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct AuxBalance {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub account_id: Uuid,
    pub aux_type: AuxType,
    pub aux_id: Uuid,
    pub period: String,
    pub debit_balance: Decimal,
    pub credit_balance: Decimal,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateAuxiliaryAccountRequest {
    pub aux_type: AuxType,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuxLedgerQuery {
    pub aux_type: AuxType,
    pub aux_id: Option<Uuid>,
    pub account_id: Option<Uuid>,
    pub period: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct AuxLedgerEntry {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub period: String,
    pub voucher_no: String,
    pub voucher_date: DateTime<Utc>,
    pub account_code: String,
    pub account_name: String,
    pub aux_type: AuxType,
    pub aux_id: Uuid,
    pub aux_name: String,
    pub description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
    pub balance: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuxBalanceReport {
    pub aux_type: AuxType,
    pub aux_id: Uuid,
    pub aux_name: String,
    pub items: Vec<AuxBalanceItem>,
    pub total_debit: Decimal,
    pub total_credit: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuxBalanceItem {
    pub account_code: String,
    pub account_name: String,
    pub debit_balance: Decimal,
    pub credit_balance: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct CashFlowStatement {
    pub period: String,
    pub items: Vec<CashFlowItem>,
    pub total_inflow: Decimal,
    pub total_outflow: Decimal,
    pub net_change: Decimal,
    pub opening_balance: Decimal,
    pub closing_balance: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct CashFlowItem {
    pub item_code: String,
    pub item_name: String,
    pub item_type: String,
    pub amount: Decimal,
    pub children: Vec<CashFlowItem>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BatchVoucherRequest {
    pub voucher_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BatchVoucherResponse {
    pub success_count: i32,
    pub fail_count: i32,
    pub results: Vec<BatchVoucherResult>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BatchVoucherResult {
    pub voucher_id: Uuid,
    pub voucher_no: Option<String>,
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct VoucherNoRule {
    pub prefix: String,
    pub date_format: String,
    pub start_number: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateVoucherNoRuleRequest {
    pub voucher_type: VoucherType,
    pub rule: VoucherNoRule,
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "export_format")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ExportFormat {
    Csv,
    Excel,
    Json,
    Pdf,
}

impl fmt::Display for ExportFormat {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ExportFormat::Csv => write!(f, "csv"),
            ExportFormat::Excel => write!(f, "xlsx"),
            ExportFormat::Json => write!(f, "json"),
            ExportFormat::Pdf => write!(f, "pdf"),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExportVoucherRequest {
    pub voucher_ids: Vec<Uuid>,
    pub format: ExportFormat,
    pub include_attachments: bool,
    pub period: Option<String>,
    pub status: Option<VoucherStatus>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExportVoucherResponse {
    pub file_name: String,
    pub format: ExportFormat,
    pub total_count: usize,
    pub total_debit: Decimal,
    pub total_credit: Decimal,
    pub file_data: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExportPaymentRequest {
    pub format: ExportFormat,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExportPaymentResponse {
    pub file_name: String,
    pub format: ExportFormat,
    pub total_count: usize,
    pub total_amount: Decimal,
    pub file_data: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct VoucherExportRow {
    pub voucher_no: String,
    pub voucher_date: String,
    pub period: String,
    pub voucher_type: String,
    pub status: String,
    pub line_no: i32,
    pub account_code: String,
    pub account_name: String,
    pub description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
    pub project_name: Option<String>,
    pub department_name: Option<String>,
    pub created_by: String,
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "approval_doc_type")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ApprovalDocType {
    Voucher,
    ConsolidationReport,
    FinancialStatement,
    JournalEntry,
}

impl fmt::Display for ApprovalDocType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ApprovalDocType::Voucher => write!(f, "voucher"),
            ApprovalDocType::ConsolidationReport => write!(f, "consolidation_report"),
            ApprovalDocType::FinancialStatement => write!(f, "financial_statement"),
            ApprovalDocType::JournalEntry => write!(f, "journal_entry"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "approval_status")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ApprovalStatus {
    Pending,
    Approved,
    Rejected,
    Cancelled,
}

impl fmt::Display for ApprovalStatus {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ApprovalStatus::Pending => write!(f, "pending"),
            ApprovalStatus::Approved => write!(f, "approved"),
            ApprovalStatus::Rejected => write!(f, "rejected"),
            ApprovalStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ApprovalWorkflow {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub doc_type: ApprovalDocType,
    pub doc_id: Uuid,
    pub doc_no: String,
    pub status: ApprovalStatus,
    pub submitted_by: String,
    pub submitted_at: DateTime<Utc>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejected_by: Option<String>,
    pub rejected_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub comment: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SubmitApprovalRequest {
    pub doc_type: ApprovalDocType,
    pub doc_id: Uuid,
    pub doc_no: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ApproveRequest {
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RejectRequest {
    pub reason: String,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApprovalResult {
    pub workflow_id: Uuid,
    pub doc_type: ApprovalDocType,
    pub doc_id: Uuid,
    pub status: ApprovalStatus,
    pub action_by: String,
    pub action_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ApprovalStatusQuery {
    pub doc_type: ApprovalDocType,
    pub doc_id: Uuid,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ApprovalListQuery {
    pub doc_type: Option<ApprovalDocType>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApprovalListResponse {
    pub workflows: Vec<ApprovalWorkflow>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Payment {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub voucher_id: Uuid,
    pub payment_no: String,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub payment_method: String,
    pub bank_account_id: Option<Uuid>,
    pub bank_name: Option<String>,
    pub bank_account_no: Option<String>,
    pub total_amount: Decimal,
    pub currency: String,
    pub exchange_rate: Option<Decimal>,
    pub payment_date: Option<chrono::NaiveDate>,
    pub actual_payment_date: Option<chrono::NaiveDate>,
    pub bank_transaction_no: Option<String>,
    pub executed_by: Option<String>,
    pub executed_at: Option<DateTime<Utc>>,
    pub remark: Option<String>,
    pub attachment_url: Option<String>,
    pub created_by: String,
    pub approved_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct PaymentItem {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub payment_id: Uuid,
    pub line_no: i32,
    pub invoice_id: Option<Uuid>,
    pub invoice_no: Option<String>,
    pub payable_id: Option<Uuid>,
    pub payable_amount: Decimal,
    pub payment_amount: Decimal,
    pub write_off_amount: Option<Decimal>,
    pub write_off_status: Option<String>,
    pub write_off_date: Option<chrono::NaiveDate>,
    pub write_off_by: Option<String>,
    pub remaining_amount: Option<Decimal>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePaymentRequest {
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub payment_method: String,
    pub bank_account_id: Option<Uuid>,
    pub bank_name: Option<String>,
    pub bank_account_no: Option<String>,
    pub total_amount: Decimal,
    pub currency: Option<String>,
    pub payment_date: Option<chrono::NaiveDate>,
    pub remark: Option<String>,
    pub items: Vec<PaymentItemRequest>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PaymentItemRequest {
    pub invoice_id: Option<Uuid>,
    pub invoice_no: Option<String>,
    pub payable_id: Option<Uuid>,
    pub payable_amount: Decimal,
    pub payment_amount: Decimal,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExecutePaymentRequest {
    pub bank_transaction_no: String,
    pub actual_payment_date: chrono::NaiveDate,
}

#[derive(Debug, Clone, Serialize)]
pub struct PaymentResponse {
    pub id: Uuid,
    pub payment_no: String,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub payment_method: String,
    pub total_amount: Decimal,
    pub currency: String,
    pub payment_date: Option<chrono::NaiveDate>,
    pub actual_payment_date: Option<chrono::NaiveDate>,
    pub bank_transaction_no: Option<String>,
    pub executed_by: Option<String>,
    pub executed_at: Option<DateTime<Utc>>,
    pub status: VoucherStatus,
    pub remark: Option<String>,
    pub items: Vec<PaymentItem>,
    pub voucher_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PaymentQueryParams {
    pub supplier_id: Option<Uuid>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PaymentListResponse {
    pub items: Vec<PaymentResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct PaymentApprovalConfig {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub amount_threshold: Decimal,
    pub max_amount: Option<Decimal>,
    pub workflow_id: Option<Uuid>,
    pub approval_levels: i32,
    pub node_config: Option<serde_json::Value>,
    pub priority: i32,
    pub is_active: bool,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ApprovalNode {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub config_id: Uuid,
    pub node_level: i32,
    pub node_name: String,
    pub approver_type: String,
    pub approver_role: Option<String>,
    pub approver_users: Option<Vec<String>>,
    pub approval_type: String,
    pub timeout_hours: Option<i32>,
    pub notify_users: Option<Vec<String>>,
    pub conditions: Option<serde_json::Value>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateApprovalConfigRequest {
    pub name: String,
    pub description: Option<String>,
    pub amount_threshold: Decimal,
    pub max_amount: Option<Decimal>,
    pub workflow_id: Option<Uuid>,
    pub approval_levels: Option<i32>,
    pub priority: Option<i32>,
    pub is_active: Option<bool>,
    pub nodes: Option<Vec<CreateApprovalNodeRequest>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateApprovalNodeRequest {
    pub node_level: i32,
    pub node_name: String,
    pub approver_type: String,
    pub approver_role: Option<String>,
    pub approver_users: Option<Vec<String>>,
    pub approval_type: Option<String>,
    pub timeout_hours: Option<i32>,
    pub notify_users: Option<Vec<String>>,
    pub conditions: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApprovalConfigResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub amount_threshold: Decimal,
    pub max_amount: Option<Decimal>,
    pub workflow_id: Option<Uuid>,
    pub approval_levels: i32,
    pub priority: i32,
    pub is_active: bool,
    pub nodes: Vec<ApprovalNode>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub mod audit_log;

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::fmt;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = Account)]
pub struct Account {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    #[serde(alias = "category")]
    pub account_type: Option<AccountType>,
    pub level: i32,
    pub currency: String,
    #[serde(alias = "isactive")]
    pub is_enabled: Option<bool>,
    pub description: Option<String>,
    // === 新增字段（18 个） ===
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name_en: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub balance_direction: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub haschildren: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    /// 自引用层级字段：schema 生成必须用 $ref，否则 utoipa 会无限内联递归。
    #[schema(no_recursion)]
    pub children: Option<Vec<Account>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub dimensions: Option<Vec<serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_cash_flow: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enable_quantity: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enable_foreign_currency: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none", alias = "default_currency")]
    pub default_currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_detail: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize, ToSchema)]
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

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = Voucher)]
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
    // === 新增字段（29 个） ===
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub voucher_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub year: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub month: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    // U6: Voucher 序列化总金额改 Decimal（对齐 total_debit/total_credit 的 Decimal 类型）
    pub total_amount: Option<Decimal>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub currency_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub entries: Option<Vec<VoucherLine>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub submitter_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub submitter_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub maker_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub maker_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub submitted_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub approver_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub approver_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub checker_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub checker_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub approved_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub poster_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub poster_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub bookkeeper_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub bookkeeper_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub posted_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub is_reversed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub reverse_voucher_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub reversed_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub attachment_count: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub source_module: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub source_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub template_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(skip)]
    pub updated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize, ToSchema)]
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

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize, ToSchema)]
#[sqlx(type_name = "voucher_status")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
#[schema(as = VoucherStatus)]
pub enum VoucherStatus {
    Draft,
    Submitted,
    Approved,
    Posted,
    Reversed,
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
            VoucherStatus::Reversed => write!(f, "reversed"),
            VoucherStatus::Rejected => write!(f, "rejected"),
            VoucherStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModelValidationError {
    InvalidStatus(String),
}

impl fmt::Display for ModelValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ModelValidationError::InvalidStatus(msg) => write!(f, "invalid status: {}", msg),
        }
    }
}

impl std::error::Error for ModelValidationError {}

impl VoucherStatus {
    pub fn can_submit(&self) -> bool {
        matches!(self, VoucherStatus::Draft)
    }

    pub fn validate_submit(&self) -> Result<(), ModelValidationError> {
        if !self.can_submit() {
            return Err(ModelValidationError::InvalidStatus(
                "只有草稿状态的凭证才能提交".to_string(),
            ));
        }
        Ok(())
    }

    pub fn can_approve(&self) -> bool {
        matches!(self, VoucherStatus::Submitted)
    }

    pub fn validate_approve(&self) -> Result<(), ModelValidationError> {
        if !self.can_approve() {
            return Err(ModelValidationError::InvalidStatus(
                "只有已提交的凭证才能审批".to_string(),
            ));
        }
        Ok(())
    }

    pub fn can_reject(&self) -> bool {
        matches!(self, VoucherStatus::Submitted)
    }

    pub fn validate_reject(&self) -> Result<(), ModelValidationError> {
        if !self.can_reject() {
            return Err(ModelValidationError::InvalidStatus(
                "只有已提交的凭证才能驳回".to_string(),
            ));
        }
        Ok(())
    }

    pub fn can_post(&self) -> bool {
        matches!(self, VoucherStatus::Approved)
    }

    pub fn validate_post(&self) -> Result<(), ModelValidationError> {
        if !self.can_post() {
            return Err(ModelValidationError::InvalidStatus(
                "只有已审批的凭证才能过账".to_string(),
            ));
        }
        Ok(())
    }

    pub fn can_unpost(&self) -> bool {
        matches!(self, VoucherStatus::Posted)
    }

    pub fn validate_unpost(&self) -> Result<(), ModelValidationError> {
        if !self.can_unpost() {
            return Err(ModelValidationError::InvalidStatus(
                "只有已过账的凭证才能反过账".to_string(),
            ));
        }
        Ok(())
    }

    pub fn can_reverse(&self) -> bool {
        matches!(self, VoucherStatus::Posted)
    }

    /// 仅未进入审批终态的凭证可删除；approved/posted/reversed 保留台账。
    pub fn can_delete(&self) -> bool {
        matches!(
            self,
            VoucherStatus::Draft
                | VoucherStatus::Submitted
                | VoucherStatus::Rejected
                | VoucherStatus::Cancelled
        )
    }

    pub fn validate_reverse(&self) -> Result<(), ModelValidationError> {
        if !self.can_reverse() {
            return Err(ModelValidationError::InvalidStatus(format!(
                "voucher must be Posted to reverse, current: {}",
                self
            )));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
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
    pub aux_type: Option<String>,
    pub aux_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
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

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
pub struct TrialBalance {
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: String,
    pub account_type: AccountType,
    pub debit_balance: Decimal,
    pub credit_balance: Decimal,
}

/// 报表金额统一序列化为字符串：避免前端 JS 以 f64 解析时丢精度（P3 决定 7）。
pub mod money_str {
    use rust_decimal::Decimal;
    use serde::Serializer;

    pub fn serialize<S: Serializer>(value: &Decimal, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&value.normalize().to_string())
    }
}

/// 科目余额表行：期初 + 本期发生 + 本年累计 + 期末，全部 Decimal（序列化为字符串）。
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct AccountBalanceItem {
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: String,
    pub account_type: String,
    #[serde(serialize_with = "money_str::serialize")]
    pub opening_debit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub opening_credit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub period_debit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub period_credit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub ytd_debit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub ytd_credit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub closing_debit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub closing_credit: Decimal,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct BalanceCheckIssue {
    pub code: String,
    pub message: String,
    #[serde(serialize_with = "money_str::serialize")]
    pub expected: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub actual: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub difference: Decimal,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct AccountBalanceReport {
    pub company_id: Uuid,
    pub period: String,
    pub items: Vec<AccountBalanceItem>,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_opening_debit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_opening_credit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_period_debit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_period_credit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_closing_debit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_closing_credit: Decimal,
    /// 未过账凭证提示：口径与资产负债表/利润表一致，只提示不计入表内金额。
    pub unposted: UnpostedInfo,
    pub balanced: bool,
    pub checks: Vec<BalanceCheckIssue>,
}

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
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

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize, ToSchema)]
#[sqlx(type_name = "period_status")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum PeriodStatus {
    Open,
    Closing,
    Closed,
}

impl PeriodStatus {
    pub fn as_db_str(&self) -> &'static str {
        match self {
            PeriodStatus::Open => "open",
            PeriodStatus::Closing => "closing",
            PeriodStatus::Closed => "closed",
        }
    }

    /// 严格解析外部传入的期间状态；未知值返回 None，避免把非法值透传到数据库枚举列。
    pub fn from_db_str(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "open" => Some(PeriodStatus::Open),
            "closing" => Some(PeriodStatus::Closing),
            "closed" => Some(PeriodStatus::Closed),
            _ => None,
        }
    }

    pub fn can_post(&self) -> bool {
        matches!(self, PeriodStatus::Open)
    }

    pub fn validate_post(&self) -> Result<(), ModelValidationError> {
        if !self.can_post() {
            return Err(ModelValidationError::InvalidStatus(format!(
                "period must be Open to post voucher, current: {:?}",
                self
            )));
        }
        Ok(())
    }

    pub fn can_close(&self) -> bool {
        matches!(self, PeriodStatus::Open | PeriodStatus::Closing)
    }

    pub fn validate_close(&self) -> Result<(), ModelValidationError> {
        if !self.can_close() {
            return Err(ModelValidationError::InvalidStatus(format!(
                "period must be Open or Closing to close, current: {:?}",
                self
            )));
        }
        Ok(())
    }

    pub fn can_reopen(&self) -> bool {
        matches!(self, PeriodStatus::Closed)
    }

    pub fn validate_reopen(&self) -> Result<(), ModelValidationError> {
        if !self.can_reopen() {
            return Err(ModelValidationError::InvalidStatus(format!(
                "period must be Closed to reopen, current: {:?}",
                self
            )));
        }
        Ok(())
    }

    pub fn can_create_entry(&self) -> bool {
        matches!(self, PeriodStatus::Open | PeriodStatus::Closing)
    }

    pub fn validate_create_entry(&self) -> Result<(), ModelValidationError> {
        if !self.can_create_entry() {
            return Err(ModelValidationError::InvalidStatus(format!(
                "period must be Open or Closing to create entry, current: {:?}",
                self
            )));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateAccountRequest {
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    #[serde(alias = "category")]
    pub account_type: Option<AccountType>,
    pub currency: String,
    pub description: Option<String>,
    #[serde(default)]
    pub name_en: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateVoucherRequest {
    #[serde(deserialize_with = "deserialize_date")]
    pub voucher_date: DateTime<Utc>,
    pub voucher_type: VoucherType,
    pub lines: Vec<VoucherLineRequest>,
    pub description: Option<String>,
    #[serde(default)]
    pub template_id: Option<Uuid>,
}

/// V39.0 Phase 7: 凭证更新请求（仅 draft/submitted/rejected 状态可更新）
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateVoucherRequest {
    #[serde(default, deserialize_with = "deserialize_option_date")]
    pub voucher_date: Option<DateTime<Utc>>,
    pub voucher_type: Option<VoucherType>,
    pub lines: Option<Vec<VoucherLineRequest>>,
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
    if let Ok(naive) = s.parse::<chrono::NaiveDate>() {
        let naive_dt = naive
            .and_hms_opt(0, 0, 0)
            .ok_or_else(|| serde::de::Error::custom(format!("Invalid date format: {}", s)))?;
        return Ok(DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc));
    }
    Err(serde::de::Error::custom(format!(
        "Invalid date format: {}",
        s
    )))
}

/// V39.0 Phase 7: Option<DateTime> 反序列化（缺失时返回 None）
fn deserialize_option_date<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let opt = Option::<String>::deserialize(deserializer)?;
    match opt {
        None => Ok(None),
        Some(s) => {
            if let Ok(dt) = DateTime::parse_from_rfc3339(&s) {
                return Ok(Some(dt.with_timezone(&Utc)));
            }
            if let Ok(naive) = s.parse::<chrono::NaiveDate>() {
                let naive_dt = naive.and_hms_opt(0, 0, 0).ok_or_else(|| {
                    serde::de::Error::custom(format!("Invalid date format: {}", s))
                })?;
                return Ok(Some(DateTime::<Utc>::from_naive_utc_and_offset(
                    naive_dt, Utc,
                )));
            }
            Err(serde::de::Error::custom(format!(
                "Invalid date format: {}",
                s
            )))
        }
    }
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct VoucherLineRequest {
    pub account_code: String,
    pub description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
    pub project_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    #[serde(default)]
    pub aux_type: Option<String>,
    #[serde(default)]
    pub aux_id: Option<Uuid>,
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
    pub year: i32,
    pub period: String,
    pub profit_voucher_id: Option<Uuid>,
    pub profit_voucher_no: Option<String>,
    #[serde(serialize_with = "money_str::serialize")]
    pub profit_total_debit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub profit_total_credit: Decimal,
    pub transfer_voucher_id: Option<Uuid>,
    pub transfer_voucher_no: Option<String>,
    #[serde(serialize_with = "money_str::serialize")]
    pub transfer_total_debit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub transfer_total_credit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_income: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_expense: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub net_profit: Decimal,
    pub income_accounts_closed: i32,
    pub expense_accounts_closed: i32,
    pub ledger_rows: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct IncomeCloseResult {
    pub period: String,
    pub voucher_id: Uuid,
    pub voucher_no: String,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_income: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_expense: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub net_profit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_debit: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_credit: Decimal,
    pub income_accounts: i32,
    pub expense_accounts: i32,
    pub ledger_rows: i32,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct BalanceSheet {
    pub period: String,
    pub assets: Vec<BalanceItem>,
    pub liabilities: Vec<BalanceItem>,
    pub equity: Vec<BalanceItem>,
    pub total_assets: Decimal,
    pub total_liabilities: Decimal,
    pub total_equity: Decimal,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct BalanceItem {
    pub account_code: String,
    pub account_name: String,
    pub amount: Decimal,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct IncomeStatement {
    pub period: String,
    pub revenues: Vec<IncomeItem>,
    pub expenses: Vec<IncomeItem>,
    pub total_revenue: Decimal,
    pub total_expense: Decimal,
    pub net_income: Decimal,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct IncomeItem {
    pub account_code: String,
    pub account_name: String,
    pub amount: Decimal,
}

/// 报表行（映射表驱动后的输出单位）。
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ReportLineItem {
    pub line_code: String,
    pub line_name: String,
    pub line_level: i16,
    pub sort_no: i32,
    #[serde(serialize_with = "money_str::serialize")]
    pub amount: Decimal,
}

/// 未过账凭证提示：只提示，不进表（P3 第二批）。
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct UnpostedInfo {
    pub count: i64,
    #[serde(serialize_with = "money_str::serialize")]
    pub amount: Decimal,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct StatutoryBalanceSheet {
    pub company_id: Uuid,
    pub period: String,
    pub assets: Vec<ReportLineItem>,
    pub liabilities: Vec<ReportLineItem>,
    pub equity: Vec<ReportLineItem>,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_assets: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_liabilities: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_equity: Decimal,
    pub unposted: UnpostedInfo,
    pub balanced: bool,
    pub checks: Vec<BalanceCheckIssue>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct StatutoryIncomeStatement {
    pub company_id: Uuid,
    pub period: String,
    pub revenues: Vec<ReportLineItem>,
    pub expenses: Vec<ReportLineItem>,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_revenue: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub total_expense: Decimal,
    #[serde(serialize_with = "money_str::serialize")]
    pub net_income: Decimal,
    pub unposted: UnpostedInfo,
    pub balanced: bool,
    pub checks: Vec<BalanceCheckIssue>,
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize, ToSchema)]
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

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
pub struct AuxiliaryAccount {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub aux_type: AuxType,
    pub code: String,
    pub name: String,
    #[serde(default)]
    #[sqlx(default)]
    pub name_en: Option<String>,
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

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct CashFlowStatement {
    pub period: String,
    pub items: Vec<CashFlowItem>,
    pub total_inflow: Decimal,
    pub total_outflow: Decimal,
    pub net_change: Decimal,
    pub opening_balance: Decimal,
    pub closing_balance: Decimal,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct CashFlowItem {
    pub item_code: String,
    pub item_name: String,
    pub item_type: String,
    pub amount: Decimal,
    /// 自引用层级字段：schema 生成必须用 $ref，否则 utoipa 会无限内联递归。
    #[schema(no_recursion)]
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

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize, ToSchema)]
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

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ExportVoucherRequest {
    pub voucher_ids: Vec<Uuid>,
    pub format: ExportFormat,
    pub include_attachments: bool,
    pub period: Option<String>,
    pub status: Option<VoucherStatus>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ExportVoucherResponse {
    pub file_name: String,
    pub format: ExportFormat,
    pub total_count: usize,
    pub total_debit: Decimal,
    pub total_credit: Decimal,
    pub file_data: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ExportPaymentRequest {
    pub format: ExportFormat,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
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

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
pub struct Payment {
    pub id: Uuid,
    pub tenant_id: Uuid,
    /// 历史/兜底行可能没有关联凭证，读模型容错为 Option，避免列表解码 unexpected null 直接 500。
    pub voucher_id: Option<Uuid>,
    pub payment_no: String,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub payment_method: String,
    pub status: String,
    pub bank_account_id: Option<Uuid>,
    pub bank_name: Option<String>,
    pub bank_account_no: Option<String>,
    pub total_amount: Decimal,
    pub currency: String,
    pub exchange_rate: Option<Decimal>,
    pub payment_date: Option<chrono::NaiveDate>,
    pub actual_payment_date: Option<chrono::NaiveDate>,
    pub bank_transaction_no: Option<String>,
    /// prod 列类型为 uuid，按 Option<Uuid> 解码。
    pub executed_by: Option<Uuid>,
    pub executed_at: Option<DateTime<Utc>>,
    pub remark: Option<String>,
    pub attachment_url: Option<String>,
    /// 列已由迁移 20261020000004 对齐为 VARCHAR(100)，存操作者用户名文本，按 Option<String> 解码。
    pub created_by: Option<String>,
    /// prod 列类型为 uuid，按 Option<Uuid> 解码。
    pub approved_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
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
    pub write_off_date: Option<DateTime<Utc>>,
    pub write_off_by: Option<Uuid>,
    pub remaining_amount: Option<Decimal>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct PaymentItemRequest {
    pub invoice_id: Option<Uuid>,
    pub invoice_no: Option<String>,
    pub payable_id: Option<Uuid>,
    pub payable_amount: Decimal,
    pub payment_amount: Decimal,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ExecutePaymentRequest {
    pub bank_transaction_no: String,
    pub actual_payment_date: chrono::NaiveDate,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
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
    pub executed_by: Option<Uuid>,
    pub executed_at: Option<DateTime<Utc>>,
    /// 付款单自身状态（draft/pending/processing/completed/failed/cancelled），
    /// 不再复用凭证状态。
    pub status: String,
    pub remark: Option<String>,
    pub items: Vec<PaymentItem>,
    /// 与读模型一致：兜底/历史行可能无关联凭证，故为 Option。
    pub voucher_id: Option<Uuid>,
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

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct PaymentListResponse {
    pub items: Vec<PaymentResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
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
    /// prod 列类型为 uuid；写入侧已按 Uuid 绑定。
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
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

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, ToSchema)]
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

// ==================== Reconciliation Models ====================

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize, ToSchema)]
#[sqlx(type_name = "reconciliation_type")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ReconciliationType {
    Bank,
    Receivable,
    Payable,
}

impl fmt::Display for ReconciliationType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ReconciliationType::Bank => write!(f, "bank"),
            ReconciliationType::Receivable => write!(f, "receivable"),
            ReconciliationType::Payable => write!(f, "payable"),
        }
    }
}

impl fmt::Display for ReconciliationStatus {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ReconciliationStatus::Pending => write!(f, "pending"),
            ReconciliationStatus::Processing => write!(f, "processing"),
            ReconciliationStatus::Completed => write!(f, "completed"),
            ReconciliationStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

impl fmt::Display for MatchStatus {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            MatchStatus::Unmatched => write!(f, "unmatched"),
            MatchStatus::Matched => write!(f, "matched"),
            MatchStatus::Diff => write!(f, "diff"),
            MatchStatus::Manual => write!(f, "manual"),
        }
    }
}

impl fmt::Display for ItemSource {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ItemSource::Bank => write!(f, "bank"),
            ItemSource::Erp => write!(f, "erp"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize, ToSchema)]
#[sqlx(type_name = "reconciliation_status")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ReconciliationStatus {
    Pending,
    Processing,
    Completed,
    Cancelled,
}

impl ReconciliationStatus {
    /// 对账会话状态机：pending ↔ processing，二者均可完成或取消；
    /// completed / cancelled 为终态，同态幂等。
    pub fn can_transition_to(&self, target: &Self) -> Result<(), String> {
        if self == target {
            return Ok(());
        }
        let allowed = match self {
            Self::Pending => matches!(target, Self::Processing | Self::Completed | Self::Cancelled),
            Self::Processing => matches!(target, Self::Pending | Self::Completed | Self::Cancelled),
            Self::Completed | Self::Cancelled => false,
        };
        if allowed {
            Ok(())
        } else {
            Err(format!("对账会话状态不允许从 {} 流转到 {}", self, target))
        }
    }

    #[must_use]
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Cancelled)
    }

    /// 写入目标态时允许的来源态，用于 `AND status = ANY(...)` 并发谓词。
    #[must_use]
    pub fn allowed_from(target: &Self) -> &'static [&'static str] {
        match target {
            Self::Pending => &["pending", "processing"],
            Self::Processing => &["pending", "processing"],
            Self::Completed => &["pending", "processing"],
            Self::Cancelled => &["pending", "processing"],
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "match_status")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum MatchStatus {
    Unmatched,
    Matched,
    Diff,
    Manual,
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "diff_reason")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum DiffReason {
    TimeDiff,
    AmountDiff,
    Duplicate,
    Missing,
    Unknown,
    Fee,
    ExchangeRate,
}

#[derive(Debug, Clone, PartialEq, Eq, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "item_source")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ItemSource {
    Bank,
    Erp,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ReconciliationSession {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub session_no: String,
    pub reco_type: ReconciliationType,
    pub period_start: chrono::NaiveDate,
    pub period_end: chrono::NaiveDate,
    pub bank_account_id: Option<Uuid>,
    pub entity_id: Option<Uuid>,
    pub status: ReconciliationStatus,
    pub total_items: i32,
    pub matched_items: i32,
    pub unmatched_items: i32,
    pub diff_items: i32,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ReconciliationItem {
    pub id: Uuid,
    pub session_id: Uuid,
    pub tenant_id: Uuid,
    pub source_type: ItemSource,
    pub transaction_date: chrono::NaiveDate,
    pub amount: Decimal,
    pub direction: String,
    pub counterparty_name: Option<String>,
    pub counterparty_account: Option<String>,
    pub reference_no: Option<String>,
    pub description: Option<String>,
    pub match_status: MatchStatus,
    pub matched_item_id: Option<Uuid>,
    pub diff_reason: Option<DiffReason>,
    pub diff_amount: Option<Decimal>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateReconciliationSessionRequest {
    pub reco_type: ReconciliationType,
    pub period_start: String,
    pub period_end: String,
    pub bank_account_id: Option<Uuid>,
    pub entity_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ImportReconciliationItemsRequest {
    pub session_id: Uuid,
    pub source_type: ItemSource,
    pub items: Vec<ReconciliationItemImport>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ReconciliationItemImport {
    pub transaction_date: String,
    pub amount: Decimal,
    pub direction: String,
    pub counterparty_name: Option<String>,
    pub counterparty_account: Option<String>,
    pub reference_no: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AutoMatchRequest {
    pub session_id: Uuid,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateDiffRequest {
    pub item_id: Uuid,
    pub diff_reason: DiffReason,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReconciliationSummary {
    pub session_id: Uuid,
    pub total_items: i32,
    pub matched_items: i32,
    pub unmatched_items: i32,
    pub diff_items: i32,
    pub match_rate: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MatchResult {
    pub matched_pairs: Vec<MatchedPair>,
    /// 低置信度匹配建议（fuzzy/amount 等仅金额+松日期配对）：
    /// 未自动 mark_matched，仅作响应标注，需人工确认后才落 matched。
    #[serde(default)]
    pub low_confidence_pairs: Vec<MatchedPair>,
    pub unmatched_bank: Vec<ReconciliationItem>,
    pub unmatched_erp: Vec<ReconciliationItem>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MatchedPair {
    pub bank_item_id: Uuid,
    pub erp_item_id: Uuid,
    pub amount: Decimal,
    pub match_type: String,
    /// 匹配置信度门控："high" = 强键匹配已自动落库 matched；
    /// "low" = 弱匹配建议（low_confidence），未写库，需人工确认。
    #[serde(default = "default_confidence")]
    pub confidence: String,
}

fn default_confidence() -> String {
    "high".to_string()
}

#[derive(Debug, Clone, Deserialize, utoipa::IntoParams)]
pub struct ReconciliationSessionListQuery {
    pub reco_type: Option<ReconciliationType>,
    pub status: Option<ReconciliationStatus>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReconciliationSessionListResponse {
    pub items: Vec<ReconciliationSession>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReconciliationReport {
    pub session_id: Uuid,
    pub session_no: String,
    pub reco_type: ReconciliationType,
    pub period_start: chrono::NaiveDate,
    pub period_end: chrono::NaiveDate,
    pub total_items: i32,
    pub matched_items: i32,
    pub unmatched_items: i32,
    pub diff_items: i32,
    pub match_rate: f64,
    pub total_matched_amount: Decimal,
    pub total_unmatched_amount: Decimal,
    pub total_diff_amount: Decimal,
    pub bank_balance: Decimal,
    pub erp_balance: Decimal,
    pub unreconciled_difference: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct AgingBucket {
    pub bucket: String,
    pub range_days: String,
    pub amount: Decimal,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct AgingReport {
    pub as_of_date: chrono::NaiveDate,
    pub direction: String,
    pub total_amount: Decimal,
    pub total_count: i64,
    pub buckets: Vec<AgingBucket>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BatchDiffRequest {
    pub items: Vec<BatchDiffItem>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BatchDiffItem {
    pub item_id: Uuid,
    pub diff_reason: DiffReason,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BatchDiffResponse {
    pub success_count: i32,
    pub failed_count: i32,
    pub failed_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffStatistics {
    pub session_id: Uuid,
    pub total_diff_items: i32,
    pub by_reason: Vec<DiffReasonCount>,
    pub by_status: Vec<DiffStatusCount>,
    pub total_diff_amount: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffReasonCount {
    pub reason: String,
    pub count: i32,
    pub amount: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffStatusCount {
    pub status: String,
    pub count: i32,
}

// ============================================================
// V286 B轨: settlement_center & 报表 & 交易对手 C 类补全
// 对应 api-types.ts C 类 8 条：AccountOpeningBalance / AccountBalance
// / CounterpartyType / ReportQueryParams / VoucherOperationResult
// / SalesInvoice / PurchaseInvoice
// ============================================================

/// 科目期初余额
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AccountOpeningBalance {
    pub id: Option<Uuid>,
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: Option<String>,
    pub period: String,
    pub currency: String,
    pub opening_debit: Decimal,
    pub opening_credit: Decimal,
    pub opening_balance: Decimal,
    pub is_carry_forward: bool,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// 科目余额（某期间）
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AccountBalance {
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: Option<String>,
    pub period: String,
    pub opening_debit: Decimal,
    pub opening_credit: Decimal,
    pub current_debit: Decimal,
    pub current_credit: Decimal,
    pub closing_debit: Decimal,
    pub closing_credit: Decimal,
    pub closing_balance: Decimal,
    pub balance_direction: String,
    pub quantity_balance: Option<Decimal>,
}

/// 交易对手类型（客户/供应商/员工/其他）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum CounterpartyType {
    Customer,
    Supplier,
    Employee,
    Other,
}

impl fmt::Display for CounterpartyType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CounterpartyType::Customer => write!(f, "customer"),
            CounterpartyType::Supplier => write!(f, "supplier"),
            CounterpartyType::Employee => write!(f, "employee"),
            CounterpartyType::Other => write!(f, "other"),
        }
    }
}

/// 报表通用查询参数
#[derive(Debug, Clone, Deserialize, IntoParams, ToSchema)]
pub struct ReportQueryParams {
    pub period: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub company_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub export_format: Option<String>,
    pub compare_with: Option<String>,
}

/// 凭证操作结果（创建/审批/过账/红冲等批量或单条返回）
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VoucherOperationResult {
    pub operation: String,
    pub total_count: i64,
    pub success_count: i64,
    pub failed_count: i64,
    pub success_ids: Vec<Uuid>,
    pub failed_items: Vec<VoucherOperationFailure>,
    pub started_at: Option<DateTime<Utc>>,
    pub finished_at: Option<DateTime<Utc>>,
}

/// 单条凭证操作失败明细
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VoucherOperationFailure {
    pub voucher_id: Option<Uuid>,
    pub voucher_no: Option<String>,
    pub error_code: String,
    pub error_message: String,
}

/// 销售发票（与 Invoice 结构对齐，属语义别名型 DTO）
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SalesInvoice {
    pub id: Uuid,
    pub invoice_no: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub invoice_date: DateTime<Utc>,
    pub due_date: Option<DateTime<Utc>>,
    pub currency: String,
    pub subtotal: Decimal,
    pub tax_amount: Decimal,
    pub total_amount: Decimal,
    pub paid_amount: Decimal,
    pub status: InvoiceStatus,
    pub remark: Option<String>,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub posted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 采购发票（与 Invoice 结构对齐，属语义别名型 DTO）
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PurchaseInvoice {
    pub id: Uuid,
    pub invoice_no: String,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub invoice_date: DateTime<Utc>,
    pub due_date: Option<DateTime<Utc>>,
    pub currency: String,
    pub subtotal: Decimal,
    pub tax_amount: Decimal,
    pub total_amount: Decimal,
    pub paid_amount: Decimal,
    pub status: InvoiceStatus,
    pub remark: Option<String>,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub posted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 发票状态枚举（与 settlement_v55::InvoiceStatus 语义一致，在 models 层提供统一引用）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum InvoiceStatus {
    Pending,
    Recognized,
    Verified,
    Posted,
}

impl fmt::Display for InvoiceStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            InvoiceStatus::Pending => write!(f, "pending"),
            InvoiceStatus::Recognized => write!(f, "recognized"),
            InvoiceStatus::Verified => write!(f, "verified"),
            InvoiceStatus::Posted => write!(f, "posted"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_account_type_variants() {
        let variants = [
            AccountType::Asset,
            AccountType::Liability,
            AccountType::Equity,
            AccountType::Income,
            AccountType::Expense,
            AccountType::Cost,
        ];
        for v in &variants {
            let s = v.to_string();
            assert!(!s.is_empty());
        }
        assert_eq!(AccountType::Asset.to_string(), "asset");
        assert_eq!(AccountType::Liability.to_string(), "liability");
        assert_eq!(AccountType::Equity.to_string(), "equity");
        assert_eq!(AccountType::Income.to_string(), "income");
        assert_eq!(AccountType::Expense.to_string(), "expense");
        assert_eq!(AccountType::Cost.to_string(), "cost");
    }

    #[test]
    fn test_account_type_serde_roundtrip() {
        use serde_json;
        let variants = [
            AccountType::Asset,
            AccountType::Liability,
            AccountType::Equity,
            AccountType::Income,
            AccountType::Expense,
            AccountType::Cost,
        ];
        for v in &variants {
            let json = serde_json::to_string(v).unwrap();
            let deserialized: AccountType = serde_json::from_str(&json).unwrap();
            assert_eq!(v, &deserialized);
        }
    }

    #[test]
    fn test_account_type_clone_and_eq() {
        let a = AccountType::Asset;
        let b = a.clone();
        assert_eq!(a, b);
        assert_ne!(AccountType::Asset, AccountType::Liability);
    }

    #[test]
    fn test_voucher_status_variants() {
        let variants = [
            VoucherStatus::Draft,
            VoucherStatus::Submitted,
            VoucherStatus::Approved,
            VoucherStatus::Posted,
            VoucherStatus::Reversed,
            VoucherStatus::Rejected,
            VoucherStatus::Cancelled,
        ];
        for v in &variants {
            let s = v.to_string();
            assert!(!s.is_empty());
        }
        assert_eq!(VoucherStatus::Draft.to_string(), "draft");
        assert_eq!(VoucherStatus::Submitted.to_string(), "submitted");
        assert_eq!(VoucherStatus::Approved.to_string(), "approved");
        assert_eq!(VoucherStatus::Posted.to_string(), "posted");
        assert_eq!(VoucherStatus::Reversed.to_string(), "reversed");
        assert_eq!(VoucherStatus::Rejected.to_string(), "rejected");
        assert_eq!(VoucherStatus::Cancelled.to_string(), "cancelled");
    }

    #[test]
    fn test_voucher_status_serde_roundtrip() {
        use serde_json;
        let variants = [
            VoucherStatus::Draft,
            VoucherStatus::Submitted,
            VoucherStatus::Approved,
            VoucherStatus::Posted,
            VoucherStatus::Reversed,
            VoucherStatus::Rejected,
            VoucherStatus::Cancelled,
        ];
        for v in &variants {
            let json = serde_json::to_string(v).unwrap();
            let deserialized: VoucherStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(v, &deserialized);
        }
    }

    #[test]
    fn test_voucher_status_clone_and_eq() {
        let a = VoucherStatus::Draft;
        let b = a.clone();
        assert_eq!(a, b);
        assert_ne!(VoucherStatus::Draft, VoucherStatus::Posted);
    }

    #[test]
    fn test_period_status_variants() {
        let variants = [
            PeriodStatus::Open,
            PeriodStatus::Closing,
            PeriodStatus::Closed,
        ];
        for v in &variants {
            let s = format!("{:?}", v);
            assert!(!s.is_empty());
        }
        assert_ne!(PeriodStatus::Open, PeriodStatus::Closed);
        assert_ne!(PeriodStatus::Closing, PeriodStatus::Closed);
    }

    #[test]
    fn test_period_status_serde_roundtrip() {
        use serde_json;
        let variants = [
            PeriodStatus::Open,
            PeriodStatus::Closing,
            PeriodStatus::Closed,
        ];
        for v in &variants {
            let json = serde_json::to_string(v).unwrap();
            let deserialized: PeriodStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(v, &deserialized);
        }
    }

    #[test]
    fn test_period_status_db_codec_rejects_unknown() {
        assert_eq!(PeriodStatus::Open.as_db_str(), "open");
        assert_eq!(PeriodStatus::Closing.as_db_str(), "closing");
        assert_eq!(PeriodStatus::Closed.as_db_str(), "closed");

        assert_eq!(
            PeriodStatus::from_db_str(" OPEN "),
            Some(PeriodStatus::Open)
        );
        assert_eq!(
            PeriodStatus::from_db_str("closed"),
            Some(PeriodStatus::Closed)
        );
        // 旧 list_periods 伪造的 locked 以及任意未知值都必须被拒绝。
        assert_eq!(PeriodStatus::from_db_str("locked"), None);
        assert_eq!(PeriodStatus::from_db_str("bogus"), None);
        assert_eq!(PeriodStatus::from_db_str(""), None);
    }

    #[test]
    fn test_voucher_type_variants() {
        let variants = [
            VoucherType::General,
            VoucherType::Payment,
            VoucherType::Receipt,
            VoucherType::Transfer,
        ];
        for v in &variants {
            let s = v.to_string();
            assert!(!s.is_empty());
        }
        assert_eq!(VoucherType::General.to_string(), "general");
        assert_eq!(VoucherType::Payment.to_string(), "payment");
        assert_eq!(VoucherType::Receipt.to_string(), "receipt");
        assert_eq!(VoucherType::Transfer.to_string(), "transfer");
    }

    #[test]
    fn test_aux_type_variants() {
        let variants = [
            AuxType::Project,
            AuxType::Department,
            AuxType::Customer,
            AuxType::Supplier,
            AuxType::Employee,
            AuxType::Custom1,
            AuxType::Custom2,
            AuxType::Custom3,
        ];
        for v in &variants {
            let s = v.to_string();
            assert!(!s.is_empty());
        }
        assert_eq!(AuxType::Project.to_string(), "project");
        assert_eq!(AuxType::Department.to_string(), "department");
        assert_eq!(AuxType::Customer.to_string(), "customer");
        assert_eq!(AuxType::Supplier.to_string(), "supplier");
        assert_eq!(AuxType::Employee.to_string(), "employee");
        assert_eq!(AuxType::Custom1.to_string(), "custom1");
        assert_eq!(AuxType::Custom2.to_string(), "custom2");
        assert_eq!(AuxType::Custom3.to_string(), "custom3");
    }

    #[test]
    fn test_export_format_variants() {
        let variants = [
            ExportFormat::Csv,
            ExportFormat::Excel,
            ExportFormat::Json,
            ExportFormat::Pdf,
        ];
        for v in &variants {
            let s = v.to_string();
            assert!(!s.is_empty());
        }
        assert_eq!(ExportFormat::Csv.to_string(), "csv");
        assert_eq!(ExportFormat::Excel.to_string(), "xlsx");
        assert_eq!(ExportFormat::Json.to_string(), "json");
        assert_eq!(ExportFormat::Pdf.to_string(), "pdf");
    }

    #[test]
    fn test_reconciliation_enums() {
        use serde_json;
        let types = [
            ReconciliationType::Bank,
            ReconciliationType::Receivable,
            ReconciliationType::Payable,
        ];
        for t in &types {
            assert!(!t.to_string().is_empty());
            let json = serde_json::to_string(t).unwrap();
            let d: ReconciliationType = serde_json::from_str(&json).unwrap();
            assert_eq!(t, &d);
        }

        let statuses = [
            ReconciliationStatus::Pending,
            ReconciliationStatus::Processing,
            ReconciliationStatus::Completed,
            ReconciliationStatus::Cancelled,
        ];
        for s in &statuses {
            assert!(!s.to_string().is_empty());
            let json = serde_json::to_string(s).unwrap();
            let d: ReconciliationStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(s, &d);
        }

        assert!(ReconciliationStatus::Pending
            .can_transition_to(&ReconciliationStatus::Processing)
            .is_ok());
        assert!(ReconciliationStatus::Processing
            .can_transition_to(&ReconciliationStatus::Pending)
            .is_ok());
        assert!(ReconciliationStatus::Pending
            .can_transition_to(&ReconciliationStatus::Completed)
            .is_ok());
        assert!(ReconciliationStatus::Processing
            .can_transition_to(&ReconciliationStatus::Cancelled)
            .is_ok());
        assert!(ReconciliationStatus::Completed
            .can_transition_to(&ReconciliationStatus::Pending)
            .is_err());
        assert!(ReconciliationStatus::Cancelled
            .can_transition_to(&ReconciliationStatus::Processing)
            .is_err());
        assert!(ReconciliationStatus::Completed
            .can_transition_to(&ReconciliationStatus::Completed)
            .is_ok());
        assert!(ReconciliationStatus::Completed.is_terminal());
        assert!(!ReconciliationStatus::Pending.is_terminal());

        let match_statuses = [
            MatchStatus::Unmatched,
            MatchStatus::Matched,
            MatchStatus::Diff,
            MatchStatus::Manual,
        ];
        for m in &match_statuses {
            assert!(!m.to_string().is_empty());
            let json = serde_json::to_string(m).unwrap();
            let d: MatchStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(m, &d);
        }

        let sources = [ItemSource::Bank, ItemSource::Erp];
        for s in &sources {
            assert!(!s.to_string().is_empty());
            let json = serde_json::to_string(s).unwrap();
            let d: ItemSource = serde_json::from_str(&json).unwrap();
            assert_eq!(s, &d);
        }

        let reasons = [
            DiffReason::TimeDiff,
            DiffReason::AmountDiff,
            DiffReason::Duplicate,
            DiffReason::Missing,
            DiffReason::Unknown,
            DiffReason::Fee,
            DiffReason::ExchangeRate,
        ];
        for r in &reasons {
            let json = serde_json::to_string(r).unwrap();
            let d: DiffReason = serde_json::from_str(&json).unwrap();
            assert_eq!(r, &d);
        }
    }

    #[test]
    fn test_voucher_status_can_submit() {
        use VoucherStatus::*;
        assert!(Draft.can_submit());
        assert!(!Submitted.can_submit());
        assert!(!Approved.can_submit());
        assert!(!Posted.can_submit());
        assert!(!Reversed.can_submit());
        assert!(!Rejected.can_submit());
        assert!(!Cancelled.can_submit());
    }

    #[test]
    fn test_voucher_status_validate_submit() {
        use VoucherStatus::*;
        let all = [
            Draft, Submitted, Approved, Posted, Reversed, Rejected, Cancelled,
        ];
        for s in all {
            let res = s.validate_submit();
            if matches!(s, Draft) {
                assert!(res.is_ok(), "Draft should be valid for submit");
            } else {
                assert!(res.is_err(), "{:?} should be invalid for submit", s);
                assert!(
                    matches!(res, Err(ModelValidationError::InvalidStatus(ref msg)) if msg.contains("只有草稿状态的凭证才能提交")),
                    "submit error message mismatch for {:?}: {:?}",
                    s,
                    res
                );
            }
        }
    }

    #[test]
    fn test_voucher_status_can_approve() {
        use VoucherStatus::*;
        assert!(!Draft.can_approve());
        assert!(Submitted.can_approve());
        assert!(!Approved.can_approve());
        assert!(!Posted.can_approve());
        assert!(!Reversed.can_approve());
        assert!(!Rejected.can_approve());
        assert!(!Cancelled.can_approve());
    }

    #[test]
    fn test_voucher_status_validate_approve() {
        use VoucherStatus::*;
        let all = [
            Draft, Submitted, Approved, Posted, Reversed, Rejected, Cancelled,
        ];
        for s in all {
            let res = s.validate_approve();
            if matches!(s, Submitted) {
                assert!(res.is_ok(), "Submitted should be valid for approve");
            } else {
                assert!(res.is_err(), "{:?} should be invalid for approve", s);
                assert!(
                    matches!(res, Err(ModelValidationError::InvalidStatus(ref msg)) if msg.contains("只有已提交的凭证才能审批")),
                    "approve error message mismatch for {:?}: {:?}",
                    s,
                    res
                );
            }
        }
    }

    #[test]
    fn test_voucher_status_can_reject() {
        use VoucherStatus::*;
        assert!(!Draft.can_reject());
        assert!(Submitted.can_reject());
        assert!(!Approved.can_reject());
        assert!(!Posted.can_reject());
        assert!(!Reversed.can_reject());
        assert!(!Rejected.can_reject());
        assert!(!Cancelled.can_reject());
    }

    #[test]
    fn test_voucher_status_validate_reject() {
        use VoucherStatus::*;
        let all = [
            Draft, Submitted, Approved, Posted, Reversed, Rejected, Cancelled,
        ];
        for s in all {
            let res = s.validate_reject();
            if matches!(s, Submitted) {
                assert!(res.is_ok(), "Submitted should be valid for reject");
            } else {
                assert!(res.is_err(), "{:?} should be invalid for reject", s);
                assert!(
                    matches!(res, Err(ModelValidationError::InvalidStatus(ref msg)) if msg.contains("只有已提交的凭证才能驳回")),
                    "reject error message mismatch for {:?}: {:?}",
                    s,
                    res
                );
            }
        }
    }

    #[test]
    fn test_voucher_status_can_post() {
        use VoucherStatus::*;
        assert!(!Draft.can_post());
        assert!(!Submitted.can_post());
        assert!(Approved.can_post());
        assert!(!Posted.can_post());
        assert!(!Reversed.can_post());
        assert!(!Rejected.can_post());
        assert!(!Cancelled.can_post());
    }

    #[test]
    fn test_voucher_status_validate_post() {
        use VoucherStatus::*;
        let all = [
            Draft, Submitted, Approved, Posted, Reversed, Rejected, Cancelled,
        ];
        for s in all {
            let res = s.validate_post();
            if matches!(s, Approved) {
                assert!(res.is_ok(), "Approved should be valid for post");
            } else {
                assert!(res.is_err(), "{:?} should be invalid for post", s);
                assert!(
                    matches!(res, Err(ModelValidationError::InvalidStatus(ref msg)) if msg.contains("只有已审批的凭证才能过账")),
                    "post error message mismatch for {:?}: {:?}",
                    s,
                    res
                );
            }
        }
    }

    #[test]
    fn test_voucher_status_can_delete() {
        use VoucherStatus::*;
        assert!(Draft.can_delete());
        assert!(Submitted.can_delete());
        assert!(!Approved.can_delete());
        assert!(!Posted.can_delete());
        assert!(!Reversed.can_delete());
        assert!(Rejected.can_delete());
        assert!(Cancelled.can_delete());
    }

    #[test]
    fn test_voucher_status_can_unpost() {
        use VoucherStatus::*;
        assert!(!Draft.can_unpost());
        assert!(!Submitted.can_unpost());
        assert!(!Approved.can_unpost());
        assert!(Posted.can_unpost());
        assert!(!Reversed.can_unpost());
        assert!(!Rejected.can_unpost());
        assert!(!Cancelled.can_unpost());
    }

    #[test]
    fn test_voucher_status_validate_unpost() {
        use VoucherStatus::*;
        let all = [
            Draft, Submitted, Approved, Posted, Reversed, Rejected, Cancelled,
        ];
        for s in all {
            let res = s.validate_unpost();
            if matches!(s, Posted) {
                assert!(res.is_ok(), "Posted should be valid for unpost");
            } else {
                assert!(res.is_err(), "{:?} should be invalid for unpost", s);
                assert!(
                    matches!(res, Err(ModelValidationError::InvalidStatus(ref msg)) if msg.contains("只有已过账的凭证才能反过账")),
                    "unpost error message mismatch for {:?}: {:?}",
                    s,
                    res
                );
            }
        }
    }

    #[test]
    fn test_model_validation_error_display() {
        let e = ModelValidationError::InvalidStatus("只有草稿状态的凭证才能提交".to_string());
        let display = format!("{}", e);
        assert!(display.contains("invalid status"));
        assert!(display.contains("只有草稿状态的凭证才能提交"));

        let e2 = ModelValidationError::InvalidStatus("只有已过账的凭证才能反过账".to_string());
        let display2 = format!("{}", e2);
        assert!(display2.contains("invalid status"));
        assert!(display2.contains("只有已过账的凭证才能反过账"));
    }

    #[test]
    fn test_period_status_can_close() {
        use PeriodStatus::*;
        assert!(Open.can_close());
        assert!(Closing.can_close());
        assert!(!Closed.can_close());
    }

    #[test]
    fn test_period_status_validate_close() {
        use PeriodStatus::*;
        let all = [Open, Closing, Closed];
        for s in all {
            let res = s.validate_close();
            match s {
                Open | Closing => {
                    assert!(res.is_ok(), "{:?} should be valid for close", s);
                    assert!(
                        s.can_close(),
                        "can_close should match validate_close ok for {:?}",
                        s
                    );
                }
                Closed => {
                    assert!(res.is_err(), "{:?} should be invalid for close", s);
                    assert!(
                        !s.can_close(),
                        "can_close should match validate_close err for {:?}",
                        s
                    );
                    assert!(
                        matches!(res, Err(ModelValidationError::InvalidStatus(ref msg)) if msg.contains("period must be Open or Closing to close")),
                        "close error message mismatch for {:?}: {:?}",
                        s,
                        res
                    );
                    assert!(
                        matches!(res, Err(ModelValidationError::InvalidStatus(ref msg)) if msg.contains("Closed")),
                        "close error should mention actual status Closed"
                    );
                }
            }
        }
    }

    #[test]
    fn test_period_status_can_reopen() {
        use PeriodStatus::*;
        assert!(!Open.can_reopen());
        assert!(!Closing.can_reopen());
        assert!(Closed.can_reopen());
    }

    #[test]
    fn test_period_status_validate_reopen() {
        use PeriodStatus::*;
        let all = [Open, Closing, Closed];
        for s in all {
            let res = s.validate_reopen();
            match s {
                Closed => {
                    assert!(res.is_ok(), "{:?} should be valid for reopen", s);
                    assert!(
                        s.can_reopen(),
                        "can_reopen should match validate_reopen ok for {:?}",
                        s
                    );
                }
                Open | Closing => {
                    assert!(res.is_err(), "{:?} should be invalid for reopen", s);
                    assert!(
                        !s.can_reopen(),
                        "can_reopen should match validate_reopen err for {:?}",
                        s
                    );
                    assert!(
                        matches!(res, Err(ModelValidationError::InvalidStatus(ref msg)) if msg.contains("period must be Closed to reopen")),
                        "reopen error message mismatch for {:?}: {:?}",
                        s,
                        res
                    );
                }
            }
        }
    }

    #[test]
    fn test_period_status_can_create_entry() {
        use PeriodStatus::*;
        assert!(Open.can_create_entry());
        assert!(Closing.can_create_entry());
        assert!(!Closed.can_create_entry());
    }

    #[test]
    fn test_period_status_validate_create_entry() {
        use PeriodStatus::*;
        let all = [Open, Closing, Closed];
        for s in all {
            let res = s.validate_create_entry();
            match s {
                Open | Closing => {
                    assert!(res.is_ok(), "{:?} should be valid for create_entry", s);
                    assert!(
                        s.can_create_entry(),
                        "can_create_entry should match validate_create_entry ok for {:?}",
                        s
                    );
                }
                Closed => {
                    assert!(res.is_err(), "{:?} should be invalid for create_entry", s);
                    assert!(
                        !s.can_create_entry(),
                        "can_create_entry should match validate_create_entry err for {:?}",
                        s
                    );
                    assert!(
                        matches!(res, Err(ModelValidationError::InvalidStatus(ref msg)) if msg.contains("period must be Open or Closing to create entry")),
                        "create_entry error message mismatch for {:?}: {:?}",
                        s,
                        res
                    );
                    assert!(
                        matches!(res, Err(ModelValidationError::InvalidStatus(ref msg)) if msg.contains("Closed")),
                        "create_entry error should mention actual status Closed"
                    );
                }
            }
        }
    }
}

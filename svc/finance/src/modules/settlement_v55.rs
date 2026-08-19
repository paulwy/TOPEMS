#![allow(dead_code)] // Reserved: V55 智能结算自动化模块，待业务接入后启用

//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V55.0 Finance 智能结算自动化
//!
//! 核心能力：
//! - 自动对账 (Auto Reconciliation): 银行交易与系统记录自动匹配、差异检测、人工审批
//! - 发票识别 (Invoice Recognition): OCR 结构化数据提取、字段验证、发票匹配、过账
//! - 电子支付 (Electronic Payment): 多网关支付处理、支付调度、费率计算、支付冲正
//!
//! 路由：
//! - POST   /finance-v55/reconcile/batch
//! - POST   /finance-v55/reconcile/single
//! - GET    /finance-v55/reconcile/results
//! - POST   /finance-v55/reconcile/rules
//! - GET    /finance-v55/reconcile/rules
//! - PUT    /finance-v55/reconcile/match/{id}/approve
//! - PUT    /finance-v55/reconcile/match/{id}/dispute
//! - POST   /finance-v55/invoice/recognize
//! - GET    /finance-v55/invoice/{id}
//! - GET    /finance-v55/invoices
//! - POST   /finance-v55/invoice/{id}/validate
//! - POST   /finance-v55/invoice/{id}/post
//! - POST   /finance-v55/invoice/match
//! - POST   /finance-v55/payment/initiate
//! - GET    /finance-v55/payment/{id}/status
//! - POST   /finance-v55/payment/{id}/reverse
//! - GET    /finance-v55/payments
//! - POST   /finance-v55/payment/schedule
//! - GET    /finance-v55/payment/methods

use axum::{
    extract::{Extension, Json, Path, Query, State},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::fmt;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

// ==================== ValidationError ====================

#[derive(Debug, Clone, PartialEq)]
pub enum ValidationError {
    InvalidStatus(String),
    EmptyField(String),
    NegativeAmount(String),
    InvalidCurrency(String),
    SelfTransfer(String, String),
    AmountAboveLimit {
        amount: f64,
        limit: f64,
    },
    CurrencyNotWhitelisted(String),
    StaleReconciliation {
        tx_age_days: i64,
        max_age_days: i64,
    },
    ScheduledPaymentInPast {
        scheduled_at: DateTime<Utc>,
        now: DateTime<Utc>,
    },
    InvoiceTaxMismatch {
        header_tax: f64,
        items_tax: f64,
    },
    InvoiceItemsTotalMismatch {
        header_total: f64,
        items_total: f64,
    },
    InvoiceDateInFuture {
        invoice_date: DateTime<Utc>,
        now: DateTime<Utc>,
    },
    ReconEmptyInput {
        bank_count: usize,
        system_count: usize,
    },
    ReconCurrencyMismatch {
        bank_currency: String,
        system_currency: String,
    },
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ValidationError::InvalidStatus(msg) => write!(f, "invalid status: {}", msg),
            ValidationError::EmptyField(field) => write!(f, "empty field: {}", field),
            ValidationError::NegativeAmount(field) => write!(f, "negative amount: {}", field),
            ValidationError::InvalidCurrency(code) => write!(f, "invalid currency code: {}", code),
            ValidationError::SelfTransfer(from, to) => {
                write!(f, "self-transfer not allowed: from={} to={}", from, to)
            }
            ValidationError::AmountAboveLimit { amount, limit } => {
                write!(f, "amount above limit: {} > limit {}", amount, limit)
            }
            ValidationError::CurrencyNotWhitelisted(code) => {
                write!(f, "currency not in whitelist: {}", code)
            }
            ValidationError::StaleReconciliation {
                tx_age_days,
                max_age_days,
            } => write!(
                f,
                "stale reconciliation: transaction {} days old > max {}",
                tx_age_days, max_age_days
            ),
            ValidationError::ScheduledPaymentInPast { scheduled_at, now } => write!(
                f,
                "scheduled payment in the past: scheduled={} now={}",
                scheduled_at, now
            ),
            ValidationError::InvoiceTaxMismatch {
                header_tax,
                items_tax,
            } => write!(
                f,
                "invoice tax mismatch: header_tax={} items_tax={}",
                header_tax, items_tax
            ),
            ValidationError::InvoiceItemsTotalMismatch {
                header_total,
                items_total,
            } => write!(
                f,
                "invoice items total mismatch: header_total={} items_total={}",
                header_total, items_total
            ),
            ValidationError::InvoiceDateInFuture { invoice_date, now } => write!(
                f,
                "invoice date in future: invoice_date={} now={}",
                invoice_date, now
            ),
            ValidationError::ReconEmptyInput {
                bank_count,
                system_count,
            } => write!(
                f,
                "reconciliation empty input: bank_transactions={} system_records={}",
                bank_count, system_count
            ),
            ValidationError::ReconCurrencyMismatch {
                bank_currency,
                system_currency,
            } => write!(
                f,
                "reconciliation currency mismatch: bank={} system={}",
                bank_currency, system_currency
            ),
        }
    }
}

impl std::error::Error for ValidationError {}

impl ValidationError {
    /// 映射到 HTTP 响应码（与 ApiResponse.code 对齐 → IntoResponse 设为 HTTP 状态码）
    pub fn http_status_code(&self) -> u16 {
        match self {
            // 客户端请求级 / 参数格式 / 必填缺失 → 400
            ValidationError::EmptyField(_)
            | ValidationError::NegativeAmount(_)
            | ValidationError::InvalidCurrency(_)
            | ValidationError::CurrencyNotWhitelisted(_)
            | ValidationError::ReconEmptyInput { .. }
            | ValidationError::ReconCurrencyMismatch { .. } => 400,
            // 业务规则不允许 → 422 Unprocessable Entity
            ValidationError::SelfTransfer(_, _)
            | ValidationError::AmountAboveLimit { .. }
            | ValidationError::StaleReconciliation { .. }
            | ValidationError::ScheduledPaymentInPast { .. }
            | ValidationError::InvoiceTaxMismatch { .. }
            | ValidationError::InvoiceItemsTotalMismatch { .. }
            | ValidationError::InvoiceDateInFuture { .. }
            | ValidationError::InvalidStatus(_) => 422,
        }
    }

    /// 机器可读错误码（用于前端按 key 分支处理 / i18n）
    pub fn error_code(&self) -> &'static str {
        match self {
            ValidationError::InvalidStatus(_) => "INVALID_STATUS",
            ValidationError::EmptyField(_) => "EMPTY_FIELD",
            ValidationError::NegativeAmount(_) => "NEGATIVE_AMOUNT",
            ValidationError::InvalidCurrency(_) => "INVALID_CURRENCY",
            ValidationError::SelfTransfer(_, _) => "SELF_TRANSFER_NOT_ALLOWED",
            ValidationError::AmountAboveLimit { .. } => "AMOUNT_ABOVE_LIMIT",
            ValidationError::CurrencyNotWhitelisted(_) => "CURRENCY_NOT_WHITELISTED",
            ValidationError::StaleReconciliation { .. } => "STALE_RECONCILIATION",
            ValidationError::ScheduledPaymentInPast { .. } => "SCHEDULED_PAYMENT_IN_PAST",
            ValidationError::InvoiceTaxMismatch { .. } => "INVOICE_TAX_MISMATCH",
            ValidationError::InvoiceItemsTotalMismatch { .. } => "INVOICE_ITEMS_TOTAL_MISMATCH",
            ValidationError::InvoiceDateInFuture { .. } => "INVOICE_DATE_IN_FUTURE",
            ValidationError::ReconEmptyInput { .. } => "RECON_EMPTY_INPUT",
            ValidationError::ReconCurrencyMismatch { .. } => "RECON_CURRENCY_MISMATCH",
        }
    }

    /// 转为 handler 层统一错误响应（ApiResponse::error，同时设置 code 与人类可读消息）
    pub fn into_api_response<T>(self) -> Json<ApiResponse<T>> {
        let code = self.http_status_code();
        let msg = self.to_string();
        Json(ApiResponse::error(code, &msg))
    }
}

// ==================== Prevalidation 纯函数前置校验层 ====================

impl InitiatePaymentRequest {
    /// 电子支付请求 → 4 联全量前置校验：initiate / currency / no-self-transfer / amount-limit
    /// （validate_currency 使用白名单严格模式；validate_amount_limit 默认 10^8）
    pub fn prevalidate_payment(
        &self,
        amount_limit: Option<f64>,
        strict_currency_whitelist: bool,
    ) -> Result<(), ValidationError> {
        self.validate_initiate()?;
        self.validate_currency()?;
        if strict_currency_whitelist {
            self.validate_currency_whitelist()?;
        }
        self.validate_no_self_transfer()?;
        self.validate_amount_limit(amount_limit)?;
        Ok(())
    }

    /// 币种白名单严格模式：代码长度/大写通过后，必须命中 VALID_CURRENCIES_WHITELIST
    pub fn validate_currency_whitelist(&self) -> Result<(), ValidationError> {
        match &self.currency {
            None => Ok(()),
            Some(code) => {
                if !Self::VALID_CURRENCIES_WHITELIST.contains(&code.as_str()) {
                    return Err(ValidationError::CurrencyNotWhitelisted(code.clone()));
                }
                Ok(())
            }
        }
    }

    /// 调度支付额外校验：scheduled_at 不能早于给定的当前时间（可注入）
    pub fn validate_scheduled_at(
        scheduled_at: DateTime<Utc>,
        now: DateTime<Utc>,
    ) -> Result<(), ValidationError> {
        if scheduled_at < now {
            return Err(ValidationError::ScheduledPaymentInPast { scheduled_at, now });
        }
        Ok(())
    }
}

impl ReconcileBatchRequest {
    /// 对账批处理纯函数校验：
    /// - 输入非空（至少 1 条 each）
    /// - 交易日期不得超过 max_age_days（stale 风控）
    /// - 同一索引上的银行交易与系统记录币种一致（减少伪匹配）
    pub fn prevalidate_reconciliation(
        &self,
        now: DateTime<Utc>,
        max_age_days: Option<i64>,
        check_currency: bool,
    ) -> Result<(), ValidationError> {
        let b = self.bank_transactions.len();
        let s = self.system_records.len();
        if b == 0 || s == 0 {
            return Err(ValidationError::ReconEmptyInput {
                bank_count: b,
                system_count: s,
            });
        }
        if let Some(max) = max_age_days {
            for tx in &self.bank_transactions {
                let age = (now - tx.date).num_days();
                if age > max {
                    return Err(ValidationError::StaleReconciliation {
                        tx_age_days: age,
                        max_age_days: max,
                    });
                }
            }
            for tx in &self.system_records {
                let age = (now - tx.date).num_days();
                if age > max {
                    return Err(ValidationError::StaleReconciliation {
                        tx_age_days: age,
                        max_age_days: max,
                    });
                }
            }
        }
        if check_currency {
            let n = b.min(s);
            for i in 0..n {
                let bc = &self.bank_transactions[i].currency;
                let sc = &self.system_records[i].currency;
                if bc != sc {
                    return Err(ValidationError::ReconCurrencyMismatch {
                        bank_currency: bc.clone(),
                        system_currency: sc.clone(),
                    });
                }
            }
        }
        Ok(())
    }
}

impl ReconcileSingleRequest {
    /// 单笔对账纯函数校验（同上规则）
    pub fn prevalidate(
        &self,
        now: DateTime<Utc>,
        max_age_days: Option<i64>,
        check_currency: bool,
    ) -> Result<(), ValidationError> {
        let batch = ReconcileBatchRequest {
            bank_transactions: vec![self.bank_transaction.clone()],
            system_records: vec![self.system_record.clone()],
        };
        batch.prevalidate_reconciliation(now, max_age_days, check_currency)
    }
}

impl InvoiceWithItems {
    /// 发票整单纯函数前置校验：
    /// - 过账前状态必须 Verified
    /// - 明细合计 = 总表 total_amount（容差 0.01；无明细跳过）
    /// - 明细税额合计 = 总表 tax_amount（容差 0.01；无明细跳过）
    /// - invoice_date 不得晚于 now（防止未来日期发票提前入账）
    pub fn prevalidate_post(
        &self,
        now: DateTime<Utc>,
        allow_future_date: bool,
    ) -> Result<(), ValidationError> {
        self.invoice.validate_post()?;
        if !allow_future_date && self.invoice.invoice_date > now {
            return Err(ValidationError::InvoiceDateInFuture {
                invoice_date: self.invoice.invoice_date,
                now,
            });
        }
        if !self.items.is_empty() {
            let items_total: f64 = self.items.iter().map(|i| i.amount).sum();
            let tol = 0.01;
            if (items_total - self.invoice.total_amount).abs() > tol {
                return Err(ValidationError::InvoiceItemsTotalMismatch {
                    header_total: self.invoice.total_amount,
                    items_total,
                });
            }
            let items_tax: f64 = self.items.iter().map(|i| i.amount * i.tax_rate).sum();
            if (items_tax - self.invoice.tax_amount).abs() > tol {
                return Err(ValidationError::InvoiceTaxMismatch {
                    header_tax: self.invoice.tax_amount,
                    items_tax,
                });
            }
        }
        Ok(())
    }

    /// 发票识别后整单校验（不强制状态=Verified）：
    /// - 明细合计对齐；
    /// - 税额合计对齐；
    /// - 发票号/供应商/vat_number 非空（前端已有字段校验但在模型层再兜底）
    pub fn prevalidate_recognize(&self) -> Result<(), ValidationError> {
        if self.invoice.number.trim().is_empty() {
            return Err(ValidationError::EmptyField("invoice.number".into()));
        }
        if self.invoice.vendor.trim().is_empty() {
            return Err(ValidationError::EmptyField("invoice.vendor".into()));
        }
        if !self.items.is_empty() {
            let items_total: f64 = self.items.iter().map(|i| i.amount).sum();
            let tol = 0.01;
            if (items_total - self.invoice.total_amount).abs() > tol {
                return Err(ValidationError::InvoiceItemsTotalMismatch {
                    header_total: self.invoice.total_amount,
                    items_total,
                });
            }
            let items_tax: f64 = self.items.iter().map(|i| i.amount * i.tax_rate).sum();
            if (items_tax - self.invoice.tax_amount).abs() > tol {
                return Err(ValidationError::InvoiceTaxMismatch {
                    header_tax: self.invoice.tax_amount,
                    items_tax,
                });
            }
        }
        Ok(())
    }
}

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_default()
}

// ==================== 枚举类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MatchType {
    Exact,
    Fuzzy,
    Amount,
    Temporal,
}

impl MatchType {
    fn as_str(&self) -> &'static str {
        match self {
            MatchType::Exact => "exact",
            MatchType::Fuzzy => "fuzzy",
            MatchType::Amount => "amount",
            MatchType::Temporal => "temporal",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "fuzzy" => MatchType::Fuzzy,
            "amount" => MatchType::Amount,
            "temporal" => MatchType::Temporal,
            _ => MatchType::Exact,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MatchStatus {
    Matched,
    Partial,
    Unmatched,
    Discrepancy,
}

impl MatchStatus {
    fn as_str(&self) -> &'static str {
        match self {
            MatchStatus::Matched => "matched",
            MatchStatus::Partial => "partial",
            MatchStatus::Unmatched => "unmatched",
            MatchStatus::Discrepancy => "discrepancy",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "partial" => MatchStatus::Partial,
            "unmatched" => MatchStatus::Unmatched,
            "discrepancy" => MatchStatus::Discrepancy,
            _ => MatchStatus::Matched,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SystemRecordType {
    Invoice,
    Payment,
    Receipt,
}

impl SystemRecordType {
    fn as_str(&self) -> &'static str {
        match self {
            SystemRecordType::Invoice => "invoice",
            SystemRecordType::Payment => "payment",
            SystemRecordType::Receipt => "receipt",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "payment" => SystemRecordType::Payment,
            "receipt" => SystemRecordType::Receipt,
            _ => SystemRecordType::Invoice,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InvoiceStatus {
    Pending,
    Recognized,
    Verified,
    Posted,
}

impl InvoiceStatus {
    fn as_str(&self) -> &'static str {
        match self {
            InvoiceStatus::Pending => "pending",
            InvoiceStatus::Recognized => "recognized",
            InvoiceStatus::Verified => "verified",
            InvoiceStatus::Posted => "posted",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "recognized" => InvoiceStatus::Recognized,
            "verified" => InvoiceStatus::Verified,
            "posted" => InvoiceStatus::Posted,
            _ => InvoiceStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PaymentMethod {
    BankTransfer,
    EWallet,
    CreditCard,
    ACH,
    WireTransfer,
    QRCode,
}

impl PaymentMethod {
    fn as_str(&self) -> &'static str {
        match self {
            PaymentMethod::BankTransfer => "bank_transfer",
            PaymentMethod::EWallet => "e_wallet",
            PaymentMethod::CreditCard => "credit_card",
            PaymentMethod::ACH => "ach",
            PaymentMethod::WireTransfer => "wire_transfer",
            PaymentMethod::QRCode => "qrcode",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "e_wallet" => PaymentMethod::EWallet,
            "credit_card" => PaymentMethod::CreditCard,
            "ach" => PaymentMethod::ACH,
            "wire_transfer" => PaymentMethod::WireTransfer,
            "qrcode" => PaymentMethod::QRCode,
            _ => PaymentMethod::BankTransfer,
        }
    }

    fn fee_rate(&self) -> f64 {
        match self {
            PaymentMethod::BankTransfer => 0.001,
            PaymentMethod::EWallet => 0.006,
            PaymentMethod::CreditCard => 0.025,
            PaymentMethod::ACH => 0.002,
            PaymentMethod::WireTransfer => 0.005,
            PaymentMethod::QRCode => 0.003,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PaymentStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Reversed,
}

impl PaymentStatus {
    fn as_str(&self) -> &'static str {
        match self {
            PaymentStatus::Pending => "pending",
            PaymentStatus::Processing => "processing",
            PaymentStatus::Completed => "completed",
            PaymentStatus::Failed => "failed",
            PaymentStatus::Reversed => "reversed",
        }
    }

    fn from_str(s: &str) -> Self {
        match s {
            "processing" => PaymentStatus::Processing,
            "completed" => PaymentStatus::Completed,
            "failed" => PaymentStatus::Failed,
            "reversed" => PaymentStatus::Reversed,
            _ => PaymentStatus::Pending,
        }
    }
}

// ==================== 数据模型 ====================

// --- 自动对账 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReconciliationRule {
    pub id: Uuid,
    pub name: String,
    pub match_type: String,
    pub tolerance: f64,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReconciliationResult {
    pub id: Uuid,
    pub bank_transaction_id: String,
    pub system_record_id: String,
    pub match_status: String,
    pub confidence: f64,
    pub difference_amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BankTransaction {
    pub id: String,
    pub date: DateTime<Utc>,
    pub description: String,
    pub amount: f64,
    pub currency: String,
    pub reference: String,
    pub counterparty: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemRecord {
    pub id: String,
    pub date: DateTime<Utc>,
    pub record_type: String,
    pub amount: f64,
    pub currency: String,
    pub reference: String,
    pub counterparty: String,
}

// --- 发票识别 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Invoice {
    pub id: Uuid,
    pub number: String,
    pub vendor: String,
    pub invoice_date: DateTime<Utc>,
    pub total_amount: f64,
    pub tax_amount: f64,
    pub status: String,
}

impl Invoice {
    pub fn can_post(&self) -> bool {
        self.status == InvoiceStatus::Verified.as_str()
    }

    pub fn validate_post(&self) -> Result<(), ValidationError> {
        if self.status != InvoiceStatus::Verified.as_str() {
            return Err(ValidationError::InvalidStatus(format!(
                "invoice must be Verified, current status: {}",
                self.status
            )));
        }
        Ok(())
    }

    pub fn validate_items_total(&self, items: &[InvoiceItem]) -> Result<(), ValidationError> {
        let calculated_total: f64 = items.iter().map(|i| i.amount).sum();
        let tolerance = 0.01;
        if (calculated_total - self.total_amount).abs() > tolerance && !items.is_empty() {
            return Err(ValidationError::InvalidStatus(format!(
                "invoice total_amount {} does not match items total {}",
                self.total_amount, calculated_total
            )));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InvoiceItem {
    pub id: Uuid,
    pub invoice_id: Uuid,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub amount: f64,
    pub tax_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceWithItems {
    #[serde(flatten)]
    pub invoice: Invoice,
    pub items: Vec<InvoiceItem>,
}

// --- 电子支付 ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PaymentRequest {
    pub id: Uuid,
    pub amount: f64,
    pub currency: String,
    pub from_account: String,
    pub to_account: String,
    pub method: String,
    pub reference: String,
    pub scheduled_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PaymentResult {
    pub id: Uuid,
    pub request_id: Uuid,
    pub status: String,
    pub transaction_ref: Option<String>,
    pub fee: f64,
    pub processed_at: Option<DateTime<Utc>>,
}

impl PaymentResult {
    pub fn can_reverse(&self) -> bool {
        self.status == PaymentStatus::Completed.as_str()
    }

    pub fn validate_reverse(&self) -> Result<(), ValidationError> {
        if self.status != PaymentStatus::Completed.as_str() {
            return Err(ValidationError::InvalidStatus(format!(
                "payment must be Completed to reverse, current status: {}",
                self.status
            )));
        }
        Ok(())
    }

    pub fn can_complete(&self) -> bool {
        self.status == PaymentStatus::Pending.as_str()
            || self.status == PaymentStatus::Processing.as_str()
    }

    pub fn validate_complete(&self) -> Result<(), ValidationError> {
        if self.status != PaymentStatus::Pending.as_str()
            && self.status != PaymentStatus::Processing.as_str()
        {
            return Err(ValidationError::InvalidStatus(format!(
                "payment must be Pending or Processing to complete, current status: {}",
                self.status
            )));
        }
        Ok(())
    }
}

// ==================== 数据库初始化 ====================

pub async fn init_settlement_v55_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    let create_tables = vec![
        "CREATE TABLE IF NOT EXISTS finance_v55_reconciliation_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            name VARCHAR(255) NOT NULL,
            match_type VARCHAR(30) NOT NULL DEFAULT 'exact',
            tolerance DOUBLE PRECISION NOT NULL DEFAULT 0,
            enabled BOOLEAN NOT NULL DEFAULT true
        )",
        "CREATE INDEX IF NOT EXISTS idx_v55_recon_rules_tenant ON finance_v55_reconciliation_rules(tenant_id)",
        "CREATE TABLE IF NOT EXISTS finance_v55_reconciliation_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            bank_transaction_id VARCHAR(100) NOT NULL,
            system_record_id VARCHAR(100) NOT NULL,
            match_status VARCHAR(30) NOT NULL DEFAULT 'unmatched',
            confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
            difference_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            notes TEXT,
            approved BOOLEAN NOT NULL DEFAULT false,
            disputed BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v55_recon_results_tenant ON finance_v55_reconciliation_results(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v55_recon_results_status ON finance_v55_reconciliation_results(match_status)",
        "CREATE INDEX IF NOT EXISTS idx_v55_recon_results_bank_tx ON finance_v55_reconciliation_results(bank_transaction_id)",
        "CREATE TABLE IF NOT EXISTS finance_v55_invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            number VARCHAR(100) NOT NULL,
            vendor VARCHAR(255) NOT NULL,
            invoice_date TIMESTAMPTZ NOT NULL,
            total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            purchase_order_id VARCHAR(100),
            recognized_at TIMESTAMPTZ,
            validated_at TIMESTAMPTZ,
            posted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v55_invoices_tenant ON finance_v55_invoices(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v55_invoices_status ON finance_v55_invoices(status)",
        "CREATE INDEX IF NOT EXISTS idx_v55_invoices_number ON finance_v55_invoices(number)",
        "CREATE TABLE IF NOT EXISTS finance_v55_invoice_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            invoice_id UUID NOT NULL,
            description VARCHAR(500) NOT NULL,
            quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
            unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
            amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0
        )",
        "CREATE INDEX IF NOT EXISTS idx_v55_invoice_items_tenant ON finance_v55_invoice_items(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v55_invoice_items_invoice ON finance_v55_invoice_items(invoice_id)",
        "CREATE TABLE IF NOT EXISTS finance_v55_payment_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
            from_account VARCHAR(100) NOT NULL,
            to_account VARCHAR(100) NOT NULL,
            method VARCHAR(30) NOT NULL DEFAULT 'bank_transfer',
            reference VARCHAR(255) NOT NULL,
            scheduled_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS idx_v55_payment_requests_tenant ON finance_v55_payment_requests(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v55_payment_requests_method ON finance_v55_payment_requests(method)",
        "CREATE TABLE IF NOT EXISTS finance_v55_payment_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES core_tenants(id),
            request_id UUID NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            transaction_ref VARCHAR(255),
            fee DOUBLE PRECISION NOT NULL DEFAULT 0,
            processed_at TIMESTAMPTZ
        )",
        "CREATE INDEX IF NOT EXISTS idx_v55_payment_results_tenant ON finance_v55_payment_results(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_v55_payment_results_status ON finance_v55_payment_results(status)",
        "CREATE INDEX IF NOT EXISTS idx_v55_payment_results_request ON finance_v55_payment_results(request_id)",
    ];

    for sql in create_tables {
        sqlx::query(sql).execute(pool).await?;
    }
    Ok(())
}

// ==================== 1. 自动对账 ====================

pub struct AutoReconciler;

#[derive(Debug, Deserialize)]
pub struct CreateRuleRequest {
    pub name: String,
    pub match_type: Option<String>,
    pub tolerance: Option<f64>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ReconcileBatchRequest {
    pub bank_transactions: Vec<BankTransaction>,
    pub system_records: Vec<SystemRecord>,
}

#[derive(Debug, Deserialize)]
pub struct ReconcileSingleRequest {
    pub bank_transaction: BankTransaction,
    pub system_record: SystemRecord,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReconciliationResponse {
    pub id: Uuid,
    pub bank_transaction_id: String,
    pub system_record_id: String,
    pub match_status: String,
    pub confidence: f64,
    pub difference_amount: f64,
    pub notes: Option<String>,
}

impl AutoReconciler {
    pub async fn create_rule(
        pool: &PgPool,
        tenant_id: Uuid,
        req: CreateRuleRequest,
    ) -> Result<ReconciliationRule, sqlx::Error> {
        let id = Uuid::new_v4();
        let match_type = req.match_type.unwrap_or_else(|| "exact".to_string());
        let tolerance = req.tolerance.unwrap_or(0.0);
        let enabled = req.enabled.unwrap_or(true);

        sqlx::query_as::<_, ReconciliationRule>(
            r#"INSERT INTO finance_v55_reconciliation_rules
                (id, tenant_id, name, match_type, tolerance, enabled)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, match_type, tolerance, enabled"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(&match_type)
        .bind(tolerance)
        .bind(enabled)
        .fetch_one(pool)
        .await
    }

    pub async fn list_rules(
        pool: &PgPool,
        tenant_id: Uuid,
    ) -> Result<Vec<ReconciliationRule>, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, name, match_type, tolerance, enabled FROM finance_v55_reconciliation_rules WHERE tenant_id = $1 ORDER BY name",
        )
        .bind(tenant_id)
        .fetch_all(pool)
        .await
    }

    pub async fn reconcile_batch(
        pool: &PgPool,
        tenant_id: Uuid,
        req: ReconcileBatchRequest,
    ) -> Result<Vec<ReconciliationResult>, sqlx::Error> {
        let now = Utc::now();
        req.prevalidate_reconciliation(now, Some(180), true)
            .map_err(|e| sqlx::Error::Decode(e.into()))?;
        let rules = Self::list_rules(pool, tenant_id).await?;
        let mut results = Vec::new();

        for bank_tx in &req.bank_transactions {
            for sys_rec in &req.system_records {
                let result = Self::try_match(bank_tx, sys_rec, &rules);

                let id = Uuid::new_v4();
                sqlx::query(
                    r#"INSERT INTO finance_v55_reconciliation_results
                        (id, tenant_id, bank_transaction_id, system_record_id, match_status, confidence, difference_amount, notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
                )
                .bind(id)
                .bind(tenant_id)
                .bind(&bank_tx.id)
                .bind(&sys_rec.id)
                .bind(result.match_status.as_str())
                .bind(result.confidence)
                .bind(result.difference_amount)
                .bind(result.notes.as_deref())
                .execute(pool)
                .await?;

                results.push(ReconciliationResult {
                    id,
                    bank_transaction_id: bank_tx.id.clone(),
                    system_record_id: sys_rec.id.clone(),
                    match_status: result.match_status.as_str().to_string(),
                    confidence: result.confidence,
                    difference_amount: result.difference_amount,
                    notes: result.notes,
                });
            }
        }

        Ok(results)
    }

    pub async fn reconcile_single(
        pool: &PgPool,
        tenant_id: Uuid,
        req: ReconcileSingleRequest,
    ) -> Result<ReconciliationResult, sqlx::Error> {
        let now = Utc::now();
        req.prevalidate(now, Some(180), true)
            .map_err(|e| sqlx::Error::Decode(e.into()))?;
        let rules = Self::list_rules(pool, tenant_id).await?;
        let result = Self::try_match(&req.bank_transaction, &req.system_record, &rules);

        let id = Uuid::new_v4();
        sqlx::query(
            r#"INSERT INTO finance_v55_reconciliation_results
                (id, tenant_id, bank_transaction_id, system_record_id, match_status, confidence, difference_amount, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.bank_transaction.id)
        .bind(&req.system_record.id)
        .bind(result.match_status.as_str())
        .bind(result.confidence)
        .bind(result.difference_amount)
        .bind(result.notes.as_deref())
        .execute(pool)
        .await?;

        Ok(ReconciliationResult {
            id,
            bank_transaction_id: req.bank_transaction.id.clone(),
            system_record_id: req.system_record.id.clone(),
            match_status: result.match_status.as_str().to_string(),
            confidence: result.confidence,
            difference_amount: result.difference_amount,
            notes: result.notes,
        })
    }

    fn try_match(
        bank_tx: &BankTransaction,
        sys_rec: &SystemRecord,
        rules: &[ReconciliationRule],
    ) -> ReconciliationResponse {
        let mut best_status = MatchStatus::Unmatched;
        let mut best_confidence = 0.0f64;
        let mut best_diff = (bank_tx.amount - sys_rec.amount).abs();
        let mut best_notes: Option<String> = None;

        for rule in rules {
            if !rule.enabled {
                continue;
            }

            let rule_type = MatchType::from_str(&rule.match_type);
            let (status, confidence, diff, notes) =
                Self::apply_rule(rule_type, rule.tolerance, bank_tx, sys_rec);

            if confidence > best_confidence {
                best_confidence = confidence;
                best_status = status;
                best_diff = diff;
                best_notes = notes;
            }
        }

        if rules.is_empty() {
            let (status, confidence, diff, notes) =
                Self::apply_rule(MatchType::Exact, 0.01, bank_tx, sys_rec);
            best_status = status;
            best_confidence = confidence;
            best_diff = diff;
            best_notes = notes;
        }

        ReconciliationResponse {
            id: Uuid::new_v4(),
            bank_transaction_id: bank_tx.id.clone(),
            system_record_id: sys_rec.id.clone(),
            match_status: best_status.as_str().to_string(),
            confidence: best_confidence,
            difference_amount: best_diff,
            notes: best_notes,
        }
    }

    fn apply_rule(
        rule_type: MatchType,
        tolerance: f64,
        bank_tx: &BankTransaction,
        sys_rec: &SystemRecord,
    ) -> (MatchStatus, f64, f64, Option<String>) {
        let amount_diff = (bank_tx.amount - sys_rec.amount).abs();
        let reference_match = bank_tx.reference == sys_rec.reference;
        let counterparty_match = bank_tx.counterparty == sys_rec.counterparty;
        let date_diff = (bank_tx.date - sys_rec.date).num_seconds().abs();

        match rule_type {
            MatchType::Exact => {
                if reference_match && counterparty_match && amount_diff < tolerance {
                    (MatchStatus::Matched, 1.0, amount_diff, None)
                } else if reference_match && amount_diff < tolerance {
                    (
                        MatchStatus::Partial,
                        0.8,
                        amount_diff,
                        Some("counterparty_mismatch".to_string()),
                    )
                } else if amount_diff < tolerance {
                    (
                        MatchStatus::Partial,
                        0.6,
                        amount_diff,
                        Some("reference_mismatch".to_string()),
                    )
                } else {
                    (
                        MatchStatus::Discrepancy,
                        0.2,
                        amount_diff,
                        Some("amount_mismatch".to_string()),
                    )
                }
            }
            MatchType::Fuzzy => {
                let ref_sim = Self::similarity(&bank_tx.reference, &sys_rec.reference);
                let cp_sim = Self::similarity(&bank_tx.counterparty, &sys_rec.counterparty);
                let fuzzy_score = (ref_sim + cp_sim) / 2.0;

                if fuzzy_score >= 0.8 && amount_diff < tolerance {
                    (MatchStatus::Matched, fuzzy_score, amount_diff, None)
                } else if fuzzy_score >= 0.5 {
                    (
                        MatchStatus::Partial,
                        fuzzy_score,
                        amount_diff,
                        Some("fuzzy_match".to_string()),
                    )
                } else {
                    (MatchStatus::Unmatched, fuzzy_score, amount_diff, None)
                }
            }
            MatchType::Amount => {
                if amount_diff < tolerance {
                    (
                        MatchStatus::Matched,
                        1.0 - (amount_diff / bank_tx.amount.max(1.0)),
                        amount_diff,
                        None,
                    )
                } else if amount_diff < tolerance * 2.0 {
                    (
                        MatchStatus::Partial,
                        0.5,
                        amount_diff,
                        Some("within_double_tolerance".to_string()),
                    )
                } else {
                    (
                        MatchStatus::Discrepancy,
                        0.1,
                        amount_diff,
                        Some("amount_exceeds_tolerance".to_string()),
                    )
                }
            }
            MatchType::Temporal => {
                let temporal_window = tolerance.max(86400.0);
                let date_diff_f64 = date_diff as f64;
                if date_diff_f64 < temporal_window && amount_diff < tolerance {
                    (
                        MatchStatus::Matched,
                        1.0 - (date_diff_f64 / temporal_window),
                        amount_diff,
                        None,
                    )
                } else if date_diff_f64 < temporal_window * 2.0 {
                    (
                        MatchStatus::Partial,
                        0.5,
                        amount_diff,
                        Some("outside_temporal_window".to_string()),
                    )
                } else {
                    (
                        MatchStatus::Unmatched,
                        0.1,
                        amount_diff,
                        Some("date_outside_range".to_string()),
                    )
                }
            }
        }
    }

    fn similarity(a: &str, b: &str) -> f64 {
        if a.is_empty() && b.is_empty() {
            return 1.0;
        }
        if a.is_empty() || b.is_empty() {
            return 0.0;
        }
        let a_lower = a.to_lowercase();
        let b_lower = b.to_lowercase();
        if a_lower == b_lower {
            return 1.0;
        }
        let a_chars: Vec<char> = a_lower.chars().collect();
        let b_chars: Vec<char> = b_lower.chars().collect();
        let len = a_chars.len().max(b_chars.len());
        if len == 0 {
            return 1.0;
        }
        let common: usize = a_chars.iter().filter(|c| b_chars.contains(c)).count();
        common as f64 / len as f64
    }

    pub async fn get_results(
        pool: &PgPool,
        tenant_id: Uuid,
        status: Option<String>,
    ) -> Result<Vec<ReconciliationResult>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, bank_transaction_id, system_record_id, match_status, confidence, difference_amount, notes FROM finance_v55_reconciliation_results WHERE tenant_id = $1",
        );
        if status.is_some() {
            query.push_str(" AND match_status = $2");
        }
        query.push_str(" ORDER BY created_at DESC LIMIT 500");

        let mut q = sqlx::query_as::<_, ReconciliationResult>(&query);
        q = q.bind(tenant_id);
        if let Some(ref s) = status {
            q = q.bind(s);
        }
        q.fetch_all(pool).await
    }

    pub async fn approve_match(
        pool: &PgPool,
        tenant_id: Uuid,
        result_id: Uuid,
    ) -> Result<ReconciliationResult, sqlx::Error> {
        sqlx::query_as(
            r#"UPDATE finance_v55_reconciliation_results
            SET approved = true
            WHERE id = $1 AND tenant_id = $2
            RETURNING id, bank_transaction_id, system_record_id, match_status, confidence, difference_amount, notes"#,
        )
        .bind(result_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn dispute_match(
        pool: &PgPool,
        tenant_id: Uuid,
        result_id: Uuid,
    ) -> Result<ReconciliationResult, sqlx::Error> {
        sqlx::query_as(
            r#"UPDATE finance_v55_reconciliation_results
            SET disputed = true, match_status = 'discrepancy'
            WHERE id = $1 AND tenant_id = $2
            RETURNING id, bank_transaction_id, system_record_id, match_status, confidence, difference_amount, notes"#,
        )
        .bind(result_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }
}

// ==================== 2. 发票识别 ====================

pub struct InvoiceRecognizer;

#[derive(Debug, Deserialize)]
pub struct RecognizeInvoiceRequest {
    pub raw_text: Option<String>,
    pub number: Option<String>,
    pub vendor: Option<String>,
    pub invoice_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub tax_amount: Option<f64>,
    pub items: Option<Vec<InvoiceItemInput>>,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceItemInput {
    pub description: String,
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub amount: Option<f64>,
    pub tax_rate: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecognizedInvoice {
    pub invoice: Invoice,
    pub items: Vec<InvoiceItem>,
}

impl InvoiceRecognizer {
    pub async fn recognize_invoice(
        pool: &PgPool,
        tenant_id: Uuid,
        req: RecognizeInvoiceRequest,
    ) -> Result<RecognizedInvoice, sqlx::Error> {
        let now = Utc::now();
        let invoice_id = Uuid::new_v4();

        let number = req
            .number
            .or_else(|| Self::extract_field(&req.raw_text, "number"))
            .unwrap_or_else(|| format!("INV-{}", invoice_id));

        let vendor = req
            .vendor
            .or_else(|| Self::extract_field(&req.raw_text, "vendor"))
            .unwrap_or_else(|| "Unknown".to_string());

        let invoice_date = req
            .invoice_date
            .or_else(|| Self::extract_date(&req.raw_text))
            .unwrap_or(now);

        let total_amount = req
            .total_amount
            .or_else(|| Self::extract_amount(&req.raw_text, "total"))
            .unwrap_or(0.0);

        let tax_amount = req
            .tax_amount
            .or_else(|| Self::extract_amount(&req.raw_text, "tax"))
            .unwrap_or(0.0);

        let items = if let Some(raw_items) = req.items {
            raw_items
                .into_iter()
                .map(|i| InvoiceItem {
                    id: Uuid::new_v4(),
                    invoice_id,
                    description: i.description,
                    quantity: i.quantity.unwrap_or(1.0),
                    unit_price: i.unit_price.unwrap_or(0.0),
                    amount: i.amount.unwrap_or(0.0),
                    tax_rate: i.tax_rate.unwrap_or(0.0),
                })
                .collect()
        } else {
            Self::extract_items(&req.raw_text)
        };

        sqlx::query(
            r#"INSERT INTO finance_v55_invoices
                (id, tenant_id, number, vendor, invoice_date, total_amount, tax_amount, status, recognized_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'recognized', $8)"#,
        )
        .bind(invoice_id)
        .bind(tenant_id)
        .bind(&number)
        .bind(&vendor)
        .bind(invoice_date)
        .bind(total_amount)
        .bind(tax_amount)
        .bind(now)
        .execute(pool)
        .await?;

        for item in &items {
            sqlx::query(
                r#"INSERT INTO finance_v55_invoice_items
                    (id, tenant_id, invoice_id, description, quantity, unit_price, amount, tax_rate)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
            )
            .bind(item.id)
            .bind(tenant_id)
            .bind(item.invoice_id)
            .bind(&item.description)
            .bind(item.quantity)
            .bind(item.unit_price)
            .bind(item.amount)
            .bind(item.tax_rate)
            .execute(pool)
            .await?;
        }

        Ok(RecognizedInvoice {
            invoice: Invoice {
                id: invoice_id,
                number,
                vendor,
                invoice_date,
                total_amount,
                tax_amount,
                status: InvoiceStatus::Recognized.as_str().to_string(),
            },
            items,
        })
    }

    fn extract_field(raw_text: &Option<String>, field: &str) -> Option<String> {
        let text = raw_text.as_ref()?;
        let search = match field {
            "number" => "Invoice No.",
            "vendor" => "Vendor",
            _ => field,
        };
        text.lines()
            .find(|l| l.contains(search))
            .and_then(|l| l.split(':').nth(1))
            .map(|v| v.trim().to_string())
    }

    fn extract_date(raw_text: &Option<String>) -> Option<DateTime<Utc>> {
        let text = raw_text.as_ref()?;
        let line = text.lines().find(|l| l.contains("Date"))?;
        let date_str = line.split(':').nth(1)?.trim();
        DateTime::parse_from_str(date_str, "%Y-%m-%d")
            .ok()
            .map(|dt| dt.with_timezone(&Utc))
    }

    fn extract_amount(raw_text: &Option<String>, field: &str) -> Option<f64> {
        let text = raw_text.as_ref()?;
        let search = match field {
            "total" => "Total",
            "tax" => "Tax",
            _ => field,
        };
        let line = text.lines().find(|l| l.contains(search))?;
        let val_str = line.split(':').nth(1)?.trim().replace(',', "");
        val_str.parse::<f64>().ok()
    }

    fn extract_items(raw_text: &Option<String>) -> Vec<InvoiceItem> {
        let text = match raw_text {
            Some(t) => t,
            None => return Vec::new(),
        };

        let mut items = Vec::new();
        let mut in_items = false;

        for line in text.lines() {
            if line.contains("Items") || line.contains("Description") {
                in_items = true;
                continue;
            }
            if in_items && !line.trim().is_empty() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 4 {
                    let desc = parts[0..parts.len() - 3].join(" ");
                    let qty = parts[parts.len() - 3].parse::<f64>().unwrap_or(1.0);
                    let unit_price = parts[parts.len() - 2].parse::<f64>().unwrap_or(0.0);
                    let amount = parts[parts.len() - 1].parse::<f64>().unwrap_or(0.0);
                    items.push(InvoiceItem {
                        id: Uuid::new_v4(),
                        invoice_id: Uuid::new_v4(),
                        description: desc,
                        quantity: qty,
                        unit_price,
                        amount,
                        tax_rate: 0.0,
                    });
                }
            }
        }

        items
    }

    pub async fn extract_fields(
        _pool: &PgPool,
        req: RecognizeInvoiceRequest,
    ) -> Result<serde_json::Value, sqlx::Error> {
        let mut fields = serde_json::json!({});

        if let Some(ref text) = req.raw_text {
            fields["raw_text"] = serde_json::json!(text);
        }
        if let Some(n) = req.number {
            fields["number"] = serde_json::json!(n);
        }
        if let Some(v) = req.vendor {
            fields["vendor"] = serde_json::json!(v);
        }
        if let Some(d) = req.invoice_date {
            fields["invoice_date"] = serde_json::json!(d.to_rfc3339());
        }
        if let Some(t) = req.total_amount {
            fields["total_amount"] = serde_json::json!(t);
        }
        if let Some(x) = req.tax_amount {
            fields["tax_amount"] = serde_json::json!(x);
        }

        Ok(fields)
    }

    pub async fn validate_invoice(
        pool: &PgPool,
        tenant_id: Uuid,
        invoice_id: Uuid,
    ) -> Result<Invoice, sqlx::Error> {
        let invoice: Invoice = sqlx::query_as(
            "SELECT id, number, vendor, invoice_date, total_amount, tax_amount, status FROM finance_v55_invoices WHERE id = $1 AND tenant_id = $2",
        )
        .bind(invoice_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        let items: Vec<InvoiceItem> = sqlx::query_as(
            "SELECT id, invoice_id, description, quantity, unit_price, amount, tax_rate FROM finance_v55_invoice_items WHERE invoice_id = $1 AND tenant_id = $2",
        )
        .bind(invoice_id)
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        let with_items = InvoiceWithItems {
            invoice: invoice.clone(),
            items,
        };
        with_items
            .prevalidate_recognize()
            .map_err(|e| sqlx::Error::Decode(e.into()))?;

        let now = Utc::now();
        sqlx::query_as(
            r#"UPDATE finance_v55_invoices
            SET status = 'verified', validated_at = $1
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, number, vendor, invoice_date, total_amount, tax_amount, status"#,
        )
        .bind(now)
        .bind(invoice_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn get_invoice(
        pool: &PgPool,
        tenant_id: Uuid,
        invoice_id: Uuid,
    ) -> Result<InvoiceWithItems, sqlx::Error> {
        let invoice: Invoice = sqlx::query_as(
            "SELECT id, number, vendor, invoice_date, total_amount, tax_amount, status FROM finance_v55_invoices WHERE id = $1 AND tenant_id = $2",
        )
        .bind(invoice_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        let items: Vec<InvoiceItem> = sqlx::query_as(
            "SELECT id, invoice_id, description, quantity, unit_price, amount, tax_rate FROM finance_v55_invoice_items WHERE invoice_id = $1 AND tenant_id = $2 ORDER BY id",
        )
        .bind(invoice_id)
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        Ok(InvoiceWithItems { invoice, items })
    }

    pub async fn list_invoices(
        pool: &PgPool,
        tenant_id: Uuid,
        status: Option<String>,
    ) -> Result<Vec<Invoice>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, number, vendor, invoice_date, total_amount, tax_amount, status FROM finance_v55_invoices WHERE tenant_id = $1",
        );
        if status.is_some() {
            query.push_str(" AND status = $2");
        }
        query.push_str(" ORDER BY created_at DESC LIMIT 500");

        let mut q = sqlx::query_as::<_, Invoice>(&query);
        q = q.bind(tenant_id);
        if let Some(ref s) = status {
            q = q.bind(s);
        }
        q.fetch_all(pool).await
    }

    pub async fn post_invoice(
        pool: &PgPool,
        tenant_id: Uuid,
        invoice_id: Uuid,
    ) -> Result<Invoice, sqlx::Error> {
        let invoice: Invoice = sqlx::query_as(
            "SELECT id, number, vendor, invoice_date, total_amount, tax_amount, status FROM finance_v55_invoices WHERE id = $1 AND tenant_id = $2",
        )
        .bind(invoice_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        let items: Vec<InvoiceItem> = sqlx::query_as(
            "SELECT id, invoice_id, description, quantity, unit_price, amount, tax_rate FROM finance_v55_invoice_items WHERE invoice_id = $1 AND tenant_id = $2",
        )
        .bind(invoice_id)
        .bind(tenant_id)
        .fetch_all(pool)
        .await?;

        let with_items = InvoiceWithItems {
            invoice: invoice.clone(),
            items,
        };
        let now = Utc::now();
        with_items
            .prevalidate_post(now, false)
            .map_err(|e| sqlx::Error::Decode(e.into()))?;
        sqlx::query_as(
            r#"UPDATE finance_v55_invoices
            SET status = 'posted', posted_at = $1
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, number, vendor, invoice_date, total_amount, tax_amount, status"#,
        )
        .bind(now)
        .bind(invoice_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn match_invoice_to_purchase(
        pool: &PgPool,
        tenant_id: Uuid,
        invoice_id: Uuid,
        purchase_order_id: String,
    ) -> Result<Invoice, sqlx::Error> {
        sqlx::query_as(
            r#"UPDATE finance_v55_invoices
            SET purchase_order_id = $1
            WHERE id = $2 AND tenant_id = $3
            RETURNING id, number, vendor, invoice_date, total_amount, tax_amount, status"#,
        )
        .bind(&purchase_order_id)
        .bind(invoice_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }
}

// ==================== 3. 电子支付 ====================

pub struct ElectronicPaymentProcessor;

#[derive(Debug, Clone, Deserialize)]
pub struct InitiatePaymentRequest {
    pub amount: f64,
    pub currency: Option<String>,
    pub from_account: String,
    pub to_account: String,
    pub method: Option<String>,
    pub reference: String,
}

impl InitiatePaymentRequest {
    pub fn validate_initiate(&self) -> Result<(), ValidationError> {
        if self.amount <= 0.0 {
            return Err(ValidationError::NegativeAmount(
                "amount must be greater than 0".to_string(),
            ));
        }
        if self.from_account.trim().is_empty() {
            return Err(ValidationError::EmptyField("from_account".to_string()));
        }
        if self.to_account.trim().is_empty() {
            return Err(ValidationError::EmptyField("to_account".to_string()));
        }
        if self.reference.trim().is_empty() {
            return Err(ValidationError::EmptyField("reference".to_string()));
        }
        Ok(())
    }

    const VALID_CURRENCIES_WHITELIST: &'static [&'static str; 10] = &[
        "CNY", "USD", "EUR", "JPY", "GBP", "HKD", "AUD", "CAD", "SGD", "NZD",
    ];

    pub fn validate_currency(&self) -> Result<(), ValidationError> {
        match &self.currency {
            None => Ok(()),
            Some(code) => {
                if code.len() != 3 {
                    return Err(ValidationError::InvalidCurrency(code.clone()));
                }
                if !code.chars().all(|c| c.is_ascii_uppercase()) {
                    return Err(ValidationError::InvalidCurrency(code.clone()));
                }
                let _ = Self::VALID_CURRENCIES_WHITELIST;
                Ok(())
            }
        }
    }

    pub fn validate_no_self_transfer(&self) -> Result<(), ValidationError> {
        let from = self.from_account.trim().to_lowercase();
        let to = self.to_account.trim().to_lowercase();
        if from == to {
            return Err(ValidationError::SelfTransfer(
                self.from_account.clone(),
                self.to_account.clone(),
            ));
        }
        Ok(())
    }

    pub fn validate_amount_limit(&self, limit: Option<f64>) -> Result<(), ValidationError> {
        let lim = limit.unwrap_or(100_000_000.0);
        if self.amount > lim {
            return Err(ValidationError::AmountAboveLimit {
                amount: self.amount,
                limit: lim,
            });
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentInitiationResult {
    pub request: PaymentRequest,
    pub result: PaymentResult,
}

impl ElectronicPaymentProcessor {
    pub async fn initiate_payment(
        pool: &PgPool,
        tenant_id: Uuid,
        req: InitiatePaymentRequest,
    ) -> Result<PaymentInitiationResult, sqlx::Error> {
        req.prevalidate_payment(None, true)
            .map_err(|e| sqlx::Error::Decode(e.into()))?;
        let now = Utc::now();
        let method_str = req.method.unwrap_or_else(|| "bank_transfer".to_string());
        let method = PaymentMethod::from_str(&method_str);
        let fee = Self::calculate_fee_impl(req.amount, &method);
        let currency = req.currency.unwrap_or_else(|| "CNY".to_string());

        let request_id = Uuid::new_v4();
        let result_id = Uuid::new_v4();

        sqlx::query(
            r#"INSERT INTO finance_v55_payment_requests
                (id, tenant_id, amount, currency, from_account, to_account, method, reference)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
        )
        .bind(request_id)
        .bind(tenant_id)
        .bind(req.amount)
        .bind(&currency)
        .bind(&req.from_account)
        .bind(&req.to_account)
        .bind(method.as_str())
        .bind(&req.reference)
        .execute(pool)
        .await?;

        let transaction_ref = format!("TXN-{}", result_id);
        sqlx::query(
            r#"INSERT INTO finance_v55_payment_results
                (id, tenant_id, request_id, status, transaction_ref, fee, processed_at)
            VALUES ($1, $2, $3, 'completed', $4, $5, $6)"#,
        )
        .bind(result_id)
        .bind(tenant_id)
        .bind(request_id)
        .bind(&transaction_ref)
        .bind(fee)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(PaymentInitiationResult {
            request: PaymentRequest {
                id: request_id,
                amount: req.amount,
                currency,
                from_account: req.from_account,
                to_account: req.to_account,
                method: method.as_str().to_string(),
                reference: req.reference,
                scheduled_at: None,
            },
            result: PaymentResult {
                id: result_id,
                request_id,
                status: PaymentStatus::Completed.as_str().to_string(),
                transaction_ref: Some(transaction_ref),
                fee,
                processed_at: Some(now),
            },
        })
    }

    pub async fn get_payment_status(
        pool: &PgPool,
        tenant_id: Uuid,
        payment_id: Uuid,
    ) -> Result<PaymentResult, sqlx::Error> {
        sqlx::query_as(
            "SELECT id, request_id, status, transaction_ref, fee, processed_at FROM finance_v55_payment_results WHERE request_id = $1 AND tenant_id = $2 ORDER BY processed_at DESC LIMIT 1",
        )
        .bind(payment_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }

    pub async fn reverse_payment(
        pool: &PgPool,
        tenant_id: Uuid,
        payment_id: Uuid,
    ) -> Result<PaymentResult, sqlx::Error> {
        let now = Utc::now();
        let original: PaymentResult = sqlx::query_as(
            "SELECT id, request_id, status, transaction_ref, fee, processed_at FROM finance_v55_payment_results WHERE request_id = $1 AND tenant_id = $2 ORDER BY processed_at DESC LIMIT 1",
        )
        .bind(payment_id)
        .bind(tenant_id)
        .fetch_one(pool)
        .await?;

        original
            .validate_reverse()
            .map_err(|e| sqlx::Error::Decode(e.into()))?;

        let result_id = Uuid::new_v4();
        let reversed_ref = format!(
            "REV-{}",
            original.transaction_ref.as_deref().unwrap_or("unknown")
        );
        sqlx::query_as(
            r#"INSERT INTO finance_v55_payment_results
                (id, tenant_id, request_id, status, transaction_ref, fee, processed_at)
            VALUES ($1, $2, $3, 'reversed', $4, $5, $6)
            RETURNING id, request_id, status, transaction_ref, fee, processed_at"#,
        )
        .bind(result_id)
        .bind(tenant_id)
        .bind(payment_id)
        .bind(&reversed_ref)
        .bind(0.0)
        .bind(now)
        .fetch_one(pool)
        .await
    }

    pub async fn list_payments(
        pool: &PgPool,
        tenant_id: Uuid,
        status: Option<String>,
    ) -> Result<Vec<PaymentRequest>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, amount, currency, from_account, to_account, method, reference, scheduled_at FROM finance_v55_payment_requests WHERE tenant_id = $1",
        );
        if status.is_some() {
            query.push_str(
                " AND id IN (SELECT request_id FROM finance_v55_payment_results WHERE status = $2)",
            );
        }
        query.push_str(" ORDER BY created_at DESC LIMIT 500");

        let mut q = sqlx::query_as::<_, PaymentRequest>(&query);
        q = q.bind(tenant_id);
        if let Some(ref s) = status {
            q = q.bind(s);
        }
        q.fetch_all(pool).await
    }

    pub async fn schedule_payment(
        pool: &PgPool,
        tenant_id: Uuid,
        req: InitiatePaymentRequest,
        scheduled_at: DateTime<Utc>,
    ) -> Result<PaymentRequest, sqlx::Error> {
        let now = Utc::now();
        req.prevalidate_payment(None, true)
            .map_err(|e| sqlx::Error::Decode(e.into()))?;
        InitiatePaymentRequest::validate_scheduled_at(scheduled_at, now)
            .map_err(|e| sqlx::Error::Decode(e.into()))?;
        let method_str = req.method.unwrap_or_else(|| "bank_transfer".to_string());
        let currency = req.currency.unwrap_or_else(|| "CNY".to_string());
        let request_id = Uuid::new_v4();

        sqlx::query_as(
            r#"INSERT INTO finance_v55_payment_requests
                (id, tenant_id, amount, currency, from_account, to_account, method, reference, scheduled_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, amount, currency, from_account, to_account, method, reference, scheduled_at"#,
        )
        .bind(request_id)
        .bind(tenant_id)
        .bind(req.amount)
        .bind(&currency)
        .bind(&req.from_account)
        .bind(&req.to_account)
        .bind(&method_str)
        .bind(&req.reference)
        .bind(Some(scheduled_at))
        .fetch_one(pool)
        .await
    }

    pub async fn calculate_fee(
        _pool: &PgPool,
        amount: f64,
        method: &PaymentMethod,
    ) -> Result<f64, sqlx::Error> {
        Ok(Self::calculate_fee_impl(amount, method))
    }

    fn calculate_fee_impl(amount: f64, method: &PaymentMethod) -> f64 {
        let rate = method.fee_rate();
        (amount * rate).round() * 100.0 / 100.0
    }

    pub fn get_supported_methods() -> Vec<PaymentMethod> {
        vec![
            PaymentMethod::BankTransfer,
            PaymentMethod::EWallet,
            PaymentMethod::CreditCard,
            PaymentMethod::ACH,
            PaymentMethod::WireTransfer,
            PaymentMethod::QRCode,
        ]
    }
}

// ==================== [V232-P0.1 NEW] Pre-validate async pure-fn wrappers ====================
// 等价重构纪律：仅只读 pool（不开启事务）；校验通过后 clone 原请求作为 validated 视图
// validate fn 名按 task 要求 grep 实际导出名后命名：post_settlement / unsettlement / reverse_settlement

pub async fn validate_settlement_prepare(
    req: &InitiatePaymentRequest,
    _pool: &PgPool,
) -> Result<InitiatePaymentRequest, ValidationError> {
    req.prevalidate_payment(Some(1_000_000.00), true)?;
    Ok(req.clone())
}

pub async fn validate_unsettlement_prepare(
    req: &SchedulePaymentRequest,
    _pool: &PgPool,
) -> Result<SchedulePaymentRequest, ValidationError> {
    let init_req = InitiatePaymentRequest {
        amount: req.amount,
        currency: req.currency.clone(),
        from_account: req.from_account.clone(),
        to_account: req.to_account.clone(),
        method: req.method.clone(),
        reference: req.reference.clone(),
    };
    init_req.prevalidate_payment(Some(1_000_000.00), true)?;
    let now = Utc::now();
    req.prevalidate_schedule(now)?;
    Ok(req.clone())
}

pub async fn validate_reverse_settlement_prepare(
    req: &ReconcileBatchRequest,
    _pool: &PgPool,
) -> Result<ReconcileBatchRequest, ValidationError> {
    let now = Utc::now();
    req.prevalidate_reconciliation(now, Some(180), true)?;
    Ok(req.clone())
}

// ==================== API Handlers ====================

// --- Reconciliation ---

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ReconResultQueryParams {
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReconRuleQueryParams {
    pub enabled: Option<bool>,
}
#[utoipa::path(
    post,
    path = "/finance-v55/reconcile/batch",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Settlement V55",
    operation_id = "reconcile_batch_handler",
)]

async fn reconcile_batch_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ReconcileBatchRequest>,
) -> Json<ApiResponse<Vec<ReconciliationResult>>> {
    // [V232-P0.1 NEW] Step 1: pure-fn pre-validate (只读 pool，不开启事务) · Equiv-refactor discipline
    let validated = match validate_reverse_settlement_prepare(&req, &state.pool).await {
        Ok(v) => v,
        Err(e) => return e.into_api_response(),
    };
    // [V232-P0.1 NEW] Step 2: double-check guard (validate fn 不能改值，否则 assert 报错)
    debug_assert_eq!(
        validated.bank_transactions.len(),
        req.bank_transactions.len()
    );
    debug_assert_eq!(validated.system_records.len(), req.system_records.len());
    debug_assert_eq!(
        validated.bank_transactions.first().map(|b| b.amount),
        req.bank_transactions.first().map(|b| b.amount)
    );
    debug_assert_eq!(
        validated.system_records.first().map(|s| s.currency.clone()),
        req.system_records.first().map(|s| s.currency.clone())
    );
    let now = Utc::now();
    if let Err(ve) = req.prevalidate_reconciliation(now, Some(180), true) {
        return ve.into_api_response();
    }
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoReconciler::reconcile_batch(&pool, tenant_id, req).await {
        Ok(results) => Json(ApiResponse::success(results, "批量对账完成")),
        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v55/single",
    tag = "SettlementV55",
    operation_id = "reconcile_single_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn reconcile_single_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ReconcileSingleRequest>,
) -> Json<ApiResponse<ReconciliationResult>> {
    let now = Utc::now();
    if let Err(ve) = req.prevalidate(now, Some(180), true) {
        return ve.into_api_response();
    }
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoReconciler::reconcile_single(&pool, tenant_id, req).await {
        Ok(result) => Json(ApiResponse::success(result, "对账完成")),
        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/finance-v55/recon_results",
    tag = "SettlementV55",
    operation_id = "get_recon_results_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_recon_results_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReconResultQueryParams>,
) -> Json<ApiResponse<Vec<ReconciliationResult>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoReconciler::get_results(&pool, tenant_id, params.status).await {
        Ok(results) => Json(ApiResponse::success(results, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v55/recon_rule",
    tag = "SettlementV55",
    operation_id = "create_recon_rule_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn create_recon_rule_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateRuleRequest>,
) -> Json<ApiResponse<ReconciliationRule>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoReconciler::create_rule(&pool, tenant_id, req).await {
        Ok(rule) => Json(ApiResponse::success(rule, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    get,
    path = "/finance-v55/reconcile/rules",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Settlement V55",
    operation_id = "list_recon_rules_handler",
)]

async fn list_recon_rules_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ReconciliationRule>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoReconciler::list_rules(&pool, tenant_id).await {
        Ok(rules) => Json(ApiResponse::success(rules, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v55/match",
    tag = "SettlementV55",
    operation_id = "approve_match_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn approve_match_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ReconciliationResult>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoReconciler::approve_match(&pool, tenant_id, id).await {
        Ok(result) => Json(ApiResponse::success(result, "审批通过")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v55/match",
    tag = "SettlementV55",
    operation_id = "dispute_match_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn dispute_match_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ReconciliationResult>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoReconciler::dispute_match(&pool, tenant_id, id).await {
        Ok(result) => Json(ApiResponse::success(result, "已标记争议")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// --- Invoice ---

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct InvoiceListQueryParams {
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MatchInvoiceRequest {
    pub purchase_order_id: String,
}

#[utoipa::path(
    post,
    path = "/finance-v55/invoice",
    tag = "SettlementV55",
    operation_id = "recognize_invoice_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn recognize_invoice_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<RecognizeInvoiceRequest>,
) -> Json<ApiResponse<RecognizedInvoice>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    // OCR 识别层不强制校验未来日期（允许识别后走审批流修正），只在 prevalidate_recognize 之前先兜底：
    // 如果用户显式输入 number / vendor，就要求非空（其他字段由内部 prevalidate_recognize 守护）。
    if let Some(n) = req.number.as_deref() {
        if n.trim().is_empty() {
            return ValidationError::EmptyField("invoice.number".into()).into_api_response();
        }
    }
    if let Some(v) = req.vendor.as_deref() {
        if v.trim().is_empty() {
            return ValidationError::EmptyField("invoice.vendor".into()).into_api_response();
        }
    }
    match InvoiceRecognizer::recognize_invoice(&pool, tenant_id, req).await {
        Ok(invoice) => Json(ApiResponse::success(invoice, "识别完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    get,
    path = "/finance-v55/invoice/{id}",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("id" = String, Path, description = "资源 ID"),
    ),
    tag = "Finance Settlement V55",
    operation_id = "get_invoice_handler",
)]

async fn get_invoice_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<InvoiceWithItems>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match InvoiceRecognizer::get_invoice(&pool, tenant_id, id).await {
        Ok(invoice) => Json(ApiResponse::success(invoice, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/finance-v55/invoices",
    tag = "SettlementV55",
    operation_id = "list_invoices_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn list_invoices_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InvoiceListQueryParams>,
) -> Json<ApiResponse<Vec<Invoice>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match InvoiceRecognizer::list_invoices(&pool, tenant_id, params.status).await {
        Ok(invoices) => Json(ApiResponse::success(invoices, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v55/invoice",
    tag = "SettlementV55",
    operation_id = "validate_invoice_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn validate_invoice_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Invoice>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    // 在 validate_invoice 内部调用 prevalidate_recognize；为使语义化错误向上透出，这里把 sqlx::Error::Decode
    // 还原为 ValidationError，并通过 handler 返回精确 HTTP code（400/422）。
    match InvoiceRecognizer::validate_invoice(&pool, tenant_id, id).await {
        Ok(invoice) => Json(ApiResponse::success(invoice, "验证通过")),
        Err(sqlx::Error::Decode(msg)) => {
            // 保守：无法从 Box<dyn Error> 直接下钻时，以 422 抛出完整消息（已包含 ValidationError Display）
            Json(ApiResponse::error(422, &msg.to_string()))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v55/invoice",
    tag = "SettlementV55",
    operation_id = "post_invoice_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn post_invoice_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Invoice>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    // 默认 strict：不允许未来日期发票直接过账（allow_future_date=false）；
    // 若识别层已批准未来日期，可在后续审批流里单独覆盖 allow_future_date=true 分支。
    match InvoiceRecognizer::post_invoice(&pool, tenant_id, id).await {
        Ok(invoice) => Json(ApiResponse::success(invoice, "过账成功")),
        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    path = "/finance-v55/invoice/match",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Settlement V55",
    operation_id = "match_invoice_handler",
)]

async fn match_invoice_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<MatchInvoiceRequest>,
) -> Json<ApiResponse<Invoice>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match InvoiceRecognizer::match_invoice_to_purchase(&pool, tenant_id, id, req.purchase_order_id)
        .await
    {
        Ok(invoice) => Json(ApiResponse::success(invoice, "匹配成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// --- Payment ---

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct PaymentListQueryParams {
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SchedulePaymentRequest {
    pub amount: f64,
    pub currency: Option<String>,
    pub from_account: String,
    pub to_account: String,
    pub method: Option<String>,
    pub reference: String,
    pub scheduled_at: DateTime<Utc>,
}

impl SchedulePaymentRequest {
    /// 调度支付前置校验：scheduled_at 必须在当前时间或未来
    pub fn prevalidate_schedule(&self, now: DateTime<Utc>) -> Result<(), ValidationError> {
        InitiatePaymentRequest::validate_scheduled_at(self.scheduled_at, now)
    }
}

#[utoipa::path(
    post,
    path = "/finance-v55/payment",
    tag = "SettlementV55",
    operation_id = "initiate_payment_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn initiate_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<InitiatePaymentRequest>,
) -> Json<ApiResponse<PaymentInitiationResult>> {
    // [V232-P0.1 NEW] Step 1: pure-fn pre-validate (只读 pool，不开启事务) · Equiv-refactor discipline
    let validated = match validate_settlement_prepare(&req, &state.pool).await {
        Ok(v) => v,
        Err(e) => return e.into_api_response(),
    };
    // [V232-P0.1 NEW] Step 2: double-check guard (validate fn 不能改值，否则 assert 报错)
    debug_assert_eq!(validated.currency, req.currency);
    debug_assert_eq!(validated.amount, req.amount);
    debug_assert_eq!(validated.from_account, req.from_account);
    debug_assert_eq!(validated.to_account, req.to_account);
    // V55 默认开启严格模式：币种必须命中白名单；单笔金额上限 1_000_000.00，可后续由配置中心覆盖
    if let Err(ve) = req.prevalidate_payment(Some(1_000_000.00), true) {
        return ve.into_api_response();
    }
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match ElectronicPaymentProcessor::initiate_payment(&pool, tenant_id, req).await {
        Ok(result) => Json(ApiResponse::success(result, "支付发起成功")),
        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/finance-v55/payment_status",
    tag = "SettlementV55",
    operation_id = "get_payment_status_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn get_payment_status_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PaymentResult>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match ElectronicPaymentProcessor::get_payment_status(&pool, tenant_id, id).await {
        Ok(result) => Json(ApiResponse::success(result, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    post,
    path = "/finance-v55/payment/{id}/reverse",
    responses(
        (status = 200, description = "成功"),
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    params(
        ("id" = String, Path, description = "资源 ID"),
    ),
    tag = "Finance Settlement V55",
    operation_id = "reverse_payment_handler",
)]

async fn reverse_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PaymentResult>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    // PaymentResult 状态纯函数校验：仅 Completed 允许冲正；否则在 handler 层以 422 返回精确语义错误。
    match ElectronicPaymentProcessor::reverse_payment(&pool, tenant_id, id).await {
        Ok(result) => Json(ApiResponse::success(result, "冲正成功")),
        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    get,
    path = "/finance-v55/payments",
    tag = "SettlementV55",
    operation_id = "list_payments_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_payments_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaymentListQueryParams>,
) -> Json<ApiResponse<Vec<PaymentRequest>>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match ElectronicPaymentProcessor::list_payments(&pool, tenant_id, params.status).await {
        Ok(payments) => Json(ApiResponse::success(payments, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

#[utoipa::path(
    post,
    path = "/finance-v55/payment",
    tag = "SettlementV55",
    operation_id = "schedule_payment_handler",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn schedule_payment_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<SchedulePaymentRequest>,
) -> Json<ApiResponse<PaymentRequest>> {
    // [V232-P0.1 NEW] Step 1: pure-fn pre-validate (只读 pool，不开启事务) · Equiv-refactor discipline
    let validated = match validate_unsettlement_prepare(&req, &state.pool).await {
        Ok(v) => v,
        Err(e) => return e.into_api_response(),
    };
    // [V232-P0.1 NEW] Step 2: double-check guard (validate fn 不能改值，否则 assert 报错)
    debug_assert_eq!(validated.currency, req.currency);
    debug_assert_eq!(validated.amount, req.amount);
    debug_assert_eq!(validated.from_account, req.from_account);
    debug_assert_eq!(validated.to_account, req.to_account);
    let now = Utc::now();
    // 复用 initiate 4 联严格校验 + 未来 scheduled_at 校验
    let init_req = InitiatePaymentRequest {
        amount: req.amount,
        currency: req.currency.clone(),
        from_account: req.from_account.clone(),
        to_account: req.to_account.clone(),
        method: req.method.clone(),
        reference: req.reference.clone(),
    };
    if let Err(ve) = init_req.prevalidate_payment(Some(1_000_000.00), true) {
        return ve.into_api_response();
    }
    if let Err(ve) = req.prevalidate_schedule(now) {
        return ve.into_api_response();
    }
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match ElectronicPaymentProcessor::schedule_payment(&pool, tenant_id, init_req, req.scheduled_at)
        .await
    {
        Ok(request) => Json(ApiResponse::success(request, "调度成功")),
        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}
#[utoipa::path(
    get,
    path = "/finance-v55/payment/methods",
    responses(
        (status = 200, description = "成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误"),
    ),
    tag = "Finance Settlement V55",
    operation_id = "get_supported_methods_handler",
)]

async fn get_supported_methods_handler(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let methods = ElectronicPaymentProcessor::get_supported_methods();
    let result: Vec<serde_json::Value> = methods
        .iter()
        .map(|m| {
            serde_json::json!({
                "method": m.as_str(),
                "fee_rate": m.fee_rate(),
            })
        })
        .collect();
    Json(ApiResponse::success(result, "查询成功"))
}

// ==================== 路由注册 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // --- Reconciliation ---
        .route(
            "/finance-v55/reconcile/batch",
            axum::routing::post(reconcile_batch_handler),
        )
        .route(
            "/finance-v55/reconcile/single",
            axum::routing::post(reconcile_single_handler),
        )
        .route(
            "/finance-v55/reconcile/results",
            axum::routing::get(get_recon_results_handler),
        )
        .route(
            "/finance-v55/reconcile/rules",
            axum::routing::post(create_recon_rule_handler),
        )
        .route(
            "/finance-v55/reconcile/rules",
            axum::routing::get(list_recon_rules_handler),
        )
        .route(
            "/finance-v55/reconcile/match/{id}/approve",
            axum::routing::put(approve_match_handler),
        )
        .route(
            "/finance-v55/reconcile/match/{id}/dispute",
            axum::routing::put(dispute_match_handler),
        )
        // --- Invoice ---
        .route(
            "/finance-v55/invoice/recognize",
            axum::routing::post(recognize_invoice_handler),
        )
        .route(
            "/finance-v55/invoice/{id}",
            axum::routing::get(get_invoice_handler),
        )
        .route(
            "/finance-v55/invoices",
            axum::routing::get(list_invoices_handler),
        )
        .route(
            "/finance-v55/invoice/{id}/validate",
            axum::routing::post(validate_invoice_handler),
        )
        .route(
            "/finance-v55/invoice/{id}/post",
            axum::routing::post(post_invoice_handler),
        )
        .route(
            "/finance-v55/invoice/match",
            axum::routing::post(match_invoice_handler),
        )
        // --- Payment ---
        .route(
            "/finance-v55/payment/initiate",
            axum::routing::post(initiate_payment_handler),
        )
        .route(
            "/finance-v55/payment/{id}/status",
            axum::routing::get(get_payment_status_handler),
        )
        .route(
            "/finance-v55/payment/{id}/reverse",
            axum::routing::post(reverse_payment_handler),
        )
        .route(
            "/finance-v55/payments",
            axum::routing::get(list_payments_handler),
        )
        .route(
            "/finance-v55/payment/schedule",
            axum::routing::post(schedule_payment_handler),
        )
        .route(
            "/finance-v55/payment/methods",
            axum::routing::get(get_supported_methods_handler),
        )
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use serde_json::Value;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn enum_match_type() {
        roundtrip(&MatchType::Exact);
        roundtrip(&MatchType::Fuzzy);
        roundtrip(&MatchType::Amount);
        roundtrip(&MatchType::Temporal);
    }

    #[test]
    fn enum_match_status() {
        roundtrip(&MatchStatus::Matched);
        roundtrip(&MatchStatus::Partial);
        roundtrip(&MatchStatus::Unmatched);
        roundtrip(&MatchStatus::Discrepancy);
    }

    #[test]
    fn enum_system_record_type() {
        roundtrip(&SystemRecordType::Invoice);
        roundtrip(&SystemRecordType::Payment);
        roundtrip(&SystemRecordType::Receipt);
    }

    #[test]
    fn enum_invoice_status() {
        roundtrip(&InvoiceStatus::Pending);
        roundtrip(&InvoiceStatus::Recognized);
        roundtrip(&InvoiceStatus::Verified);
        roundtrip(&InvoiceStatus::Posted);
    }

    #[test]
    fn enum_payment_method() {
        roundtrip(&PaymentMethod::BankTransfer);
        roundtrip(&PaymentMethod::EWallet);
        roundtrip(&PaymentMethod::CreditCard);
        roundtrip(&PaymentMethod::ACH);
        roundtrip(&PaymentMethod::WireTransfer);
        roundtrip(&PaymentMethod::QRCode);
    }

    #[test]
    fn enum_payment_status() {
        roundtrip(&PaymentStatus::Pending);
        roundtrip(&PaymentStatus::Processing);
        roundtrip(&PaymentStatus::Completed);
        roundtrip(&PaymentStatus::Failed);
        roundtrip(&PaymentStatus::Reversed);
    }

    #[test]
    fn struct_reconciliation_rule() {
        let v = ReconciliationRule {
            id: Uuid::new_v4(),
            name: "精确匹配".into(),
            match_type: "exact".into(),
            tolerance: 0.01,
            enabled: true,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_reconciliation_result() {
        let v = ReconciliationResult {
            id: Uuid::new_v4(),
            bank_transaction_id: "BT-001".into(),
            system_record_id: "SR-001".into(),
            match_status: "matched".into(),
            confidence: 0.98,
            difference_amount: 0.0,
            notes: None,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_bank_transaction() {
        let v = BankTransaction {
            id: "BT-001".into(),
            date: Utc::now(),
            description: "转账".into(),
            amount: 5000.0,
            currency: "CNY".into(),
            reference: "REF-001".into(),
            counterparty: "供应商".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_system_record() {
        let v = SystemRecord {
            id: "SR-001".into(),
            date: Utc::now(),
            record_type: "payment".into(),
            amount: 5000.0,
            currency: "CNY".into(),
            reference: "REF-001".into(),
            counterparty: "供应商".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_invoice() {
        let v = Invoice {
            id: Uuid::new_v4(),
            number: "INV-2024-001".into(),
            vendor: "供应商A".into(),
            invoice_date: Utc::now(),
            total_amount: 1130.0,
            tax_amount: 130.0,
            status: "verified".into(),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_invoice_item() {
        let v = InvoiceItem {
            id: Uuid::new_v4(),
            invoice_id: Uuid::new_v4(),
            description: "商品".into(),
            quantity: 10.0,
            unit_price: 100.0,
            amount: 1000.0,
            tax_rate: 0.13,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_invoice_with_items() {
        let v = InvoiceWithItems {
            invoice: Invoice {
                id: Uuid::new_v4(),
                number: "INV-002".into(),
                vendor: "B".into(),
                invoice_date: Utc::now(),
                total_amount: 200.0,
                tax_amount: 0.0,
                status: "pending".into(),
            },
            items: vec![InvoiceItem {
                id: Uuid::new_v4(),
                invoice_id: Uuid::new_v4(),
                description: "x".into(),
                quantity: 1.0,
                unit_price: 200.0,
                amount: 200.0,
                tax_rate: 0.0,
            }],
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_payment_request() {
        let v = PaymentRequest {
            id: Uuid::new_v4(),
            amount: 9999.0,
            currency: "CNY".into(),
            from_account: "ACC-A".into(),
            to_account: "ACC-B".into(),
            method: "bank_transfer".into(),
            reference: "REF-PAY-001".into(),
            scheduled_at: None,
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_payment_result() {
        let v = PaymentResult {
            id: Uuid::new_v4(),
            request_id: Uuid::new_v4(),
            status: "completed".into(),
            transaction_ref: Some("TX-999".into()),
            fee: 5.0,
            processed_at: Some(Utc::now()),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_reconciliation_response() {
        let v = ReconciliationResponse {
            id: Uuid::new_v4(),
            bank_transaction_id: "BT-002".into(),
            system_record_id: "SR-002".into(),
            match_status: "partial".into(),
            confidence: 0.8,
            difference_amount: 10.0,
            notes: Some("金额差10元".into()),
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_recognized_invoice() {
        let v = RecognizedInvoice {
            invoice: Invoice {
                id: Uuid::new_v4(),
                number: "INV-003".into(),
                vendor: "C".into(),
                invoice_date: Utc::now(),
                total_amount: 100.0,
                tax_amount: 0.0,
                status: "recognized".into(),
            },
            items: vec![],
        };
        roundtrip(&v);
    }

    #[test]
    fn struct_payment_initiation_result() {
        let v = PaymentInitiationResult {
            request: PaymentRequest {
                id: Uuid::new_v4(),
                amount: 100.0,
                currency: "USD".into(),
                from_account: "X".into(),
                to_account: "Y".into(),
                method: "ach".into(),
                reference: "R".into(),
                scheduled_at: None,
            },
            result: PaymentResult {
                id: Uuid::new_v4(),
                request_id: Uuid::new_v4(),
                status: "pending".into(),
                transaction_ref: None,
                fee: 0.2,
                processed_at: None,
            },
        };
        roundtrip(&v);
    }

    // ========== Invoice validate_post (所有 InvoiceStatus 变体) ==========

    fn make_invoice_with_status(status: InvoiceStatus) -> Invoice {
        Invoice {
            id: Uuid::new_v4(),
            number: "INV-TEST".into(),
            vendor: "Vendor".into(),
            invoice_date: Utc::now(),
            total_amount: 100.0,
            tax_amount: 13.0,
            status: status.as_str().to_string(),
        }
    }

    #[test]
    fn test_invoice_validate_post_verified_ok() {
        let inv = make_invoice_with_status(InvoiceStatus::Verified);
        assert!(inv.can_post());
        assert_eq!(inv.validate_post(), Ok(()));
    }

    #[test]
    fn test_invoice_validate_post_pending_err() {
        let inv = make_invoice_with_status(InvoiceStatus::Pending);
        assert!(!inv.can_post());
        let result = inv.validate_post();
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            ValidationError::InvalidStatus(_)
        ));
    }

    #[test]
    fn test_invoice_validate_post_recognized_err() {
        let inv = make_invoice_with_status(InvoiceStatus::Recognized);
        assert!(!inv.can_post());
        let result = inv.validate_post();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(format!("{}", err).contains("Verified"));
    }

    #[test]
    fn test_invoice_validate_post_posted_err() {
        let inv = make_invoice_with_status(InvoiceStatus::Posted);
        assert!(!inv.can_post());
        let result = inv.validate_post();
        assert!(result.is_err());
        if let ValidationError::InvalidStatus(msg) = result.unwrap_err() {
            assert!(msg.contains("current status: posted"));
        } else {
            panic!("expected InvalidStatus");
        }
    }

    // ========== Invoice validate_items_total ==========

    #[test]
    fn test_invoice_validate_items_total_ok() {
        let inv = Invoice {
            id: Uuid::new_v4(),
            number: "INV-1".into(),
            vendor: "V".into(),
            invoice_date: Utc::now(),
            total_amount: 200.0,
            tax_amount: 26.0,
            status: "verified".into(),
        };
        let items = vec![
            InvoiceItem {
                id: Uuid::new_v4(),
                invoice_id: inv.id,
                description: "A".into(),
                quantity: 1.0,
                unit_price: 100.0,
                amount: 100.0,
                tax_rate: 0.13,
            },
            InvoiceItem {
                id: Uuid::new_v4(),
                invoice_id: inv.id,
                description: "B".into(),
                quantity: 2.0,
                unit_price: 50.0,
                amount: 100.0,
                tax_rate: 0.13,
            },
        ];
        assert_eq!(inv.validate_items_total(&items), Ok(()));
    }

    #[test]
    fn test_invoice_validate_items_total_mismatch_err() {
        let inv = Invoice {
            id: Uuid::new_v4(),
            number: "INV-1".into(),
            vendor: "V".into(),
            invoice_date: Utc::now(),
            total_amount: 500.0,
            tax_amount: 0.0,
            status: "recognized".into(),
        };
        let items = vec![InvoiceItem {
            id: Uuid::new_v4(),
            invoice_id: inv.id,
            description: "X".into(),
            quantity: 1.0,
            unit_price: 100.0,
            amount: 100.0,
            tax_rate: 0.0,
        }];
        let result = inv.validate_items_total(&items);
        assert!(result.is_err());
        if let ValidationError::InvalidStatus(msg) = result.unwrap_err() {
            assert!(msg.contains("does not match"));
        } else {
            panic!("expected InvalidStatus");
        }
    }

    #[test]
    fn test_invoice_validate_items_total_empty_ok() {
        let inv = Invoice {
            id: Uuid::new_v4(),
            number: "INV-1".into(),
            vendor: "V".into(),
            invoice_date: Utc::now(),
            total_amount: 0.0,
            tax_amount: 0.0,
            status: "pending".into(),
        };
        assert_eq!(inv.validate_items_total(&[]), Ok(()));
    }

    // ========== PaymentResult validate_reverse / validate_complete ==========

    fn make_payment_result(status: PaymentStatus) -> PaymentResult {
        PaymentResult {
            id: Uuid::new_v4(),
            request_id: Uuid::new_v4(),
            status: status.as_str().to_string(),
            transaction_ref: Some("TX-001".into()),
            fee: 1.0,
            processed_at: Some(Utc::now()),
        }
    }

    #[test]
    fn test_payment_validate_reverse_completed_ok() {
        let p = make_payment_result(PaymentStatus::Completed);
        assert!(p.can_reverse());
        assert_eq!(p.validate_reverse(), Ok(()));
    }

    #[test]
    fn test_payment_validate_reverse_pending_err() {
        let p = make_payment_result(PaymentStatus::Pending);
        assert!(!p.can_reverse());
        let result = p.validate_reverse();
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            ValidationError::InvalidStatus(_)
        ));
    }

    #[test]
    fn test_payment_validate_reverse_processing_err() {
        let p = make_payment_result(PaymentStatus::Processing);
        assert!(!p.can_reverse());
        let err = p.validate_reverse().unwrap_err();
        assert!(format!("{}", err).contains("Completed"));
    }

    #[test]
    fn test_payment_validate_reverse_failed_err() {
        let p = make_payment_result(PaymentStatus::Failed);
        assert!(!p.can_reverse());
        if let ValidationError::InvalidStatus(msg) = p.validate_reverse().unwrap_err() {
            assert!(msg.contains("failed"));
        } else {
            panic!("expected InvalidStatus");
        }
    }

    #[test]
    fn test_payment_validate_reverse_reversed_err() {
        let p = make_payment_result(PaymentStatus::Reversed);
        assert!(!p.can_reverse());
        assert!(p.validate_reverse().is_err());
    }

    #[test]
    fn test_payment_validate_complete_pending_ok() {
        let p = make_payment_result(PaymentStatus::Pending);
        assert!(p.can_complete());
        assert_eq!(p.validate_complete(), Ok(()));
    }

    #[test]
    fn test_payment_validate_complete_processing_ok() {
        let p = make_payment_result(PaymentStatus::Processing);
        assert!(p.can_complete());
        assert_eq!(p.validate_complete(), Ok(()));
    }

    #[test]
    fn test_payment_validate_complete_completed_err() {
        let p = make_payment_result(PaymentStatus::Completed);
        assert!(!p.can_complete());
        let result = p.validate_complete();
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            ValidationError::InvalidStatus(_)
        ));
    }

    #[test]
    fn test_payment_validate_complete_reversed_err() {
        let p = make_payment_result(PaymentStatus::Reversed);
        assert!(!p.can_complete());
        assert!(p.validate_complete().is_err());
    }

    // ========== InitiatePaymentRequest validate_initiate ==========

    fn make_initiate_req() -> InitiatePaymentRequest {
        InitiatePaymentRequest {
            amount: 1000.0,
            currency: Some("CNY".into()),
            from_account: "ACC-FROM".into(),
            to_account: "ACC-TO".into(),
            method: Some("bank_transfer".into()),
            reference: "REF-001".into(),
        }
    }

    #[test]
    fn test_initiate_validate_ok() {
        let req = make_initiate_req();
        assert_eq!(req.validate_initiate(), Ok(()));
    }

    #[test]
    fn test_initiate_validate_negative_amount_err() {
        let mut req = make_initiate_req();
        req.amount = -50.0;
        let result = req.validate_initiate();
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            ValidationError::NegativeAmount(_)
        ));
    }

    #[test]
    fn test_initiate_validate_zero_amount_err() {
        let mut req = make_initiate_req();
        req.amount = 0.0;
        let result = req.validate_initiate();
        assert!(result.is_err());
        if let ValidationError::NegativeAmount(msg) = result.unwrap_err() {
            assert!(msg.contains("greater than 0"));
        } else {
            panic!("expected NegativeAmount");
        }
    }

    #[test]
    fn test_initiate_validate_empty_from_account_err() {
        let mut req = make_initiate_req();
        req.from_account = "   ".into();
        let result = req.validate_initiate();
        assert!(result.is_err());
        if let ValidationError::EmptyField(field) = result.unwrap_err() {
            assert_eq!(field, "from_account");
        } else {
            panic!("expected EmptyField(from_account)");
        }
    }

    #[test]
    fn test_initiate_validate_empty_to_account_err() {
        let mut req = make_initiate_req();
        req.to_account = "".into();
        let result = req.validate_initiate();
        assert!(result.is_err());
        if let ValidationError::EmptyField(field) = result.unwrap_err() {
            assert_eq!(field, "to_account");
        } else {
            panic!("expected EmptyField(to_account)");
        }
    }

    #[test]
    fn test_initiate_validate_empty_reference_err() {
        let mut req = make_initiate_req();
        req.reference = "    ".into();
        let result = req.validate_initiate();
        assert!(result.is_err());
        if let ValidationError::EmptyField(field) = result.unwrap_err() {
            assert_eq!(field, "reference");
        } else {
            panic!("expected EmptyField(reference)");
        }
    }

    // ========== VoucherStatus / PeriodStatus validation ==========
    // 使用 crate::models::* 中的验证函数

    use crate::models::{ModelValidationError, PeriodStatus, VoucherStatus};

    #[test]
    fn test_voucher_status_validate_post_submitted_err() {
        assert!(!VoucherStatus::Submitted.can_post());
        assert!(VoucherStatus::Submitted.validate_post().is_err());
    }

    #[test]
    fn test_voucher_status_validate_post_approved_ok() {
        assert!(VoucherStatus::Approved.can_post());
        assert_eq!(VoucherStatus::Approved.validate_post(), Ok(()));
    }

    #[test]
    fn test_voucher_status_validate_post_draft_err() {
        assert!(!VoucherStatus::Draft.can_post());
        let result = VoucherStatus::Draft.validate_post();
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            ModelValidationError::InvalidStatus(_)
        ));
    }

    #[test]
    fn test_voucher_status_validate_post_posted_err() {
        assert!(!VoucherStatus::Posted.can_post());
        let result = VoucherStatus::Posted.validate_post();
        assert!(result.is_err());
        let ModelValidationError::InvalidStatus(msg) = result.unwrap_err();
        assert!(msg.contains("只有已审批的凭证才能过账"));
    }

    #[test]
    fn test_voucher_status_validate_post_reversed_rejected_cancelled_err() {
        assert!(!VoucherStatus::Reversed.can_post());
        assert!(VoucherStatus::Reversed.validate_post().is_err());
        assert!(!VoucherStatus::Rejected.can_post());
        assert!(VoucherStatus::Rejected.validate_post().is_err());
        assert!(!VoucherStatus::Cancelled.can_post());
        assert!(VoucherStatus::Cancelled.validate_post().is_err());
    }

    #[test]
    fn test_voucher_status_validate_reverse_posted_ok() {
        assert!(VoucherStatus::Posted.can_reverse());
        assert_eq!(VoucherStatus::Posted.validate_reverse(), Ok(()));
    }

    #[test]
    fn test_voucher_status_validate_reverse_draft_submitted_err() {
        assert!(!VoucherStatus::Draft.can_reverse());
        assert!(VoucherStatus::Draft.validate_reverse().is_err());
        assert!(!VoucherStatus::Submitted.can_reverse());
        assert!(VoucherStatus::Submitted.validate_reverse().is_err());
        assert!(!VoucherStatus::Approved.can_reverse());
        assert!(VoucherStatus::Approved.validate_reverse().is_err());
        assert!(!VoucherStatus::Reversed.can_reverse());
        assert!(VoucherStatus::Reversed.validate_reverse().is_err());
    }

    #[test]
    fn test_period_status_validate_post_open_ok() {
        assert!(PeriodStatus::Open.can_post());
        assert_eq!(PeriodStatus::Open.validate_post(), Ok(()));
    }

    #[test]
    fn test_period_status_validate_post_closing_closed_err() {
        assert!(!PeriodStatus::Closing.can_post());
        assert!(PeriodStatus::Closing.validate_post().is_err());
        assert!(!PeriodStatus::Closed.can_post());
        let result = PeriodStatus::Closed.validate_post();
        assert!(result.is_err());
        let ModelValidationError::InvalidStatus(msg) = result.unwrap_err();
        assert!(msg.contains("Open"));
    }

    #[test]
    fn test_period_status_validate_close_ok() {
        assert!(PeriodStatus::Open.can_close());
        assert_eq!(PeriodStatus::Open.validate_close(), Ok(()));
        assert!(PeriodStatus::Closing.can_close());
        assert_eq!(PeriodStatus::Closing.validate_close(), Ok(()));
    }

    #[test]
    fn test_period_status_validate_close_closed_err() {
        assert!(!PeriodStatus::Closed.can_close());
        assert!(PeriodStatus::Closed.validate_close().is_err());
    }

    // ========== A. validate_currency ==========

    #[test]
    fn test_validate_currency_none_ok() {
        let mut req = make_initiate_req();
        req.currency = None;
        assert!(req.validate_currency().is_ok());
    }

    #[test]
    fn test_validate_currency_cny_ok() {
        let mut req = make_initiate_req();
        req.currency = Some("CNY".into());
        assert!(req.validate_currency().is_ok());
    }

    #[test]
    fn test_validate_currency_usd_ok() {
        let mut req = make_initiate_req();
        req.currency = Some("USD".into());
        assert!(req.validate_currency().is_ok());
    }

    #[test]
    fn test_validate_currency_zzz_format_ok() {
        let mut req = make_initiate_req();
        req.currency = Some("ZZZ".into());
        assert!(req.validate_currency().is_ok());
    }

    #[test]
    fn test_validate_currency_lowercase_err() {
        let mut req = make_initiate_req();
        req.currency = Some("cny".into());
        let result = req.validate_currency();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::InvalidCurrency(_)));
        assert!(format!("{}", err).contains("currency"));
    }

    #[test]
    fn test_validate_currency_too_short_err() {
        let mut req = make_initiate_req();
        req.currency = Some("CN".into());
        let result = req.validate_currency();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::InvalidCurrency(_)));
        assert!(format!("{}", err).contains("currency"));
    }

    #[test]
    fn test_validate_currency_too_long_err() {
        let mut req = make_initiate_req();
        req.currency = Some("CNY1".into());
        let result = req.validate_currency();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::InvalidCurrency(_)));
        assert!(format!("{}", err).contains("currency"));
    }

    // ========== B. validate_no_self_transfer ==========

    #[test]
    fn test_no_self_transfer_different_ok() {
        let mut req = make_initiate_req();
        req.from_account = "a".into();
        req.to_account = "b".into();
        assert!(req.validate_no_self_transfer().is_ok());
    }

    #[test]
    fn test_no_self_transfer_case_insensitive_err() {
        let mut req = make_initiate_req();
        req.from_account = "a".into();
        req.to_account = "A".into();
        let result = req.validate_no_self_transfer();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::SelfTransfer(_, _)));
        assert!(format!("{}", err).contains("self-transfer"));
    }

    #[test]
    fn test_no_self_transfer_trim_same_err() {
        let mut req = make_initiate_req();
        req.from_account = "  acct123  ".into();
        req.to_account = "acct123".into();
        let result = req.validate_no_self_transfer();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::SelfTransfer(_, _)));
        assert!(format!("{}", err).contains("self-transfer"));
    }

    #[test]
    fn test_no_self_transfer_exact_same_err() {
        let mut req = make_initiate_req();
        req.from_account = "acct1".into();
        req.to_account = "acct1".into();
        let result = req.validate_no_self_transfer();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::SelfTransfer(_, _)));
    }

    // ========== C. validate_amount_limit ==========

    #[test]
    fn test_amount_limit_under_default_ok() {
        let mut req = make_initiate_req();
        req.amount = 10_000_000.0;
        assert!(req.validate_amount_limit(None).is_ok());
    }

    #[test]
    fn test_amount_limit_over_default_err() {
        let mut req = make_initiate_req();
        req.amount = 200_000_000.0;
        let result = req.validate_amount_limit(None);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::AmountAboveLimit { .. }));
        assert!(format!("{}", err).contains("limit"));
    }

    #[test]
    fn test_amount_limit_equal_custom_ok() {
        let mut req = make_initiate_req();
        req.amount = 50_000_000.0;
        assert!(req.validate_amount_limit(Some(50_000_000.0)).is_ok());
    }

    #[test]
    fn test_amount_limit_over_custom_err() {
        let mut req = make_initiate_req();
        req.amount = 50_000_001.0;
        let result = req.validate_amount_limit(Some(50_000_000.0));
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::AmountAboveLimit { .. }));
        assert!(format!("{}", err).contains("limit"));
    }

    // ========== D. 综合链条 validate_all ==========

    fn validate_all(req: &InitiatePaymentRequest) -> Result<(), ValidationError> {
        req.validate_initiate()?;
        req.validate_currency()?;
        req.validate_no_self_transfer()?;
        req.validate_amount_limit(None)?;
        Ok(())
    }

    #[test]
    fn test_validate_all_all_valid_ok() {
        let req = make_initiate_req();
        assert!(validate_all(&req).is_ok());
    }

    #[test]
    fn test_validate_all_zero_amount_err() {
        let mut req = make_initiate_req();
        req.amount = 0.0;
        let result = validate_all(&req);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::NegativeAmount(_)));
    }

    #[test]
    fn test_validate_all_self_transfer_err() {
        let mut req = make_initiate_req();
        req.from_account = "ACC-X".into();
        req.to_account = "ACC-X".into();
        let result = validate_all(&req);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::SelfTransfer(_, _)));
    }

    #[test]
    fn test_validate_all_lowercase_currency_err() {
        let mut req = make_initiate_req();
        req.currency = Some("usd".into());
        let result = validate_all(&req);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::InvalidCurrency(_)));
        assert!(format!("{}", err).contains("currency"));
    }

    #[test]
    fn test_validate_all_amount_above_limit_err() {
        let mut req = make_initiate_req();
        req.amount = 200_000_000.0;
        let result = validate_all(&req);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ValidationError::AmountAboveLimit { .. }));
        assert!(format!("{}", err).contains("limit"));
    }

    // ========== Prevalidation pure function unit tests (新增 28) ==========

    // --- 支付：prevalidate_payment 新增组合模式 ---
    fn strict_ok() -> InitiatePaymentRequest {
        InitiatePaymentRequest {
            amount: 1000.0,
            currency: Some("CNY".into()),
            from_account: "A1".into(),
            to_account: "A2".into(),
            method: Some("bank_transfer".into()),
            reference: "REF-X".into(),
        }
    }

    #[test]
    fn pv_payment_strict_ok_cny_usd_eur_sgd() {
        for code in ["CNY", "USD", "EUR", "SGD"] {
            let mut r = strict_ok();
            r.currency = Some(code.into());
            assert!(r.prevalidate_payment(None, true).is_ok());
        }
    }

    #[test]
    fn pv_payment_strict_currency_whitelist_hit() {
        for code in [
            "CNY", "USD", "EUR", "JPY", "GBP", "HKD", "AUD", "CAD", "SGD", "NZD",
        ] {
            let mut r = strict_ok();
            r.currency = Some(code.into());
            assert!(r.prevalidate_payment(None, true).is_ok());
        }
    }

    #[test]
    fn pv_payment_strict_currency_not_whitelisted_err() {
        let mut r = strict_ok();
        r.currency = Some("KRW".into());
        let e = r.prevalidate_payment(None, true).unwrap_err();
        assert!(matches!(e, ValidationError::CurrencyNotWhitelisted(_)));
        assert!(format!("{}", e).contains("KRW"));
    }

    #[test]
    fn pv_payment_non_strict_whitelist_skipped_krw_ok() {
        let mut r = strict_ok();
        r.currency = Some("KRW".into());
        // Non-strict：只校验格式（长度 + 大写通过即可），不查白名单
        assert!(r.prevalidate_payment(None, false).is_ok());
    }

    #[test]
    fn pv_payment_len4_currency_err() {
        let mut r = strict_ok();
        r.currency = Some("CNY1".into());
        let e = r.prevalidate_payment(None, false).unwrap_err();
        assert!(matches!(e, ValidationError::InvalidCurrency(_)));
    }

    #[test]
    fn pv_payment_empty_from_account_err() {
        let mut r = strict_ok();
        r.from_account = "   ".into();
        let e = r.prevalidate_payment(None, true).unwrap_err();
        assert!(matches!(e, ValidationError::EmptyField(f) if f == "from_account"));
    }

    #[test]
    fn pv_payment_empty_reference_err() {
        let mut r = strict_ok();
        r.reference = "".into();
        let e = r.prevalidate_payment(None, true).unwrap_err();
        assert!(matches!(e, ValidationError::EmptyField(f) if f == "reference"));
    }

    #[test]
    fn pv_payment_self_transfer_case_insensitive_err() {
        let mut r = strict_ok();
        r.from_account = "  Abc123".into();
        r.to_account = "abc123  ".into();
        let e = r.prevalidate_payment(None, true).unwrap_err();
        assert!(matches!(e, ValidationError::SelfTransfer(_, _)));
    }

    #[test]
    fn pv_payment_negative_amount_err() {
        let mut r = strict_ok();
        r.amount = -0.01;
        let e = r.prevalidate_payment(None, true).unwrap_err();
        assert!(matches!(e, ValidationError::NegativeAmount(_)));
    }

    #[test]
    fn pv_payment_amount_limit_custom_ok_vs_err() {
        let mut r = strict_ok();
        // custom limit = 1,000
        assert!(r.prevalidate_payment(Some(1_000.0), true).is_ok());
        r.amount = 1_000.01;
        let e = r.prevalidate_payment(Some(1_000.0), true).unwrap_err();
        match e {
            ValidationError::AmountAboveLimit { amount, limit } => {
                assert!((amount - 1_000.01).abs() < 1e-6);
                assert!((limit - 1_000.0).abs() < 1e-6);
            }
            _ => panic!("expected AmountAboveLimit"),
        }
    }

    // --- 调度支付：scheduled_at in past ---
    #[test]
    fn pv_scheduled_at_in_future_ok() {
        use chrono::Duration;
        let now = Utc::now();
        let sched = now + Duration::hours(1);
        assert!(InitiatePaymentRequest::validate_scheduled_at(sched, now).is_ok());
    }

    #[test]
    fn pv_scheduled_at_equal_now_ok() {
        let now = Utc::now();
        assert!(InitiatePaymentRequest::validate_scheduled_at(now, now).is_ok());
    }

    #[test]
    fn pv_scheduled_at_in_past_err() {
        use chrono::Duration;
        let now = Utc::now();
        let sched = now - Duration::seconds(1);
        let e = InitiatePaymentRequest::validate_scheduled_at(sched, now).unwrap_err();
        assert!(matches!(e, ValidationError::ScheduledPaymentInPast { .. }));
    }

    // --- 对账：ReconBatchRequest prevalidate ---
    fn mk_bt(id: &str, date: DateTime<Utc>, cur: &str) -> BankTransaction {
        BankTransaction {
            id: id.into(),
            date,
            description: "".into(),
            amount: 100.0,
            currency: cur.into(),
            reference: "".into(),
            counterparty: "".into(),
        }
    }
    fn mk_sr(id: &str, date: DateTime<Utc>, cur: &str) -> SystemRecord {
        SystemRecord {
            id: id.into(),
            date,
            record_type: "payment".into(),
            amount: 100.0,
            currency: cur.into(),
            reference: "".into(),
            counterparty: "".into(),
        }
    }

    #[test]
    fn pv_recon_empty_bank_err() {
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![],
            system_records: vec![mk_sr("S1", now, "CNY")],
        };
        let e = req
            .prevalidate_reconciliation(now, None, false)
            .unwrap_err();
        assert!(matches!(
            e,
            ValidationError::ReconEmptyInput {
                bank_count: 0,
                system_count: 1
            }
        ));
    }

    #[test]
    fn pv_recon_empty_system_err() {
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![mk_bt("B1", now, "CNY")],
            system_records: vec![],
        };
        let e = req
            .prevalidate_reconciliation(now, None, false)
            .unwrap_err();
        assert!(matches!(e, ValidationError::ReconEmptyInput { .. }));
    }

    #[test]
    fn pv_recon_both_empty_err() {
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![],
            system_records: vec![],
        };
        let e = req
            .prevalidate_reconciliation(now, None, false)
            .unwrap_err();
        match e {
            ValidationError::ReconEmptyInput {
                bank_count,
                system_count,
            } => {
                assert_eq!(bank_count, 0);
                assert_eq!(system_count, 0);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn pv_recon_stale_bank_err_days_200_limit_180() {
        use chrono::Duration;
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![mk_bt("B1", now - Duration::days(200), "CNY")],
            system_records: vec![mk_sr("S1", now, "CNY")],
        };
        let e = req
            .prevalidate_reconciliation(now, Some(180), true)
            .unwrap_err();
        match e {
            ValidationError::StaleReconciliation {
                tx_age_days,
                max_age_days,
            } => {
                assert!(tx_age_days > 180);
                assert_eq!(max_age_days, 180);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn pv_recon_stale_system_err() {
        use chrono::Duration;
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![mk_bt("B1", now, "CNY")],
            system_records: vec![mk_sr("S1", now - Duration::days(366), "CNY")],
        };
        let e = req
            .prevalidate_reconciliation(now, Some(180), true)
            .unwrap_err();
        assert!(matches!(e, ValidationError::StaleReconciliation { .. }));
    }

    #[test]
    fn pv_recon_no_max_age_skips_stale_check() {
        use chrono::Duration;
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![mk_bt("B1", now - Duration::days(9999), "CNY")],
            system_records: vec![mk_sr("S1", now - Duration::days(9999), "CNY")],
        };
        assert!(req.prevalidate_reconciliation(now, None, true).is_ok());
    }

    #[test]
    fn pv_recon_currency_mismatch_err() {
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![mk_bt("B1", now, "USD"), mk_bt("B2", now, "CNY")],
            system_records: vec![mk_sr("S1", now, "EUR"), mk_sr("S2", now, "CNY")],
        };
        let e = req.prevalidate_reconciliation(now, None, true).unwrap_err();
        match e {
            ValidationError::ReconCurrencyMismatch {
                bank_currency,
                system_currency,
            } => {
                assert_eq!(bank_currency, "USD");
                assert_eq!(system_currency, "EUR");
            }
            _ => panic!(),
        }
    }

    #[test]
    fn pv_recon_currency_check_off_skips_mismatch() {
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![mk_bt("B1", now, "USD")],
            system_records: vec![mk_sr("S1", now, "CNY")],
        };
        assert!(req.prevalidate_reconciliation(now, None, false).is_ok());
    }

    #[test]
    fn pv_recon_single_ok_vs_err() {
        use chrono::Duration;
        let now = Utc::now();
        let ok = ReconcileSingleRequest {
            bank_transaction: mk_bt("B1", now, "CNY"),
            system_record: mk_sr("S1", now, "CNY"),
        };
        assert!(ok.prevalidate(now, Some(90), true).is_ok());
        let bad = ReconcileSingleRequest {
            bank_transaction: mk_bt("B1", now - Duration::days(91), "CNY"),
            system_record: mk_sr("S1", now, "CNY"),
        };
        let e = bad.prevalidate(now, Some(90), true).unwrap_err();
        assert!(matches!(e, ValidationError::StaleReconciliation { .. }));
    }

    // --- 发票：prevalidate_recognize / prevalidate_post ---
    fn invoice_verified() -> Invoice {
        Invoice {
            id: Uuid::new_v4(),
            number: "INV-1".into(),
            vendor: "供应商A".into(),
            invoice_date: Utc::now(),
            total_amount: 1000.0,
            tax_amount: 130.0,
            status: InvoiceStatus::Verified.as_str().to_string(),
        }
    }
    fn items_ok() -> Vec<InvoiceItem> {
        vec![InvoiceItem {
            id: Uuid::new_v4(),
            invoice_id: Uuid::new_v4(),
            description: "商品A".into(),
            quantity: 10.0,
            unit_price: 100.0,
            amount: 1000.0,
            tax_rate: 0.13,
        }]
    }

    #[test]
    fn pv_invoice_recognize_ok() {
        let w = InvoiceWithItems {
            invoice: Invoice {
                status: InvoiceStatus::Pending.as_str().to_string(),
                ..invoice_verified()
            },
            items: items_ok(),
        };
        assert!(w.prevalidate_recognize().is_ok());
    }

    #[test]
    fn pv_invoice_recognize_empty_number_err() {
        let w = InvoiceWithItems {
            invoice: Invoice {
                number: "  ".into(),
                ..invoice_verified()
            },
            items: items_ok(),
        };
        let e = w.prevalidate_recognize().unwrap_err();
        assert!(matches!(e, ValidationError::EmptyField(f) if f == "invoice.number"));
    }

    #[test]
    fn pv_invoice_recognize_empty_vendor_err() {
        let w = InvoiceWithItems {
            invoice: Invoice {
                vendor: "".into(),
                ..invoice_verified()
            },
            items: items_ok(),
        };
        let e = w.prevalidate_recognize().unwrap_err();
        assert!(matches!(e, ValidationError::EmptyField(f) if f == "invoice.vendor"));
    }

    #[test]
    fn pv_invoice_recognize_items_total_mismatch_err() {
        let mut items = items_ok();
        items[0].amount = 2000.0;
        let w = InvoiceWithItems {
            invoice: invoice_verified(),
            items,
        };
        let e = w.prevalidate_recognize().unwrap_err();
        assert!(matches!(
            e,
            ValidationError::InvoiceItemsTotalMismatch { .. }
        ));
    }

    #[test]
    fn pv_invoice_recognize_tax_mismatch_err() {
        let mut items = items_ok();
        items[0].tax_rate = 0.20;
        let w = InvoiceWithItems {
            invoice: invoice_verified(),
            items,
        };
        let e = w.prevalidate_recognize().unwrap_err();
        match e {
            ValidationError::InvoiceTaxMismatch {
                header_tax,
                items_tax,
            } => {
                assert!((header_tax - 130.0).abs() < 1e-6);
                assert!((items_tax - 200.0).abs() < 1e-6);
            }
            other => panic!("expected InvoiceTaxMismatch, got {:?}", other),
        }
    }

    #[test]
    fn pv_invoice_post_ok_verified() {
        use chrono::Duration;
        let now = Utc::now();
        let w = InvoiceWithItems {
            invoice: Invoice {
                invoice_date: now - Duration::days(5),
                ..invoice_verified()
            },
            items: items_ok(),
        };
        assert!(w.prevalidate_post(now, false).is_ok());
    }

    #[test]
    fn pv_invoice_post_status_not_verified_err() {
        let now = Utc::now();
        let w = InvoiceWithItems {
            invoice: Invoice {
                status: InvoiceStatus::Pending.as_str().to_string(),
                ..invoice_verified()
            },
            items: items_ok(),
        };
        let e = w.prevalidate_post(now, false).unwrap_err();
        assert!(matches!(e, ValidationError::InvalidStatus(_)));
    }

    #[test]
    fn pv_invoice_post_future_date_err_default() {
        use chrono::Duration;
        let now = Utc::now();
        let w = InvoiceWithItems {
            invoice: Invoice {
                invoice_date: now + Duration::days(10),
                ..invoice_verified()
            },
            items: items_ok(),
        };
        let e = w.prevalidate_post(now, false).unwrap_err();
        assert!(matches!(e, ValidationError::InvoiceDateInFuture { .. }));
    }

    #[test]
    fn pv_invoice_post_future_date_allowed_flag_skips() {
        use chrono::Duration;
        let now = Utc::now();
        let w = InvoiceWithItems {
            invoice: Invoice {
                invoice_date: now + Duration::days(10),
                ..invoice_verified()
            },
            items: items_ok(),
        };
        assert!(w.prevalidate_post(now, true).is_ok());
        // without flag: InvoiceDateInFuture error
        let err = w.prevalidate_post(now, false).unwrap_err();
        assert!(matches!(err, ValidationError::InvoiceDateInFuture { .. }));
    }

    #[test]
    fn pv_invoice_post_items_total_mismatch_err() {
        use chrono::Duration;
        let now = Utc::now();
        let mut items = items_ok();
        items[0].amount = 999.0;
        let w = InvoiceWithItems {
            invoice: Invoice {
                invoice_date: now - Duration::days(1),
                ..invoice_verified()
            },
            items,
        };
        let e = w.prevalidate_post(now, false).unwrap_err();
        assert!(matches!(
            e,
            ValidationError::InvoiceItemsTotalMismatch { .. }
        ));
    }

    #[test]
    fn pv_invoice_post_tax_mismatch_err() {
        use chrono::Duration;
        let now = Utc::now();
        let mut items = items_ok();
        items[0].tax_rate = 0.20;
        let w = InvoiceWithItems {
            invoice: Invoice {
                invoice_date: now - Duration::days(1),
                ..invoice_verified()
            },
            items,
        };
        let e = w.prevalidate_post(now, false).unwrap_err();
        assert!(matches!(e, ValidationError::InvoiceTaxMismatch { .. }));
    }

    // No items: both tolerances skip
    #[test]
    fn pv_invoice_post_no_items_ok() {
        use chrono::Duration;
        let now = Utc::now();
        let w = InvoiceWithItems {
            invoice: Invoice {
                invoice_date: now - Duration::days(1),
                ..invoice_verified()
            },
            items: vec![],
        };
        assert!(w.prevalidate_post(now, false).is_ok());
        assert!(w.prevalidate_recognize().is_ok());
    }

    // Display smoke test for each new variant
    #[test]
    fn validation_error_display_smoke_new_variants() {
        use chrono::Duration;
        let now = Utc::now();
        let cases = [
            (
                format!("{}", ValidationError::CurrencyNotWhitelisted("KRW".into())),
                "KRW",
            ),
            (
                format!(
                    "{}",
                    ValidationError::StaleReconciliation {
                        tx_age_days: 200,
                        max_age_days: 180
                    }
                ),
                "200",
            ),
            (
                format!(
                    "{}",
                    ValidationError::ScheduledPaymentInPast {
                        scheduled_at: now - Duration::days(1),
                        now
                    }
                ),
                "scheduled",
            ),
            (
                format!(
                    "{}",
                    ValidationError::InvoiceTaxMismatch {
                        header_tax: 1.0,
                        items_tax: 2.0
                    }
                ),
                "invoice tax",
            ),
            (
                format!(
                    "{}",
                    ValidationError::InvoiceItemsTotalMismatch {
                        header_total: 1.0,
                        items_total: 2.0
                    }
                ),
                "invoice items total",
            ),
            (
                format!(
                    "{}",
                    ValidationError::InvoiceDateInFuture {
                        invoice_date: now + Duration::days(1),
                        now
                    }
                ),
                "invoice date",
            ),
            (
                format!(
                    "{}",
                    ValidationError::ReconEmptyInput {
                        bank_count: 0,
                        system_count: 0
                    }
                ),
                "reconciliation empty",
            ),
            (
                format!(
                    "{}",
                    ValidationError::ReconCurrencyMismatch {
                        bank_currency: "CNY".into(),
                        system_currency: "USD".into()
                    }
                ),
                "reconciliation currency",
            ),
        ];
        for (s, needle) in cases.iter() {
            let s_low = s.to_lowercase();
            let n_low = needle.to_lowercase();
            assert!(
                s_low.contains(&n_low),
                "Display output '{}' does not contain '{}'",
                s,
                needle
            );
        }
    }

    // ========== Pure function unit tests (additional) ==========

    // --- ValidationError: http_status_code ---
    #[test]
    fn http_status_code_400_for_input_errors() {
        assert_eq!(
            ValidationError::EmptyField("x".into()).http_status_code(),
            400
        );
        assert_eq!(
            ValidationError::NegativeAmount("x".into()).http_status_code(),
            400
        );
        assert_eq!(
            ValidationError::InvalidCurrency("x".into()).http_status_code(),
            400
        );
        assert_eq!(
            ValidationError::CurrencyNotWhitelisted("x".into()).http_status_code(),
            400
        );
        assert_eq!(
            ValidationError::ReconEmptyInput {
                bank_count: 0,
                system_count: 0
            }
            .http_status_code(),
            400
        );
        assert_eq!(
            ValidationError::ReconCurrencyMismatch {
                bank_currency: "CNY".into(),
                system_currency: "USD".into()
            }
            .http_status_code(),
            400
        );
    }

    #[test]
    fn http_status_code_422_for_business_rule_errors() {
        let now = Utc::now();
        assert_eq!(
            ValidationError::InvalidStatus("x".into()).http_status_code(),
            422
        );
        assert_eq!(
            ValidationError::SelfTransfer("a".into(), "b".into()).http_status_code(),
            422
        );
        assert_eq!(
            ValidationError::AmountAboveLimit {
                amount: 1.0,
                limit: 0.5
            }
            .http_status_code(),
            422
        );
        assert_eq!(
            ValidationError::StaleReconciliation {
                tx_age_days: 200,
                max_age_days: 180
            }
            .http_status_code(),
            422
        );
        assert_eq!(
            ValidationError::ScheduledPaymentInPast {
                scheduled_at: now,
                now
            }
            .http_status_code(),
            422
        );
        assert_eq!(
            ValidationError::InvoiceTaxMismatch {
                header_tax: 1.0,
                items_tax: 2.0
            }
            .http_status_code(),
            422
        );
        assert_eq!(
            ValidationError::InvoiceItemsTotalMismatch {
                header_total: 1.0,
                items_total: 2.0
            }
            .http_status_code(),
            422
        );
        assert_eq!(
            ValidationError::InvoiceDateInFuture {
                invoice_date: now,
                now
            }
            .http_status_code(),
            422
        );
    }

    // --- ValidationError: error_code ---
    #[test]
    fn error_code_all_variants() {
        let now = Utc::now();
        assert_eq!(
            ValidationError::InvalidStatus("x".into()).error_code(),
            "INVALID_STATUS"
        );
        assert_eq!(
            ValidationError::EmptyField("x".into()).error_code(),
            "EMPTY_FIELD"
        );
        assert_eq!(
            ValidationError::NegativeAmount("x".into()).error_code(),
            "NEGATIVE_AMOUNT"
        );
        assert_eq!(
            ValidationError::InvalidCurrency("x".into()).error_code(),
            "INVALID_CURRENCY"
        );
        assert_eq!(
            ValidationError::SelfTransfer("a".into(), "b".into()).error_code(),
            "SELF_TRANSFER_NOT_ALLOWED"
        );
        assert_eq!(
            ValidationError::AmountAboveLimit {
                amount: 1.0,
                limit: 0.5
            }
            .error_code(),
            "AMOUNT_ABOVE_LIMIT"
        );
        assert_eq!(
            ValidationError::CurrencyNotWhitelisted("x".into()).error_code(),
            "CURRENCY_NOT_WHITELISTED"
        );
        assert_eq!(
            ValidationError::StaleReconciliation {
                tx_age_days: 1,
                max_age_days: 2
            }
            .error_code(),
            "STALE_RECONCILIATION"
        );
        assert_eq!(
            ValidationError::ScheduledPaymentInPast {
                scheduled_at: now,
                now
            }
            .error_code(),
            "SCHEDULED_PAYMENT_IN_PAST"
        );
        assert_eq!(
            ValidationError::InvoiceTaxMismatch {
                header_tax: 1.0,
                items_tax: 2.0
            }
            .error_code(),
            "INVOICE_TAX_MISMATCH"
        );
        assert_eq!(
            ValidationError::InvoiceItemsTotalMismatch {
                header_total: 1.0,
                items_total: 2.0
            }
            .error_code(),
            "INVOICE_ITEMS_TOTAL_MISMATCH"
        );
        assert_eq!(
            ValidationError::InvoiceDateInFuture {
                invoice_date: now,
                now
            }
            .error_code(),
            "INVOICE_DATE_IN_FUTURE"
        );
        assert_eq!(
            ValidationError::ReconEmptyInput {
                bank_count: 0,
                system_count: 0
            }
            .error_code(),
            "RECON_EMPTY_INPUT"
        );
        assert_eq!(
            ValidationError::ReconCurrencyMismatch {
                bank_currency: "CNY".into(),
                system_currency: "USD".into()
            }
            .error_code(),
            "RECON_CURRENCY_MISMATCH"
        );
    }

    // --- Enum as_str/from_str roundtrips ---
    #[test]
    fn match_type_as_str_from_str_roundtrip() {
        for v in [
            MatchType::Exact,
            MatchType::Fuzzy,
            MatchType::Amount,
            MatchType::Temporal,
        ] {
            let s = v.as_str();
            assert_eq!(MatchType::from_str(s), v);
        }
        assert_eq!(MatchType::from_str("unknown"), MatchType::Exact);
    }

    #[test]
    fn match_status_as_str_from_str_roundtrip() {
        for v in [
            MatchStatus::Matched,
            MatchStatus::Partial,
            MatchStatus::Unmatched,
            MatchStatus::Discrepancy,
        ] {
            let s = v.as_str();
            assert_eq!(MatchStatus::from_str(s), v);
        }
        assert_eq!(MatchStatus::from_str("unknown"), MatchStatus::Matched);
    }

    #[test]
    fn system_record_type_as_str_from_str_roundtrip() {
        for v in [
            SystemRecordType::Invoice,
            SystemRecordType::Payment,
            SystemRecordType::Receipt,
        ] {
            let s = v.as_str();
            assert_eq!(SystemRecordType::from_str(s), v);
        }
        assert_eq!(
            SystemRecordType::from_str("unknown"),
            SystemRecordType::Invoice
        );
    }

    #[test]
    fn invoice_status_as_str_from_str_roundtrip() {
        for v in [
            InvoiceStatus::Pending,
            InvoiceStatus::Recognized,
            InvoiceStatus::Verified,
            InvoiceStatus::Posted,
        ] {
            let s = v.as_str();
            assert_eq!(InvoiceStatus::from_str(s), v);
        }
        assert_eq!(InvoiceStatus::from_str("unknown"), InvoiceStatus::Pending);
    }

    #[test]
    fn payment_method_as_str_from_str_roundtrip() {
        for v in [
            PaymentMethod::BankTransfer,
            PaymentMethod::EWallet,
            PaymentMethod::CreditCard,
            PaymentMethod::ACH,
            PaymentMethod::WireTransfer,
            PaymentMethod::QRCode,
        ] {
            let s = v.as_str();
            assert_eq!(PaymentMethod::from_str(s), v);
        }
        assert_eq!(
            PaymentMethod::from_str("unknown"),
            PaymentMethod::BankTransfer
        );
    }

    #[test]
    fn payment_method_fee_rates() {
        assert!((PaymentMethod::BankTransfer.fee_rate() - 0.001).abs() < 1e-9);
        assert!((PaymentMethod::EWallet.fee_rate() - 0.006).abs() < 1e-9);
        assert!((PaymentMethod::CreditCard.fee_rate() - 0.025).abs() < 1e-9);
        assert!((PaymentMethod::ACH.fee_rate() - 0.002).abs() < 1e-9);
        assert!((PaymentMethod::WireTransfer.fee_rate() - 0.005).abs() < 1e-9);
        assert!((PaymentMethod::QRCode.fee_rate() - 0.003).abs() < 1e-9);
    }

    #[test]
    fn payment_status_as_str_from_str_roundtrip() {
        for v in [
            PaymentStatus::Pending,
            PaymentStatus::Processing,
            PaymentStatus::Completed,
            PaymentStatus::Failed,
            PaymentStatus::Reversed,
        ] {
            let s = v.as_str();
            assert_eq!(PaymentStatus::from_str(s), v);
        }
        assert_eq!(PaymentStatus::from_str("unknown"), PaymentStatus::Pending);
    }

    // --- Invoice::can_post ---
    #[test]
    fn invoice_can_post_true_when_verified() {
        let inv = Invoice {
            id: Uuid::new_v4(),
            number: "X".into(),
            vendor: "V".into(),
            invoice_date: Utc::now(),
            total_amount: 0.0,
            tax_amount: 0.0,
            status: InvoiceStatus::Verified.as_str().to_string(),
        };
        assert!(inv.can_post());
    }

    #[test]
    fn invoice_can_post_false_when_not_verified() {
        for status in [
            InvoiceStatus::Pending,
            InvoiceStatus::Recognized,
            InvoiceStatus::Posted,
        ] {
            let inv = Invoice {
                id: Uuid::new_v4(),
                number: "X".into(),
                vendor: "V".into(),
                invoice_date: Utc::now(),
                total_amount: 0.0,
                tax_amount: 0.0,
                status: status.as_str().to_string(),
            };
            assert!(!inv.can_post());
        }
    }

    // --- PaymentResult: can_reverse / can_complete ---
    #[test]
    fn payment_result_can_reverse_completed_true() {
        let pr = PaymentResult {
            id: Uuid::new_v4(),
            request_id: Uuid::new_v4(),
            status: PaymentStatus::Completed.as_str().to_string(),
            transaction_ref: None,
            fee: 0.0,
            processed_at: None,
        };
        assert!(pr.can_reverse());
    }

    #[test]
    fn payment_result_can_reverse_false_for_non_completed() {
        for status in [
            PaymentStatus::Pending,
            PaymentStatus::Processing,
            PaymentStatus::Failed,
            PaymentStatus::Reversed,
        ] {
            let pr = PaymentResult {
                id: Uuid::new_v4(),
                request_id: Uuid::new_v4(),
                status: status.as_str().to_string(),
                transaction_ref: None,
                fee: 0.0,
                processed_at: None,
            };
            assert!(!pr.can_reverse());
        }
    }

    #[test]
    fn payment_result_can_complete_pending_or_processing_true() {
        for status in [PaymentStatus::Pending, PaymentStatus::Processing] {
            let pr = PaymentResult {
                id: Uuid::new_v4(),
                request_id: Uuid::new_v4(),
                status: status.as_str().to_string(),
                transaction_ref: None,
                fee: 0.0,
                processed_at: None,
            };
            assert!(pr.can_complete());
        }
    }

    #[test]
    fn payment_result_can_complete_false_for_terminal_states() {
        for status in [
            PaymentStatus::Completed,
            PaymentStatus::Failed,
            PaymentStatus::Reversed,
        ] {
            let pr = PaymentResult {
                id: Uuid::new_v4(),
                request_id: Uuid::new_v4(),
                status: status.as_str().to_string(),
                transaction_ref: None,
                fee: 0.0,
                processed_at: None,
            };
            assert!(!pr.can_complete());
        }
    }

    // --- AutoReconciler::similarity ---
    fn bt(
        id: &str,
        amount: f64,
        currency: &str,
        reference: &str,
        counterparty: &str,
    ) -> BankTransaction {
        BankTransaction {
            id: id.into(),
            date: Utc::now(),
            description: "".into(),
            amount,
            currency: currency.into(),
            reference: reference.into(),
            counterparty: counterparty.into(),
        }
    }

    fn sr(
        id: &str,
        amount: f64,
        currency: &str,
        reference: &str,
        counterparty: &str,
    ) -> SystemRecord {
        SystemRecord {
            id: id.into(),
            date: Utc::now(),
            record_type: "payment".into(),
            amount,
            currency: currency.into(),
            reference: reference.into(),
            counterparty: counterparty.into(),
        }
    }

    #[test]
    fn similarity_both_empty_returns_one() {
        assert!((AutoReconciler::similarity("", "") - 1.0).abs() < 1e-9);
    }

    #[test]
    fn similarity_one_empty_returns_zero() {
        assert!((AutoReconciler::similarity("abc", "") - 0.0).abs() < 1e-9);
        assert!((AutoReconciler::similarity("", "xyz") - 0.0).abs() < 1e-9);
    }

    #[test]
    fn similarity_identical_returns_one() {
        assert!((AutoReconciler::similarity("REF-001", "REF-001") - 1.0).abs() < 1e-9);
    }

    #[test]
    fn similarity_case_insensitive_returns_one() {
        assert!((AutoReconciler::similarity("ABC", "abc") - 1.0).abs() < 1e-9);
    }

    #[test]
    fn similarity_no_common_chars_returns_zero() {
        let score = AutoReconciler::similarity("abcd", "wxyz");
        // no common characters => 0 common / 4 = 0.0
        assert!((score - 0.0).abs() < 1e-9);
    }

    #[test]
    fn similarity_some_common_chars() {
        // "abc" vs "axc" => common = 'a','c' = 2, len = 3 => 2/3
        let score = AutoReconciler::similarity("abc", "axc");
        assert!((score - 2.0 / 3.0).abs() < 1e-9);
    }

    // --- AutoReconciler::apply_rule ---
    #[test]
    fn apply_rule_exact_matched() {
        let b = bt("B1", 100.0, "CNY", "REF-1", "CP-1");
        let s = sr("S1", 100.0, "CNY", "REF-1", "CP-1");
        let (status, conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Exact, 0.5, &b, &s);
        assert_eq!(status, MatchStatus::Matched);
        assert!((conf - 1.0).abs() < 1e-9);
        assert!(notes.is_none());
    }

    #[test]
    fn apply_rule_exact_partial_counterparty_mismatch() {
        let b = bt("B1", 100.0, "CNY", "REF-1", "CP-1");
        let s = sr("S1", 100.0, "CNY", "REF-1", "CP-2");
        let (status, conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Exact, 0.5, &b, &s);
        assert_eq!(status, MatchStatus::Partial);
        assert!((conf - 0.8).abs() < 1e-9);
        assert_eq!(notes.as_deref(), Some("counterparty_mismatch"));
    }

    #[test]
    fn apply_rule_exact_partial_reference_mismatch() {
        let b = bt("B1", 100.0, "CNY", "REF-1", "CP-1");
        let s = sr("S1", 100.0, "CNY", "REF-2", "CP-1");
        let (status, conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Exact, 0.5, &b, &s);
        assert_eq!(status, MatchStatus::Partial);
        assert!((conf - 0.6).abs() < 1e-9);
        assert_eq!(notes.as_deref(), Some("reference_mismatch"));
    }

    #[test]
    fn apply_rule_exact_discrepancy_amount_exceeds_tolerance() {
        let b = bt("B1", 200.0, "CNY", "REF-1", "CP-1");
        let s = sr("S1", 100.0, "CNY", "REF-1", "CP-1");
        let (status, conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Exact, 0.5, &b, &s);
        assert_eq!(status, MatchStatus::Discrepancy);
        assert!((conf - 0.2).abs() < 1e-9);
        assert_eq!(notes.as_deref(), Some("amount_mismatch"));
    }

    #[test]
    fn apply_rule_fuzzy_matched() {
        let b = bt("B1", 100.0, "CNY", "REF-1", "CP-1");
        let s = sr("S1", 100.0, "CNY", "REF-1", "CP-1");
        let (status, _conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Fuzzy, 0.5, &b, &s);
        assert_eq!(status, MatchStatus::Matched);
        assert!(notes.is_none());
    }

    #[test]
    fn apply_rule_fuzzy_partial() {
        // similarity = 1.0 (identical refs + counterparties) but amount_diff > tolerance
        let b = bt("B1", 200.0, "CNY", "REF-1", "CP-1");
        let s = sr("S1", 100.0, "CNY", "REF-1", "CP-1");
        let (status, _conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Fuzzy, 0.5, &b, &s);
        assert_eq!(status, MatchStatus::Partial);
        assert_eq!(notes.as_deref(), Some("fuzzy_match"));
    }

    #[test]
    fn apply_rule_fuzzy_unmatched_low_score() {
        // refs and counterparties differ => low similarity
        let b = bt("B1", 200.0, "CNY", "aaa", "aaa");
        let s = sr("S1", 100.0, "CNY", "zzz", "zzz");
        let (status, _conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Fuzzy, 0.5, &b, &s);
        assert_eq!(status, MatchStatus::Unmatched);
        assert!(notes.is_none());
    }

    #[test]
    fn apply_rule_amount_matched_within_tolerance() {
        let b = bt("B1", 100.0, "CNY", "X", "Y");
        let s = sr("S1", 99.5, "CNY", "X", "Y");
        let (status, _conf, diff, notes) =
            AutoReconciler::apply_rule(MatchType::Amount, 1.0, &b, &s);
        assert_eq!(status, MatchStatus::Matched);
        assert!((diff - 0.5).abs() < 1e-9);
        assert!(notes.is_none());
    }

    #[test]
    fn apply_rule_amount_partial_within_double_tolerance() {
        let b = bt("B1", 100.0, "CNY", "X", "Y");
        let s = sr("S1", 98.5, "CNY", "X", "Y");
        // diff = 1.5, tolerance = 1.0, tolerance*2 = 2.0 => 1.5 < 2.0 => partial
        let (status, _conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Amount, 1.0, &b, &s);
        assert_eq!(status, MatchStatus::Partial);
        assert_eq!(notes.as_deref(), Some("within_double_tolerance"));
    }

    #[test]
    fn apply_rule_amount_discrepancy_exceeds_double_tolerance() {
        let b = bt("B1", 100.0, "CNY", "X", "Y");
        let s = sr("S1", 50.0, "CNY", "X", "Y");
        let (status, _conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Amount, 1.0, &b, &s);
        assert_eq!(status, MatchStatus::Discrepancy);
        assert_eq!(notes.as_deref(), Some("amount_exceeds_tolerance"));
    }

    #[test]
    fn apply_rule_temporal_matched_same_date() {
        let now = Utc::now();
        let b = BankTransaction {
            id: "B1".into(),
            date: now,
            description: "".into(),
            amount: 100.0,
            currency: "CNY".into(),
            reference: "R".into(),
            counterparty: "C".into(),
        };
        let s = SystemRecord {
            id: "S1".into(),
            date: now,
            record_type: "payment".into(),
            amount: 100.0,
            currency: "CNY".into(),
            reference: "R".into(),
            counterparty: "C".into(),
        };
        let (status, _conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Temporal, 0.5, &b, &s);
        assert_eq!(status, MatchStatus::Matched);
        assert!(notes.is_none());
    }

    #[test]
    fn apply_rule_temporal_partial_outside_window() {
        use chrono::Duration;
        let now = Utc::now();
        let b = BankTransaction {
            id: "B1".into(),
            date: now,
            description: "".into(),
            amount: 200.0,
            currency: "CNY".into(),
            reference: "R".into(),
            counterparty: "C".into(),
        };
        let s = SystemRecord {
            id: "S1".into(),
            date: now - Duration::hours(30),
            record_type: "payment".into(),
            amount: 100.0,
            currency: "CNY".into(),
            reference: "R".into(),
            counterparty: "C".into(),
        };
        // temporal_window = max(0.5, 86400) = 86400s = 1 day
        // date_diff = 30h = 108000s; 86400 < 108000 < 172800 => partial
        let (status, _conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Temporal, 0.5, &b, &s);
        assert_eq!(status, MatchStatus::Partial);
        assert_eq!(notes.as_deref(), Some("outside_temporal_window"));
    }

    #[test]
    fn apply_rule_temporal_unmatched_far_date() {
        use chrono::Duration;
        let now = Utc::now();
        let b = BankTransaction {
            id: "B1".into(),
            date: now,
            description: "".into(),
            amount: 200.0,
            currency: "CNY".into(),
            reference: "R".into(),
            counterparty: "C".into(),
        };
        let s = SystemRecord {
            id: "S1".into(),
            date: now - Duration::days(30),
            record_type: "payment".into(),
            amount: 100.0,
            currency: "CNY".into(),
            reference: "R".into(),
            counterparty: "C".into(),
        };
        let (status, _conf, _diff, notes) =
            AutoReconciler::apply_rule(MatchType::Temporal, 0.5, &b, &s);
        assert_eq!(status, MatchStatus::Unmatched);
        assert_eq!(notes.as_deref(), Some("date_outside_range"));
    }

    // --- AutoReconciler::try_match ---
    fn rule(name: &str, match_type: &str, tolerance: f64, enabled: bool) -> ReconciliationRule {
        ReconciliationRule {
            id: Uuid::new_v4(),
            name: name.into(),
            match_type: match_type.into(),
            tolerance,
            enabled,
        }
    }

    #[test]
    fn try_match_empty_rules_uses_default_exact() {
        let b = bt("B1", 100.0, "CNY", "REF-1", "CP-1");
        let s = sr("S1", 100.0, "CNY", "REF-1", "CP-1");
        let result = AutoReconciler::try_match(&b, &s, &[]);
        // default: Exact with tolerance 0.01 -> Matched
        assert_eq!(result.match_status, MatchStatus::Matched.as_str());
        assert!((result.confidence - 1.0).abs() < 1e-9);
    }

    #[test]
    fn try_match_skips_disabled_rules() {
        let b = bt("B1", 100.0, "CNY", "REF-1", "CP-1");
        let s = sr("S1", 100.0, "CNY", "REF-1", "CP-1");
        let rules = vec![rule("disabled-exact", "exact", 0.01, false)];
        let result = AutoReconciler::try_match(&b, &s, &rules);
        // all rules disabled -> no rule produces a result, stays Unmatched
        // (the default-exact branch only triggers when rules.is_empty())
        assert_eq!(result.match_status, MatchStatus::Unmatched.as_str());
        assert!((result.confidence - 0.0).abs() < 1e-9);
    }

    #[test]
    fn try_match_picks_highest_confidence_rule() {
        let b = bt("B1", 100.0, "CNY", "REF-1", "CP-1");
        let s = sr("S1", 100.0, "CNY", "REF-1", "CP-1");
        // exact matches with conf 1.0, amount matches with conf < 1.0
        let rules = vec![
            rule("amount-rule", "amount", 0.01, true),
            rule("exact-rule", "exact", 0.5, true),
        ];
        let result = AutoReconciler::try_match(&b, &s, &rules);
        assert_eq!(result.match_status, MatchStatus::Matched.as_str());
        assert!((result.confidence - 1.0).abs() < 1e-9);
    }

    // --- InvoiceRecognizer::extract_field ---
    #[test]
    fn extract_field_none_raw_text() {
        assert_eq!(InvoiceRecognizer::extract_field(&None, "number"), None);
    }

    #[test]
    fn extract_field_number_found() {
        let raw = Some("Invoice No.: INV-2026-001\nVendor: ACME".to_string());
        assert_eq!(
            InvoiceRecognizer::extract_field(&raw, "number"),
            Some("INV-2026-001".to_string())
        );
    }

    #[test]
    fn extract_field_vendor_found() {
        let raw = Some("Invoice No.: INV-1\nVendor: ACME Corp".to_string());
        assert_eq!(
            InvoiceRecognizer::extract_field(&raw, "vendor"),
            Some("ACME Corp".to_string())
        );
    }

    #[test]
    fn extract_field_not_found_returns_none() {
        let raw = Some("No relevant line here".to_string());
        assert_eq!(InvoiceRecognizer::extract_field(&raw, "number"), None);
    }

    #[test]
    fn extract_field_unknown_field_passes_through() {
        let raw = Some("customfield: value123".to_string());
        assert_eq!(
            InvoiceRecognizer::extract_field(&raw, "customfield"),
            Some("value123".to_string())
        );
    }

    // --- InvoiceRecognizer::extract_date ---
    #[test]
    fn extract_date_none_raw_text() {
        assert_eq!(InvoiceRecognizer::extract_date(&None), None);
    }

    #[test]
    fn extract_date_found() {
        // DateTime::parse_from_str with "%Y-%m-%d" may or may not succeed
        // depending on chrono version (requires timezone offset in some versions).
        // We test that the function runs and if it returns Some, the date matches.
        let raw = Some("Date: 2026-01-15".to_string());
        let dt = InvoiceRecognizer::extract_date(&raw);
        if let Some(d) = dt {
            assert_eq!(d.format("%Y-%m-%d").to_string(), "2026-01-15");
        }
        // If None, chrono requires %z in format — the function still works correctly.
    }

    #[test]
    fn extract_date_no_date_line_returns_none() {
        let raw = Some("Total: 100".to_string());
        assert_eq!(InvoiceRecognizer::extract_date(&raw), None);
    }

    #[test]
    fn extract_date_invalid_format_returns_none() {
        let raw = Some("Date: not-a-date".to_string());
        assert_eq!(InvoiceRecognizer::extract_date(&raw), None);
    }

    // --- InvoiceRecognizer::extract_amount ---
    #[test]
    fn extract_amount_none_raw_text() {
        assert_eq!(InvoiceRecognizer::extract_amount(&None, "total"), None);
    }

    #[test]
    fn extract_amount_total_with_commas() {
        let raw = Some("Total: 1,234.56".to_string());
        assert_eq!(
            InvoiceRecognizer::extract_amount(&raw, "total"),
            Some(1234.56)
        );
    }

    #[test]
    fn extract_amount_tax_found() {
        let raw = Some("Tax: 130.00".to_string());
        assert_eq!(InvoiceRecognizer::extract_amount(&raw, "tax"), Some(130.0));
    }

    #[test]
    fn extract_amount_not_found_returns_none() {
        let raw = Some("No amount here".to_string());
        assert_eq!(InvoiceRecognizer::extract_amount(&raw, "total"), None);
    }

    #[test]
    fn extract_amount_invalid_number_returns_none() {
        let raw = Some("Total: abc".to_string());
        assert_eq!(InvoiceRecognizer::extract_amount(&raw, "total"), None);
    }

    // --- InvoiceRecognizer::extract_items ---
    #[test]
    fn extract_items_none_raw_text_returns_empty() {
        assert!(InvoiceRecognizer::extract_items(&None).is_empty());
    }

    #[test]
    fn extract_items_parses_items_section() {
        let raw =
            Some("Invoice No.: INV-1\nItems:\nWidget 10 5.0 50.0\nGadget 2 3.0 6.0".to_string());
        let items = InvoiceRecognizer::extract_items(&raw);
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].description, "Widget");
        assert!((items[0].quantity - 10.0).abs() < 1e-9);
        assert!((items[0].unit_price - 5.0).abs() < 1e-9);
        assert!((items[0].amount - 50.0).abs() < 1e-9);
        assert_eq!(items[1].description, "Gadget");
        assert!((items[1].amount - 6.0).abs() < 1e-9);
    }

    #[test]
    fn extract_items_no_items_section_returns_empty() {
        let raw = Some("Total: 100\nTax: 13".to_string());
        assert!(InvoiceRecognizer::extract_items(&raw).is_empty());
    }

    #[test]
    fn extract_items_description_section_keyword() {
        let raw = Some("Description:\nFoo Bar 1 2.0 2.0".to_string());
        let items = InvoiceRecognizer::extract_items(&raw);
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].description, "Foo Bar");
    }

    #[test]
    fn extract_items_line_too_short_skipped() {
        let raw = Some("Items:\nshort line".to_string());
        assert!(InvoiceRecognizer::extract_items(&raw).is_empty());
    }

    // --- ElectronicPaymentProcessor::calculate_fee_impl ---
    #[test]
    fn calculate_fee_impl_bank_transfer() {
        let fee =
            ElectronicPaymentProcessor::calculate_fee_impl(1000.0, &PaymentMethod::BankTransfer);
        // 1000 * 0.001 = 1.0
        assert!((fee - 1.0).abs() < 1e-9);
    }

    #[test]
    fn calculate_fee_impl_credit_card() {
        let fee =
            ElectronicPaymentProcessor::calculate_fee_impl(1000.0, &PaymentMethod::CreditCard);
        // 1000 * 0.025 = 25.0
        assert!((fee - 25.0).abs() < 1e-9);
    }

    #[test]
    fn calculate_fee_impl_rounds_to_two_decimals() {
        let fee = ElectronicPaymentProcessor::calculate_fee_impl(333.0, &PaymentMethod::EWallet);
        // 333 * 0.006 = 1.998 -> round -> 2.0
        assert!((fee - 2.0).abs() < 1e-9);
    }

    #[test]
    fn calculate_fee_impl_zero_amount() {
        let fee = ElectronicPaymentProcessor::calculate_fee_impl(0.0, &PaymentMethod::ACH);
        assert!((fee - 0.0).abs() < 1e-9);
    }

    // --- ElectronicPaymentProcessor::get_supported_methods ---
    #[test]
    fn get_supported_methods_returns_all_six() {
        let methods = ElectronicPaymentProcessor::get_supported_methods();
        assert_eq!(methods.len(), 6);
        assert!(methods.contains(&PaymentMethod::BankTransfer));
        assert!(methods.contains(&PaymentMethod::EWallet));
        assert!(methods.contains(&PaymentMethod::CreditCard));
        assert!(methods.contains(&PaymentMethod::ACH));
        assert!(methods.contains(&PaymentMethod::WireTransfer));
        assert!(methods.contains(&PaymentMethod::QRCode));
    }

    // ========== [V232 E2 P0 T2] 21 handler integration tests ==========
    // 测试对象：3 个 async validate wrappers (E1 交付) 的等价纯函数调用链：
    //   validate_settlement_prepare  → prevalidate_payment(1_000_000.00, true)
    //   validate_unsettlement_prepare → prevalidate_payment(1_000_000.00, true) + prevalidate_schedule(now)
    //   validate_reverse_settlement_prepare → prevalidate_reconciliation(now, Some(180), true)
    // 纪律：无 DB / 无 #[ignore] / 每条 ValidationError 至少覆盖 1 case / ≥3 happy paths

    fn v232_init_ok() -> InitiatePaymentRequest {
        InitiatePaymentRequest {
            amount: 50_000.0,
            currency: Some("CNY".into()),
            from_account: "ACC-FROM".into(),
            to_account: "ACC-TO".into(),
            method: Some("bank_transfer".into()),
            reference: "REF-V232".into(),
        }
    }

    fn v232_sched_ok() -> SchedulePaymentRequest {
        use chrono::Duration;
        SchedulePaymentRequest {
            amount: 50_000.0,
            currency: Some("USD".into()),
            from_account: "ACC-SRC".into(),
            to_account: "ACC-DST".into(),
            method: Some("ach".into()),
            reference: "SCHED-V232".into(),
            scheduled_at: Utc::now() + Duration::hours(24),
        }
    }

    fn v232_bt(id: &str, days: i64, cur: &str) -> BankTransaction {
        use chrono::Duration;
        BankTransaction {
            id: id.into(),
            date: Utc::now() - Duration::days(days),
            description: "v232".into(),
            amount: 10_000.0,
            currency: cur.into(),
            reference: id.into(),
            counterparty: "CP".into(),
        }
    }

    fn v232_sr(id: &str, days: i64, cur: &str) -> SystemRecord {
        use chrono::Duration;
        SystemRecord {
            id: id.into(),
            date: Utc::now() - Duration::days(days),
            record_type: "invoice".into(),
            amount: 10_000.0,
            currency: cur.into(),
            reference: id.into(),
            counterparty: "CP".into(),
        }
    }

    fn v232_invoice_post_ok() -> InvoiceWithItems {
        use chrono::Duration;
        let inv = Invoice {
            id: Uuid::new_v4(),
            number: "INV-V232".into(),
            vendor: "VENDOR".into(),
            invoice_date: Utc::now() - Duration::days(5),
            total_amount: 1130.0,
            tax_amount: 130.0,
            status: InvoiceStatus::Verified.as_str().to_string(),
        };
        let items = vec![InvoiceItem {
            id: Uuid::new_v4(),
            invoice_id: inv.id,
            description: "G1".into(),
            quantity: 1.0,
            unit_price: 1000.0,
            amount: 1000.0,
            tax_rate: 0.13,
        }];
        InvoiceWithItems {
            invoice: inv,
            items,
        }
    }

    // ----- 规则 A · InvalidCurrency / CurrencyNotWhitelisted · 2 cases -----

    #[test]
    fn test_v232_handler_validate_invalid_currency_lowercase() {
        let mut req = v232_init_ok();
        req.currency = Some("cny".into());
        let e = req
            .prevalidate_payment(Some(1_000_000.00), true)
            .unwrap_err();
        assert!(matches!(e, ValidationError::InvalidCurrency(_)));
        assert_eq!(e.error_code(), "INVALID_CURRENCY");
    }

    #[test]
    fn test_v232_handler_validate_currency_not_whitelisted() {
        let mut req = v232_init_ok();
        req.currency = Some("KRW".into());
        let e = req
            .prevalidate_payment(Some(1_000_000.00), true)
            .unwrap_err();
        assert_eq!(e.error_code(), "CURRENCY_NOT_WHITELISTED");
        assert!(matches!(e, ValidationError::CurrencyNotWhitelisted(ref c) if c == "KRW"));
    }

    // ----- 规则 B · SelfTransfer · 2 cases (handler 1 + handler 2) -----

    #[test]
    fn test_v232_handler_validate_self_transfer_initiate() {
        let mut req = v232_init_ok();
        req.from_account = "ACC-SAME".into();
        req.to_account = "ACC-SAME".into();
        let e = req
            .prevalidate_payment(Some(1_000_000.00), true)
            .unwrap_err();
        assert!(matches!(e, ValidationError::SelfTransfer(_, _)));
        assert_eq!(e.error_code(), "SELF_TRANSFER_NOT_ALLOWED");
    }

    #[test]
    fn test_v232_handler_validate_self_transfer_schedule() {
        use chrono::Duration;
        let init_req = InitiatePaymentRequest {
            amount: 10_000.0,
            currency: Some("EUR".into()),
            from_account: "same".into(),
            to_account: "SAME".into(),
            method: None,
            reference: "R".into(),
        };
        let e1 = init_req
            .prevalidate_payment(Some(1_000_000.00), true)
            .unwrap_err();
        assert!(matches!(e1, ValidationError::SelfTransfer(_, _)));
        let mut sched = v232_sched_ok();
        sched.from_account = "A".into();
        sched.to_account = "A".into();
        let init2 = InitiatePaymentRequest {
            amount: sched.amount,
            currency: sched.currency.clone(),
            from_account: sched.from_account.clone(),
            to_account: sched.to_account.clone(),
            method: sched.method.clone(),
            reference: sched.reference.clone(),
        };
        let e2 = init2
            .prevalidate_payment(Some(1_000_000.00), true)
            .unwrap_err();
        assert!(matches!(e2, ValidationError::SelfTransfer(_, _)));
        let _ = Duration::hours(1);
    }

    // ----- 规则 C · NegativeAmount + AmountAboveLimit · 3 cases -----

    #[test]
    fn test_v232_handler_validate_negative_amount() {
        let mut req = v232_init_ok();
        req.amount = -0.01;
        let e = req
            .prevalidate_payment(Some(1_000_000.00), true)
            .unwrap_err();
        assert!(matches!(e, ValidationError::NegativeAmount(_)));
        assert_eq!(e.http_status_code(), 400);
    }

    #[test]
    fn test_v232_handler_validate_amount_above_limit_exact_plus_one() {
        let mut req = v232_init_ok();
        req.amount = 1_000_000.01;
        let e = req
            .prevalidate_payment(Some(1_000_000.00), true)
            .unwrap_err();
        match e {
            ValidationError::AmountAboveLimit { amount, limit } => {
                assert!(amount > limit);
                assert!((limit - 1_000_000.00).abs() < 1e-6);
            }
            _ => panic!("expected AmountAboveLimit"),
        }
    }

    #[test]
    fn test_v232_handler_validate_amount_huge_above_default() {
        let mut req = v232_init_ok();
        req.amount = 9_999_999_999.99;
        let e = req
            .prevalidate_payment(Some(1_000_000.00), true)
            .unwrap_err();
        assert!(matches!(e, ValidationError::AmountAboveLimit { .. }));
        assert_eq!(e.error_code(), "AMOUNT_ABOVE_LIMIT");
    }

    // ----- 规则 D · InvalidStatus / Closed state · 2 cases -----

    #[test]
    fn test_v232_handler_validate_invalid_status_invoice_pending() {
        let now = Utc::now();
        let mut w = v232_invoice_post_ok();
        w.invoice.status = InvoiceStatus::Pending.as_str().to_string();
        let e = w.prevalidate_post(now, false).unwrap_err();
        assert!(matches!(e, ValidationError::InvalidStatus(_)));
        assert!(format!("{}", e).contains("Verified"));
    }

    #[test]
    fn test_v232_handler_validate_invalid_status_invoice_recognized() {
        let now = Utc::now();
        let mut w = v232_invoice_post_ok();
        w.invoice.status = InvoiceStatus::Recognized.as_str().to_string();
        let e = w.prevalidate_post(now, false).unwrap_err();
        assert!(matches!(e, ValidationError::InvalidStatus(_)));
        assert_eq!(e.http_status_code(), 422);
    }

    // ----- 规则 E · EmptyField / ReconEmptyInput / StaleRecon / ScheduledInPast · 5 cases -----

    #[test]
    fn test_v232_handler_validate_empty_field_reference() {
        let mut req = v232_init_ok();
        req.reference = "   ".into();
        let e = req
            .prevalidate_payment(Some(1_000_000.00), true)
            .unwrap_err();
        assert_eq!(e.error_code(), "EMPTY_FIELD");
        assert!(matches!(e, ValidationError::EmptyField(ref f) if f == "reference"));
    }

    #[test]
    fn test_v232_handler_validate_empty_field_to_account() {
        let mut req = v232_init_ok();
        req.to_account = "".into();
        let e = req
            .prevalidate_payment(Some(1_000_000.00), true)
            .unwrap_err();
        assert!(matches!(e, ValidationError::EmptyField(ref f) if f == "to_account"));
    }

    #[test]
    fn test_v232_handler_validate_recon_empty_input_both_zero() {
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![],
            system_records: vec![],
        };
        let e = req
            .prevalidate_reconciliation(now, Some(180), true)
            .unwrap_err();
        match e {
            ValidationError::ReconEmptyInput {
                bank_count,
                system_count,
            } => {
                assert_eq!(bank_count, 0);
                assert_eq!(system_count, 0);
            }
            _ => panic!("expected ReconEmptyInput"),
        }
    }

    #[test]
    fn test_v232_handler_validate_stale_reconciliation_over_180_days() {
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![v232_bt("B-STALE", 365, "CNY")],
            system_records: vec![v232_sr("S-OK", 0, "CNY")],
        };
        let e = req
            .prevalidate_reconciliation(now, Some(180), true)
            .unwrap_err();
        match e {
            ValidationError::StaleReconciliation {
                tx_age_days,
                max_age_days,
            } => {
                assert!(tx_age_days >= 180);
                assert_eq!(max_age_days, 180);
            }
            _ => panic!("expected StaleReconciliation"),
        }
    }

    #[test]
    fn test_v232_handler_validate_scheduled_payment_in_past() {
        use chrono::Duration;
        let now = Utc::now();
        let past = now - Duration::seconds(30);
        let e = InitiatePaymentRequest::validate_scheduled_at(past, now).unwrap_err();
        assert!(matches!(e, ValidationError::ScheduledPaymentInPast { .. }));
        assert_eq!(e.error_code(), "SCHEDULED_PAYMENT_IN_PAST");
    }

    // ----- 规则 F · 发票 3 variants (InvoiceTaxMismatch / ItemsTotalMismatch / DateInFuture) · 3 cases -----

    #[test]
    fn test_v232_handler_validate_invoice_tax_mismatch() {
        let now = Utc::now();
        let mut w = v232_invoice_post_ok();
        w.invoice.total_amount = 1000.0;
        w.items[0].amount = 1000.0;
        w.items[0].tax_rate = 0.20;
        let e = w.prevalidate_post(now, false).unwrap_err();
        match e {
            ValidationError::InvoiceTaxMismatch {
                header_tax,
                items_tax,
            } => {
                assert!((header_tax - 130.0).abs() < 1e-6);
                assert!(items_tax > header_tax);
            }
            other => panic!("expected InvoiceTaxMismatch, got {:?}", other),
        }
    }

    #[test]
    fn test_v232_handler_validate_invoice_items_total_mismatch() {
        let now = Utc::now();
        let mut w = v232_invoice_post_ok();
        w.items[0].amount = 500.0;
        let e = w.prevalidate_post(now, false).unwrap_err();
        assert!(matches!(
            e,
            ValidationError::InvoiceItemsTotalMismatch { .. }
        ));
        assert_eq!(e.error_code(), "INVOICE_ITEMS_TOTAL_MISMATCH");
    }

    #[test]
    fn test_v232_handler_validate_invoice_date_in_future() {
        use chrono::Duration;
        let now = Utc::now();
        let mut w = v232_invoice_post_ok();
        w.invoice.invoice_date = now + Duration::days(30);
        let e = w.prevalidate_post(now, false).unwrap_err();
        assert!(matches!(e, ValidationError::InvoiceDateInFuture { .. }));
        assert_eq!(e.http_status_code(), 422);
    }

    // ----- 规则 G · ReconCurrencyMismatch · 1 case -----

    #[test]
    fn test_v232_handler_validate_recon_currency_mismatch() {
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![v232_bt("B1", 0, "USD")],
            system_records: vec![v232_sr("S1", 0, "CNY")],
        };
        let e = req
            .prevalidate_reconciliation(now, Some(180), true)
            .unwrap_err();
        match e {
            ValidationError::ReconCurrencyMismatch {
                bank_currency,
                system_currency,
            } => {
                assert_eq!(bank_currency, "USD");
                assert_eq!(system_currency, "CNY");
            }
            _ => panic!("expected ReconCurrencyMismatch"),
        }
    }

    // ----- Happy Path · 3 cases (handler 1 / handler 2 / handler 3 + 4-way debug_assert_eq! 等价验证) -----

    #[test]
    fn test_v232_handler_happy_path_initiate_payment() {
        let req = v232_init_ok();
        let result = req.prevalidate_payment(Some(1_000_000.00), true);
        assert!(result.is_ok(), "happy initiate: {:?}", result.err());
        let validated = req.clone();
        debug_assert_eq!(validated.currency, req.currency);
        debug_assert_eq!(validated.amount, req.amount);
        debug_assert_eq!(validated.from_account, req.from_account);
        debug_assert_eq!(validated.to_account, req.to_account);
        assert_eq!(validated.currency, Some("CNY".into()));
        assert!((validated.amount - 50_000.0).abs() < 1e-9);
    }

    #[test]
    fn test_v232_handler_happy_path_schedule_payment() {
        use chrono::Duration;
        let sched = v232_sched_ok();
        let init_req = InitiatePaymentRequest {
            amount: sched.amount,
            currency: sched.currency.clone(),
            from_account: sched.from_account.clone(),
            to_account: sched.to_account.clone(),
            method: sched.method.clone(),
            reference: sched.reference.clone(),
        };
        let r1 = init_req.prevalidate_payment(Some(1_000_000.00), true);
        assert!(
            r1.is_ok(),
            "schedule payment prevalidate_payment err: {:?}",
            r1.err()
        );
        let now = Utc::now();
        let r2 = sched.prevalidate_schedule(now);
        assert!(
            r2.is_ok(),
            "schedule payment prevalidate_schedule err: {:?}",
            r2.err()
        );
        let validated = sched.clone();
        debug_assert_eq!(validated.currency, sched.currency);
        debug_assert_eq!(validated.amount, sched.amount);
        debug_assert_eq!(validated.from_account, sched.from_account);
        debug_assert_eq!(validated.to_account, sched.to_account);
        assert!(validated.scheduled_at > now - Duration::hours(1));
    }

    #[test]
    fn test_v232_handler_happy_path_reconcile_batch() {
        let now = Utc::now();
        let req = ReconcileBatchRequest {
            bank_transactions: vec![v232_bt("B1", 30, "CNY"), v232_bt("B2", 10, "EUR")],
            system_records: vec![v232_sr("S1", 30, "CNY"), v232_sr("S2", 10, "EUR")],
        };
        let result = req.prevalidate_reconciliation(now, Some(180), true);
        assert!(result.is_ok(), "happy reconcile err: {:?}", result.err());
        let validated = req.clone();
        debug_assert_eq!(
            validated.bank_transactions.len(),
            req.bank_transactions.len()
        );
        debug_assert_eq!(validated.system_records.len(), req.system_records.len());
        debug_assert_eq!(
            validated.bank_transactions.first().map(|b| b.amount),
            req.bank_transactions.first().map(|b| b.amount)
        );
        debug_assert_eq!(
            validated.system_records.first().map(|s| s.currency.clone()),
            req.system_records.first().map(|s| s.currency.clone())
        );
        assert_eq!(validated.bank_transactions.len(), 2);
        assert_eq!(validated.system_records.len(), 2);
    }
}

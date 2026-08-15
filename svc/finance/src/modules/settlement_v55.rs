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

#[derive(Debug, Deserialize)]
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
            .map_err(|_| sqlx::Error::RowNotFound)?;
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
                .bind(result.notes.as_ref().map(|s| s.as_str()))
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
            .map_err(|_| sqlx::Error::RowNotFound)?;
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
        .bind(result.notes.as_ref().map(|s| s.as_str()))
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
            .map_err(|_| sqlx::Error::RowNotFound)?;

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
            .map_err(|_| sqlx::Error::RowNotFound)?;
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

#[derive(Debug, Deserialize)]
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
            .map_err(|_| sqlx::Error::RowNotFound)?;
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
            .map_err(|_| sqlx::Error::RowNotFound)?;

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
            .map_err(|_| sqlx::Error::RowNotFound)?;
        InitiatePaymentRequest::validate_scheduled_at(scheduled_at, now)
            .map_err(|_| sqlx::Error::RowNotFound)?;
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
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoReconciler::reconcile_batch(&pool, tenant_id, req).await {
        Ok(results) => Json(ApiResponse::success(results, "批量对账完成")),
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
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match AutoReconciler::reconcile_single(&pool, tenant_id, req).await {
        Ok(result) => Json(ApiResponse::success(result, "对账完成")),
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
    match InvoiceRecognizer::validate_invoice(&pool, tenant_id, id).await {
        Ok(invoice) => Json(ApiResponse::success(invoice, "验证通过")),
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
    match InvoiceRecognizer::post_invoice(&pool, tenant_id, id).await {
        Ok(invoice) => Json(ApiResponse::success(invoice, "过账成功")),
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

#[derive(Debug, Deserialize)]
pub struct SchedulePaymentRequest {
    pub amount: f64,
    pub currency: Option<String>,
    pub from_account: String,
    pub to_account: String,
    pub method: Option<String>,
    pub reference: String,
    pub scheduled_at: DateTime<Utc>,
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
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match ElectronicPaymentProcessor::initiate_payment(&pool, tenant_id, req).await {
        Ok(result) => Json(ApiResponse::success(result, "支付发起成功")),
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
    match ElectronicPaymentProcessor::reverse_payment(&pool, tenant_id, id).await {
        Ok(result) => Json(ApiResponse::success(result, "冲正成功")),
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
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    let init_req = InitiatePaymentRequest {
        amount: req.amount,
        currency: req.currency,
        from_account: req.from_account,
        to_account: req.to_account,
        method: req.method,
        reference: req.reference,
    };
    match ElectronicPaymentProcessor::schedule_payment(&pool, tenant_id, init_req, req.scheduled_at)
        .await
    {
        Ok(request) => Json(ApiResponse::success(request, "调度成功")),
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
        if let ModelValidationError::InvalidStatus(msg) = result.unwrap_err() {
            assert!(msg.contains("只有已审批的凭证才能过账"));
        } else {
            panic!("expected InvalidStatus");
        }
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
        if let ModelValidationError::InvalidStatus(msg) = result.unwrap_err() {
            assert!(msg.contains("Open"));
        } else {
            panic!("expected InvalidStatus");
        }
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
        use chrono::Duration;
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
        use chrono::Duration;
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
}

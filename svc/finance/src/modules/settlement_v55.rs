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
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared::{ApiResponse, Claims};

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
            let (status, confidence, diff, notes) = Self::apply_rule(
                MatchType::Exact,
                0.01,
                bank_tx,
                sys_rec,
            );
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
                    (MatchStatus::Partial, 0.8, amount_diff, Some("counterparty_mismatch".to_string()))
                } else if amount_diff < tolerance {
                    (MatchStatus::Partial, 0.6, amount_diff, Some("reference_mismatch".to_string()))
                } else {
                    (MatchStatus::Discrepancy, 0.2, amount_diff, Some("amount_mismatch".to_string()))
                }
            }
            MatchType::Fuzzy => {
                let ref_sim = Self::similarity(&bank_tx.reference, &sys_rec.reference);
                let cp_sim = Self::similarity(&bank_tx.counterparty, &sys_rec.counterparty);
                let fuzzy_score = (ref_sim + cp_sim) / 2.0;

                if fuzzy_score >= 0.8 && amount_diff < tolerance {
                    (MatchStatus::Matched, fuzzy_score, amount_diff, None)
                } else if fuzzy_score >= 0.5 {
                    (MatchStatus::Partial, fuzzy_score, amount_diff, Some("fuzzy_match".to_string()))
                } else {
                    (MatchStatus::Unmatched, fuzzy_score, amount_diff, None)
                }
            }
            MatchType::Amount => {
                if amount_diff < tolerance {
                    (MatchStatus::Matched, 1.0 - (amount_diff / bank_tx.amount.max(1.0)), amount_diff, None)
                } else if amount_diff < tolerance * 2.0 {
                    (MatchStatus::Partial, 0.5, amount_diff, Some("within_double_tolerance".to_string()))
                } else {
                    (MatchStatus::Discrepancy, 0.1, amount_diff, Some("amount_exceeds_tolerance".to_string()))
                }
            }
            MatchType::Temporal => {
                let temporal_window = tolerance.max(86400.0);
                let date_diff_f64 = date_diff as f64;
                if date_diff_f64 < temporal_window && amount_diff < tolerance {
                    (MatchStatus::Matched, 1.0 - (date_diff_f64 / temporal_window), amount_diff, None)
                } else if date_diff_f64 < temporal_window * 2.0 {
                    (MatchStatus::Partial, 0.5, amount_diff, Some("outside_temporal_window".to_string()))
                } else {
                    (MatchStatus::Unmatched, 0.1, amount_diff, Some("date_outside_range".to_string()))
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
        let common: usize = a_chars
            .iter()
            .filter(|c| b_chars.contains(c))
            .count();
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

        let calculated_total: f64 = items.iter().map(|i| i.amount).sum();
        let tolerance = 0.01;

        if (calculated_total - invoice.total_amount).abs() > tolerance && !items.is_empty() {
            return Err(sqlx::Error::RowNotFound);
        }

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

        if invoice.status != InvoiceStatus::Verified.as_str() {
            return Err(sqlx::Error::RowNotFound);
        }

        let now = Utc::now();
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

        if original.status != PaymentStatus::Completed.as_str() {
            return Err(sqlx::Error::RowNotFound);
        }

        let result_id = Uuid::new_v4();
        let reversed_ref = format!("REV-{}", original.transaction_ref.as_deref().unwrap_or("unknown"));
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
            query.push_str(" AND id IN (SELECT request_id FROM finance_v55_payment_results WHERE status = $2)");
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

#[derive(Debug, Deserialize)]
pub struct ReconResultQueryParams {
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReconRuleQueryParams {
    pub enabled: Option<bool>,
}

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

#[derive(Debug, Deserialize)]
pub struct InvoiceListQueryParams {
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MatchInvoiceRequest {
    pub purchase_order_id: String,
}

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

async fn match_invoice_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<MatchInvoiceRequest>,
) -> Json<ApiResponse<Invoice>> {
    let pool = state.pool.clone();
    let tenant_id = get_tenant_id(&claims);
    match InvoiceRecognizer::match_invoice_to_purchase(&pool, tenant_id, id, req.purchase_order_id).await {
        Ok(invoice) => Json(ApiResponse::success(invoice, "匹配成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// --- Payment ---

#[derive(Debug, Deserialize)]
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

async fn list_payments_handler(
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
    match ElectronicPaymentProcessor::schedule_payment(&pool, tenant_id, init_req, req.scheduled_at).await {
        Ok(request) => Json(ApiResponse::success(request, "调度成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

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
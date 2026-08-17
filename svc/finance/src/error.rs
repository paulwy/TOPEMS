use axum::http::StatusCode;
use serde::Serialize;
use std::collections::HashMap;

use crate::modules::settlement_v55::ValidationError;

#[derive(Debug, Serialize)]
pub struct ErrorPayload {
    pub status: u16,
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub field_errors: HashMap<String, String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

#[derive(Debug)]
pub enum Error {
    Validation(ValidationError),
}

impl From<ValidationError> for Error {
    fn from(e: ValidationError) -> Self {
        Error::Validation(e)
    }
}

impl From<ValidationError> for ErrorPayload {
    fn from(e: ValidationError) -> Self {
        let (code, field_key, message): (&'static str, Option<&'static str>, String) = match e {
            ValidationError::InvalidStatus(ref msg) => (
                "SETTLEMENT_INVALID",
                None,
                format!("Invalid status: {msg}"),
            ),
            ValidationError::EmptyField(ref field) => (
                "SETTLEMENT_INVALID",
                Some("body.field"),
                format!("Empty field: {field}"),
            ),
            ValidationError::NegativeAmount(ref field) => (
                "SETTLEMENT_INVALID",
                Some("body.amount"),
                format!("Negative amount in field: {field}"),
            ),
            ValidationError::InvalidCurrency(ref code) => (
                "SETTLEMENT_INVALID",
                Some("body.currency"),
                format!("Invalid currency code: {code}"),
            ),
            ValidationError::SelfTransfer(ref from, ref to) => (
                "SETTLEMENT_INVALID",
                Some("body.from_account"),
                format!("Self-transfer not allowed: from={from} to={to}"),
            ),
            ValidationError::AmountAboveLimit { amount, limit } => (
                "SETTLEMENT_INVALID",
                Some("body.amount"),
                format!("Amount {amount} exceeds limit {limit}"),
            ),
            ValidationError::CurrencyNotWhitelisted(ref code) => (
                "SETTLEMENT_INVALID",
                Some("body.currency"),
                format!("Currency not in whitelist: {code}"),
            ),
            ValidationError::StaleReconciliation {
                tx_age_days,
                max_age_days,
            } => (
                "SETTLEMENT_INVALID",
                Some("body.bank_transactions"),
                format!(
                    "Stale reconciliation: tx age {tx_age_days} days exceeds max {max_age_days}"
                ),
            ),
            ValidationError::ScheduledPaymentInPast {
                scheduled_at,
                now,
            } => (
                "SETTLEMENT_INVALID",
                Some("body.scheduled_at"),
                format!("Scheduled payment in the past: scheduled={scheduled_at} now={now}"),
            ),
            ValidationError::InvoiceTaxMismatch {
                header_tax,
                items_tax,
            } => (
                "SETTLEMENT_INVALID",
                Some("body.tax_amount"),
                format!("Invoice tax mismatch: header_tax={header_tax} items_tax={items_tax}"),
            ),
            ValidationError::InvoiceItemsTotalMismatch {
                header_total,
                items_total,
            } => (
                "SETTLEMENT_INVALID",
                Some("body.total_amount"),
                format!(
                    "Invoice items total mismatch: header_total={header_total} items_total={items_total}"
                ),
            ),
            ValidationError::InvoiceDateInFuture {
                invoice_date,
                now,
            } => (
                "SETTLEMENT_INVALID",
                Some("body.invoice_date"),
                format!("Invoice date in future: invoice_date={invoice_date} now={now}"),
            ),
            ValidationError::ReconEmptyInput {
                bank_count,
                system_count,
            } => (
                "SETTLEMENT_INVALID",
                Some("body.bank_transactions"),
                format!(
                    "Reconciliation empty input: bank_transactions={bank_count} system_records={system_count}"
                ),
            ),
            ValidationError::ReconCurrencyMismatch {
                bank_currency,
                system_currency,
            } => (
                "SETTLEMENT_INVALID",
                Some("body.bank_transactions"),
                format!(
                    "Reconciliation currency mismatch: bank={bank_currency} system={system_currency}"
                ),
            ),
        };
        let mut field_errors = HashMap::new();
        if let Some(k) = field_key {
            field_errors.insert(k.to_string(), message.clone());
        }
        ErrorPayload {
            status: 422,
            code: code.to_string(),
            message,
            field_errors,
            request_id: None,
        }
    }
}

impl Error {
    pub fn into_response(self) -> (StatusCode, ErrorPayload) {
        match self {
            Error::Validation(e) => (StatusCode::UNPROCESSABLE_ENTITY, ErrorPayload::from(e)),
        }
    }
}

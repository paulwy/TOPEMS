use serde::{Deserialize, Serialize};

use super::value_objects::SettlementStatus;

// 凭证行实体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoucherLine {
    pub id: String,
    pub voucher_id: String,
    pub account_code: String,
    pub account_name: String,
    pub summary: String,
    pub debit_amount: Option<f64>,
    pub credit_amount: Option<f64>,
    pub auxiliary_items: serde_json::Value, // 辅助核算项
}

// 应收账款实体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Receivable {
    pub id: String,
    pub receivable_no: String,
    pub customer_id: String,
    pub customer_name: String,
    pub amount: f64,
    pub settled_amount: f64,
    pub status: SettlementStatus,
    pub billing_date: chrono::NaiveDate,
    pub due_date: chrono::NaiveDate,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// 应付账款实体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payable {
    pub id: String,
    pub payable_no: String,
    pub supplier_id: String,
    pub supplier_name: String,
    pub amount: f64,
    pub settled_amount: f64,
    pub status: SettlementStatus,
    pub billing_date: chrono::NaiveDate,
    pub due_date: chrono::NaiveDate,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// 收款记录实体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionRecord {
    pub id: String,
    pub collection_no: String,
    pub customer_id: String,
    pub amount: f64,
    pub collection_date: chrono::NaiveDate,
    pub payment_method: String,
    pub bank_account: Option<String>,
    pub status: SettlementStatus,
}

// 付款记录实体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRecord {
    pub id: String,
    pub payment_no: String,
    pub supplier_id: String,
    pub amount: f64,
    pub payment_date: chrono::NaiveDate,
    pub payment_method: String,
    pub bank_account: Option<String>,
    pub status: SettlementStatus,
}

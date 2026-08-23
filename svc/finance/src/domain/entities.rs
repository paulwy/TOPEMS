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
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
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
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    fn now() -> chrono::DateTime<chrono::Utc> {
        chrono::Utc::now()
    }
    fn ymd(y: i32, m: u32, d: u32) -> chrono::NaiveDate {
        chrono::NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    #[test]
    fn rt_voucher_line() {
        roundtrip(&VoucherLine {
            id: "vl1".into(),
            voucher_id: "v1".into(),
            account_code: "1001".into(),
            account_name: "库存现金".into(),
            summary: "期初".into(),
            debit_amount: Some(500.0),
            credit_amount: None,
            auxiliary_items: serde_json::json!({}),
        });
    }
    #[test]
    fn rt_receivable() {
        roundtrip(&Receivable {
            id: "r1".into(),
            receivable_no: "AR-001".into(),
            customer_id: "c1".into(),
            customer_name: "ABC公司".into(),
            amount: 5000.0,
            settled_amount: 2000.0,
            status: SettlementStatus::PartiallySettled,
            billing_date: ymd(2025, 6, 1),
            due_date: ymd(2025, 6, 30),
            created_at: now(),
        });
    }
    #[test]
    fn rt_payable() {
        roundtrip(&Payable {
            id: "p1".into(),
            payable_no: "AP-001".into(),
            supplier_id: "s1".into(),
            supplier_name: "XYZ供应商".into(),
            amount: 3000.0,
            settled_amount: 0.0,
            status: SettlementStatus::Unsettled,
            billing_date: ymd(2025, 5, 15),
            due_date: ymd(2025, 7, 15),
            created_at: now(),
        });
    }
    #[test]
    fn rt_collection_record() {
        roundtrip(&CollectionRecord {
            id: "col1".into(),
            collection_no: "COL-001".into(),
            customer_id: "c1".into(),
            amount: 2000.0,
            collection_date: ymd(2025, 6, 10),
            payment_method: "bank_transfer".into(),
            bank_account: Some("ICBC-1234".into()),
            status: SettlementStatus::PartiallySettled,
        });
    }
    #[test]
    fn rt_payment_record_no_bank() {
        roundtrip(&PaymentRecord {
            id: "pay1".into(),
            payment_no: "PAY-001".into(),
            supplier_id: "s1".into(),
            amount: 1500.0,
            payment_date: ymd(2025, 6, 20),
            payment_method: "check".into(),
            bank_account: None,
            status: SettlementStatus::Settled,
        });
    }
}

use serde::{Deserialize, Serialize};

// 金额值对象
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Money {
    pub amount: rust_decimal::Decimal,
    pub currency: String, // CNY/USD
}

// 账龄区间
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgingBucket {
    pub label: String, // "0-30天"
    pub min_days: i32,
    pub max_days: Option<i32>,
    pub amount: f64,
}

// 凭证状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VoucherStatus {
    Draft,
    Submitted,
    Approved,
    Posted,
    Reversed,
}

// 收付款状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SettlementStatus {
    Unsettled,        // 未核销
    PartiallySettled, // 部分核销
    Settled,          // 已核销
    WrittenOff,       // 已核销关闭
}

// 业务日期范围
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateRange {
    pub start: chrono::NaiveDate,
    pub end: chrono::NaiveDate,
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

    #[test] fn rt_money_cny() { roundtrip(&Money { amount: rust_decimal::Decimal::from(999), currency: "CNY".into() }); }
    #[test] fn rt_money_zero() { roundtrip(&Money { amount: rust_decimal::Decimal::from(0), currency: "USD".into() }); }
    #[test] fn rt_aging_bucket_closed() { roundtrip(&AgingBucket { label: "0-30天".into(), min_days: 0, max_days: Some(30), amount: 1000.0 }); }
    #[test] fn rt_aging_bucket_open() { roundtrip(&AgingBucket { label: "90+天".into(), min_days: 90, max_days: None, amount: 500.0 }); }
    #[test] fn rt_voucher_status_draft()     { roundtrip(&VoucherStatus::Draft); }
    #[test] fn rt_voucher_status_submitted() { roundtrip(&VoucherStatus::Submitted); }
    #[test] fn rt_voucher_status_approved()  { roundtrip(&VoucherStatus::Approved); }
    #[test] fn rt_voucher_status_posted()    { roundtrip(&VoucherStatus::Posted); }
    #[test] fn rt_voucher_status_reversed()  { roundtrip(&VoucherStatus::Reversed); }
    #[test] fn rt_settlement_status_unsettled()   { roundtrip(&SettlementStatus::Unsettled); }
    #[test] fn rt_settlement_status_partial()     { roundtrip(&SettlementStatus::PartiallySettled); }
    #[test] fn rt_settlement_status_settled()     { roundtrip(&SettlementStatus::Settled); }
    #[test] fn rt_settlement_status_written_off() { roundtrip(&SettlementStatus::WrittenOff); }
    #[test] fn rt_date_range() {
        roundtrip(&DateRange {
            start: chrono::NaiveDate::from_ymd_opt(2025, 1, 1).unwrap(),
            end: chrono::NaiveDate::from_ymd_opt(2025, 12, 31).unwrap(),
        });
    }
}

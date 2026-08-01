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

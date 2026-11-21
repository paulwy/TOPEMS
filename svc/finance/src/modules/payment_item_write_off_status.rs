//! 付款明细核销状态（W5-B B9）
//!
//! `finance.core_finance_payment_items.write_off_status` 是自由文本，DB 默认
//! `pending`，但没有任何 CHECK，也没有 Rust 类型；核销入口直接更新为
//! `completed` 且不校验起始状态，导致：
//!
//! - 可重复核销，后一次金额直接覆盖前一次；
//! - 负数核销金额可通过；
//! - `write_off_by` 列是 `uuid`，入口却绑定 `claims.username` 字符串，
//!   正常请求会在 SQL 参数类型上失败。
//!
//! 本模块把核销状态收敛为 `pending / completed`，NULL 视为 `pending`。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PaymentItemWriteOffStatus {
    Pending,
    Completed,
}

impl PaymentItemWriteOffStatus {
    pub const ALL: [Self; 2] = [Self::Pending, Self::Completed];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Completed => "completed",
        }
    }

    pub const fn can_write_off(self) -> bool {
        matches!(self, Self::Pending)
    }
}

impl fmt::Display for PaymentItemWriteOffStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for PaymentItemWriteOffStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        match raw.trim() {
            "pending" => Ok(Self::Pending),
            "completed" => Ok(Self::Completed),
            // 历史/同义写法，核销完成对外统一为 completed。
            "written_off" | "written-off" => Ok(Self::Completed),
            _ => Err(()),
        }
    }
}

/// NULL / 空串是历史别名 `pending`；未知值返回 `None`，由调用方拒绝，
/// 不静默归为 `pending` 放行核销。
pub fn normalize_write_off_status(raw: Option<&str>) -> Option<PaymentItemWriteOffStatus> {
    match raw.map(str::trim).filter(|s| !s.is_empty()) {
        Some(raw) => raw.parse().ok(),
        None => Some(PaymentItemWriteOffStatus::Pending),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_values_roundtrip() {
        for status in PaymentItemWriteOffStatus::ALL {
            assert_eq!(
                normalize_write_off_status(Some(status.as_str())),
                Some(status)
            );
        }
    }

    #[test]
    fn null_and_blank_are_pending() {
        assert_eq!(
            normalize_write_off_status(None),
            Some(PaymentItemWriteOffStatus::Pending)
        );
        assert_eq!(
            normalize_write_off_status(Some("  ")),
            Some(PaymentItemWriteOffStatus::Pending)
        );
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(
            normalize_write_off_status(Some("written_off")),
            Some(PaymentItemWriteOffStatus::Completed)
        );
        assert_eq!(normalize_write_off_status(Some("unknown")), None);
    }

    #[test]
    fn only_pending_can_write_off() {
        assert!(PaymentItemWriteOffStatus::Pending.can_write_off());
        assert!(!PaymentItemWriteOffStatus::Completed.can_write_off());
    }
}

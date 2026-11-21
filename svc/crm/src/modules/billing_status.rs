//! 账单状态：`crm.billing_records.status` 的唯一值源。
//!
//! 生命周期：pending → paid / overdue / cancelled；overdue → paid / cancelled；
//! paid、cancelled 为终态。收款核销仅允许 pending / overdue 进入 paid，paid 重复调用幂等。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BillingStatus {
    Pending,
    Paid,
    Overdue,
    Cancelled,
}

impl BillingStatus {
    pub const DB_VALUES: [&'static str; 4] = ["pending", "paid", "overdue", "cancelled"];

    /// 新建账单的初始态
    pub const DEFAULT: Self = Self::Pending;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "paid" => Some(Self::Paid),
            "overdue" => Some(Self::Overdue),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Paid => "paid",
            Self::Overdue => "overdue",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Paid | Self::Cancelled)
    }

    /// 通用编辑允许的状态迁移；同值不视为迁移。
    pub fn can_transition(from: Self, to: Self) -> bool {
        matches!(
            (from, to),
            (Self::Pending, Self::Paid | Self::Overdue | Self::Cancelled)
                | (Self::Overdue, Self::Paid | Self::Cancelled)
        )
    }

    /// 收款核销起始态
    pub fn mark_paid_from() -> &'static [&'static str] {
        &["pending", "overdue"]
    }
}

impl std::fmt::Display for BillingStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in BillingStatus::DB_VALUES {
            assert_eq!(
                BillingStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(BillingStatus::from_db_str("bogus"), None);
        assert_eq!(BillingStatus::DEFAULT.as_db_str(), "pending");
        assert!(BillingStatus::can_transition(
            BillingStatus::Pending,
            BillingStatus::Paid
        ));
        assert!(!BillingStatus::can_transition(
            BillingStatus::Paid,
            BillingStatus::Pending
        ));
        assert!(BillingStatus::mark_paid_from().contains(&"overdue"));
    }
}

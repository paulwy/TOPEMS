//! 客户订单台账状态：`crm.customer_orders.status` 的唯一值源。
//!
//! 台账由 `SalesOrderCreated` 事件写入，状态来自 ERP 销售订单。
//! 历史 ERP 值 `confirmed` 在此规范化为 `approved`；未知值拒绝写库。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CustomerOrderStatus {
    Draft,
    Pending,
    Approved,
    Shipped,
    Completed,
    Cancelled,
}

impl CustomerOrderStatus {
    pub const DB_VALUES: [&'static str; 6] = [
        "draft",
        "pending",
        "approved",
        "shipped",
        "completed",
        "cancelled",
    ];

    pub const DEFAULT: Self = Self::Draft;

    /// 解析 ERP/事件状态；历史 `confirmed` 归一为 `approved`。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" => Some(Self::Pending),
            "approved" | "confirmed" => Some(Self::Approved),
            "shipped" => Some(Self::Shipped),
            "completed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Shipped => "shipped",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn is_terminal(self) -> bool {
        matches!(self, Self::Completed | Self::Cancelled)
    }

    /// 台账投影的参考迁移；写入侧只插入，不执行状态流转。
    #[must_use]
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        matches!(
            (self, target),
            (
                Self::Draft,
                Self::Pending | Self::Approved | Self::Cancelled
            ) | (Self::Pending, Self::Approved | Self::Cancelled)
                | (Self::Approved, Self::Shipped | Self::Cancelled)
                | (Self::Shipped, Self::Completed)
        )
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn customer_order_status_db_strings_roundtrip() {
        for raw in CustomerOrderStatus::DB_VALUES {
            assert_eq!(
                CustomerOrderStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(
            CustomerOrderStatus::from_db_str("confirmed").map(|v| v.as_db_str()),
            Some("approved")
        );
        assert_eq!(CustomerOrderStatus::from_db_str("void"), None);
        assert_eq!(CustomerOrderStatus::DEFAULT.as_db_str(), "draft");
        assert!(CustomerOrderStatus::Draft.can_transition_to(CustomerOrderStatus::Approved));
        assert!(CustomerOrderStatus::Approved.can_transition_to(CustomerOrderStatus::Shipped));
        assert!(CustomerOrderStatus::Shipped.can_transition_to(CustomerOrderStatus::Completed));
        assert!(!CustomerOrderStatus::Completed.can_transition_to(CustomerOrderStatus::Draft));
        assert!(CustomerOrderStatus::Cancelled.is_terminal());
    }
}

//! CRM 本地销售订单状态：`crm.sales_orders.status` 的唯一值源。
//!
//! 该表由 `ShippingOrderRequested` 事件投影写入，当前入口只在出库确认后建单，
//! 因此写入态固定为 `completed`；值集仍保留 ERP 销售订单全生命周期，供后续回写。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SalesOrderStatus {
    Draft,
    Pending,
    Approved,
    Shipped,
    Completed,
    Cancelled,
}

impl SalesOrderStatus {
    pub const DB_VALUES: [&'static str; 6] = [
        "draft",
        "pending",
        "approved",
        "shipped",
        "completed",
        "cancelled",
    ];

    /// 与 `crm.sales_orders.status` 列默认值保持一致。
    pub const DEFAULT: Self = Self::Pending;

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
    fn crm_sales_order_status_db_strings_roundtrip() {
        for raw in SalesOrderStatus::DB_VALUES {
            assert_eq!(
                SalesOrderStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(
            SalesOrderStatus::from_db_str("confirmed").map(|v| v.as_db_str()),
            Some("approved")
        );
        assert_eq!(SalesOrderStatus::from_db_str("void"), None);
        assert_eq!(SalesOrderStatus::DEFAULT.as_db_str(), "pending");
        assert!(SalesOrderStatus::Approved.can_transition_to(SalesOrderStatus::Shipped));
        assert!(SalesOrderStatus::Shipped.can_transition_to(SalesOrderStatus::Completed));
        assert!(!SalesOrderStatus::Completed.can_transition_to(SalesOrderStatus::Draft));
        assert!(SalesOrderStatus::Cancelled.is_terminal());
    }
}

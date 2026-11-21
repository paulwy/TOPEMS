//! 采购订单状态：`erp.purchase_orders.status` 的唯一值源。
//!
//! 与写入口、DB CHECK 候选共用同一集合；解析未知值返回 `None`，不静默归默认。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PurchaseOrderStatus {
    /// 新建待审批
    Pending,
    /// 已审批
    Approved,
    /// 已取消
    Cancelled,
}

impl PurchaseOrderStatus {
    /// `erp.purchase_orders.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 3] = ["pending", "approved", "cancelled"];

    /// 新建采购订单的默认状态
    pub const DEFAULT: Self = Self::Pending;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 写入 `erp.purchase_orders.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Cancelled => "cancelled",
        }
    }
}

impl std::fmt::Display for PurchaseOrderStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn purchase_order_status_db_strings_roundtrip() {
        for s in PurchaseOrderStatus::DB_VALUES {
            assert_eq!(
                PurchaseOrderStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
    }

    #[test]
    fn purchase_order_status_rejects_unknown() {
        assert_eq!(PurchaseOrderStatus::from_db_str("draft"), None);
        assert_eq!(PurchaseOrderStatus::from_db_str("shipped"), None);
        assert_eq!(
            PurchaseOrderStatus::from_db_str(" APPROVED "),
            Some(PurchaseOrderStatus::Approved)
        );
        assert_eq!(PurchaseOrderStatus::from_db_str(""), None);
    }
}

//! 采购订单状态唯一集合。
//!
//! 落库列：`scm.purchase_orders.status`（varchar，DB 默认 `draft`）。
//! 创建沿用既有契约写 `pending`；审批/驳回/确认/取消/关闭分别写
//! `approved / rejected / confirmed / cancelled / closed`。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PurchaseOrderStatus {
    Draft,
    Pending,
    Approved,
    Rejected,
    Confirmed,
    Cancelled,
    Closed,
    Completed,
}

impl PurchaseOrderStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 8] = [
        "draft",
        "pending",
        "approved",
        "rejected",
        "confirmed",
        "cancelled",
        "closed",
        "completed",
    ];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Confirmed => "confirmed",
            Self::Cancelled => "cancelled",
            Self::Closed => "closed",
            Self::Completed => "completed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "confirmed" => Some(Self::Confirmed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            "closed" => Some(Self::Closed),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in PurchaseOrderStatus::DB_VALUES {
            assert_eq!(
                PurchaseOrderStatus::from_db_str(raw).map(PurchaseOrderStatus::as_db_str),
                Some(raw)
            );
        }
        assert_eq!(PurchaseOrderStatus::from_db_str("bogus"), None);
        assert_eq!(PurchaseOrderStatus::DEFAULT.as_db_str(), "pending");
    }
}

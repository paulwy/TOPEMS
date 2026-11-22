//! 采购申请状态唯一集合。
//!
//! 落库列：`scm.purchase_requisitions.status`（varchar，DB 默认 `draft`）。
//! 创建写 `draft`；提交、审批通过、驳回、取消、转订单分别写
//! `pending / approved / rejected / cancelled / converted`。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PurchaseRequisitionStatus {
    Draft,
    Pending,
    Approved,
    Rejected,
    Cancelled,
    Converted,
}

impl PurchaseRequisitionStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 6] = [
        "draft",
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "converted",
    ];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Cancelled => "cancelled",
            Self::Converted => "converted",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            "converted" => Some(Self::Converted),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(PurchaseRequisitionStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(
            PurchaseRequisitionStatus::DB_VALUES,
            [
                "draft",
                "pending",
                "approved",
                "rejected",
                "cancelled",
                "converted"
            ]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in PurchaseRequisitionStatus::DB_VALUES {
            assert_eq!(
                PurchaseRequisitionStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(PurchaseRequisitionStatus::from_db_str("bogus"), None);
    }
}

//! 采购合同状态唯一集合。
//!
//! 落库列：`scm.purchase_contracts.status`（varchar，DB 默认 `draft`）。
//! 后端流转覆盖 `draft / pending / approved / rejected / cancelled /
//! terminated / expired`；`reviewing / signed` 由前端签约向导使用，一并纳入唯一集合。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PurchaseContractStatus {
    Draft,
    Pending,
    Reviewing,
    Approved,
    Rejected,
    Signed,
    Cancelled,
    Expired,
    Terminated,
}

impl PurchaseContractStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 9] = [
        "draft",
        "pending",
        "reviewing",
        "approved",
        "rejected",
        "signed",
        "cancelled",
        "expired",
        "terminated",
    ];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Reviewing => "reviewing",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Signed => "signed",
            Self::Cancelled => "cancelled",
            Self::Expired => "expired",
            Self::Terminated => "terminated",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" => Some(Self::Pending),
            "reviewing" => Some(Self::Reviewing),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "signed" => Some(Self::Signed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            "expired" => Some(Self::Expired),
            "terminated" => Some(Self::Terminated),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(PurchaseContractStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(
            PurchaseContractStatus::DB_VALUES,
            [
                "draft",
                "pending",
                "reviewing",
                "approved",
                "rejected",
                "signed",
                "cancelled",
                "expired",
                "terminated"
            ]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in PurchaseContractStatus::DB_VALUES {
            assert_eq!(
                PurchaseContractStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(PurchaseContractStatus::from_db_str("bogus"), None);
    }
}

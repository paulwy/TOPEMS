//! `finance.erp_receivables` / `finance.erp_payables` 的 `status` 唯一值源（W5-B / B325）。
//!
//! DB CHECK：`active / inactive / archived`；`archived` 为终态。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErpLedgerStatus {
    Active,
    Inactive,
    Archived,
}

impl ErpLedgerStatus {
    pub const DB_VALUES: [&'static str; 3] = ["active", "inactive", "archived"];
    pub const DEFAULT: Self = Self::Active;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Archived => "archived",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }

    /// active ↔ inactive，二者均可归档；archived 终态。
    #[must_use]
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        matches!(
            (self, target),
            (Self::Active, Self::Inactive | Self::Archived)
                | (Self::Inactive, Self::Active | Self::Archived)
        )
    }

    /// 仅停用/已归档台账可删除，活跃台账必须先停用。
    #[must_use]
    pub fn can_delete(self) -> bool {
        matches!(self, Self::Inactive | Self::Archived)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn values_roundtrip_and_unknown_rejected() {
        for value in ErpLedgerStatus::DB_VALUES {
            assert_eq!(
                ErpLedgerStatus::from_db_str(value).map(ErpLedgerStatus::as_str),
                Some(value)
            );
        }
        assert_eq!(ErpLedgerStatus::from_db_str("unpaid"), None);
    }

    #[test]
    fn lifecycle_and_delete_gate() {
        assert!(ErpLedgerStatus::Active.can_transition_to(ErpLedgerStatus::Inactive));
        assert!(ErpLedgerStatus::Inactive.can_transition_to(ErpLedgerStatus::Active));
        assert!(ErpLedgerStatus::Active.can_transition_to(ErpLedgerStatus::Archived));
        assert!(!ErpLedgerStatus::Archived.can_transition_to(ErpLedgerStatus::Active));
        assert!(!ErpLedgerStatus::Active.can_delete());
        assert!(ErpLedgerStatus::Inactive.can_delete());
        assert!(ErpLedgerStatus::Archived.can_delete());
    }
}

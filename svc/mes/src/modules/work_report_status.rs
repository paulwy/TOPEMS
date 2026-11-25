//! 生产报工状态唯一集合。
//!
//! 落库列：`mes.work_reports.status`（varchar，DB 默认 `pending`）。
//! 值集覆盖创建、审批、返工与归档，前端 schema 与类型联合统一到本集合。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WorkReportStatus {
    Draft,
    Submitted,
    Approved,
    Rejected,
    Reworking,
    Archived,
    Cancelled,
}

impl WorkReportStatus {
    pub const DEFAULT: Self = Self::Submitted;

    pub const DB_VALUES: [&'static str; 7] = [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "reworking",
        "archived",
        "cancelled",
    ];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Submitted => "submitted",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Reworking => "reworking",
            Self::Archived => "archived",
            Self::Cancelled => "cancelled",
        }
    }

    /// 可编辑/可提交的当前态：草稿、驳回、返工中。
    pub fn editable_from() -> &'static [&'static str] {
        &["draft", "rejected", "reworking"]
    }

    /// 可软删的当前态：草稿、驳回、已取消；已提交/已审批/已归档保留台账。
    pub fn deletable_from() -> &'static [&'static str] {
        &["draft", "rejected", "cancelled"]
    }

    /// 状态迁移：draft→submitted/cancelled；submitted→approved/rejected/cancelled；
    /// rejected→reworking/cancelled；reworking→submitted/cancelled；approved→archived；
    /// archived/cancelled 终态，同态幂等。
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        matches!(
            (self, target),
            (Self::Draft, Self::Submitted | Self::Cancelled)
                | (
                    Self::Submitted,
                    Self::Approved | Self::Rejected | Self::Cancelled
                )
                | (Self::Rejected, Self::Reworking | Self::Cancelled)
                | (Self::Reworking, Self::Submitted | Self::Cancelled)
                | (Self::Approved, Self::Archived)
        )
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "submitted" => Some(Self::Submitted),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "reworking" => Some(Self::Reworking),
            "archived" => Some(Self::Archived),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(WorkReportStatus::DEFAULT.as_db_str(), "submitted");
        assert_eq!(
            WorkReportStatus::DB_VALUES,
            [
                "draft",
                "submitted",
                "approved",
                "rejected",
                "reworking",
                "archived",
                "cancelled"
            ]
        );
    }

    #[test]
    fn lifecycle_and_sets_are_strict() {
        use WorkReportStatus::*;
        assert!(Draft.can_transition_to(Submitted));
        assert!(Submitted.can_transition_to(Approved));
        assert!(Submitted.can_transition_to(Rejected));
        assert!(Rejected.can_transition_to(Reworking));
        assert!(Reworking.can_transition_to(Submitted));
        assert!(Approved.can_transition_to(Archived));
        assert!(!Approved.can_transition_to(Submitted));
        assert!(!Archived.can_transition_to(Draft));
        assert!(!Cancelled.can_transition_to(Draft));
        assert_eq!(
            WorkReportStatus::editable_from(),
            &["draft", "rejected", "reworking"]
        );
        assert_eq!(
            WorkReportStatus::deletable_from(),
            &["draft", "rejected", "cancelled"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in WorkReportStatus::DB_VALUES {
            assert_eq!(
                WorkReportStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(WorkReportStatus::from_db_str("bogus"), None);
    }
}

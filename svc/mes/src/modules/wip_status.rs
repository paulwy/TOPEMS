//! 在制品（WIP）状态唯一集合。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WipStatus {
    Pending,
    InProgress,
    Completed,
    Transferred,
}

impl WipStatus {
    pub const DEFAULT: Self = Self::InProgress;

    pub const DB_VALUES: [&'static str; 4] = ["pending", "in_progress", "completed", "transferred"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Transferred => "transferred",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "transferred" => Some(Self::Transferred),
            _ => None,
        }
    }

    /// pending → in_progress；in_progress → completed / transferred；
    /// completed、transferred 为终态；同态幂等。
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        matches!(
            (self, target),
            (Self::Pending, Self::InProgress)
                | (Self::InProgress, Self::Completed | Self::Transferred)
        )
    }

    /// 仍可发生工序转移的活跃态。
    pub fn transferable_from() -> &'static [&'static str] {
        &["pending", "in_progress"]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(WipStatus::DEFAULT.as_db_str(), "in_progress");
        assert_eq!(
            WipStatus::DB_VALUES,
            ["pending", "in_progress", "completed", "transferred"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in WipStatus::DB_VALUES {
            assert_eq!(
                WipStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(WipStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn transition_and_transferable_matrix() {
        use WipStatus::*;
        assert!(Pending.can_transition_to(InProgress));
        assert!(!Pending.can_transition_to(Completed));
        assert!(InProgress.can_transition_to(Completed));
        assert!(InProgress.can_transition_to(Transferred));
        assert!(!Completed.can_transition_to(InProgress));
        assert_eq!(WipStatus::transferable_from(), &["pending", "in_progress"]);
    }
}

//! 生产记录状态唯一集合。
//!
//! 落库列：`mes.production_records.status`（varchar，DB 默认 `in_progress`）。
//! 值集与前端 `apps/web/src/schemas/mes/productionRecord.ts` 一致。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProductionRecordStatus {
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

impl ProductionRecordStatus {
    pub const DEFAULT: Self = Self::InProgress;

    pub const DB_VALUES: [&'static str; 4] = ["pending", "in_progress", "completed", "cancelled"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// pending → in_progress / cancelled；in_progress → completed / cancelled；
    /// completed、cancelled 为终态；同态幂等。
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        matches!(
            (self, target),
            (Self::Pending, Self::InProgress | Self::Cancelled)
                | (Self::InProgress, Self::Completed | Self::Cancelled)
        )
    }

    /// 可编辑/可软删的活跃态；completed/cancelled 不允许再改。
    pub fn editable_from() -> &'static [&'static str] {
        &["pending", "in_progress"]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(ProductionRecordStatus::DEFAULT.as_db_str(), "in_progress");
        assert_eq!(
            ProductionRecordStatus::DB_VALUES,
            ["pending", "in_progress", "completed", "cancelled"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in ProductionRecordStatus::DB_VALUES {
            assert_eq!(
                ProductionRecordStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(ProductionRecordStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn transition_and_editable_matrix() {
        use ProductionRecordStatus::*;
        assert!(Pending.can_transition_to(InProgress));
        assert!(InProgress.can_transition_to(Completed));
        assert!(!Pending.can_transition_to(Completed));
        assert!(!Completed.can_transition_to(InProgress));
        assert!(InProgress.can_transition_to(Cancelled));
        assert_eq!(
            ProductionRecordStatus::editable_from(),
            &["pending", "in_progress"]
        );
    }
}

//! 质量巡检状态唯一集合。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QualityPatrolStatus {
    Pending,
    InProgress,
    Completed,
}

impl QualityPatrolStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 3] = ["pending", "in_progress", "completed"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(QualityPatrolStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            QualityPatrolStatus::DB_VALUES,
            ["pending", "in_progress", "completed"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in QualityPatrolStatus::DB_VALUES {
            assert_eq!(
                QualityPatrolStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(QualityPatrolStatus::from_db_str("bogus"), None);
    }
}

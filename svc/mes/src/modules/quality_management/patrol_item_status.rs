//! 质量巡检项目状态唯一集合。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QualityPatrolItemStatus {
    Pending,
    Pass,
    Fail,
}

impl QualityPatrolItemStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 3] = ["pending", "pass", "fail"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Pass => "pass",
            Self::Fail => "fail",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "pass" => Some(Self::Pass),
            "fail" => Some(Self::Fail),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(QualityPatrolItemStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            QualityPatrolItemStatus::DB_VALUES,
            ["pending", "pass", "fail"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in QualityPatrolItemStatus::DB_VALUES {
            assert_eq!(
                QualityPatrolItemStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(QualityPatrolItemStatus::from_db_str("bogus"), None);
    }
}

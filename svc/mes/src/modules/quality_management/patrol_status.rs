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

    /// 允许编辑的状态：completed 为终态。
    pub const fn editable_from() -> &'static [&'static str] {
        &["pending", "in_progress"]
    }

    /// 允许软删的状态：已开始的巡检不再删除，保留过程记录。
    pub const DELETABLE: [&'static str; 1] = ["pending"];

    /// 更新守卫：pending → in_progress → completed，completed 封闭，禁止回退。
    pub fn can_update_from(self, target: Option<Self>) -> Result<(), &'static str> {
        if self == Self::Completed {
            return Err("巡检已完成，不可再编辑");
        }
        let Some(to) = target else {
            return Ok(());
        };
        if to == self {
            return Ok(());
        }
        match (self, to) {
            (Self::Pending, Self::InProgress) => Ok(()),
            (Self::InProgress, Self::Completed) => Ok(()),
            (_, Self::Pending) => Err("巡检状态不允许回退到 pending"),
            _ => Err("巡检状态流转不合法"),
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
    fn lifecycle_is_strict() {
        assert!(QualityPatrolStatus::Pending
            .can_update_from(Some(QualityPatrolStatus::InProgress))
            .is_ok());
        assert!(QualityPatrolStatus::InProgress
            .can_update_from(Some(QualityPatrolStatus::Completed))
            .is_ok());
        assert!(QualityPatrolStatus::Completed
            .can_update_from(None)
            .is_err());
        assert!(QualityPatrolStatus::Pending
            .can_update_from(Some(QualityPatrolStatus::Completed))
            .is_err());
        assert_eq!(QualityPatrolStatus::DELETABLE, ["pending"]);
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

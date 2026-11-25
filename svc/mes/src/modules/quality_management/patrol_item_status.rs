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

    /// 允许编辑/软删的状态：pass/fail 为终态判定。
    pub const fn editable_from() -> &'static [&'static str] {
        &["pending"]
    }

    pub const DELETABLE: [&'static str; 1] = ["pending"];

    /// 更新守卫：pending 可判定为 pass/fail；终态封闭，禁止回退。
    pub fn can_update_from(self, target: Option<Self>) -> Result<(), &'static str> {
        if matches!(self, Self::Pass | Self::Fail) {
            return Err("巡检项目已判定，不可再编辑");
        }
        let Some(to) = target else {
            return Ok(());
        };
        if to == self {
            return Ok(());
        }
        match to {
            Self::Pass | Self::Fail => Ok(()),
            Self::Pending => Err("巡检项目状态不允许回退到 pending"),
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
    fn lifecycle_is_strict() {
        assert!(QualityPatrolItemStatus::Pending
            .can_update_from(Some(QualityPatrolItemStatus::Pass))
            .is_ok());
        assert!(QualityPatrolItemStatus::Pass.can_update_from(None).is_err());
        assert!(QualityPatrolItemStatus::Fail
            .can_update_from(Some(QualityPatrolItemStatus::Pending))
            .is_err());
        assert_eq!(QualityPatrolItemStatus::DELETABLE, ["pending"]);
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

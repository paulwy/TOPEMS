//! 培训计划状态：`hrm.training_plans.status` 的唯一值源。
//!
//! active ↔ inactive 可互相切换，两者都可进入 completed；completed 为终态。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrainingPlanStatus {
    Active,
    Inactive,
    Completed,
    Archived,
}

impl TrainingPlanStatus {
    /// `hrm.training_plans.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["active", "inactive", "completed", "archived"];

    /// 新建计划的初始态，与列默认值一致
    pub const DEFAULT: Self = Self::Active;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "active" | "enabled" | "in_progress" => Some(Self::Active),
            "inactive" | "disabled" | "paused" => Some(Self::Inactive),
            "completed" | "done" | "finished" => Some(Self::Completed),
            "archived" | "archive" => Some(Self::Archived),
            _ => None,
        }
    }

    /// 写入 `hrm.training_plans.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Completed => "completed",
            Self::Archived => "archived",
        }
    }

    /// 归一化：未知值返回 `None`
    pub fn normalize(raw: &str) -> Option<&'static str> {
        Self::from_db_str(raw).map(|v| v.as_db_str())
    }

    /// 列表过滤参数解析
    pub fn parse_filter(raw: &str) -> Option<&'static str> {
        Self::normalize(raw)
    }

    /// 是否允许从 `from` 流转到 `self`
    pub fn can_transition_from(&self, from: &str) -> bool {
        let Some(current) = Self::from_db_str(from) else {
            return false;
        };
        if *self == current {
            return true;
        }
        match current {
            Self::Active => matches!(self, Self::Inactive | Self::Completed | Self::Archived),
            Self::Inactive => matches!(self, Self::Active | Self::Completed | Self::Archived),
            Self::Completed | Self::Archived => false,
        }
    }

    /// completed / archived 为终态
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Archived)
    }
}

impl std::fmt::Display for TrainingPlanStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for TrainingPlanStatus {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(s).ok_or(())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in TrainingPlanStatus::DB_VALUES {
            assert_eq!(
                TrainingPlanStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(TrainingPlanStatus::from_db_str("bogus"), None);
        assert_eq!(TrainingPlanStatus::DEFAULT.as_db_str(), "active");
        assert_eq!(TrainingPlanStatus::normalize("disabled"), Some("inactive"));
        assert_eq!(TrainingPlanStatus::parse_filter("done"), Some("completed"));
        assert_eq!(TrainingPlanStatus::parse_filter("bogus"), None);
    }

    #[test]
    fn transitions_respect_terminal_state() {
        assert!(TrainingPlanStatus::Inactive.can_transition_from("active"));
        assert!(TrainingPlanStatus::Active.can_transition_from("inactive"));
        assert!(TrainingPlanStatus::Completed.can_transition_from("active"));
        assert!(TrainingPlanStatus::Completed.can_transition_from("inactive"));
        assert!(!TrainingPlanStatus::Active.can_transition_from("completed"));
        assert!(!TrainingPlanStatus::Inactive.can_transition_from("completed"));
        assert!(TrainingPlanStatus::Archived.can_transition_from("active"));
        assert!(TrainingPlanStatus::Archived.can_transition_from("inactive"));
        assert!(!TrainingPlanStatus::Archived.can_transition_from("completed"));
        assert!(!TrainingPlanStatus::Completed.can_transition_from("bogus"));
        assert!(TrainingPlanStatus::Completed.is_terminal());
        assert!(TrainingPlanStatus::Archived.is_terminal());
        assert!(!TrainingPlanStatus::Active.is_terminal());
    }
}

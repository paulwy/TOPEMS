//! 应急演练（ehs.qa_ehs_drill_plans / ehs.qa_ehs_drill_records）状态唯一集合。
//!
//! 落库列：
//! - `ehs.qa_ehs_drill_plans.status`（varchar，DB 默认 `planned`）
//! - `ehs.qa_ehs_drill_records.status`（varchar，DB 默认 `in_progress`）
//! 本地 plan 3 行均 planned；record 1 行 in_progress。计划当前只创建不流转，
//! 记录创建写 in_progress，更新只能向前到 completed 或取消。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DrillPlanStatus {
    Planned,
    Completed,
    Cancelled,
}

impl DrillPlanStatus {
    pub const DEFAULT: Self = Self::Planned;

    pub const DB_VALUES: &'static [&'static str] = &["planned", "completed", "cancelled"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Planned => "planned",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "planned" => Some(Self::Planned),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DrillRecordStatus {
    InProgress,
    Completed,
    Cancelled,
}

impl DrillRecordStatus {
    pub const DEFAULT: Self = Self::InProgress;

    pub const DB_VALUES: &'static [&'static str] = &["in_progress", "completed", "cancelled"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// completed / cancelled 为终态，不允许回退。
    #[must_use]
    pub fn update_from(target: Self) -> &'static [Self] {
        match target {
            Self::InProgress => &[Self::InProgress],
            Self::Completed => &[Self::InProgress, Self::Completed],
            Self::Cancelled => &[Self::InProgress, Self::Cancelled],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plan_roundtrip() {
        for raw in DrillPlanStatus::DB_VALUES {
            let parsed = DrillPlanStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(DrillPlanStatus::from_db_str("scheduled"), None);
        assert_eq!(DrillPlanStatus::DEFAULT.as_db_str(), "planned");
    }

    #[test]
    fn record_roundtrip_and_no_backward() {
        for raw in DrillRecordStatus::DB_VALUES {
            let parsed = DrillRecordStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(DrillRecordStatus::from_db_str("planned"), None);
        assert_eq!(DrillRecordStatus::DEFAULT.as_db_str(), "in_progress");
        assert_eq!(
            DrillRecordStatus::update_from(DrillRecordStatus::Completed),
            &[DrillRecordStatus::InProgress, DrillRecordStatus::Completed]
        );
        assert_eq!(
            DrillRecordStatus::update_from(DrillRecordStatus::Cancelled),
            &[DrillRecordStatus::InProgress, DrillRecordStatus::Cancelled]
        );
    }
}

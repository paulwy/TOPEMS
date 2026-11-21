//! 物料领用单状态唯一集合。
//!
//! 落库列：`mes.material_issues.status`（varchar，DB 默认 `pending`）。
//! 创建 pending；发料完成 completed；本地 0 行。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MaterialIssueStatus {
    Pending,
    Completed,
}

impl MaterialIssueStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: &'static [&'static str] = &["pending", "completed"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Completed => "completed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "pending" => Some(Self::Pending),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }

    /// 编辑接口按目标态限制起始态：completed 只能从 pending 进入，不可回退。
    #[must_use]
    pub fn update_from(self) -> &'static [Self] {
        match self {
            Self::Pending => &[Self::Pending],
            Self::Completed => &[Self::Pending, Self::Completed],
        }
    }

    #[must_use]
    pub fn db_values(states: &[Self]) -> Vec<&'static str> {
        states.iter().map(|s| s.as_db_str()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in MaterialIssueStatus::DB_VALUES {
            assert_eq!(
                MaterialIssueStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(*raw)
            );
        }
        assert_eq!(MaterialIssueStatus::from_db_str("issued"), None);
        assert_eq!(MaterialIssueStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn completed_is_terminal_forward_only() {
        assert_eq!(MaterialIssueStatus::Pending.update_from().len(), 1);
        assert!(MaterialIssueStatus::Completed
            .update_from()
            .contains(&MaterialIssueStatus::Pending));
    }
}

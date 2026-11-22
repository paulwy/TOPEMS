//! 交互记录状态：`crm.interactions.status` 的唯一值源。
//!
//! 创建入口固定落 `scheduled`；更新入口原样透传任意字符串。
//! 本地存在 1 行历史 `in_progress`，作为可读的进行中状态保留。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InteractionStatus {
    /// 已计划，尚未开始
    Scheduled,
    /// 进行中（历史/手工写入）
    InProgress,
    /// 已完成，终态
    Completed,
    /// 已取消，终态
    Cancelled,
}

impl InteractionStatus {
    pub const DB_VALUES: [&'static str; 4] = ["scheduled", "in_progress", "completed", "cancelled"];

    pub const DEFAULT: Self = Self::Scheduled;

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "scheduled" => Some(Self::Scheduled),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Scheduled => "scheduled",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn is_terminal(self) -> bool {
        matches!(self, Self::Completed | Self::Cancelled)
    }

    /// 迁移：scheduled ↔ in_progress；scheduled/in_progress → completed/cancelled；终态不可回退。
    #[must_use]
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        matches!(
            (self, target),
            (
                Self::Scheduled,
                Self::InProgress | Self::Completed | Self::Cancelled
            ) | (Self::InProgress, Self::Completed | Self::Cancelled)
        )
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn interaction_status_db_strings_roundtrip() {
        for raw in InteractionStatus::DB_VALUES {
            assert_eq!(
                InteractionStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(InteractionStatus::from_db_str("no_show"), None);
        assert_eq!(InteractionStatus::DEFAULT.as_db_str(), "scheduled");
        assert!(InteractionStatus::Scheduled.can_transition_to(InteractionStatus::InProgress));
        assert!(InteractionStatus::Scheduled.can_transition_to(InteractionStatus::Completed));
        assert!(InteractionStatus::InProgress.can_transition_to(InteractionStatus::Completed));
        assert!(InteractionStatus::InProgress.can_transition_to(InteractionStatus::Cancelled));
        assert!(!InteractionStatus::Completed.can_transition_to(InteractionStatus::Scheduled));
        assert!(!InteractionStatus::Cancelled.can_transition_to(InteractionStatus::Scheduled));
        assert!(InteractionStatus::Completed.is_terminal());
        assert!(InteractionStatus::Cancelled.is_terminal());
    }
}

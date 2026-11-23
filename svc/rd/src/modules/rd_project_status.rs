//! RD 关联项目状态：`rs.rs_projects.status` 的唯一值源。
//!
//! 该表由 PM 项目事件维护，不对外提供 CRUD；生命周期为
//! pending → in_progress → completed / cancelled。completed 与 cancelled 为终态。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RdProjectStatus {
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

impl RdProjectStatus {
    pub const DB_VALUES: [&'static str; 4] = ["pending", "in_progress", "completed", "cancelled"];

    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
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
            "in_progress" | "in-progress" | "inprogress" => Some(Self::InProgress),
            "completed" | "done" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    #[must_use]
    pub fn normalize(raw: &str) -> Option<&'static str> {
        Self::from_db_str(raw).map(|v| v.as_db_str())
    }

    #[must_use]
    pub fn is_terminal(self) -> bool {
        matches!(self, Self::Completed | Self::Cancelled)
    }

    #[must_use]
    pub fn can_transition_to(self, target: Self) -> bool {
        match self {
            Self::Pending => matches!(target, Self::InProgress | Self::Completed | Self::Cancelled),
            Self::InProgress => matches!(target, Self::Completed | Self::Cancelled),
            Self::Completed | Self::Cancelled => false,
        }
    }
}

impl std::fmt::Display for RdProjectStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in RdProjectStatus::DB_VALUES {
            assert_eq!(
                RdProjectStatus::from_db_str(raw).map(RdProjectStatus::as_db_str),
                Some(raw)
            );
        }
        assert_eq!(RdProjectStatus::from_db_str("bogus"), None);
        assert_eq!(RdProjectStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            RdProjectStatus::normalize("In-Progress"),
            Some("in_progress")
        );
    }

    #[test]
    fn transitions_follow_lifecycle() {
        assert!(RdProjectStatus::Pending.can_transition_to(RdProjectStatus::InProgress));
        assert!(RdProjectStatus::Pending.can_transition_to(RdProjectStatus::Completed));
        assert!(RdProjectStatus::Pending.can_transition_to(RdProjectStatus::Cancelled));
        assert!(RdProjectStatus::InProgress.can_transition_to(RdProjectStatus::Completed));
        assert!(!RdProjectStatus::InProgress.can_transition_to(RdProjectStatus::Pending));
        assert!(!RdProjectStatus::Completed.can_transition_to(RdProjectStatus::Pending));
        assert!(!RdProjectStatus::Cancelled.can_transition_to(RdProjectStatus::Completed));
        assert!(RdProjectStatus::Completed.is_terminal());
    }
}

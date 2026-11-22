//! 实验室安全检测任务状态（`lims.lims_safety_tasks.status`）唯一集合。
//! 当前由 EHS 隐患事件创建为 pending；后续允许 in_progress/completed/cancelled。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SafetyTaskStatus {
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

impl SafetyTaskStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 4] = ["pending", "in_progress", "completed", "cancelled"];

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
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in SafetyTaskStatus::DB_VALUES {
            let parsed = SafetyTaskStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(SafetyTaskStatus::from_db_str("done"), None);
        assert_eq!(SafetyTaskStatus::DEFAULT.as_db_str(), "pending");
    }
}

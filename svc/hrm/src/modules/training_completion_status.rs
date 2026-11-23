//! 培训完成状态：`hrm.training_records.completion_status` 的唯一值源。
//!
//! 生命周期：in_progress → completed / failed；failed 可回到 in_progress 重新培训，completed 为终态。
//! 列表接口声明的 `status` 过滤此前被忽略，本批按该列落地。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrainingCompletionStatus {
    InProgress,
    Completed,
    Failed,
}

impl TrainingCompletionStatus {
    /// `hrm.training_records.completion_status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 3] = ["in_progress", "completed", "failed"];

    /// 报名/新建记录的初始态
    pub const DEFAULT: Self = Self::InProgress;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "in_progress" | "in-progress" | "pending" | "not_started" | "registered" => {
                Some(Self::InProgress)
            }
            "completed" | "done" | "passed" => Some(Self::Completed),
            "failed" | "fail" | "not_passed" => Some(Self::Failed),
            _ => None,
        }
    }

    /// 写入 `hrm.training_records.completion_status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Failed => "failed",
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
            Self::InProgress => matches!(self, Self::Completed | Self::Failed),
            Self::Failed => matches!(self, Self::InProgress),
            Self::Completed => false,
        }
    }

    /// completed 为终态
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed)
    }
}

impl std::fmt::Display for TrainingCompletionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for TrainingCompletionStatus {
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
        for raw in TrainingCompletionStatus::DB_VALUES {
            assert_eq!(
                TrainingCompletionStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(TrainingCompletionStatus::from_db_str("bogus"), None);
        assert_eq!(TrainingCompletionStatus::DEFAULT.as_db_str(), "in_progress");
        assert_eq!(
            TrainingCompletionStatus::normalize("DONE"),
            Some("completed")
        );
        assert_eq!(
            TrainingCompletionStatus::parse_filter("pending"),
            Some("in_progress")
        );
        assert_eq!(TrainingCompletionStatus::parse_filter("bogus"), None);
    }

    #[test]
    fn transitions_follow_training_lifecycle() {
        assert!(TrainingCompletionStatus::Completed.can_transition_from("in_progress"));
        assert!(TrainingCompletionStatus::Failed.can_transition_from("in_progress"));
        assert!(TrainingCompletionStatus::InProgress.can_transition_from("failed"));
        assert!(TrainingCompletionStatus::Completed.can_transition_from("completed"));
        assert!(!TrainingCompletionStatus::InProgress.can_transition_from("completed"));
        assert!(!TrainingCompletionStatus::Failed.can_transition_from("completed"));
        assert!(!TrainingCompletionStatus::Completed.can_transition_from("bogus"));
        assert!(TrainingCompletionStatus::Completed.is_terminal());
        assert!(!TrainingCompletionStatus::Failed.is_terminal());
    }
}

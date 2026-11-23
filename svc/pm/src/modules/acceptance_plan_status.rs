//! 验收计划状态：`pm.acceptance_plans.status` 的唯一值源。
//!
//! 生命周期：pending → in_progress → completed；pending/in_progress 可取消。
//! completed / cancelled 为终态，计划要素不可再改。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AcceptancePlanStatus {
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

impl AcceptancePlanStatus {
    /// `pm.acceptance_plans.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["pending", "in_progress", "completed", "cancelled"];

    /// 新建验收计划的初始态
    pub const DEFAULT: Self = Self::Pending;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" | "new" | "planned" => Some(Self::Pending),
            "in_progress" | "in-progress" | "active" | "running" => Some(Self::InProgress),
            "completed" | "done" | "passed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 写入 `pm.acceptance_plans.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
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
            Self::Pending => matches!(self, Self::InProgress | Self::Cancelled),
            Self::InProgress => matches!(self, Self::Completed | Self::Cancelled),
            Self::Completed | Self::Cancelled => false,
        }
    }

    /// 终态：completed / cancelled
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Cancelled)
    }
}

impl std::fmt::Display for AcceptancePlanStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for AcceptancePlanStatus {
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
        for raw in AcceptancePlanStatus::DB_VALUES {
            assert_eq!(
                AcceptancePlanStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(AcceptancePlanStatus::from_db_str("bogus"), None);
        assert_eq!(AcceptancePlanStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            AcceptancePlanStatus::normalize("RUNNING"),
            Some("in_progress")
        );
        assert_eq!(
            AcceptancePlanStatus::parse_filter("done"),
            Some("completed")
        );
        assert_eq!(AcceptancePlanStatus::parse_filter("bogus"), None);
    }

    #[test]
    fn transitions_follow_plan_lifecycle() {
        assert!(AcceptancePlanStatus::InProgress.can_transition_from("pending"));
        assert!(AcceptancePlanStatus::Cancelled.can_transition_from("pending"));
        assert!(AcceptancePlanStatus::Completed.can_transition_from("in_progress"));
        assert!(AcceptancePlanStatus::Cancelled.can_transition_from("in_progress"));
        assert!(AcceptancePlanStatus::Completed.can_transition_from("completed"));
        assert!(!AcceptancePlanStatus::Completed.can_transition_from("pending"));
        assert!(!AcceptancePlanStatus::Pending.can_transition_from("completed"));
        assert!(!AcceptancePlanStatus::InProgress.can_transition_from("cancelled"));
        assert!(!AcceptancePlanStatus::Pending.can_transition_from("bogus"));
        assert!(AcceptancePlanStatus::Completed.is_terminal());
        assert!(AcceptancePlanStatus::Cancelled.is_terminal());
        assert!(!AcceptancePlanStatus::InProgress.is_terminal());
    }
}

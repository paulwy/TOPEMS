//! 审核计划状态：`qms.qa_audit_plans.status` 的唯一值源。
//!
//! 生命周期与 `crate::shared::fsm::AUDIT_PLAN` 一致：
//! draft → scheduled → in_progress → completed；draft/scheduled/in_progress 可取消。
//! `/schedule` 补上此前缺失的 draft → scheduled 入口，`/start` 只接受 scheduled，
//! `/complete` 只接受 in_progress。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditPlanStatus {
    Draft,
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
}

impl AuditPlanStatus {
    /// `qms.qa_audit_plans.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 5] = [
        "draft",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
    ];

    /// 新建审核计划的初始态
    pub const DEFAULT: Self = Self::Draft;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" | "new" | "planning" => Some(Self::Draft),
            "scheduled" | "planned" => Some(Self::Scheduled),
            "in_progress" | "in-progress" | "running" => Some(Self::InProgress),
            "completed" | "done" | "closed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 写入 `qms.qa_audit_plans.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Scheduled => "scheduled",
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

    /// 是否允许从 `from` 流转到 `self`；以共享 FSM 为唯一裁决
    pub fn can_transition_from(&self, from: &str) -> bool {
        Self::from_db_str(from).is_some()
            && crate::shared::fsm::audit_plan_can_transition(from, self.as_db_str()).is_ok()
    }

    /// 终态：completed / cancelled
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Cancelled)
    }
}

impl std::fmt::Display for AuditPlanStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for AuditPlanStatus {
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
        for raw in AuditPlanStatus::DB_VALUES {
            assert_eq!(
                AuditPlanStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(AuditPlanStatus::from_db_str("bogus"), None);
        assert_eq!(AuditPlanStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(AuditPlanStatus::normalize("RUNNING"), Some("in_progress"));
        assert_eq!(AuditPlanStatus::parse_filter("planned"), Some("scheduled"));
        assert_eq!(AuditPlanStatus::parse_filter("bogus"), None);
    }

    #[test]
    fn transitions_match_shared_fsm() {
        assert!(AuditPlanStatus::Scheduled.can_transition_from("draft"));
        assert!(AuditPlanStatus::Cancelled.can_transition_from("draft"));
        assert!(AuditPlanStatus::InProgress.can_transition_from("scheduled"));
        assert!(AuditPlanStatus::Completed.can_transition_from("in_progress"));
        assert!(AuditPlanStatus::Cancelled.can_transition_from("in_progress"));
        assert!(!AuditPlanStatus::InProgress.can_transition_from("draft"));
        assert!(!AuditPlanStatus::Completed.can_transition_from("scheduled"));
        assert!(!AuditPlanStatus::InProgress.can_transition_from("completed"));
        assert!(!AuditPlanStatus::Completed.can_transition_from("bogus"));
        assert!(AuditPlanStatus::Completed.is_terminal());
        assert!(AuditPlanStatus::Cancelled.is_terminal());
        assert!(!AuditPlanStatus::InProgress.is_terminal());
    }
}

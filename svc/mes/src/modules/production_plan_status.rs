//! 生产计划状态：`mes.production_plans.status` 的唯一值源。
//!
//! 生命周期沿用 `shared::aps_fsm::PRODUCTION_PLAN`：
//! draft → pending_approval → approved → in_progress → completed；cancelled 为终态。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProductionPlanStatus {
    Draft,
    PendingApproval,
    Approved,
    InProgress,
    Completed,
    Cancelled,
}

impl ProductionPlanStatus {
    /// `mes.production_plans.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 6] = [
        "draft",
        "pending_approval",
        "approved",
        "in_progress",
        "completed",
        "cancelled",
    ];

    /// 新建生产计划的初始态
    pub const DEFAULT: Self = Self::Draft;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending_approval" => Some(Self::PendingApproval),
            "approved" => Some(Self::Approved),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 写入 `mes.production_plans.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::PendingApproval => "pending_approval",
            Self::Approved => "approved",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    /// 提交审批：仅 draft
    pub fn submit_from() -> &'static [&'static str] {
        &["draft"]
    }

    /// 审批通过：仅 pending_approval
    pub fn approve_from() -> &'static [&'static str] {
        &["pending_approval"]
    }

    /// 驳回：仅 pending_approval
    pub fn reject_from() -> &'static [&'static str] {
        &["pending_approval"]
    }
}

impl std::fmt::Display for ProductionPlanStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in ProductionPlanStatus::DB_VALUES {
            assert_eq!(
                ProductionPlanStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(ProductionPlanStatus::from_db_str("bogus"), None);
        assert_eq!(ProductionPlanStatus::DEFAULT.as_db_str(), "draft");
        assert!(ProductionPlanStatus::submit_from().contains(&"draft"));
        assert!(ProductionPlanStatus::approve_from().contains(&"pending_approval"));
        assert!(ProductionPlanStatus::reject_from().contains(&"pending_approval"));
    }
}

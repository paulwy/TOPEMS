//! 决算状态：`pm.settlements.status` 的唯一值源。
//!
//! 生命周期：draft → pending → approved；approved 为终态。
//! rejected 保留为历史/外部拒绝值，允许退回 draft 重新提交。
//! 审批入口只接受 draft / pending，与 `handle_settlement_approved` 的来源条件一致。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectSettlementStatus {
    Draft,
    Pending,
    Approved,
    Rejected,
}

impl ProjectSettlementStatus {
    /// `pm.settlements.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["draft", "pending", "approved", "rejected"];

    /// 新建决算的初始态
    pub const DEFAULT: Self = Self::Draft;

    /// 审批动作允许的来源状态
    pub const APPROVE_FROM: [&'static str; 2] = ["draft", "pending"];

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" | "new" => Some(Self::Draft),
            "pending" | "submitted" | "pending_approval" => Some(Self::Pending),
            "approved" | "passed" | "confirmed" => Some(Self::Approved),
            "rejected" | "denied" => Some(Self::Rejected),
            _ => None,
        }
    }

    /// 写入 `pm.settlements.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
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

    /// 更新接口允许的流转：draft ↔ pending，rejected → draft；approved 不可再改。
    pub fn can_transition_from(&self, from: &str) -> bool {
        let Some(current) = Self::from_db_str(from) else {
            return false;
        };
        if *self == current {
            return true;
        }
        match current {
            Self::Draft => matches!(self, Self::Pending),
            Self::Pending => matches!(self, Self::Draft),
            Self::Rejected => matches!(self, Self::Draft),
            Self::Approved => false,
        }
    }

    /// 审批入口：仅 draft / pending 可进入 approved
    pub fn can_approve_from(&self, from: &str) -> bool {
        *self == Self::Approved
            && matches!(
                Self::from_db_str(from),
                Some(Self::Draft) | Some(Self::Pending)
            )
    }

    /// 已审批为终态，金额与要素不可再改
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Approved)
    }

    pub fn is_approved(&self) -> bool {
        matches!(self, Self::Approved)
    }
}

impl std::fmt::Display for ProjectSettlementStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for ProjectSettlementStatus {
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
        for raw in ProjectSettlementStatus::DB_VALUES {
            assert_eq!(
                ProjectSettlementStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(ProjectSettlementStatus::from_db_str("bogus"), None);
        assert_eq!(ProjectSettlementStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(
            ProjectSettlementStatus::normalize("SUBMITTED"),
            Some("pending")
        );
        assert_eq!(
            ProjectSettlementStatus::parse_filter("passed"),
            Some("approved")
        );
        assert_eq!(ProjectSettlementStatus::parse_filter("bogus"), None);
    }

    #[test]
    fn transitions_block_post_approval_changes() {
        assert!(ProjectSettlementStatus::Pending.can_transition_from("draft"));
        assert!(ProjectSettlementStatus::Draft.can_transition_from("pending"));
        assert!(ProjectSettlementStatus::Draft.can_transition_from("rejected"));
        assert!(ProjectSettlementStatus::Approved.can_transition_from("approved"));
        assert!(!ProjectSettlementStatus::Approved.can_transition_from("pending"));
        assert!(!ProjectSettlementStatus::Pending.can_transition_from("approved"));
        assert!(!ProjectSettlementStatus::Draft.can_transition_from("bogus"));
        assert!(ProjectSettlementStatus::Approved.is_terminal());
        assert!(!ProjectSettlementStatus::Pending.is_terminal());
    }

    #[test]
    fn approval_only_from_draft_or_pending() {
        assert!(ProjectSettlementStatus::Approved.can_approve_from("draft"));
        assert!(ProjectSettlementStatus::Approved.can_approve_from("pending"));
        assert!(!ProjectSettlementStatus::Approved.can_approve_from("approved"));
        assert!(!ProjectSettlementStatus::Approved.can_approve_from("rejected"));
        assert!(!ProjectSettlementStatus::Approved.can_approve_from("bogus"));
    }
}

//! 客户审批状态：`crm.customers.approval_status` 的唯一值源。
//!
//! 生命周期：none（未提交）→ pending（审批中）→ approved（通过）或 rejected（驳回）；
//! rejected 可重新提交进入 pending。DB 默认 `none`，本地 301 行全部 `none`。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CustomerApprovalStatus {
    /// 未提交审批
    None,
    /// 审批中
    Pending,
    /// 审批通过
    Approved,
    /// 已驳回
    Rejected,
}

impl CustomerApprovalStatus {
    /// `crm.customers.approval_status` 允许的唯一集合
    pub const DB_VALUES: &'static [&'static str] = &["none", "pending", "approved", "rejected"];

    /// 新建客户的默认态（与 DB 默认一致）
    pub const DEFAULT: Self = Self::None;

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "none" => Some(Self::None),
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            _ => None,
        }
    }

    /// 启动审批允许的起始态：未提交或上次被驳回后重提。
    #[must_use]
    pub fn start_from(self) -> &'static [Self] {
        &[Self::None, Self::Rejected]
    }

    /// 通过/驳回只允许从审批中流转。
    #[must_use]
    pub fn decide_from(self) -> &'static [Self] {
        &[Self::Pending]
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in CustomerApprovalStatus::DB_VALUES {
            let parsed = CustomerApprovalStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(CustomerApprovalStatus::from_db_str("bogus"), None);
        assert_eq!(CustomerApprovalStatus::DEFAULT.as_db_str(), "none");
    }

    #[test]
    fn transitions_are_canonical() {
        assert!(CustomerApprovalStatus::None
            .start_from()
            .contains(&CustomerApprovalStatus::None));
        assert!(CustomerApprovalStatus::Rejected
            .start_from()
            .contains(&CustomerApprovalStatus::Rejected));
        assert!(!CustomerApprovalStatus::Pending
            .start_from()
            .contains(&CustomerApprovalStatus::Pending));
        assert!(CustomerApprovalStatus::Approved
            .decide_from()
            .contains(&CustomerApprovalStatus::Pending));
    }
}

//! W5-B：费用审批/报销状态唯一口径（代码侧）
//!
//! DB 列 `finance.expense_approvals.status` 目前是自由文本，
//! 前端与后端各自写值。本模块先固定代码侧集合，接收入口统一经过 `normalize`，
//! 历史别名 `pending_approval` 归一为 `pending`。DB CHECK 待生产窗口再补。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExpenseApprovalStatus {
    Draft,
    Pending,
    Approved,
    Rejected,
    Reimbursed,
}

impl ExpenseApprovalStatus {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Reimbursed => "reimbursed",
        }
    }
}

/// 解析外部写入值；`pending_approval` 是历史前端别名，统一落 `pending`。
#[must_use]
pub fn normalize(raw: &str) -> Option<ExpenseApprovalStatus> {
    match raw.trim() {
        "draft" => Some(ExpenseApprovalStatus::Draft),
        "pending" | "pending_approval" => Some(ExpenseApprovalStatus::Pending),
        "approved" => Some(ExpenseApprovalStatus::Approved),
        "rejected" => Some(ExpenseApprovalStatus::Rejected),
        "reimbursed" => Some(ExpenseApprovalStatus::Reimbursed),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_canonical_values() {
        for (raw, expected) in [
            ("draft", ExpenseApprovalStatus::Draft),
            ("pending", ExpenseApprovalStatus::Pending),
            ("approved", ExpenseApprovalStatus::Approved),
            ("rejected", ExpenseApprovalStatus::Rejected),
            ("reimbursed", ExpenseApprovalStatus::Reimbursed),
        ] {
            assert_eq!(normalize(raw), Some(expected));
        }
    }

    #[test]
    fn normalize_legacy_alias_and_rejects_unknown() {
        assert_eq!(
            normalize(" pending_approval "),
            Some(ExpenseApprovalStatus::Pending)
        );
        assert_eq!(normalize("submitted"), None);
        assert_eq!(normalize(""), None);
    }
}

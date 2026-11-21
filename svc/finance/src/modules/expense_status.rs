//! W5-B：费用审批/报销状态唯一口径（代码侧）
//!
//! DB 列 `finance.expense_approvals.status`、`finance.expenses.status` 目前都是自由文本，
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

/// `finance.expenses.status` 口径，与前端费用报销表单一致。
/// 历史 `pending` 归一为 `submitted`（旧数据仍是 pending，等窗口清洗）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExpenseStatus {
    Draft,
    Submitted,
    Approved,
    Rejected,
    Paid,
}

impl ExpenseStatus {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Submitted => "submitted",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Paid => "paid",
        }
    }
}

#[must_use]
pub fn normalize_expense(raw: &str) -> Option<ExpenseStatus> {
    match raw.trim() {
        "draft" => Some(ExpenseStatus::Draft),
        "pending" | "submitted" => Some(ExpenseStatus::Submitted),
        "approved" => Some(ExpenseStatus::Approved),
        "rejected" => Some(ExpenseStatus::Rejected),
        "paid" => Some(ExpenseStatus::Paid),
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
    fn normalize_expense_canonical_and_legacy_pending() {
        assert_eq!(normalize_expense("draft"), Some(ExpenseStatus::Draft));
        assert_eq!(
            normalize_expense("submitted"),
            Some(ExpenseStatus::Submitted)
        );
        assert_eq!(normalize_expense("pending"), Some(ExpenseStatus::Submitted));
        assert_eq!(normalize_expense("paid"), Some(ExpenseStatus::Paid));
        assert_eq!(normalize_expense("pending_approval"), None);
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

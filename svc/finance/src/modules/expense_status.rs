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
    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "pending", "approved", "rejected", "reimbursed"];

    /// 新建费用审批默认进入草稿，提交动作再转 pending。
    pub const DEFAULT: Self = Self::Draft;

    /// 通用编辑允许的状态：已审批/已报销为终态，字段与金额不可再改。
    pub const EDITABLE: [&'static str; 3] = ["draft", "pending", "rejected"];

    /// 软删允许的状态：只允许未进入审批终态的记录。
    pub const DELETABLE: [&'static str; 3] = ["draft", "pending", "rejected"];

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "draft" => Some(Self::Draft),
            "pending" | "pending_approval" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "reimbursed" => Some(Self::Reimbursed),
            _ => None,
        }
    }

    /// 该状态允许迁入的起始态；同态也允许，供原值回传。
    #[must_use]
    pub fn allowed_from(self) -> &'static [&'static str] {
        match self {
            Self::Draft => &["draft"],
            Self::Pending => &["draft", "pending"],
            Self::Approved => &["pending", "approved"],
            Self::Rejected => &["pending", "rejected"],
            Self::Reimbursed => &["approved", "reimbursed"],
        }
    }

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
    pub const DB_VALUES: [&'static str; 5] = ["draft", "submitted", "approved", "rejected", "paid"];

    /// 创建接口的默认状态（DB 列默认值仍是历史 `pending`，见 B221 证据文档）。
    pub const DEFAULT: Self = Self::Draft;

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        normalize_expense(raw)
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 历史别名：`pending` 与 `submitted` 在库内并存，过滤时需同时匹配。
    #[must_use]
    pub const fn legacy_aliases(self) -> &'static [&'static str] {
        match self {
            Self::Submitted => &["pending"],
            _ => &[],
        }
    }

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

    /// 报销状态迁移矩阵：同态视为幂等；`paid` 为终态。
    ///
    /// draft → submitted → approved → paid；submitted 可驳回为 rejected，
    /// rejected 可退回 draft 修改后重提；approved 不允许回退。
    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        if self == target {
            return Ok(());
        }
        let allowed = match self {
            Self::Draft => target == Self::Submitted,
            Self::Submitted => {
                matches!(target, Self::Approved | Self::Rejected | Self::Draft)
            }
            Self::Approved => target == Self::Paid,
            Self::Rejected => target == Self::Draft,
            Self::Paid => false,
        };
        if allowed {
            Ok(())
        } else {
            Err(format!(
                "费用报销状态不允许从 {} 流转到 {}",
                self.as_str(),
                target.as_str()
            ))
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
    fn approval_terminal_sets_are_strict() {
        assert_eq!(
            ExpenseApprovalStatus::EDITABLE,
            ["draft", "pending", "rejected"]
        );
        assert_eq!(
            ExpenseApprovalStatus::DELETABLE,
            ["draft", "pending", "rejected"]
        );
        assert!(!ExpenseApprovalStatus::EDITABLE.contains(&"approved"));
        assert!(!ExpenseApprovalStatus::DELETABLE.contains(&"reimbursed"));
    }

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
        for raw in ExpenseApprovalStatus::DB_VALUES {
            assert_eq!(
                ExpenseApprovalStatus::from_db_str(raw).map(|v| v.as_str()),
                Some(raw)
            );
        }
        assert_eq!(ExpenseApprovalStatus::DEFAULT.as_str(), "draft");
        assert!(ExpenseApprovalStatus::Approved
            .allowed_from()
            .contains(&"pending"));
        assert!(!ExpenseApprovalStatus::Pending
            .allowed_from()
            .contains(&"approved"));
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

    #[test]
    fn expense_status_transition_matrix() {
        assert!(ExpenseStatus::Draft
            .can_transition_to(ExpenseStatus::Submitted)
            .is_ok());
        assert!(ExpenseStatus::Submitted
            .can_transition_to(ExpenseStatus::Approved)
            .is_ok());
        assert!(ExpenseStatus::Submitted
            .can_transition_to(ExpenseStatus::Rejected)
            .is_ok());
        assert!(ExpenseStatus::Submitted
            .can_transition_to(ExpenseStatus::Draft)
            .is_ok());
        assert!(ExpenseStatus::Approved
            .can_transition_to(ExpenseStatus::Paid)
            .is_ok());
        assert!(ExpenseStatus::Rejected
            .can_transition_to(ExpenseStatus::Draft)
            .is_ok());
        assert!(ExpenseStatus::Draft
            .can_transition_to(ExpenseStatus::Draft)
            .is_ok());
        assert!(ExpenseStatus::Draft
            .can_transition_to(ExpenseStatus::Approved)
            .is_err());
        assert!(ExpenseStatus::Submitted
            .can_transition_to(ExpenseStatus::Paid)
            .is_err());
        assert!(ExpenseStatus::Approved
            .can_transition_to(ExpenseStatus::Submitted)
            .is_err());
        assert!(ExpenseStatus::Paid
            .can_transition_to(ExpenseStatus::Submitted)
            .is_err());
    }
}

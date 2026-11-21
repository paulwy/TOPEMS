//! 财务报表状态单一源（W5-B B6）
//!
//! `finance.financial_reports.status` 与 `approval_status` 原本由各写入口直接写字符串：
//! 生成写 `draft`，提交写 `pending`，审批写 `approved/rejected`，锁定写 `locked`；
//! 但提交/审批/驳回/锁定/解锁都不校验起始状态，草稿可被直接批准，已锁定报表可被解锁成普通已批准。
//! 两个列承载同一业务状态，这里统一为一套集合与迁移规则。

use std::fmt;

/// 财务报表状态。`status` 与 `approval_status` 两列必须保持同值。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FinancialReportStatus {
    Draft,
    Pending,
    Approved,
    Rejected,
    Locked,
}

impl FinancialReportStatus {
    pub const ALL: [Self; 5] = [
        Self::Draft,
        Self::Pending,
        Self::Approved,
        Self::Rejected,
        Self::Locked,
    ];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Locked => "locked",
        }
    }

    /// 可以提交审批：草稿，或被驳回后重新提交。
    pub const fn can_submit(self) -> bool {
        matches!(self, Self::Draft | Self::Rejected)
    }

    /// 可以审批通过/驳回：仅待审批。
    pub const fn can_decide(self) -> bool {
        matches!(self, Self::Pending)
    }

    /// 可以锁定：仅已批准。
    pub const fn can_lock(self) -> bool {
        matches!(self, Self::Approved)
    }

    /// 可以解锁：仅已锁定。
    pub const fn can_unlock(self) -> bool {
        matches!(self, Self::Locked)
    }
}

impl fmt::Display for FinancialReportStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

pub fn normalize_financial_report(raw: &str) -> Option<FinancialReportStatus> {
    match raw.trim() {
        "draft" => Some(FinancialReportStatus::Draft),
        "pending" => Some(FinancialReportStatus::Pending),
        "approved" => Some(FinancialReportStatus::Approved),
        "rejected" => Some(FinancialReportStatus::Rejected),
        "locked" => Some(FinancialReportStatus::Locked),
        _ => None,
    }
}

/// 生成报表时是否允许覆盖既有数据：只有草稿/被驳回可重算，其他状态必须保持原数据。
pub fn can_regenerate(status: FinancialReportStatus) -> bool {
    status.can_submit()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_values_roundtrip() {
        for status in FinancialReportStatus::ALL {
            assert_eq!(
                normalize_financial_report(status.as_str()),
                Some(status),
                "{}",
                status.as_str()
            );
        }
    }

    #[test]
    fn unknown_and_whitespace() {
        assert_eq!(normalize_financial_report(" submitted "), None);
        assert_eq!(normalize_financial_report(""), None);
        assert_eq!(
            normalize_financial_report(" locked "),
            Some(FinancialReportStatus::Locked)
        );
    }

    #[test]
    fn transition_matrix() {
        assert!(FinancialReportStatus::Draft.can_submit());
        assert!(FinancialReportStatus::Rejected.can_submit());
        assert!(!FinancialReportStatus::Pending.can_submit());
        assert!(!FinancialReportStatus::Approved.can_submit());

        assert!(FinancialReportStatus::Pending.can_decide());
        assert!(!FinancialReportStatus::Draft.can_decide());

        assert!(FinancialReportStatus::Approved.can_lock());
        assert!(!FinancialReportStatus::Pending.can_lock());
        assert!(FinancialReportStatus::Locked.can_unlock());
        assert!(!FinancialReportStatus::Approved.can_unlock());
    }

    #[test]
    fn regenerate_only_for_editable_states() {
        assert!(can_regenerate(FinancialReportStatus::Draft));
        assert!(can_regenerate(FinancialReportStatus::Rejected));
        assert!(!can_regenerate(FinancialReportStatus::Pending));
        assert!(!can_regenerate(FinancialReportStatus::Approved));
        assert!(!can_regenerate(FinancialReportStatus::Locked));
    }
}

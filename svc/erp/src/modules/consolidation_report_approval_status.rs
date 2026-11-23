//! 合并报表审批状态（W5-B B223）
//!
//! `erp.consolidation_reports.approval_status` 是 varchar NOT NULL DEFAULT `draft`，
//! 没有 CHECK、也没有 Rust 类型；提交 / 审批两条路径把 `'pending'` / `'approved'`
//! 写成 SQL 字面量，且**不看当前状态**：已审批的报表可以再提交，草稿可以直接审批。
//!
//! 值集取自前端 `ConsolidationReportsPage` 的 `APPROVAL_STATUS_CONFIG`
//! （draft / pending / approved / rejected / cancelled）。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ConsolidationReportApprovalStatus {
    Draft,
    Pending,
    Approved,
    Rejected,
    Cancelled,
}

impl ConsolidationReportApprovalStatus {
    pub const ALL: [Self; 5] = [
        Self::Draft,
        Self::Pending,
        Self::Approved,
        Self::Rejected,
        Self::Cancelled,
    ];

    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "pending", "approved", "rejected", "cancelled"];

    /// DB 默认值（`consolidation_reports.approval_status DEFAULT 'draft'`）。
    pub const DEFAULT: Self = Self::Draft;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `submitted` → pending、`canceled` → cancelled。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "draft" => Some(Self::Draft),
            "pending" | "submitted" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 允许提交的起始状态：草稿、被驳回、已撤销。
    #[must_use]
    pub const fn can_submit_from(self) -> bool {
        matches!(self, Self::Draft | Self::Rejected | Self::Cancelled)
    }

    /// 只有待审批状态可以审批通过。
    #[must_use]
    pub const fn can_approve_from(self) -> bool {
        matches!(self, Self::Pending)
    }

    /// 列表 / 查询参数归一：`None`、空串、`all` 视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or_else(|| {
                format!(
                    "非法合并报表审批状态: {v}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }
}

impl fmt::Display for ConsolidationReportApprovalStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for ConsolidationReportApprovalStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(raw).ok_or(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_round_trip() {
        for status in ConsolidationReportApprovalStatus::ALL {
            assert_eq!(
                ConsolidationReportApprovalStatus::from_db_str(status.as_str()),
                Some(status)
            );
        }
        assert_eq!(ConsolidationReportApprovalStatus::DB_VALUES.len(), 5);
        assert_eq!(
            ConsolidationReportApprovalStatus::DEFAULT,
            ConsolidationReportApprovalStatus::Draft
        );
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(
            ConsolidationReportApprovalStatus::from_db_str("submitted"),
            Some(ConsolidationReportApprovalStatus::Pending)
        );
        assert_eq!(
            ConsolidationReportApprovalStatus::from_db_str("canceled"),
            Some(ConsolidationReportApprovalStatus::Cancelled)
        );
        assert_eq!(
            ConsolidationReportApprovalStatus::from_db_str("approve"),
            None
        );
        assert!("APPROVED"
            .parse::<ConsolidationReportApprovalStatus>()
            .is_err());
    }

    #[test]
    fn state_machine_guards() {
        assert!(ConsolidationReportApprovalStatus::Draft.can_submit_from());
        assert!(ConsolidationReportApprovalStatus::Rejected.can_submit_from());
        assert!(ConsolidationReportApprovalStatus::Cancelled.can_submit_from());
        assert!(!ConsolidationReportApprovalStatus::Pending.can_submit_from());
        assert!(!ConsolidationReportApprovalStatus::Approved.can_submit_from());

        assert!(ConsolidationReportApprovalStatus::Pending.can_approve_from());
        assert!(!ConsolidationReportApprovalStatus::Draft.can_approve_from());
        assert!(!ConsolidationReportApprovalStatus::Approved.can_approve_from());
    }

    #[test]
    fn filter_normalizes_blank_and_all() {
        assert_eq!(
            ConsolidationReportApprovalStatus::parse_filter(None),
            Ok(None)
        );
        assert_eq!(
            ConsolidationReportApprovalStatus::parse_filter(Some("ALL")),
            Ok(None)
        );
        assert_eq!(
            ConsolidationReportApprovalStatus::parse_filter(Some(" pending ")),
            Ok(Some(ConsolidationReportApprovalStatus::Pending))
        );
        assert!(ConsolidationReportApprovalStatus::parse_filter(Some("bogus")).is_err());
    }
}

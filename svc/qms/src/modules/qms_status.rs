//! QMS 质检单与质量问题状态唯一集合。
//!
//! - `qms.qa_quality_inspections.status` / `qms.quality_inspections.status`
//! - `qms.qa_quality_issues.status`

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QmsInspectionStatus {
    Pending,
    InProgress,
    PendingAudit,
    Completed,
    Rejected,
    Cancelled,
}

impl QmsInspectionStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 6] = [
        "pending",
        "in_progress",
        "pending_audit",
        "completed",
        "rejected",
        "cancelled",
    ];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::PendingAudit => "pending_audit",
            Self::Completed => "completed",
            Self::Rejected => "rejected",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "pending_audit" => Some(Self::PendingAudit),
            "completed" => Some(Self::Completed),
            "rejected" => Some(Self::Rejected),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QmsIssueStatus {
    Open,
    InProgress,
    Resolved,
    Closed,
    Approved,
    Rejected,
    Cancelled,
}

impl QmsIssueStatus {
    pub const DEFAULT: Self = Self::Open;

    pub const DB_VALUES: [&'static str; 7] = [
        "open",
        "in_progress",
        "resolved",
        "closed",
        "approved",
        "rejected",
        "cancelled",
    ];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::InProgress => "in_progress",
            Self::Resolved => "resolved",
            Self::Closed => "closed",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "open" => Some(Self::Open),
            "in_progress" => Some(Self::InProgress),
            "resolved" => Some(Self::Resolved),
            "closed" => Some(Self::Closed),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inspection_roundtrip() {
        for raw in QmsInspectionStatus::DB_VALUES {
            let parsed = QmsInspectionStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(QmsInspectionStatus::from_db_str("bogus"), None);
        assert_eq!(QmsInspectionStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn issue_roundtrip() {
        for raw in QmsIssueStatus::DB_VALUES {
            let parsed = QmsIssueStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(QmsIssueStatus::from_db_str("bogus"), None);
        assert_eq!(QmsIssueStatus::DEFAULT.as_db_str(), "open");
    }
}

//! Mobile 文档 / 巡逻记录状态唯一集合。
//!
//! 文档契约来自 `apps/web/src/api/mobile/document.ts`：
//! draft / pending_review / approved / rejected / archived。
//! 巡逻沿用既有 pending / in_progress / completed / cancelled。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MobileDocumentStatus {
    Draft,
    PendingReview,
    Approved,
    Rejected,
    Archived,
}

impl MobileDocumentStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 5] = [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "archived",
    ];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::PendingReview => "pending_review",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Archived => "archived",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending_review" => Some(Self::PendingReview),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MobilePatrolStatus {
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

impl MobilePatrolStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 4] = ["pending", "in_progress", "completed", "cancelled"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    /// 巡逻接口保持严格小写契约：`PENDING` 等大写值仍返回 400。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn document_roundtrip_and_case_normalization() {
        for raw in MobileDocumentStatus::DB_VALUES {
            assert_eq!(
                MobileDocumentStatus::from_db_str(raw).unwrap().as_db_str(),
                raw
            );
        }
        assert_eq!(
            MobileDocumentStatus::from_db_str("DRAFT").map(|s| s.as_db_str()),
            Some("draft")
        );
        assert_eq!(MobileDocumentStatus::from_db_str("bogus"), None);
        assert_eq!(MobileDocumentStatus::DEFAULT.as_db_str(), "draft");
    }

    #[test]
    fn patrol_roundtrip_is_strict_lowercase() {
        for raw in MobilePatrolStatus::DB_VALUES {
            assert_eq!(
                MobilePatrolStatus::from_db_str(raw).unwrap().as_db_str(),
                raw
            );
        }
        assert_eq!(MobilePatrolStatus::from_db_str("PENDING"), None);
        assert_eq!(MobilePatrolStatus::from_db_str("done"), None);
        assert_eq!(MobilePatrolStatus::DEFAULT.as_db_str(), "pending");
    }
}

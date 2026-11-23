//! 生产报工状态唯一集合。
//!
//! 落库列：`mes.work_reports.status`（varchar，DB 默认 `pending`）。
//! 值集覆盖创建、审批、返工与归档，前端 schema 与类型联合统一到本集合。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WorkReportStatus {
    Draft,
    Submitted,
    Approved,
    Rejected,
    Reworking,
    Archived,
    Cancelled,
}

impl WorkReportStatus {
    pub const DEFAULT: Self = Self::Submitted;

    pub const DB_VALUES: [&'static str; 7] = [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "reworking",
        "archived",
        "cancelled",
    ];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Submitted => "submitted",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Reworking => "reworking",
            Self::Archived => "archived",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "submitted" => Some(Self::Submitted),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "reworking" => Some(Self::Reworking),
            "archived" => Some(Self::Archived),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(WorkReportStatus::DEFAULT.as_db_str(), "submitted");
        assert_eq!(
            WorkReportStatus::DB_VALUES,
            [
                "draft",
                "submitted",
                "approved",
                "rejected",
                "reworking",
                "archived",
                "cancelled"
            ]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in WorkReportStatus::DB_VALUES {
            assert_eq!(
                WorkReportStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(WorkReportStatus::from_db_str("bogus"), None);
    }
}

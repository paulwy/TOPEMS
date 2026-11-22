//! 同步日志状态：`scm.sync_logs.status` 的唯一值源。
//!
//! 与 `scm.sync_records.status` 区分：同步记录终态用 `completed`，
//! 同步日志沿用既有统计口径 `success / failed / pending / in_progress`。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncLogStatus {
    Pending,
    InProgress,
    Success,
    Failed,
}

impl SyncLogStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 4] = ["pending", "in_progress", "success", "failed"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Success => "success",
            Self::Failed => "failed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "success" => Some(Self::Success),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in SyncLogStatus::DB_VALUES {
            assert_eq!(
                SyncLogStatus::from_db_str(raw).map(SyncLogStatus::as_db_str),
                Some(raw)
            );
        }
        assert_eq!(SyncLogStatus::from_db_str("completed"), None);
        assert_eq!(SyncLogStatus::DEFAULT.as_db_str(), "pending");
    }
}

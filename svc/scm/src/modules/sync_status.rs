//! 同步记录状态：`scm.sync_records.status` 的唯一值源。
//!
//! 生命周期：创建 `running` → 后台模拟完成 `completed`；`pending` 排队、`failed` 失败。
//! 注意：与 WMS 同构表的终态词不同（WMS 用 `success`，SCM 用 `completed`），
//! 两边各自已有存量数据，本批不强行统一词表，只在各自表内收口。
//!
//! B41 之前列表 `status` 过滤接受任意字符串，非法值静默返回空列表；
//! 创建/重试/触发的状态全部是 SQL 字面量。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncRecordStatus {
    /// 已排队
    Pending,
    /// 执行中
    Running,
    /// 完成（终态）
    Completed,
    /// 失败（终态）
    Failed,
}

impl SyncRecordStatus {
    /// `scm.sync_records.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["pending", "running", "completed", "failed"];

    /// 创建记录的初始态
    pub const DEFAULT: Self = Self::Running;

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Failed)
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "running" => Some(Self::Running),
            "completed" => Some(Self::Completed),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Running => "running",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn status_roundtrip() {
        for s in SyncRecordStatus::DB_VALUES {
            assert_eq!(
                SyncRecordStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(SyncRecordStatus::from_db_str("success"), None);
        assert_eq!(SyncRecordStatus::DEFAULT.as_db_str(), "running");
    }

    #[test]
    fn terminal_states() {
        assert!(SyncRecordStatus::Completed.is_terminal());
        assert!(SyncRecordStatus::Failed.is_terminal());
        assert!(!SyncRecordStatus::Running.is_terminal());
    }
}

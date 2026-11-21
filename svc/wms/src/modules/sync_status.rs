//! 同步记录状态：`wms.sync_records.status` 的唯一值源。
//!
//! 生命周期：创建 `running`（接口内同步完成后立刻转 `success`），失败 `failed`，
//! 排队态 `pending`；`completed` 仅为历史数据（本批 4 行），与 `success` 同义，
//! 统计口径并入成功数，不再写入。
//!
//! 注意：B39 之前列表 `status` 过滤接受任意字符串，非法值静默返回空列表；
//! 统计只认 `success`，4 条历史 `completed` 记录从未被计入成功数。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncRecordStatus {
    /// 已排队，等待执行
    Pending,
    /// 执行中
    Running,
    /// 成功
    Success,
    /// 失败
    Failed,
    /// 历史终态（与 success 同义，只读）
    Completed,
}

impl SyncRecordStatus {
    /// `wms.sync_records.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 5] =
        ["pending", "running", "success", "failed", "completed"];

    /// 创建记录的初始态（接口内会立即推进到 success）
    pub const DEFAULT: Self = Self::Running;

    /// 统计「进行中」的口径
    pub fn active_values() -> &'static [&'static str] {
        &["pending", "running"]
    }

    /// 统计「成功」的口径（历史 completed 并入）
    pub fn success_values() -> &'static [&'static str] {
        &["success", "completed"]
    }

    /// 统计「失败」的口径
    pub fn failed_values() -> &'static [&'static str] {
        &["failed"]
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Success | Self::Failed | Self::Completed)
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "running" => Some(Self::Running),
            "success" => Some(Self::Success),
            "failed" => Some(Self::Failed),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Running => "running",
            Self::Success => "success",
            Self::Failed => "failed",
            Self::Completed => "completed",
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
        assert_eq!(SyncRecordStatus::from_db_str("done"), None);
        assert_eq!(SyncRecordStatus::DEFAULT.as_db_str(), "running");
    }

    #[test]
    fn statistics_buckets_cover_legacy_completed() {
        assert!(SyncRecordStatus::success_values().contains(&"completed"));
        assert!(SyncRecordStatus::success_values().contains(&"success"));
        assert!(!SyncRecordStatus::success_values().contains(&"failed"));
        assert!(SyncRecordStatus::active_values().contains(&"pending"));
        assert!(SyncRecordStatus::active_values().contains(&"running"));
    }
}

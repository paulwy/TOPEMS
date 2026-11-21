//! 退换货状态：`crm.returns.status` 的唯一值源。
//!
//! 规范集合与既有 `ck_returns_status_standard` 完全一致：
//! `pending / accepted / approved / rejected / processing / completed / cancelled`。
//!
//! 历史口径 `resolving`（方案确认）归一到 `processing`，`done` 归一到 `completed`，
//! 前端旧值 `received` 归一到 `processing`；仅读取侧兼容，写入只写规范值。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReturnStatus {
    Pending,
    Accepted,
    Approved,
    Processing,
    Completed,
    Rejected,
    Cancelled,
}

impl ReturnStatus {
    pub const DB_VALUES: [&'static str; 7] = [
        "pending",
        "accepted",
        "approved",
        "processing",
        "completed",
        "rejected",
        "cancelled",
    ];

    /// 新建退换单的初始态
    pub const DEFAULT: Self = Self::Pending;

    /// 删除仅允许的起始态
    pub const DELETABLE: [&'static str; 2] = ["pending", "cancelled"];

    /// 可取消的起始态
    pub const CANCELLABLE: [&'static str; 4] = ["pending", "accepted", "approved", "processing"];

    /// 可审批/拒绝的起始态（受理后、终审前）
    pub const APPROVABLE_FROM: [&'static str; 2] = ["pending", "accepted"];

    /// 受理/审批通过后可进入 processing
    pub const PROCESS_FROM: [&'static str; 2] = ["accepted", "approved"];

    /// 方案确认可重入 processing
    pub const RESOLVE_FROM: [&'static str; 3] = ["accepted", "approved", "processing"];

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "accepted" => Some(Self::Accepted),
            "approved" => Some(Self::Approved),
            "processing" => Some(Self::Processing),
            "completed" => Some(Self::Completed),
            "rejected" => Some(Self::Rejected),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 读取侧兼容：历史 `resolving`/`done` 与前端旧值 `received` 不进入写入集合。
    pub fn from_read_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "resolving" | "received" => Some(Self::Processing),
            "done" => Some(Self::Completed),
            other => Self::from_db_str(other),
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Accepted => "accepted",
            Self::Approved => "approved",
            Self::Processing => "processing",
            Self::Completed => "completed",
            Self::Rejected => "rejected",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Rejected | Self::Cancelled)
    }

    /// 规范状态机：终态不可再流转，禁止跳级。
    pub fn can_transition_to(self, target: Self) -> bool {
        use ReturnStatus::*;
        if self.is_terminal() {
            return false;
        }
        matches!(
            (self, target),
            (Pending, Accepted)
                | (Pending, Approved)
                | (Pending, Rejected)
                | (Pending, Cancelled)
                | (Accepted, Approved)
                | (Accepted, Rejected)
                | (Accepted, Processing)
                | (Accepted, Cancelled)
                | (Approved, Processing)
                | (Approved, Cancelled)
                | (Processing, Completed)
                | (Processing, Rejected)
                | (Processing, Cancelled)
        )
    }
}

impl std::fmt::Display for ReturnStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn db_values_roundtrip() {
        for value in ReturnStatus::DB_VALUES {
            let status = ReturnStatus::from_db_str(value).expect("规范值必须可解析");
            assert_eq!(status.as_db_str(), value);
        }
        assert_eq!(ReturnStatus::DB_VALUES.len(), 7);
    }

    #[test]
    fn strict_from_db_rejects_legacy_and_unknown() {
        assert_eq!(ReturnStatus::from_db_str("resolving"), None);
        assert_eq!(ReturnStatus::from_db_str("done"), None);
        assert_eq!(ReturnStatus::from_db_str("received"), None);
        assert_eq!(ReturnStatus::from_db_str("bogus"), None);
        assert_eq!(ReturnStatus::from_db_str(""), None);
    }

    #[test]
    fn read_alias_maps_to_canonical() {
        assert_eq!(
            ReturnStatus::from_read_str("resolving"),
            Some(ReturnStatus::Processing)
        );
        assert_eq!(
            ReturnStatus::from_read_str("received"),
            Some(ReturnStatus::Processing)
        );
        assert_eq!(
            ReturnStatus::from_read_str("done"),
            Some(ReturnStatus::Completed)
        );
        assert_eq!(ReturnStatus::from_read_str("bogus"), None);
    }

    #[test]
    fn default_is_pending() {
        assert_eq!(ReturnStatus::DEFAULT, ReturnStatus::Pending);
        assert_eq!(ReturnStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn terminal_states() {
        assert!(ReturnStatus::Completed.is_terminal());
        assert!(ReturnStatus::Rejected.is_terminal());
        assert!(ReturnStatus::Cancelled.is_terminal());
        for status in [
            ReturnStatus::Pending,
            ReturnStatus::Accepted,
            ReturnStatus::Approved,
            ReturnStatus::Processing,
        ] {
            assert!(!status.is_terminal());
        }
    }

    #[test]
    fn canonical_forward_path() {
        use ReturnStatus::*;
        assert!(Pending.can_transition_to(Accepted));
        assert!(Accepted.can_transition_to(Approved));
        assert!(Accepted.can_transition_to(Rejected));
        assert!(Accepted.can_transition_to(Processing));
        assert!(Processing.can_transition_to(Completed));
        assert!(Pending.can_transition_to(Approved));
        assert!(Approved.can_transition_to(Processing));
        assert!(Processing.can_transition_to(Rejected));
    }

    #[test]
    fn no_skip_or_backward_or_terminal() {
        use ReturnStatus::*;
        assert!(!Pending.can_transition_to(Processing));
        assert!(!Accepted.can_transition_to(Completed));
        assert!(!Processing.can_transition_to(Accepted));
        assert!(!Completed.can_transition_to(Cancelled));
        assert!(!Rejected.can_transition_to(Processing));
        assert!(!Cancelled.can_transition_to(Pending));
    }

    #[test]
    fn cancel_from_non_terminal_only() {
        use ReturnStatus::*;
        for status in [Pending, Accepted, Approved, Processing] {
            assert!(status.can_transition_to(Cancelled));
        }
        for status in [Completed, Rejected, Cancelled] {
            assert!(!status.can_transition_to(Cancelled));
        }
    }
}

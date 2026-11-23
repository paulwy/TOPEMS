//! 验收记录结果状态：`pm.acceptance_records.status` 的唯一值源。
//!
//! 生命周期：pending → passed / failed；failed 可回到 pending 重新验收，passed 为终态。
//! 生产库历史上存在 `ck_acceptance_records_status_standard`（active/inactive/archived），
//! 与本业务值集冲突；本批用 `ck_acceptance_records_result_status_standard` 替换。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AcceptanceRecordStatus {
    Pending,
    Passed,
    Failed,
}

impl AcceptanceRecordStatus {
    /// `pm.acceptance_records.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 3] = ["pending", "passed", "failed"];

    /// 新建验收记录的初始态
    pub const DEFAULT: Self = Self::Pending;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" | "new" | "in_progress" | "in-progress" => Some(Self::Pending),
            "passed" | "pass" | "approved" | "accepted" | "ok" => Some(Self::Passed),
            "failed" | "fail" | "rejected" | "denied" | "not_passed" => Some(Self::Failed),
            _ => None,
        }
    }

    /// 写入 `pm.acceptance_records.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Passed => "passed",
            Self::Failed => "failed",
        }
    }

    /// 归一化：未知值返回 `None`
    pub fn normalize(raw: &str) -> Option<&'static str> {
        Self::from_db_str(raw).map(|v| v.as_db_str())
    }

    /// 列表过滤参数解析
    pub fn parse_filter(raw: &str) -> Option<&'static str> {
        Self::normalize(raw)
    }

    /// 是否允许从 `from` 流转到 `self`
    pub fn can_transition_from(&self, from: &str) -> bool {
        let Some(current) = Self::from_db_str(from) else {
            return false;
        };
        if *self == current {
            return true;
        }
        match current {
            Self::Pending => matches!(self, Self::Passed | Self::Failed),
            Self::Failed => matches!(self, Self::Pending),
            Self::Passed => false,
        }
    }

    /// passed 为终态，记录内容不可再改
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Passed)
    }
}

impl std::fmt::Display for AcceptanceRecordStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for AcceptanceRecordStatus {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(s).ok_or(())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in AcceptanceRecordStatus::DB_VALUES {
            assert_eq!(
                AcceptanceRecordStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(AcceptanceRecordStatus::from_db_str("bogus"), None);
        assert_eq!(AcceptanceRecordStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            AcceptanceRecordStatus::normalize("ACCEPTED"),
            Some("passed")
        );
        assert_eq!(
            AcceptanceRecordStatus::parse_filter("denied"),
            Some("failed")
        );
        assert_eq!(AcceptanceRecordStatus::parse_filter("bogus"), None);
    }

    #[test]
    fn transitions_follow_acceptance_result() {
        assert!(AcceptanceRecordStatus::Passed.can_transition_from("pending"));
        assert!(AcceptanceRecordStatus::Failed.can_transition_from("pending"));
        assert!(AcceptanceRecordStatus::Pending.can_transition_from("failed"));
        assert!(AcceptanceRecordStatus::Passed.can_transition_from("passed"));
        assert!(!AcceptanceRecordStatus::Pending.can_transition_from("passed"));
        assert!(!AcceptanceRecordStatus::Failed.can_transition_from("passed"));
        assert!(!AcceptanceRecordStatus::Pending.can_transition_from("bogus"));
        assert!(AcceptanceRecordStatus::Passed.is_terminal());
        assert!(!AcceptanceRecordStatus::Failed.is_terminal());
    }
}

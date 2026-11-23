//! 审核发现状态：`qms.qa_audit_findings.status` 的唯一值源。
//!
//! 生命周期与前端 `StatusBadge` 的 `audit_finding` FSM 一致：
//! open → in_progress → verified → closed；closed 为终态。
//! 当前后端只暴露 verify 动作，因此 verify 仅允许 open / in_progress。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QmsAuditFindingStatus {
    Open,
    InProgress,
    Verified,
    Closed,
}

impl QmsAuditFindingStatus {
    /// `qms.qa_audit_findings.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["open", "in_progress", "verified", "closed"];

    /// 新建审核发现的初始态
    pub const DEFAULT: Self = Self::Open;

    /// verify 动作允许的来源状态
    pub const VERIFY_FROM: [&'static str; 2] = ["open", "in_progress"];

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "open" => Some(Self::Open),
            "in_progress" | "in-progress" | "inprogress" => Some(Self::InProgress),
            "verified" | "passed" => Some(Self::Verified),
            "closed" | "done" => Some(Self::Closed),
            _ => None,
        }
    }

    /// 写入 `qms.qa_audit_findings.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::InProgress => "in_progress",
            Self::Verified => "verified",
            Self::Closed => "closed",
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
            Self::Open => matches!(self, Self::InProgress | Self::Verified),
            Self::InProgress => matches!(self, Self::Verified),
            Self::Verified => matches!(self, Self::Closed),
            Self::Closed => false,
        }
    }

    /// closed 为终态
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Closed)
    }
}

impl std::fmt::Display for QmsAuditFindingStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for QmsAuditFindingStatus {
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
        for raw in QmsAuditFindingStatus::DB_VALUES {
            assert_eq!(
                QmsAuditFindingStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(QmsAuditFindingStatus::from_db_str("bogus"), None);
        assert_eq!(QmsAuditFindingStatus::DEFAULT.as_db_str(), "open");
        assert_eq!(QmsAuditFindingStatus::normalize("PASSED"), Some("verified"));
        assert_eq!(QmsAuditFindingStatus::parse_filter("DONE"), Some("closed"));
        assert_eq!(QmsAuditFindingStatus::parse_filter("bogus"), None);
    }

    #[test]
    fn transitions_match_badge_fsm() {
        assert!(QmsAuditFindingStatus::InProgress.can_transition_from("open"));
        assert!(QmsAuditFindingStatus::Verified.can_transition_from("open"));
        assert!(QmsAuditFindingStatus::Verified.can_transition_from("in_progress"));
        assert!(QmsAuditFindingStatus::Closed.can_transition_from("verified"));
        assert!(!QmsAuditFindingStatus::Open.can_transition_from("verified"));
        assert!(!QmsAuditFindingStatus::Verified.can_transition_from("closed"));
        assert!(!QmsAuditFindingStatus::Closed.can_transition_from("bogus"));
        assert!(QmsAuditFindingStatus::Closed.is_terminal());
        assert!(!QmsAuditFindingStatus::Verified.is_terminal());
    }
}

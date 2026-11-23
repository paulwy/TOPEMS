//! 缺陷状态：`rd.bugs.status` 的唯一值源。
//!
//! 生命周期：open → in_progress → resolved → closed；任意非终态可回到 open，
//! resolved 可直接关闭，closed 可重新打开（reopen）。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BugStatus {
    Open,
    InProgress,
    Resolved,
    Closed,
}

impl BugStatus {
    /// `rd.bugs.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["open", "in_progress", "resolved", "closed"];

    /// 新建缺陷的初始态
    pub const DEFAULT: Self = Self::Open;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "open" => Some(Self::Open),
            "in_progress" | "in-progress" | "inprogress" | "fixing" => Some(Self::InProgress),
            "resolved" | "fixed" => Some(Self::Resolved),
            "closed" | "done" => Some(Self::Closed),
            _ => None,
        }
    }

    /// 写入 `rd.bugs.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::InProgress => "in_progress",
            Self::Resolved => "resolved",
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
        let allowed: &[Self] = match current {
            Self::Open => &[Self::InProgress, Self::Resolved, Self::Closed],
            Self::InProgress => &[Self::Open, Self::Resolved, Self::Closed],
            Self::Resolved => &[Self::Open, Self::Closed],
            Self::Closed => &[Self::Open],
        };
        allowed.contains(self)
    }

    /// 是否为终态；closed 可 reopen，因此业务上不作为硬终态
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Closed)
    }
}

impl std::fmt::Display for BugStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for BugStatus {
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
        for raw in BugStatus::DB_VALUES {
            assert_eq!(
                BugStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(BugStatus::from_db_str("bogus"), None);
        assert_eq!(BugStatus::DEFAULT.as_db_str(), "open");
        assert_eq!(BugStatus::normalize(" Fixing "), Some("in_progress"));
        assert_eq!(BugStatus::parse_filter("DONE"), Some("closed"));
        assert_eq!(BugStatus::parse_filter("bogus"), None);
    }

    #[test]
    fn transitions_follow_lifecycle() {
        assert!(BugStatus::InProgress.can_transition_from("open"));
        assert!(BugStatus::Resolved.can_transition_from("open"));
        assert!(BugStatus::Closed.can_transition_from("open"));
        assert!(BugStatus::Open.can_transition_from("in_progress"));
        assert!(BugStatus::Resolved.can_transition_from("in_progress"));
        assert!(BugStatus::Closed.can_transition_from("resolved"));
        assert!(BugStatus::Open.can_transition_from("closed"));
        assert!(!BugStatus::Resolved.can_transition_from("closed"));
        assert!(!BugStatus::Open.can_transition_from("bogus"));
        assert!(BugStatus::Closed.is_terminal());
        assert!(!BugStatus::Open.is_terminal());
    }
}

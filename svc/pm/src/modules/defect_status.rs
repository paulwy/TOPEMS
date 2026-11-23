//! PM 缺陷状态唯一集合（W5-B B234）
//!
//! `pm.defects.status` 是 varchar NOT NULL DEFAULT 'open'，没有 CHECK、也没有 Rust 类型。
//! 创建 INSERT 拼 `'open'`；更新接口把 `req.status` 原样入库，
//! 并用 `CASE WHEN COALESCE($5, status) = 'resolved'` 的字面量决定 `resolved_at`。
//! 本模块把落库值收敛为 open / in_progress / resolved / closed 四值。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DefectStatus {
    Open,
    InProgress,
    Resolved,
    Closed,
}

impl DefectStatus {
    pub const ALL: [Self; 4] = [Self::Open, Self::InProgress, Self::Resolved, Self::Closed];

    pub const DB_VALUES: [&'static str; 4] = ["open", "in_progress", "resolved", "closed"];

    /// DB 默认值（`defects.status DEFAULT 'open'`）。
    pub const DEFAULT: Self = Self::Open;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::InProgress => "in_progress",
            Self::Resolved => "resolved",
            Self::Closed => "closed",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `new`/`identified` → open、`inprogress`/`active`/`fixing` → in_progress、
    /// `fixed`/`done` → resolved、`complete`/`finished` → closed。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "open" | "new" | "identified" => Some(Self::Open),
            "in_progress" | "inprogress" | "active" | "fixing" => Some(Self::InProgress),
            "resolved" | "fixed" | "done" => Some(Self::Resolved),
            "closed" | "complete" | "completed" | "finished" => Some(Self::Closed),
            _ => None,
        }
    }

    /// 状态机（同值放行）：open → in_progress / resolved / closed；
    /// in_progress → resolved / closed；resolved → closed；closed 为终态。
    #[must_use]
    pub const fn can_transition_to(self, to: Self) -> bool {
        match (self, to) {
            (Self::Open, Self::Open)
            | (Self::Open, Self::InProgress)
            | (Self::Open, Self::Resolved)
            | (Self::Open, Self::Closed)
            | (Self::InProgress, Self::InProgress)
            | (Self::InProgress, Self::Resolved)
            | (Self::InProgress, Self::Closed)
            | (Self::Resolved, Self::Resolved)
            | (Self::Resolved, Self::Closed)
            | (Self::Closed, Self::Closed) => true,
            (_, _) => false,
        }
    }

    #[must_use]
    pub const fn is_terminal(self) -> bool {
        matches!(self, Self::Closed)
    }

    /// 列表 / 查询参数归一：`None`、空串、`all` 视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v)
                .map(Some)
                .ok_or_else(|| format!("非法缺陷状态: {v}，可选值: {}", Self::DB_VALUES.join("/"))),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw)
            .ok_or_else(|| format!("非法缺陷状态: {raw}，可选值: {}", Self::DB_VALUES.join("/")))
    }
}

impl fmt::Display for DefectStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for DefectStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(raw).ok_or(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_round_trip() {
        for status in DefectStatus::ALL {
            assert_eq!(DefectStatus::from_db_str(status.as_str()), Some(status));
        }
        assert_eq!(DefectStatus::DB_VALUES.len(), 4);
        assert_eq!(DefectStatus::DEFAULT, DefectStatus::Open);
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(DefectStatus::from_db_str("new"), Some(DefectStatus::Open));
        assert_eq!(
            DefectStatus::from_db_str("fixing"),
            Some(DefectStatus::InProgress)
        );
        assert_eq!(
            DefectStatus::from_db_str("fixed"),
            Some(DefectStatus::Resolved)
        );
        assert_eq!(
            DefectStatus::from_db_str("finished"),
            Some(DefectStatus::Closed)
        );
        assert_eq!(DefectStatus::from_db_str("reopened"), None);
    }

    #[test]
    fn transitions() {
        use DefectStatus::*;
        assert!(Open.can_transition_to(InProgress));
        assert!(Open.can_transition_to(Resolved));
        assert!(Open.can_transition_to(Closed));
        assert!(InProgress.can_transition_to(Resolved));
        assert!(Resolved.can_transition_to(Closed));
        assert!(Closed.can_transition_to(Closed));
        assert!(!Closed.can_transition_to(Open));
        assert!(!Resolved.can_transition_to(InProgress));
        assert!(Closed.is_terminal());
    }

    #[test]
    fn filters() {
        assert_eq!(DefectStatus::parse_filter(None), Ok(None));
        assert_eq!(DefectStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(DefectStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            DefectStatus::parse_filter(Some(" resolved ")),
            Ok(Some(DefectStatus::Resolved))
        );
        assert!(DefectStatus::parse_filter(Some("bogus")).is_err());
    }

    #[test]
    fn normalize_and_display() {
        assert_eq!(DefectStatus::normalize("CLOSED"), Ok(DefectStatus::Closed));
        assert!(DefectStatus::normalize("bogus").is_err());
        assert_eq!(DefectStatus::Resolved.to_string(), "resolved");
        assert_eq!("open".parse::<DefectStatus>(), Ok(DefectStatus::Open));
    }
}

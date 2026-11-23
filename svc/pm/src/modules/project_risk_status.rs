//! PM 项目风险状态唯一集合（W5-B B235）
//!
//! `pm.project_risks.status` 是 varchar NOT NULL DEFAULT 'identified'，没有 CHECK、也没有 Rust 类型。
//! 创建 INSERT 拼 `'identified'`，更新接口把 `req.status` 原样入库。
//! 本模块把落库值收敛为 identified / mitigated / closed 三值（`mitigated` 已被前端
//! `pm-api.test.ts` 的更新用例直接使用）。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectRiskStatus {
    Identified,
    Mitigated,
    Closed,
}

impl ProjectRiskStatus {
    pub const ALL: [Self; 3] = [Self::Identified, Self::Mitigated, Self::Closed];

    pub const DB_VALUES: [&'static str; 3] = ["identified", "mitigated", "closed"];

    /// DB 默认值（`project_risks.status DEFAULT 'identified'`）。
    pub const DEFAULT: Self = Self::Identified;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Identified => "identified",
            Self::Mitigated => "mitigated",
            Self::Closed => "closed",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `open`/`active` → identified、`mitigating`/`controlled` → mitigated、
    /// `complete`/`done`/`resolved` → closed。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "identified" | "open" | "active" => Some(Self::Identified),
            "mitigated" | "mitigating" | "controlled" => Some(Self::Mitigated),
            "closed" | "complete" | "completed" | "done" | "resolved" => Some(Self::Closed),
            _ => None,
        }
    }

    /// 状态机（同值放行）：identified → mitigated / closed；mitigated → identified（重开）/ closed；
    /// closed 为终态。
    #[must_use]
    pub const fn can_transition_to(self, to: Self) -> bool {
        match (self, to) {
            (Self::Identified, Self::Identified)
            | (Self::Identified, Self::Mitigated)
            | (Self::Identified, Self::Closed)
            | (Self::Mitigated, Self::Mitigated)
            | (Self::Mitigated, Self::Identified)
            | (Self::Mitigated, Self::Closed)
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
            Some(v) => Self::from_db_str(v).map(Some).ok_or_else(|| {
                format!(
                    "非法项目风险状态: {v}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw).ok_or_else(|| {
            format!(
                "非法项目风险状态: {raw}，可选值: {}",
                Self::DB_VALUES.join("/")
            )
        })
    }
}

impl fmt::Display for ProjectRiskStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for ProjectRiskStatus {
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
        for status in ProjectRiskStatus::ALL {
            assert_eq!(
                ProjectRiskStatus::from_db_str(status.as_str()),
                Some(status)
            );
        }
        assert_eq!(ProjectRiskStatus::DB_VALUES.len(), 3);
        assert_eq!(ProjectRiskStatus::DEFAULT, ProjectRiskStatus::Identified);
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(
            ProjectRiskStatus::from_db_str("open"),
            Some(ProjectRiskStatus::Identified)
        );
        assert_eq!(
            ProjectRiskStatus::from_db_str("controlled"),
            Some(ProjectRiskStatus::Mitigated)
        );
        assert_eq!(
            ProjectRiskStatus::from_db_str("resolved"),
            Some(ProjectRiskStatus::Closed)
        );
        assert_eq!(ProjectRiskStatus::from_db_str("occurred"), None);
    }

    #[test]
    fn transitions() {
        use ProjectRiskStatus::*;
        assert!(Identified.can_transition_to(Mitigated));
        assert!(Identified.can_transition_to(Closed));
        assert!(Mitigated.can_transition_to(Identified));
        assert!(Closed.can_transition_to(Closed));
        assert!(!Closed.can_transition_to(Identified));
        assert!(Closed.is_terminal());
    }

    #[test]
    fn filters() {
        assert_eq!(ProjectRiskStatus::parse_filter(None), Ok(None));
        assert_eq!(ProjectRiskStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(ProjectRiskStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            ProjectRiskStatus::parse_filter(Some(" mitigated ")),
            Ok(Some(ProjectRiskStatus::Mitigated))
        );
        assert!(ProjectRiskStatus::parse_filter(Some("bogus")).is_err());
    }

    #[test]
    fn normalize_and_display() {
        assert_eq!(
            ProjectRiskStatus::normalize("CLOSED"),
            Ok(ProjectRiskStatus::Closed)
        );
        assert!(ProjectRiskStatus::normalize("bogus").is_err());
        assert_eq!(ProjectRiskStatus::Mitigated.to_string(), "mitigated");
        assert_eq!(
            "identified".parse::<ProjectRiskStatus>(),
            Ok(ProjectRiskStatus::Identified)
        );
    }
}

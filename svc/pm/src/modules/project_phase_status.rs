//! PM 项目阶段状态唯一集合（W5-B B232）
//!
//! `pm.project_phases.status` 是 varchar NOT NULL DEFAULT 'pending'，没有 CHECK、也没有 Rust 类型。
//! 创建 INSERT 拼 `'pending'`，更新接口把 `req.status` 原样入库；
//! 前端 `PmProjectDetailPage` 只认 pending / active / completed（其余一律按 pending 展示与灰显）。
//! 本模块把落库值收敛为 pending / active / completed 三值。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectPhaseStatus {
    Pending,
    Active,
    Completed,
}

impl ProjectPhaseStatus {
    pub const ALL: [Self; 3] = [Self::Pending, Self::Active, Self::Completed];

    pub const DB_VALUES: [&'static str; 3] = ["pending", "active", "completed"];

    /// DB 默认值（`project_phases.status DEFAULT 'pending'`）。
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Active => "active",
            Self::Completed => "completed",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `upcoming`/`not_started` → pending、`in_progress`/`running` → active、
    /// `complete`/`done`/`finished` → completed。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" | "upcoming" | "not_started" => Some(Self::Pending),
            "active" | "in_progress" | "inprogress" | "running" => Some(Self::Active),
            "completed" | "complete" | "done" | "finished" => Some(Self::Completed),
            _ => None,
        }
    }

    /// 状态机（同值放行）：pending → active / completed；active → completed；completed 为终态。
    #[must_use]
    pub const fn can_transition_to(self, to: Self) -> bool {
        match (self, to) {
            (Self::Pending, Self::Pending)
            | (Self::Pending, Self::Active)
            | (Self::Pending, Self::Completed)
            | (Self::Active, Self::Active)
            | (Self::Active, Self::Completed)
            | (Self::Completed, Self::Completed) => true,
            (_, _) => false,
        }
    }

    #[must_use]
    pub const fn is_terminal(self) -> bool {
        matches!(self, Self::Completed)
    }

    /// 列表 / 查询参数归一：`None`、空串、`all` 视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or_else(|| {
                format!(
                    "非法项目阶段状态: {v}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw).ok_or_else(|| {
            format!(
                "非法项目阶段状态: {raw}，可选值: {}",
                Self::DB_VALUES.join("/")
            )
        })
    }
}

impl fmt::Display for ProjectPhaseStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for ProjectPhaseStatus {
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
        for status in ProjectPhaseStatus::ALL {
            assert_eq!(
                ProjectPhaseStatus::from_db_str(status.as_str()),
                Some(status)
            );
        }
        assert_eq!(ProjectPhaseStatus::DB_VALUES.len(), 3);
        assert_eq!(ProjectPhaseStatus::DEFAULT, ProjectPhaseStatus::Pending);
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(
            ProjectPhaseStatus::from_db_str("not_started"),
            Some(ProjectPhaseStatus::Pending)
        );
        assert_eq!(
            ProjectPhaseStatus::from_db_str("in_progress"),
            Some(ProjectPhaseStatus::Active)
        );
        assert_eq!(
            ProjectPhaseStatus::from_db_str("done"),
            Some(ProjectPhaseStatus::Completed)
        );
        assert_eq!(ProjectPhaseStatus::from_db_str("overdue"), None);
    }

    #[test]
    fn transitions() {
        use ProjectPhaseStatus::*;
        assert!(Pending.can_transition_to(Active));
        assert!(Pending.can_transition_to(Completed));
        assert!(Active.can_transition_to(Completed));
        assert!(Completed.can_transition_to(Completed));
        assert!(!Completed.can_transition_to(Active));
        assert!(!Active.can_transition_to(Pending));
        assert!(Completed.is_terminal());
    }

    #[test]
    fn filters() {
        assert_eq!(ProjectPhaseStatus::parse_filter(None), Ok(None));
        assert_eq!(ProjectPhaseStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(ProjectPhaseStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            ProjectPhaseStatus::parse_filter(Some(" active ")),
            Ok(Some(ProjectPhaseStatus::Active))
        );
        assert!(ProjectPhaseStatus::parse_filter(Some("bogus")).is_err());
    }

    #[test]
    fn normalize_and_display() {
        assert_eq!(
            ProjectPhaseStatus::normalize("COMPLETED"),
            Ok(ProjectPhaseStatus::Completed)
        );
        assert!(ProjectPhaseStatus::normalize("bogus").is_err());
        assert_eq!(ProjectPhaseStatus::Active.to_string(), "active");
        assert_eq!(
            "pending".parse::<ProjectPhaseStatus>(),
            Ok(ProjectPhaseStatus::Pending)
        );
    }
}

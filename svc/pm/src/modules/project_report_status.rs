//! PM 项目报告状态唯一集合（W5-B B233）
//!
//! `pm.project_reports.status` 是 varchar NOT NULL DEFAULT 'pending'，没有 CHECK、也没有 Rust 类型。
//! 两条创建路径分别硬编码 `'pending'`（手工登记报告）与 `'generated'`（自动生成报告），
//! 值集只靠 SQL 字面量维持。本模块把落库值收敛为 pending / generated 两值。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectReportStatus {
    Pending,
    Generated,
}

impl ProjectReportStatus {
    pub const ALL: [Self; 2] = [Self::Pending, Self::Generated];

    pub const DB_VALUES: [&'static str; 2] = ["pending", "generated"];

    /// DB 默认值（`project_reports.status DEFAULT 'pending'`）。
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Generated => "generated",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `generating`/`in_progress` → pending、`completed`/`done` → generated。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" | "generating" | "in_progress" | "inprogress" => Some(Self::Pending),
            "generated" | "completed" | "complete" | "done" => Some(Self::Generated),
            _ => None,
        }
    }

    /// 状态机（同值放行）：pending → generated；generated 为终态。
    #[must_use]
    pub const fn can_transition_to(self, to: Self) -> bool {
        match (self, to) {
            (Self::Pending, Self::Pending)
            | (Self::Pending, Self::Generated)
            | (Self::Generated, Self::Generated) => true,
            (_, _) => false,
        }
    }

    #[must_use]
    pub const fn is_terminal(self) -> bool {
        matches!(self, Self::Generated)
    }

    /// 列表 / 查询参数归一：`None`、空串、`all` 视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or_else(|| {
                format!(
                    "非法项目报告状态: {v}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw).ok_or_else(|| {
            format!(
                "非法项目报告状态: {raw}，可选值: {}",
                Self::DB_VALUES.join("/")
            )
        })
    }
}

impl fmt::Display for ProjectReportStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for ProjectReportStatus {
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
        for status in ProjectReportStatus::ALL {
            assert_eq!(
                ProjectReportStatus::from_db_str(status.as_str()),
                Some(status)
            );
        }
        assert_eq!(ProjectReportStatus::DB_VALUES.len(), 2);
        assert_eq!(ProjectReportStatus::DEFAULT, ProjectReportStatus::Pending);
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(
            ProjectReportStatus::from_db_str("completed"),
            Some(ProjectReportStatus::Generated)
        );
        assert_eq!(
            ProjectReportStatus::from_db_str("in_progress"),
            Some(ProjectReportStatus::Pending)
        );
        assert_eq!(ProjectReportStatus::from_db_str("failed"), None);
    }

    #[test]
    fn transitions() {
        use ProjectReportStatus::*;
        assert!(Pending.can_transition_to(Generated));
        assert!(Generated.can_transition_to(Generated));
        assert!(!Generated.can_transition_to(Pending));
        assert!(Generated.is_terminal());
    }

    #[test]
    fn filters() {
        assert_eq!(ProjectReportStatus::parse_filter(None), Ok(None));
        assert_eq!(ProjectReportStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(ProjectReportStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            ProjectReportStatus::parse_filter(Some(" generated ")),
            Ok(Some(ProjectReportStatus::Generated))
        );
        assert!(ProjectReportStatus::parse_filter(Some("bogus")).is_err());
    }

    #[test]
    fn normalize_and_display() {
        assert_eq!(
            ProjectReportStatus::normalize("GENERATED"),
            Ok(ProjectReportStatus::Generated)
        );
        assert!(ProjectReportStatus::normalize("bogus").is_err());
        assert_eq!(ProjectReportStatus::Pending.to_string(), "pending");
        assert_eq!(
            "generated".parse::<ProjectReportStatus>(),
            Ok(ProjectReportStatus::Generated)
        );
    }
}

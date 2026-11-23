//! PM 项目里程碑状态唯一集合（W5-B B230）
//!
//! `pm.project_milestones.status` 是 varchar NOT NULL DEFAULT 'pending'，没有 CHECK、也没有 Rust 类型。
//! 创建 INSERT 拼 `'pending'`，更新接口把 `req.status` 原样入库；而同文件的
//! `milestone_status()` 推导函数却返回 `upcoming`，与落库默认值 `pending` 语义重叠且值集不一致。
//! 本模块把落库值收敛为 pending / in_progress / completed / overdue 四值，
//! `upcoming` 作为 pending 的历史别名（推导函数对外仍按 pending 表达“未开始”）。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum MilestoneStatus {
    Pending,
    InProgress,
    Completed,
    Overdue,
}

impl MilestoneStatus {
    pub const ALL: [Self; 4] = [
        Self::Pending,
        Self::InProgress,
        Self::Completed,
        Self::Overdue,
    ];

    pub const DB_VALUES: [&'static str; 4] = ["pending", "in_progress", "completed", "overdue"];

    /// DB 默认值（`project_milestones.status DEFAULT 'pending'`）。
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Overdue => "overdue",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `upcoming` → pending、`inprogress`/`in-progress` → in_progress、
    /// `complete`/`done`/`finished` → completed、`late` → overdue。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" | "upcoming" => Some(Self::Pending),
            "in_progress" | "inprogress" | "in-progress" | "active" => Some(Self::InProgress),
            "completed" | "complete" | "done" | "finished" => Some(Self::Completed),
            "overdue" | "late" => Some(Self::Overdue),
            _ => None,
        }
    }

    /// 状态机（同值放行）：completed 为终态；overdue 可回到 in_progress 后完成。
    #[must_use]
    pub const fn can_transition_to(self, to: Self) -> bool {
        match (self, to) {
            (Self::Pending, Self::Pending)
            | (Self::Pending, Self::InProgress)
            | (Self::Pending, Self::Completed)
            | (Self::Pending, Self::Overdue)
            | (Self::InProgress, Self::InProgress)
            | (Self::InProgress, Self::Completed)
            | (Self::InProgress, Self::Overdue)
            | (Self::Overdue, Self::Overdue)
            | (Self::Overdue, Self::InProgress)
            | (Self::Overdue, Self::Completed)
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
                format!("非法里程碑状态: {v}，可选值: {}", Self::DB_VALUES.join("/"))
            }),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw).ok_or_else(|| {
            format!(
                "非法里程碑状态: {raw}，可选值: {}",
                Self::DB_VALUES.join("/")
            )
        })
    }
}

impl fmt::Display for MilestoneStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for MilestoneStatus {
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
        for status in MilestoneStatus::ALL {
            assert_eq!(MilestoneStatus::from_db_str(status.as_str()), Some(status));
        }
        assert_eq!(MilestoneStatus::DB_VALUES.len(), 4);
        assert_eq!(MilestoneStatus::DEFAULT, MilestoneStatus::Pending);
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(
            MilestoneStatus::from_db_str("upcoming"),
            Some(MilestoneStatus::Pending)
        );
        assert_eq!(
            MilestoneStatus::from_db_str("in-progress"),
            Some(MilestoneStatus::InProgress)
        );
        assert_eq!(
            MilestoneStatus::from_db_str("done"),
            Some(MilestoneStatus::Completed)
        );
        assert_eq!(
            MilestoneStatus::from_db_str("late"),
            Some(MilestoneStatus::Overdue)
        );
        assert_eq!(MilestoneStatus::from_db_str("blocked"), None);
    }

    #[test]
    fn transitions() {
        use MilestoneStatus::*;
        assert!(Pending.can_transition_to(InProgress));
        assert!(Pending.can_transition_to(Completed));
        assert!(InProgress.can_transition_to(Overdue));
        assert!(Overdue.can_transition_to(InProgress));
        assert!(Overdue.can_transition_to(Completed));
        assert!(Completed.can_transition_to(Completed));
        assert!(!Completed.can_transition_to(InProgress));
        assert!(!InProgress.can_transition_to(Pending));
        assert!(Completed.is_terminal());
        assert!(!Overdue.is_terminal());
    }

    #[test]
    fn filters() {
        assert_eq!(MilestoneStatus::parse_filter(None), Ok(None));
        assert_eq!(MilestoneStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(MilestoneStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            MilestoneStatus::parse_filter(Some(" upcoming ")),
            Ok(Some(MilestoneStatus::Pending))
        );
        assert!(MilestoneStatus::parse_filter(Some("bogus")).is_err());
    }

    #[test]
    fn normalize_and_display() {
        assert_eq!(
            MilestoneStatus::normalize("UPCOMING"),
            Ok(MilestoneStatus::Pending)
        );
        assert!(MilestoneStatus::normalize("bogus").is_err());
        assert_eq!(MilestoneStatus::InProgress.to_string(), "in_progress");
        assert_eq!(
            "overdue".parse::<MilestoneStatus>(),
            Ok(MilestoneStatus::Overdue)
        );
    }
}

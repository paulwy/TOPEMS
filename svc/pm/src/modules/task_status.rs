//! PM 任务状态唯一集合（W5-B B226）
//!
//! `pm.pm_tasks.status` 是 varchar NOT NULL DEFAULT `todo`，没有 CHECK、也没有 Rust 类型；
//! `modules/task.rs` 里虽然有 `task_status_transition_valid` 纯函数并在更新接口调用，
//! 但创建接口把请求体 `status` 原样入库、列表过滤也裸绑参数，未知值可静默落库/静默空列表。
//!
//! 值集取任务状态机：todo / in_progress / review / done / blocked。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Todo,
    InProgress,
    Review,
    Done,
    Blocked,
}

impl TaskStatus {
    pub const ALL: [Self; 5] = [
        Self::Todo,
        Self::InProgress,
        Self::Review,
        Self::Done,
        Self::Blocked,
    ];

    pub const DB_VALUES: [&'static str; 5] = ["todo", "in_progress", "review", "done", "blocked"];

    /// DB 默认值（`pm_tasks.status DEFAULT 'todo'`）。
    pub const DEFAULT: Self = Self::Todo;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Todo => "todo",
            Self::InProgress => "in_progress",
            Self::Review => "review",
            Self::Done => "done",
            Self::Blocked => "blocked",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `pending` → todo、`completed` → done、`inprogress` → in_progress。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "todo" | "pending" => Some(Self::Todo),
            "in_progress" | "inprogress" | "in-progress" => Some(Self::InProgress),
            "review" | "reviewing" => Some(Self::Review),
            "done" | "completed" | "complete" => Some(Self::Done),
            "blocked" => Some(Self::Blocked),
            _ => None,
        }
    }

    /// 状态机：与 `task.rs::task_status_transition_valid` 的合法边保持一致。
    #[must_use]
    pub const fn can_transition_to(self, to: Self) -> bool {
        matches!(
            (self, to),
            (Self::Todo, Self::InProgress)
                | (Self::Todo, Self::Review)
                | (Self::Todo, Self::Blocked)
                | (Self::InProgress, Self::Review)
                | (Self::InProgress, Self::Done)
                | (Self::InProgress, Self::Blocked)
                | (Self::Review, Self::Done)
                | (Self::Review, Self::InProgress)
                | (Self::Done, Self::InProgress)
                | (Self::Blocked, Self::InProgress)
        )
    }

    /// 状态派生进度：done 恒为 100，todo 恒为 0，其余 clamp 到 0..=100。
    #[must_use]
    pub const fn progress(self, progress: i32) -> i32 {
        match self {
            Self::Done => 100,
            Self::Todo => 0,
            _ => {
                if progress < 0 {
                    0
                } else if progress > 100 {
                    100
                } else {
                    progress
                }
            }
        }
    }

    /// 列表 / 查询参数归一：`None`、空串、`all` 视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v)
                .map(Some)
                .ok_or_else(|| format!("非法任务状态: {v}，可选值: {}", Self::DB_VALUES.join("/"))),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw)
            .ok_or_else(|| format!("非法任务状态: {raw}，可选值: {}", Self::DB_VALUES.join("/")))
    }
}

impl fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for TaskStatus {
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
        for status in TaskStatus::ALL {
            assert_eq!(TaskStatus::from_db_str(status.as_str()), Some(status));
        }
        assert_eq!(TaskStatus::DB_VALUES.len(), 5);
        assert_eq!(TaskStatus::DEFAULT, TaskStatus::Todo);
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(TaskStatus::from_db_str("pending"), Some(TaskStatus::Todo));
        assert_eq!(TaskStatus::from_db_str("completed"), Some(TaskStatus::Done));
        assert_eq!(
            TaskStatus::from_db_str("IN-PROGRESS"),
            Some(TaskStatus::InProgress)
        );
        assert_eq!(TaskStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn transition_edges_match_task_module() {
        assert!(TaskStatus::Todo.can_transition_to(TaskStatus::InProgress));
        assert!(TaskStatus::Todo.can_transition_to(TaskStatus::Blocked));
        assert!(!TaskStatus::Todo.can_transition_to(TaskStatus::Done));
        assert!(TaskStatus::InProgress.can_transition_to(TaskStatus::Done));
        assert!(TaskStatus::Done.can_transition_to(TaskStatus::InProgress));
        assert!(!TaskStatus::Done.can_transition_to(TaskStatus::Todo));
    }

    #[test]
    fn progress_derivation() {
        assert_eq!(TaskStatus::Done.progress(30), 100);
        assert_eq!(TaskStatus::Todo.progress(80), 0);
        assert_eq!(TaskStatus::InProgress.progress(120), 100);
        assert_eq!(TaskStatus::Blocked.progress(-5), 0);
    }

    #[test]
    fn filter_normalizes_blank_and_all() {
        assert_eq!(TaskStatus::parse_filter(None), Ok(None));
        assert_eq!(TaskStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            TaskStatus::parse_filter(Some(" review ")),
            Ok(Some(TaskStatus::Review))
        );
        assert!(TaskStatus::parse_filter(Some("bogus")).is_err());
    }
}

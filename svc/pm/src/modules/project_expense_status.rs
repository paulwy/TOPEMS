//! PM 项目费用状态唯一集合（W5-B B231）
//!
//! `pm.project_expenses.status` 是 varchar(20) NOT NULL DEFAULT 'pending'，没有 CHECK、也没有 Rust 类型。
//! 添加费用 INSERT 直接拼 `'pending'`，更新接口把 `req.status` 原样入库；
//! 同文件的 `should_approve_expense()` 只是“是否自动通过”的判定函数，并未落到状态写入。
//! 本模块把落库值收敛为 pending / approved / rejected 三值。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectExpenseStatus {
    Pending,
    Approved,
    Rejected,
}

impl ProjectExpenseStatus {
    pub const ALL: [Self; 3] = [Self::Pending, Self::Approved, Self::Rejected];

    pub const DB_VALUES: [&'static str; 3] = ["pending", "approved", "rejected"];

    /// DB 默认值（`project_expenses.status DEFAULT 'pending'`）。
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `submitted`/`pending_approval` → pending、
    /// `approve`/`passed` → approved、`reject`/`denied` → rejected。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" | "submitted" | "pending_approval" => Some(Self::Pending),
            "approved" | "approve" | "passed" => Some(Self::Approved),
            "rejected" | "reject" | "denied" => Some(Self::Rejected),
            _ => None,
        }
    }

    /// 状态机（同值放行）：pending → approved / rejected；rejected 可退回 pending 重报；
    /// approved 为终态。
    #[must_use]
    pub const fn can_transition_to(self, to: Self) -> bool {
        match (self, to) {
            (Self::Pending, Self::Pending)
            | (Self::Pending, Self::Approved)
            | (Self::Pending, Self::Rejected)
            | (Self::Approved, Self::Approved)
            | (Self::Rejected, Self::Rejected)
            | (Self::Rejected, Self::Pending) => true,
            (_, _) => false,
        }
    }

    #[must_use]
    pub const fn is_terminal(self) -> bool {
        matches!(self, Self::Approved)
    }

    /// 列表 / 查询参数归一：`None`、空串、`all` 视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or_else(|| {
                format!(
                    "非法项目费用状态: {v}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw).ok_or_else(|| {
            format!(
                "非法项目费用状态: {raw}，可选值: {}",
                Self::DB_VALUES.join("/")
            )
        })
    }
}

impl fmt::Display for ProjectExpenseStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for ProjectExpenseStatus {
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
        for status in ProjectExpenseStatus::ALL {
            assert_eq!(
                ProjectExpenseStatus::from_db_str(status.as_str()),
                Some(status)
            );
        }
        assert_eq!(ProjectExpenseStatus::DB_VALUES.len(), 3);
        assert_eq!(ProjectExpenseStatus::DEFAULT, ProjectExpenseStatus::Pending);
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(
            ProjectExpenseStatus::from_db_str("pending_approval"),
            Some(ProjectExpenseStatus::Pending)
        );
        assert_eq!(
            ProjectExpenseStatus::from_db_str("passed"),
            Some(ProjectExpenseStatus::Approved)
        );
        assert_eq!(
            ProjectExpenseStatus::from_db_str("denied"),
            Some(ProjectExpenseStatus::Rejected)
        );
        assert_eq!(ProjectExpenseStatus::from_db_str("reimbursed"), None);
    }

    #[test]
    fn transitions() {
        use ProjectExpenseStatus::*;
        assert!(Pending.can_transition_to(Approved));
        assert!(Pending.can_transition_to(Rejected));
        assert!(Rejected.can_transition_to(Pending));
        assert!(Approved.can_transition_to(Approved));
        assert!(!Approved.can_transition_to(Pending));
        assert!(!Rejected.can_transition_to(Approved));
        assert!(Approved.is_terminal());
        assert!(!Rejected.is_terminal());
    }

    #[test]
    fn filters() {
        assert_eq!(ProjectExpenseStatus::parse_filter(None), Ok(None));
        assert_eq!(ProjectExpenseStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(ProjectExpenseStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            ProjectExpenseStatus::parse_filter(Some(" approved ")),
            Ok(Some(ProjectExpenseStatus::Approved))
        );
        assert!(ProjectExpenseStatus::parse_filter(Some("bogus")).is_err());
    }

    #[test]
    fn normalize_and_display() {
        assert_eq!(
            ProjectExpenseStatus::normalize("APPROVED"),
            Ok(ProjectExpenseStatus::Approved)
        );
        assert!(ProjectExpenseStatus::normalize("bogus").is_err());
        assert_eq!(ProjectExpenseStatus::Rejected.to_string(), "rejected");
        assert_eq!(
            "pending".parse::<ProjectExpenseStatus>(),
            Ok(ProjectExpenseStatus::Pending)
        );
    }
}

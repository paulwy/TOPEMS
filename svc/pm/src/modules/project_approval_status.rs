//! PM 项目审批状态唯一集合（W5-B B227）
//!
//! `pm.project_approvals.status` 是 varchar DEFAULT 'pending'，没有 CHECK、也没有 Rust 类型；
//! 提交/审批/驳回/取消四处写入用裸字符串，列表与 `FOR UPDATE` 守卫也直接拼 `status = 'pending'`。
//!
//! 值集：pending / approved / rejected / cancelled（4 态，终止态不可再流转）。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectApprovalStatus {
    Pending,
    Approved,
    Rejected,
    Cancelled,
}

impl ProjectApprovalStatus {
    pub const ALL: [Self; 4] = [
        Self::Pending,
        Self::Approved,
        Self::Rejected,
        Self::Cancelled,
    ];

    pub const DB_VALUES: [&'static str; 4] = ["pending", "approved", "rejected", "cancelled"];

    /// DB 默认值（`project_approvals.status DEFAULT 'pending'`）。
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `canceled` → cancelled、`approve`/`pass` → approved、`reject`/`deny` → rejected。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" | "processing" => Some(Self::Pending),
            "approved" | "approve" | "passed" | "pass" => Some(Self::Approved),
            "rejected" | "reject" | "denied" | "deny" => Some(Self::Rejected),
            "cancelled" | "canceled" | "cancel" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 状态机：pending 可终审通过/驳回/取消；同值（多级审批中途）放行；终止态不可再流转。
    #[must_use]
    pub const fn can_transition_to(self, to: Self) -> bool {
        matches!(
            (self, to),
            (Self::Pending, Self::Pending)
                | (Self::Pending, Self::Approved)
                | (Self::Pending, Self::Rejected)
                | (Self::Pending, Self::Cancelled)
        )
    }

    #[must_use]
    pub const fn is_terminal(self) -> bool {
        !matches!(self, Self::Pending)
    }

    /// 列表 / 查询参数归一：`None`、空串、`all` 视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or_else(|| {
                format!(
                    "非法项目审批状态: {v}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw).ok_or_else(|| {
            format!(
                "非法项目审批状态: {raw}，可选值: {}",
                Self::DB_VALUES.join("/")
            )
        })
    }
}

impl fmt::Display for ProjectApprovalStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for ProjectApprovalStatus {
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
        for status in ProjectApprovalStatus::ALL {
            assert_eq!(
                ProjectApprovalStatus::from_db_str(status.as_str()),
                Some(status)
            );
        }
        assert_eq!(ProjectApprovalStatus::DB_VALUES.len(), 4);
        assert_eq!(
            ProjectApprovalStatus::DEFAULT,
            ProjectApprovalStatus::Pending
        );
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(
            ProjectApprovalStatus::from_db_str("canceled"),
            Some(ProjectApprovalStatus::Cancelled)
        );
        assert_eq!(
            ProjectApprovalStatus::from_db_str("pass"),
            Some(ProjectApprovalStatus::Approved)
        );
        assert_eq!(ProjectApprovalStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn transition_rules() {
        assert!(ProjectApprovalStatus::Pending.can_transition_to(ProjectApprovalStatus::Pending));
        assert!(ProjectApprovalStatus::Pending.can_transition_to(ProjectApprovalStatus::Approved));
        assert!(!ProjectApprovalStatus::Approved.can_transition_to(ProjectApprovalStatus::Rejected));
        assert!(ProjectApprovalStatus::Approved.is_terminal());
    }

    #[test]
    fn filter_normalizes_blank_and_all() {
        assert_eq!(ProjectApprovalStatus::parse_filter(None), Ok(None));
        assert_eq!(ProjectApprovalStatus::parse_filter(Some(" ALL ")), Ok(None));
        assert_eq!(
            ProjectApprovalStatus::parse_filter(Some("approved")),
            Ok(Some(ProjectApprovalStatus::Approved))
        );
        assert!(ProjectApprovalStatus::parse_filter(Some("bogus")).is_err());
    }
}

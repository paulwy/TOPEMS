//! PM 合同状态唯一集合（W5-B B228）
//!
//! `pm.contracts.status` 是 varchar NOT NULL DEFAULT 'draft'，没有 CHECK、也没有 Rust 类型；
//! 更新接口把 `req.status` 原样入库，提交/审批/驳回三个动作直接 `UPDATE ... SET status = '<字面量>'`，
//! 且不校验来源状态（draft 可直接被 approve 跳过审批）。
//!
//! 值集：draft / pending / approved / rejected / active / completed / cancelled（7 态）。
//! 前端 `apps/web/src/schemas/pm/contract.ts` 的 `STATUS_OPTIONS` 少了 `rejected`（后端会写该值）。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ContractStatus {
    Draft,
    Pending,
    Approved,
    Rejected,
    Active,
    Completed,
    Cancelled,
}

impl ContractStatus {
    pub const ALL: [Self; 7] = [
        Self::Draft,
        Self::Pending,
        Self::Approved,
        Self::Rejected,
        Self::Active,
        Self::Completed,
        Self::Cancelled,
    ];

    pub const DB_VALUES: [&'static str; 7] = [
        "draft",
        "pending",
        "approved",
        "rejected",
        "active",
        "completed",
        "cancelled",
    ];

    /// DB 默认值（`contracts.status DEFAULT 'draft'`）。
    pub const DEFAULT: Self = Self::Draft;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Active => "active",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `submitted` → pending、`canceled` → cancelled、`done` → completed。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" | "submitted" | "pending_approval" => Some(Self::Pending),
            "approved" | "approve" => Some(Self::Approved),
            "rejected" | "reject" => Some(Self::Rejected),
            "active" | "signed" | "in_progress" => Some(Self::Active),
            "completed" | "done" | "closed" => Some(Self::Completed),
            "cancelled" | "canceled" | "terminated" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 状态机（同值放行，便于幂等更新）：
    /// draft → pending/cancelled；pending → approved/rejected/cancelled；
    /// approved → active/cancelled；active → completed/cancelled；rejected → draft。
    #[must_use]
    pub const fn can_transition_to(self, to: Self) -> bool {
        if matches!(
            (self, to),
            (Self::Draft, Self::Pending)
                | (Self::Draft, Self::Cancelled)
                | (Self::Pending, Self::Approved)
                | (Self::Pending, Self::Rejected)
                | (Self::Pending, Self::Cancelled)
                | (Self::Approved, Self::Active)
                | (Self::Approved, Self::Cancelled)
                | (Self::Active, Self::Completed)
                | (Self::Active, Self::Cancelled)
                | (Self::Rejected, Self::Draft)
        ) {
            return true;
        }
        matches!(
            (self, to),
            (Self::Draft, Self::Draft)
                | (Self::Pending, Self::Pending)
                | (Self::Approved, Self::Approved)
                | (Self::Rejected, Self::Rejected)
                | (Self::Active, Self::Active)
                | (Self::Completed, Self::Completed)
                | (Self::Cancelled, Self::Cancelled)
        )
    }

    #[must_use]
    pub const fn is_terminal(self) -> bool {
        matches!(self, Self::Completed | Self::Cancelled)
    }

    /// 列表 / 查询参数归一：`None`、空串、`all` 视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v)
                .map(Some)
                .ok_or_else(|| format!("非法合同状态: {v}，可选值: {}", Self::DB_VALUES.join("/"))),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw)
            .ok_or_else(|| format!("非法合同状态: {raw}，可选值: {}", Self::DB_VALUES.join("/")))
    }
}

impl fmt::Display for ContractStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for ContractStatus {
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
        for status in ContractStatus::ALL {
            assert_eq!(ContractStatus::from_db_str(status.as_str()), Some(status));
        }
        assert_eq!(ContractStatus::DB_VALUES.len(), 7);
        assert_eq!(ContractStatus::DEFAULT, ContractStatus::Draft);
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(
            ContractStatus::from_db_str("canceled"),
            Some(ContractStatus::Cancelled)
        );
        assert_eq!(
            ContractStatus::from_db_str("done"),
            Some(ContractStatus::Completed)
        );
        assert_eq!(ContractStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn transition_rules() {
        assert!(ContractStatus::Draft.can_transition_to(ContractStatus::Pending));
        assert!(!ContractStatus::Draft.can_transition_to(ContractStatus::Approved));
        assert!(ContractStatus::Pending.can_transition_to(ContractStatus::Rejected));
        assert!(ContractStatus::Approved.can_transition_to(ContractStatus::Active));
        assert!(!ContractStatus::Completed.can_transition_to(ContractStatus::Active));
        assert!(ContractStatus::Pending.can_transition_to(ContractStatus::Pending));
    }

    #[test]
    fn filter_normalizes_blank_and_all() {
        assert_eq!(ContractStatus::parse_filter(None), Ok(None));
        assert_eq!(ContractStatus::parse_filter(Some(" all ")), Ok(None));
        assert_eq!(
            ContractStatus::parse_filter(Some("rejected")),
            Ok(Some(ContractStatus::Rejected))
        );
        assert!(ContractStatus::parse_filter(Some("bogus")).is_err());
    }
}

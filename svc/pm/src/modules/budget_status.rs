//! PM 预算状态唯一集合（W5-B B229）
//!
//! `pm.budgets.status` 是 varchar NOT NULL DEFAULT 'draft'，没有 CHECK、也没有 Rust 类型；
//! 创建 INSERT 拼 `'draft'`，提交/审批两个动作直接 `UPDATE ... SET status = '<字面量>'` 且不看来源状态，
//! 更新接口把 `req.status` 原样入库。值集只有 draft / pending / approved（后端没有驳回动作）。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum BudgetStatus {
    Draft,
    Pending,
    Approved,
}

impl BudgetStatus {
    pub const ALL: [Self; 3] = [Self::Draft, Self::Pending, Self::Approved];

    pub const DB_VALUES: [&'static str; 3] = ["draft", "pending", "approved"];

    /// DB 默认值（`budgets.status DEFAULT 'draft'`）。
    pub const DEFAULT: Self = Self::Draft;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `submitted`/`pending_approval` → pending、`approve` → approved。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" | "submitted" | "pending_approval" => Some(Self::Pending),
            "approved" | "approve" => Some(Self::Approved),
            _ => None,
        }
    }

    /// 状态机（同值放行）：draft → pending → approved，approved 为终态。
    #[must_use]
    pub const fn can_transition_to(self, to: Self) -> bool {
        match (self, to) {
            (Self::Draft, Self::Draft)
            | (Self::Draft, Self::Pending)
            | (Self::Pending, Self::Pending)
            | (Self::Pending, Self::Approved)
            | (Self::Approved, Self::Approved) => true,
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
            Some(v) => Self::from_db_str(v)
                .map(Some)
                .ok_or_else(|| format!("非法预算状态: {v}，可选值: {}", Self::DB_VALUES.join("/"))),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw)
            .ok_or_else(|| format!("非法预算状态: {raw}，可选值: {}", Self::DB_VALUES.join("/")))
    }
}

impl fmt::Display for BudgetStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for BudgetStatus {
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
        for status in BudgetStatus::ALL {
            assert_eq!(BudgetStatus::from_db_str(status.as_str()), Some(status));
        }
        assert_eq!(BudgetStatus::DB_VALUES.len(), 3);
        assert_eq!(BudgetStatus::DEFAULT, BudgetStatus::Draft);
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(
            BudgetStatus::from_db_str("pending_approval"),
            Some(BudgetStatus::Pending)
        );
        assert_eq!(BudgetStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn transition_rules() {
        assert!(BudgetStatus::Draft.can_transition_to(BudgetStatus::Pending));
        assert!(!BudgetStatus::Draft.can_transition_to(BudgetStatus::Approved));
        assert!(BudgetStatus::Pending.can_transition_to(BudgetStatus::Approved));
        assert!(!BudgetStatus::Approved.can_transition_to(BudgetStatus::Pending));
        assert!(BudgetStatus::Approved.can_transition_to(BudgetStatus::Approved));
    }

    #[test]
    fn filter_normalizes_blank_and_all() {
        assert_eq!(BudgetStatus::parse_filter(None), Ok(None));
        assert_eq!(BudgetStatus::parse_filter(Some(" all ")), Ok(None));
        assert!(BudgetStatus::parse_filter(Some("bogus")).is_err());
    }
}

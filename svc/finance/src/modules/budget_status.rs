//! 预算状态：`finance.budgets.status` 的唯一值源。
//!
//! 与数据库 CHECK、写入口、前端选项共用同一集合：
//! `active / inactive / frozen / exhausted / archived`。
//! 五者均为运营态，允许互相调整，不设不可逆终态。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BudgetStatus {
    /// 正常执行
    Active,
    /// 停用
    Inactive,
    /// 冻结（暂停占用与执行）
    Frozen,
    /// 额度耗尽
    Exhausted,
    /// 已归档
    Archived,
}

impl BudgetStatus {
    pub const DB_VALUES: [&'static str; 5] =
        ["active", "inactive", "frozen", "exhausted", "archived"];

    pub const DEFAULT: Self = Self::Active;

    /// 严格解析持久化/请求值；兼容旧库 `inactive`，其余未知值返回 `None`
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "frozen" | "suspended" => Some(Self::Frozen),
            "exhausted" => Some(Self::Exhausted),
            "archived" | "archive" => Some(Self::Archived),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Frozen => "frozen",
            Self::Exhausted => "exhausted",
            Self::Archived => "archived",
        }
    }

    pub fn normalize(raw: &str) -> Option<&'static str> {
        Self::from_db_str(raw).map(|s| s.as_db_str())
    }

    /// 五个运营态之间允许互相调整；非法来源值拒绝
    pub fn can_transition_from(&self, from: &str) -> bool {
        Self::from_db_str(from).is_some()
    }

    /// 当前值集没有不可逆终态
    pub fn is_terminal(&self) -> bool {
        false
    }
}

impl std::fmt::Display for BudgetStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for BudgetStatus {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(s).ok_or(())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in BudgetStatus::DB_VALUES {
            assert_eq!(
                BudgetStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(BudgetStatus::from_db_str("bogus"), None);
        assert_eq!(BudgetStatus::normalize("Suspended"), Some("frozen"));
        assert_eq!(BudgetStatus::DEFAULT.as_db_str(), "active");
    }

    #[test]
    fn any_known_operational_state_is_reversible() {
        for target in BudgetStatus::DB_VALUES {
            for source in BudgetStatus::DB_VALUES {
                assert!(BudgetStatus::from_db_str(target)
                    .unwrap()
                    .can_transition_from(source));
            }
        }
        assert!(!BudgetStatus::Active.can_transition_from("bogus"));
        assert!(!BudgetStatus::Exhausted.is_terminal());
    }
}

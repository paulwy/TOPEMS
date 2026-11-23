//! 预算状态：`finance.budgets.status` 的唯一值源。
//!
//! 与数据库 CHECK、写入口、前端选项共用同一集合：
//! `active / inactive / frozen / exhausted / archived`。
//! 五者均为运营态，允许互相调整，不设不可逆终态。

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

/// 更新预算时被状态守卫拒绝的原因（对应入口 400/409）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpdateViolation {
    /// 非 active 预算不允许新增占用（409）
    NotSpendable,
    /// 已归档预算只能恢复为 active（400）
    ArchivedExit,
    /// exhausted 要求 remaining_amount <= 0（400）
    ExhaustedNeedsDepletion,
}

impl UpdateViolation {
    /// 面向调用方的错误文案；`current` 为库里当前状态。
    #[must_use]
    pub fn message(self, current: BudgetStatus) -> String {
        match self {
            Self::NotSpendable => format!("预算当前状态为 {}，不允许新增占用", current.as_db_str()),
            Self::ArchivedExit => "已归档预算只能恢复为 active".to_string(),
            Self::ExhaustedNeedsDepletion => {
                "status=exhausted 需要 remaining_amount <= 0（额度已耗尽）".to_string()
            }
        }
    }

    /// HTTP 状态码：占用冲突用 409，其余状态取值非法用 400。
    #[must_use]
    pub fn http_status(self) -> u16 {
        match self {
            Self::NotSpendable => 409,
            Self::ArchivedExit | Self::ExhaustedNeedsDepletion => 400,
        }
    }
}

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

    /// 状态迁移矩阵：五态互调，唯一限制是 `archived` 只能恢复为 `active`
    /// （归档后需重新启用才可继续占用；不允许归档直接跳到 frozen/exhausted）。
    pub fn can_transition(from: Self, to: Self) -> bool {
        match from {
            Self::Archived => matches!(to, Self::Archived | Self::Active),
            _ => true,
        }
    }

    /// `from` 是否为持久化值且可迁移到 `self`；非法来源值拒绝
    pub fn can_transition_from(&self, from: &str) -> bool {
        Self::from_db_str(from).is_some_and(|f| Self::can_transition(f, *self))
    }

    /// 只有 active 预算允许新增占用（`used_amount` 上调）
    pub fn is_spendable(self) -> bool {
        matches!(self, Self::Active)
    }

    /// 更新入口的统一守卫：占用增量、归档出口、exhausted 与金额联动。
    ///
    /// `increases_usage` = 本次 `used_amount` 上调；`remaining_amount` = 本次写入的剩余额度。
    pub fn check_update(
        current: Self,
        target: Self,
        increases_usage: bool,
        remaining_amount: Decimal,
    ) -> Result<(), UpdateViolation> {
        if increases_usage && !current.is_spendable() {
            return Err(UpdateViolation::NotSpendable);
        }
        if !Self::can_transition(current, target) {
            return Err(UpdateViolation::ArchivedExit);
        }
        if target == Self::Exhausted && remaining_amount > Decimal::ZERO {
            return Err(UpdateViolation::ExhaustedNeedsDepletion);
        }
        Ok(())
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

    /// 迁移文件是 DB 侧值集的权威定义；用它反向校验 Rust 枚举没有漂移。
    const BUDGET_STATUS_MIGRATION: &str = include_str!(
        "../../../../database/migrations/20261124100000_finance_budgets_status_lifecycle.sql"
    );

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
        for from in BudgetStatus::DB_VALUES {
            for to in BudgetStatus::DB_VALUES {
                let (from, to) = (
                    BudgetStatus::from_db_str(from).unwrap(),
                    BudgetStatus::from_db_str(to).unwrap(),
                );
                let expected = if from == BudgetStatus::Archived {
                    matches!(to, BudgetStatus::Archived | BudgetStatus::Active)
                } else {
                    true
                };
                assert_eq!(
                    BudgetStatus::can_transition(from, to),
                    expected,
                    "{from:?} -> {to:?}"
                );
            }
        }
        assert!(!BudgetStatus::Active.can_transition_from("bogus"));
        // archived 是来源：只能恢复为 active，不能直接转 frozen
        assert!(!BudgetStatus::Frozen.can_transition_from("archived"));
        assert!(BudgetStatus::Active.can_transition_from("archived"));
        // 任意运营态都可归档
        assert!(BudgetStatus::Archived.can_transition_from("active"));
    }

    #[test]
    fn update_guard_blocks_usage_increase_unless_active() {
        for state in [
            BudgetStatus::Inactive,
            BudgetStatus::Frozen,
            BudgetStatus::Exhausted,
            BudgetStatus::Archived,
        ] {
            assert_eq!(
                BudgetStatus::check_update(state, state, true, Decimal::from(10)),
                Err(UpdateViolation::NotSpendable)
            );
        }
        assert!(BudgetStatus::check_update(
            BudgetStatus::Active,
            BudgetStatus::Active,
            true,
            Decimal::from(10)
        )
        .is_ok());
        // 下调占用（冲销）不受状态限制
        assert!(BudgetStatus::check_update(
            BudgetStatus::Frozen,
            BudgetStatus::Frozen,
            false,
            Decimal::from(10)
        )
        .is_ok());
    }

    #[test]
    fn update_guard_archived_exit_only_to_active() {
        assert!(BudgetStatus::check_update(
            BudgetStatus::Archived,
            BudgetStatus::Active,
            false,
            Decimal::ZERO
        )
        .is_ok());
        assert_eq!(
            BudgetStatus::check_update(
                BudgetStatus::Archived,
                BudgetStatus::Frozen,
                false,
                Decimal::ZERO
            ),
            Err(UpdateViolation::ArchivedExit)
        );
        // 任意状态都可归档
        assert!(BudgetStatus::check_update(
            BudgetStatus::Frozen,
            BudgetStatus::Archived,
            false,
            Decimal::ZERO
        )
        .is_ok());
    }

    #[test]
    fn update_guard_exhausted_requires_zero_remaining() {
        assert_eq!(
            BudgetStatus::check_update(
                BudgetStatus::Active,
                BudgetStatus::Exhausted,
                false,
                Decimal::from(10)
            ),
            Err(UpdateViolation::ExhaustedNeedsDepletion)
        );
        assert!(BudgetStatus::check_update(
            BudgetStatus::Active,
            BudgetStatus::Exhausted,
            false,
            Decimal::ZERO
        )
        .is_ok());
        assert!(BudgetStatus::check_update(
            BudgetStatus::Active,
            BudgetStatus::Exhausted,
            false,
            Decimal::from(-5)
        )
        .is_ok());
    }

    #[test]
    fn update_violation_carries_status_code_and_message() {
        assert_eq!(UpdateViolation::NotSpendable.http_status(), 409);
        assert_eq!(UpdateViolation::ArchivedExit.http_status(), 400);
        assert_eq!(UpdateViolation::ExhaustedNeedsDepletion.http_status(), 400);
        assert!(UpdateViolation::NotSpendable
            .message(BudgetStatus::Frozen)
            .contains("frozen"));
        assert!(UpdateViolation::ArchivedExit
            .message(BudgetStatus::Archived)
            .contains("active"));
    }

    /// DB 迁移文件与 Rust 值集必须逐字一致；DB 端新增/删除状态值而未同步枚举时此处失败。
    #[test]
    fn migration_check_values_match_db_values() {
        let sql = BUDGET_STATUS_MIGRATION;
        let idx = sql
            .find("ck_budgets_status_lifecycle_standard")
            .expect("迁移缺少 ck_budgets_status_lifecycle_standard");
        let tail = &sql[idx..];
        let arr_start = tail.find("ARRAY[").expect("约束定义缺少 ARRAY[...]");
        let arr_end = tail[arr_start..]
            .find(']')
            .expect("约束定义缺少 ARRAY[...] 结束符");
        let arr = &tail[arr_start + "ARRAY[".len()..arr_start + arr_end];
        let mut values: Vec<&str> = arr
            .split(',')
            .filter_map(|part| {
                let literal = part.trim().split("::").next()?.trim();
                literal.strip_prefix('\'')?.strip_suffix('\'')
            })
            .collect();
        values.sort_unstable();

        let mut expected = BudgetStatus::DB_VALUES.to_vec();
        expected.sort_unstable();
        assert_eq!(
            values, expected,
            "迁移 CHECK 值与 BudgetStatus::DB_VALUES 不一致"
        );

        // exhausted 必须与金额联动，否则状态会与 remaining_amount 漂移
        assert!(sql.contains("ck_budgets_exhausted_requires_depleted_budget"));
        assert!(sql.contains("remaining_amount <= 0"));
    }
}

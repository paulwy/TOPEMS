//! 对账订单/明细状态单一源（W5-B B5）
//!
//! `finance.reconcile_orders.status` 与 `finance.reconcile_items.status` 原本是自由文本：
//! 手工建单写 `pending`，自动对账写 `draft`，确认/争议不校验起始状态，明细状态接受任意字符串。
//! 这里把两组状态收敛为唯一集合，供写入口校验与归一。

use std::fmt;

/// 对账订单状态。前端 `apps/web/src/api/finance/reconciliation.ts` 的联合类型与此一致。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReconcileOrderStatus {
    Draft,
    Pending,
    Confirmed,
    Disputed,
    Cancelled,
}

impl ReconcileOrderStatus {
    pub const ALL: [Self; 5] = [
        Self::Draft,
        Self::Pending,
        Self::Confirmed,
        Self::Disputed,
        Self::Cancelled,
    ];

    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "pending", "confirmed", "disputed", "cancelled"];

    /// DB 默认值（`finance.reconcile_orders.status DEFAULT 'pending'`）。
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "draft" => Some(Self::Draft),
            "pending" => Some(Self::Pending),
            "confirmed" => Some(Self::Confirmed),
            "disputed" => Some(Self::Disputed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 允许确认 / 争议的起始状态集合（SQL 白名单的唯一来源）。
    pub const fn actionable_values() -> [&'static str; 3] {
        ["draft", "pending", "disputed"]
    }

    /// 终态集合（取消动作的排除集合）。
    pub const fn terminal_values() -> [&'static str; 2] {
        ["confirmed", "cancelled"]
    }

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Confirmed => "confirmed",
            Self::Disputed => "disputed",
            Self::Cancelled => "cancelled",
        }
    }

    /// 允许确认的起始状态：草稿、待确认、争议中（争议解决后可再确认）。
    pub const fn can_confirm(self) -> bool {
        matches!(self, Self::Draft | Self::Pending | Self::Disputed)
    }

    /// 允许标记争议的起始状态；已确认/已取消是终态。
    pub const fn can_dispute(self) -> bool {
        matches!(self, Self::Draft | Self::Pending | Self::Disputed)
    }
}

impl fmt::Display for ReconcileOrderStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// 对账明细状态。与前端 `ReconciliationItem.status` 的三值一致。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReconcileItemStatus {
    Unmatched,
    Matched,
    Disputed,
}

impl ReconcileItemStatus {
    pub const DB_VALUES: [&'static str; 3] = ["unmatched", "matched", "disputed"];

    /// DB 默认值（`finance.reconcile_items.status DEFAULT 'unmatched'`）。
    pub const DEFAULT: Self = Self::Unmatched;

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "unmatched" => Some(Self::Unmatched),
            "matched" => Some(Self::Matched),
            "disputed" => Some(Self::Disputed),
            _ => None,
        }
    }

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Unmatched => "unmatched",
            Self::Matched => "matched",
            Self::Disputed => "disputed",
        }
    }
}

pub fn normalize_reconcile_order(raw: &str) -> Option<ReconcileOrderStatus> {
    match raw.trim() {
        "draft" => Some(ReconcileOrderStatus::Draft),
        "pending" => Some(ReconcileOrderStatus::Pending),
        "confirmed" => Some(ReconcileOrderStatus::Confirmed),
        "disputed" => Some(ReconcileOrderStatus::Disputed),
        "cancelled" => Some(ReconcileOrderStatus::Cancelled),
        _ => None,
    }
}

pub fn normalize_reconcile_item(raw: &str) -> Option<ReconcileItemStatus> {
    match raw.trim() {
        "unmatched" => Some(ReconcileItemStatus::Unmatched),
        "matched" => Some(ReconcileItemStatus::Matched),
        "disputed" => Some(ReconcileItemStatus::Disputed),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn order_canonical_values_roundtrip() {
        for status in ReconcileOrderStatus::ALL {
            assert_eq!(
                normalize_reconcile_order(status.as_str()),
                Some(status),
                "{}",
                status.as_str()
            );
        }
    }

    #[test]
    fn order_rejects_unknown_and_trims() {
        assert_eq!(normalize_reconcile_order(" completed "), None);
        assert_eq!(normalize_reconcile_order(""), None);
        assert_eq!(
            normalize_reconcile_order(" confirmed "),
            Some(ReconcileOrderStatus::Confirmed)
        );
    }

    #[test]
    fn order_terminal_states_block_actions() {
        assert!(!ReconcileOrderStatus::Confirmed.can_confirm());
        assert!(!ReconcileOrderStatus::Cancelled.can_confirm());
        assert!(!ReconcileOrderStatus::Confirmed.can_dispute());
        assert!(!ReconcileOrderStatus::Cancelled.can_dispute());
        assert!(ReconcileOrderStatus::Disputed.can_confirm());
    }

    #[test]
    fn item_canonical_values_and_unknown() {
        for status in [
            ReconcileItemStatus::Unmatched,
            ReconcileItemStatus::Matched,
            ReconcileItemStatus::Disputed,
        ] {
            assert_eq!(
                normalize_reconcile_item(status.as_str()),
                Some(status),
                "{}",
                status.as_str()
            );
        }
        assert_eq!(normalize_reconcile_item("pending"), None);
    }
}

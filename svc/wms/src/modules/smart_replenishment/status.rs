//! 智能补货状态：`wms.replenishment_suggestions.status` 与
//! `wms.replenishment_orders.status` 的唯一值源。
//!
//! 建议：系统计算生成 `active`，确认后 `confirmed`；`draft` 仅用于历史草稿清理与统计。
//! 订单：`pending` → `confirmed` → `completed`。
//! 注意：B37 之前订单创建写 `active`，但确认谓词只认 `pending`，创建出来的订单永远无法确认。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReplenishmentSuggestionStatus {
    /// 历史草稿（补货计算会清理）
    Draft,
    /// 系统生成的待确认建议
    Active,
    /// 已确认
    Confirmed,
}

impl ReplenishmentSuggestionStatus {
    /// `wms.replenishment_suggestions.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 3] = ["draft", "active", "confirmed"];

    /// 补货计算生成的初始态
    pub const DEFAULT: Self = Self::Active;

    /// 确认允许的起始状态：系统生成或历史草稿
    pub fn confirm_from() -> &'static [&'static str] {
        &["active", "draft"]
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "active" => Some(Self::Active),
            "confirmed" => Some(Self::Confirmed),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Active => "active",
            Self::Confirmed => "confirmed",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReplenishmentOrderStatus {
    /// 已创建待确认
    Pending,
    /// 已确认
    Confirmed,
    /// 已完成
    Completed,
}

impl ReplenishmentOrderStatus {
    /// `wms.replenishment_orders.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 3] = ["pending", "confirmed", "completed"];

    /// 创建订单的初始态（与确认谓词一致）
    pub const DEFAULT: Self = Self::Pending;

    /// 确认允许的起始状态
    pub fn confirm_from() -> &'static [&'static str] {
        &["pending"]
    }

    /// 完成允许的起始状态
    pub fn complete_from() -> &'static [&'static str] {
        &["confirmed"]
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "confirmed" => Some(Self::Confirmed),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Confirmed => "confirmed",
            Self::Completed => "completed",
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn suggestion_status_roundtrip() {
        for s in ReplenishmentSuggestionStatus::DB_VALUES {
            assert_eq!(
                ReplenishmentSuggestionStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(ReplenishmentSuggestionStatus::from_db_str("pending"), None);
        assert_eq!(ReplenishmentSuggestionStatus::DEFAULT.as_db_str(), "active");
    }

    #[test]
    fn order_status_roundtrip() {
        for s in ReplenishmentOrderStatus::DB_VALUES {
            assert_eq!(
                ReplenishmentOrderStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(ReplenishmentOrderStatus::from_db_str("active"), None);
        assert_eq!(ReplenishmentOrderStatus::DEFAULT.as_db_str(), "pending");
    }
}

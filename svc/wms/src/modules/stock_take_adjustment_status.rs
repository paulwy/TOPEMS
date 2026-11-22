//! 盘点调整状态：`wms.stock_takes.adjustment_status` 与
//! `wms.stock_take_items.adjustment_status` 的唯一值源。
//!
//! 盘点单完成前为 `pending`；库存调整事务成功提交时，盘点单与全部
//! 明细在同一事务内置为 `completed`。`completed` 为终态，禁止回退。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StockTakeAdjustmentStatus {
    Pending,
    Completed,
}

impl StockTakeAdjustmentStatus {
    pub const DB_VALUES: [&'static str; 2] = ["pending", "completed"];
    pub const DEFAULT: Self = Self::Pending;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Completed => "completed",
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed)
    }

    pub fn can_transition_to(&self, target: Self) -> Result<(), String> {
        if *self == target || matches!((self, target), (Self::Pending, Self::Completed)) {
            Ok(())
        } else {
            Err(format!(
                "盘点调整状态不允许从 {} 流转到 {}",
                self.as_db_str(),
                target.as_db_str()
            ))
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn status_roundtrip() {
        for s in StockTakeAdjustmentStatus::DB_VALUES {
            assert_eq!(
                StockTakeAdjustmentStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(StockTakeAdjustmentStatus::from_db_str("adjusted"), None);
        assert_eq!(StockTakeAdjustmentStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn status_transition_matrix() {
        assert!(StockTakeAdjustmentStatus::Pending
            .can_transition_to(StockTakeAdjustmentStatus::Completed)
            .is_ok());
        assert!(StockTakeAdjustmentStatus::Completed
            .can_transition_to(StockTakeAdjustmentStatus::Pending)
            .is_err());
    }
}

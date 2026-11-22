//! 盘点明细状态：`wms.stock_take_items.status` 的唯一值源。
//!
//! 生命周期：生成明细为 `pending`；完成一次实盘计数后 `completed`。
//! 已完成的明细可再次计数（同态回写，用于纠正实盘量），但不能回退为 `pending`。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StockTakeItemStatus {
    /// 待盘点
    Pending,
    /// 已盘点
    Completed,
}

impl StockTakeItemStatus {
    /// `wms.stock_take_items.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 2] = ["pending", "completed"];

    /// 生成盘点明细的初始态
    pub const DEFAULT: Self = Self::Pending;

    /// 允许计数写入的起始状态：已完成明细允许重复计数纠正
    pub fn count_from() -> &'static [&'static str] {
        &["pending", "completed"]
    }

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

    /// 迁移矩阵：`pending -> completed`；`completed` 只能同态回写，不能回退。
    pub fn can_transition_to(&self, target: Self) -> Result<(), String> {
        if *self == target {
            return Ok(());
        }
        let allowed = matches!((self, target), (Self::Pending, Self::Completed));
        if allowed {
            Ok(())
        } else {
            Err(format!(
                "盘点明细状态不允许从 {} 流转到 {}",
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
        for s in StockTakeItemStatus::DB_VALUES {
            assert_eq!(
                StockTakeItemStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(StockTakeItemStatus::from_db_str("counted"), None);
        assert_eq!(StockTakeItemStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn status_transition_matrix() {
        assert!(StockTakeItemStatus::Pending
            .can_transition_to(StockTakeItemStatus::Completed)
            .is_ok());
        assert!(StockTakeItemStatus::Completed
            .can_transition_to(StockTakeItemStatus::Completed)
            .is_ok());
        assert!(StockTakeItemStatus::Completed
            .can_transition_to(StockTakeItemStatus::Pending)
            .is_err());
    }
}

//! 应收状态：`erp.receivables.status` 的唯一值源。
//!
//! 写入方只有事件消费者（销售订单创建应收、收款核销），值集固定两态；
//! 解析未知值返回 `None`。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReceivableStatus {
    /// 已生成待收款
    Pending,
    /// 已收款核销
    Paid,
}

impl ReceivableStatus {
    /// `erp.receivables.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 2] = ["pending", "paid"];

    /// 事件写入的初始态
    pub const DEFAULT: Self = Self::Pending;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "paid" => Some(Self::Paid),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Paid => "paid",
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn receivable_status_db_strings_roundtrip() {
        for s in ReceivableStatus::DB_VALUES {
            assert_eq!(
                ReceivableStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(ReceivableStatus::from_db_str("written_off"), None);
        assert_eq!(ReceivableStatus::DEFAULT.as_db_str(), "pending");
    }
}

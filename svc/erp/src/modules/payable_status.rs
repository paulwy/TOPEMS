//! 应付状态：`erp.payables.status` 的唯一值源。
//!
//! 列定义：varchar(20) NOT NULL DEFAULT 'pending'，本地 0 行。
//!
//! 写入方只有 ERP 事件消费者：
//! - 采购订单建应付、员工入职福利计提，`INSERT ... status = 'pending'`（字面量）；
//! - 付款核销 `SET status='paid' ... WHERE status='pending'`（字面量，按供应商或金额匹配）。
//!
//! 与 `erp.receivables.status`（`ReceivableStatus`）同构但独立：两张表、两条事件链路，
//! 不共用枚举，避免一个改动波及另一边。

use serde::{Deserialize, Serialize};

/// 应付账款状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PayableStatus {
    /// 已生成待付款
    Pending,
    /// 已付款核销
    Paid,
}

impl PayableStatus {
    /// 该列允许的唯一集合
    pub const DB_VALUES: &'static [&'static str] = &["pending", "paid"];

    /// 建单初始态（与 DB 默认一致）
    pub const DEFAULT: Self = Self::Pending;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "paid" => Some(Self::Paid),
            _ => None,
        }
    }

    /// 写入该列的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Paid => "paid",
        }
    }
}

impl std::fmt::Display for PayableStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_is_total() {
        for v in PayableStatus::DB_VALUES {
            let parsed = PayableStatus::from_db_str(v).expect("值集内必须可解析");
            assert_eq!(parsed.as_db_str(), *v);
        }
    }

    #[test]
    fn rejects_unknown() {
        assert_eq!(PayableStatus::from_db_str("completed"), None);
        assert_eq!(PayableStatus::from_db_str(""), None);
    }
}

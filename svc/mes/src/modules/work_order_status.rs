//! 工单状态：`mes.work_orders.status` 的唯一值源。
//!
//! 生命周期五态：pending → in_progress ⇄ paused → completed，任意活跃态可 cancelled。
//! 每个动作的起始状态集合在这里固定，SQL 只消费 `ANY($n)` 谓词，不再散落字面量。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkOrderStatus {
    /// 已创建待开工
    Pending,
    /// 生产中
    InProgress,
    /// 已暂停
    Paused,
    /// 已完工
    Completed,
    /// 已取消
    Cancelled,
}

impl WorkOrderStatus {
    /// `mes.work_orders.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 5] =
        ["pending", "in_progress", "paused", "completed", "cancelled"];

    /// 新建工单的初始态
    pub const DEFAULT: Self = Self::Pending;

    /// 删除（软删）允许的状态：未开工或已取消
    pub const DELETABLE: [&'static str; 2] = ["pending", "cancelled"];

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "paused" => Some(Self::Paused),
            "completed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 写入 `mes.work_orders.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Paused => "paused",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    /// 开工：仅待开工工单
    pub fn start_from() -> &'static [&'static str] {
        &["pending"]
    }

    /// 完工：仅生产中工单
    pub fn complete_from() -> &'static [&'static str] {
        &["in_progress"]
    }

    /// 取消：未完工的任意活跃态
    pub fn cancel_from() -> &'static [&'static str] {
        &["pending", "in_progress", "paused"]
    }

    /// 暂停：仅生产中工单
    pub fn pause_from() -> &'static [&'static str] {
        &["in_progress"]
    }

    /// 恢复：仅已暂停工单
    pub fn resume_from() -> &'static [&'static str] {
        &["paused"]
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn work_order_status_db_strings_roundtrip() {
        for s in WorkOrderStatus::DB_VALUES {
            assert_eq!(
                WorkOrderStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(WorkOrderStatus::from_db_str("PRODUCING"), None);
        assert_eq!(WorkOrderStatus::DEFAULT.as_db_str(), "pending");
        assert!(WorkOrderStatus::cancel_from().contains(&"paused"));
        assert!(!WorkOrderStatus::cancel_from().contains(&"completed"));
    }
}

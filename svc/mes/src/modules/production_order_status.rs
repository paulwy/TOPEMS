//! 生产订单状态：`mes.production_orders.status` 的唯一值源。
//!
//! 规范生命周期：pending → released → in_progress ⇄ paused → completed → closed，
//! 未完结前可 cancelled。`planned` 是历史遗留值（本地 67 行，无当前写入方），
//! 保留在集合内以兼容存量，仅允许取消；后续清理后再决定是否移除。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProductionOrderStatus {
    /// 已创建待发布
    Pending,
    /// 已发布待开工
    Released,
    /// 生产中
    InProgress,
    /// 已暂停
    Paused,
    /// 已完工
    Completed,
    /// 已关闭
    Closed,
    /// 已取消
    Cancelled,
    /// 历史遗留：已计划（当前无写入方，仅允许取消）
    Planned,
}

impl ProductionOrderStatus {
    /// `mes.production_orders.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 8] = [
        "pending",
        "released",
        "in_progress",
        "paused",
        "completed",
        "closed",
        "cancelled",
        "planned",
    ];

    /// 新建生产订单的初始态
    pub const DEFAULT: Self = Self::Pending;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "released" => Some(Self::Released),
            "in_progress" => Some(Self::InProgress),
            "paused" => Some(Self::Paused),
            "completed" => Some(Self::Completed),
            "closed" => Some(Self::Closed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            "planned" => Some(Self::Planned),
            _ => None,
        }
    }

    /// 写入 `mes.production_orders.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Released => "released",
            Self::InProgress => "in_progress",
            Self::Paused => "paused",
            Self::Completed => "completed",
            Self::Closed => "closed",
            Self::Cancelled => "cancelled",
            Self::Planned => "planned",
        }
    }

    /// 发布：仅待发布
    pub fn release_from() -> &'static [&'static str] {
        &["pending"]
    }

    /// 开工：仅已发布
    pub fn start_from() -> &'static [&'static str] {
        &["released"]
    }

    /// 完工：仅生产中
    pub fn complete_from() -> &'static [&'static str] {
        &["in_progress"]
    }

    /// 取消：未完结的活跃态（含历史遗留 planned）
    pub fn cancel_from() -> &'static [&'static str] {
        &["pending", "released", "paused", "planned"]
    }

    /// 编辑：仅待发布
    pub fn update_from() -> &'static [&'static str] {
        &["pending"]
    }

    /// 删除（软删）：未发布或已取消
    pub fn delete_from() -> &'static [&'static str] {
        &["pending", "cancelled"]
    }

    /// 状态机合法性（相同状态视为无变更）
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        matches!(
            (self, target),
            (Self::Pending, Self::Released | Self::Cancelled)
                | (Self::Released, Self::InProgress | Self::Cancelled)
                | (Self::InProgress, Self::Completed | Self::Paused)
                | (Self::Paused, Self::InProgress | Self::Cancelled)
                | (Self::Completed, Self::Closed)
                | (Self::Planned, Self::Cancelled)
        )
    }
}

impl std::fmt::Display for ProductionOrderStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn production_order_status_db_strings_roundtrip() {
        for s in ProductionOrderStatus::DB_VALUES {
            assert_eq!(
                ProductionOrderStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(ProductionOrderStatus::from_db_str("scheduled"), None);
        assert_eq!(ProductionOrderStatus::DEFAULT.as_db_str(), "pending");
        assert!(ProductionOrderStatus::Pending.can_transition_to(ProductionOrderStatus::Released));
        assert!(!ProductionOrderStatus::Closed.can_transition_to(ProductionOrderStatus::Completed));
        assert!(ProductionOrderStatus::Planned.can_transition_to(ProductionOrderStatus::Cancelled));
    }
}

//! 出库执行阶段状态：`wms.outbound_orders.picking_status / packing_status / shipping_status` 的唯一值源。
//!
//! 三个字段共用同一生命周期：生成订单为 `pending`；阶段开始 `in_progress`；
//! 阶段完成 `completed`。审批驳回可从 `completed` 回流到 `in_progress`（拣货返工），
//! 打包驳回可从 `in_progress` 回到 `pending`（重新打包）。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OutboundExecutionStatus {
    /// 未开始
    Pending,
    /// 进行中
    InProgress,
    /// 已完成
    Completed,
}

impl OutboundExecutionStatus {
    /// 三个执行态列允许的唯一集合
    pub const DB_VALUES: [&'static str; 3] = ["pending", "in_progress", "completed"];

    /// 订单创建时的初始态
    pub const DEFAULT: Self = Self::Pending;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed)
    }

    /// 迁移矩阵：
    /// - `pending -> in_progress`
    /// - `in_progress -> completed | pending`（pending 用于打包驳回重置）
    /// - `completed -> in_progress`（审批驳回后拣货返工）
    pub fn can_transition_to(&self, target: Self) -> Result<(), String> {
        if *self == target {
            return Ok(());
        }
        let allowed = matches!(
            (self, target),
            (Self::Pending, Self::InProgress)
                | (Self::InProgress, Self::Completed | Self::Pending)
                | (Self::Completed, Self::InProgress)
        );
        if allowed {
            Ok(())
        } else {
            Err(format!(
                "出库执行状态不允许从 {} 流转到 {}",
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
        for s in OutboundExecutionStatus::DB_VALUES {
            assert_eq!(
                OutboundExecutionStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(OutboundExecutionStatus::from_db_str("processing"), None);
        assert_eq!(OutboundExecutionStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn status_transition_matrix() {
        assert!(OutboundExecutionStatus::Pending
            .can_transition_to(OutboundExecutionStatus::InProgress)
            .is_ok());
        assert!(OutboundExecutionStatus::InProgress
            .can_transition_to(OutboundExecutionStatus::Completed)
            .is_ok());
        assert!(OutboundExecutionStatus::InProgress
            .can_transition_to(OutboundExecutionStatus::Pending)
            .is_ok());
        assert!(OutboundExecutionStatus::Completed
            .can_transition_to(OutboundExecutionStatus::InProgress)
            .is_ok());
        assert!(OutboundExecutionStatus::Completed
            .can_transition_to(OutboundExecutionStatus::Pending)
            .is_err());
    }
}

//! 盘点差异调整状态：`wms.discrepancy_records.adjustment_status` 的唯一值源。
//!
//! 生命周期：盘点差异生成 `pending`；审批通过 `approved`，审批拒绝 `rejected`；
//! 已审批记录执行库存调整后 `completed`。`rejected / completed` 为终态。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiscrepancyStatus {
    /// 待审批
    Pending,
    /// 已审批，待执行库存调整
    Approved,
    /// 审批拒绝
    Rejected,
    /// 库存调整完成
    Completed,
}

impl DiscrepancyStatus {
    /// `wms.discrepancy_records.adjustment_status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["pending", "approved", "rejected", "completed"];

    /// 差异记录生成的初始态
    pub const DEFAULT: Self = Self::Pending;

    /// 允许审批的起始状态
    pub fn approve_from() -> &'static [&'static str] {
        &["pending"]
    }

    /// 允许执行库存调整的起始状态
    pub fn adjust_from() -> &'static [&'static str] {
        &["approved"]
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Completed => "completed",
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Rejected | Self::Completed)
    }

    /// 迁移矩阵：`pending` 可审批为 approved/rejected，`approved` 可执行完成；
    /// 终态不可回退，同态回写视为幂等。
    pub fn can_transition_to(&self, target: Self) -> Result<(), String> {
        if *self == target {
            return Ok(());
        }
        let allowed = match self {
            Self::Pending => matches!(target, Self::Approved | Self::Rejected),
            Self::Approved => target == Self::Completed,
            Self::Rejected | Self::Completed => false,
        };
        if allowed {
            Ok(())
        } else {
            Err(format!(
                "差异调整状态不允许从 {} 流转到 {}",
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
        for s in DiscrepancyStatus::DB_VALUES {
            assert_eq!(
                DiscrepancyStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(DiscrepancyStatus::from_db_str("adjusted"), None);
        assert_eq!(DiscrepancyStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn status_transition_matrix() {
        assert!(DiscrepancyStatus::Pending
            .can_transition_to(DiscrepancyStatus::Approved)
            .is_ok());
        assert!(DiscrepancyStatus::Pending
            .can_transition_to(DiscrepancyStatus::Rejected)
            .is_ok());
        assert!(DiscrepancyStatus::Approved
            .can_transition_to(DiscrepancyStatus::Completed)
            .is_ok());
        assert!(DiscrepancyStatus::Approved
            .can_transition_to(DiscrepancyStatus::Pending)
            .is_err());
        assert!(DiscrepancyStatus::Rejected
            .can_transition_to(DiscrepancyStatus::Approved)
            .is_err());
        assert!(DiscrepancyStatus::Completed
            .can_transition_to(DiscrepancyStatus::Approved)
            .is_err());
    }
}

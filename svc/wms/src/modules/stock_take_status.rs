//! WMS 盘点单状态与审批状态规范集合。
//!
//! 主状态：`planned → in_progress → completed`，`planned/in_progress → cancelled`。
//! 审批状态：`pending → approved | rejected`；审批是完成的闸门，审批通过不直接改主状态，
//! 完成仍必须由 `complete` 计算盘点统计并校验全部明细已盘。

pub const DB_VALUES: &[&str] = &["planned", "in_progress", "completed", "cancelled"];
pub const TERMINAL: &[&str] = &["completed", "cancelled"];
pub const TRANSITIONS: &[(&str, &str)] = &[
    ("planned", "in_progress"),
    ("in_progress", "completed"),
    ("planned", "cancelled"),
    ("in_progress", "cancelled"),
];
pub const APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("in_progress", "completed")];

pub const APPROVAL_DB_VALUES: &[&str] = &["pending", "approved", "rejected"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StockTakeStatus {
    Planned,
    InProgress,
    Completed,
    Cancelled,
}

impl StockTakeStatus {
    pub const DB_VALUES: &'static [&'static str] = super::stock_take_status::DB_VALUES;

    pub const DEFAULT: Self = Self::Planned;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Planned => "planned",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "planned" => Ok(Self::Planned),
            "in_progress" => Ok(Self::InProgress),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            other => Err(format!("未知盘点单状态: {other}")),
        }
    }

    pub const fn can_edit(self) -> bool {
        matches!(self, Self::Planned)
    }

    pub const fn can_delete(self) -> bool {
        matches!(self, Self::Planned | Self::Cancelled)
    }

    pub const fn can_cancel(self) -> bool {
        matches!(self, Self::Planned | Self::InProgress)
    }

    pub const fn can_adjust(self) -> bool {
        matches!(self, Self::Completed)
    }

    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        let from = self.as_db_str();
        let to = target.as_db_str();
        if TRANSITIONS.contains(&(from, to)) {
            Ok(())
        } else {
            Err(format!("盘点单状态不允许从 {from} 流转到 {to}"))
        }
    }

    pub fn requires_approval(self, target: Self) -> bool {
        APPROVAL_TRANSITIONS.contains(&(self.as_db_str(), target.as_db_str()))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StockTakeApprovalStatus {
    Pending,
    Approved,
    Rejected,
}

impl StockTakeApprovalStatus {
    pub const DB_VALUES: &'static [&'static str] = super::stock_take_status::APPROVAL_DB_VALUES;

    pub const DEFAULT: Self = Self::Pending;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }

    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "pending" => Ok(Self::Pending),
            "approved" => Ok(Self::Approved),
            "rejected" => Ok(Self::Rejected),
            other => Err(format!("未知盘点审批状态: {other}")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_roundtrip_and_unknown_rejected() {
        assert_eq!(StockTakeStatus::DEFAULT.as_db_str(), "planned");
        for raw in DB_VALUES {
            let parsed = StockTakeStatus::from_db_str(raw).expect("规范值应可解析");
            assert_eq!(&parsed.as_db_str(), raw);
        }
        assert!(StockTakeStatus::from_db_str("pending").is_err());
        assert!(StockTakeStatus::from_db_str("").is_err());
    }

    #[test]
    fn workflow_matrix_is_consistent() {
        assert!(StockTakeStatus::Planned
            .can_transition_to(StockTakeStatus::InProgress)
            .is_ok());
        assert!(StockTakeStatus::InProgress
            .can_transition_to(StockTakeStatus::Completed)
            .is_ok());
        assert!(StockTakeStatus::Planned
            .can_transition_to(StockTakeStatus::Completed)
            .is_err());
        assert!(StockTakeStatus::Completed
            .can_transition_to(StockTakeStatus::Cancelled)
            .is_err());
        assert!(StockTakeStatus::Planned.can_cancel());
        assert!(StockTakeStatus::Completed.can_adjust());
        assert!(!StockTakeStatus::InProgress.can_adjust());
    }

    #[test]
    fn approval_values_roundtrip() {
        for raw in APPROVAL_DB_VALUES {
            let parsed = StockTakeApprovalStatus::from_db_str(raw).expect("审批值应可解析");
            assert_eq!(&parsed.as_db_str(), raw);
        }
        assert!(StockTakeApprovalStatus::from_db_str("approved_by_someone").is_err());
    }
}

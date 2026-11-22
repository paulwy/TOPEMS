//! WMS 调拨单状态（FSM-4）
//!
//! 单一事实源：`pending → confirmed → shipped → received → completed`，
//! `confirmed → pending` 为审批驳回回流；未发货/未收货前可取消。
//! 库存实际移动只发生在 `ship`（扣来源仓）与 `receive`（入目的仓），
//! 审批通过不直接改状态，避免绕过库存动作。

pub const DB_VALUES: &[&str] = &[
    "pending",
    "confirmed",
    "shipped",
    "received",
    "completed",
    "cancelled",
];

pub const TERMINAL: &[&str] = &["completed", "cancelled"];

pub const TRANSITIONS: &[(&str, &str)] = &[
    ("pending", "confirmed"),
    ("confirmed", "pending"),
    ("confirmed", "shipped"),
    ("shipped", "received"),
    ("received", "completed"),
    ("pending", "cancelled"),
    ("confirmed", "cancelled"),
    ("shipped", "cancelled"),
    ("received", "cancelled"),
];

pub const APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("confirmed", "shipped")];

pub const ITEM_DB_VALUES: &[&str] = &["pending", "shipped", "partial", "completed", "cancelled"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransferItemStatus {
    Pending,
    Shipped,
    Partial,
    Completed,
    Cancelled,
}

impl TransferItemStatus {
    pub const DB_VALUES: &'static [&'static str] = super::transfer_status::ITEM_DB_VALUES;

    pub const DEFAULT: Self = Self::Pending;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Shipped => "shipped",
            Self::Partial => "partial",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "pending" => Ok(Self::Pending),
            "shipped" => Ok(Self::Shipped),
            "partial" => Ok(Self::Partial),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            other => Err(format!("未知调拨明细状态: {other}")),
        }
    }

    pub const fn can_receive(self) -> bool {
        matches!(self, Self::Shipped | Self::Partial)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransferOrderStatus {
    Pending,
    Confirmed,
    Shipped,
    Received,
    Completed,
    Cancelled,
}

impl TransferOrderStatus {
    pub const DB_VALUES: &'static [&'static str] = super::transfer_status::DB_VALUES;

    pub const DEFAULT: Self = Self::Pending;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Confirmed => "confirmed",
            Self::Shipped => "shipped",
            Self::Received => "received",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "pending" => Ok(Self::Pending),
            "confirmed" => Ok(Self::Confirmed),
            "shipped" => Ok(Self::Shipped),
            "received" => Ok(Self::Received),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            other => Err(format!("未知调拨单状态: {other}")),
        }
    }

    pub const fn can_edit(self) -> bool {
        matches!(self, Self::Pending | Self::Confirmed)
    }

    pub const fn can_delete(self) -> bool {
        matches!(self, Self::Pending | Self::Cancelled)
    }

    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        let from = self.as_db_str();
        let to = target.as_db_str();
        if TRANSITIONS.contains(&(from, to)) {
            Ok(())
        } else {
            Err(format!("调拨单状态不允许从 {from} 流转到 {to}"))
        }
    }

    pub fn requires_approval(self, target: Self) -> bool {
        APPROVAL_TRANSITIONS.contains(&(self.as_db_str(), target.as_db_str()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_roundtrip_and_unknown_rejected() {
        assert_eq!(TransferOrderStatus::DEFAULT.as_db_str(), "pending");
        for raw in DB_VALUES {
            let parsed = TransferOrderStatus::from_db_str(raw).expect("规范值应可解析");
            assert_eq!(&parsed.as_db_str(), raw);
        }
        assert!(TransferOrderStatus::from_db_str("in_progress").is_err());
        assert!(TransferOrderStatus::from_db_str("").is_err());
    }

    #[test]
    fn values_unique_and_matrix_matches_fsm() {
        let mut values = DB_VALUES.to_vec();
        values.sort_unstable();
        values.dedup();
        assert_eq!(values.len(), DB_VALUES.len());

        assert!(TransferOrderStatus::Pending
            .can_transition_to(TransferOrderStatus::Confirmed)
            .is_ok());
        assert!(TransferOrderStatus::Confirmed
            .can_transition_to(TransferOrderStatus::Pending)
            .is_ok());
        assert!(TransferOrderStatus::Confirmed
            .can_transition_to(TransferOrderStatus::Shipped)
            .is_ok());
        assert!(TransferOrderStatus::Shipped
            .can_transition_to(TransferOrderStatus::Received)
            .is_ok());
        assert!(TransferOrderStatus::Received
            .can_transition_to(TransferOrderStatus::Completed)
            .is_ok());
        assert!(TransferOrderStatus::Completed
            .can_transition_to(TransferOrderStatus::Received)
            .is_err());
    }
}

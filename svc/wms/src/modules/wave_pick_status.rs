//! WMS 波次拣货状态与明细状态规范集合。
//!
//! 主状态：`created → assigned → picking → completed`，`created/assigned/picking → cancelled`。
//! 明细状态：`pending → picked | short_picked`。
//! 历史读兼容：旧代码把初始态写作 `pending`，只读映射为 `created`，不再写入。

pub const DB_VALUES: &[&str] = &["created", "assigned", "picking", "completed", "cancelled"];
pub const TERMINAL: &[&str] = &["completed", "cancelled"];
pub const TRANSITIONS: &[(&str, &str)] = &[
    ("created", "assigned"),
    ("assigned", "picking"),
    ("picking", "completed"),
    ("created", "cancelled"),
    ("assigned", "cancelled"),
    ("picking", "cancelled"),
];
pub const APPROVAL_TRANSITIONS: &[(&str, &str)] = &[];

pub const ITEM_DB_VALUES: &[&str] = &["pending", "picked", "short_picked"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WavePickStatus {
    Created,
    Assigned,
    Picking,
    Completed,
    Cancelled,
}

impl WavePickStatus {
    pub const DB_VALUES: &'static [&'static str] = super::wave_pick_status::DB_VALUES;
    pub const DEFAULT: Self = Self::Created;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Created => "created",
            Self::Assigned => "assigned",
            Self::Picking => "picking",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "created" => Ok(Self::Created),
            "assigned" => Ok(Self::Assigned),
            "picking" => Ok(Self::Picking),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            other => Err(format!("未知波次拣货状态: {other}")),
        }
    }

    /// 只读兼容：旧初始态 `pending` 映射为 `created`。
    pub fn from_read_str(raw: &str) -> Result<Self, String> {
        match raw {
            "pending" => Ok(Self::Created),
            other => Self::from_db_str(other),
        }
    }

    pub const fn can_edit(self) -> bool {
        matches!(self, Self::Created | Self::Assigned)
    }

    pub const fn can_delete(self) -> bool {
        matches!(self, Self::Created | Self::Cancelled)
    }

    pub const fn can_cancel(self) -> bool {
        matches!(self, Self::Created | Self::Assigned | Self::Picking)
    }

    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        let from = self.as_db_str();
        let to = target.as_db_str();
        if TRANSITIONS.contains(&(from, to)) {
            Ok(())
        } else {
            Err(format!("波次拣货状态不允许从 {from} 流转到 {to}"))
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WavePickItemStatus {
    Pending,
    Picked,
    ShortPicked,
}

impl WavePickItemStatus {
    pub const DB_VALUES: &'static [&'static str] = super::wave_pick_status::ITEM_DB_VALUES;
    pub const DEFAULT: Self = Self::Pending;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Picked => "picked",
            Self::ShortPicked => "short_picked",
        }
    }

    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "pending" => Ok(Self::Pending),
            "picked" => Ok(Self::Picked),
            "short_picked" => Ok(Self::ShortPicked),
            other => Err(format!("未知波次拣货明细状态: {other}")),
        }
    }

    pub const fn is_terminal(self) -> bool {
        matches!(self, Self::Picked | Self::ShortPicked)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_roundtrip_and_legacy_read_alias() {
        assert_eq!(WavePickStatus::DEFAULT.as_db_str(), "created");
        for raw in DB_VALUES {
            let parsed = WavePickStatus::from_db_str(raw).expect("规范值应可解析");
            assert_eq!(&parsed.as_db_str(), raw);
        }
        assert_eq!(
            WavePickStatus::from_read_str("pending")
                .unwrap()
                .as_db_str(),
            "created"
        );
        assert!(WavePickStatus::from_db_str("pending").is_err());
        assert!(WavePickStatus::from_db_str("posted").is_err());
    }

    #[test]
    fn workflow_matrix_is_consistent() {
        assert!(WavePickStatus::Created
            .can_transition_to(WavePickStatus::Assigned)
            .is_ok());
        assert!(WavePickStatus::Assigned
            .can_transition_to(WavePickStatus::Picking)
            .is_ok());
        assert!(WavePickStatus::Picking
            .can_transition_to(WavePickStatus::Completed)
            .is_ok());
        assert!(WavePickStatus::Created
            .can_transition_to(WavePickStatus::Picking)
            .is_err());
        assert!(WavePickStatus::Completed
            .can_transition_to(WavePickStatus::Cancelled)
            .is_err());
    }

    #[test]
    fn item_status_roundtrip_and_terminal() {
        for raw in ITEM_DB_VALUES {
            let parsed = WavePickItemStatus::from_db_str(raw).expect("明细值应可解析");
            assert_eq!(&parsed.as_db_str(), raw);
        }
        assert!(!WavePickItemStatus::Pending.is_terminal());
        assert!(WavePickItemStatus::Picked.is_terminal());
        assert!(WavePickItemStatus::from_db_str("partial").is_err());
    }
}

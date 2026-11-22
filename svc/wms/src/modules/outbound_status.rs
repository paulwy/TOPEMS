//! 出库单规范状态机。
//!
//! 状态集合与 `wms.outbound_orders.status` 的候选 CHECK 保持一致：
//! `created / confirmed / picking / packing / shipping / completed / cancelled`。
//!
//! 历史读兼容：旧前端把初始态写作 `pending`、把拣货完成写作 `picked`、
//! 把发货态写作 `shipped`，只读映射为 `created / picking / shipping`，不进入写入。

use topems_shared_core::fsm::FsmError;

/// 出库单允许持久化的全部状态，顺序即前端展示顺序。
pub const DB_VALUES: &[&str] = &[
    "created",
    "confirmed",
    "picking",
    "packing",
    "shipping",
    "completed",
    "cancelled",
];

/// 终态：不可再迁移。
pub const TERMINAL: &[&str] = &["completed", "cancelled"];

/// 允许的状态迁移。
///
/// - `packing -> picking`：审批驳回后的回退位。
/// - `packing -> shipping` 属于审批迁移，单列在 `APPROVAL_TRANSITIONS`。
pub const TRANSITIONS: &[(&str, &str)] = &[
    ("created", "confirmed"),
    ("created", "cancelled"),
    ("confirmed", "picking"),
    ("confirmed", "cancelled"),
    ("picking", "packing"),
    ("picking", "cancelled"),
    ("packing", "picking"),
    ("packing", "cancelled"),
    ("shipping", "completed"),
];

/// 需要审批的迁移。
pub const APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("packing", "shipping")];

/// 允许软删除的状态：仅初始态和已取消态。
pub const DELETABLE: &[OutboundStatus] = &[OutboundStatus::Created, OutboundStatus::Cancelled];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum OutboundStatus {
    Created,
    Confirmed,
    Picking,
    Packing,
    Shipping,
    Completed,
    Cancelled,
}

impl OutboundStatus {
    pub const DB_VALUES: &'static [&'static str] = super::outbound_status::DB_VALUES;

    pub const DEFAULT: Self = Self::Created;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Created => "created",
            Self::Confirmed => "confirmed",
            Self::Picking => "picking",
            Self::Packing => "packing",
            Self::Shipping => "shipping",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    /// 严格解析持久化值；未知值返回 400 错误文本。
    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "created" => Ok(Self::Created),
            "confirmed" => Ok(Self::Confirmed),
            "picking" => Ok(Self::Picking),
            "packing" => Ok(Self::Packing),
            "shipping" => Ok(Self::Shipping),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            other => Err(format!("未知出库单状态: {other}")),
        }
    }

    /// 读侧兼容旧前端/旧数据的别名，只映射规范态，不接受写入。
    pub fn from_read_str(raw: &str) -> Result<Self, String> {
        match raw {
            "pending" => Ok(Self::Created),
            "picked" => Ok(Self::Picking),
            "shipped" => Ok(Self::Shipping),
            other => Self::from_db_str(other),
        }
    }

    pub fn is_terminal(self) -> bool {
        TERMINAL.contains(&self.as_db_str())
    }

    pub const fn is_deletable(self) -> bool {
        matches!(self, Self::Created | Self::Cancelled)
    }

    /// 校验 `self -> to` 是否合法，错误语义与共享 FSM 对齐。
    pub fn can_transition_to(self, to: Self) -> Result<(), FsmError> {
        if self.is_terminal() {
            return Err(FsmError::TerminalState(self.as_db_str().to_string()));
        }
        if self == to {
            return Err(FsmError::InvalidTransition {
                from: self.as_db_str().to_string(),
                to: to.as_db_str().to_string(),
            });
        }
        let pair = (self.as_db_str(), to.as_db_str());
        if TRANSITIONS.contains(&pair) || APPROVAL_TRANSITIONS.contains(&pair) {
            Ok(())
        } else {
            Err(FsmError::InvalidTransition {
                from: self.as_db_str().to_string(),
                to: to.as_db_str().to_string(),
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_and_roundtrip_are_strict() {
        assert_eq!(OutboundStatus::DEFAULT, OutboundStatus::Created);
        for value in DB_VALUES {
            let parsed = OutboundStatus::from_db_str(value).expect("规范值应可解析");
            assert_eq!(parsed.as_db_str(), *value);
        }
        assert!(OutboundStatus::from_db_str("bogus").is_err());
        assert_eq!(
            OutboundStatus::from_read_str("pending").expect("旧初始态"),
            OutboundStatus::Created
        );
        assert_eq!(
            OutboundStatus::from_read_str("shipped").expect("旧发货态"),
            OutboundStatus::Shipping
        );
    }

    #[test]
    fn transition_matrix_matches_shared_fsm() {
        for (from, to) in TRANSITIONS {
            let from = OutboundStatus::from_db_str(from).expect("起始态");
            let to = OutboundStatus::from_db_str(to).expect("目标态");
            assert!(from.can_transition_to(to).is_ok(), "{from:?} -> {to:?}");
        }
        let created = OutboundStatus::Created;
        assert!(created.can_transition_to(OutboundStatus::Picking).is_err());
        let completed = OutboundStatus::Completed;
        assert!(completed
            .can_transition_to(OutboundStatus::Shipping)
            .is_err());
        assert!(!OutboundStatus::Packing.is_deletable());
        assert!(OutboundStatus::Created.is_deletable());
    }
}

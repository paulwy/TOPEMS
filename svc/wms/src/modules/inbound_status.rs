//! 入库单规范状态机。
//!
//! 状态集合与 `wms.inbound_orders.status` 的候选 CHECK 保持一致：
//! `created / confirmed / received / completed / cancelled`。
//!
//! 历史读兼容：旧前端把初始态写作 `pending`，只映射为 `created`，不进入写入。

use topems_shared_core::fsm::FsmError;

/// 入库单允许持久化的全部状态，顺序即前端展示顺序。
pub const DB_VALUES: &[&str] = &["created", "confirmed", "received", "completed", "cancelled"];

/// 终态：不可再迁移。
pub const TERMINAL: &[&str] = &["completed", "cancelled"];

/// 允许的状态迁移。
///
/// - `confirmed -> created`：审批驳回后的回退位。
/// - `received -> confirmed`：收货审批驳回回流。
/// - `received -> completed` 属于审批迁移，单列在 `APPROVAL_TRANSITIONS`。
pub const TRANSITIONS: &[(&str, &str)] = &[
    ("created", "confirmed"),
    ("created", "cancelled"),
    ("confirmed", "created"),
    ("confirmed", "received"),
    ("confirmed", "cancelled"),
    ("received", "confirmed"),
];

/// 需要审批的迁移。
pub const APPROVAL_TRANSITIONS: &[(&str, &str)] = &[("received", "completed")];

/// 允许软删除的状态：只有尚未进入履约的初始态和已取消态可删。
pub const DELETABLE: &[InboundStatus] = &[InboundStatus::Created, InboundStatus::Cancelled];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum InboundStatus {
    Created,
    Confirmed,
    Received,
    Completed,
    Cancelled,
}

impl InboundStatus {
    /// 关联常量别名，便于调用方以 `InboundStatus::DB_VALUES` 访问。
    pub const DB_VALUES: &'static [&'static str] = super::inbound_status::DB_VALUES;

    pub const DEFAULT: Self = Self::Created;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Created => "created",
            Self::Confirmed => "confirmed",
            Self::Received => "received",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    /// 严格解析持久化值；未知值返回 400 错误文本。
    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "created" => Ok(Self::Created),
            "confirmed" => Ok(Self::Confirmed),
            "received" => Ok(Self::Received),
            "completed" => Ok(Self::Completed),
            "cancelled" => Ok(Self::Cancelled),
            other => Err(format!("未知入库单状态: {other}")),
        }
    }

    /// 读侧兼容：`pending` 是旧前端/旧数据的初始态写法，只读映射为 `created`。
    pub fn from_read_str(raw: &str) -> Result<Self, String> {
        match raw {
            "pending" => Ok(Self::Created),
            other => Self::from_db_str(other),
        }
    }

    pub fn is_terminal(self) -> bool {
        TERMINAL.contains(&self.as_db_str())
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

    pub fn requires_approval(self, to: Self) -> bool {
        APPROVAL_TRANSITIONS.contains(&(self.as_db_str(), to.as_db_str()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn db_values_round_trip() {
        assert_eq!(DB_VALUES.len(), 5);
        for raw in DB_VALUES {
            let status = InboundStatus::from_db_str(raw).expect("canonical status should parse");
            assert_eq!(status.as_db_str(), *raw);
        }
        assert_eq!(InboundStatus::DEFAULT.as_db_str(), "created");
    }

    #[test]
    fn unknown_and_legacy_values() {
        assert!(InboundStatus::from_db_str("bogus").is_err());
        assert!(InboundStatus::from_db_str("pending").is_err());
        assert_eq!(
            InboundStatus::from_read_str("pending").expect("legacy read value"),
            InboundStatus::Created
        );
        assert!(InboundStatus::from_read_str("receiving").is_err());
    }

    #[test]
    fn forward_transitions() {
        assert!(InboundStatus::Created
            .can_transition_to(InboundStatus::Confirmed)
            .is_ok());
        assert!(InboundStatus::Confirmed
            .can_transition_to(InboundStatus::Received)
            .is_ok());
        assert!(InboundStatus::Confirmed
            .can_transition_to(InboundStatus::Cancelled)
            .is_ok());
        assert!(InboundStatus::Received
            .can_transition_to(InboundStatus::Completed)
            .is_ok());
    }

    #[test]
    fn receive_cannot_skip_confirmation() {
        assert!(InboundStatus::Created
            .can_transition_to(InboundStatus::Received)
            .is_err());
        assert!(InboundStatus::Created
            .can_transition_to(InboundStatus::Completed)
            .is_err());
    }

    #[test]
    fn approval_backflow_and_requirement() {
        assert!(InboundStatus::Received
            .can_transition_to(InboundStatus::Confirmed)
            .is_ok());
        assert!(InboundStatus::Received.requires_approval(InboundStatus::Completed));
        assert!(!InboundStatus::Confirmed.requires_approval(InboundStatus::Received));
    }

    #[test]
    fn terminal_states_block_everything() {
        for terminal in [InboundStatus::Completed, InboundStatus::Cancelled] {
            for target in [
                InboundStatus::Created,
                InboundStatus::Confirmed,
                InboundStatus::Received,
                InboundStatus::Completed,
                InboundStatus::Cancelled,
            ] {
                assert!(matches!(
                    terminal.can_transition_to(target),
                    Err(FsmError::TerminalState(_)) | Err(FsmError::InvalidTransition { .. })
                ));
            }
        }
    }

    #[test]
    fn self_transition_and_deletable_set() {
        assert!(InboundStatus::Created
            .can_transition_to(InboundStatus::Created)
            .is_err());
        assert_eq!(DELETABLE.len(), 2);
        assert!(DELETABLE.contains(&InboundStatus::Created));
        assert!(DELETABLE.contains(&InboundStatus::Cancelled));
        assert!(!DELETABLE.contains(&InboundStatus::Confirmed));
    }
}

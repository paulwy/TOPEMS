//! 入库明细质量结论规范状态。
//!
//! 与 `wms.inbound_order_items.quality_status` 的候选 CHECK 一致：
//! `pending / qualified / rejected`。
//!
//! 只有 `qualified` 会在收货事务内生成库存；`rejected` 只记录不合格，不入账。

use topems_shared_core::fsm::FsmError;

pub const DB_VALUES: &[&str] = &["pending", "qualified", "rejected"];

/// 终态：质量结论一旦落地，不允许通过通用编辑回退。
pub const TERMINAL: &[&str] = &["qualified", "rejected"];

pub const TRANSITIONS: &[(&str, &str)] = &[("pending", "qualified"), ("pending", "rejected")];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum InboundItemQualityStatus {
    Pending,
    Qualified,
    Rejected,
}

impl InboundItemQualityStatus {
    pub const DB_VALUES: &'static [&'static str] = super::inbound_item_quality_status::DB_VALUES;
    pub const DEFAULT: Self = Self::Pending;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Qualified => "qualified",
            Self::Rejected => "rejected",
        }
    }

    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "pending" => Ok(Self::Pending),
            "qualified" => Ok(Self::Qualified),
            "rejected" => Ok(Self::Rejected),
            other => Err(format!("未知入库明细质量状态: {other}")),
        }
    }

    pub fn is_terminal(self) -> bool {
        TERMINAL.contains(&self.as_db_str())
    }

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
        if TRANSITIONS.contains(&pair) {
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
    fn db_values_round_trip() {
        assert_eq!(DB_VALUES.len(), 3);
        for raw in DB_VALUES {
            let status =
                InboundItemQualityStatus::from_db_str(raw).expect("canonical quality status");
            assert_eq!(status.as_db_str(), *raw);
        }
        assert_eq!(InboundItemQualityStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn unknown_is_rejected() {
        assert!(InboundItemQualityStatus::from_db_str("bogus").is_err());
        assert!(InboundItemQualityStatus::from_db_str("pass").is_err());
        assert!(InboundItemQualityStatus::from_db_str("").is_err());
    }

    #[test]
    fn pending_can_conclude_once() {
        assert!(InboundItemQualityStatus::Pending
            .can_transition_to(InboundItemQualityStatus::Qualified)
            .is_ok());
        assert!(InboundItemQualityStatus::Pending
            .can_transition_to(InboundItemQualityStatus::Rejected)
            .is_ok());
    }

    #[test]
    fn terminal_cannot_be_rewritten() {
        for terminal in [
            InboundItemQualityStatus::Qualified,
            InboundItemQualityStatus::Rejected,
        ] {
            for target in [
                InboundItemQualityStatus::Pending,
                InboundItemQualityStatus::Qualified,
                InboundItemQualityStatus::Rejected,
            ] {
                assert!(matches!(
                    terminal.can_transition_to(target),
                    Err(FsmError::TerminalState(_)) | Err(FsmError::InvalidTransition { .. })
                ));
            }
        }
    }

    #[test]
    fn self_transition_is_invalid_for_non_terminal() {
        assert!(InboundItemQualityStatus::Pending
            .can_transition_to(InboundItemQualityStatus::Pending)
            .is_err());
    }
}

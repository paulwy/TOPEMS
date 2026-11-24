//! APQP 审批状态：`qms.qa_apqp_approvals.status` 的唯一值源。
//!
//! 创建固定 pending；处理只允许 pending → approved/rejected；审批结果为终态。

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ApqpApprovalStatus {
    #[default]
    Pending,
    Approved,
    Rejected,
}

impl ApqpApprovalStatus {
    pub const DEFAULT: Self = Self::Pending;
    pub const DB_VALUES: [&'static str; 3] = ["pending", "approved", "rejected"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            _ => None,
        }
    }

    /// 审批结果终态；同态幂等，pending 可二选一。
    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        if self == target {
            return Ok(());
        }
        match (self, target) {
            (Self::Pending, Self::Approved | Self::Rejected) => Ok(()),
            _ => Err(format!(
                "APQP 审批状态不允许从 {} 流转到 {}",
                self.as_db_str(),
                target.as_db_str()
            )),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::ApqpApprovalStatus;

    #[test]
    fn db_values_round_trip() {
        for value in ApqpApprovalStatus::DB_VALUES {
            assert_eq!(
                ApqpApprovalStatus::from_db_str(value).map(ApqpApprovalStatus::as_db_str),
                Some(value)
            );
        }
        assert_eq!(ApqpApprovalStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn transition_matrix() {
        assert!(ApqpApprovalStatus::Pending
            .can_transition_to(ApqpApprovalStatus::Approved)
            .is_ok());
        assert!(ApqpApprovalStatus::Pending
            .can_transition_to(ApqpApprovalStatus::Rejected)
            .is_ok());
        assert!(ApqpApprovalStatus::Pending
            .can_transition_to(ApqpApprovalStatus::Pending)
            .is_ok());
        assert!(ApqpApprovalStatus::Approved
            .can_transition_to(ApqpApprovalStatus::Rejected)
            .is_err());
        assert!(ApqpApprovalStatus::Rejected
            .can_transition_to(ApqpApprovalStatus::Approved)
            .is_err());
    }
}

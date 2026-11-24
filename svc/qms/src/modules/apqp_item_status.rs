//! APQP 阶段/任务状态：`qms.qa_apqp_phases.status` 与 `qms.qa_apqp_tasks.status` 的唯一值源。
//!
//! pending → in_progress → completed；completed 为终态，同态幂等。

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ApqpItemStatus {
    #[default]
    Pending,
    InProgress,
    Completed,
}

impl ApqpItemStatus {
    pub const DEFAULT: Self = Self::Pending;
    pub const DB_VALUES: [&'static str; 3] = ["pending", "in_progress", "completed"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }

    /// 阶段/任务均为线性三态：completed 终态，同态幂等。
    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        if self == target {
            return Ok(());
        }
        let allowed = match self {
            Self::Pending => matches!(target, Self::InProgress | Self::Completed),
            Self::InProgress => target == Self::Completed,
            Self::Completed => false,
        };
        if allowed {
            Ok(())
        } else {
            Err(format!(
                "APQP 阶段/任务状态不允许从 {} 流转到 {}",
                self.as_db_str(),
                target.as_db_str()
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::ApqpItemStatus;

    #[test]
    fn db_values_round_trip() {
        for value in ApqpItemStatus::DB_VALUES {
            assert_eq!(
                ApqpItemStatus::from_db_str(value).map(ApqpItemStatus::as_db_str),
                Some(value)
            );
        }
        assert_eq!(ApqpItemStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn transition_matrix() {
        assert!(ApqpItemStatus::Pending
            .can_transition_to(ApqpItemStatus::InProgress)
            .is_ok());
        assert!(ApqpItemStatus::Pending
            .can_transition_to(ApqpItemStatus::Completed)
            .is_ok());
        assert!(ApqpItemStatus::InProgress
            .can_transition_to(ApqpItemStatus::Completed)
            .is_ok());
        assert!(ApqpItemStatus::Pending
            .can_transition_to(ApqpItemStatus::Pending)
            .is_ok());
        assert!(ApqpItemStatus::InProgress
            .can_transition_to(ApqpItemStatus::Pending)
            .is_err());
        assert!(ApqpItemStatus::Completed
            .can_transition_to(ApqpItemStatus::InProgress)
            .is_err());
    }
}

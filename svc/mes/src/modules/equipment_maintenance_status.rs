//! 设备维护记录状态唯一集合。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EquipmentMaintenanceStatus {
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

impl EquipmentMaintenanceStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 4] = ["pending", "in_progress", "completed", "cancelled"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 维护状态迁移矩阵：同态幂等；completed / cancelled 为终态。
    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        if self == target {
            return Ok(());
        }
        let allowed = match self {
            Self::Pending => matches!(target, Self::InProgress | Self::Cancelled),
            Self::InProgress => matches!(target, Self::Completed | Self::Cancelled),
            Self::Completed | Self::Cancelled => false,
        };
        if allowed {
            Ok(())
        } else {
            Err(format!(
                "维护记录状态不允许从 {} 流转到 {}",
                self.as_db_str(),
                target.as_db_str()
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(EquipmentMaintenanceStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            EquipmentMaintenanceStatus::DB_VALUES,
            ["pending", "in_progress", "completed", "cancelled"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in EquipmentMaintenanceStatus::DB_VALUES {
            assert_eq!(
                EquipmentMaintenanceStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(EquipmentMaintenanceStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn transition_matrix_is_forward_only() {
        assert!(EquipmentMaintenanceStatus::Pending
            .can_transition_to(EquipmentMaintenanceStatus::InProgress)
            .is_ok());
        assert!(EquipmentMaintenanceStatus::Pending
            .can_transition_to(EquipmentMaintenanceStatus::Cancelled)
            .is_ok());
        assert!(EquipmentMaintenanceStatus::InProgress
            .can_transition_to(EquipmentMaintenanceStatus::Completed)
            .is_ok());
        assert!(EquipmentMaintenanceStatus::InProgress
            .can_transition_to(EquipmentMaintenanceStatus::Cancelled)
            .is_ok());
        assert!(EquipmentMaintenanceStatus::Pending
            .can_transition_to(EquipmentMaintenanceStatus::Pending)
            .is_ok());
        assert!(EquipmentMaintenanceStatus::Pending
            .can_transition_to(EquipmentMaintenanceStatus::Completed)
            .is_err());
        assert!(EquipmentMaintenanceStatus::Completed
            .can_transition_to(EquipmentMaintenanceStatus::Pending)
            .is_err());
        assert!(EquipmentMaintenanceStatus::Cancelled
            .can_transition_to(EquipmentMaintenanceStatus::InProgress)
            .is_err());
    }
}

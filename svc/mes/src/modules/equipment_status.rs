//! Equipment status vocabulary (W5-B / B189)

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum EquipmentStatus {
    #[default]
    Idle,
    Running,
    Maintenance,
    Fault,
    Scrapped,
}

impl EquipmentStatus {
    pub const DB_VALUES: &'static [&'static str] =
        &["idle", "running", "maintenance", "fault", "scrapped"];
    pub const DEFAULT: Self = Self::Idle;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Idle => "idle",
            Self::Running => "running",
            Self::Maintenance => "maintenance",
            Self::Fault => "fault",
            Self::Scrapped => "scrapped",
        }
    }

    pub fn from_db_str(value: &str) -> Option<Self> {
        match value {
            "idle" => Some(Self::Idle),
            "running" => Some(Self::Running),
            "maintenance" => Some(Self::Maintenance),
            "fault" => Some(Self::Fault),
            "scrapped" => Some(Self::Scrapped),
            _ => None,
        }
    }

    /// 报废为终态，其余四态之间允许运维调整；同态幂等。
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        self != Self::Scrapped
    }
}

#[cfg(test)]
mod tests {
    use super::EquipmentStatus;

    #[test]
    fn db_values_round_trip() {
        for value in EquipmentStatus::DB_VALUES {
            assert_eq!(
                EquipmentStatus::from_db_str(value).map(EquipmentStatus::as_db_str),
                Some(*value)
            );
        }
    }

    #[test]
    fn unknown_value_is_rejected() {
        assert!(EquipmentStatus::from_db_str("normal").is_none());
        assert!(EquipmentStatus::from_db_str("available").is_none());
        assert!(EquipmentStatus::from_db_str("bogus").is_none());
    }

    #[test]
    fn scrapped_is_terminal() {
        assert!(EquipmentStatus::Idle.can_transition_to(EquipmentStatus::Running));
        assert!(EquipmentStatus::Fault.can_transition_to(EquipmentStatus::Maintenance));
        assert!(!EquipmentStatus::Scrapped.can_transition_to(EquipmentStatus::Idle));
        assert!(EquipmentStatus::Scrapped.can_transition_to(EquipmentStatus::Scrapped));
    }
}

//! Equipment inspection record status vocabulary (W5-B / B193)

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum EquipmentInspectionRecordStatus {
    #[default]
    Completed,
    NeedsRepair,
}

impl EquipmentInspectionRecordStatus {
    pub const DB_VALUES: &'static [&'static str] = &["completed", "needs_repair"];
    pub const DEFAULT: Self = Self::Completed;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Completed => "completed",
            Self::NeedsRepair => "needs_repair",
        }
    }

    pub fn from_db_str(value: &str) -> Option<Self> {
        match value {
            "completed" => Some(Self::Completed),
            "needs_repair" => Some(Self::NeedsRepair),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::EquipmentInspectionRecordStatus;

    #[test]
    fn db_values_round_trip() {
        for value in EquipmentInspectionRecordStatus::DB_VALUES {
            assert_eq!(
                EquipmentInspectionRecordStatus::from_db_str(value)
                    .map(EquipmentInspectionRecordStatus::as_db_str),
                Some(*value)
            );
        }
    }

    #[test]
    fn unknown_value_is_rejected() {
        assert!(EquipmentInspectionRecordStatus::from_db_str("pending").is_none());
        assert!(EquipmentInspectionRecordStatus::from_db_str("bogus").is_none());
    }
}

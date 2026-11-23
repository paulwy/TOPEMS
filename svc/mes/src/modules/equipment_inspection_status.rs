//! Equipment inspection status vocabulary (W5-B / B190)

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum EquipmentInspectionStatus {
    #[default]
    Normal,
    Abnormal,
}

impl EquipmentInspectionStatus {
    pub const DB_VALUES: &'static [&'static str] = &["normal", "abnormal"];
    pub const DEFAULT: Self = Self::Normal;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Normal => "normal",
            Self::Abnormal => "abnormal",
        }
    }

    pub fn from_db_str(value: &str) -> Option<Self> {
        match value {
            "normal" => Some(Self::Normal),
            "abnormal" => Some(Self::Abnormal),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::EquipmentInspectionStatus;

    #[test]
    fn db_values_round_trip() {
        for value in EquipmentInspectionStatus::DB_VALUES {
            assert_eq!(
                EquipmentInspectionStatus::from_db_str(value)
                    .map(EquipmentInspectionStatus::as_db_str),
                Some(*value)
            );
        }
    }

    #[test]
    fn unknown_value_is_rejected() {
        assert!(EquipmentInspectionStatus::from_db_str("pending").is_none());
        assert!(EquipmentInspectionStatus::from_db_str("bogus").is_none());
    }
}

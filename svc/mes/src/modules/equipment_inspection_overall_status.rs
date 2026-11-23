//! Equipment inspection overall status vocabulary (W5-B / B193)

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum EquipmentInspectionOverallStatus {
    #[default]
    Normal,
    Abnormal,
}

impl EquipmentInspectionOverallStatus {
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
    use super::EquipmentInspectionOverallStatus;

    #[test]
    fn db_values_round_trip() {
        for value in EquipmentInspectionOverallStatus::DB_VALUES {
            assert_eq!(
                EquipmentInspectionOverallStatus::from_db_str(value)
                    .map(EquipmentInspectionOverallStatus::as_db_str),
                Some(*value)
            );
        }
    }

    #[test]
    fn unknown_value_is_rejected() {
        assert!(EquipmentInspectionOverallStatus::from_db_str("pass").is_none());
        assert!(EquipmentInspectionOverallStatus::from_db_str("bogus").is_none());
    }
}

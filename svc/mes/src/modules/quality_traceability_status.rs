//! Quality record status vocabulary (W5-B / B191)

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum QualityRecordStatus {
    #[default]
    Pending,
    Qualified,
    Rejected,
}

impl QualityRecordStatus {
    pub const DB_VALUES: &'static [&'static str] = &["pending", "qualified", "rejected"];
    pub const DEFAULT: Self = Self::Pending;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Qualified => "qualified",
            Self::Rejected => "rejected",
        }
    }

    pub fn from_db_str(value: &str) -> Option<Self> {
        match value {
            "pending" => Some(Self::Pending),
            "qualified" => Some(Self::Qualified),
            "rejected" => Some(Self::Rejected),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::QualityRecordStatus;

    #[test]
    fn db_values_round_trip() {
        for value in QualityRecordStatus::DB_VALUES {
            assert_eq!(
                QualityRecordStatus::from_db_str(value).map(QualityRecordStatus::as_db_str),
                Some(*value)
            );
        }
    }

    #[test]
    fn unknown_value_is_rejected() {
        assert!(QualityRecordStatus::from_db_str("pass").is_none());
        assert!(QualityRecordStatus::from_db_str("bogus").is_none());
    }
}

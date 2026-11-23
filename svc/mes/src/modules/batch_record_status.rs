//! Production batch record status vocabulary (W5-B / B192)

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum BatchRecordStatus {
    #[default]
    Active,
    Completed,
    Cancelled,
}

impl BatchRecordStatus {
    pub const DB_VALUES: &'static [&'static str] = &["active", "completed", "cancelled"];
    pub const DEFAULT: Self = Self::Active;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn from_db_str(value: &str) -> Option<Self> {
        match value {
            "active" => Some(Self::Active),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::BatchRecordStatus;

    #[test]
    fn db_values_round_trip() {
        for value in BatchRecordStatus::DB_VALUES {
            assert_eq!(
                BatchRecordStatus::from_db_str(value).map(BatchRecordStatus::as_db_str),
                Some(*value)
            );
        }
    }

    #[test]
    fn unknown_value_is_rejected() {
        assert!(BatchRecordStatus::from_db_str("archived").is_none());
        assert!(BatchRecordStatus::from_db_str("bogus").is_none());
    }
}

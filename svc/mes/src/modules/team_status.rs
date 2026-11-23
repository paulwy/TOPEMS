//! 班组状态唯一集合。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TeamStatus {
    Active,
    Inactive,
}

impl TeamStatus {
    pub const DEFAULT: Self = Self::Active;

    pub const DB_VALUES: [&'static str; 2] = ["active", "inactive"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(TeamStatus::DEFAULT.as_db_str(), "active");
        assert_eq!(TeamStatus::DB_VALUES, ["active", "inactive"]);
    }

    #[test]
    fn every_value_roundtrips() {
        for value in TeamStatus::DB_VALUES {
            assert_eq!(
                TeamStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(TeamStatus::from_db_str("bogus"), None);
    }
}

//! `public.core_menus.status` 的唯一值源（W5-B / B324）。
//!
//! DB CHECK：`active / inactive / archived`；`archived` 为终态。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MenuStatus {
    Active,
    Inactive,
    Archived,
}

impl MenuStatus {
    pub const DB_VALUES: [&'static str; 3] = ["active", "inactive", "archived"];
    pub const DEFAULT: Self = Self::Active;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Archived => "archived",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }

    /// active ↔ inactive，二者均可归档；archived 终态，同态幂等。
    #[must_use]
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        matches!(
            (self, target),
            (Self::Active, Self::Inactive | Self::Archived)
                | (Self::Inactive, Self::Active | Self::Archived)
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn values_roundtrip_and_unknown_rejected() {
        for value in MenuStatus::DB_VALUES {
            assert_eq!(
                MenuStatus::from_db_str(value).map(MenuStatus::as_str),
                Some(value)
            );
        }
        assert_eq!(MenuStatus::from_db_str("bogus"), None);
        assert_eq!(MenuStatus::DEFAULT.as_str(), "active");
    }

    #[test]
    fn archived_is_terminal() {
        assert!(MenuStatus::Active.can_transition_to(MenuStatus::Inactive));
        assert!(MenuStatus::Inactive.can_transition_to(MenuStatus::Active));
        assert!(MenuStatus::Active.can_transition_to(MenuStatus::Archived));
        assert!(MenuStatus::Inactive.can_transition_to(MenuStatus::Archived));
        assert!(!MenuStatus::Archived.can_transition_to(MenuStatus::Active));
        assert!(MenuStatus::Archived.can_transition_to(MenuStatus::Archived));
    }
}

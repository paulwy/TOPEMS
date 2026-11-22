//! MRP 建议状态唯一集合。
//!
//! 落库列：`scm.mrp_suggestions.status`（varchar，DB 默认 `draft`）。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MrpSuggestionStatus {
    Draft,
    Pending,
    Confirmed,
    Rejected,
    Completed,
}

impl MrpSuggestionStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "pending", "confirmed", "rejected", "completed"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Confirmed => "confirmed",
            Self::Rejected => "rejected",
            Self::Completed => "completed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" => Some(Self::Pending),
            "confirmed" => Some(Self::Confirmed),
            "rejected" => Some(Self::Rejected),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(MrpSuggestionStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(
            MrpSuggestionStatus::DB_VALUES,
            ["draft", "pending", "confirmed", "rejected", "completed"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in MrpSuggestionStatus::DB_VALUES {
            assert_eq!(
                MrpSuggestionStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(MrpSuggestionStatus::from_db_str("bogus"), None);
    }
}

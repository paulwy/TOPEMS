//! 物料需求状态唯一集合。
//!
//! 落库列：`mes.material_requirements.status`（varchar，DB 默认 `pending`）。
//! 值集与前端 `apps/web/src/schemas/mes/materialRequirement.ts` 一致。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MaterialRequirementStatus {
    Draft,
    Confirmed,
    Released,
    Completed,
    Cancelled,
}

impl MaterialRequirementStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "confirmed", "released", "completed", "cancelled"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Confirmed => "confirmed",
            Self::Released => "released",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "confirmed" => Some(Self::Confirmed),
            "released" => Some(Self::Released),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(MaterialRequirementStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(
            MaterialRequirementStatus::DB_VALUES,
            ["draft", "confirmed", "released", "completed", "cancelled"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in MaterialRequirementStatus::DB_VALUES {
            assert_eq!(
                MaterialRequirementStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(MaterialRequirementStatus::from_db_str("bogus"), None);
    }
}

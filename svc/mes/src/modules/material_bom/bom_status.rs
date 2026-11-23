//! 物料 BOM 状态唯一集合。
//!
//! 落库列：`mes.material_boms.status`（varchar，DB 默认 `draft`）。
//! 值集与前端 `apps/web/src/schemas/mes/materialBom.ts` 一致。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BomStatus {
    Draft,
    Active,
    Inactive,
    Obsolete,
}

impl BomStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 4] = ["draft", "active", "inactive", "obsolete"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Obsolete => "obsolete",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "obsolete" => Some(Self::Obsolete),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(BomStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(
            BomStatus::DB_VALUES,
            ["draft", "active", "inactive", "obsolete"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in BomStatus::DB_VALUES {
            assert_eq!(
                BomStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(BomStatus::from_db_str("bogus"), None);
    }
}

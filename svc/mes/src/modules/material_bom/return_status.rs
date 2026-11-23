//! 物料退库状态唯一集合。
//!
//! 落库列：`mes.material_returns.status`（varchar，DB 默认 `pending`）。
//! 值集与前端 `apps/web/src/schemas/mes/materialReturn.ts` 一致。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MaterialReturnStatus {
    Pending,
    Approved,
    Returned,
    Cancelled,
}

impl MaterialReturnStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 4] = ["pending", "approved", "returned", "cancelled"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Returned => "returned",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "returned" => Some(Self::Returned),
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
        assert_eq!(MaterialReturnStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            MaterialReturnStatus::DB_VALUES,
            ["pending", "approved", "returned", "cancelled"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in MaterialReturnStatus::DB_VALUES {
            assert_eq!(
                MaterialReturnStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(MaterialReturnStatus::from_db_str("bogus"), None);
    }
}

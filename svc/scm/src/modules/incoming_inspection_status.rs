//! 来料检验状态唯一集合。
//!
//! 落库列：`scm.incoming_inspections.status`（varchar，DB 默认 `pending`）。
//! 值集与前端 `apps/web/src/schemas/scm/incomingInspection.ts` 一致。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IncomingInspectionStatus {
    Pending,
    Passed,
    Failed,
}

impl IncomingInspectionStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 3] = ["pending", "passed", "failed"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Passed => "passed",
            Self::Failed => "failed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "passed" => Some(Self::Passed),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(IncomingInspectionStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            IncomingInspectionStatus::DB_VALUES,
            ["pending", "passed", "failed"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in IncomingInspectionStatus::DB_VALUES {
            assert_eq!(
                IncomingInspectionStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(IncomingInspectionStatus::from_db_str("bogus"), None);
    }
}

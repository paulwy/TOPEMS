//! 供应商评价状态唯一集合。
//!
//! 落库列：`scm.supplier_evaluations.status`（varchar，DB 默认 `draft`）。
//! 值集与前端 `apps/web/src/schemas/scm/evaluation.ts` 一致。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupplierEvaluationStatus {
    Draft,
    Submitted,
    Approved,
    Completed,
}

impl SupplierEvaluationStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 4] = ["draft", "submitted", "approved", "completed"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Submitted => "submitted",
            Self::Approved => "approved",
            Self::Completed => "completed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "submitted" => Some(Self::Submitted),
            "approved" => Some(Self::Approved),
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
        assert_eq!(SupplierEvaluationStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(
            SupplierEvaluationStatus::DB_VALUES,
            ["draft", "submitted", "approved", "completed"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in SupplierEvaluationStatus::DB_VALUES {
            assert_eq!(
                SupplierEvaluationStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(SupplierEvaluationStatus::from_db_str("bogus"), None);
    }
}

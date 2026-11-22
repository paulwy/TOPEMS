//! 供应商准入状态唯一集合。
//!
//! 落库列：`scm.supplier_admissions.status`（varchar，DB 默认 `draft`）。
//! 值集与前端 `apps/web/src/schemas/scm/supplierAdmission.ts` 一致。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupplierAdmissionStatus {
    Draft,
    Pending,
    Approved,
    Rejected,
    Active,
}

impl SupplierAdmissionStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 5] = ["draft", "pending", "approved", "rejected", "active"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Active => "active",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "active" => Some(Self::Active),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(SupplierAdmissionStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(
            SupplierAdmissionStatus::DB_VALUES,
            ["draft", "pending", "approved", "rejected", "active"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in SupplierAdmissionStatus::DB_VALUES {
            assert_eq!(
                SupplierAdmissionStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(SupplierAdmissionStatus::from_db_str("bogus"), None);
    }
}

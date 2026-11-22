//! SCM 供应商状态：`scm.suppliers.status` 的唯一值源。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupplierStatus {
    Active,
    Inactive,
    Pending,
}

impl SupplierStatus {
    pub const DB_VALUES: [&'static str; 3] = ["active", "inactive", "pending"];
    pub const DEFAULT: Self = Self::Active;

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Pending => "pending",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "pending" => Some(Self::Pending),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn supplier_status_roundtrip() {
        for value in SupplierStatus::DB_VALUES {
            let parsed = SupplierStatus::from_db_str(value).expect("valid supplier status");
            assert_eq!(parsed.as_db_str(), value);
        }
        assert!(SupplierStatus::from_db_str("PENDING").is_some());
        assert!(SupplierStatus::from_db_str("bogus").is_none());
    }
}

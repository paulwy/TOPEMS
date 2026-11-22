//! 主数据供应商状态：`master_data.mdm_suppliers.status` 的唯一值源。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupplierStatus {
    Active,
    Inactive,
    Pending,
    Blacklisted,
}

impl SupplierStatus {
    pub const DB_VALUES: [&'static str; 4] = ["active", "inactive", "pending", "blacklisted"];
    pub const DEFAULT: Self = Self::Active;

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Pending => "pending",
            Self::Blacklisted => "blacklisted",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "pending" => Some(Self::Pending),
            "blacklisted" => Some(Self::Blacklisted),
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
        assert!(SupplierStatus::from_db_str("BLACKLISTED").is_some());
        assert!(SupplierStatus::from_db_str("bogus").is_none());
    }
}

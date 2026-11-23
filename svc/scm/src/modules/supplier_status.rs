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

    /// 写入 `scm.suppliers.status` 的唯一字符串形式
    #[must_use]
    pub fn normalize(raw: &str) -> Option<&'static str> {
        Self::from_db_str(raw).map(Self::as_db_str)
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
        assert_eq!(SupplierStatus::normalize(" Active "), Some("active"));
    }
}

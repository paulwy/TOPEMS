//! 仓库状态规范集合。
//!
//! 状态集合与 `wms.warehouses.status` 的候选 CHECK 保持一致：
//! `active / inactive / maintenance / archived`。
//!
//! 这是属性型状态，不设审批 FSM；允许在四个值之间改判。

/// 仓库允许持久化的全部状态，顺序即前端展示顺序。
pub const DB_VALUES: &[&str] = &["active", "inactive", "maintenance", "archived"];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum WarehouseStatus {
    Active,
    Inactive,
    Maintenance,
    Archived,
}

impl WarehouseStatus {
    pub const DB_VALUES: &'static [&'static str] = super::warehouse_status::DB_VALUES;

    pub const DEFAULT: Self = Self::Active;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Maintenance => "maintenance",
            Self::Archived => "archived",
        }
    }

    /// 严格解析持久化值；未知值返回 400 错误文本。
    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "active" => Ok(Self::Active),
            "inactive" => Ok(Self::Inactive),
            "maintenance" => Ok(Self::Maintenance),
            "archived" => Ok(Self::Archived),
            other => Err(format!("未知仓库状态: {other}")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_and_roundtrip_are_strict() {
        assert_eq!(WarehouseStatus::DEFAULT, WarehouseStatus::Active);
        for value in DB_VALUES {
            let parsed = WarehouseStatus::from_db_str(value).expect("规范值应可解析");
            assert_eq!(parsed.as_db_str(), *value);
        }
        assert!(WarehouseStatus::from_db_str("bogus").is_err());
    }

    #[test]
    fn all_values_are_distinct() {
        let values: Vec<&str> = DB_VALUES.to_vec();
        let mut seen = std::collections::HashSet::new();
        for value in values {
            assert!(seen.insert(value), "重复仓库状态: {value}");
        }
    }
}

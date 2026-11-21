//! 库存质量状态规范集合。
//!
//! 与 `wms.inventory.quality_status` 的候选 CHECK 一致：
//! `qualified / unqualified / pending`。
//!
//! 这是库存属性而不是审批状态机：允许质检重判，不设终态；但只能在这三个规范值之间写入。

pub const DB_VALUES: &[&str] = &["qualified", "unqualified", "pending"];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum InventoryQualityStatus {
    Qualified,
    Unqualified,
    Pending,
}

impl InventoryQualityStatus {
    pub const DB_VALUES: &'static [&'static str] = super::inventory_quality_status::DB_VALUES;
    pub const DEFAULT: Self = Self::Qualified;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Qualified => "qualified",
            Self::Unqualified => "unqualified",
            Self::Pending => "pending",
        }
    }

    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "qualified" => Ok(Self::Qualified),
            "unqualified" => Ok(Self::Unqualified),
            "pending" => Ok(Self::Pending),
            other => Err(format!("未知库存质量状态: {other}")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn db_values_round_trip() {
        assert_eq!(DB_VALUES.len(), 3);
        for raw in DB_VALUES {
            let status = InventoryQualityStatus::from_db_str(raw).expect("canonical status");
            assert_eq!(status.as_db_str(), *raw);
        }
        assert_eq!(InventoryQualityStatus::DEFAULT.as_db_str(), "qualified");
    }

    #[test]
    fn rejects_unknown_values() {
        assert!(InventoryQualityStatus::from_db_str("normal").is_err());
        assert!(InventoryQualityStatus::from_db_str("rejected").is_err());
        assert!(InventoryQualityStatus::from_db_str("").is_err());
    }
}

//! 盘点明细质量状态规范集合。
//!
//! 与 `wms.inventory.quality_status` 的值域一致：`qualified / unqualified / pending`。
//! 盘点明细在开始盘点时从库存快照复制质量状态；库存值为空或非法时落 `pending`。
//!
//! 这是质量属性而不是流转状态：允许在三个值之间重判，不设终态，也不限制迁移方向。

pub const DB_VALUES: &[&str] = &["qualified", "unqualified", "pending"];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum StockTakeItemQualityStatus {
    Qualified,
    Unqualified,
    Pending,
}

impl StockTakeItemQualityStatus {
    pub const DB_VALUES: &'static [&'static str] = super::stock_take_item_quality_status::DB_VALUES;
    pub const DEFAULT: Self = Self::Pending;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Qualified => "qualified",
            Self::Unqualified => "unqualified",
            Self::Pending => "pending",
        }
    }

    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "qualified" => Some(Self::Qualified),
            "unqualified" => Some(Self::Unqualified),
            "pending" => Some(Self::Pending),
            _ => None,
        }
    }

    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        let from = self.as_db_str();
        let to = target.as_db_str();
        if Self::DB_VALUES.contains(&from) && Self::DB_VALUES.contains(&to) {
            Ok(())
        } else {
            Err(format!("盘点明细质量状态不允许从 {from} 流转到 {to}"))
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
            let status = StockTakeItemQualityStatus::from_db_str(raw).expect("canonical status");
            assert_eq!(status.as_db_str(), *raw);
            assert_eq!(status.can_transition_to(status), Ok(()));
        }
        assert_eq!(StockTakeItemQualityStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn rejects_unknown_values() {
        assert!(StockTakeItemQualityStatus::from_db_str("normal").is_none());
        assert!(StockTakeItemQualityStatus::from_db_str("rejected").is_none());
        assert!(StockTakeItemQualityStatus::from_db_str("").is_none());
    }

    #[test]
    fn quality_can_be_reclassified() {
        for from in DB_VALUES {
            for to in DB_VALUES {
                let source = StockTakeItemQualityStatus::from_db_str(from).unwrap();
                let target = StockTakeItemQualityStatus::from_db_str(to).unwrap();
                assert!(source.can_transition_to(target).is_ok());
            }
        }
    }
}

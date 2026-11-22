//! 运单状态唯一口径（W5-B B154）
//!
//! DB 值固定小写：draft / pending / in_transit / delivered / cancelled。
//! 状态流转由 `crate::shared::fsm::SHIPMENT` 统一定义，本枚举只负责值域与 DB 绑定。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShipmentStatus {
    Draft,
    Pending,
    InTransit,
    Delivered,
    Cancelled,
}

impl ShipmentStatus {
    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "pending", "in_transit", "delivered", "cancelled"];

    /// 创建运单直接进入待发车态，与现有 INSERT 行为一致。
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::InTransit => "in_transit",
            Self::Delivered => "delivered",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" => Some(Self::Pending),
            "in_transit" => Some(Self::InTransit),
            "delivered" => Some(Self::Delivered),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn db_values_roundtrip() {
        for value in ShipmentStatus::DB_VALUES {
            let parsed = ShipmentStatus::from_db_str(value).expect("canonical value parses");
            assert_eq!(parsed.as_db_str(), value);
        }
    }

    #[test]
    fn default_is_pending() {
        assert_eq!(ShipmentStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn rejects_unknown_and_accepts_legacy_spelling() {
        assert!(ShipmentStatus::from_db_str("bogus").is_none());
        assert_eq!(
            ShipmentStatus::from_db_str("CANCELLED").map(|s| s.as_db_str()),
            Some("cancelled")
        );
        assert_eq!(
            ShipmentStatus::from_db_str("canceled").map(|s| s.as_db_str()),
            Some("cancelled")
        );
    }
}

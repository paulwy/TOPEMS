//! 产能状态：`mes.capacities.status` 的唯一值源。
//!
//! 生命周期沿用 `shared::aps_fsm::CAPACITY`：
//! available → allocated → consumed；allocated → released；available ↔ maintenance。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CapacityStatus {
    Available,
    Allocated,
    Consumed,
    Maintenance,
    Released,
}

impl CapacityStatus {
    pub const DB_VALUES: [&'static str; 5] = [
        "available",
        "allocated",
        "consumed",
        "maintenance",
        "released",
    ];

    /// 新建产能记录的初始态
    pub const DEFAULT: Self = Self::Available;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "available" => Some(Self::Available),
            "allocated" => Some(Self::Allocated),
            "consumed" => Some(Self::Consumed),
            "maintenance" => Some(Self::Maintenance),
            "released" => Some(Self::Released),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Available => "available",
            Self::Allocated => "allocated",
            Self::Consumed => "consumed",
            Self::Maintenance => "maintenance",
            Self::Released => "released",
        }
    }

    /// 分配/提交：仅 available
    pub fn allocate_from() -> &'static [&'static str] {
        &["available"]
    }

    /// 释放：仅 allocated
    pub fn release_from() -> &'static [&'static str] {
        &["allocated"]
    }

    /// 进入维护：仅 available
    pub fn maintenance_from() -> &'static [&'static str] {
        &["available"]
    }

    /// 维护恢复：仅 maintenance
    pub fn restore_from() -> &'static [&'static str] {
        &["maintenance"]
    }
}

impl std::fmt::Display for CapacityStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in CapacityStatus::DB_VALUES {
            assert_eq!(
                CapacityStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(CapacityStatus::from_db_str("bogus"), None);
        assert_eq!(CapacityStatus::DEFAULT.as_db_str(), "available");
        assert!(CapacityStatus::allocate_from().contains(&"available"));
        assert!(CapacityStatus::release_from().contains(&"allocated"));
        assert!(CapacityStatus::restore_from().contains(&"maintenance"));
    }
}

//! 需求预测状态：`mes.demand_forecasts.status` 的唯一值源。
//!
//! 生命周期沿用 `shared::aps_fsm::DEMAND_FORECAST`：
//! draft → calculated → validated → adopted；superseded / cancelled 为终态。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DemandForecastStatus {
    Draft,
    Calculated,
    Validated,
    Adopted,
    Superseded,
    Cancelled,
}

impl DemandForecastStatus {
    pub const DB_VALUES: [&'static str; 6] = [
        "draft",
        "calculated",
        "validated",
        "adopted",
        "superseded",
        "cancelled",
    ];

    /// 新建需求预测的初始态
    pub const DEFAULT: Self = Self::Draft;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "calculated" => Some(Self::Calculated),
            "validated" => Some(Self::Validated),
            "adopted" => Some(Self::Adopted),
            "superseded" => Some(Self::Superseded),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Calculated => "calculated",
            Self::Validated => "validated",
            Self::Adopted => "adopted",
            Self::Superseded => "superseded",
            Self::Cancelled => "cancelled",
        }
    }

    /// 计算：仅 draft
    pub fn calculate_from() -> &'static [&'static str] {
        &["draft"]
    }

    /// 验证：仅 calculated
    pub fn validate_from() -> &'static [&'static str] {
        &["calculated"]
    }

    /// 采纳：仅 validated
    pub fn adopt_from() -> &'static [&'static str] {
        &["validated"]
    }
}

impl std::fmt::Display for DemandForecastStatus {
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
        for raw in DemandForecastStatus::DB_VALUES {
            assert_eq!(
                DemandForecastStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(DemandForecastStatus::from_db_str("bogus"), None);
        assert_eq!(DemandForecastStatus::DEFAULT.as_db_str(), "draft");
        assert!(DemandForecastStatus::calculate_from().contains(&"draft"));
        assert!(DemandForecastStatus::validate_from().contains(&"calculated"));
        assert!(DemandForecastStatus::adopt_from().contains(&"validated"));
    }
}

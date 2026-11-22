//! 销售预测状态：`crm.sales_forecasts.status` 的唯一值源。
//!
//! 现有写入口分别落 `draft`（手工创建）与 `generated`（自动生成），
//! 通用 PUT 直接接受任意字符串。本模块收敛为三值，并明确归档终态。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SalesForecastStatus {
    /// 手工创建、待生成或待审阅
    Draft,
    /// 系统自动生成
    Generated,
    /// 已归档
    Archived,
}

impl SalesForecastStatus {
    pub const DB_VALUES: [&'static str; 3] = ["draft", "generated", "archived"];

    pub const DEFAULT: Self = Self::Draft;

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "generated" => Some(Self::Generated),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Generated => "generated",
            Self::Archived => "archived",
        }
    }

    #[must_use]
    pub fn is_terminal(self) -> bool {
        matches!(self, Self::Archived)
    }

    /// 迁移：draft ↔ generated；draft/generated → archived；archived 终态。
    #[must_use]
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        matches!(
            (self, target),
            (Self::Draft, Self::Generated | Self::Archived)
                | (Self::Generated, Self::Draft | Self::Archived)
        )
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn sales_forecast_status_db_strings_roundtrip() {
        for raw in SalesForecastStatus::DB_VALUES {
            assert_eq!(
                SalesForecastStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(SalesForecastStatus::from_db_str("published"), None);
        assert_eq!(SalesForecastStatus::DEFAULT.as_db_str(), "draft");
        assert!(SalesForecastStatus::Draft.can_transition_to(SalesForecastStatus::Generated));
        assert!(SalesForecastStatus::Generated.can_transition_to(SalesForecastStatus::Draft));
        assert!(SalesForecastStatus::Generated.can_transition_to(SalesForecastStatus::Archived));
        assert!(!SalesForecastStatus::Archived.can_transition_to(SalesForecastStatus::Draft));
        assert!(SalesForecastStatus::Archived.is_terminal());
    }
}

//! 客户财务风险等级：`crm.customer_finance.risklevel` 的唯一值源。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FinanceRiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl FinanceRiskLevel {
    pub const DB_VALUES: [&'static str; 4] = ["low", "medium", "high", "critical"];
    pub const DEFAULT: Self = Self::Low;

    #[must_use]
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "low" => Some(Self::Low),
            "medium" => Some(Self::Medium),
            "high" => Some(Self::High),
            "critical" => Some(Self::Critical),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Critical => "critical",
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn finance_risk_level_roundtrip() {
        for raw in FinanceRiskLevel::DB_VALUES {
            assert_eq!(
                FinanceRiskLevel::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(FinanceRiskLevel::from_db_str("severe"), None);
        assert_eq!(FinanceRiskLevel::DEFAULT.as_db_str(), "low");
        assert_eq!(
            FinanceRiskLevel::from_db_str(" HIGH "),
            Some(FinanceRiskLevel::High)
        );
    }
}

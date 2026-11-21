//! 风险控制措施（ehs.qa_ehs_risk_controls）状态唯一集合。
//!
//! 落库列：`ehs.qa_ehs_risk_controls.status`（varchar，DB 默认 `active`）。
//! 本地 2 行：active 1 / completed 1；创建写 active，完成写 completed，completed 终态不可回退。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskControlStatus {
    Active,
    Completed,
}

impl RiskControlStatus {
    pub const DEFAULT: Self = Self::Active;

    pub const DB_VALUES: &'static [&'static str] = &["active", "completed"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Completed => "completed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "active" => Some(Self::Active),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }

    /// completed 为终态，不允许回退。
    #[must_use]
    pub fn update_from(target: Self) -> &'static [Self] {
        match target {
            Self::Active => &[Self::Active],
            Self::Completed => &[Self::Active, Self::Completed],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in RiskControlStatus::DB_VALUES {
            let parsed = RiskControlStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(RiskControlStatus::from_db_str("in_progress"), None);
        assert_eq!(RiskControlStatus::DEFAULT.as_db_str(), "active");
    }

    #[test]
    fn no_backward() {
        assert_eq!(
            RiskControlStatus::update_from(RiskControlStatus::Completed),
            &[RiskControlStatus::Active, RiskControlStatus::Completed]
        );
    }
}

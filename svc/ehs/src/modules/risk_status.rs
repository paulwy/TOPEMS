//! 风险评估状态唯一集合。
//!
//! 落库列：`ehs.qa_ehs_risks.status`（varchar，DB 默认 `identified`）。
//! 历史存量：identified / assessed / controlled。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskStatus {
    Identified,
    Assessed,
    Controlled,
}

impl RiskStatus {
    pub const DEFAULT: Self = Self::Identified;

    pub const DB_VALUES: &'static [&'static str] = &["identified", "assessed", "controlled"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Identified => "identified",
            Self::Assessed => "assessed",
            Self::Controlled => "controlled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "identified" => Some(Self::Identified),
            "assessed" => Some(Self::Assessed),
            "controlled" => Some(Self::Controlled),
            _ => None,
        }
    }

    /// 评估动作允许的起始态；已控制的风险不再重复评估。
    #[must_use]
    pub fn assessment_from(self) -> &'static [Self] {
        &[Self::Identified, Self::Assessed]
    }

    /// 编辑接口允许写入目标态时，当前态必须落在该集合内（只允许向前流转）。
    #[must_use]
    pub fn update_from(self) -> &'static [Self] {
        match self {
            Self::Identified => &[Self::Identified],
            Self::Assessed => &[Self::Identified, Self::Assessed],
            Self::Controlled => &[Self::Identified, Self::Assessed, Self::Controlled],
        }
    }

    #[must_use]
    pub fn db_values(states: &[Self]) -> Vec<&'static str> {
        states.iter().map(|s| s.as_db_str()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in RiskStatus::DB_VALUES {
            let parsed = RiskStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(RiskStatus::from_db_str("bogus"), None);
        assert_eq!(RiskStatus::from_db_str(""), None);
    }

    #[test]
    fn transitions_are_forward_only() {
        assert!(RiskStatus::Identified
            .update_from()
            .contains(&RiskStatus::Identified));
        assert!(!RiskStatus::Identified
            .update_from()
            .contains(&RiskStatus::Assessed));
        assert!(RiskStatus::Assessed
            .update_from()
            .contains(&RiskStatus::Assessed));
        assert!(RiskStatus::Controlled
            .update_from()
            .contains(&RiskStatus::Assessed));
        assert!(!RiskStatus::Assessed
            .assessment_from()
            .contains(&RiskStatus::Controlled));
        assert_eq!(RiskStatus::DEFAULT.as_db_str(), "identified");
    }
}

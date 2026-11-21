//! 商机状态：`crm.opportunities.status` 的唯一值源。
//!
//! 状态随阶段推进联动：open → won / lost / archived；回退时恢复 open。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OpportunityStatus {
    Open,
    Won,
    Lost,
    Archived,
}

impl OpportunityStatus {
    pub const DB_VALUES: [&'static str; 4] = ["open", "won", "lost", "archived"];

    /// 新建商机的初始态
    pub const DEFAULT: Self = Self::Open;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "open" => Some(Self::Open),
            "won" => Some(Self::Won),
            "lost" => Some(Self::Lost),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Won => "won",
            Self::Lost => "lost",
            Self::Archived => "archived",
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Won | Self::Lost | Self::Archived)
    }
}

impl std::fmt::Display for OpportunityStatus {
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
        for raw in OpportunityStatus::DB_VALUES {
            assert_eq!(
                OpportunityStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(OpportunityStatus::from_db_str("bogus"), None);
        assert_eq!(OpportunityStatus::DEFAULT.as_db_str(), "open");
        assert!(OpportunityStatus::Won.is_terminal());
        assert!(!OpportunityStatus::Open.is_terminal());
    }
}

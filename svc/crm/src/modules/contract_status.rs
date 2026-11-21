//! 合同状态：`crm.contracts.status` 的唯一值源。
//!
//! 合同生命周期：draft → pending → active → completed / expired；任意非终态 → terminated。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContractStatus {
    Draft,
    Pending,
    Active,
    Completed,
    Expired,
    Terminated,
}

impl ContractStatus {
    pub const DB_VALUES: [&'static str; 6] = [
        "draft",
        "pending",
        "active",
        "completed",
        "expired",
        "terminated",
    ];

    /// 新建合同的初始态
    pub const DEFAULT: Self = Self::Draft;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" => Some(Self::Pending),
            "active" => Some(Self::Active),
            "completed" => Some(Self::Completed),
            "expired" => Some(Self::Expired),
            "terminated" => Some(Self::Terminated),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Active => "active",
            Self::Completed => "completed",
            Self::Expired => "expired",
            Self::Terminated => "terminated",
        }
    }

    /// 已结束的状态：不可再回到草稿/待签署/生效中
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Expired | Self::Terminated)
    }
}

impl std::fmt::Display for ContractStatus {
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
        for raw in ContractStatus::DB_VALUES {
            assert_eq!(
                ContractStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(ContractStatus::from_db_str("bogus"), None);
        assert_eq!(ContractStatus::DEFAULT.as_db_str(), "draft");
        assert!(ContractStatus::Completed.is_terminal());
        assert!(!ContractStatus::Active.is_terminal());
    }
}

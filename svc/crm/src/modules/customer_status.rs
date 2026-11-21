//! 客户状态：`crm.customers.status` 的唯一值源。
//!
//! DB 已有 `ck_customers_status_standard`（active/inactive/archived），
//! 但写入口一直绑裸字符串，非法值靠 23514 变成 500。本模块让请求层先严格拒绝。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CustomerStatus {
    /// 活跃客户
    Active,
    /// 已停用
    Inactive,
    /// 已归档
    Archived,
}

impl CustomerStatus {
    /// `crm.customers.status` 允许的唯一集合（与 DB CHECK 一致）
    pub const DB_VALUES: [&'static str; 3] = ["active", "inactive", "archived"];

    /// 新建客户的默认态
    pub const DEFAULT: Self = Self::Active;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Archived => "archived",
        }
    }
}

impl std::fmt::Display for CustomerStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn customer_status_db_strings_roundtrip() {
        for s in CustomerStatus::DB_VALUES {
            assert_eq!(
                CustomerStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(CustomerStatus::from_db_str("deleted"), None);
        assert_eq!(CustomerStatus::DEFAULT.as_db_str(), "active");
    }
}

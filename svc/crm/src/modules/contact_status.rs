//! 联系人状态：`crm.contacts.status` 的唯一值源。
//!
//! DB 已有 `ck_contacts_status_standard`（active/inactive/archived）；
//! 创建接口一直写字面量 `'active'`，列表与编辑接口接受任意字符串。本模块让请求层先严格拒绝。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContactStatus {
    /// 活跃联系人
    Active,
    /// 已停用
    Inactive,
    /// 已归档
    Archived,
}

impl ContactStatus {
    /// `crm.contacts.status` 允许的唯一集合（与 DB CHECK 一致）
    pub const DB_VALUES: [&'static str; 3] = ["active", "inactive", "archived"];

    /// 新建联系人的默认态（与现有写入口一致）
    pub const DEFAULT: Self = Self::Active;

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Archived => "archived",
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in ContactStatus::DB_VALUES {
            let parsed = ContactStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(ContactStatus::from_db_str("disabled"), None);
        assert_eq!(ContactStatus::DEFAULT.as_db_str(), "active");
    }
}

//! 供应商状态：`srm.suppliers.status` 的唯一值源。
//!
//! DB 列默认 `active`；本地 97 行全为 active，无 CHECK。但
//! `database/init/04_create_scm_wms_srm_tables.sql` 里的
//! `ck_suppliers_status_standard` 只允许 active/inactive/archived，
//! 与删除接口实际写入的 `deleted`、以及 shared-core `SupplierStatus`
//! 的 pending/blacklisted 都不一致；生产若已建出该约束，删除供应商会 23514。
//! 本批以代码真实写入集合为准：active / inactive / pending / blacklisted / deleted。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SupplierRecordStatus {
    Active,
    Inactive,
    Pending,
    Blacklisted,
    /// 旧约束遗留：已归档
    Archived,
    Deleted,
}

impl SupplierRecordStatus {
    /// `srm.suppliers.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 6] = [
        "active",
        "inactive",
        "pending",
        "blacklisted",
        "archived",
        "deleted",
    ];

    /// 新建供应商默认态（与 DB 默认一致）
    pub const DEFAULT: Self = Self::Active;

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Pending => "pending",
            Self::Blacklisted => "blacklisted",
            Self::Archived => "archived",
            Self::Deleted => "deleted",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" | "disabled" => Some(Self::Inactive),
            "pending" => Some(Self::Pending),
            "blacklisted" | "blocked" => Some(Self::Blacklisted),
            "archived" => Some(Self::Archived),
            "deleted" => Some(Self::Deleted),
            _ => None,
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in SupplierRecordStatus::DB_VALUES {
            let parsed = SupplierRecordStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(SupplierRecordStatus::from_db_str("suspended"), None);
        assert_eq!(SupplierRecordStatus::DEFAULT.as_db_str(), "active");
    }
}

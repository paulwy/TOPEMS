//! 供应商合同状态：`srm.supplier_contracts.status` 的唯一值源。
//!
//! DB 列默认 `draft`，但 `database/init/04_create_scm_wms_srm_tables.sql` 里的
//! `ck_supplier_contracts_status_standard` 只允许 active/inactive/archived，
//! 默认值与约束自相矛盾（本地表甚至没有该约束）。本批以业务实际初始态为准：
//! draft → active → inactive/archived（active 为已生效，inactive 停用，archived 归档）。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SupplierContractStatus {
    /// 草稿
    Draft,
    /// 生效中
    Active,
    /// 已停用
    Inactive,
    /// 已归档
    Archived,
}

impl SupplierContractStatus {
    /// `srm.supplier_contracts.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["draft", "active", "inactive", "archived"];

    /// 新建合同的默认态（与 DB 默认一致）
    pub const DEFAULT: Self = Self::Draft;

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Archived => "archived",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "archived" => Some(Self::Archived),
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
        for raw in SupplierContractStatus::DB_VALUES {
            let parsed = SupplierContractStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(SupplierContractStatus::from_db_str("bogus"), None);
        assert_eq!(SupplierContractStatus::DEFAULT.as_db_str(), "draft");
    }
}

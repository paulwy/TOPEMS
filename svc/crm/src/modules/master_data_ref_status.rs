//! CRM 本地主数据引用状态：`crm.crm_master_data_refs.status` 的唯一值源。

use serde::{Deserialize, Serialize};
use topems_shared_event::event::MasterDataAction;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MasterDataRefStatus {
    Active,
    Inactive,
    Deleted,
}

impl MasterDataRefStatus {
    pub const DB_VALUES: [&'static str; 3] = ["active", "inactive", "deleted"];
    pub const DEFAULT: Self = Self::Active;

    /// 主数据动作到本地投影状态：新增/更新/启用 → active，停用 → inactive，删除 → deleted。
    #[must_use]
    pub fn from_action(action: MasterDataAction) -> Self {
        match action {
            MasterDataAction::Deleted => Self::Deleted,
            MasterDataAction::Deactivated => Self::Inactive,
            MasterDataAction::Created | MasterDataAction::Updated | MasterDataAction::Activated => {
                Self::Active
            }
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "deleted" => Some(Self::Deleted),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Deleted => "deleted",
        }
    }

    #[must_use]
    pub fn is_terminal(self) -> bool {
        matches!(self, Self::Deleted)
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn master_data_ref_status_db_strings_roundtrip() {
        for raw in MasterDataRefStatus::DB_VALUES {
            assert_eq!(
                MasterDataRefStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(MasterDataRefStatus::from_db_str("removed"), None);
        assert_eq!(MasterDataRefStatus::DEFAULT.as_db_str(), "active");
        assert_eq!(
            MasterDataRefStatus::from_action(MasterDataAction::Deactivated).as_db_str(),
            "inactive"
        );
        assert_eq!(
            MasterDataRefStatus::from_action(MasterDataAction::Deleted).as_db_str(),
            "deleted"
        );
        assert!(MasterDataRefStatus::Deleted.is_terminal());
    }
}

//! 危险品状态：`ehs.qa_ehs_hazardous_materials.status` 的唯一值源。
//!
//! 与前端 `HazardousMaterial.status` 契约一致：active / inactive / restricted / archived。
//! 四者均为运营态，可互相调整，不做不可逆终态限制。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HazardousMaterialStatus {
    Active,
    Inactive,
    Restricted,
    Archived,
}

impl HazardousMaterialStatus {
    /// `ehs.qa_ehs_hazardous_materials.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["active", "inactive", "restricted", "archived"];

    /// 新建记录的初始态，与列默认值一致
    pub const DEFAULT: Self = Self::Active;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "active" | "enabled" => Some(Self::Active),
            "inactive" | "disabled" => Some(Self::Inactive),
            "restricted" | "limited" | "controlled" => Some(Self::Restricted),
            "archived" | "archive" => Some(Self::Archived),
            _ => None,
        }
    }

    /// 写入 `ehs.qa_ehs_hazardous_materials.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Restricted => "restricted",
            Self::Archived => "archived",
        }
    }

    /// 归一化：未知值返回 `None`
    pub fn normalize(raw: &str) -> Option<&'static str> {
        Self::from_db_str(raw).map(|v| v.as_db_str())
    }

    /// 列表/更新参数解析
    pub fn parse_filter(raw: &str) -> Option<&'static str> {
        Self::normalize(raw)
    }

    /// 四个运营态之间允许互相调整；非法来源值拒绝
    pub fn can_transition_from(&self, from: &str) -> bool {
        Self::from_db_str(from).is_some()
    }

    /// 当前值集没有不可逆终态
    pub fn is_terminal(&self) -> bool {
        false
    }
}

impl std::fmt::Display for HazardousMaterialStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for HazardousMaterialStatus {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(s).ok_or(())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in HazardousMaterialStatus::DB_VALUES {
            assert_eq!(
                HazardousMaterialStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(HazardousMaterialStatus::from_db_str("expired"), None);
        assert_eq!(HazardousMaterialStatus::DEFAULT.as_db_str(), "active");
        assert_eq!(
            HazardousMaterialStatus::normalize("LIMITED"),
            Some("restricted")
        );
    }

    #[test]
    fn any_known_operational_state_is_reversible() {
        for target in HazardousMaterialStatus::DB_VALUES {
            for source in HazardousMaterialStatus::DB_VALUES {
                assert!(HazardousMaterialStatus::from_db_str(target)
                    .unwrap()
                    .can_transition_from(source));
            }
        }
        assert!(!HazardousMaterialStatus::Active.can_transition_from("expired"));
        assert!(!HazardousMaterialStatus::Restricted.is_terminal());
        assert!(!HazardousMaterialStatus::Archived.is_terminal());
    }
}

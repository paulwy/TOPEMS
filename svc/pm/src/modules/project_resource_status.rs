//! 项目资源状态：`pm.project_resources.status` 的唯一值源。
//!
//! 生命周期：available ↔ in_use ↔ maintenance；retired 为终态。
//! 兼容历史脏值：`allocated` / `active` / `idle` 均归一为 available。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectResourceStatus {
    Available,
    InUse,
    Maintenance,
    Retired,
}

impl ProjectResourceStatus {
    /// `pm.project_resources.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["available", "in_use", "maintenance", "retired"];

    /// 新建项目资源的初始态
    pub const DEFAULT: Self = Self::Available;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "available" | "allocated" | "active" | "idle" => Some(Self::Available),
            "in_use" | "in-use" | "inuse" | "occupied" => Some(Self::InUse),
            "maintenance" | "maintaining" => Some(Self::Maintenance),
            "retired" | "scrapped" => Some(Self::Retired),
            _ => None,
        }
    }

    /// 写入 `pm.project_resources.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Available => "available",
            Self::InUse => "in_use",
            Self::Maintenance => "maintenance",
            Self::Retired => "retired",
        }
    }

    /// 归一化：未知值返回 `None`
    pub fn normalize(raw: &str) -> Option<&'static str> {
        Self::from_db_str(raw).map(|v| v.as_db_str())
    }

    /// 列表过滤参数解析
    pub fn parse_filter(raw: &str) -> Option<&'static str> {
        Self::normalize(raw)
    }

    /// 是否允许从 `from` 流转到 `self`
    pub fn can_transition_from(&self, from: &str) -> bool {
        let Some(current) = Self::from_db_str(from) else {
            return false;
        };
        if *self == current {
            return true;
        }
        match current {
            Self::Available => matches!(self, Self::InUse | Self::Maintenance | Self::Retired),
            Self::InUse => matches!(self, Self::Available | Self::Maintenance | Self::Retired),
            Self::Maintenance => matches!(self, Self::Available | Self::InUse | Self::Retired),
            Self::Retired => false,
        }
    }

    /// retired 为终态，不可再分配
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Retired)
    }
}

impl std::fmt::Display for ProjectResourceStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for ProjectResourceStatus {
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
        for raw in ProjectResourceStatus::DB_VALUES {
            assert_eq!(
                ProjectResourceStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(ProjectResourceStatus::from_db_str("bogus"), None);
        assert_eq!(ProjectResourceStatus::DEFAULT.as_db_str(), "available");
        assert_eq!(
            ProjectResourceStatus::normalize(" Allocated "),
            Some("available")
        );
        assert_eq!(
            ProjectResourceStatus::normalize("ACTIVE"),
            Some("available")
        );
        assert_eq!(
            ProjectResourceStatus::parse_filter("in-use"),
            Some("in_use")
        );
        assert_eq!(ProjectResourceStatus::parse_filter("bogus"), None);
    }

    #[test]
    fn transitions_follow_resource_lifecycle() {
        assert!(ProjectResourceStatus::InUse.can_transition_from("available"));
        assert!(ProjectResourceStatus::Available.can_transition_from("in_use"));
        assert!(ProjectResourceStatus::Maintenance.can_transition_from("in_use"));
        assert!(ProjectResourceStatus::Available.can_transition_from("maintenance"));
        assert!(ProjectResourceStatus::Retired.can_transition_from("available"));
        assert!(!ProjectResourceStatus::Available.can_transition_from("retired"));
        assert!(!ProjectResourceStatus::InUse.can_transition_from("bogus"));
        assert!(ProjectResourceStatus::Available.can_transition_from("allocated"));
        assert!(ProjectResourceStatus::Retired.is_terminal());
        assert!(!ProjectResourceStatus::Available.is_terminal());
    }
}

//! 环境监测点状态：`ehs.qa_ehs_environment_monitors.status` 的唯一值源。
//!
//! 与前端 `EnvironmentMonitor.status` 契约一致：active / inactive / maintenance / archived。
//! 四者均为运营态，可互相调整，不做不可逆终态限制。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EnvironmentMonitorStatus {
    /// 启用监测
    Active,
    /// 停用监测
    Inactive,
    /// 维护中（暂停采集，待恢复）
    Maintenance,
    /// 已归档（只读保留）
    Archived,
}

impl EnvironmentMonitorStatus {
    /// `ehs.qa_ehs_environment_monitors.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["active", "inactive", "maintenance", "archived"];

    /// 新建监测点的初始态，与列默认值一致
    pub const DEFAULT: Self = Self::Active;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "active" | "enabled" => Some(Self::Active),
            "inactive" | "disabled" => Some(Self::Inactive),
            "maintenance" | "repairing" => Some(Self::Maintenance),
            "archived" | "archive" => Some(Self::Archived),
            _ => None,
        }
    }

    /// 写入 `ehs.qa_ehs_environment_monitors.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Maintenance => "maintenance",
            Self::Archived => "archived",
        }
    }

    /// 列表/更新参数解析
    pub fn normalize(raw: &str) -> Option<&'static str> {
        Self::from_db_str(raw).map(|v| v.as_db_str())
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

impl std::fmt::Display for EnvironmentMonitorStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for EnvironmentMonitorStatus {
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
        for raw in EnvironmentMonitorStatus::DB_VALUES {
            assert_eq!(
                EnvironmentMonitorStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(EnvironmentMonitorStatus::from_db_str("bogus"), None);
        assert_eq!(EnvironmentMonitorStatus::DEFAULT.as_db_str(), "active");
        assert_eq!(
            EnvironmentMonitorStatus::normalize("Repairing"),
            Some("maintenance")
        );
    }

    #[test]
    fn any_known_operational_state_is_reversible() {
        for target in EnvironmentMonitorStatus::DB_VALUES {
            for source in EnvironmentMonitorStatus::DB_VALUES {
                assert!(EnvironmentMonitorStatus::from_db_str(target)
                    .unwrap()
                    .can_transition_from(source));
            }
        }
        assert!(!EnvironmentMonitorStatus::Active.can_transition_from("bogus"));
        assert!(!EnvironmentMonitorStatus::Maintenance.is_terminal());
    }
}

//! 工位状态：`mes.work_stations.status` 的唯一值源。
//!
//! `active` 为线上创建态（代码路径唯一写入值），`available` 是历史种子/DB 默认值
//! （本地 10 行），`inactive` 为停用态。`available` 与 `active` 语义重叠，
//! 统一保留在集合内，待业务确认后再决定是否并入 `active`。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkStationStatus {
    /// 可用（历史种子与 DB 默认值）
    Available,
    /// 启用中（创建与激活写入口）
    Active,
    /// 已停用
    Inactive,
}

impl WorkStationStatus {
    /// `mes.work_stations.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 3] = ["available", "active", "inactive"];

    /// 创建工位的初始态（与现有写入口一致）
    pub const DEFAULT: Self = Self::Active;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "available" => Some(Self::Available),
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            _ => None,
        }
    }

    /// 写入 `mes.work_stations.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Available => "available",
            Self::Active => "active",
            Self::Inactive => "inactive",
        }
    }

    /// 停用允许的起始状态：启用中或历史种子可用态。
    /// `available` 与 `active` 语义等价，若不纳入，10 行种子工位永远无法停用。
    pub fn deactivate_from() -> &'static [&'static str] {
        &["available", "active"]
    }

    /// 激活允许的起始状态：停用态；已激活态允许幂等重放。
    pub fn activate_from() -> &'static [&'static str] {
        &["inactive", "active"]
    }
}

impl std::fmt::Display for WorkStationStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn work_station_status_db_strings_roundtrip() {
        for s in WorkStationStatus::DB_VALUES {
            assert_eq!(
                WorkStationStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(WorkStationStatus::from_db_str("maintenance"), None);
        assert_eq!(WorkStationStatus::DEFAULT.as_db_str(), "active");
        assert!(WorkStationStatus::deactivate_from().contains(&"active"));
        assert!(WorkStationStatus::deactivate_from().contains(&"available"));
        assert!(WorkStationStatus::activate_from().contains(&"inactive"));
        assert!(!WorkStationStatus::activate_from().contains(&"available"));
    }
}

//! 事件版本管理模块
//!
//! 支持事件版本注册、兼容性检查与灰度迁移（v1/v2 共存）。
//! 版本注册表使用内存存储（RwLock<HashMap>），适用于单实例治理场景；
//! 多实例场景下可结合外部存储进行同步。

use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{info, warn};

use super::error::{EventError, EventResult};

/// 事件版本号
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct EventVersion {
    pub major: u32,
    pub minor: u32,
}

impl EventVersion {
    pub fn new(major: u32, minor: u32) -> Self {
        Self { major, minor }
    }

    pub fn v1() -> Self {
        Self { major: 1, minor: 0 }
    }

    pub fn v2() -> Self {
        Self { major: 2, minor: 0 }
    }

    /// 版本兼容性检查：主版本号相同则兼容
    pub fn is_compatible_with(&self, other: &EventVersion) -> bool {
        self.major == other.major
    }
}

impl std::fmt::Display for EventVersion {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "v{}.{}", self.major, self.minor)
    }
}

impl Default for EventVersion {
    fn default() -> Self {
        Self::v1()
    }
}

/// 事件版本注册项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventVersionEntry {
    pub event_type: String,
    pub version: EventVersion,
    /// JSON Schema 描述
    pub schema: serde_json::Value,
    pub description: String,
    pub registered_at: DateTime<Utc>,
    pub deprecated: bool,
    pub deprecation_notice: Option<String>,
    /// 后继版本的事件类型标识（用于灰度迁移指引）
    pub successor: Option<String>,
}

impl EventVersionEntry {
    pub fn new(
        event_type: &str,
        version: EventVersion,
        schema: serde_json::Value,
        description: &str,
    ) -> Self {
        Self {
            event_type: event_type.to_string(),
            version,
            schema,
            description: description.to_string(),
            registered_at: Utc::now(),
            deprecated: false,
            deprecation_notice: None,
            successor: None,
        }
    }
}

/// 事件版本注册表统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventVersionRegistryStats {
    pub total_event_types: usize,
    pub total_versions: usize,
    pub deprecated_versions: usize,
    pub active_versions: usize,
}

/// 事件版本注册表
///
/// 集中管理事件类型的所有历史与现行版本，支持：
/// - 注册新版本
/// - 标记版本废弃
/// - 检查版本兼容性
/// - 灰度迁移指引
pub struct EventVersionRegistry {
    entries: Arc<RwLock<HashMap<String, Vec<EventVersionEntry>>>>,
}

impl Default for EventVersionRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl EventVersionRegistry {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 注册事件版本
    ///
    /// 如果同一 `event_type` + `version` 已存在，则覆盖原条目。
    pub fn register(&self, entry: EventVersionEntry) -> EventResult<()> {
        let mut entries = self.entries.write();
        let list = entries.entry(entry.event_type.clone()).or_default();
        if let Some(existing) = list.iter_mut().find(|e| e.version == entry.version) {
            warn!(
                event_type = %entry.event_type,
                version = %entry.version,
                "事件版本已存在，将被覆盖"
            );
            *existing = entry.clone();
        } else {
            info!(
                event_type = %entry.event_type,
                version = %entry.version,
                "注册事件版本"
            );
            list.push(entry);
        }
        // 按 version 降序排列，便于查找最新版本
        list.sort_by(|a, b| b.version.cmp(&a.version));
        Ok(())
    }

    /// 获取事件的所有版本（按版本号降序）
    pub fn get_versions(&self, event_type: &str) -> Vec<EventVersionEntry> {
        let entries = self.entries.read();
        entries.get(event_type).cloned().unwrap_or_default()
    }

    /// 获取最新版本
    pub fn get_latest_version(&self, event_type: &str) -> Option<EventVersionEntry> {
        let entries = self.entries.read();
        entries
            .get(event_type)
            .and_then(|list| list.iter().max_by_key(|e| e.version).cloned())
    }

    /// 获取指定版本
    pub fn get_version(
        &self,
        event_type: &str,
        version: &EventVersion,
    ) -> Option<EventVersionEntry> {
        let entries = self.entries.read();
        entries
            .get(event_type)
            .and_then(|list| list.iter().find(|e| &e.version == version).cloned())
    }

    /// 标记版本为废弃
    pub fn deprecate(
        &self,
        event_type: &str,
        version: EventVersion,
        notice: &str,
        successor: Option<&str>,
    ) -> EventResult<()> {
        let mut entries = self.entries.write();
        let list = entries
            .get_mut(event_type)
            .ok_or_else(|| EventError::InvalidEventType(event_type.to_string()))?;
        let entry = list
            .iter_mut()
            .find(|e| e.version == version)
            .ok_or_else(|| {
                EventError::ConfigError(format!("事件 {} 版本 {} 未注册", event_type, version))
            })?;
        entry.deprecated = true;
        entry.deprecation_notice = Some(notice.to_string());
        entry.successor = successor.map(|s| s.to_string());
        info!(
            event_type = %event_type,
            version = %version,
            "标记事件版本为废弃"
        );
        Ok(())
    }

    /// 检查版本兼容性
    ///
    /// 如果该 `event_type` 的最新已注册版本与传入 `version` 主版本号相同，
    /// 则视为兼容。
    pub fn check_compatibility(&self, event_type: &str, version: &EventVersion) -> bool {
        match self.get_latest_version(event_type) {
            Some(latest) => latest.version.is_compatible_with(version),
            None => false,
        }
    }

    /// 获取所有事件类型列表
    pub fn list_event_types(&self) -> Vec<String> {
        let entries = self.entries.read();
        let mut keys: Vec<String> = entries.keys().cloned().collect();
        keys.sort();
        keys
    }

    /// 获取注册表统计
    pub fn stats(&self) -> EventVersionRegistryStats {
        let entries = self.entries.read();
        let total_event_types = entries.len();
        let total_versions: usize = entries.values().map(|v| v.len()).sum();
        let deprecated_versions: usize = entries
            .values()
            .map(|v| v.iter().filter(|e| e.deprecated).count())
            .sum();
        EventVersionRegistryStats {
            total_event_types,
            total_versions,
            deprecated_versions,
            active_versions: total_versions - deprecated_versions,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn make_entry(event_type: &str, version: EventVersion) -> EventVersionEntry {
        EventVersionEntry::new(
            event_type,
            version,
            json!({
                "type": "object",
                "properties": {
                    "id": { "type": "string" }
                },
                "required": ["id"]
            }),
            "测试事件",
        )
    }

    #[test]
    fn test_event_version_compatibility() {
        let v1 = EventVersion::v1();
        let v1_1 = EventVersion::new(1, 1);
        let v2 = EventVersion::v2();

        assert!(v1.is_compatible_with(&v1_1));
        assert!(!v1.is_compatible_with(&v2));
        assert_eq!(format!("{}", v1), "v1.0");
        assert_eq!(format!("{}", v2), "v2.0");
    }

    #[test]
    fn test_version_registry_register() {
        let registry = EventVersionRegistry::new();
        let entry = make_entry("user.created", EventVersion::v1());
        registry.register(entry).unwrap();

        let versions = registry.get_versions("user.created");
        assert_eq!(versions.len(), 1);

        let latest = registry.get_latest_version("user.created").unwrap();
        assert_eq!(latest.version, EventVersion::v1());

        let stats = registry.stats();
        assert_eq!(stats.total_event_types, 1);
        assert_eq!(stats.total_versions, 1);
        assert_eq!(stats.active_versions, 1);
        assert_eq!(stats.deprecated_versions, 0);
    }

    #[test]
    fn test_version_registry_deprecate() {
        let registry = EventVersionRegistry::new();
        registry
            .register(make_entry("user.deleted", EventVersion::v1()))
            .unwrap();
        registry
            .register(make_entry("user.deleted", EventVersion::v2()))
            .unwrap();

        registry
            .deprecate(
                "user.deleted",
                EventVersion::v1(),
                "请使用 v2 版本",
                Some("user.deleted.v2"),
            )
            .unwrap();

        let v1_entry = registry
            .get_version("user.deleted", &EventVersion::v1())
            .unwrap();
        assert!(v1_entry.deprecated);
        assert_eq!(v1_entry.successor.as_deref(), Some("user.deleted.v2"));

        let stats = registry.stats();
        assert_eq!(stats.deprecated_versions, 1);
        assert_eq!(stats.active_versions, 1);
    }

    #[test]
    fn test_version_registry_compatibility() {
        let registry = EventVersionRegistry::new();
        registry
            .register(make_entry("order.created", EventVersion::v2()))
            .unwrap();

        assert!(registry.check_compatibility("order.created", &EventVersion::v2()));
        assert!(registry.check_compatibility("order.created", &EventVersion::new(2, 3)));
        assert!(!registry.check_compatibility("order.created", &EventVersion::v1()));
    }

    #[test]
    fn test_version_registry_list_and_stats() {
        let registry = EventVersionRegistry::new();
        registry
            .register(make_entry("a.created", EventVersion::v1()))
            .unwrap();
        registry
            .register(make_entry("b.updated", EventVersion::v1()))
            .unwrap();

        let types = registry.list_event_types();
        assert_eq!(types, vec!["a.created", "b.updated"]);
    }
}

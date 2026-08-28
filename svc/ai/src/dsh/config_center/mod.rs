//! DSH AI 配置管理中心模块
//!
//! 提供统一配置管理、动态配置更新、配置版本控制、配置验证、配置回滚等能力。

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::info;

// ============================================================================
// 类型定义
// ============================================================================

/// 配置项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigItem {
    /// 配置键（点分隔，如 "llm.provider.timeout"）
    pub key: String,
    /// 配置值
    pub value: serde_json::Value,
    /// 配置值类型
    pub value_type: ConfigValueType,
    /// 配置描述
    pub description: String,
    /// 配置分类
    pub category: String,
    /// 是否为敏感配置（如 API Key、密码）
    pub is_sensitive: bool,
    /// 是否可动态更新（运行时修改是否生效）
    pub is_dynamic: bool,
    /// 默认值
    pub default_value: Option<serde_json::Value>,
    /// 允许的值范围（可选）
    pub allowed_values: Option<Vec<serde_json::Value>>,
    /// 最小值（数值类型）
    pub min_value: Option<f64>,
    /// 最大值（数值类型）
    pub max_value: Option<f64>,
    /// 验证规则（正则表达式，字符串类型）
    pub validation_pattern: Option<String>,
    /// 配置标签
    pub tags: Vec<String>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
    /// 最后修改者
    pub last_modified_by: String,
    /// 配置版本号
    pub version: u32,
    /// 是否启用
    pub enabled: bool,
}

/// 配置值类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConfigValueType {
    /// 字符串
    String,
    /// 整数
    Integer,
    /// 浮点数
    Float,
    /// 布尔值
    Boolean,
    /// 数组
    Array,
    /// 对象
    Object,
    /// 持续时间（如 "30s", "5m"）
    Duration,
    /// 枚举
    Enum,
}

impl ConfigValueType {
    pub fn as_str(&self) -> &str {
        match self {
            ConfigValueType::String => "string",
            ConfigValueType::Integer => "integer",
            ConfigValueType::Float => "float",
            ConfigValueType::Boolean => "boolean",
            ConfigValueType::Array => "array",
            ConfigValueType::Object => "object",
            ConfigValueType::Duration => "duration",
            ConfigValueType::Enum => "enum",
        }
    }
}

/// 配置分类
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigCategory {
    /// 分类名称
    pub name: String,
    /// 分类描述
    pub description: String,
    /// 父分类（None 表示根分类）
    pub parent: Option<String>,
    /// 配置项数量
    pub item_count: u32,
    /// 排序
    pub order: u32,
}

/// 配置版本
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigVersion {
    /// 版本号
    pub version: u32,
    /// 配置键
    pub key: String,
    /// 配置值
    pub value: serde_json::Value,
    /// 修改时间
    pub modified_at: String,
    /// 修改者
    pub modified_by: String,
    /// 修改说明
    pub change_note: String,
}

/// 配置验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigValidationResult {
    /// 是否有效
    pub valid: bool,
    /// 配置键
    pub key: String,
    /// 错误信息
    pub errors: Vec<String>,
    /// 警告信息
    pub warnings: Vec<String>,
}

/// 配置变更事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigChangeEvent {
    /// 事件 ID
    pub event_id: String,
    /// 配置键
    pub key: String,
    /// 变更类型
    pub change_type: ConfigChangeType,
    /// 旧值
    pub old_value: Option<serde_json::Value>,
    /// 新值
    pub new_value: Option<serde_json::Value>,
    /// 变更时间
    pub changed_at: String,
    /// 变更者
    pub changed_by: String,
    /// 变更说明
    pub change_note: String,
}

/// 配置变更类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConfigChangeType {
    /// 创建
    Created,
    /// 更新
    Updated,
    /// 删除
    Deleted,
    /// 回滚
    RolledBack,
    /// 启用
    Enabled,
    /// 禁用
    Disabled,
}

impl ConfigChangeType {
    pub fn as_str(&self) -> &str {
        match self {
            ConfigChangeType::Created => "created",
            ConfigChangeType::Updated => "updated",
            ConfigChangeType::Deleted => "deleted",
            ConfigChangeType::RolledBack => "rolled_back",
            ConfigChangeType::Enabled => "enabled",
            ConfigChangeType::Disabled => "disabled",
        }
    }
}

/// 配置监听器
pub type ConfigChangeListener = Arc<dyn Fn(&ConfigChangeEvent) + Send + Sync>;

/// 配置管理中心配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigCenterConfig {
    /// 是否启用
    pub enabled: bool,
    /// 是否启用动态配置
    pub enable_dynamic_config: bool,
    /// 是否启用配置验证
    pub enable_validation: bool,
    /// 是否启用版本历史
    pub enable_version_history: bool,
    /// 版本历史最大保留数
    pub max_version_history: usize,
    /// 变更事件历史最大保留数
    pub max_change_history: usize,
    /// 是否启用变更通知
    pub enable_change_notification: bool,
    /// 配置缓存 TTL（秒）
    pub cache_ttl_seconds: u64,
}

impl Default for ConfigCenterConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            enable_dynamic_config: true,
            enable_validation: true,
            enable_version_history: true,
            max_version_history: 50,
            max_change_history: 1000,
            enable_change_notification: true,
            cache_ttl_seconds: 300,
        }
    }
}

/// 配置管理中心统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigCenterStats {
    /// 总配置项数
    pub total_configs: u64,
    /// 启用的配置项数
    pub enabled_configs: u64,
    /// 敏感配置项数
    pub sensitive_configs: u64,
    /// 动态配置项数
    pub dynamic_configs: u64,
    /// 配置分类数
    pub total_categories: u64,
    /// 总变更次数
    pub total_changes: u64,
    /// 验证失败次数
    pub validation_failures: u64,
    /// 回滚次数
    pub rollback_count: u64,
}

// ============================================================================
// 配置管理中心
// ============================================================================

/// 配置管理中心
#[derive(Clone)]
pub struct ConfigCenter {
    /// 配置
    config: ConfigCenterConfig,
    /// 配置项存储（键 -> 配置项）
    items: Arc<Mutex<HashMap<String, ConfigItem>>>,
    /// 配置分类
    categories: Arc<Mutex<HashMap<String, ConfigCategory>>>,
    /// 配置版本历史（键 -> 版本列表）
    version_history: Arc<Mutex<HashMap<String, VecDeque<ConfigVersion>>>>,
    /// 变更事件历史
    change_history: Arc<Mutex<VecDeque<ConfigChangeEvent>>>,
    /// 配置变更监听器
    listeners: Arc<Mutex<Vec<ConfigChangeListener>>>,
}

impl ConfigCenter {
    /// 创建新的配置管理中心
    pub fn new(config: ConfigCenterConfig) -> Self {
        let center = Self {
            config,
            items: Arc::new(Mutex::new(HashMap::new())),
            categories: Arc::new(Mutex::new(HashMap::new())),
            version_history: Arc::new(Mutex::new(HashMap::new())),
            change_history: Arc::new(Mutex::new(VecDeque::new())),
            listeners: Arc::new(Mutex::new(Vec::new())),
        };

        // 初始化默认配置
        center.init_default_configs();

        center
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(ConfigCenterConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &ConfigCenterConfig {
        &self.config
    }

    /// 初始化默认配置
    fn init_default_configs(&self) {
        let default_configs = vec![
            // LLM 配置
            ("llm.provider.timeout", ConfigValueType::Integer, serde_json::json!(30), "LLM 调用超时时间（秒）", "llm", false, true),
            ("llm.provider.max_retries", ConfigValueType::Integer, serde_json::json!(3), "LLM 调用最大重试次数", "llm", false, true),
            ("llm.provider.temperature", ConfigValueType::Float, serde_json::json!(0.7), "LLM 温度参数", "llm", false, true),
            ("llm.provider.max_tokens", ConfigValueType::Integer, serde_json::json!(2000), "LLM 最大生成 Token 数", "llm", false, true),
            ("llm.api_key", ConfigValueType::String, serde_json::json!(""), "LLM API 密钥", "llm", true, false),

            // 缓存配置
            ("cache.enabled", ConfigValueType::Boolean, serde_json::json!(true), "是否启用缓存", "cache", false, true),
            ("cache.ttl_seconds", ConfigValueType::Integer, serde_json::json!(300), "缓存 TTL（秒）", "cache", false, true),
            ("cache.max_size", ConfigValueType::Integer, serde_json::json!(10000), "缓存最大条目数", "cache", false, true),

            // 限流配置
            ("rate_limit.enabled", ConfigValueType::Boolean, serde_json::json!(true), "是否启用限流", "rate_limit", false, true),
            ("rate_limit.requests_per_second", ConfigValueType::Integer, serde_json::json!(10), "每秒最大请求数", "rate_limit", false, true),
            ("rate_limit.requests_per_minute", ConfigValueType::Integer, serde_json::json!(100), "每分钟最大请求数", "rate_limit", false, true),

            // 日志配置
            ("log.level", ConfigValueType::Enum, serde_json::json!("info"), "日志级别", "log", false, true),
            ("log.enabled", ConfigValueType::Boolean, serde_json::json!(true), "是否启用日志", "log", false, true),

            // 安全配置
            ("security.input_validation", ConfigValueType::Boolean, serde_json::json!(true), "是否启用输入校验", "security", false, true),
            ("security.output_redaction", ConfigValueType::Boolean, serde_json::json!(true), "是否启用输出脱敏", "security", false, true),
        ];

        for (key, value_type, value, description, category, is_sensitive, is_dynamic) in default_configs {
            let item = ConfigItem {
                key: key.to_string(),
                value,
                value_type,
                description: description.to_string(),
                category: category.to_string(),
                is_sensitive,
                is_dynamic,
                default_value: None,
                allowed_values: if value_type == ConfigValueType::Enum {
                    Some(vec![
                        serde_json::json!("debug"),
                        serde_json::json!("info"),
                        serde_json::json!("warn"),
                        serde_json::json!("error"),
                    ])
                } else {
                    None
                },
                min_value: None,
                max_value: None,
                validation_pattern: None,
                tags: vec![category.to_string()],
                created_at: chrono::Utc::now().to_rfc3339(),
                updated_at: chrono::Utc::now().to_rfc3339(),
                last_modified_by: "system".to_string(),
                version: 1,
                enabled: true,
            };

            self.items.lock().insert(key.to_string(), item);

            // 更新分类计数
            let mut categories = self.categories.lock();
            if let Some(cat) = categories.get_mut(category) {
                cat.item_count += 1;
            } else {
                categories.insert(
                    category.to_string(),
                    ConfigCategory {
                        name: category.to_string(),
                        description: format!("{} 配置", category),
                        parent: None,
                        item_count: 1,
                        order: 0,
                    },
                );
            }
        }

        info!("Default configs initialized");
    }

    /// 注册配置项
    pub fn register(&self, item: ConfigItem) -> Result<String, String> {
        if !self.config.enabled {
            return Err("配置管理中心未启用".to_string());
        }

        // 验证配置
        if self.config.enable_validation {
            let validation = self.validate_config_item(&item);
            if !validation.valid {
                return Err(format!("配置验证失败: {:?}", validation.errors));
            }
        }

        let key = item.key.clone();
        let now = chrono::Utc::now().to_rfc3339();

        // 检查是否已存在
        let exists = self.items.lock().contains_key(&key);

        // 保存版本历史
        if self.config.enable_version_history && exists {
            if let Some(old_item) = self.items.lock().get(&key).cloned() {
                self.save_version(&key, &old_item.value, "system", "配置更新前版本");
            }
        }

        // 保存配置
        self.items.lock().insert(key.clone(), item);

        // 记录变更事件
        self.record_change(ConfigChangeEvent {
            event_id: format!("evt_{}", uuid::Uuid::new_v4()),
            key: key.clone(),
            change_type: if exists { ConfigChangeType::Updated } else { ConfigChangeType::Created },
            old_value: None,
            new_value: None,
            changed_at: now,
            changed_by: "system".to_string(),
            change_note: if exists { "配置更新".to_string() } else { "配置创建".to_string() },
        });

        info!(key = %key, "Config item registered");
        Ok(key)
    }

    /// 获取配置项
    pub fn get(&self, key: &str) -> Option<ConfigItem> {
        self.items.lock().get(key).cloned()
    }

    /// 获取配置值
    pub fn get_value(&self, key: &str) -> Option<serde_json::Value> {
        self.items.lock().get(key).map(|item| item.value.clone())
    }

    /// 获取字符串配置值
    pub fn get_string(&self, key: &str) -> Option<String> {
        self.get_value(key).and_then(|v| v.as_str().map(|s| s.to_string()))
    }

    /// 获取整数配置值
    pub fn get_integer(&self, key: &str) -> Option<i64> {
        self.get_value(key).and_then(|v| v.as_i64())
    }

    /// 获取浮点数配置值
    pub fn get_float(&self, key: &str) -> Option<f64> {
        self.get_value(key).and_then(|v| v.as_f64())
    }

    /// 获取布尔值配置值
    pub fn get_boolean(&self, key: &str) -> Option<bool> {
        self.get_value(key).and_then(|v| v.as_bool())
    }

    /// 更新配置值
    pub fn set_value(
        &self,
        key: &str,
        value: serde_json::Value,
        modified_by: &str,
        change_note: &str,
    ) -> Result<(), String> {
        if !self.config.enabled {
            return Err("配置管理中心未启用".to_string());
        }

        let mut items = self.items.lock();
        let item = items
            .get_mut(key)
            .ok_or_else(|| format!("配置项 {} 不存在", key))?;

        // 检查是否可动态更新
        if !item.is_dynamic && self.config.enable_dynamic_config {
            return Err(format!("配置项 {} 不支持动态更新", key));
        }

        let old_value = item.value.clone();

        // 验证新值
        if self.config.enable_validation {
            let validation = self.validate_value(key, &value, item);
            if !validation.valid {
                return Err(format!("配置值验证失败: {:?}", validation.errors));
            }
        }

        // 保存版本历史
        if self.config.enable_version_history {
            self.save_version(key, &old_value, modified_by, change_note);
        }

        // 更新值
        item.value = value;
        item.version += 1;
        item.updated_at = chrono::Utc::now().to_rfc3339();
        item.last_modified_by = modified_by.to_string();

        let new_value = item.value.clone();
        drop(items);

        // 记录变更事件
        self.record_change(ConfigChangeEvent {
            event_id: format!("evt_{}", uuid::Uuid::new_v4()),
            key: key.to_string(),
            change_type: ConfigChangeType::Updated,
            old_value: Some(old_value),
            new_value: Some(new_value),
            changed_at: chrono::Utc::now().to_rfc3339(),
            changed_by: modified_by.to_string(),
            change_note: change_note.to_string(),
        });

        info!(key = %key, "Config value updated");
        Ok(())
    }

    /// 删除配置项
    pub fn delete(&self, key: &str, modified_by: &str) -> Result<(), String> {
        let mut items = self.items.lock();
        let item = items
            .remove(key)
            .ok_or_else(|| format!("配置项 {} 不存在", key))?;

        // 更新分类计数
        if let Some(cat) = self.categories.lock().get_mut(&item.category) {
            cat.item_count = cat.item_count.saturating_sub(1);
        }

        drop(items);

        // 记录变更事件
        self.record_change(ConfigChangeEvent {
            event_id: format!("evt_{}", uuid::Uuid::new_v4()),
            key: key.to_string(),
            change_type: ConfigChangeType::Deleted,
            old_value: Some(item.value),
            new_value: None,
            changed_at: chrono::Utc::now().to_rfc3339(),
            changed_by: modified_by.to_string(),
            change_note: "配置删除".to_string(),
        });

        info!(key = %key, "Config item deleted");
        Ok(())
    }

    /// 列出配置项
    pub fn list(&self, category_filter: Option<&str>, include_sensitive: bool) -> Vec<ConfigItem> {
        let items = self.items.lock();
        let mut result: Vec<ConfigItem> = items
            .values()
            .filter(|item| {
                if let Some(category) = category_filter {
                    if item.category != category {
                        return false;
                    }
                }
                if !include_sensitive && item.is_sensitive {
                    return false;
                }
                true
            })
            .cloned()
            .collect();

        result.sort_by(|a, b| a.key.cmp(&b.key));
        result
    }

    /// 获取配置版本历史
    pub fn get_version_history(&self, key: &str) -> Vec<ConfigVersion> {
        self.version_history
            .lock()
            .get(key)
            .map(|v| v.iter().cloned().collect())
            .unwrap_or_default()
    }

    /// 回滚到指定版本
    pub fn rollback(&self, key: &str, version: u32, modified_by: &str) -> Result<(), String> {
        let history = self.version_history.lock();
        let versions = history
            .get(key)
            .ok_or_else(|| format!("配置项 {} 没有版本历史", key))?;

        let target_version = versions
            .iter()
            .find(|v| v.version == version)
            .ok_or_else(|| format!("版本 {} 不存在", version))?
            .clone();

        drop(history);

        // 更新值
        self.set_value(key, target_version.value.clone(), modified_by, &format!("回滚到版本 {}", version))?;

        // 记录回滚事件
        self.record_change(ConfigChangeEvent {
            event_id: format!("evt_{}", uuid::Uuid::new_v4()),
            key: key.to_string(),
            change_type: ConfigChangeType::RolledBack,
            old_value: None,
            new_value: Some(target_version.value),
            changed_at: chrono::Utc::now().to_rfc3339(),
            changed_by: modified_by.to_string(),
            change_note: format!("回滚到版本 {}", version),
        });

        info!(key = %key, version = version, "Config rolled back");
        Ok(())
    }

    /// 验证配置项
    pub fn validate_config_item(&self, item: &ConfigItem) -> ConfigValidationResult {
        let mut errors = Vec::new();
        let warnings = Vec::new();

        // 检查键格式
        if item.key.is_empty() {
            errors.push("配置键不能为空".to_string());
        }

        // 检查值类型匹配
        let type_valid = match item.value_type {
            ConfigValueType::String => item.value.is_string(),
            ConfigValueType::Integer => item.value.is_i64() || item.value.is_u64(),
            ConfigValueType::Float => item.value.is_f64() || item.value.is_i64(),
            ConfigValueType::Boolean => item.value.is_boolean(),
            ConfigValueType::Array => item.value.is_array(),
            ConfigValueType::Object => item.value.is_object(),
            ConfigValueType::Duration => item.value.is_string(),
            ConfigValueType::Enum => item.value.is_string(),
        };

        if !type_valid {
            errors.push(format!(
                "配置值类型不匹配，期望 {}，实际 {:?}",
                item.value_type.as_str(),
                item.value
            ));
        }

        // 检查枚举值
        if item.value_type == ConfigValueType::Enum {
            if let Some(allowed) = &item.allowed_values {
                if !allowed.contains(&item.value) {
                    errors.push(format!("配置值不在允许的枚举值范围内: {:?}", allowed));
                }
            }
        }

        // 检查数值范围
        if item.value_type == ConfigValueType::Integer || item.value_type == ConfigValueType::Float {
            if let Some(num) = item.value.as_f64() {
                if let Some(min) = item.min_value {
                    if num < min {
                        errors.push(format!("配置值 {} 小于最小值 {}", num, min));
                    }
                }
                if let Some(max) = item.max_value {
                    if num > max {
                        errors.push(format!("配置值 {} 大于最大值 {}", num, max));
                    }
                }
            }
        }

        ConfigValidationResult {
            valid: errors.is_empty(),
            key: item.key.clone(),
            errors,
            warnings,
        }
    }

    /// 验证配置值
    fn validate_value(&self, _key: &str, value: &serde_json::Value, item: &ConfigItem) -> ConfigValidationResult {
        let mut temp_item = item.clone();
        temp_item.value = value.clone();
        self.validate_config_item(&temp_item)
    }

    /// 保存版本
    fn save_version(&self, key: &str, value: &serde_json::Value, modified_by: &str, change_note: &str) {
        let mut history = self.version_history.lock();
        let versions = history.entry(key.to_string()).or_insert_with(VecDeque::new);

        let version = ConfigVersion {
            version: versions.len() as u32 + 1,
            key: key.to_string(),
            value: value.clone(),
            modified_at: chrono::Utc::now().to_rfc3339(),
            modified_by: modified_by.to_string(),
            change_note: change_note.to_string(),
        };

        versions.push_back(version);

        // 限制版本历史数量
        if versions.len() > self.config.max_version_history {
            versions.pop_front();
        }
    }

    /// 记录变更事件
    fn record_change(&self, event: ConfigChangeEvent) {
        let mut history = self.change_history.lock();
        history.push_back(event.clone());
        if history.len() > self.config.max_change_history {
            history.pop_front();
        }
        drop(history);

        // 通知监听器
        if self.config.enable_change_notification {
            let listeners = self.listeners.lock();
            for listener in listeners.iter() {
                listener(&event);
            }
        }
    }

    /// 添加配置变更监听器
    pub fn add_listener(&self, listener: ConfigChangeListener) {
        self.listeners.lock().push(listener);
    }

    /// 获取变更历史
    pub fn get_change_history(&self, key_filter: Option<&str>, limit: Option<usize>) -> Vec<ConfigChangeEvent> {
        let history = self.change_history.lock();
        let mut result: Vec<ConfigChangeEvent> = if let Some(key) = key_filter {
            history.iter().filter(|e| e.key == key).cloned().collect()
        } else {
            history.iter().cloned().collect()
        };

        result.reverse(); // 最新的在前
        if let Some(lim) = limit {
            result.truncate(lim);
        }
        result
    }

    /// 获取配置分类
    pub fn get_categories(&self) -> Vec<ConfigCategory> {
        let categories = self.categories.lock();
        let mut result: Vec<ConfigCategory> = categories.values().cloned().collect();
        result.sort_by(|a, b| a.order.cmp(&b.order).then(a.name.cmp(&b.name)));
        result
    }

    /// 获取统计信息
    pub fn get_stats(&self) -> ConfigCenterStats {
        let items = self.items.lock();
        let categories = self.categories.lock();
        let change_history = self.change_history.lock();

        let enabled = items.values().filter(|i| i.enabled).count() as u64;
        let sensitive = items.values().filter(|i| i.is_sensitive).count() as u64;
        let dynamic = items.values().filter(|i| i.is_dynamic).count() as u64;

        ConfigCenterStats {
            total_configs: items.len() as u64,
            enabled_configs: enabled,
            sensitive_configs: sensitive,
            dynamic_configs: dynamic,
            total_categories: categories.len() as u64,
            total_changes: change_history.len() as u64,
            validation_failures: 0,
            rollback_count: change_history
                .iter()
                .filter(|e| e.change_type == ConfigChangeType::RolledBack)
                .count() as u64,
        }
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_center() -> ConfigCenter {
        ConfigCenter::with_defaults()
    }

    #[test]
    fn test_config_value_type_as_str() {
        assert_eq!(ConfigValueType::String.as_str(), "string");
        assert_eq!(ConfigValueType::Integer.as_str(), "integer");
        assert_eq!(ConfigValueType::Boolean.as_str(), "boolean");
    }

    #[test]
    fn test_config_change_type_as_str() {
        assert_eq!(ConfigChangeType::Created.as_str(), "created");
        assert_eq!(ConfigChangeType::Updated.as_str(), "updated");
        assert_eq!(ConfigChangeType::Deleted.as_str(), "deleted");
    }

    #[test]
    fn test_config_center_config_default() {
        let config = ConfigCenterConfig::default();
        assert!(config.enabled);
        assert!(config.enable_dynamic_config);
        assert!(config.enable_validation);
        assert_eq!(config.max_version_history, 50);
    }

    #[test]
    fn test_center_creation() {
        let center = create_test_center();
        assert!(center.config().enabled);
    }

    #[test]
    fn test_default_configs() {
        let center = create_test_center();
        let stats = center.get_stats();
        assert!(stats.total_configs > 0);
        assert!(stats.total_categories > 0);
    }

    #[test]
    fn test_get_config() {
        let center = create_test_center();
        let config = center.get("llm.provider.timeout");
        assert!(config.is_some());
        assert_eq!(config.unwrap().value, serde_json::json!(30));
    }

    #[test]
    fn test_get_value() {
        let center = create_test_center();
        let value = center.get_value("llm.provider.timeout");
        assert!(value.is_some());
        assert_eq!(value.unwrap(), serde_json::json!(30));
    }

    #[test]
    fn test_get_string() {
        let center = create_test_center();
        let value = center.get_string("log.level");
        assert_eq!(value, Some("info".to_string()));
    }

    #[test]
    fn test_get_integer() {
        let center = create_test_center();
        let value = center.get_integer("llm.provider.timeout");
        assert_eq!(value, Some(30));
    }

    #[test]
    fn test_get_boolean() {
        let center = create_test_center();
        let value = center.get_boolean("cache.enabled");
        assert_eq!(value, Some(true));
    }

    #[test]
    fn test_set_value() {
        let center = create_test_center();
        let result = center.set_value("llm.provider.timeout", serde_json::json!(60), "test_user", "测试更新");
        assert!(result.is_ok());

        let value = center.get_integer("llm.provider.timeout");
        assert_eq!(value, Some(60));
    }

    #[test]
    fn test_set_value_non_dynamic() {
        let center = create_test_center();
        // llm.api_key 是非动态配置
        let result = center.set_value("llm.api_key", serde_json::json!("new_key"), "test_user", "测试更新");
        assert!(result.is_err());
    }

    #[test]
    fn test_list_configs() {
        let center = create_test_center();
        let configs = center.list(None, false);
        assert!(!configs.is_empty());
        // 不包含敏感配置
        assert!(!configs.iter().any(|c| c.is_sensitive));
    }

    #[test]
    fn test_list_configs_by_category() {
        let center = create_test_center();
        let llm_configs = center.list(Some("llm"), false);
        assert!(!llm_configs.is_empty());
        assert!(llm_configs.iter().all(|c| c.category == "llm"));
    }

    #[test]
    fn test_list_configs_include_sensitive() {
        let center = create_test_center();
        let configs = center.list(None, true);
        assert!(configs.iter().any(|c| c.is_sensitive));
    }

    #[test]
    fn test_register_config() {
        let center = create_test_center();
        let item = ConfigItem {
            key: "test.custom.config".to_string(),
            value: serde_json::json!("test_value"),
            value_type: ConfigValueType::String,
            description: "测试配置".to_string(),
            category: "test".to_string(),
            is_sensitive: false,
            is_dynamic: true,
            default_value: None,
            allowed_values: None,
            min_value: None,
            max_value: None,
            validation_pattern: None,
            tags: vec!["test".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            last_modified_by: "test".to_string(),
            version: 1,
            enabled: true,
        };

        let result = center.register(item);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "test.custom.config");
    }

    #[test]
    fn test_delete_config() {
        let center = create_test_center();
        let item = ConfigItem {
            key: "test.to_delete".to_string(),
            value: serde_json::json!("value"),
            value_type: ConfigValueType::String,
            description: "待删除配置".to_string(),
            category: "test".to_string(),
            is_sensitive: false,
            is_dynamic: true,
            default_value: None,
            allowed_values: None,
            min_value: None,
            max_value: None,
            validation_pattern: None,
            tags: vec![],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            last_modified_by: "test".to_string(),
            version: 1,
            enabled: true,
        };

        center.register(item).unwrap();
        assert!(center.get("test.to_delete").is_some());

        let result = center.delete("test.to_delete", "test_user");
        assert!(result.is_ok());
        assert!(center.get("test.to_delete").is_none());
    }

    #[test]
    fn test_version_history() {
        let center = create_test_center();
        center.set_value("llm.provider.timeout", serde_json::json!(60), "user1", "第一次更新").unwrap();
        center.set_value("llm.provider.timeout", serde_json::json!(90), "user2", "第二次更新").unwrap();

        let history = center.get_version_history("llm.provider.timeout");
        assert!(history.len() >= 2);
    }

    #[test]
    fn test_change_history() {
        let center = create_test_center();
        center.set_value("llm.provider.timeout", serde_json::json!(60), "user1", "测试变更").unwrap();

        let history = center.get_change_history(Some("llm.provider.timeout"), None);
        assert!(!history.is_empty());
    }

    #[test]
    fn test_validate_config_item_valid() {
        let center = create_test_center();
        let item = ConfigItem {
            key: "test.valid".to_string(),
            value: serde_json::json!(42),
            value_type: ConfigValueType::Integer,
            description: "有效配置".to_string(),
            category: "test".to_string(),
            is_sensitive: false,
            is_dynamic: true,
            default_value: None,
            allowed_values: None,
            min_value: Some(0.0),
            max_value: Some(100.0),
            validation_pattern: None,
            tags: vec![],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            last_modified_by: "test".to_string(),
            version: 1,
            enabled: true,
        };

        let result = center.validate_config_item(&item);
        assert!(result.valid);
    }

    #[test]
    fn test_validate_config_item_invalid_type() {
        let center = create_test_center();
        let item = ConfigItem {
            key: "test.invalid".to_string(),
            value: serde_json::json!("not_a_number"),
            value_type: ConfigValueType::Integer,
            description: "无效配置".to_string(),
            category: "test".to_string(),
            is_sensitive: false,
            is_dynamic: true,
            default_value: None,
            allowed_values: None,
            min_value: None,
            max_value: None,
            validation_pattern: None,
            tags: vec![],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            last_modified_by: "test".to_string(),
            version: 1,
            enabled: true,
        };

        let result = center.validate_config_item(&item);
        assert!(!result.valid);
        assert!(!result.errors.is_empty());
    }

    #[test]
    fn test_get_categories() {
        let center = create_test_center();
        let categories = center.get_categories();
        assert!(!categories.is_empty());
    }

    #[test]
    fn test_get_stats() {
        let center = create_test_center();
        let stats = center.get_stats();
        assert!(stats.total_configs > 0);
        assert!(stats.enabled_configs > 0);
        assert!(stats.total_categories > 0);
    }

    #[test]
    fn test_add_listener() {
        let center = create_test_center();
        let change_count = Arc::new(Mutex::new(0));
        let count_clone = change_count.clone();

        center.add_listener(Arc::new(move |_event| {
            *count_clone.lock() += 1;
        }));

        center.set_value("llm.provider.timeout", serde_json::json!(60), "user1", "测试监听").unwrap();

        assert_eq!(*change_count.lock(), 1);
    }
}

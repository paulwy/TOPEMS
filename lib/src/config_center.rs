//! 配置中心模块
//!
//! 统一管理 TOPEMS 微服务的配置：
//! - 配置 Schema 定义与校验
//! - 配置版本管理与变更审计
//! - 从 services.yaml / 环境变量 / Consul KV 加载配置
//!
//! # 设计目标
//! - Schema 校验：所有配置项必须先注册 schema 才能写入
//! - 版本管理：每次变更记录历史版本，支持回滚
//! - 变更审计：记录变更人、时间、原因，满足合规要求
//! - 多源加载：支持从 services.yaml、环境变量、Consul KV 加载

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::error::{Result, TopemsError};

// ============================================================
// 配置 Schema 定义
// ============================================================

/// 配置项 Schema 定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigSchema {
    pub name: String,
    pub description: String,
    pub config_type: ConfigType,
    pub default_value: Option<serde_json::Value>,
    pub required: bool,
    pub env_var: Option<String>,
    pub consul_key: Option<String>,
    pub validation: Option<ValidationRule>,
}

/// 配置值类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ConfigType {
    String,
    Integer,
    Float,
    Boolean,
    Duration,
    Url,
    Secret,
}

/// 校验规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRule {
    pub min: Option<serde_json::Value>,
    pub max: Option<serde_json::Value>,
    pub pattern: Option<String>,
    pub allowed_values: Option<Vec<serde_json::Value>>,
}

// ============================================================
// 配置版本管理
// ============================================================

/// 配置版本记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigVersion {
    pub version_id: Uuid,
    pub config_key: String,
    pub value: serde_json::Value,
    pub previous_value: Option<serde_json::Value>,
    pub changed_by: Option<String>,
    pub changed_at: DateTime<Utc>,
    pub change_reason: Option<String>,
}

/// 配置变更审计日志
pub struct ConfigAuditLog {
    versions: Arc<RwLock<Vec<ConfigVersion>>>,
    max_history: usize,
}

impl ConfigAuditLog {
    /// 构造函数，默认保留 100 条历史
    pub fn new(max_history: usize) -> Self {
        Self {
            versions: Arc::new(RwLock::new(Vec::new())),
            max_history,
        }
    }

    /// 记录配置变更
    pub async fn record_change(
        &self,
        config_key: &str,
        value: serde_json::Value,
        previous_value: Option<serde_json::Value>,
        changed_by: Option<&str>,
        change_reason: Option<&str>,
    ) -> ConfigVersion {
        let version = ConfigVersion {
            version_id: Uuid::new_v4(),
            config_key: config_key.to_string(),
            value,
            previous_value,
            changed_by: changed_by.map(|s| s.to_string()),
            changed_at: Utc::now(),
            change_reason: change_reason.map(|s| s.to_string()),
        };

        let mut versions = self.versions.write().await;
        versions.push(version.clone());

        // 超过最大历史记录数时，淘汰最旧的记录
        if versions.len() > self.max_history {
            let excess = versions.len() - self.max_history;
            versions.drain(0..excess);
        }

        version
    }

    /// 获取指定配置的变更历史
    pub async fn get_history(&self, config_key: &str) -> Vec<ConfigVersion> {
        let versions = self.versions.read().await;
        versions
            .iter()
            .filter(|v| v.config_key == config_key)
            .cloned()
            .collect()
    }

    /// 获取最新版本
    pub async fn get_latest_version(&self, config_key: &str) -> Option<ConfigVersion> {
        let versions = self.versions.read().await;
        versions
            .iter()
            .rev()
            .find(|v| v.config_key == config_key)
            .cloned()
    }

    /// 回滚到指定版本
    ///
    /// 找到指定 version_id 的版本，将其值作为新版本写入，
    /// 这样既保留了回滚操作本身的审计记录，也恢复了历史值。
    pub async fn rollback(&self, config_key: &str, version_id: Uuid) -> Result<ConfigVersion> {
        // 在锁内查找目标版本，避免跨 await 持锁
        let target_value = {
            let versions = self.versions.read().await;
            versions
                .iter()
                .find(|v| v.config_key == config_key && v.version_id == version_id)
                .map(|v| v.value.clone())
        };

        let target_value = target_value.ok_or_else(|| {
            TopemsError::ResourceNotFound(format!(
                "配置版本未找到: key={}, version={}",
                config_key, version_id
            ))
        })?;

        // 获取当前最新值作为 previous_value
        let previous_value = self.get_latest_version(config_key).await.map(|c| c.value);

        let new_version = self
            .record_change(
                config_key,
                target_value,
                previous_value,
                Some("system"),
                Some(&format!("回滚到版本 {}", version_id)),
            )
            .await;

        Ok(new_version)
    }
}

impl Default for ConfigAuditLog {
    fn default() -> Self {
        Self::new(100)
    }
}

// ============================================================
// 配置中心管理器
// ============================================================

/// 配置中心管理器
pub struct ConfigCenter {
    schemas: Arc<RwLock<HashMap<String, ConfigSchema>>>,
    current_values: Arc<RwLock<HashMap<String, serde_json::Value>>>,
    audit_log: ConfigAuditLog,
}

impl ConfigCenter {
    pub fn new() -> Self {
        Self {
            schemas: Arc::new(RwLock::new(HashMap::new())),
            current_values: Arc::new(RwLock::new(HashMap::new())),
            audit_log: ConfigAuditLog::default(),
        }
    }

    /// 注册配置 Schema
    pub async fn register_schema(&self, schema: ConfigSchema) {
        let mut schemas = self.schemas.write().await;
        schemas.insert(schema.name.clone(), schema);
    }

    /// 获取配置值
    pub async fn get(&self, key: &str) -> Option<serde_json::Value> {
        let values = self.current_values.read().await;
        values.get(key).cloned()
    }

    /// 设置配置值（先校验，再写入，再记录审计）
    pub async fn set(
        &self,
        key: &str,
        value: serde_json::Value,
        changed_by: Option<&str>,
    ) -> Result<()> {
        // 校验
        self.validate(key, &value).await?;

        // 记录原值
        let previous = self.get(key).await;

        // 写入新值
        {
            let mut values = self.current_values.write().await;
            values.insert(key.to_string(), value.clone());
        }

        // 记录审计
        self.audit_log
            .record_change(key, value, previous, changed_by, None)
            .await;

        Ok(())
    }

    /// 校验配置值是否符合 Schema
    pub async fn validate(&self, key: &str, value: &serde_json::Value) -> Result<()> {
        let schemas = self.schemas.read().await;
        let schema = schemas.get(key).ok_or_else(|| {
            TopemsError::ConfigValidation(format!("配置项未注册 schema: {}", key))
        })?;

        // 类型校验
        Self::validate_type(&schema.config_type, value)
            .map_err(|e| TopemsError::ConfigValidation(format!("类型校验失败 [{}]: {}", key, e)))?;

        // 校验规则
        if let Some(rule) = &schema.validation {
            Self::validate_rule(rule, value).map_err(|e| {
                TopemsError::ConfigValidation(format!("规则校验失败 [{}]: {}", key, e))
            })?;
        }

        Ok(())
    }

    /// 列出所有已注册的 Schema
    pub async fn list_schemas(&self) -> Vec<ConfigSchema> {
        let schemas = self.schemas.read().await;
        let mut list: Vec<ConfigSchema> = schemas.values().cloned().collect();
        list.sort_by(|a, b| a.name.cmp(&b.name));
        list
    }

    /// 获取指定配置的变更审计日志
    pub async fn get_audit_log(&self, key: &str) -> Vec<ConfigVersion> {
        self.audit_log.get_history(key).await
    }

    /// 回滚到指定版本
    pub async fn rollback(&self, key: &str, version_id: Uuid) -> Result<()> {
        // 找到目标版本
        let versions = self.audit_log.get_history(key).await;
        let target = versions
            .iter()
            .find(|v| v.version_id == version_id)
            .cloned()
            .ok_or_else(|| {
                TopemsError::ResourceNotFound(format!(
                    "配置版本未找到: key={}, version={}",
                    key, version_id
                ))
            })?;

        // 校验目标值是否符合当前 schema
        self.validate(key, &target.value).await?;

        // 写入回滚后的值
        let previous = self.get(key).await;
        {
            let mut values = self.current_values.write().await;
            values.insert(key.to_string(), target.value.clone());
        }

        // 记录回滚操作的审计日志
        self.audit_log
            .record_change(
                key,
                target.value,
                previous,
                Some("system"),
                Some(&format!("回滚到版本 {}", version_id)),
            )
            .await;

        Ok(())
    }

    /// 从环境变量加载配置
    ///
    /// 遍历所有已注册的 schema，若 schema 定义了 env_var 且环境中存在该变量，
    /// 则将其转换为对应类型并写入配置中心。
    pub async fn load_from_env(&self) -> Result<()> {
        let schemas = self.schemas.read().await;
        let mut to_load: Vec<(String, String, ConfigType)> = Vec::new();
        for (name, schema) in schemas.iter() {
            if let Some(env_var) = &schema.env_var {
                if let Ok(val) = std::env::var(env_var) {
                    to_load.push((name.clone(), val, schema.config_type.clone()));
                } else if schema.required && schema.default_value.is_none() {
                    return Err(TopemsError::EnvVarNotSet(env_var.clone()));
                }
            }
        }
        drop(schemas);

        for (key, raw, config_type) in to_load {
            let value = Self::parse_value(&config_type, &raw).map_err(|e| {
                TopemsError::ConfigValidation(format!("解析环境变量失败 [{}]: {}", key, e))
            })?;

            // 直接写入，不通过 set() 以避免重复触发 schema 查找
            let previous = self.get(&key).await;
            {
                let mut values = self.current_values.write().await;
                values.insert(key.clone(), value.clone());
            }
            self.audit_log
                .record_change(&key, value, previous, Some("env-loader"), None)
                .await;
        }

        Ok(())
    }

    /// 导出配置快照
    pub async fn export_snapshot(&self) -> serde_json::Value {
        let values = self.current_values.read().await;
        let mut snapshot: HashMap<String, serde_json::Value> = HashMap::new();
        for (k, v) in values.iter() {
            snapshot.insert(k.clone(), v.clone());
        }
        serde_json::to_value(snapshot).unwrap_or_else(|_| serde_json::Value::Null)
    }

    // ============================================================
    // 从 services.yaml 加载
    // ============================================================

    /// 从 services.yaml 加载服务配置
    ///
    /// 读取 services.yaml，为每个服务生成配置 schema 并注册，
    /// 同时将端口作为初始值写入配置中心。
    pub async fn load_services_config(&self, yaml_path: &str) -> Result<()> {
        let content = std::fs::read_to_string(yaml_path).map_err(|e| {
            TopemsError::FileOperation(format!("读取 services.yaml 失败: {}: {}", yaml_path, e))
        })?;

        let parsed: ServicesYaml = serde_yaml::from_str(&content)
            .map_err(|e| TopemsError::ConfigLoad(format!("解析 services.yaml 失败: {}", e)))?;

        // 注册 service_groups 下的服务
        for (group, services) in &parsed.service_groups {
            for svc in services {
                let key = format!("service.{}.port", svc.name);
                let schema = ConfigSchema {
                    name: key.clone(),
                    description: format!("{} - {} (group: {})", svc.name, svc.description, group),
                    config_type: ConfigType::Integer,
                    default_value: Some(serde_json::json!(svc.port)),
                    required: false,
                    env_var: Some(svc.env_var.clone()),
                    consul_key: Some(format!("topems/services/{}/port", svc.name)),
                    validation: Some(ValidationRule {
                        min: Some(serde_json::json!(1024)),
                        max: Some(serde_json::json!(65535)),
                        pattern: None,
                        allowed_values: None,
                    }),
                };
                self.register_schema(schema).await;
                // 写入默认值
                self.set(&key, serde_json::json!(svc.port), Some("services.yaml"))
                    .await?;

                // 同时为服务依赖关系生成 schema
                let dep_key = format!("service.{}.dependencies", svc.name);
                let dep_schema = ConfigSchema {
                    name: dep_key.clone(),
                    description: format!("{} 服务依赖列表", svc.name),
                    config_type: ConfigType::String,
                    default_value: Some(serde_json::json!(svc.dependencies.join(","))),
                    required: false,
                    env_var: None,
                    consul_key: Some(format!("topems/services/{}/dependencies", svc.name)),
                    validation: None,
                };
                self.register_schema(dep_schema).await;
                self.set(
                    &dep_key,
                    serde_json::json!(svc.dependencies.join(",")),
                    Some("services.yaml"),
                )
                .await?;
            }
        }

        // 注册虚拟服务
        for svc in &parsed.virtual_services {
            let key = format!("service.{}.port", svc.name);
            let schema = ConfigSchema {
                name: key.clone(),
                description: format!(
                    "{} - {} (虚拟服务, provider: {})",
                    svc.name, svc.description, svc.provider
                ),
                config_type: ConfigType::Integer,
                default_value: Some(serde_json::json!(svc.port)),
                required: false,
                env_var: Some(svc.env_var.clone()),
                consul_key: Some(format!("topems/services/{}/port", svc.name)),
                validation: None,
            };
            self.register_schema(schema).await;
            self.set(&key, serde_json::json!(svc.port), Some("services.yaml"))
                .await?;
        }

        // 注册特殊端口
        for (name, spec) in &parsed.special_ports {
            let key = format!("service.{}.port", name);
            let schema = ConfigSchema {
                name: key.clone(),
                description: spec.description.clone(),
                config_type: ConfigType::Integer,
                default_value: Some(serde_json::json!(spec.port)),
                required: false,
                env_var: Some(spec.env_var.clone()),
                consul_key: Some(format!("topems/services/{}/port", name)),
                validation: Some(ValidationRule {
                    min: Some(serde_json::json!(1024)),
                    max: Some(serde_json::json!(65535)),
                    pattern: None,
                    allowed_values: None,
                }),
            };
            self.register_schema(schema).await;
            self.set(&key, serde_json::json!(spec.port), Some("services.yaml"))
                .await?;
        }

        Ok(())
    }

    // ============================================================
    // Consul KV 配置同步（stub 实现）
    // ============================================================

    /// 从 Consul KV 加载配置
    ///
    /// Stub 实现：调用 Consul HTTP API `GET /v1/kv/topems?recurse` 获取所有配置。
    /// 当前为占位实现，仅记录日志，实际部署时可替换为真实 HTTP 调用。
    pub async fn load_from_consul(&self, consul_url: &str) -> Result<()> {
        tracing::info!(
            target: "topems::config_center",
            consul_url = %consul_url,
            "load_from_consul: stub called, skipping actual HTTP request"
        );
        Ok(())
    }

    /// 将当前配置推送到 Consul KV
    ///
    /// Stub 实现：遍历当前配置，调用 `PUT /v1/kv/topems/{key}` 推送到 Consul。
    /// 当前为占位实现，仅记录日志。
    pub async fn push_to_consul(&self, consul_url: &str) -> Result<()> {
        let values = self.current_values.read().await;
        let count = values.len();
        tracing::info!(
            target: "topems::config_center",
            consul_url = %consul_url,
            config_count = count,
            "push_to_consul: stub called, would push {} config entries",
            count
        );
        Ok(())
    }

    /// 启动 Consul KV 变更监听（长轮询）
    ///
    /// Stub 实现：使用 `GET /v1/kv/topems?index={index}` 长轮询监听变更。
    /// 当前为占位实现，仅记录日志后立即返回。生产环境中应作为长驻任务运行。
    pub async fn watch_consul_changes(&self, consul_url: &str) -> Result<()> {
        tracing::info!(
            target: "topems::config_center",
            consul_url = %consul_url,
            "watch_consul_changes: stub called, long-polling not started in stub mode"
        );
        Ok(())
    }

    // ============================================================
    // 内部辅助方法
    // ============================================================

    fn validate_type(config_type: &ConfigType, value: &serde_json::Value) -> Result<()> {
        let ok = match (config_type, value) {
            (ConfigType::String, serde_json::Value::String(_)) => true,
            (ConfigType::Integer, serde_json::Value::Number(n)) => n.is_i64() || n.is_u64(),
            (ConfigType::Float, serde_json::Value::Number(n)) => {
                n.is_f64() || n.is_i64() || n.is_u64()
            }
            (ConfigType::Boolean, serde_json::Value::Bool(_)) => true,
            (ConfigType::Duration, serde_json::Value::String(_)) => true,
            (ConfigType::Url, serde_json::Value::String(_)) => true,
            (ConfigType::Secret, serde_json::Value::String(_)) => true,
            _ => false,
        };
        if ok {
            Ok(())
        } else {
            Err(TopemsError::ConfigValidation(format!(
                "值类型不匹配，期望 {:?}",
                config_type
            )))
        }
    }

    fn validate_rule(rule: &ValidationRule, value: &serde_json::Value) -> Result<()> {
        // allowed_values 优先
        if let Some(allowed) = &rule.allowed_values {
            if !allowed.iter().any(|v| v == value) {
                return Err(TopemsError::ConfigValidation(format!(
                    "值 {:?} 不在允许的取值列表中",
                    value
                )));
            }
            return Ok(());
        }

        // 数值类型支持 min/max
        if let Some(min) = &rule.min {
            if !Self::value_ge(value, min) {
                return Err(TopemsError::ConfigValidation(format!(
                    "值 {:?} 小于最小值 {:?}",
                    value, min
                )));
            }
        }
        if let Some(max) = &rule.max {
            if !Self::value_le(value, max) {
                return Err(TopemsError::ConfigValidation(format!(
                    "值 {:?} 大于最大值 {:?}",
                    value, max
                )));
            }
        }

        // 字符串类型支持 pattern（正则匹配）
        if let Some(pattern) = &rule.pattern {
            if let serde_json::Value::String(s) = value {
                let re = regex::Regex::new(pattern).map_err(|e| {
                    TopemsError::ConfigValidation(format!("无效的正则模式 {}: {}", pattern, e))
                })?;
                if !re.is_match(s) {
                    return Err(TopemsError::ConfigValidation(format!(
                        "值 {:?} 不匹配模式 {}",
                        s, pattern
                    )));
                }
            }
        }

        Ok(())
    }

    /// value >= min（仅对数值生效）
    fn value_ge(value: &serde_json::Value, min: &serde_json::Value) -> bool {
        match (value.as_f64(), min.as_f64()) {
            (Some(v), Some(m)) => v >= m,
            _ => true, // 非数值类型不参与比较
        }
    }

    /// value <= max（仅对数值生效）
    fn value_le(value: &serde_json::Value, max: &serde_json::Value) -> bool {
        match (value.as_f64(), max.as_f64()) {
            (Some(v), Some(m)) => v <= m,
            _ => true,
        }
    }

    /// 将字符串按配置类型解析为 JSON 值
    fn parse_value(config_type: &ConfigType, raw: &str) -> Result<serde_json::Value> {
        Ok(match config_type {
            ConfigType::String | ConfigType::Duration | ConfigType::Url | ConfigType::Secret => {
                serde_json::Value::String(raw.to_string())
            }
            ConfigType::Integer => {
                let v: i64 = raw.parse().map_err(|_| {
                    TopemsError::ConfigValidation(format!("无法解析为整数: {}", raw))
                })?;
                serde_json::json!(v)
            }
            ConfigType::Float => {
                let v: f64 = raw.parse().map_err(|_| {
                    TopemsError::ConfigValidation(format!("无法解析为浮点数: {}", raw))
                })?;
                serde_json::json!(v)
            }
            ConfigType::Boolean => {
                let v: bool = match raw.to_lowercase().as_str() {
                    "true" | "1" | "yes" | "on" => true,
                    "false" | "0" | "no" | "off" => false,
                    _ => {
                        return Err(TopemsError::ConfigValidation(format!(
                            "无法解析为布尔值: {}",
                            raw
                        )))
                    }
                };
                serde_json::json!(v)
            }
        })
    }
}

impl Default for ConfigCenter {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================
// services.yaml 反序列化结构
// ============================================================

#[derive(Debug, Deserialize)]
struct ServicesYaml {
    #[serde(default)]
    service_groups: HashMap<String, Vec<ServiceEntry>>,
    #[serde(default)]
    virtual_services: Vec<VirtualServiceEntry>,
    #[serde(default)]
    special_ports: HashMap<String, SpecialPortEntry>,
}

#[derive(Debug, Deserialize)]
struct ServiceEntry {
    name: String,
    port: u16,
    env_var: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    dependencies: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct VirtualServiceEntry {
    name: String,
    port: u16,
    env_var: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    provider: String,
}

#[derive(Debug, Deserialize)]
struct SpecialPortEntry {
    port: u16,
    env_var: String,
    #[serde(default)]
    description: String,
}

// ============================================================
// 单元测试
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn string_schema(name: &str) -> ConfigSchema {
        ConfigSchema {
            name: name.to_string(),
            description: format!("{} test schema", name),
            config_type: ConfigType::String,
            default_value: None,
            required: false,
            env_var: None,
            consul_key: None,
            validation: None,
        }
    }

    fn integer_schema(name: &str, min: i64, max: i64) -> ConfigSchema {
        ConfigSchema {
            name: name.to_string(),
            description: format!("{} integer schema", name),
            config_type: ConfigType::Integer,
            default_value: None,
            required: false,
            env_var: None,
            consul_key: None,
            validation: Some(ValidationRule {
                min: Some(serde_json::json!(min)),
                max: Some(serde_json::json!(max)),
                pattern: None,
                allowed_values: None,
            }),
        }
    }

    #[tokio::test]
    async fn test_config_set_get() {
        let cc = ConfigCenter::new();
        cc.register_schema(string_schema("app.name")).await;

        cc.set("app.name", serde_json::json!("TOPEMS"), Some("tester"))
            .await
            .unwrap();

        let v = cc.get("app.name").await;
        assert_eq!(v, Some(serde_json::json!("TOPEMS")));
    }

    #[tokio::test]
    async fn test_config_validation() {
        let cc = ConfigCenter::new();
        cc.register_schema(integer_schema("app.pool.size", 1, 100))
            .await;

        // 合法值
        cc.set("app.pool.size", serde_json::json!(50), Some("tester"))
            .await
            .unwrap();

        // 类型错误
        let err = cc
            .set(
                "app.pool.size",
                serde_json::json!("not int"),
                Some("tester"),
            )
            .await;
        assert!(err.is_err());

        // 超出最大值
        let err = cc
            .set("app.pool.size", serde_json::json!(200), Some("tester"))
            .await;
        assert!(err.is_err());

        // 小于最小值
        let err = cc
            .set("app.pool.size", serde_json::json!(0), Some("tester"))
            .await;
        assert!(err.is_err());

        // 未注册 schema
        let err = cc
            .set("unknown.key", serde_json::json!("x"), Some("tester"))
            .await;
        assert!(err.is_err());
    }

    #[tokio::test]
    async fn test_config_audit_log() {
        let cc = ConfigCenter::new();
        cc.register_schema(integer_schema("app.audit.key", 0, 1000))
            .await;

        cc.set("app.audit.key", serde_json::json!(1), Some("user1"))
            .await
            .unwrap();
        cc.set("app.audit.key", serde_json::json!(2), Some("user2"))
            .await
            .unwrap();
        cc.set("app.audit.key", serde_json::json!(3), Some("user3"))
            .await
            .unwrap();

        let history = cc.get_audit_log("app.audit.key").await;
        assert_eq!(history.len(), 3);
        // 最新值应为 3
        let latest = cc.audit_log.get_latest_version("app.audit.key").await;
        assert_eq!(latest.unwrap().value, serde_json::json!(3));
        // previous_value 链
        assert_eq!(history[0].previous_value, None);
        assert_eq!(history[1].previous_value, Some(serde_json::json!(1)));
        assert_eq!(history[2].previous_value, Some(serde_json::json!(2)));
    }

    #[tokio::test]
    async fn test_config_rollback() {
        let cc = ConfigCenter::new();
        cc.register_schema(integer_schema("app.rollback.key", 0, 1000))
            .await;

        cc.set("app.rollback.key", serde_json::json!(10), Some("user1"))
            .await
            .unwrap();
        let v1 = cc
            .audit_log
            .get_latest_version("app.rollback.key")
            .await
            .unwrap();

        cc.set("app.rollback.key", serde_json::json!(20), Some("user2"))
            .await
            .unwrap();
        let v2 = cc
            .audit_log
            .get_latest_version("app.rollback.key")
            .await
            .unwrap();

        // 回滚到 v1
        cc.rollback("app.rollback.key", v1.version_id)
            .await
            .unwrap();

        // 当前值应为 10
        assert_eq!(
            cc.get("app.rollback.key").await,
            Some(serde_json::json!(10))
        );

        // 回滚到不存在的 version_id 应报错
        let err = cc.rollback("app.rollback.key", Uuid::new_v4()).await;
        assert!(err.is_err());

        // 回滚到 v2（验证 v2 仍然可用）
        cc.rollback("app.rollback.key", v2.version_id)
            .await
            .unwrap();
        assert_eq!(
            cc.get("app.rollback.key").await,
            Some(serde_json::json!(20))
        );
    }

    #[tokio::test]
    async fn test_config_schema_registration() {
        let cc = ConfigCenter::new();
        cc.register_schema(string_schema("a.c")).await;
        cc.register_schema(string_schema("b.c")).await;
        cc.register_schema(string_schema("c.c")).await;

        let schemas = cc.list_schemas().await;
        assert_eq!(schemas.len(), 3);
        // list_schemas 应按字母序返回
        assert_eq!(schemas[0].name, "a.c");
        assert_eq!(schemas[1].name, "b.c");
        assert_eq!(schemas[2].name, "c.c");
    }

    #[tokio::test]
    async fn test_config_audit_log_max_history() {
        let log = ConfigAuditLog::new(3);
        for i in 0..5 {
            log.record_change("key", serde_json::json!(i), None, None, None)
                .await;
        }
        let history = log.get_history("key").await;
        assert_eq!(history.len(), 3);
        // 应保留最新的 3 条 (i=2,3,4)
        assert_eq!(history[0].value, serde_json::json!(2));
        assert_eq!(history[2].value, serde_json::json!(4));
    }

    #[tokio::test]
    async fn test_config_load_from_env() {
        std::env::set_var("TOPEMS_TEST_CFG_CENTER", "hello");
        let cc = ConfigCenter::new();
        cc.register_schema(ConfigSchema {
            name: "env.test".to_string(),
            description: "env test".to_string(),
            config_type: ConfigType::String,
            default_value: None,
            required: false,
            env_var: Some("TOPEMS_TEST_CFG_CENTER".to_string()),
            consul_key: None,
            validation: None,
        })
        .await;
        cc.load_from_env().await.unwrap();
        assert_eq!(cc.get("env.test").await, Some(serde_json::json!("hello")));
        std::env::remove_var("TOPEMS_TEST_CFG_CENTER");
    }

    #[tokio::test]
    async fn test_config_export_snapshot() {
        let cc = ConfigCenter::new();
        cc.register_schema(string_schema("snap.a")).await;
        cc.register_schema(string_schema("snap.b")).await;
        cc.set("snap.a", serde_json::json!("va"), Some("tester"))
            .await
            .unwrap();
        cc.set("snap.b", serde_json::json!("vb"), Some("tester"))
            .await
            .unwrap();

        let snap = cc.export_snapshot().await;
        let obj = snap.as_object().unwrap();
        assert_eq!(obj.len(), 2);
        assert_eq!(obj.get("snap.a").unwrap(), &serde_json::json!("va"));
        assert_eq!(obj.get("snap.b").unwrap(), &serde_json::json!("vb"));
    }

    #[tokio::test]
    async fn test_consul_stub_methods() {
        let cc = ConfigCenter::new();
        // stub 方法应返回 Ok(())
        assert!(cc.load_from_consul("http://localhost:8500").await.is_ok());
        assert!(cc.push_to_consul("http://localhost:8500").await.is_ok());
        assert!(cc
            .watch_consul_changes("http://localhost:8500")
            .await
            .is_ok());
    }
}

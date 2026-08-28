//! 业务系统深度集成模块
//!
//! 提供 ERP/Finance/CRM/WMS 等业务系统的数据接入、事件触发和 Copilot 集成框架。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

// ============ 业务系统配置 ============

/// 业务系统类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum BusinessSystemType {
    Erp,
    Finance,
    Crm,
    Wms,
    Hrm,
    Pm,
    Mes,
    Scm,
    Custom,
}

/// 业务系统连接配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessSystemConfig {
    pub system_id: String,
    pub system_name: String,
    pub system_type: BusinessSystemType,
    pub connection_type: ConnectionType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_base_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
    pub auth_type: AuthType,
    #[serde(default = "default_timeout")]
    pub timeout_seconds: u32,
    #[serde(default = "default_retries")]
    pub max_retries: u32,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub sync_config: DataSyncConfig,
    #[serde(default)]
    pub event_subscriptions: Vec<EventSubscription>,
}

fn default_timeout() -> u32 { 30 }
fn default_retries() -> u32 { 3 }
fn default_true() -> bool { true }

/// 连接方式
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionType {
    RestApi,
    Graphql,
    Grpc,
    Database,
    MessageQueue,
    Webhook,
    File,
}

/// 认证方式
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AuthType {
    None,
    ApiKey,
    BearerToken,
    BasicAuth,
    OAuth2,
    Jwt,
}

// ============ 数据同步配置 ============

/// 数据同步配置
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DataSyncConfig {
    #[serde(default)]
    pub auto_sync_enabled: bool,
    #[serde(default = "default_sync_interval")]
    pub sync_interval_seconds: u64,
    #[serde(default)]
    pub sync_direction: SyncDirection,
    #[serde(default)]
    pub entities: Vec<String>,
    #[serde(default)]
    pub batch_size: u32,
    #[serde(default)]
    pub conflict_resolution: ConflictResolution,
}

fn default_sync_interval() -> u64 { 300 }

/// 同步方向
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SyncDirection {
    #[default]
    Pull,
    Push,
    Bidirectional,
}

/// 冲突解决策略
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ConflictResolution {
    #[default]
    TopemsWins,
    SourceWins,
    LastWriteWins,
    Manual,
}

// ============ 事件订阅 ============

/// 事件订阅
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSubscription {
    pub subscription_id: String,
    pub event_type: String,
    pub event_source: String,
    #[serde(default)]
    pub filter: EventFilter,
    pub handler: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

/// 事件过滤
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EventFilter {
    #[serde(default)]
    pub conditions: HashMap<String, serde_json::Value>,
}

// ============ 业务事件 ============

/// 业务事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessEvent {
    pub event_id: String,
    pub event_type: String,
    pub source_system: BusinessSystemType,
    pub source_system_id: String,
    pub event_time: String,
    pub data: serde_json::Value,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    #[serde(default)]
    pub related_entities: Vec<EntityReference>,
}

/// 实体引用
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityReference {
    pub entity_type: String,
    pub entity_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entity_name: Option<String>,
}

// ============ 业务系统适配器 ============

/// 业务系统适配器 trait
#[async_trait::async_trait]
pub trait BusinessSystemAdapter: Send + Sync {
    fn system_type(&self) -> BusinessSystemType;
    async fn test_connection(&self) -> Result<(), String>;
    async fn fetch_data(
        &self,
        entity: &str,
        filters: HashMap<String, serde_json::Value>,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<serde_json::Value>, String>;
    async fn push_data(
        &self,
        entity: &str,
        data: Vec<serde_json::Value>,
    ) -> Result<PushResult, String>;
    async fn execute_operation(
        &self,
        operation: &str,
        parameters: serde_json::Value,
    ) -> Result<serde_json::Value, String>;
}

/// 推送结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushResult {
    pub success_count: u32,
    pub failure_count: u32,
    #[serde(default)]
    pub failures: Vec<PushFailure>,
}

/// 推送失败
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushFailure {
    pub index: u32,
    pub error_code: String,
    pub error_message: String,
}

// ============ 集成管理器 ============

/// 业务系统集成管理器
pub struct BusinessIntegrationManager {
    configs: Arc<RwLock<HashMap<String, BusinessSystemConfig>>>,
}

impl BusinessIntegrationManager {
    pub fn new() -> Self {
        Self {
            configs: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn register_config(&self, config: BusinessSystemConfig) -> Result<(), String> {
        let mut configs = self.configs.write().await;
        if configs.contains_key(&config.system_id) {
            return Err(format!("系统 '{}' 已注册", config.system_id));
        }
        configs.insert(config.system_id.clone(), config);
        Ok(())
    }

    pub async fn update_config(&self, config: BusinessSystemConfig) -> Result<(), String> {
        let mut configs = self.configs.write().await;
        if !configs.contains_key(&config.system_id) {
            return Err(format!("系统 '{}' 未注册", config.system_id));
        }
        configs.insert(config.system_id.clone(), config);
        Ok(())
    }

    pub async fn remove_config(&self, system_id: &str) -> Result<(), String> {
        let mut configs = self.configs.write().await;
        if !configs.contains_key(system_id) {
            return Err(format!("系统 '{}' 未注册", system_id));
        }
        configs.remove(system_id);
        Ok(())
    }

    pub async fn get_config(&self, system_id: &str) -> Option<BusinessSystemConfig> {
        let configs = self.configs.read().await;
        configs.get(system_id).cloned()
    }

    pub async fn list_configs(&self) -> Vec<BusinessSystemConfig> {
        let configs = self.configs.read().await;
        configs.values().cloned().collect()
    }

    pub async fn count(&self) -> usize {
        let configs = self.configs.read().await;
        configs.len()
    }
}

impl Default for BusinessIntegrationManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_business_system_type_serialization() {
        let erp = BusinessSystemType::Erp;
        let json = serde_json::to_string(&erp).unwrap();
        assert_eq!(json, "\"erp\"");
    }

    #[test]
    fn test_business_system_config_creation() {
        let config = BusinessSystemConfig {
            system_id: "erp-001".to_string(),
            system_name: "ERP 系统".to_string(),
            system_type: BusinessSystemType::Erp,
            connection_type: ConnectionType::RestApi,
            api_base_url: Some("https://erp.example.com/api".to_string()),
            api_key: Some("secret-key".to_string()),
            auth_type: AuthType::ApiKey,
            timeout_seconds: 30,
            max_retries: 3,
            enabled: true,
            sync_config: DataSyncConfig::default(),
            event_subscriptions: vec![],
        };

        assert_eq!(config.system_id, "erp-001");
        assert_eq!(config.system_type, BusinessSystemType::Erp);
    }

    #[test]
    fn test_data_sync_config_default() {
        let config = DataSyncConfig::default();
        assert!(!config.auto_sync_enabled);
        assert_eq!(config.sync_interval_seconds, 300);
        assert_eq!(config.sync_direction, SyncDirection::Pull);
    }

    #[test]
    fn test_business_event_creation() {
        let event = BusinessEvent {
            event_id: "evt-001".to_string(),
            event_type: "order.created".to_string(),
            source_system: BusinessSystemType::Erp,
            source_system_id: "erp-001".to_string(),
            event_time: "2026-08-28T10:00:00Z".to_string(),
            data: serde_json::json!({"order_id": "ORD-001"}),
            metadata: HashMap::new(),
            related_entities: vec![],
        };

        assert_eq!(event.event_id, "evt-001");
        assert_eq!(event.event_type, "order.created");
    }

    #[tokio::test]
    async fn test_integration_manager() {
        let manager = BusinessIntegrationManager::new();

        let config = BusinessSystemConfig {
            system_id: "test-001".to_string(),
            system_name: "测试系统".to_string(),
            system_type: BusinessSystemType::Custom,
            connection_type: ConnectionType::RestApi,
            api_base_url: None,
            api_key: None,
            auth_type: AuthType::None,
            timeout_seconds: 30,
            max_retries: 3,
            enabled: true,
            sync_config: DataSyncConfig::default(),
            event_subscriptions: vec![],
        };

        manager.register_config(config).await.unwrap();
        assert_eq!(manager.count().await, 1);

        let retrieved = manager.get_config("test-001").await.unwrap();
        assert_eq!(retrieved.system_name, "测试系统");

        manager.remove_config("test-001").await.unwrap();
        assert_eq!(manager.count().await, 0);
    }
}

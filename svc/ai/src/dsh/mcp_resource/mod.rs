//! DSH AI MCP Resource URI 管理器模块
//!
//! 提供 MCP 资源注册、资源订阅与推送、资源层级管理、资源权限控制等能力。

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info};

// ============================================================================
// 类型定义
// ============================================================================

/// MCP 资源
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpResource {
    /// 资源 URI（唯一标识）
    pub uri: String,
    /// 资源名称
    pub name: String,
    /// 资源描述
    pub description: String,
    /// 资源 MIME 类型
    pub mime_type: String,
    /// 资源类型（file/api/database/event/config等）
    pub resource_type: ResourceType,
    /// 父资源 URI（用于层级管理，None 表示根资源）
    pub parent_uri: Option<String>,
    /// 资源内容（静态资源的内容）
    pub content: Option<String>,
    /// 资源内容获取函数名称（动态资源）
    pub content_provider: Option<String>,
    /// 是否可订阅（支持变更通知）
    pub subscribable: bool,
    /// 资源权限配置
    pub permissions: ResourcePermissions,
    /// 资源元数据
    pub metadata: HashMap<String, String>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
    /// 资源版本
    pub version: String,
}

/// 资源类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ResourceType {
    /// 文件资源
    File,
    /// API 资源
    Api,
    /// 数据库资源
    Database,
    /// 事件资源
    Event,
    /// 配置资源
    Config,
    /// 文档资源
    Document,
    /// 工具资源
    Tool,
    /// 自定义资源
    Custom,
}

impl ResourceType {
    pub fn as_str(&self) -> &str {
        match self {
            ResourceType::File => "file",
            ResourceType::Api => "api",
            ResourceType::Database => "database",
            ResourceType::Event => "event",
            ResourceType::Config => "config",
            ResourceType::Document => "document",
            ResourceType::Tool => "tool",
            ResourceType::Custom => "custom",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "file" => ResourceType::File,
            "api" => ResourceType::Api,
            "database" => ResourceType::Database,
            "event" => ResourceType::Event,
            "config" => ResourceType::Config,
            "document" => ResourceType::Document,
            "tool" => ResourceType::Tool,
            _ => ResourceType::Custom,
        }
    }
}

/// 资源权限配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcePermissions {
    /// 允许的角色列表（空表示所有角色）
    pub allowed_roles: Vec<String>,
    /// 允许的操作（read/write/subscribe/admin）
    pub allowed_operations: Vec<String>,
    /// 是否需要租户隔离
    pub require_tenant: bool,
    /// 是否需要认证
    pub require_auth: bool,
}

impl Default for ResourcePermissions {
    fn default() -> Self {
        Self {
            allowed_roles: Vec::new(),
            allowed_operations: vec!["read".to_string()],
            require_tenant: true,
            require_auth: true,
        }
    }
}

/// 资源订阅者
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceSubscriber {
    /// 订阅者 ID
    pub subscriber_id: String,
    /// 订阅者类型（client/agent/system）
    pub subscriber_type: String,
    /// 订阅的资源 URI
    pub resource_uri: String,
    /// 订阅时间
    pub subscribed_at: String,
    /// 最后通知时间
    pub last_notified_at: Option<String>,
    /// 通知次数
    pub notification_count: u64,
    /// 订阅者元数据
    pub metadata: HashMap<String, String>,
}

/// 资源变更事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceChangeEvent {
    /// 事件 ID
    pub event_id: String,
    /// 资源 URI
    pub resource_uri: String,
    /// 变更类型（created/updated/deleted/content_changed）
    pub change_type: ChangeType,
    /// 变更前内容（可选）
    pub old_content: Option<String>,
    /// 变更后内容（可选）
    pub new_content: Option<String>,
    /// 变更时间
    pub changed_at: String,
    /// 变更者
    pub changed_by: String,
    /// 变更说明
    pub description: String,
}

/// 变更类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChangeType {
    /// 资源创建
    Created,
    /// 资源更新
    Updated,
    /// 资源删除
    Deleted,
    /// 内容变更
    ContentChanged,
    /// 权限变更
    PermissionChanged,
}

impl ChangeType {
    pub fn as_str(&self) -> &str {
        match self {
            ChangeType::Created => "created",
            ChangeType::Updated => "updated",
            ChangeType::Deleted => "deleted",
            ChangeType::ContentChanged => "content_changed",
            ChangeType::PermissionChanged => "permission_changed",
        }
    }
}

/// 资源树节点（用于层级展示）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceTreeNode {
    /// 资源 URI
    pub uri: String,
    /// 资源名称
    pub name: String,
    /// 资源类型
    pub resource_type: ResourceType,
    /// 子节点
    pub children: Vec<ResourceTreeNode>,
    /// 是否有子节点
    pub has_children: bool,
}

/// 资源管理器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceManagerConfig {
    /// 是否启用
    pub enabled: bool,
    /// 最大资源数
    pub max_resources: usize,
    /// 每个资源最大订阅者数
    pub max_subscribers_per_resource: usize,
    /// 变更事件历史最大保留数
    pub max_event_history: usize,
    /// 通知队列最大长度
    pub max_notification_queue: usize,
    /// 是否启用层级管理
    pub enable_hierarchy: bool,
}

impl Default for ResourceManagerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_resources: 10000,
            max_subscribers_per_resource: 100,
            max_event_history: 1000,
            max_notification_queue: 1000,
            enable_hierarchy: true,
        }
    }
}

/// 资源管理器统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceManagerStats {
    /// 总资源数
    pub total_resources: u64,
    /// 按类型统计资源数
    pub resources_by_type: HashMap<String, u64>,
    /// 总订阅者数
    pub total_subscribers: u64,
    /// 总变更事件数
    pub total_change_events: u64,
    /// 总通知次数
    pub total_notifications: u64,
    /// 可订阅资源数
    pub subscribable_resources: u64,
    /// 根资源数
    pub root_resources: u64,
}

// ============================================================================
// 资源管理器
// ============================================================================

/// MCP Resource URI 管理器
#[derive(Clone)]
pub struct ResourceManager {
    /// 配置
    config: ResourceManagerConfig,
    /// 资源存储（URI -> 资源）
    resources: Arc<Mutex<HashMap<String, McpResource>>>,
    /// 子资源索引（父 URI -> 子 URI 列表）
    children_index: Arc<Mutex<HashMap<String, Vec<String>>>>,
    /// 订阅者存储（资源 URI -> 订阅者列表）
    subscribers: Arc<Mutex<HashMap<String, Vec<ResourceSubscriber>>>>,
    /// 变更事件历史
    event_history: Arc<Mutex<VecDeque<ResourceChangeEvent>>>,
    /// 待处理通知队列
    notification_queue: Arc<Mutex<VecDeque<ResourceChangeEvent>>>,
}

impl ResourceManager {
    /// 创建新的资源管理器
    pub fn new(config: ResourceManagerConfig) -> Self {
        Self {
            config,
            resources: Arc::new(Mutex::new(HashMap::new())),
            children_index: Arc::new(Mutex::new(HashMap::new())),
            subscribers: Arc::new(Mutex::new(HashMap::new())),
            event_history: Arc::new(Mutex::new(VecDeque::new())),
            notification_queue: Arc::new(Mutex::new(VecDeque::new())),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(ResourceManagerConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &ResourceManagerConfig {
        &self.config
    }

    /// 注册资源
    pub fn register(&self, resource: McpResource) -> Result<String, String> {
        if !self.config.enabled {
            return Err("资源管理器未启用".to_string());
        }

        let uri = resource.uri.clone();
        let parent_uri = resource.parent_uri.clone();

        // 检查资源数限制
        let resources = self.resources.lock();
        if resources.len() >= self.config.max_resources {
            return Err("资源数已达上限".to_string());
        }
        if resources.contains_key(&uri) {
            return Err(format!("资源 URI {} 已存在", uri));
        }
        drop(resources);

        // 更新子资源索引
        if self.config.enable_hierarchy {
            if let Some(parent) = &parent_uri {
                let mut children = self.children_index.lock();
                children
                    .entry(parent.clone())
                    .or_insert_with(Vec::new)
                    .push(uri.clone());
                drop(children);
            }
        }

        // 存储资源
        let mut resources = self.resources.lock();
        resources.insert(uri.clone(), resource);
        drop(resources);

        // 记录变更事件
        self.record_event(ResourceChangeEvent {
            event_id: format!("event_{}", uuid::Uuid::new_v4()),
            resource_uri: uri.clone(),
            change_type: ChangeType::Created,
            old_content: None,
            new_content: None,
            changed_at: chrono::Utc::now().to_rfc3339(),
            changed_by: "system".to_string(),
            description: format!("资源 {} 已注册", uri),
        });

        info!(resource_uri = %uri, "MCP resource registered");
        Ok(uri)
    }

    /// 获取资源
    pub fn get(&self, uri: &str) -> Option<McpResource> {
        self.resources.lock().get(uri).cloned()
    }

    /// 更新资源
    pub fn update(&self, uri: &str, updates: ResourceUpdate) -> Result<(), String> {
        let mut resources = self.resources.lock();
        let resource = resources
            .get_mut(uri)
            .ok_or_else(|| format!("资源 {} 不存在", uri))?;

        let old_content = resource.content.clone();

        if let Some(name) = updates.name {
            resource.name = name;
        }
        if let Some(description) = updates.description {
            resource.description = description;
        }
        if let Some(content) = updates.content {
            resource.content = Some(content);
        }
        if let Some(permissions) = updates.permissions {
            resource.permissions = permissions;
        }
        if let Some(metadata) = updates.metadata {
            resource.metadata = metadata;
        }
        if let Some(subscribable) = updates.subscribable {
            resource.subscribable = subscribable;
        }

        resource.updated_at = chrono::Utc::now().to_rfc3339();
        let version = resource.version.parse::<u32>().unwrap_or(1);
        resource.version = (version + 1).to_string();

        let new_content = resource.content.clone();
        drop(resources);

        // 记录变更事件
        self.record_event(ResourceChangeEvent {
            event_id: format!("event_{}", uuid::Uuid::new_v4()),
            resource_uri: uri.to_string(),
            change_type: ChangeType::Updated,
            old_content,
            new_content,
            changed_at: chrono::Utc::now().to_rfc3339(),
            changed_by: "system".to_string(),
            description: format!("资源 {} 已更新", uri),
        });

        info!(resource_uri = %uri, "MCP resource updated");
        Ok(())
    }

    /// 删除资源
    pub fn delete(&self, uri: &str) -> Result<(), String> {
        let mut resources = self.resources.lock();
        let resource = resources
            .remove(uri)
            .ok_or_else(|| format!("资源 {} 不存在", uri))?;
        drop(resources);

        // 从父资源的子列表中移除
        if let Some(parent) = &resource.parent_uri {
            let mut children = self.children_index.lock();
            if let Some(child_list) = children.get_mut(parent) {
                child_list.retain(|c| c != uri);
            }
            drop(children);
        }

        // 删除子资源（递归）
        let children = self.get_children(uri);
        for child_uri in children {
            let _ = self.delete(&child_uri);
        }

        // 移除订阅者
        let mut subscribers = self.subscribers.lock();
        subscribers.remove(uri);
        drop(subscribers);

        // 记录变更事件
        self.record_event(ResourceChangeEvent {
            event_id: format!("event_{}", uuid::Uuid::new_v4()),
            resource_uri: uri.to_string(),
            change_type: ChangeType::Deleted,
            old_content: resource.content,
            new_content: None,
            changed_at: chrono::Utc::now().to_rfc3339(),
            changed_by: "system".to_string(),
            description: format!("资源 {} 已删除", uri),
        });

        info!(resource_uri = %uri, "MCP resource deleted");
        Ok(())
    }

    /// 列出所有资源
    pub fn list(&self, type_filter: Option<ResourceType>) -> Vec<McpResource> {
        let resources = self.resources.lock();
        let mut result: Vec<McpResource> = if let Some(filter_type) = type_filter {
            resources
                .values()
                .filter(|r| r.resource_type == filter_type)
                .cloned()
                .collect()
        } else {
            resources.values().cloned().collect()
        };
        result.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        result
    }

    /// 获取子资源
    pub fn get_children(&self, parent_uri: &str) -> Vec<String> {
        self.children_index
            .lock()
            .get(parent_uri)
            .cloned()
            .unwrap_or_default()
    }

    /// 获取资源树
    pub fn get_resource_tree(&self, root_uri: Option<&str>) -> Vec<ResourceTreeNode> {
        let resources = self.resources.lock();

        let build_tree = |uri: &str| -> ResourceTreeNode {
            let resource = resources.get(uri).unwrap();
            let children_uris = self.get_children(uri);
            let children: Vec<ResourceTreeNode> = children_uris
                .iter()
                .map(|child_uri| {
                    let child = resources.get(child_uri).unwrap();
                    ResourceTreeNode {
                        uri: child.uri.clone(),
                        name: child.name.clone(),
                        resource_type: child.resource_type,
                        children: Vec::new(),
                        has_children: !self.get_children(child_uri).is_empty(),
                    }
                })
                .collect();

            ResourceTreeNode {
                uri: resource.uri.clone(),
                name: resource.name.clone(),
                resource_type: resource.resource_type,
                children,
                has_children: !self.get_children(uri).is_empty(),
            }
        };

        if let Some(root) = root_uri {
            if resources.contains_key(root) {
                vec![build_tree(root)]
            } else {
                Vec::new()
            }
        } else {
            // 获取所有根资源（没有父资源的）
            let roots: Vec<String> = resources
                .values()
                .filter(|r| r.parent_uri.is_none())
                .map(|r| r.uri.clone())
                .collect();

            roots.iter().map(|uri| build_tree(uri)).collect()
        }
    }

    /// 订阅资源变更
    pub fn subscribe(
        &self,
        resource_uri: &str,
        subscriber_id: &str,
        subscriber_type: &str,
    ) -> Result<(), String> {
        let resources = self.resources.lock();
        let resource = resources
            .get(resource_uri)
            .ok_or_else(|| format!("资源 {} 不存在", resource_uri))?;

        if !resource.subscribable {
            return Err(format!("资源 {} 不支持订阅", resource_uri));
        }
        drop(resources);

        let mut subscribers = self.subscribers.lock();
        let subscriber_list = subscribers
            .entry(resource_uri.to_string())
            .or_insert_with(Vec::new);

        // 检查是否已订阅
        if subscriber_list.iter().any(|s| s.subscriber_id == subscriber_id) {
            return Err(format!("订阅者 {} 已订阅该资源", subscriber_id));
        }

        // 检查订阅者数限制
        if subscriber_list.len() >= self.config.max_subscribers_per_resource {
            return Err("该资源订阅者数已达上限".to_string());
        }

        subscriber_list.push(ResourceSubscriber {
            subscriber_id: subscriber_id.to_string(),
            subscriber_type: subscriber_type.to_string(),
            resource_uri: resource_uri.to_string(),
            subscribed_at: chrono::Utc::now().to_rfc3339(),
            last_notified_at: None,
            notification_count: 0,
            metadata: HashMap::new(),
        });
        drop(subscribers);

        info!(
            resource_uri = %resource_uri,
            subscriber_id = %subscriber_id,
            "Resource subscription created"
        );

        Ok(())
    }

    /// 取消订阅
    pub fn unsubscribe(&self, resource_uri: &str, subscriber_id: &str) -> Result<(), String> {
        let mut subscribers = self.subscribers.lock();
        if let Some(subscriber_list) = subscribers.get_mut(resource_uri) {
            let before = subscriber_list.len();
            subscriber_list.retain(|s| s.subscriber_id != subscriber_id);
            if subscriber_list.len() == before {
                return Err(format!("订阅者 {} 未订阅该资源", subscriber_id));
            }
        } else {
            return Err(format!("资源 {} 没有订阅者", resource_uri));
        }
        drop(subscribers);

        info!(
            resource_uri = %resource_uri,
            subscriber_id = %subscriber_id,
            "Resource subscription removed"
        );

        Ok(())
    }

    /// 获取资源的订阅者
    pub fn get_subscribers(&self, resource_uri: &str) -> Vec<ResourceSubscriber> {
        self.subscribers
            .lock()
            .get(resource_uri)
            .cloned()
            .unwrap_or_default()
    }

    /// 记录变更事件并通知订阅者
    fn record_event(&self, event: ResourceChangeEvent) {
        // 添加到事件历史
        let mut history = self.event_history.lock();
        history.push_back(event.clone());
        if history.len() > self.config.max_event_history {
            history.pop_front();
        }
        drop(history);

        // 添加到通知队列
        let mut queue = self.notification_queue.lock();
        queue.push_back(event.clone());
        if queue.len() > self.config.max_notification_queue {
            queue.pop_front();
        }
        drop(queue);

        // 通知订阅者（更新订阅者统计）
        let mut subscribers = self.subscribers.lock();
        if let Some(subscriber_list) = subscribers.get_mut(&event.resource_uri) {
            for subscriber in subscriber_list.iter_mut() {
                subscriber.last_notified_at = Some(chrono::Utc::now().to_rfc3339());
                subscriber.notification_count += 1;
            }
        }
        drop(subscribers);

        debug!(
            event_id = %event.event_id,
            resource_uri = %event.resource_uri,
            change_type = %event.change_type.as_str(),
            "Resource change event recorded"
        );
    }

    /// 获取变更事件历史
    pub fn get_event_history(&self, resource_uri: Option<&str>, limit: Option<usize>) -> Vec<ResourceChangeEvent> {
        let history = self.event_history.lock();
        let mut events: Vec<ResourceChangeEvent> = if let Some(uri) = resource_uri {
            history
                .iter()
                .filter(|e| e.resource_uri == uri)
                .cloned()
                .collect()
        } else {
            history.iter().cloned().collect()
        };

        events.reverse(); // 最新的在前
        if let Some(lim) = limit {
            events.truncate(lim);
        }
        events
    }

    /// 处理待处理通知队列
    pub fn process_notification_queue(&self, max_batch: usize) -> usize {
        let mut queue = self.notification_queue.lock();
        let count = queue.len().min(max_batch);
        for _ in 0..count {
            queue.pop_front();
        }
        drop(queue);

        if count > 0 {
            debug!(count = count, "Notification queue processed");
        }
        count
    }

    /// 检查资源权限
    pub fn check_permission(
        &self,
        resource_uri: &str,
        role: &str,
        operation: &str,
    ) -> Result<bool, String> {
        let resources = self.resources.lock();
        let resource = resources
            .get(resource_uri)
            .ok_or_else(|| format!("资源 {} 不存在", resource_uri))?;

        let permissions = &resource.permissions;

        // 检查角色
        if !permissions.allowed_roles.is_empty() && !permissions.allowed_roles.contains(&role.to_string()) {
            return Ok(false);
        }

        // 检查操作
        if !permissions.allowed_operations.contains(&operation.to_string()) {
            return Ok(false);
        }

        Ok(true)
    }

    /// 获取统计信息
    pub fn get_stats(&self) -> ResourceManagerStats {
        let resources = self.resources.lock();
        let subscribers = self.subscribers.lock();
        let history = self.event_history.lock();

        let mut resources_by_type = HashMap::new();
        let mut subscribable_count = 0u64;
        let mut root_count = 0u64;

        for resource in resources.values() {
            let type_name = resource.resource_type.as_str().to_string();
            *resources_by_type.entry(type_name).or_insert(0u64) += 1;

            if resource.subscribable {
                subscribable_count += 1;
            }

            if resource.parent_uri.is_none() {
                root_count += 1;
            }
        }

        let total_subscribers: u64 = subscribers.values().map(|v| v.len() as u64).sum();
        let total_notifications: u64 = subscribers
            .values()
            .flatten()
            .map(|s| s.notification_count)
            .sum();

        ResourceManagerStats {
            total_resources: resources.len() as u64,
            resources_by_type,
            total_subscribers,
            total_change_events: history.len() as u64,
            total_notifications,
            subscribable_resources: subscribable_count,
            root_resources: root_count,
        }
    }

    /// 清空所有资源
    pub fn clear_all(&self) {
        self.resources.lock().clear();
        self.children_index.lock().clear();
        self.subscribers.lock().clear();
        self.event_history.lock().clear();
        self.notification_queue.lock().clear();
        info!("All MCP resources cleared");
    }
}

/// 资源更新参数
#[derive(Debug, Clone, Default)]
pub struct ResourceUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub permissions: Option<ResourcePermissions>,
    pub metadata: Option<HashMap<String, String>>,
    pub subscribable: Option<bool>,
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_manager() -> ResourceManager {
        ResourceManager::with_defaults()
    }

    fn create_test_resource(uri: &str, name: &str) -> McpResource {
        McpResource {
            uri: uri.to_string(),
            name: name.to_string(),
            description: format!("测试资源 {}", name),
            mime_type: "text/plain".to_string(),
            resource_type: ResourceType::Document,
            parent_uri: None,
            content: Some("测试内容".to_string()),
            content_provider: None,
            subscribable: true,
            permissions: ResourcePermissions::default(),
            metadata: HashMap::new(),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            version: "1".to_string(),
        }
    }

    #[test]
    fn test_resource_type_as_str() {
        assert_eq!(ResourceType::File.as_str(), "file");
        assert_eq!(ResourceType::Api.as_str(), "api");
        assert_eq!(ResourceType::Database.as_str(), "database");
        assert_eq!(ResourceType::Event.as_str(), "event");
    }

    #[test]
    fn test_resource_type_from_str() {
        assert_eq!(ResourceType::from_str("file"), ResourceType::File);
        assert_eq!(ResourceType::from_str("api"), ResourceType::Api);
        assert_eq!(ResourceType::from_str("unknown"), ResourceType::Custom);
    }

    #[test]
    fn test_change_type_as_str() {
        assert_eq!(ChangeType::Created.as_str(), "created");
        assert_eq!(ChangeType::Updated.as_str(), "updated");
        assert_eq!(ChangeType::Deleted.as_str(), "deleted");
    }

    #[test]
    fn test_resource_permissions_default() {
        let perms = ResourcePermissions::default();
        assert!(perms.require_tenant);
        assert!(perms.require_auth);
        assert_eq!(perms.allowed_operations, vec!["read".to_string()]);
    }

    #[test]
    fn test_resource_manager_config_default() {
        let config = ResourceManagerConfig::default();
        assert!(config.enabled);
        assert_eq!(config.max_resources, 10000);
        assert!(config.enable_hierarchy);
    }

    #[test]
    fn test_register_resource() {
        let manager = create_test_manager();
        let resource = create_test_resource("res://test/1", "测试资源");
        let result = manager.register(resource);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "res://test/1");
    }

    #[test]
    fn test_register_duplicate_resource() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "资源1")).unwrap();
        let result = manager.register(create_test_resource("res://test/1", "资源2"));
        assert!(result.is_err());
    }

    #[test]
    fn test_get_resource() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "测试资源")).unwrap();

        let resource = manager.get("res://test/1");
        assert!(resource.is_some());
        assert_eq!(resource.unwrap().name, "测试资源");
    }

    #[test]
    fn test_update_resource() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "测试资源")).unwrap();

        let update = ResourceUpdate {
            name: Some("更新后的名称".to_string()),
            content: Some("更新后的内容".to_string()),
            ..Default::default()
        };

        let result = manager.update("res://test/1", update);
        assert!(result.is_ok());

        let resource = manager.get("res://test/1").unwrap();
        assert_eq!(resource.name, "更新后的名称");
        assert_eq!(resource.content, Some("更新后的内容".to_string()));
        assert_eq!(resource.version, "2");
    }

    #[test]
    fn test_delete_resource() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "测试资源")).unwrap();

        let result = manager.delete("res://test/1");
        assert!(result.is_ok());
        assert!(manager.get("res://test/1").is_none());
    }

    #[test]
    fn test_list_resources() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "资源1")).unwrap();
        manager.register(create_test_resource("res://test/2", "资源2")).unwrap();

        let resources = manager.list(None);
        assert_eq!(resources.len(), 2);
    }

    #[test]
    fn test_list_resources_by_type() {
        let manager = create_test_manager();
        let mut r1 = create_test_resource("res://test/1", "文件资源");
        r1.resource_type = ResourceType::File;
        manager.register(r1).unwrap();

        let mut r2 = create_test_resource("res://test/2", "API资源");
        r2.resource_type = ResourceType::Api;
        manager.register(r2).unwrap();

        let file_resources = manager.list(Some(ResourceType::File));
        assert_eq!(file_resources.len(), 1);
        assert_eq!(file_resources[0].name, "文件资源");
    }

    #[test]
    fn test_hierarchy_management() {
        let manager = create_test_manager();

        let parent = create_test_resource("res://parent", "父资源");
        manager.register(parent).unwrap();

        let mut child1 = create_test_resource("res://parent/child1", "子资源1");
        child1.parent_uri = Some("res://parent".to_string());
        manager.register(child1).unwrap();

        let mut child2 = create_test_resource("res://parent/child2", "子资源2");
        child2.parent_uri = Some("res://parent".to_string());
        manager.register(child2).unwrap();

        let children = manager.get_children("res://parent");
        assert_eq!(children.len(), 2);
    }

    #[test]
    fn test_resource_tree() {
        let manager = create_test_manager();

        let parent = create_test_resource("res://parent", "父资源");
        manager.register(parent).unwrap();

        let mut child = create_test_resource("res://parent/child", "子资源");
        child.parent_uri = Some("res://parent".to_string());
        manager.register(child).unwrap();

        let tree = manager.get_resource_tree(None);
        assert_eq!(tree.len(), 1);
        assert_eq!(tree[0].children.len(), 1);
        assert!(tree[0].has_children);
    }

    #[test]
    fn test_subscribe_resource() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "测试资源")).unwrap();

        let result = manager.subscribe("res://test/1", "sub1", "client");
        assert!(result.is_ok());

        let subscribers = manager.get_subscribers("res://test/1");
        assert_eq!(subscribers.len(), 1);
        assert_eq!(subscribers[0].subscriber_id, "sub1");
    }

    #[test]
    fn test_duplicate_subscribe() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "测试资源")).unwrap();

        manager.subscribe("res://test/1", "sub1", "client").unwrap();
        let result = manager.subscribe("res://test/1", "sub1", "client");
        assert!(result.is_err());
    }

    #[test]
    fn test_unsubscribe_resource() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "测试资源")).unwrap();

        manager.subscribe("res://test/1", "sub1", "client").unwrap();
        let result = manager.unsubscribe("res://test/1", "sub1");
        assert!(result.is_ok());

        let subscribers = manager.get_subscribers("res://test/1");
        assert!(subscribers.is_empty());
    }

    #[test]
    fn test_event_history() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "测试资源")).unwrap();

        let history = manager.get_event_history(None, None);
        assert!(!history.is_empty());
        assert_eq!(history[0].change_type, ChangeType::Created);
    }

    #[test]
    fn test_check_permission() {
        let manager = create_test_manager();
        let mut resource = create_test_resource("res://test/1", "测试资源");
        resource.permissions.allowed_roles = vec!["admin".to_string(), "user".to_string()];
        resource.permissions.allowed_operations = vec!["read".to_string(), "write".to_string()];
        manager.register(resource).unwrap();

        assert!(manager.check_permission("res://test/1", "admin", "read").unwrap());
        assert!(manager.check_permission("res://test/1", "user", "write").unwrap());
        assert!(!manager.check_permission("res://test/1", "guest", "read").unwrap());
        assert!(!manager.check_permission("res://test/1", "admin", "delete").unwrap());
    }

    #[test]
    fn test_get_stats() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "资源1")).unwrap();
        manager.register(create_test_resource("res://test/2", "资源2")).unwrap();

        let stats = manager.get_stats();
        assert_eq!(stats.total_resources, 2);
        assert_eq!(stats.subscribable_resources, 2);
        assert_eq!(stats.root_resources, 2);
    }

    #[test]
    fn test_clear_all() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "资源1")).unwrap();
        manager.register(create_test_resource("res://test/2", "资源2")).unwrap();

        manager.clear_all();
        assert_eq!(manager.get_stats().total_resources, 0);
    }

    #[test]
    fn test_process_notification_queue() {
        let manager = create_test_manager();
        manager.register(create_test_resource("res://test/1", "测试资源")).unwrap();

        let processed = manager.process_notification_queue(10);
        assert!(processed >= 1); // 注册资源会产生一个事件
    }
}

//! Event Bus Module
//!
//! 实现事件订阅/发布机制，用于触发数据转换

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

// ==================== Event Types ====================

/// 集成事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationEvent {
    /// 事件 ID
    pub id: Uuid,
    /// 源系统
    pub source_system: String,
    /// 目标系统
    pub target_system: String,
    /// 事件类型
    pub event_type: String,
    /// 源记录 ID
    pub source_record_id: Option<String>,
    /// 目标记录 ID
    pub target_record_id: Option<String>,
    /// 事件数据
    pub payload: Option<serde_json::Value>,
    /// 状态
    pub status: EventStatus,
    /// 错误信息
    pub error_message: Option<String>,
    /// 创建时间
    pub created_at: DateTime<Utc>,
}

/// 事件状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EventStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

/// 事件订阅者
#[derive(Debug, Clone)]
pub struct EventSubscriber {
    /// 订阅者 ID
    pub id: Uuid,
    /// 订阅者名称
    pub name: String,
    /// 订阅的系统
    pub source_system: String,
    /// 订阅的事件类型
    pub event_types: Vec<String>,
    /// 回调函数 URL
    pub callback_url: Option<String>,
    /// 是否启用
    pub enabled: bool,
}

/// 事件订阅请求
#[derive(Debug, Clone, Deserialize)]
pub struct SubscribeRequest {
    pub name: String,
    pub source_system: String,
    pub event_types: Vec<String>,
    pub callback_url: Option<String>,
}

/// 事件发布请求
#[derive(Debug, Clone, Deserialize)]
pub struct PublishEventRequest {
    pub source_system: String,
    pub target_system: String,
    pub event_type: String,
    pub source_record_id: Option<String>,
    pub payload: Option<serde_json::Value>,
}

// ==================== Event Bus ====================

/// 事件总线
pub struct EventBus {
    /// 订阅者列表
    subscribers: Arc<RwLock<HashMap<Uuid, EventSubscriber>>>,
    /// 事件历史
    events: Arc<RwLock<Vec<IntegrationEvent>>>,
    /// 最大历史记录数
    max_history: usize,
}

impl EventBus {
    /// 创建新的事件总线
    pub fn new() -> Self {
        Self {
            subscribers: Arc::new(RwLock::new(HashMap::new())),
            events: Arc::new(RwLock::new(Vec::new())),
            max_history: 1000,
        }
    }

    /// 订阅事件
    pub async fn subscribe(&self, request: SubscribeRequest) -> EventSubscriber {
        let subscriber = EventSubscriber {
            id: Uuid::new_v4(),
            name: request.name,
            source_system: request.source_system,
            event_types: request.event_types,
            callback_url: request.callback_url,
            enabled: true,
        };

        let mut subs = self.subscribers.write().await;
        subs.insert(subscriber.id, subscriber.clone());

        subscriber
    }

    /// 取消订阅
    pub async fn unsubscribe(&self, subscriber_id: Uuid) -> bool {
        let mut subs = self.subscribers.write().await;
        subs.remove(&subscriber_id).is_some()
    }

    /// 获取所有订阅者
    pub async fn get_subscribers(&self) -> Vec<EventSubscriber> {
        let subs = self.subscribers.read().await;
        subs.values().cloned().collect()
    }

    /// 获取匹配的订阅者
    pub async fn get_matching_subscribers(
        &self,
        source_system: &str,
        event_type: &str,
    ) -> Vec<EventSubscriber> {
        let subs = self.subscribers.read().await;
        subs.values()
            .filter(|s| {
                s.enabled && s.source_system == source_system && s.event_types.contains(&event_type.to_string())
            })
            .cloned()
            .collect()
    }

    /// 发布事件
    pub async fn publish(&self, request: PublishEventRequest) -> IntegrationEvent {
        let event = IntegrationEvent {
            id: Uuid::new_v4(),
            source_system: request.source_system.clone(),
            target_system: request.target_system.clone(),
            event_type: request.event_type.clone(),
            source_record_id: request.source_record_id.clone(),
            target_record_id: None,
            payload: request.payload.clone(),
            status: EventStatus::Pending,
            error_message: None,
            created_at: Utc::now(),
        };

        // 添加到历史
        let mut events = self.events.write().await;
        events.push(event.clone());

        // 清理超过最大数量的历史记录
        let len = events.len();
        if len > self.max_history {
            let drain_count = len - self.max_history;
            events.drain(0..drain_count);
        }

        event
    }

    /// 更新事件状态
    pub async fn update_status(
        &self,
        event_id: Uuid,
        status: EventStatus,
        error_message: Option<String>,
    ) -> bool {
        let mut events = self.events.write().await;
        let mut found = false;
        for event in events.iter_mut() {
            if event.id == event_id {
                event.status = status;
                event.error_message = error_message;
                found = true;
                break;
            }
        }
        found
    }

    /// 获取事件历史
    pub async fn get_events(&self, limit: usize) -> Vec<IntegrationEvent> {
        let events = self.events.read().await;
        events.iter().rev().take(limit).cloned().collect()
    }

    /// 获取指定系统的事件
    pub async fn get_events_by_system(
        &self,
        source_system: &str,
        limit: usize,
    ) -> Vec<IntegrationEvent> {
        let events = self.events.read().await;
        events
            .iter()
            .filter(|e| e.source_system == source_system)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== Event Handler ====================

/// 事件处理函数类型
pub type EventHandlerFn = Arc<
    dyn Fn(IntegrationEvent) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), String>> + Send>>
        + Send
        + Sync,
>;

/// 事件处理器注册表
pub struct EventHandlerRegistry {
    handlers: Arc<RwLock<HashMap<String, EventHandlerFn>>>,
}

impl EventHandlerRegistry {
    pub fn new() -> Self {
        Self {
            handlers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 注册处理器
    pub async fn register<F, Fut>(&self, event_type: String, handler: F)
    where
        F: Fn(IntegrationEvent) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = Result<(), String>> + Send + 'static,
    {
        let handler_fn: EventHandlerFn = Arc::new(move |event| Box::pin(handler(event)));
        let mut handlers = self.handlers.write().await;
        handlers.insert(event_type, handler_fn);
    }

    /// 获取处理器
    pub async fn get(&self, event_type: &str) -> Option<EventHandlerFn> {
        let handlers = self.handlers.read().await;
        handlers.get(event_type).cloned()
    }

    /// 列出所有已注册的事件类型
    pub async fn list_types(&self) -> Vec<String> {
        let handlers = self.handlers.read().await;
        handlers.keys().cloned().collect()
    }

    /// 触发事件处理
    pub async fn handle(&self, event_type: &str, event: IntegrationEvent) -> Result<(), String> {
        if let Some(handler) = self.get(event_type).await {
            handler(event).await
        } else {
            Err(format!("No handler registered for event type: {}", event_type))
        }
    }
}

impl Default for EventHandlerRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== Event Processor ====================

/// 事件处理器实现 - 触发转换规则
pub struct ConversionEventHandler {
    /// 规则代码
    pub rule_code: String,
}

impl ConversionEventHandler {
    pub fn new(rule_code: String) -> Self {
        Self { rule_code }
    }

    /// 处理事件
    pub async fn handle(&self, event: IntegrationEvent) -> Result<(), String> {
        tracing::info!(
            "[EventHandler] Processing event {} for rule {}",
            event.id,
            self.rule_code
        );

        // 在实际实现中，这里会：
        // 1. 根据 rule_code 获取转换规则
        // 2. 调用规则引擎执行转换
        // 3. 调用目标系统的 API 创建记录
        // 4. 更新事件状态

        // 这里只是记录日志
        tracing::info!(
            "[EventHandler] Event payload: {:?}",
            event.payload
        );

        Ok(())
    }
}

// ==================== Event Webhook ====================

/// Webhook 发送器
pub struct WebhookSender {
    client: reqwest::Client,
}

impl WebhookSender {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    /// 发送 webhook
    pub async fn send(&self, url: &str, payload: &IntegrationEvent) -> Result<(), String> {
        tracing::info!("[Webhook] Sending to {}: {:?}", url, payload);

        // 在实际实现中，这里会发送 HTTP POST 请求
        // let response = self.client
        //     .post(url)
        //     .json(payload)
        //     .send()
        //     .await
        //     .map_err(|e| e.to_string())?;

        Ok(())
    }
}

impl Default for WebhookSender {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_subscribe_and_unsubscribe() {
        let bus = EventBus::new();

        let subscriber = bus
            .subscribe(SubscribeRequest {
                name: "Test Subscriber".to_string(),
                source_system: "erp".to_string(),
                event_types: vec!["order.created".to_string()],
                callback_url: Some("http://example.com/webhook".to_string()),
            })
            .await;

        assert!(bus.unsubscribe(subscriber.id).await);
        assert!(!bus.unsubscribe(subscriber.id).await);
    }

    #[tokio::test]
    async fn test_publish_and_get_events() {
        let bus = EventBus::new();

        let event = bus
            .publish(PublishEventRequest {
                source_system: "erp".to_string(),
                target_system: "mes".to_string(),
                event_type: "order.confirmed".to_string(),
                source_record_id: Some("SO-001".to_string()),
                payload: Some(serde_json::json!({"order_number": "SO-001"})),
            })
            .await;

        assert_eq!(event.status, EventStatus::Pending);

        let events = bus.get_events(10).await;
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].source_system, "erp");
    }

    #[tokio::test]
    async fn test_get_matching_subscribers() {
        let bus = EventBus::new();

        // 订阅 erp 的 order 事件
        bus.subscribe(SubscribeRequest {
            name: "ERP Order Subscriber".to_string(),
            source_system: "erp".to_string(),
            event_types: vec!["order.created".to_string(), "order.confirmed".to_string()],
            callback_url: None,
        })
        .await;

        // 订阅 hrm 的 employee 事件
        bus.subscribe(SubscribeRequest {
            name: "HRM Employee Subscriber".to_string(),
            source_system: "hrm".to_string(),
            event_types: vec!["employee.created".to_string()],
            callback_url: None,
        })
        .await;

        let erp_order_subs = bus.get_matching_subscribers("erp", "order.created").await;
        assert_eq!(erp_order_subs.len(), 1);
        assert_eq!(erp_order_subs[0].name, "ERP Order Subscriber");

        let hrm_subs = bus.get_matching_subscribers("hrm", "employee.created").await;
        assert_eq!(hrm_subs.len(), 1);
        assert_eq!(hrm_subs[0].name, "HRM Employee Subscriber");

        // 不匹配的事件类型
        let no_subs = bus.get_matching_subscribers("erp", "employee.created").await;
        assert!(no_subs.is_empty());
    }

    #[tokio::test]
    async fn test_update_event_status() {
        let bus = EventBus::new();

        let event = bus
            .publish(PublishEventRequest {
                source_system: "erp".to_string(),
                target_system: "mes".to_string(),
                event_type: "order.confirmed".to_string(),
                source_record_id: None,
                payload: None,
            })
            .await;

        assert!(bus
            .update_status(event.id, EventStatus::Processing, None)
            .await);

        let events = bus.get_events(1).await;
        assert_eq!(events[0].status, EventStatus::Processing);

        assert!(bus
            .update_status(
                event.id,
                EventStatus::Failed,
                Some("Target system unavailable".to_string())
            )
            .await);

        let events = bus.get_events(1).await;
        assert_eq!(events[0].status, EventStatus::Failed);
        assert_eq!(
            events[0].error_message,
            Some("Target system unavailable".to_string())
        );
    }

    #[tokio::test]
    async fn test_event_handler_registry() {
        let registry = EventHandlerRegistry::new();

        // 注册一个异步处理函数
        let handler = |event: IntegrationEvent| async move {
            tracing::info!("Handling event: {}", event.id);
            Ok(())
        };
        registry.register("order.confirmed".to_string(), handler).await;

        let types = registry.list_types().await;
        assert_eq!(types, vec!["order.confirmed"]);

        let retrieved = registry.get("order.confirmed").await;
        assert!(retrieved.is_some());

        // 测试触发处理
        let event = IntegrationEvent {
            id: Uuid::new_v4(),
            source_system: "erp".to_string(),
            target_system: "mes".to_string(),
            event_type: "order.confirmed".to_string(),
            source_record_id: Some("SO-001".to_string()),
            target_record_id: None,
            payload: None,
            status: EventStatus::Pending,
            error_message: None,
            created_at: Utc::now(),
        };

        let result = registry.handle("order.confirmed", event).await;
        assert!(result.is_ok());
    }
}

// V45.0 Track A: Finance 领域事件发布器
// =============================================================================
// 同步+异步发布 + RabbitMQ 集成预留 + 扇出（fan-out）模式

use async_trait::async_trait;
use std::sync::Mutex;

use super::events::FinanceDomainEvent;

/// 事件类型名称（用于路由 / 处理器匹配）
pub fn event_type_name(event: &FinanceDomainEvent) -> &'static str {
    match event {
        FinanceDomainEvent::VoucherCreated(_) => "VoucherCreated",
        FinanceDomainEvent::VoucherPosted(_) => "VoucherPosted",
        FinanceDomainEvent::VoucherReversed(_) => "VoucherReversed",
        FinanceDomainEvent::ReceivableCreated(_) => "ReceivableCreated",
        FinanceDomainEvent::ReceivableSettled(_) => "ReceivableSettled",
        FinanceDomainEvent::PayableCreated(_) => "PayableCreated",
        FinanceDomainEvent::PayableSettled(_) => "PayableSettled",
        FinanceDomainEvent::CollectionReceived(_) => "CollectionReceived",
        FinanceDomainEvent::PaymentMade(_) => "PaymentMade",
        FinanceDomainEvent::AgingCalculated(_) => "AgingCalculated",
    }
}

/// 扩展事件发布器 trait：携带 aggregate_id 与元数据
#[async_trait]
pub trait DomainEventPublisherExt: Send + Sync {
    async fn publish(&self, event: &FinanceDomainEvent, aggregate_id: &str) -> Result<(), String>;

    async fn publish_batch(&self, events: &[(FinanceDomainEvent, String)]) -> Result<(), String>;

    async fn publish_with_metadata(
        &self,
        event: &FinanceDomainEvent,
        aggregate_id: &str,
        metadata: EventPublishMetadata,
    ) -> Result<(), String>;
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EventPublishMetadata {
    pub correlation_id: String,
    pub causation_id: Option<String>,
    pub user_id: Option<String>,
    pub tenant_id: Option<String>,
    pub source: String,
    pub priority: EventPriority,
}

impl EventPublishMetadata {
    pub fn new(correlation_id: impl Into<String>, source: impl Into<String>) -> Self {
        Self {
            correlation_id: correlation_id.into(),
            causation_id: None,
            user_id: None,
            tenant_id: None,
            source: source.into(),
            priority: EventPriority::Normal,
        }
    }
}

impl Default for EventPublishMetadata {
    fn default() -> Self {
        Self::new(uuid::Uuid::new_v4().to_string(), "topems-finance")
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum EventPriority {
    Low,
    Normal,
    High,
    Critical,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PublishedEvent {
    pub event: FinanceDomainEvent,
    pub aggregate_id: String,
    pub metadata: EventPublishMetadata,
    pub published_at: chrono::DateTime<chrono::Utc>,
}

/// 内存发布器：收集事件用于测试 / 演示 / 管道回放
pub struct InMemoryEventPublisher {
    published_events: Mutex<Vec<PublishedEvent>>,
}

impl InMemoryEventPublisher {
    pub fn new() -> Self {
        Self {
            published_events: Mutex::new(Vec::new()),
        }
    }

    pub fn get_events(&self) -> Vec<PublishedEvent> {
        self.published_events
            .lock()
            .map(|events| events.clone())
            .unwrap_or_default()
    }

    pub fn count(&self) -> usize {
        self.published_events
            .lock()
            .map(|events| events.len())
            .unwrap_or(0)
    }

    pub fn clear(&self) {
        if let Ok(mut events) = self.published_events.lock() {
            events.clear();
        }
    }
}

impl Default for InMemoryEventPublisher {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl DomainEventPublisherExt for InMemoryEventPublisher {
    async fn publish(&self, event: &FinanceDomainEvent, aggregate_id: &str) -> Result<(), String> {
        self.publish_with_metadata(event, aggregate_id, EventPublishMetadata::default())
            .await
    }

    async fn publish_batch(&self, events: &[(FinanceDomainEvent, String)]) -> Result<(), String> {
        let mut store = self.published_events.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now();
        for (event, aggregate_id) in events {
            store.push(PublishedEvent {
                event: event.clone(),
                aggregate_id: aggregate_id.clone(),
                metadata: EventPublishMetadata::default(),
                published_at: now,
            });
        }
        Ok(())
    }

    async fn publish_with_metadata(
        &self,
        event: &FinanceDomainEvent,
        aggregate_id: &str,
        metadata: EventPublishMetadata,
    ) -> Result<(), String> {
        let mut store = self.published_events.lock().map_err(|e| e.to_string())?;
        store.push(PublishedEvent {
            event: event.clone(),
            aggregate_id: aggregate_id.to_string(),
            metadata,
            published_at: chrono::Utc::now(),
        });
        Ok(())
    }
}

/// 复合发布器：fan-out 模式，同时发布到多个目标
pub struct CompositeEventPublisher {
    publishers: Vec<Box<dyn DomainEventPublisherExt>>,
}

impl CompositeEventPublisher {
    pub fn new() -> Self {
        Self {
            publishers: Vec::new(),
        }
    }

    pub fn with(publisher: Box<dyn DomainEventPublisherExt>) -> Self {
        Self {
            publishers: vec![publisher],
        }
    }

    pub fn add(&mut self, publisher: Box<dyn DomainEventPublisherExt>) {
        self.publishers.push(publisher);
    }

    pub fn count(&self) -> usize {
        self.publishers.len()
    }
}

impl Default for CompositeEventPublisher {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl DomainEventPublisherExt for CompositeEventPublisher {
    async fn publish(&self, event: &FinanceDomainEvent, aggregate_id: &str) -> Result<(), String> {
        let mut errors = Vec::new();
        for publisher in &self.publishers {
            if let Err(e) = publisher.publish(event, aggregate_id).await {
                errors.push(e);
            }
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(format!(
                "CompositeEventPublisher encountered {} error(s): {}",
                errors.len(),
                errors.join("; ")
            ))
        }
    }

    async fn publish_batch(&self, events: &[(FinanceDomainEvent, String)]) -> Result<(), String> {
        let mut errors = Vec::new();
        for publisher in &self.publishers {
            if let Err(e) = publisher.publish_batch(events).await {
                errors.push(e);
            }
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(format!(
                "CompositeEventPublisher batch encountered {} error(s): {}",
                errors.len(),
                errors.join("; ")
            ))
        }
    }

    async fn publish_with_metadata(
        &self,
        event: &FinanceDomainEvent,
        aggregate_id: &str,
        metadata: EventPublishMetadata,
    ) -> Result<(), String> {
        let mut errors = Vec::new();
        for publisher in &self.publishers {
            if let Err(e) = publisher
                .publish_with_metadata(event, aggregate_id, metadata.clone())
                .await
            {
                errors.push(e);
            }
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(format!(
                "CompositeEventPublisher (with metadata) encountered {} error(s): {}",
                errors.len(),
                errors.join("; ")
            ))
        }
    }
}

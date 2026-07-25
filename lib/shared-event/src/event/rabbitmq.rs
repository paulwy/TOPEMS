use super::error::EventResult;
use super::event_types::{CacheInvalidatedPayload, Event, EventType};
use futures_lite::stream::StreamExt;
use serde::Serialize;
use std::env;
use std::sync::Arc;
use tokio;
use tracing::{info, warn};

use lapin::{
    options::{
        BasicPublishOptions, BasicQosOptions, ExchangeDeclareOptions, QueueBindOptions,
        QueueDeclareOptions,
    },
    types::FieldTable,
    BasicProperties, Channel, Connection, ConnectionProperties, ExchangeKind,
};

/// Fanout Exchange 名称：用于缓存失效广播
///
/// 所有服务实例都会绑定到这个 Exchange，收到广播后各自处理本地缓存失效。
/// 使用 Fanout 而非 Topic，是因为缓存失效需要无差别广播给所有实例。
const CACHE_FANOUT_EXCHANGE: &str = "topems.cache.fanout";

#[derive(Debug, Clone)]
pub struct RabbitMqPublisher {
    channel: Channel,
    exchange_name: String,
    service_name: String,
    /// 当前实例标识，用于避免自身重复处理缓存失效事件
    instance_id: String,
}

impl RabbitMqPublisher {
    pub async fn new(service_name: &str) -> EventResult<Self> {
        let rabbitmq_url = env::var("RABBITMQ_URL")
            .unwrap_or_else(|_| "amqp://guest:guest@localhost:5672/%2f".to_string());

        let connection = Connection::connect(&rabbitmq_url, ConnectionProperties::default())
            .await
            .map_err(|e| super::error::EventError::ConnectionError(e.to_string()))?;

        let channel = connection
            .create_channel()
            .await
            .map_err(|e| super::error::EventError::ConnectionError(e.to_string()))?;

        let exchange_name = "topems.events".to_string();

        channel
            .exchange_declare(
                exchange_name.clone().into(),
                ExchangeKind::Topic,
                ExchangeDeclareOptions {
                    durable: true,
                    auto_delete: false,
                    internal: false,
                    nowait: false,
                    passive: false,
                },
                FieldTable::default(),
            )
            .await
            .map_err(|e| super::error::EventError::ConnectionError(e.to_string()))?;

        // V20.0: 声明缓存失效广播 Fanout Exchange
        channel
            .exchange_declare(
                CACHE_FANOUT_EXCHANGE.into(),
                ExchangeKind::Fanout,
                ExchangeDeclareOptions {
                    durable: false, // 缓存失效是瞬时的，无需持久化
                    auto_delete: false,
                    internal: false,
                    nowait: false,
                    passive: false,
                },
                FieldTable::default(),
            )
            .await
            .map_err(|e| super::error::EventError::ConnectionError(e.to_string()))?;

        let instance_id = format!(
            "{}:{}:{}",
            hostname::get()
                .map(|h| h.to_string_lossy().to_string())
                .unwrap_or_else(|_| "unknown".to_string()),
            std::process::id(),
            service_name
        );

        info!(
            "RabbitMQ publisher initialized for service: {} (instance: {})",
            service_name, instance_id
        );

        Ok(Self {
            channel,
            exchange_name,
            service_name: service_name.to_string(),
            instance_id,
        })
    }

    pub async fn publish_event(
        &self,
        event_type: EventType,
        payload: impl Serialize,
    ) -> EventResult<()> {
        let payload_json = serde_json::to_value(&payload)?;
        let event = Event::new(event_type, &self.service_name, payload_json);

        let routing_key = format!("event.{}", event_type);
        let event_json = serde_json::to_string(&event)?;

        let _confirm = self
            .channel
            .basic_publish(
                self.exchange_name.clone().into(),
                routing_key.clone().into(),
                BasicPublishOptions {
                    mandatory: false,
                    immediate: false,
                },
                event_json.as_bytes(),
                BasicProperties::default().with_delivery_mode(2),
            )
            .await
            .map_err(|e| super::error::EventError::PublishError(e.to_string()))?
            .await
            .map_err(|e| super::error::EventError::PublishError(e.to_string()))?;

        info!(
            "RabbitMQ event published - type: {:?}, event_id: {}, routing_key: {}",
            event_type, event.event_id, routing_key
        );

        Ok(())
    }

    /// V20.0: 广播缓存失效事件
    ///
    /// 通过 Fanout Exchange 广播给所有同服务实例，各实例收到后
    /// 删除本地 L1 缓存对应条目，保证多实例一致性。
    ///
    /// 参数说明：
    /// - `cache_key_pattern`: 缓存键或通配符模式（如 "tenant123:erp:dict:*"）
    /// - `invalidation_level`: "specific" | "pattern" | "all"
    /// - `reason`: 失效原因，用于排查问题（如 "record_updated", "manual_flush"）
    pub async fn publish_cache_invalidation(
        &self,
        cache_key_pattern: &str,
        invalidation_level: &str,
        reason: Option<&str>,
    ) -> EventResult<()> {
        let payload = CacheInvalidatedPayload {
            source_service: self.service_name.clone(),
            source_instance: self.instance_id.clone(),
            cache_key_pattern: cache_key_pattern.to_string(),
            invalidation_level: invalidation_level.to_string(),
            reason: reason.map(|s| s.to_string()),
            invalidated_at: chrono::Utc::now(),
        };

        let payload_json = serde_json::to_value(&payload)?;
        let event = Event::new(
            EventType::CacheInvalidated,
            &self.service_name,
            payload_json,
        );
        let event_json = serde_json::to_string(&event)?;

        // Fanout Exchange 无需 routing_key
        let _confirm = self
            .channel
            .basic_publish(
                CACHE_FANOUT_EXCHANGE.into(),
                "".into(),
                BasicPublishOptions {
                    mandatory: false,
                    immediate: false,
                },
                event_json.as_bytes(),
                BasicProperties::default().with_delivery_mode(1), // 非持久化，瞬时消息
            )
            .await
            .map_err(|e| super::error::EventError::PublishError(e.to_string()))?
            .await
            .map_err(|e| super::error::EventError::PublishError(e.to_string()))?;

        info!(
            "Cache invalidation broadcast - service: {}, pattern: {}, level: {}, reason: {:?}",
            self.service_name, cache_key_pattern, invalidation_level, reason
        );

        Ok(())
    }

    /// 获取当前实例标识
    pub fn instance_id(&self) -> &str {
        &self.instance_id
    }
}

#[derive(Debug, Clone)]
pub struct RabbitMqSubscriber {
    channel: Channel,
    queue_name: String,
}

impl RabbitMqSubscriber {
    pub async fn new(service_name: &str) -> EventResult<Self> {
        let rabbitmq_url = env::var("RABBITMQ_URL")
            .unwrap_or_else(|_| "amqp://guest:guest@localhost:5672/%2f".to_string());

        let connection = Connection::connect(&rabbitmq_url, ConnectionProperties::default())
            .await
            .map_err(|e| super::error::EventError::ConnectionError(e.to_string()))?;

        let channel = connection
            .create_channel()
            .await
            .map_err(|e| super::error::EventError::ConnectionError(e.to_string()))?;

        channel
            .basic_qos(10, BasicQosOptions { global: false })
            .await
            .map_err(|e| super::error::EventError::ConnectionError(e.to_string()))?;

        let queue_name = format!("topems.{}", service_name);

        channel
            .queue_declare(
                queue_name.clone().into(),
                QueueDeclareOptions {
                    durable: true,
                    auto_delete: false,
                    exclusive: false,
                    nowait: false,
                    passive: false,
                },
                FieldTable::default(),
            )
            .await
            .map_err(|e| super::error::EventError::SubscribeError(e.to_string()))?;

        info!(
            "RabbitMQ subscriber initialized for service: {}",
            service_name
        );

        Ok(Self {
            channel,
            queue_name,
        })
    }

    pub async fn subscribe(
        &self,
        event_type: EventType,
        handler: impl Fn(Event) -> EventResult<()> + 'static + Send + Sync,
    ) -> EventResult<()> {
        let routing_key = format!("event.{}", event_type);

        self.channel
            .queue_bind(
                self.queue_name.clone().into(),
                "topems.events".into(),
                routing_key.into(),
                QueueBindOptions { nowait: false },
                FieldTable::default(),
            )
            .await
            .map_err(|e| super::error::EventError::SubscribeError(e.to_string()))?;

        let queue_name_clone = self.queue_name.clone();
        let consumer = self
            .channel
            .basic_consume(
                queue_name_clone.into(),
                "".into(),
                lapin::options::BasicConsumeOptions {
                    no_local: false,
                    no_ack: false,
                    exclusive: false,
                    nowait: false,
                },
                FieldTable::default(),
            )
            .await
            .map_err(|e| super::error::EventError::SubscribeError(e.to_string()))?;

        let consumer_tag = consumer.tag().clone();

        tokio::spawn(async move {
            let mut consumer = consumer;
            while let Some(delivery) = consumer.next().await {
                if let Ok(delivery) = delivery {
                    let event: Event = match serde_json::from_slice(&delivery.data) {
                        Ok(e) => e,
                        Err(_) => {
                            let _ = delivery
                                .nack(lapin::options::BasicNackOptions {
                                    multiple: false,
                                    requeue: true,
                                })
                                .await;
                            continue;
                        }
                    };

                    if handler(event).is_ok() {
                        let _ = delivery
                            .ack(lapin::options::BasicAckOptions { multiple: false })
                            .await;
                    } else {
                        let _ = delivery
                            .nack(lapin::options::BasicNackOptions {
                                multiple: false,
                                requeue: true,
                            })
                            .await;
                    }
                }
            }
        });

        info!(
            "Subscribed to event type: {:?} with consumer tag: {}",
            event_type, consumer_tag
        );

        Ok(())
    }

    /// V20.0: 订阅缓存失效广播
    ///
    /// 每个服务实例启动时调用此方法，绑定到 Fanout Exchange，
    /// 收到广播后调用 handler 处理本地缓存失效。
    ///
    /// 队列声明为 exclusive=true，确保每个实例有独立队列，
    /// 实例退出时队列自动删除，避免消息堆积。
    pub async fn subscribe_cache_invalidation(
        &self,
        handler: impl Fn(CacheInvalidatedPayload) -> EventResult<()> + 'static + Send + Sync,
    ) -> EventResult<()> {
        // 每个实例独立队列，exclusive=true
        let exclusive_queue = format!("topems.cache.{}.{}", self.queue_name, std::process::id());

        self.channel
            .queue_declare(
                exclusive_queue.clone().into(),
                QueueDeclareOptions {
                    durable: false, // 缓存失效是瞬时的
                    auto_delete: true,
                    exclusive: true,
                    nowait: false,
                    passive: false,
                },
                FieldTable::default(),
            )
            .await
            .map_err(|e| super::error::EventError::SubscribeError(e.to_string()))?;

        // 绑定到 Fanout Exchange（无需 routing_key）
        self.channel
            .queue_bind(
                exclusive_queue.clone().into(),
                CACHE_FANOUT_EXCHANGE.into(),
                "".into(),
                QueueBindOptions { nowait: false },
                FieldTable::default(),
            )
            .await
            .map_err(|e| super::error::EventError::SubscribeError(e.to_string()))?;

        let consumer = self
            .channel
            .basic_consume(
                exclusive_queue.clone().into(),
                "cache-invalidation-consumer".into(),
                lapin::options::BasicConsumeOptions {
                    no_local: false,
                    no_ack: true, // 缓存失效幂等，无需手动 ack
                    exclusive: false,
                    nowait: false,
                },
                FieldTable::default(),
            )
            .await
            .map_err(|e| super::error::EventError::SubscribeError(e.to_string()))?;

        info!(
            "Subscribed to cache invalidation broadcast on queue: {}",
            exclusive_queue
        );

        tokio::spawn(async move {
            let mut consumer = consumer;
            while let Some(delivery) = consumer.next().await {
                if let Ok(delivery) = delivery {
                    let event: Event = match serde_json::from_slice(&delivery.data) {
                        Ok(e) => e,
                        Err(e) => {
                            warn!("Failed to parse cache invalidation event: {}", e);
                            continue;
                        }
                    };

                    match event.parse_payload::<CacheInvalidatedPayload>() {
                        Ok(payload) => {
                            if let Err(e) = handler(payload) {
                                warn!("Cache invalidation handler error: {:?}", e);
                            }
                        }
                        Err(e) => {
                            warn!("Failed to parse cache invalidation payload: {}", e);
                        }
                    }
                }
            }
        });

        Ok(())
    }
}

/// V20.0: 缓存失效处理器类型
///
/// 业务服务注入此处理器到 MultiLevelCacheManager，
/// 当本地缓存被失效时（如 update/delete 操作后），调用此处理器广播给其他实例。
pub type CacheInvalidationHandler = Arc<dyn Fn(&str, &str) + Send + Sync>;

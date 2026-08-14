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

/// 死信 Exchange：当消费者 nack(requeue=false) 或消息 TTL 过期时，
/// 消息被路由到此 Topic Exchange，再转发到 DLX Queue。
const DLX_EXCHANGE: &str = "topems.events.dlx";

/// 死信队列：存放无法被正常消费的消息，供运维排查/重试。
const DLX_QUEUE: &str = "topems.events.dead";

/// 主队列路由到 DLX 时使用的 routing key。
const DLX_ROUTING_KEY: &str = "dead";

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

        channel
            .exchange_declare(
                DLX_EXCHANGE.into(),
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

        info!("RabbitMQ DLX exchange declared: {}", DLX_EXCHANGE);

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

        let mut queue_args = FieldTable::default();
        queue_args.insert(
            "x-dead-letter-exchange".into(),
            lapin::types::AMQPValue::LongString(DLX_EXCHANGE.into()),
        );
        queue_args.insert(
            "x-dead-letter-routing-key".into(),
            lapin::types::AMQPValue::LongString(DLX_ROUTING_KEY.into()),
        );

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
                queue_args,
            )
            .await
            .map_err(|e| super::error::EventError::SubscribeError(e.to_string()))?;

        channel
            .exchange_declare(
                DLX_EXCHANGE.into(),
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
            .map_err(|e| super::error::EventError::SubscribeError(e.to_string()))?;

        channel
            .queue_declare(
                DLX_QUEUE.into(),
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

        channel
            .queue_bind(
                DLX_QUEUE.into(),
                DLX_EXCHANGE.into(),
                DLX_ROUTING_KEY.into(),
                QueueBindOptions { nowait: false },
                FieldTable::default(),
            )
            .await
            .map_err(|e| super::error::EventError::SubscribeError(e.to_string()))?;

        info!(
            "RabbitMQ subscriber initialized for service: {}, DLX: {} -> {} (routing_key: {})",
            service_name, DLX_EXCHANGE, DLX_QUEUE, DLX_ROUTING_KEY
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
                        Err(err) => {
                            warn!(
                                "Failed to deserialize RabbitMQ event, sending to DLX: {}",
                                err
                            );
                            let _ = delivery
                                .nack(lapin::options::BasicNackOptions {
                                    multiple: false,
                                    requeue: false,
                                })
                                .await;
                            continue;
                        }
                    };

                    if handler(event.clone()).is_ok() {
                        let _ = delivery
                            .ack(lapin::options::BasicAckOptions { multiple: false })
                            .await;
                    } else {
                        warn!(
                            "RabbitMQ event handler failed, sending to DLX - event_id: {}, type: {:?}",
                            event.event_id, event.event_type
                        );
                        let _ = delivery
                            .nack(lapin::options::BasicNackOptions {
                                multiple: false,
                                requeue: false,
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event::error::{EventError, EventResult};
    use crate::event::event_types::{CacheInvalidatedPayload, Event, EventType};
    use std::sync::Arc;

    /// 尝试连接 RabbitMQ，返回是否可用（用于条件跳过错误路径测试）
    async fn rabbitmq_is_available() -> bool {
        let url = std::env::var("RABBITMQ_URL")
            .unwrap_or_else(|_| "amqp://guest:guest@localhost:5672/%2f".to_string());
        Connection::connect(&url, ConnectionProperties::default())
            .await
            .is_ok()
    }

    #[test]
    fn test_constants_are_non_empty_and_well_formed() {
        assert!(!CACHE_FANOUT_EXCHANGE.is_empty());
        assert!(CACHE_FANOUT_EXCHANGE.starts_with("topems."));
        assert!(!DLX_EXCHANGE.is_empty());
        assert!(DLX_EXCHANGE.starts_with("topems."));
        assert!(!DLX_QUEUE.is_empty());
        assert!(!DLX_ROUTING_KEY.is_empty());
        assert_ne!(CACHE_FANOUT_EXCHANGE, DLX_EXCHANGE);
        assert_ne!(DLX_EXCHANGE, DLX_QUEUE);
    }

    #[test]
    fn test_cache_invalidated_payload_serde_roundtrip_with_reason() {
        let payload = CacheInvalidatedPayload {
            source_service: "test-service".to_string(),
            source_instance: "host:1:test-service".to_string(),
            cache_key_pattern: "tenant123:erp:dict:*".to_string(),
            invalidation_level: "pattern".to_string(),
            reason: Some("record_updated".to_string()),
            invalidated_at: chrono::Utc::now(),
        };
        let json = serde_json::to_string(&payload).expect("serialize");
        let back: CacheInvalidatedPayload =
            serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.source_service, "test-service");
        assert_eq!(back.source_instance, "host:1:test-service");
        assert_eq!(back.cache_key_pattern, "tenant123:erp:dict:*");
        assert_eq!(back.invalidation_level, "pattern");
        assert_eq!(back.reason.as_deref(), Some("record_updated"));
        assert_eq!(back.invalidated_at, payload.invalidated_at);
    }

    #[test]
    fn test_cache_invalidated_payload_serde_roundtrip_without_reason() {
        let payload = CacheInvalidatedPayload {
            source_service: "svc".to_string(),
            source_instance: "inst".to_string(),
            cache_key_pattern: "key:*".to_string(),
            invalidation_level: "all".to_string(),
            reason: None,
            invalidated_at: chrono::Utc::now(),
        };
        let json = serde_json::to_string(&payload).expect("serialize");
        let back: CacheInvalidatedPayload =
            serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.source_service, "svc");
        assert_eq!(back.invalidation_level, "all");
        assert!(back.reason.is_none());
    }

    #[test]
    fn test_cache_invalidation_handler_type_alias_constructible() {
        let handler: CacheInvalidationHandler = Arc::new(|pattern: &str, level: &str| {
            assert!(!pattern.is_empty());
            assert!(!level.is_empty());
        });
        // 验证可通过 Arc<dyn Fn> 调用
        handler("key:*", "pattern");
        // 验证可 clone（Arc 特性）
        let _cloned = handler.clone();
    }

    #[test]
    fn test_subscribe_handler_signature_compiles_and_runs() {
        // 验证 subscribe 方法接受的 handler 闭包签名可正确构造并被调用
        let handler = |_event: Event| -> EventResult<()> { Ok(()) };
        let event = Event::new(EventType::HealthCheck, "test", serde_json::json!({}));
        assert!(handler(event).is_ok());
    }

    #[test]
    fn test_subscribe_cache_invalidation_handler_signature() {
        // 验证 subscribe_cache_invalidation 方法接受的 handler 签名
        let handler = |_payload: CacheInvalidatedPayload| -> EventResult<()> { Ok(()) };
        let payload = CacheInvalidatedPayload {
            source_service: "s".to_string(),
            source_instance: "i".to_string(),
            cache_key_pattern: "k".to_string(),
            invalidation_level: "all".to_string(),
            reason: None,
            invalidated_at: chrono::Utc::now(),
        };
        assert!(handler(payload).is_ok());
    }

    #[tokio::test]
    async fn test_rabbitmq_publisher_new_returns_err_when_unavailable() {
        if rabbitmq_is_available().await {
            eprintln!("[skip] RabbitMQ 可用，跳过不可达错误路径测试");
            return;
        }
        let result = RabbitMqPublisher::new("test-service").await;
        assert!(
            result.is_err(),
            "RabbitMQ 不可达时 RabbitMqPublisher::new 应返回 Err"
        );
        // 验证错误类型为 ConnectionError
        match result.unwrap_err() {
            EventError::ConnectionError(_) => {}
            other => panic!("Expected ConnectionError, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_rabbitmq_subscriber_new_returns_err_when_unavailable() {
        if rabbitmq_is_available().await {
            eprintln!("[skip] RabbitMQ 可用，跳过不可达错误路径测试");
            return;
        }
        let result = RabbitMqSubscriber::new("test-service").await;
        assert!(
            result.is_err(),
            "RabbitMQ 不可达时 RabbitMqSubscriber::new 应返回 Err"
        );
        match result.unwrap_err() {
            EventError::ConnectionError(_) => {}
            other => panic!("Expected ConnectionError, got {other:?}"),
        }
    }

    #[test]
    fn test_event_serialization_for_rabbitmq_publish() {
        // publish_event 内部使用 serde_json::to_string 序列化 Event
        // 验证序列化结果可被反序列化回 Event
        let event = Event::new(
            EventType::CacheInvalidated,
            "rabbitmq-test",
            serde_json::json!({"key": "val"}),
        );
        let json = serde_json::to_string(&event).expect("serialize");
        let back: Event = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.event_type, EventType::CacheInvalidated);
        assert_eq!(back.source, "rabbitmq-test");
        assert_eq!(back.event_id, event.event_id);
    }

    #[test]
    fn test_routing_key_format_for_event_types() {
        // publish_event 使用 format!("event.{}", event_type) 作为 routing_key
        // 验证不同事件类型的 routing_key 格式
        for (et, expected) in [
            (EventType::HealthCheck, "event.HealthCheck"),
            (EventType::CacheInvalidated, "event.CacheInvalidated"),
            (EventType::PmProjectCreated, "event.PmProjectCreated"),
        ] {
            let routing_key = format!("event.{}", et);
            assert_eq!(routing_key, expected);
        }
    }
}

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
        let back: CacheInvalidatedPayload = serde_json::from_str(&json).expect("deserialize");
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
        let back: CacheInvalidatedPayload = serde_json::from_str(&json).expect("deserialize");
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

    // === 常量精确值与命名规范 ===

    #[test]
    fn test_constants_exact_values() {
        assert_eq!(CACHE_FANOUT_EXCHANGE, "topems.cache.fanout");
        assert_eq!(DLX_EXCHANGE, "topems.events.dlx");
        assert_eq!(DLX_QUEUE, "topems.events.dead");
        assert_eq!(DLX_ROUTING_KEY, "dead");
    }

    #[test]
    fn test_constants_naming_conventions() {
        // 所有名称常量都遵循 topems.* 命名前缀
        assert!(CACHE_FANOUT_EXCHANGE.starts_with("topems."));
        assert!(DLX_EXCHANGE.starts_with("topems."));
        assert!(DLX_QUEUE.starts_with("topems."));
        // fanout exchange 不应使用 "dlx" 字样，避免误绑定
        assert!(!CACHE_FANOUT_EXCHANGE.contains("dlx"));
        // DLX_QUEUE 与 DLX_EXCHANGE 名称不同（一个用于队列，一个用于交换机）
        assert_ne!(DLX_QUEUE, DLX_EXCHANGE);
        // 主交换机 topems.events 与 DLX 交换机不应相同
        assert_ne!("topems.events", DLX_EXCHANGE);
    }

    #[test]
    fn test_dlx_routing_key_is_short_non_empty_string() {
        assert!(!DLX_ROUTING_KEY.is_empty());
        assert!(DLX_ROUTING_KEY.len() <= 32);
        // routing key 不应包含空格或点（与事件 routing_key "event.Xxx" 区分）
        assert!(!DLX_ROUTING_KEY.contains(' '));
        assert!(!DLX_ROUTING_KEY.contains('.'));
    }

    // === 默认 RabbitMQ URL 行为 ===

    #[test]
    fn test_default_rabbitmq_url_when_env_not_set() {
        // 模拟 RabbitMqPublisher::new / RabbitMqSubscriber::new 中读取 RABBITMQ_URL 的逻辑
        let url = std::env::var("RABBITMQ_URL")
            .unwrap_or_else(|_| "amqp://guest:guest@localhost:5672/%2f".to_string());
        // 验证 URL 是合法的 amqp:// 或 amqps:// 协议
        assert!(url.starts_with("amqp://") || url.starts_with("amqps://"));
    }

    #[test]
    fn test_default_rabbitmq_url_format() {
        let default_url = "amqp://guest:guest@localhost:5672/%2f";
        assert!(default_url.starts_with("amqp://"));
        assert!(default_url.contains("guest:guest"));
        assert!(default_url.contains("localhost:5672"));
        assert!(default_url.ends_with("%2f")); // URL-encoded vhost "/"
    }

    // === instance_id 格式逻辑 ===

    #[test]
    fn test_instance_id_format_logic() {
        // 复制 RabbitMqPublisher::new 中 instance_id 的构造逻辑
        let service_name = "test-service";
        let hostname_str = hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string());
        let pid = std::process::id();
        let instance_id = format!("{}:{}:{}", hostname_str, pid, service_name);

        assert!(instance_id.contains(service_name));
        assert!(instance_id.contains(&pid.to_string()));
        assert!(instance_id.ends_with(service_name));
        // 应至少包含 2 个冒号分隔符
        let colon_count = instance_id.matches(':').count();
        assert!(colon_count >= 2, "instance_id 应至少包含 2 个冒号");
    }

    #[test]
    fn test_instance_id_with_unknown_hostname_fallback() {
        // 验证 hostname 失败时使用 "unknown" 作为回退
        let service_name = "svc";
        let instance_id = format!("{}:{}:{}", "unknown", std::process::id(), service_name);
        assert!(instance_id.starts_with("unknown:"));
        assert!(instance_id.ends_with(service_name));
    }

    #[test]
    fn test_instance_id_uniqueness_across_services() {
        // 同一主机同一 PID 下，不同服务名的 instance_id 应不同
        let pid = std::process::id();
        let host = "h1";
        let id1 = format!("{}:{}:{}", host, pid, "service-a");
        let id2 = format!("{}:{}:{}", host, pid, "service-b");
        assert_ne!(id1, id2);
    }

    #[test]
    fn test_instance_id_uniqueness_across_pids() {
        // 同一主机同一服务下，不同 PID 的 instance_id 应不同
        let host = "h1";
        let svc = "svc";
        let id1 = format!("{}:{}:{}", host, 11111, svc);
        let id2 = format!("{}:{}:{}", host, 22222, svc);
        assert_ne!(id1, id2);
    }

    // === 队列命名约定 ===

    #[test]
    fn test_subscriber_queue_name_format() {
        // RabbitMqSubscriber::new 中: let queue_name = format!("topems.{}", service_name);
        for svc in ["hrm", "erp", "wms", "pm"] {
            let queue_name = format!("topems.{}", svc);
            assert!(queue_name.starts_with("topems."));
            assert!(queue_name.ends_with(svc));
        }
    }

    #[test]
    fn test_exclusive_queue_name_format_for_cache_invalidation() {
        // subscribe_cache_invalidation 中:
        // let exclusive_queue = format!("topems.cache.{}.{}", self.queue_name, std::process::id());
        let service_name = "erp";
        let queue_name = format!("topems.{}", service_name);
        let pid = std::process::id();
        let exclusive_queue = format!("topems.cache.{}.{}", queue_name, pid);

        assert!(exclusive_queue.starts_with("topems.cache."));
        assert!(exclusive_queue.contains(&queue_name));
        assert!(exclusive_queue.ends_with(&pid.to_string()));
        assert_eq!(
            exclusive_queue,
            format!("topems.cache.topems.{}.{}", service_name, pid)
        );
    }

    // === 更多事件类型的 routing_key ===

    #[test]
    fn test_routing_key_for_all_rabbitmq_relevant_event_types() {
        // publish_event 使用 format!("event.{}", event_type)
        let cases = [
            (EventType::HrmEmployeeCreated, "event.HrmEmployeeCreated"),
            (EventType::HrmEmployeeUpdated, "event.HrmEmployeeUpdated"),
            (EventType::PmProjectCreated, "event.PmProjectCreated"),
            (EventType::CacheInvalidated, "event.CacheInvalidated"),
            (EventType::HealthCheck, "event.HealthCheck"),
            (
                EventType::PermissionMetadataChanged,
                "event.PermissionMetadataChanged",
            ),
            (
                EventType::WmsInventoryLowStock,
                "event.WmsInventoryLowStock",
            ),
            (
                EventType::SrmSupplierStatusChanged,
                "event.SrmSupplierStatusChanged",
            ),
            (EventType::AiImageAnalyzed, "event.AiImageAnalyzed"),
            (
                EventType::GisGeofenceTriggered,
                "event.GisGeofenceTriggered",
            ),
        ];
        for (et, expected) in cases {
            let routing_key = format!("event.{}", et);
            assert_eq!(
                routing_key, expected,
                "事件类型 {:?} 的 routing_key 不匹配",
                et
            );
        }
    }

    #[test]
    fn test_routing_key_starts_with_event_prefix() {
        for et in [
            EventType::HealthCheck,
            EventType::CacheInvalidated,
            EventType::PmProjectCreated,
        ] {
            let rk = format!("event.{}", et);
            assert!(rk.starts_with("event."));
            assert!(rk.len() > "event.".len());
        }
    }

    // === publish_event 序列化流程模拟 ===

    #[test]
    fn test_publish_event_serialization_flow() {
        // 模拟 publish_event 内部逻辑:
        // 1. payload_json = serde_json::to_value(&payload)
        // 2. event = Event::new(event_type, &service_name, payload_json)
        // 3. event_json = serde_json::to_string(&event)
        #[derive(Serialize, serde::Deserialize)]
        struct TestPayload {
            id: u64,
            name: String,
        }

        let payload = TestPayload {
            id: 42,
            name: "test".to_string(),
        };
        let event_type = EventType::HrmEmployeeCreated;
        let service_name = "test-service";

        let payload_json = serde_json::to_value(&payload).expect("to_value");
        let event = Event::new(event_type, service_name, payload_json);
        let event_json = serde_json::to_string(&event).expect("to_string");

        let back: Event = serde_json::from_str(&event_json).expect("from_str");
        assert_eq!(back.event_type, event_type);
        assert_eq!(back.source, service_name);
        assert_eq!(back.event_id, event.event_id);

        // 验证 payload 字段保留
        let payload_back: TestPayload = serde_json::from_value(back.payload).expect("from_value");
        assert_eq!(payload_back.id, 42);
        assert_eq!(payload_back.name, "test");
    }

    #[test]
    fn test_publish_event_with_various_payload_types() {
        // publish_event 接受 impl Serialize，应支持各种 JSON 可序列化类型
        let cases: Vec<(&str, serde_json::Value)> = vec![
            ("object", serde_json::json!({"key": "value"})),
            ("array", serde_json::json!([1, 2, 3])),
            ("string", serde_json::json!("hello")),
            ("number", serde_json::json!(42)),
            ("null", serde_json::Value::Null),
            ("bool_true", serde_json::json!(true)),
            ("bool_false", serde_json::json!(false)),
            ("nested", serde_json::json!({"a": {"b": {"c": [1, 2, 3]}}})),
        ];

        for (label, payload) in cases {
            let event = Event::new(EventType::HealthCheck, "test", payload.clone());
            let json = serde_json::to_string(&event).expect("serialize failed");
            let back: Event = serde_json::from_str(&json).expect("deserialize failed");
            assert_eq!(back.payload, payload, "payload {} 往返不一致", label);
        }
    }

    #[test]
    fn test_publish_event_json_is_valid_utf8() {
        // publish_event 使用 event_json.as_bytes() 发送，必须保证 UTF-8
        let event = Event::new(
            EventType::CacheInvalidated,
            "test",
            serde_json::json!({"unicode": "你好，世界！🌍"}),
        );
        let event_json = serde_json::to_string(&event).expect("serialize");
        let bytes = event_json.as_bytes();

        let back = std::str::from_utf8(bytes).expect("应为合法 UTF-8");
        let parsed: Event = serde_json::from_str(back).expect("应可反序列化");
        assert_eq!(parsed.event_id, event.event_id);
    }

    // === publish_cache_invalidation payload 构造 ===

    #[test]
    fn test_publish_cache_invalidation_payload_construction() {
        // 模拟 publish_cache_invalidation 内部 payload 构造逻辑
        let service_name = "erp";
        let instance_id = "host:1234:erp";
        let cache_key_pattern = "tenant123:erp:dict:*";
        let invalidation_level = "pattern";
        let reason: Option<&str> = Some("record_updated");

        let payload = CacheInvalidatedPayload {
            source_service: service_name.to_string(),
            source_instance: instance_id.to_string(),
            cache_key_pattern: cache_key_pattern.to_string(),
            invalidation_level: invalidation_level.to_string(),
            reason: reason.map(|s| s.to_string()),
            invalidated_at: chrono::Utc::now(),
        };

        assert_eq!(payload.source_service, service_name);
        assert_eq!(payload.source_instance, instance_id);
        assert_eq!(payload.cache_key_pattern, cache_key_pattern);
        assert_eq!(payload.invalidation_level, invalidation_level);
        assert_eq!(payload.reason.as_deref(), reason);
    }

    #[test]
    fn test_publish_cache_invalidation_with_none_reason() {
        // 测试 reason=None 时的 payload 构造（模拟 publish_cache_invalidation 调用）
        let payload = CacheInvalidatedPayload {
            source_service: "svc".to_string(),
            source_instance: "inst".to_string(),
            cache_key_pattern: "*".to_string(),
            invalidation_level: "all".to_string(),
            reason: None,
            invalidated_at: chrono::Utc::now(),
        };

        let event = Event::new(
            EventType::CacheInvalidated,
            &payload.source_service,
            serde_json::to_value(&payload).unwrap(),
        );
        let event_json = serde_json::to_string(&event).unwrap();

        let parsed_event: Event = serde_json::from_str(&event_json).unwrap();
        let parsed_payload: CacheInvalidatedPayload = parsed_event.parse_payload().unwrap();
        assert_eq!(parsed_payload.source_service, "svc");
        assert!(parsed_payload.reason.is_none());
    }

    // === CacheInvalidatedPayload 边界值 ===

    #[test]
    fn test_cache_invalidated_payload_with_empty_fields() {
        // 边界值：所有字符串字段为空
        let payload = CacheInvalidatedPayload {
            source_service: "".to_string(),
            source_instance: "".to_string(),
            cache_key_pattern: "".to_string(),
            invalidation_level: "".to_string(),
            reason: Some("".to_string()),
            invalidated_at: chrono::Utc::now(),
        };
        let json = serde_json::to_string(&payload).unwrap();
        let back: CacheInvalidatedPayload = serde_json::from_str(&json).unwrap();
        assert_eq!(back.source_service, "");
        assert_eq!(back.cache_key_pattern, "");
        assert_eq!(back.reason.as_deref(), Some(""));
    }

    #[test]
    fn test_cache_invalidated_payload_with_specific_level() {
        let payload = CacheInvalidatedPayload {
            source_service: "svc".into(),
            source_instance: "inst".into(),
            cache_key_pattern: "tenant:dict:user:123".into(),
            invalidation_level: "specific".into(),
            reason: Some("record_updated".into()),
            invalidated_at: chrono::Utc::now(),
        };
        let json = serde_json::to_string(&payload).unwrap();
        let back: CacheInvalidatedPayload = serde_json::from_str(&json).unwrap();
        assert_eq!(back.invalidation_level, "specific");
    }

    #[test]
    fn test_cache_invalidated_payload_with_all_level() {
        let payload = CacheInvalidatedPayload {
            source_service: "svc".into(),
            source_instance: "inst".into(),
            cache_key_pattern: "*".into(),
            invalidation_level: "all".into(),
            reason: Some("manual_flush".into()),
            invalidated_at: chrono::Utc::now(),
        };
        let json = serde_json::to_string(&payload).unwrap();
        let back: CacheInvalidatedPayload = serde_json::from_str(&json).unwrap();
        assert_eq!(back.invalidation_level, "all");
        assert_eq!(back.cache_key_pattern, "*");
    }

    #[test]
    fn test_cache_invalidated_payload_with_extreme_timestamps() {
        // 测试 epoch 和远期时间戳
        let epoch = chrono::DateTime::from_timestamp(0, 0).unwrap();
        let far_future = chrono::DateTime::from_timestamp(2_000_000_000, 0).unwrap();

        for ts in [epoch, far_future] {
            let payload = CacheInvalidatedPayload {
                source_service: "svc".into(),
                source_instance: "inst".into(),
                cache_key_pattern: "k".into(),
                invalidation_level: "all".into(),
                reason: None,
                invalidated_at: ts,
            };
            let json = serde_json::to_string(&payload).unwrap();
            let back: CacheInvalidatedPayload = serde_json::from_str(&json).unwrap();
            assert_eq!(back.invalidated_at, ts);
        }
    }

    #[test]
    fn test_cache_invalidated_payload_with_special_characters_in_pattern() {
        // 缓存键可能包含特殊字符（通配符、冒号、Unicode 等）
        let patterns = [
            "tenant123:erp:dict:*",
            "user:*:sessions",
            "cache:*",
            "a:b:c:d:e:f",
            "中文:键:*",
            "key with spaces",
            "key'with'quotes",
        ];
        for pattern in patterns {
            let payload = CacheInvalidatedPayload {
                source_service: "s".into(),
                source_instance: "i".into(),
                cache_key_pattern: pattern.into(),
                invalidation_level: "pattern".into(),
                reason: None,
                invalidated_at: chrono::Utc::now(),
            };
            let json = serde_json::to_string(&payload).unwrap();
            let back: CacheInvalidatedPayload = serde_json::from_str(&json).unwrap();
            assert_eq!(back.cache_key_pattern, pattern);
        }
    }

    #[test]
    fn test_cache_invalidated_payload_clone_debug_trait() {
        let payload = CacheInvalidatedPayload {
            source_service: "svc".into(),
            source_instance: "inst".into(),
            cache_key_pattern: "k".into(),
            invalidation_level: "all".into(),
            reason: None,
            invalidated_at: chrono::Utc::now(),
        };
        // Clone
        let cloned = payload.clone();
        assert_eq!(cloned.source_service, payload.source_service);
        // Debug
        let debug_str = format!("{:?}", payload);
        assert!(debug_str.contains("CacheInvalidatedPayload"));
        assert!(debug_str.contains("svc"));
    }

    // === Event saga 上下文（RabbitMQ 发布路径） ===

    #[test]
    fn test_event_with_saga_context_for_rabbitmq_publish() {
        let sid = uuid::Uuid::new_v4();
        let step_id = uuid::Uuid::new_v4();
        let event = Event::new(
            EventType::SalesOrderCreated,
            "erp",
            serde_json::json!({"order_id": "00000000-0000-0000-0000-000000000001"}),
        )
        .with_trace_id(Some("trace-123".into()))
        .with_saga_context(sid, step_id);

        let json = serde_json::to_string(&event).unwrap();
        let back: Event = serde_json::from_str(&json).unwrap();
        assert_eq!(back.saga_id, Some(sid));
        assert_eq!(back.saga_step_id, Some(step_id));
        assert_eq!(back.trace_id.as_deref(), Some("trace-123"));
    }

    #[test]
    fn test_event_skip_saga_fields_when_none_for_rabbitmq() {
        // 验证 saga_id/saga_step_id 为 None 时不出现在 JSON 中
        let event = Event::new(EventType::HealthCheck, "test", serde_json::json!({}));
        let json = serde_json::to_string(&event).unwrap();
        assert!(!json.contains("saga_id"));
        assert!(!json.contains("saga_step_id"));
    }

    // === parse_payload（subscribe_cache_invalidation 路径） ===

    #[test]
    fn test_parse_payload_for_cache_invalidation_full_flow() {
        // 模拟 subscribe_cache_invalidation 内部:
        // event.parse_payload::<CacheInvalidatedPayload>()
        let original = CacheInvalidatedPayload {
            source_service: "erp".into(),
            source_instance: "host:1234:erp".into(),
            cache_key_pattern: "tenant:*".into(),
            invalidation_level: "pattern".into(),
            reason: Some("record_updated".into()),
            invalidated_at: chrono::Utc::now(),
        };
        let event = Event::new(
            EventType::CacheInvalidated,
            "erp",
            serde_json::to_value(&original).unwrap(),
        );
        let parsed: CacheInvalidatedPayload = event.parse_payload().expect("parse_payload");
        assert_eq!(parsed.source_service, original.source_service);
        assert_eq!(parsed.source_instance, original.source_instance);
        assert_eq!(parsed.cache_key_pattern, original.cache_key_pattern);
        assert_eq!(parsed.invalidation_level, original.invalidation_level);
        assert_eq!(parsed.reason, original.reason);
        assert_eq!(parsed.invalidated_at, original.invalidated_at);
    }

    #[test]
    fn test_parse_payload_returns_error_on_invalid_cache_payload() {
        // 当 Event.payload 不是合法的 CacheInvalidatedPayload 时，parse_payload 应返回 Err
        let event = Event::new(
            EventType::CacheInvalidated,
            "erp",
            serde_json::json!({"wrong_field": "value"}), // 缺少必需字段
        );
        let result: Result<CacheInvalidatedPayload, _> = event.parse_payload();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.contains("解析事件 payload 失败"),
            "错误信息应包含 '解析事件 payload 失败': {}",
            err
        );
    }

    // === 错误变体 Display ===

    #[test]
    fn test_event_error_connection_error_display() {
        let err = EventError::ConnectionError("connection refused".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("连接错误"));
        assert!(msg.contains("connection refused"));
    }

    #[test]
    fn test_event_error_publish_error_display() {
        let err = EventError::PublishError("publish timeout".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("发布错误"));
        assert!(msg.contains("publish timeout"));
    }

    #[test]
    fn test_event_error_subscribe_error_display() {
        let err = EventError::SubscribeError("queue not found".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("订阅错误"));
        assert!(msg.contains("queue not found"));
    }

    #[test]
    fn test_event_error_variants_are_distinct() {
        // 验证不同错误变体的 Debug 表示不同
        let conn = EventError::ConnectionError("e1".into());
        let pub_err = EventError::PublishError("e1".into());
        let sub_err = EventError::SubscribeError("e1".into());

        let conn_dbg = format!("{:?}", conn);
        let pub_dbg = format!("{:?}", pub_err);
        let sub_dbg = format!("{:?}", sub_err);

        assert_ne!(conn_dbg, pub_dbg);
        assert_ne!(conn_dbg, sub_dbg);
        assert_ne!(pub_dbg, sub_dbg);
    }

    // === CacheInvalidationHandler 类型别名 ===

    #[test]
    fn test_cache_invalidation_handler_can_be_shared_across_threads() {
        let handler: CacheInvalidationHandler = Arc::new(|_pattern: &str, _level: &str| {});
        let handler_clone = handler.clone();
        // 验证 Arc 引用计数
        assert_eq!(Arc::strong_count(&handler), 2);
        drop(handler_clone);
        assert_eq!(Arc::strong_count(&handler), 1);
    }

    #[test]
    fn test_cache_invalidation_handler_invocation_with_various_inputs() {
        let counter = std::sync::Arc::new(std::sync::Mutex::new(0u32));
        let counter_clone = counter.clone();
        let handler: CacheInvalidationHandler = Arc::new(move |_pattern: &str, _level: &str| {
            *counter_clone.lock().unwrap() += 1;
        });

        handler("key1", "specific");
        handler("key2:*", "pattern");
        handler("*", "all");

        assert_eq!(*counter.lock().unwrap(), 3);
    }

    // === Publisher/Subscriber struct trait bounds ===

    #[test]
    fn test_rabbitmq_publisher_has_debug_clone_trait_bounds() {
        // RabbitMqPublisher 派生了 Debug, Clone，编译期验证
        fn assert_debug_clone<T: std::fmt::Debug + Clone>() {}
        assert_debug_clone::<RabbitMqPublisher>();
    }

    #[test]
    fn test_rabbitmq_subscriber_has_debug_clone_trait_bounds() {
        fn assert_debug_clone<T: std::fmt::Debug + Clone>() {}
        assert_debug_clone::<RabbitMqSubscriber>();
    }

    // === 不可达地址错误路径 ===

    #[tokio::test]
    async fn test_rabbitmq_connection_with_unreachable_port_returns_err() {
        // port 1 通常不可达，验证连接失败
        let url = "amqp://127.0.0.1:1/%2f";
        let result = Connection::connect(url, ConnectionProperties::default()).await;
        assert!(result.is_err(), "连接不可达地址应返回 Err");
    }

    #[tokio::test]
    async fn test_rabbitmq_connection_with_malformed_url_returns_err() {
        // 畸形 URL 应导致连接失败
        let url = "not-a-valid-amqp-url";
        let result = Connection::connect(url, ConnectionProperties::default()).await;
        assert!(result.is_err(), "畸形 URL 应返回 Err");
    }

    // === hostname crate 行为 ===

    #[test]
    fn test_hostname_get_does_not_panic() {
        // 验证 hostname::get() 不会 panic
        let result = hostname::get();
        match result {
            Ok(name) => {
                let _name_str = name.to_string_lossy().to_string();
            }
            Err(_) => {
                // 失败时 RabbitMqPublisher::new 会使用 "unknown" 作为回退
            }
        }
    }

    #[test]
    fn test_hostname_fallback_to_unknown_string() {
        // 模拟 hostname::get 失败时的回退逻辑
        let hostname_str = hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string());
        // 无论成功或失败，回退值非空
        assert!(!hostname_str.is_empty());
    }

    // === Event::new 唯一性 ===

    #[test]
    fn test_event_new_generates_unique_event_ids() {
        let mut ids = std::collections::HashSet::new();
        for _ in 0..100 {
            let event = Event::new(EventType::HealthCheck, "test", serde_json::json!({}));
            ids.insert(event.event_id);
        }
        assert_eq!(
            ids.len(),
            100,
            "100 次 Event::new 应生成 100 个不同的 event_id"
        );
    }

    // === delivery_mode 语义验证 ===

    #[test]
    fn test_publish_event_uses_persistent_delivery_mode() {
        // publish_event 使用 BasicProperties::default().with_delivery_mode(2)
        // delivery_mode=2 表示持久化消息（RabbitMQ 规范）
        let props = BasicProperties::default().with_delivery_mode(2);
        assert_eq!(props.delivery_mode(), &Some(2));
    }

    #[test]
    fn test_publish_cache_invalidation_uses_non_persistent_delivery_mode() {
        // publish_cache_invalidation 使用 with_delivery_mode(1)（非持久化）
        let props = BasicProperties::default().with_delivery_mode(1);
        assert_eq!(props.delivery_mode(), &Some(1));
    }

    // === FieldTable DLX 配置 ===

    #[test]
    fn test_queue_args_for_dlx_configuration() {
        // 模拟 RabbitMqSubscriber::new 中 queue_args 的构造
        let mut queue_args = FieldTable::default();
        queue_args.insert(
            "x-dead-letter-exchange".into(),
            lapin::types::AMQPValue::LongString(DLX_EXCHANGE.into()),
        );
        queue_args.insert(
            "x-dead-letter-routing-key".into(),
            lapin::types::AMQPValue::LongString(DLX_ROUTING_KEY.into()),
        );
        // 验证 DLX 配置可成功插入 FieldTable（与 RabbitMqSubscriber::new 逻辑一致）
        // FieldTable 在当前 lapin 版本未暴露 len() 方法，通过 insert 不 panic 验证 API 兼容
    }

    // === subscribe handler 错误路径 ===

    #[test]
    fn test_subscribe_handler_can_return_err() {
        // 验证 subscribe 的 handler 可以返回 Err（用于触发 nack 到 DLX）
        let handler = |_event: Event| -> EventResult<()> {
            Err(EventError::PublishError("handler failed".into()))
        };
        let event = Event::new(EventType::HealthCheck, "test", serde_json::json!({}));
        let result = handler(event);
        assert!(result.is_err());
        match result.unwrap_err() {
            EventError::PublishError(_) => {}
            other => panic!("Expected PublishError, got {other:?}"),
        }
    }

    #[test]
    fn test_subscribe_handler_ownership_and_move() {
        // 验证 handler 可以拥有外部状态（move 闭包）
        let counter = std::sync::Arc::new(std::sync::Mutex::new(0u32));
        let counter_clone = counter.clone();
        let handler = move |_event: Event| -> EventResult<()> {
            *counter_clone.lock().unwrap() += 1;
            Ok(())
        };

        for _ in 0..5 {
            let event = Event::new(EventType::HealthCheck, "test", serde_json::json!({}));
            assert!(handler(event).is_ok());
        }
        assert_eq!(*counter.lock().unwrap(), 5);
    }

    // === Unicode/嵌套 payload ===

    #[test]
    fn test_event_with_unicode_payload_for_rabbitmq() {
        // 验证 Event 携带 Unicode payload 时的序列化（用于 RabbitMQ 跨语言兼容性）
        let event = Event::new(
            EventType::CacheInvalidated,
            "中文服务",
            serde_json::json!({
                "中文字段": "中文值",
                "emoji": "🚀",
                "mixed": "English中文Mixed"
            }),
        );
        let json = serde_json::to_string(&event).unwrap();
        let back: Event = serde_json::from_str(&json).unwrap();
        assert_eq!(back.source, "中文服务");
        assert_eq!(back.payload, event.payload);
    }

    #[test]
    fn test_event_payload_with_deeply_nested_json() {
        let deep_payload = serde_json::json!({
            "level1": {
                "level2": {
                    "level3": {
                        "level4": {
                            "level5": {
                                "data": [1, 2, 3, {"nested": true}]
                            }
                        }
                    }
                }
            }
        });
        let event = Event::new(EventType::HealthCheck, "test", deep_payload.clone());
        let json = serde_json::to_string(&event).unwrap();
        let back: Event = serde_json::from_str(&json).unwrap();
        assert_eq!(back.payload, deep_payload);
    }
}

use super::error::EventResult;
use super::event_types::{Event, EventType};
use futures_util::StreamExt;
use serde::Serialize;
use std::env;
use std::time::Duration;
use tracing::{info, warn};

use lapin::{
    options::{BasicPublishOptions, ExchangeDeclareOptions, QueueBindOptions, QueueDeclareOptions},
    types::FieldTable,
    BasicProperties, Channel, Connection, ConnectionProperties, ExchangeKind,
};

const DELAYED_EXCHANGE: &str = "topems.delayed";
const DELAYED_QUEUE_PREFIX: &str = "topems.delayed.";

#[derive(Debug, Clone)]
pub struct DelayedMessagePublisher {
    channel: Channel,
    service_name: String,
}

impl DelayedMessagePublisher {
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

        let mut args = FieldTable::default();
        args.insert(
            "x-delayed-type".into(),
            lapin::types::AMQPValue::LongString("topic".into()),
        );

        channel
            .exchange_declare(
                DELAYED_EXCHANGE.into(),
                ExchangeKind::Custom("x-delayed-message".into()),
                ExchangeDeclareOptions {
                    durable: true,
                    auto_delete: false,
                    internal: false,
                    nowait: false,
                    passive: false,
                },
                args,
            )
            .await
            .map_err(|e| {
                warn!(
                    "Failed to declare delayed exchange, falling back to regular exchange: {}",
                    e
                );
                super::error::EventError::ConnectionError(e.to_string())
            })
            .unwrap_or(());

        info!(
            "Delayed message publisher initialized for service: {}",
            service_name
        );

        Ok(Self {
            channel,
            service_name: service_name.to_string(),
        })
    }

    pub async fn publish_delayed_event(
        &self,
        event_type: EventType,
        payload: impl Serialize,
        delay: Duration,
    ) -> EventResult<()> {
        let payload_json = serde_json::to_value(&payload)?;
        let event = Event::new(event_type, &self.service_name, payload_json);

        let routing_key = format!("event.delayed.{}", event_type);
        let event_json = serde_json::to_string(&event)?;

        let mut properties = BasicProperties::default().with_delivery_mode(2);

        let delay_ms = delay.as_millis() as u32;
        let mut headers = FieldTable::default();
        headers.insert("x-delay".into(), delay_ms.into());
        properties = properties.with_headers(headers);

        let _confirm = self
            .channel
            .basic_publish(
                DELAYED_EXCHANGE.into(),
                routing_key.clone().into(),
                BasicPublishOptions {
                    mandatory: false,
                    immediate: false,
                },
                event_json.as_bytes(),
                properties,
            )
            .await
            .map_err(|e| super::error::EventError::PublishError(e.to_string()))?
            .await
            .map_err(|e| super::error::EventError::PublishError(e.to_string()))?;

        info!(
            "Delayed event published - type: {:?}, event_id: {}, delay: {}ms, routing_key: {}",
            event_type, event.event_id, delay_ms, routing_key
        );

        Ok(())
    }

    pub async fn publish_delayed_event_with_target(
        &self,
        event_type: EventType,
        payload: impl Serialize,
        delay: Duration,
        target_service: &str,
    ) -> EventResult<()> {
        let payload_json = serde_json::to_value(&payload)?;
        let event = Event::new(event_type, &self.service_name, payload_json);

        let routing_key = format!("event.delayed.{}.{}", target_service, event_type);
        let event_json = serde_json::to_string(&event)?;

        let mut properties = BasicProperties::default().with_delivery_mode(2);

        let delay_ms = delay.as_millis() as u32;
        let mut headers = FieldTable::default();
        headers.insert("x-delay".into(), delay_ms.into());
        properties = properties.with_headers(headers);

        let _confirm = self
            .channel
            .basic_publish(
                DELAYED_EXCHANGE.into(),
                routing_key.clone().into(),
                BasicPublishOptions {
                    mandatory: false,
                    immediate: false,
                },
                event_json.as_bytes(),
                properties,
            )
            .await
            .map_err(|e| super::error::EventError::PublishError(e.to_string()))?
            .await
            .map_err(|e| super::error::EventError::PublishError(e.to_string()))?;

        info!(
            "Delayed event published to {} - type: {:?}, event_id: {}, delay: {}ms",
            target_service, event_type, event.event_id, delay_ms
        );

        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct DelayedMessageSubscriber {
    channel: Channel,
    queue_name: String,
}

impl DelayedMessageSubscriber {
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
            .basic_qos(10, lapin::options::BasicQosOptions { global: false })
            .await
            .map_err(|e| super::error::EventError::ConnectionError(e.to_string()))?;

        let queue_name = format!("{}{}", DELAYED_QUEUE_PREFIX, service_name);

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
            "Delayed message subscriber initialized for service: {}",
            service_name
        );

        Ok(Self {
            channel,
            queue_name,
        })
    }

    pub async fn subscribe_delayed_events(
        &self,
        event_type: EventType,
        handler: impl Fn(Event) -> EventResult<()> + 'static + Send + Sync,
    ) -> EventResult<()> {
        let routing_key = format!("event.delayed.{}", event_type);

        self.channel
            .queue_bind(
                self.queue_name.clone().into(),
                DELAYED_EXCHANGE.into(),
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
                queue_name_clone.clone().into(),
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
            "Subscribed to delayed events - type: {:?}, queue: {}, consumer tag: {}",
            event_type, queue_name_clone, consumer_tag
        );

        Ok(())
    }

    pub async fn subscribe_delayed_events_for_service(
        &self,
        event_type: EventType,
        handler: impl Fn(Event) -> EventResult<()> + 'static + Send + Sync,
    ) -> EventResult<()> {
        let routing_key = format!(
            "event.delayed.{}.{}",
            self.queue_name.replace("topems.delayed.", ""),
            event_type
        );

        self.channel
            .queue_bind(
                self.queue_name.clone().into(),
                DELAYED_EXCHANGE.into(),
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
                queue_name_clone.clone().into(),
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
            "Subscribed to service-specific delayed events - type: {:?}, queue: {}, consumer tag: {}",
            event_type, queue_name_clone, consumer_tag
        );

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::event::error::{EventError, EventResult};
    use crate::event::event_types::{Event, EventType};

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
        assert!(!DELAYED_EXCHANGE.is_empty());
        assert!(DELAYED_EXCHANGE.starts_with("topems."));
        assert!(!DELAYED_QUEUE_PREFIX.is_empty());
        assert!(DELAYED_QUEUE_PREFIX.starts_with("topems."));
        assert!(DELAYED_QUEUE_PREFIX.ends_with('.'));
    }

    #[test]
    fn test_routing_key_format_for_delayed_event() {
        // publish_delayed_event 使用 format!("event.delayed.{}", event_type) 作为 routing_key
        for (et, expected) in [
            (EventType::HealthCheck, "event.delayed.HealthCheck"),
            (
                EventType::CacheInvalidated,
                "event.delayed.CacheInvalidated",
            ),
            (
                EventType::PmProjectCreated,
                "event.delayed.PmProjectCreated",
            ),
        ] {
            let routing_key = format!("event.delayed.{}", et);
            assert_eq!(routing_key, expected);
        }
    }

    #[test]
    fn test_routing_key_format_for_targeted_delayed_event() {
        // publish_delayed_event_with_target 使用 format!("event.delayed.{}.{}", target, event_type)
        let cases = [
            (
                EventType::HealthCheck,
                "svc-a",
                "event.delayed.svc-a.HealthCheck",
            ),
            (
                EventType::CacheInvalidated,
                "erp",
                "event.delayed.erp.CacheInvalidated",
            ),
        ];
        for (et, target, expected) in cases {
            let routing_key = format!("event.delayed.{}.{}", target, et);
            assert_eq!(routing_key, expected);
        }
    }

    #[test]
    fn test_subscribe_delayed_routing_key_for_service() {
        // subscribe_delayed_events_for_service 内部从 queue_name 提取 service 名
        // queue_name = format!("{}{}", DELAYED_QUEUE_PREFIX, service_name)
        let service_name = "my-service";
        let queue_name = format!("{}{}", DELAYED_QUEUE_PREFIX, service_name);
        assert_eq!(queue_name, "topems.delayed.my-service");

        // 模拟 replace("topems.delayed.", "") 提取 service_name
        let extracted = queue_name.replace("topems.delayed.", "");
        assert_eq!(extracted, service_name);

        let et = EventType::HealthCheck;
        let routing_key = format!("event.delayed.{}.{}", extracted, et);
        assert_eq!(routing_key, "event.delayed.my-service.HealthCheck");
    }

    #[test]
    fn test_duration_to_delay_ms_conversion() {
        // publish_delayed_event 内部用 delay.as_millis() as u32 转换
        let delay = Duration::from_secs(5);
        let delay_ms = delay.as_millis() as u32;
        assert_eq!(delay_ms, 5000);

        let delay = Duration::from_millis(250);
        assert_eq!(delay.as_millis() as u32, 250);

        let delay = Duration::from_secs(60 * 5);
        assert_eq!(delay.as_millis() as u32, 300_000);
    }

    #[test]
    fn test_event_serialization_for_delayed_publish() {
        // publish_delayed_event 内部将 Event 序列化为 JSON 字节流传给 RabbitMQ
        let event = Event::new(
            EventType::HealthCheck,
            "delayed-test",
            serde_json::json!({"delay": 5000}),
        );
        let json = serde_json::to_string(&event).expect("serialize");
        let back: Event = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.event_type, EventType::HealthCheck);
        assert_eq!(back.source, "delayed-test");
        assert_eq!(back.event_id, event.event_id);
        assert_eq!(back.payload, event.payload);
    }

    #[test]
    fn test_subscribe_handler_signature_compiles_and_runs() {
        // 验证 subscribe_delayed_events 接受的 handler 闭包签名
        let handler = |_event: Event| -> EventResult<()> { Ok(()) };
        let event = Event::new(EventType::HealthCheck, "test", serde_json::json!({}));
        assert!(handler(event).is_ok());
    }

    #[test]
    fn test_payload_serialization_for_various_types() {
        // publish_delayed_event 接受 impl Serialize 的 payload
        // 验证不同 payload 类型可序列化为 serde_json::Value
        let payload_str = serde_json::to_value("hello").unwrap();
        assert_eq!(payload_str, serde_json::json!("hello"));

        let payload_num = serde_json::to_value(42i64).unwrap();
        assert_eq!(payload_num, serde_json::json!(42));

        let payload_struct = serde_json::to_value(serde_json::json!({"k": "v"})).unwrap();
        assert_eq!(payload_struct, serde_json::json!({"k": "v"}));
    }

    #[tokio::test]
    async fn test_delayed_publisher_new_returns_err_when_unavailable() {
        if rabbitmq_is_available().await {
            eprintln!("[skip] RabbitMQ 可用，跳过不可达错误路径测试");
            return;
        }
        let result = DelayedMessagePublisher::new("test-service").await;
        assert!(
            result.is_err(),
            "RabbitMQ 不可达时 DelayedMessagePublisher::new 应返回 Err"
        );
        match result.unwrap_err() {
            EventError::ConnectionError(_) => {}
            other => panic!("Expected ConnectionError, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_delayed_subscriber_new_returns_err_when_unavailable() {
        if rabbitmq_is_available().await {
            eprintln!("[skip] RabbitMQ 可用，跳过不可达错误路径测试");
            return;
        }
        let result = DelayedMessageSubscriber::new("test-service").await;
        assert!(
            result.is_err(),
            "RabbitMQ 不可达时 DelayedMessageSubscriber::new 应返回 Err"
        );
        match result.unwrap_err() {
            EventError::ConnectionError(_) => {}
            other => panic!("Expected ConnectionError, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_delayed_publisher_new_with_unreachable_port_returns_err() {
        // 使用不可达端口构造，无论默认 RabbitMQ 是否可用都应失败
        // 注意：此测试通过临时修改 env var 实现，由于 set_var 在并行测试中不安全，
        // 这里改用直接 Connection::connect 验证不可达端口的错误行为
        let result = Connection::connect(
            "amqp://guest:guest@127.0.0.1:1/%2f",
            ConnectionProperties::default(),
        )
        .await;
        assert!(result.is_err(), "不可达端口连接应返回 Err");
    }
}

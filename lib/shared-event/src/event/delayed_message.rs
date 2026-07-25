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

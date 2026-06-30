use super::error::EventResult;
use super::event_types::{Event, EventType};
use futures_lite::stream::StreamExt;
use serde::Serialize;
use std::env;
use tokio;
use tracing::info;

use lapin::{
    options::{
        BasicPublishOptions, BasicQosOptions, ExchangeDeclareOptions,
        QueueBindOptions, QueueDeclareOptions,
    },
    types::FieldTable,
    BasicProperties, Channel, Connection, ConnectionProperties, ExchangeKind,
};

#[derive(Debug, Clone)]
pub struct RabbitMqPublisher {
    channel: Channel,
    exchange_name: String,
    service_name: String,
}

impl RabbitMqPublisher {
    pub async fn new(service_name: &str) -> EventResult<Self> {
        let rabbitmq_url =
            env::var("RABBITMQ_URL").unwrap_or_else(|_| "amqp://guest:guest@localhost:5672/%2f".to_string());

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
                &exchange_name,
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

        info!(
            "RabbitMQ publisher initialized for service: {}",
            service_name
        );

        Ok(Self {
            channel,
            exchange_name,
            service_name: service_name.to_string(),
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
                &self.exchange_name,
                &routing_key,
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
}

#[derive(Debug, Clone)]
pub struct RabbitMqSubscriber {
    channel: Channel,
    queue_name: String,
}

impl RabbitMqSubscriber {
    pub async fn new(service_name: &str) -> EventResult<Self> {
        let rabbitmq_url =
            env::var("RABBITMQ_URL").unwrap_or_else(|_| "amqp://guest:guest@localhost:5672/%2f".to_string());

        let connection = Connection::connect(&rabbitmq_url, ConnectionProperties::default())
            .await
            .map_err(|e| super::error::EventError::ConnectionError(e.to_string()))?;

        let channel = connection
            .create_channel()
            .await
            .map_err(|e| super::error::EventError::ConnectionError(e.to_string()))?;

        channel
            .basic_qos(
                10,
                BasicQosOptions {
                    global: false,
                },
            )
            .await
            .map_err(|e| super::error::EventError::ConnectionError(e.to_string()))?;

        let queue_name = format!("topems.{}", service_name);

        channel
            .queue_declare(
                &queue_name,
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

        Ok(Self { channel, queue_name })
    }

    pub async fn subscribe(
        &self,
        event_type: EventType,
        handler: impl Fn(Event) -> EventResult<()> + 'static + Send + Sync,
    ) -> EventResult<()> {
        let routing_key = format!("event.{}", event_type);

        self.channel
            .queue_bind(
                &self.queue_name,
                "topems.events",
                &routing_key,
                QueueBindOptions {
                    nowait: false,
                },
                FieldTable::default(),
            )
            .await
            .map_err(|e| super::error::EventError::SubscribeError(e.to_string()))?;

        let queue_name_clone = self.queue_name.clone();
        let consumer = self
            .channel
            .basic_consume(
                &queue_name_clone,
                "",
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
                            let _ = delivery.nack(lapin::options::BasicNackOptions {
                                multiple: false,
                                requeue: true,
                            }).await;
                            continue;
                        }
                    };

                    if handler(event).is_ok() {
                        let _ = delivery.ack(lapin::options::BasicAckOptions {
                            multiple: false,
                        }).await;
                    } else {
                        let _ = delivery.nack(lapin::options::BasicNackOptions {
                            multiple: false,
                            requeue: true,
                        }).await;
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
}
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use crate::Result;
use crate::error::TopemsError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub topic: String,
    pub payload: serde_json::Value,
    pub headers: std::collections::HashMap<String, String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl Message {
    pub fn new(topic: &str, payload: serde_json::Value) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            topic: topic.to_string(),
            payload,
            headers: std::collections::HashMap::new(),
            timestamp: chrono::Utc::now(),
        }
    }

    pub fn with_header(mut self, key: &str, value: &str) -> Self {
        self.headers.insert(key.to_string(), value.to_string());
        self
    }

    pub fn with_headers(mut self, headers: std::collections::HashMap<String, String>) -> Self {
        self.headers.extend(headers);
        self
    }
}

#[async_trait]
pub trait MessageProducer {
    async fn publish(&self, topic: &str, payload: serde_json::Value) -> Result<()>;
    async fn publish_with_headers(
        &self,
        topic: &str,
        payload: serde_json::Value,
        headers: std::collections::HashMap<String, String>,
    ) -> Result<()>;
    async fn publish_message(&self, message: Message) -> Result<()>;
}

#[async_trait]
pub trait MessageConsumer {
    async fn subscribe(&self, topic: &str, handler: Box<dyn Fn(Message) -> Result<()> + Send + Sync + 'static>) -> Result<()>;
    async fn unsubscribe(&self, topic: &str) -> Result<()>;
    async fn start_consuming(&self) -> Result<()>;
}

pub struct RedisMessageBroker {
    client: redis::Client,
}

impl RedisMessageBroker {
    pub fn new(redis_url: &str) -> Result<Self> {
        let client = redis::Client::open(redis_url)
            .map_err(|e| TopemsError::Config(format!("Failed to create Redis client: {}", e)))?;
        Ok(Self { client })
    }
}

#[async_trait]
impl MessageProducer for RedisMessageBroker {
    async fn publish(&self, topic: &str, payload: serde_json::Value) -> Result<()> {
        let mut conn = self.client.get_connection()
            .map_err(|e| TopemsError::Config(format!("Failed to get Redis connection: {}", e)))?;
        
        let payload_str = serde_json::to_string(&payload)
            .map_err(|e| TopemsError::Serialization(e))?;
        
        redis::cmd("PUBLISH").arg(topic).arg(payload_str).query::<()>(&mut conn)
            .map_err(|e| TopemsError::Config(format!("Redis PUBLISH failed: {}", e)))?;
        
        Ok(())
    }

    async fn publish_with_headers(
        &self,
        topic: &str,
        payload: serde_json::Value,
        _headers: std::collections::HashMap<String, String>,
    ) -> Result<()> {
        self.publish(topic, payload).await
    }

    async fn publish_message(&self, message: Message) -> Result<()> {
        self.publish(&message.topic, message.payload).await
    }
}

pub struct InMemoryMessageBroker {
    subscribers: std::sync::RwLock<std::collections::HashMap<String, Vec<Box<dyn Fn(Message) -> Result<()> + Send + Sync + 'static>>>>,
}

impl InMemoryMessageBroker {
    pub fn new() -> Self {
        Self {
            subscribers: std::sync::RwLock::new(std::collections::HashMap::new()),
        }
    }
}

#[async_trait]
impl MessageProducer for InMemoryMessageBroker {
    async fn publish(&self, topic: &str, payload: serde_json::Value) -> Result<()> {
        let message = Message::new(topic, payload);
        self.publish_message(message).await
    }

    async fn publish_with_headers(
        &self,
        topic: &str,
        payload: serde_json::Value,
        headers: std::collections::HashMap<String, String>,
    ) -> Result<()> {
        let message = Message::new(topic, payload).with_headers(headers);
        self.publish_message(message).await
    }

    async fn publish_message(&self, message: Message) -> Result<()> {
        let topic = message.topic.clone();
        let subscribers = self.subscribers.read().unwrap();
        
        if let Some(handlers) = subscribers.get(&topic) {
            for handler in handlers {
                let _ = handler(message.clone());
            }
        }
        
        Ok(())
    }
}

#[async_trait]
impl MessageConsumer for InMemoryMessageBroker {
    async fn subscribe(&self, topic: &str, handler: Box<dyn Fn(Message) -> Result<()> + Send + Sync + 'static>) -> Result<()> {
        let mut subscribers = self.subscribers.write().unwrap();
        subscribers.entry(topic.to_string()).or_insert_with(Vec::new).push(handler);
        Ok(())
    }

    async fn unsubscribe(&self, topic: &str) -> Result<()> {
        let mut subscribers = self.subscribers.write().unwrap();
        subscribers.remove(topic);
        Ok(())
    }

    async fn start_consuming(&self) -> Result<()> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_in_memory_broker() {
        let broker = InMemoryMessageBroker::new();
        let received = std::sync::Arc::new(std::sync::Mutex::new(false));
        
        let handler = {
            let received = received.clone();
            Box::new(move |msg: Message| {
                *received.lock().unwrap() = true;
                assert_eq!(msg.topic, "test-topic");
                Ok(())
            })
        };

        broker.subscribe("test-topic", handler).await.unwrap();
        broker.publish("test-topic", serde_json::json!({"key": "value"})).await.unwrap();

        assert!(*received.lock().unwrap());
    }

    #[test]
    fn test_message_creation() {
        let message = Message::new("test", serde_json::json!({"data": "test"}));
        
        assert_eq!(message.topic, "test");
        assert_eq!(message.payload["data"], "test");
        assert!(!message.id.is_empty());
    }

    #[test]
    fn test_message_with_headers() {
        let message = Message::new("test", serde_json::json!({}))
            .with_header("key1", "value1")
            .with_header("key2", "value2");
        
        assert_eq!(message.headers.get("key1"), Some(&"value1".to_string()));
        assert_eq!(message.headers.get("key2"), Some(&"value2".to_string()));
    }
}
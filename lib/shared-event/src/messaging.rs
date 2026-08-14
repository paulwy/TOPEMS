use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use topems_shared_core::error::Result;
use topems_shared_core::error::TopemsError;

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
    async fn subscribe(
        &self,
        topic: &str,
        handler: Box<dyn Fn(Message) -> Result<()> + Send + Sync + 'static>,
    ) -> Result<()>;
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
        let mut conn = self
            .client
            .get_connection()
            .map_err(|e| TopemsError::Config(format!("Failed to get Redis connection: {}", e)))?;

        let payload_str = serde_json::to_string(&payload).map_err(TopemsError::Serialization)?;

        redis::cmd("PUBLISH")
            .arg(topic)
            .arg(payload_str)
            .query::<()>(&mut conn)
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

type MessageHandler = Box<dyn Fn(Message) -> Result<()> + Send + Sync>;

pub struct InMemoryMessageBroker {
    subscribers: std::sync::RwLock<std::collections::HashMap<String, Vec<MessageHandler>>>,
}

impl Default for InMemoryMessageBroker {
    fn default() -> Self {
        Self::new()
    }
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
        let subscribers = self
            .subscribers
            .read()
            .map_err(|e| TopemsError::Internal(format!("Failed to acquire read lock: {}", e)))?;

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
    async fn subscribe(
        &self,
        topic: &str,
        handler: Box<dyn Fn(Message) -> Result<()> + Send + Sync + 'static>,
    ) -> Result<()> {
        let mut subscribers = self
            .subscribers
            .write()
            .map_err(|e| TopemsError::Internal(format!("Failed to acquire write lock: {}", e)))?;
        subscribers
            .entry(topic.to_string())
            .or_default()
            .push(handler);
        Ok(())
    }

    async fn unsubscribe(&self, topic: &str) -> Result<()> {
        let mut subscribers = self
            .subscribers
            .write()
            .map_err(|e| TopemsError::Internal(format!("Failed to acquire write lock: {}", e)))?;
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
        broker
            .publish("test-topic", serde_json::json!({"key": "value"}))
            .await
            .unwrap();

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

    #[test]
    fn test_message_serde_roundtrip() {
        let message = Message::new("serde-topic", serde_json::json!({"k": "v", "n": 42}))
            .with_header("h1", "v1")
            .with_header("h2", "v2");
        let json = serde_json::to_string(&message).expect("serialize");
        let back: Message = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.id, message.id);
        assert_eq!(back.topic, "serde-topic");
        assert_eq!(back.payload["k"], "v");
        assert_eq!(back.payload["n"], 42);
        assert_eq!(back.headers.len(), 2);
        assert_eq!(back.headers.get("h1"), Some(&"v1".to_string()));
        assert_eq!(back.timestamp, message.timestamp);
    }

    #[test]
    fn test_message_serde_roundtrip_empty_headers() {
        let message = Message::new("empty-headers", serde_json::json!("payload"));
        let v = serde_json::to_value(&message).unwrap();
        assert_eq!(v["topic"], "empty-headers");
        assert!(v["headers"].is_object());
        let back: Message = serde_json::from_value(v).unwrap();
        assert!(back.headers.is_empty());
    }

    #[test]
    fn test_message_with_headers_hashmap() {
        let mut headers = std::collections::HashMap::new();
        headers.insert("a".to_string(), "1".to_string());
        headers.insert("b".to_string(), "2".to_string());
        let message = Message::new("topic", serde_json::json!({})).with_headers(headers);
        assert_eq!(message.headers.len(), 2);
        assert_eq!(message.headers.get("a"), Some(&"1".to_string()));
        assert_eq!(message.headers.get("b"), Some(&"2".to_string()));
    }

    #[test]
    fn test_message_with_headers_chained_with_existing() {
        let message = Message::new("t", serde_json::json!({}))
            .with_header("existing", "val")
            .with_header("added", "later");
        assert_eq!(message.headers.len(), 2);
    }

    #[test]
    fn test_message_clone_preserves_fields() {
        let message = Message::new("clone-topic", serde_json::json!({"x": 1}))
            .with_header("k", "v");
        let cloned = message.clone();
        assert_eq!(cloned.id, message.id);
        assert_eq!(cloned.topic, message.topic);
        assert_eq!(cloned.payload, message.payload);
        assert_eq!(cloned.headers, message.headers);
        assert_eq!(cloned.timestamp, message.timestamp);
    }

    #[test]
    fn test_message_id_is_uuid_format() {
        let message = Message::new("uuid-check", serde_json::json!({}));
        // id 应为有效的 UUID v4 字符串
        assert!(uuid::Uuid::parse_str(&message.id).is_ok());
    }

    #[test]
    fn test_in_memory_broker_default_is_empty() {
        let broker = InMemoryMessageBroker::default();
        // 默认无订阅者，发布不应报错
        let result = broker.publish("any-topic", serde_json::json!({}));
        // futures 是惰性的，需要 poll；这里通过 block_on 验证
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(result);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_in_memory_broker_start_consuming_returns_ok() {
        let broker = InMemoryMessageBroker::new();
        let result = broker.start_consuming().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_in_memory_broker_unsubscribe_removes_handler() {
        let broker = InMemoryMessageBroker::new();
        let received = std::sync::Arc::new(std::sync::Mutex::new(false));
        let handler = {
            let received = received.clone();
            Box::new(move |_msg: Message| {
                *received.lock().unwrap() = true;
                Ok(())
            })
        };
        broker.subscribe("topic", handler).await.unwrap();
        broker.unsubscribe("topic").await.unwrap();
        // 取消订阅后发布，handler 不应被调用
        broker
            .publish("topic", serde_json::json!({}))
            .await
            .unwrap();
        assert!(!*received.lock().unwrap());
    }

    #[tokio::test]
    async fn test_in_memory_broker_publish_message_directly() {
        let broker = InMemoryMessageBroker::new();
        let received_topic = std::sync::Arc::new(std::sync::Mutex::new(String::new()));
        let handler = {
            let received_topic = received_topic.clone();
            Box::new(move |msg: Message| {
                *received_topic.lock().unwrap() = msg.topic.clone();
                Ok(())
            })
        };
        broker.subscribe("direct-topic", handler).await.unwrap();
        let message = Message::new("direct-topic", serde_json::json!({"x": 1}));
        broker.publish_message(message).await.unwrap();
        assert_eq!(*received_topic.lock().unwrap(), "direct-topic");
    }

    #[tokio::test]
    async fn test_in_memory_broker_publish_with_headers() {
        let broker = InMemoryMessageBroker::new();
        let received_headers = std::sync::Arc::new(std::sync::Mutex::new(
            std::collections::HashMap::new(),
        ));
        let handler = {
            let received_headers = received_headers.clone();
            Box::new(move |msg: Message| {
                *received_headers.lock().unwrap() = msg.headers.clone();
                Ok(())
            })
        };
        broker.subscribe("hdr-topic", handler).await.unwrap();
        let mut headers = std::collections::HashMap::new();
        headers.insert("k1".to_string(), "v1".to_string());
        broker
            .publish_with_headers("hdr-topic", serde_json::json!({}), headers)
            .await
            .unwrap();
        let h = received_headers.lock().unwrap();
        assert_eq!(h.get("k1"), Some(&"v1".to_string()));
    }

    #[tokio::test]
    async fn test_in_memory_broker_multiple_subscribers() {
        let broker = InMemoryMessageBroker::new();
        let count = std::sync::Arc::new(std::sync::Mutex::new(0u32));
        let c1 = count.clone();
        broker
            .subscribe(
                "multi",
                Box::new(move |_msg: Message| {
                    *c1.lock().unwrap() += 1;
                    Ok(())
                }),
            )
            .await
            .unwrap();
        let c2 = count.clone();
        broker
            .subscribe(
                "multi",
                Box::new(move |_msg: Message| {
                    *c2.lock().unwrap() += 1;
                    Ok(())
                }),
            )
            .await
            .unwrap();
        broker
            .publish("multi", serde_json::json!({}))
            .await
            .unwrap();
        assert_eq!(*count.lock().unwrap(), 2);
    }

    #[tokio::test]
    async fn test_in_memory_broker_unsubscribe_nonexistent_returns_ok() {
        let broker = InMemoryMessageBroker::new();
        let result = broker.unsubscribe("nonexistent").await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_redis_message_broker_new_with_valid_url() {
        // Client::open 是惰性的，valid URL 应成功
        let broker = RedisMessageBroker::new("redis://localhost:6379");
        assert!(broker.is_ok());
    }

    #[test]
    fn test_redis_message_broker_new_with_invalid_url_returns_err() {
        // 明显无效的 URL 应返回 Err
        let result = RedisMessageBroker::new("not-a-redis-url");
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_redis_message_broker_publish_returns_err_when_redis_unavailable() {
        // 注意：RedisMessageBroker::publish 使用同步 get_connection，需在 tokio 阻塞线程中调用
        // 但由于 trait 方法是 async，实际执行会阻塞 runtime。这里使用 spawn_blocking 避免。
        // 但为简单起见，我们直接调用并依赖 tokio 的默认行为。
        let broker = RedisMessageBroker::new("redis://127.0.0.1:1").unwrap();
        let result = broker.publish("topic", serde_json::json!({})).await;
        assert!(result.is_err(), "Redis 不可达时 publish 应返回 Err");
    }
}

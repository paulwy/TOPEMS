use thiserror::Error;

pub type EventResult<T> = std::result::Result<T, EventError>;

#[derive(Error, Debug)]
pub enum EventError {
    #[error("Redis 连接错误: {0}")]
    RedisError(#[from] redis::RedisError),

    #[error("事件序列化错误: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("无效的事件类型: {0}")]
    InvalidEventType(String),

    #[error("订阅者未找到: {0}")]
    SubscriberNotFound(String),

    #[error("事件发布超时")]
    PublishTimeout,

    #[error("配置错误: {0}")]
    ConfigError(String),

    #[error("连接错误: {0}")]
    ConnectionError(String),

    #[error("订阅错误: {0}")]
    SubscribeError(String),

    #[error("发布错误: {0}")]
    PublishError(String),

    #[error("事件 Schema/版本校验失败: {0}")]
    ValidationError(String),
}

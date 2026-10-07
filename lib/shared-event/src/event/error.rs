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

impl From<EventError> for topems_shared_core::error::TopemsError {
    fn from(e: EventError) -> Self {
        use topems_shared_core::error::TopemsError;
        match e {
            EventError::RedisError(inner) => TopemsError::NetworkRequest(format!("Redis: {inner}")),
            EventError::SerializationError(inner) => {
                TopemsError::ValidationFailed(inner.to_string())
            }
            EventError::InvalidEventType(s) => TopemsError::ValidationFailed(s),
            EventError::SubscriberNotFound(s) => TopemsError::ResourceNotFound(s),
            EventError::PublishTimeout => TopemsError::RequestTimeout,
            EventError::ConfigError(s) => TopemsError::ConfigValidation(s),
            EventError::ConnectionError(s) => TopemsError::NetworkRequest(s),
            EventError::SubscribeError(s) => TopemsError::NetworkRequest(s),
            EventError::PublishError(s) => TopemsError::NetworkRequest(s),
            EventError::ValidationError(s) => TopemsError::ValidationFailed(s),
        }
    }
}

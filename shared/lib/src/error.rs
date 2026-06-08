use sqlx::Error as SqlxError;
use thiserror::Error;
use crate::service_client::ServiceClientError;
use crate::event::EventError;

#[derive(Error, Debug)]
pub enum TopemsError {
    #[error("Configuration error: {0}")]
    Config(String),
    
    #[error("Database error: {0}")]
    Database(String),
    
    #[error("Authentication error: {0}")]
    Auth(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Unauthorized: {0}")]
    Unauthorized(String),
    
    #[error("Forbidden: {0}")]
    Forbidden(String),
    
    #[error("Internal server error: {0}")]
    Internal(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("SQL error: {0}")]
    Sql(#[from] SqlxError),
    
    #[error("HTTP request error: {0}")]
    HttpRequest(#[from] reqwest::Error),
    
    #[error("Service not found: {0}")]
    ServiceNotFound(String),
    
    #[error("Service returned error: {status_code} - {message}")]
    ServiceError { status_code: u16, message: String },
    
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
    
    #[error("Redis error: {0}")]
    RedisError(#[from] redis::RedisError),
    
    #[error("Service client error: {0}")]
    ServiceClient(#[from] ServiceClientError),
    
    #[error("Event error: {0}")]
    Event(#[from] EventError),
}

impl TopemsError {
    pub fn status_code(&self) -> u16 {
        match self {
            TopemsError::Config(_) => 500,
            TopemsError::Database(_) => 500,
            TopemsError::Auth(_) => 401,
            TopemsError::Validation(_) => 400,
            TopemsError::NotFound(_) => 404,
            TopemsError::Unauthorized(_) => 401,
            TopemsError::Forbidden(_) => 403,
            TopemsError::Internal(_) => 500,
            TopemsError::Io(_) => 500,
            TopemsError::Serialization(_) => 500,
            TopemsError::Sql(_) => 500,
            TopemsError::HttpRequest(_) => 502,
            TopemsError::ServiceNotFound(_) => 404,
            TopemsError::ServiceError { status_code, .. } => *status_code,
            TopemsError::InvalidUrl(_) => 400,
            TopemsError::RedisError(_) => 500,
            TopemsError::ServiceClient(err) => match err {
                ServiceClientError::HttpRequestError(_) => 502,
                ServiceClientError::JsonError(_) => 500,
                ServiceClientError::ServiceNotFound(_) => 404,
                ServiceClientError::ServiceError { status_code, .. } => *status_code,
                ServiceClientError::InvalidUrl(_) => 400,
                ServiceClientError::ConfigError(_) => 500,
            },
            TopemsError::Event(err) => match err {
                EventError::RedisError(_) => 500,
                EventError::SerializationError(_) => 500,
                EventError::InvalidEventType(_) => 400,
                EventError::SubscriberNotFound(_) => 404,
                EventError::PublishTimeout => 504,
                EventError::ConfigError(_) => 500,
            },
        }
    }

    pub fn error_code(&self) -> &'static str {
        match self {
            TopemsError::Config(_) => "CONFIG_ERROR",
            TopemsError::Database(_) => "DATABASE_ERROR",
            TopemsError::Auth(_) => "AUTH_ERROR",
            TopemsError::Validation(_) => "VALIDATION_ERROR",
            TopemsError::NotFound(_) => "NOT_FOUND",
            TopemsError::Unauthorized(_) => "UNAUTHORIZED",
            TopemsError::Forbidden(_) => "FORBIDDEN",
            TopemsError::Internal(_) => "INTERNAL_ERROR",
            TopemsError::Io(_) => "IO_ERROR",
            TopemsError::Serialization(_) => "SERIALIZATION_ERROR",
            TopemsError::Sql(_) => "SQL_ERROR",
            TopemsError::HttpRequest(_) => "HTTP_REQUEST_ERROR",
            TopemsError::ServiceNotFound(_) => "SERVICE_NOT_FOUND",
            TopemsError::ServiceError { .. } => "SERVICE_ERROR",
            TopemsError::InvalidUrl(_) => "INVALID_URL",
            TopemsError::RedisError(_) => "REDIS_ERROR",
            TopemsError::ServiceClient(_) => "SERVICE_CLIENT_ERROR",
            TopemsError::Event(_) => "EVENT_ERROR",
        }
    }

    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "error": {
                "code": self.error_code(),
                "message": self.to_string(),
            }
        })
    }
}

pub type Result<T> = std::result::Result<T, TopemsError>;

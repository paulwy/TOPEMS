use thiserror::Error;

pub type ServiceClientResult<T> = std::result::Result<T, ServiceClientError>;

#[derive(Error, Debug)]
pub enum ServiceClientError {
    #[error("HTTP request error: {0}")]
    HttpRequestError(#[from] reqwest::Error),

    #[error("JSON serialization error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Service not found: {0}")]
    ServiceNotFound(String),

    #[error("Service returned error: {status_code} - {message}")]
    ServiceError { status_code: u16, message: String },

    #[error("Invalid URL: {0}")]
    InvalidUrl(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),
}

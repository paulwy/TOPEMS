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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_service_not_found() {
        let e = ServiceClientError::ServiceNotFound("foo".into());
        assert_eq!(format!("{}", e), "Service not found: foo");
    }

    #[test]
    fn display_service_error_with_code() {
        let e = ServiceClientError::ServiceError {
            status_code: 404,
            message: "Not Found".into(),
        };
        assert_eq!(format!("{}", e), "Service returned error: 404 - Not Found");
    }

    #[test]
    fn display_invalid_url() {
        let e = ServiceClientError::InvalidUrl("empty host".into());
        assert_eq!(format!("{}", e), "Invalid URL: empty host");
    }

    #[test]
    fn display_config_error() {
        let e = ServiceClientError::ConfigError("missing key".into());
        assert_eq!(format!("{}", e), "Configuration error: missing key");
    }

    #[test]
    fn display_json_error_from_value() {
        let err = serde_json::from_str::<()>("not json").unwrap_err();
        let e: ServiceClientError = err.into();
        let msg = format!("{}", e);
        assert!(msg.starts_with("JSON serialization error:"));
    }

    #[test]
    fn result_type_alias_works() {
        let r: ServiceClientResult<i32> = Err(ServiceClientError::ServiceNotFound("svc".into()));
        assert!(r.is_err());
    }
}

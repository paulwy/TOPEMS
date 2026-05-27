use thiserror::Error;

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

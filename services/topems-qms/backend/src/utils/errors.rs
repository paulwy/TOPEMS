
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;
use tracing::error;

#[derive(Error, Debug)]
pub enum QmsError {
    #[error("数据库错误: {0}")]
    DatabaseError(#[from] sqlx::Error),
    #[error("未找到资源: {0}")]
    NotFound(String),
    #[error("无效请求: {0}")]
    BadRequest(String),
    #[error("未授权")]
    Unauthorized,
    #[error("权限不足")]
    Forbidden,
    #[error("验证错误: {0}")]
    ValidationError(String),
    #[error("内部错误: {0}")]
    InternalError(String),
    #[error("冲突: {0}")]
    Conflict(String),
}

#[derive(Serialize)]
struct ErrorResponse {
    success: bool,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    code: Option<String>,
}

impl IntoResponse for QmsError {
    fn into_response(self) -> Response {
        let (status, message, code) = match &self {
            QmsError::DatabaseError(e) => {
                error!("数据库错误: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("DATABASE_ERROR".to_string()),
                )
            }
            QmsError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                msg.to_string(),
                Some("NOT_FOUND".to_string()),
            ),
            QmsError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                msg.to_string(),
                Some("BAD_REQUEST".to_string()),
            ),
            QmsError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "未授权".to_string(),
                Some("UNAUTHORIZED".to_string()),
            ),
            QmsError::Forbidden => (
                StatusCode::FORBIDDEN,
                "权限不足".to_string(),
                Some("FORBIDDEN".to_string()),
            ),
            QmsError::ValidationError(msg) => (
                StatusCode::BAD_REQUEST,
                msg.to_string(),
                Some("VALIDATION_ERROR".to_string()),
            ),
            QmsError::InternalError(msg) => {
                error!("内部错误: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("INTERNAL_ERROR".to_string()),
                )
            }
            QmsError::Conflict(msg) => (
                StatusCode::CONFLICT,
                msg.to_string(),
                Some("CONFLICT".to_string()),
            ),
        };

        let body = Json(ErrorResponse {
            success: false,
            message,
            code,
        });

        (status, body).into_response()
    }
}

pub type Result<T> = std::result::Result<T, QmsError>;

// 从 QmsError 转换为 TopemsError（用于统一响应）
impl From<QmsError> for topems_shared::error::TopemsError {
    fn from(err: QmsError) -> Self {
        match err {
            QmsError::DatabaseError(e) => topems_shared::error::TopemsError::DatabaseQuery(e.to_string()),
            QmsError::NotFound(msg) => topems_shared::error::TopemsError::ResourceNotFound(msg),
            QmsError::BadRequest(msg) => topems_shared::error::TopemsError::ValidationFailed(msg),
            QmsError::Unauthorized => topems_shared::error::TopemsError::Unauthorized,
            QmsError::Forbidden => topems_shared::error::TopemsError::PermissionDenied {
                required: "需要权限".to_string(),
            },
            QmsError::ValidationError(msg) => topems_shared::error::TopemsError::ValidationFailed(msg),
            QmsError::InternalError(msg) => topems_shared::error::TopemsError::Internal(msg),
            QmsError::Conflict(msg) => topems_shared::error::TopemsError::ResourceAlreadyExists(msg),
        }
    }
}

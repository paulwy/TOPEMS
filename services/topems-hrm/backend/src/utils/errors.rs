
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;
use tracing::error;

#[derive(Error, Debug)]
pub enum HrmError {
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

impl IntoResponse for HrmError {
    fn into_response(self) -> Response {
        let (status, message, code) = match &self {
            HrmError::DatabaseError(e) => {
                error!("数据库错误: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("DATABASE_ERROR".to_string()),
                )
            }
            HrmError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                msg.to_string(),
                Some("NOT_FOUND".to_string()),
            ),
            HrmError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                msg.to_string(),
                Some("BAD_REQUEST".to_string()),
            ),
            HrmError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "未授权".to_string(),
                Some("UNAUTHORIZED".to_string()),
            ),
            HrmError::Forbidden => (
                StatusCode::FORBIDDEN,
                "权限不足".to_string(),
                Some("FORBIDDEN".to_string()),
            ),
            HrmError::ValidationError(msg) => (
                StatusCode::BAD_REQUEST,
                msg.to_string(),
                Some("VALIDATION_ERROR".to_string()),
            ),
            HrmError::InternalError(msg) => {
                error!("内部错误: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("INTERNAL_ERROR".to_string()),
                )
            }
            HrmError::Conflict(msg) => (
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

pub type Result<T> = std::result::Result<T, HrmError>;

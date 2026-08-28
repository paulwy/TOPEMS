//! DSH 错误类型定义

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// DSH 工具错误
#[derive(Debug, Error)]
pub enum DshToolError {
    /// 验证错误
    #[error("验证错误: {field} - {message}")]
    ValidationError {
        /// 相关字段
        field: String,
        /// 错误消息
        message: String,
    },

    /// 未找到错误
    #[error("未找到: {name}")]
    NotFound {
        /// 资源名称
        name: String,
    },

    /// 定义错误
    #[error("定义错误: {message}")]
    DefinitionError {
        /// 错误消息
        message: String,
    },

    /// 权限错误
    #[error("权限错误: {message}")]
    PermissionError {
        /// 错误消息
        message: String,
    },

    /// 认证错误
    #[error("认证错误: {message}")]
    AuthError {
        /// 错误消息
        message: String,
    },

    /// 限流错误
    #[error("限流错误: {message}")]
    RateLimitError {
        /// 错误消息
        message: String,
        /// 重试等待时间（秒）
        retry_after: Option<u64>,
    },

    /// 冲突错误
    #[error("冲突错误: {message}")]
    ConflictError {
        /// 错误消息
        message: String,
    },

    /// 内部错误
    #[error("内部错误: {message}")]
    InternalError {
        /// 错误消息
        message: String,
    },

    /// 服务不可用
    #[error("服务不可用: {message}")]
    ServiceUnavailable {
        /// 错误消息
        message: String,
    },

    /// 超时错误
    #[error("超时错误: {message}")]
    TimeoutError {
        /// 错误消息
        message: String,
    },

    /// 外部服务错误
    #[error("外部服务错误: {service} - {message}")]
    ExternalServiceError {
        /// 服务名称
        service: String,
        /// 错误消息
        message: String,
    },

    /// 其他错误
    #[error("{0}")]
    Other(String),
}

impl DshToolError {
    /// 创建验证错误
    pub fn validation_error(field: impl Into<String>, message: impl Into<String>) -> Self {
        Self::ValidationError {
            field: field.into(),
            message: message.into(),
        }
    }

    /// 创建未找到错误
    pub fn not_found(name: impl Into<String>) -> Self {
        Self::NotFound {
            name: name.into(),
        }
    }

    /// 创建定义错误
    pub fn definition_error(message: impl Into<String>) -> Self {
        Self::DefinitionError {
            message: message.into(),
        }
    }

    /// 创建权限错误
    pub fn permission_error(message: impl Into<String>) -> Self {
        Self::PermissionError {
            message: message.into(),
        }
    }

    /// 创建认证错误
    pub fn auth_error(message: impl Into<String>) -> Self {
        Self::AuthError {
            message: message.into(),
        }
    }

    /// 创建限流错误
    pub fn rate_limit_error(message: impl Into<String>, retry_after: Option<u64>) -> Self {
        Self::RateLimitError {
            message: message.into(),
            retry_after,
        }
    }

    /// 创建冲突错误
    pub fn conflict_error(message: impl Into<String>) -> Self {
        Self::ConflictError {
            message: message.into(),
        }
    }

    /// 创建内部错误
    pub fn internal_error(message: impl Into<String>) -> Self {
        Self::InternalError {
            message: message.into(),
        }
    }

    /// 创建服务不可用错误
    pub fn service_unavailable(message: impl Into<String>) -> Self {
        Self::ServiceUnavailable {
            message: message.into(),
        }
    }

    /// 创建超时错误
    pub fn timeout_error(message: impl Into<String>) -> Self {
        Self::TimeoutError {
            message: message.into(),
        }
    }

    /// 创建外部服务错误
    pub fn external_service_error(service: impl Into<String>, message: impl Into<String>) -> Self {
        Self::ExternalServiceError {
            service: service.into(),
            message: message.into(),
        }
    }

    /// 获取错误码
    pub fn error_code(&self) -> &'static str {
        match self {
            Self::ValidationError { .. } => "VALIDATION_ERROR",
            Self::NotFound { .. } => "NOT_FOUND",
            Self::DefinitionError { .. } => "DEFINITION_ERROR",
            Self::PermissionError { .. } => "PERMISSION_ERROR",
            Self::AuthError { .. } => "AUTH_ERROR",
            Self::RateLimitError { .. } => "RATE_LIMIT_ERROR",
            Self::ConflictError { .. } => "CONFLICT_ERROR",
            Self::InternalError { .. } => "INTERNAL_ERROR",
            Self::ServiceUnavailable { .. } => "SERVICE_UNAVAILABLE",
            Self::TimeoutError { .. } => "TIMEOUT_ERROR",
            Self::ExternalServiceError { .. } => "EXTERNAL_SERVICE_ERROR",
            Self::Other(_) => "UNKNOWN_ERROR",
        }
    }

    /// 获取 HTTP 状态码
    pub fn http_status(&self) -> u16 {
        match self {
            Self::ValidationError { .. } => 400,
            Self::NotFound { .. } => 404,
            Self::DefinitionError { .. } => 400,
            Self::PermissionError { .. } => 403,
            Self::AuthError { .. } => 401,
            Self::RateLimitError { .. } => 429,
            Self::ConflictError { .. } => 409,
            Self::InternalError { .. } => 500,
            Self::ServiceUnavailable { .. } => 503,
            Self::TimeoutError { .. } => 504,
            Self::ExternalServiceError { .. } => 502,
            Self::Other(_) => 500,
        }
    }

    /// 转换为错误响应
    pub fn to_error_response(&self) -> crate::types::DshError {
        crate::types::DshError {
            error_type: self.error_code().to_string(),
            field: match self {
                Self::ValidationError { field, .. } => Some(field.clone()),
                _ => None,
            },
            details: Some(self.to_string()),
            suggestion: match self {
                Self::ValidationError { field, message } => {
                    Some(format!("请检查字段 '{}'：{}", field, message))
                }
                Self::NotFound { name } => Some(format!("请确认 '{}' 是否存在", name)),
                Self::PermissionError { .. } => Some("请联系管理员获取相应权限".to_string()),
                Self::AuthError { .. } => Some("请重新登录或检查认证信息".to_string()),
                Self::RateLimitError { retry_after, .. } => {
                    if let Some(seconds) = retry_after {
                        Some(format!("请在 {} 秒后重试", seconds))
                    } else {
                        Some("请稍后重试".to_string())
                    }
                }
                _ => None,
            },
        }
    }
}

/// 可序列化的错误信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerializableError {
    /// 错误码
    pub code: String,
    /// 错误消息
    pub message: String,
    /// HTTP 状态码
    pub http_status: u16,
    /// 相关字段
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
    /// 建议
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestion: Option<String>,
}

impl From<&DshToolError> for SerializableError {
    fn from(error: &DshToolError) -> Self {
        Self {
            code: error.error_code().to_string(),
            message: error.to_string(),
            http_status: error.http_status(),
            field: match error {
                DshToolError::ValidationError { field, .. } => Some(field.clone()),
                _ => None,
            },
            suggestion: match error {
                DshToolError::ValidationError { field, message } => {
                    Some(format!("请检查字段 '{}'：{}", field, message))
                }
                DshToolError::NotFound { name } => Some(format!("请确认 '{}' 是否存在", name)),
                DshToolError::PermissionError { .. } => Some("请联系管理员获取相应权限".to_string()),
                DshToolError::AuthError { .. } => Some("请重新登录或检查认证信息".to_string()),
                _ => None,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let err = DshToolError::validation_error("name", "名称不能为空");
        assert_eq!(err.error_code(), "VALIDATION_ERROR");
        assert_eq!(err.http_status(), 400);

        let err = DshToolError::not_found("user");
        assert_eq!(err.error_code(), "NOT_FOUND");
        assert_eq!(err.http_status(), 404);

        let err = DshToolError::permission_error("无权限");
        assert_eq!(err.error_code(), "PERMISSION_ERROR");
        assert_eq!(err.http_status(), 403);

        let err = DshToolError::internal_error("服务器错误");
        assert_eq!(err.error_code(), "INTERNAL_ERROR");
        assert_eq!(err.http_status(), 500);
    }

    #[test]
    fn test_error_to_response() {
        let err = DshToolError::validation_error("email", "邮箱格式错误");
        let response = err.to_error_response();
        assert_eq!(response.error_type, "VALIDATION_ERROR");
        assert_eq!(response.field.as_deref(), Some("email"));
        assert!(response.details.is_some());
        assert!(response.suggestion.is_some());
    }

    #[test]
    fn test_serializable_error() {
        let err = DshToolError::not_found("order");
        let serializable = SerializableError::from(&err);
        assert_eq!(serializable.code, "NOT_FOUND");
        assert_eq!(serializable.http_status, 404);
        assert!(serializable.suggestion.is_some());

        let json = serde_json::to_string(&serializable).unwrap();
        assert!(json.contains("NOT_FOUND"));
    }

    #[test]
    fn test_all_error_types() {
        let errors = vec![
            DshToolError::validation_error("f", "m"),
            DshToolError::not_found("n"),
            DshToolError::definition_error("m"),
            DshToolError::permission_error("m"),
            DshToolError::auth_error("m"),
            DshToolError::rate_limit_error("m", Some(60)),
            DshToolError::conflict_error("m"),
            DshToolError::internal_error("m"),
            DshToolError::service_unavailable("m"),
            DshToolError::timeout_error("m"),
            DshToolError::external_service_error("ai", "m"),
            DshToolError::Other("m".to_string()),
        ];

        for err in &errors {
            assert!(!err.error_code().is_empty());
            assert!(err.http_status() >= 400);
            assert!(!err.to_string().is_empty());
        }
    }
}

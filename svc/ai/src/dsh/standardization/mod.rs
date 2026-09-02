//! DSH Layer 1 标准化模块
//!
//! 提供统一错误码、接口标准、数据结构、响应格式等标准化能力。

use std::collections::HashMap;
use std::fmt;

use serde::{Deserialize, Serialize};

// ============================================================================
// 统一错误码
// ============================================================================

/// 错误类别
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ErrorCategory {
    /// 系统错误（1xxxx）
    System,
    /// 验证错误（2xxxx）
    Validation,
    /// 认证授权错误（3xxxx）
    Auth,
    /// 资源错误（4xxxx）
    Resource,
    /// 业务逻辑错误（5xxxx）
    Business,
    /// 外部服务错误（6xxxx）
    External,
    /// 配置错误（7xxxx）
    Config,
    /// 限流错误（8xxxx）
    RateLimit,
    /// 未知错误（9xxxx）
    Unknown,
}

impl ErrorCategory {
    pub fn code_prefix(&self) -> u32 {
        match self {
            ErrorCategory::System => 10000,
            ErrorCategory::Validation => 20000,
            ErrorCategory::Auth => 30000,
            ErrorCategory::Resource => 40000,
            ErrorCategory::Business => 50000,
            ErrorCategory::External => 60000,
            ErrorCategory::Config => 70000,
            ErrorCategory::RateLimit => 80000,
            ErrorCategory::Unknown => 90000,
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            ErrorCategory::System => "system",
            ErrorCategory::Validation => "validation",
            ErrorCategory::Auth => "auth",
            ErrorCategory::Resource => "resource",
            ErrorCategory::Business => "business",
            ErrorCategory::External => "external",
            ErrorCategory::Config => "config",
            ErrorCategory::RateLimit => "rate_limit",
            ErrorCategory::Unknown => "unknown",
        }
    }
}

/// 标准错误码
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ErrorCode {
    // 系统错误 1xxxx
    /// 内部服务器错误
    InternalError,
    /// 服务不可用
    ServiceUnavailable,
    /// 网关超时
    GatewayTimeout,
    /// 维护中
    UnderMaintenance,

    // 验证错误 2xxxx
    /// 请求参数无效
    InvalidParameter,
    /// 缺少必需参数
    MissingParameter,
    /// 参数格式错误
    InvalidFormat,
    /// 参数值超出范围
    OutOfRange,
    /// 请求体过大
    PayloadTooLarge,
    /// 不支持的媒体类型
    UnsupportedMediaType,

    // 认证授权错误 3xxxx
    /// 未认证
    Unauthenticated,
    /// 认证失败
    AuthenticationFailed,
    /// Token 过期
    TokenExpired,
    /// Token 无效
    InvalidToken,
    /// 权限不足
    PermissionDenied,
    /// 访问被禁止
    Forbidden,
    /// 账户被锁定
    AccountLocked,
    /// 账户被禁用
    AccountDisabled,

    // 资源错误 4xxxx
    /// 资源不存在
    NotFound,
    /// 资源已存在
    AlreadyExists,
    /// 资源冲突
    Conflict,
    /// 资源被锁定
    ResourceLocked,
    /// 资源已过期
    ResourceExpired,
    /// 资源配额超限
    QuotaExceeded,

    // 业务逻辑错误 5xxxx
    /// 业务规则违反
    BusinessRuleViolation,
    /// 操作不允许
    OperationNotAllowed,
    /// 状态无效
    InvalidState,
    /// 操作超时
    OperationTimeout,
    /// 操作失败
    OperationFailed,
    /// 数据不一致
    DataInconsistency,

    // 外部服务错误 6xxxx
    /// 外部服务调用失败
    ExternalServiceFailed,
    /// 外部服务超时
    ExternalServiceTimeout,
    /// 外部服务不可用
    ExternalServiceUnavailable,
    /// 外部服务返回错误
    ExternalServiceError,
    /// LLM 调用失败
    LLMCallFailed,
    /// 数据库错误
    DatabaseError,
    /// 缓存错误
    CacheError,
    /// 消息队列错误
    MessageQueueError,

    // 配置错误 7xxxx
    /// 配置缺失
    ConfigMissing,
    /// 配置无效
    ConfigInvalid,
    /// 配置加载失败
    ConfigLoadFailed,
    /// 环境变量缺失
    EnvVarMissing,

    // 限流错误 8xxxx
    /// 请求频率超限
    RateLimitExceeded,
    /// 并发数超限
    ConcurrencyLimitExceeded,
    /// 突发流量超限
    BurstLimitExceeded,
    /// 用户配额超限
    UserQuotaExceeded,
    /// 租户配额超限
    TenantQuotaExceeded,

    // 未知错误 9xxxx
    /// 未知错误
    UnknownError,
}

impl ErrorCode {
    /// 获取错误码数值
    pub fn code(&self) -> u32 {
        let (category, offset) = match self {
            ErrorCode::InternalError => (ErrorCategory::System, 1),
            ErrorCode::ServiceUnavailable => (ErrorCategory::System, 2),
            ErrorCode::GatewayTimeout => (ErrorCategory::System, 3),
            ErrorCode::UnderMaintenance => (ErrorCategory::System, 4),

            ErrorCode::InvalidParameter => (ErrorCategory::Validation, 1),
            ErrorCode::MissingParameter => (ErrorCategory::Validation, 2),
            ErrorCode::InvalidFormat => (ErrorCategory::Validation, 3),
            ErrorCode::OutOfRange => (ErrorCategory::Validation, 4),
            ErrorCode::PayloadTooLarge => (ErrorCategory::Validation, 5),
            ErrorCode::UnsupportedMediaType => (ErrorCategory::Validation, 6),

            ErrorCode::Unauthenticated => (ErrorCategory::Auth, 1),
            ErrorCode::AuthenticationFailed => (ErrorCategory::Auth, 2),
            ErrorCode::TokenExpired => (ErrorCategory::Auth, 3),
            ErrorCode::InvalidToken => (ErrorCategory::Auth, 4),
            ErrorCode::PermissionDenied => (ErrorCategory::Auth, 5),
            ErrorCode::Forbidden => (ErrorCategory::Auth, 6),
            ErrorCode::AccountLocked => (ErrorCategory::Auth, 7),
            ErrorCode::AccountDisabled => (ErrorCategory::Auth, 8),

            ErrorCode::NotFound => (ErrorCategory::Resource, 1),
            ErrorCode::AlreadyExists => (ErrorCategory::Resource, 2),
            ErrorCode::Conflict => (ErrorCategory::Resource, 3),
            ErrorCode::ResourceLocked => (ErrorCategory::Resource, 4),
            ErrorCode::ResourceExpired => (ErrorCategory::Resource, 5),
            ErrorCode::QuotaExceeded => (ErrorCategory::Resource, 6),

            ErrorCode::BusinessRuleViolation => (ErrorCategory::Business, 1),
            ErrorCode::OperationNotAllowed => (ErrorCategory::Business, 2),
            ErrorCode::InvalidState => (ErrorCategory::Business, 3),
            ErrorCode::OperationTimeout => (ErrorCategory::Business, 4),
            ErrorCode::OperationFailed => (ErrorCategory::Business, 5),
            ErrorCode::DataInconsistency => (ErrorCategory::Business, 6),

            ErrorCode::ExternalServiceFailed => (ErrorCategory::External, 1),
            ErrorCode::ExternalServiceTimeout => (ErrorCategory::External, 2),
            ErrorCode::ExternalServiceUnavailable => (ErrorCategory::External, 3),
            ErrorCode::ExternalServiceError => (ErrorCategory::External, 4),
            ErrorCode::LLMCallFailed => (ErrorCategory::External, 5),
            ErrorCode::DatabaseError => (ErrorCategory::External, 6),
            ErrorCode::CacheError => (ErrorCategory::External, 7),
            ErrorCode::MessageQueueError => (ErrorCategory::External, 8),

            ErrorCode::ConfigMissing => (ErrorCategory::Config, 1),
            ErrorCode::ConfigInvalid => (ErrorCategory::Config, 2),
            ErrorCode::ConfigLoadFailed => (ErrorCategory::Config, 3),
            ErrorCode::EnvVarMissing => (ErrorCategory::Config, 4),

            ErrorCode::RateLimitExceeded => (ErrorCategory::RateLimit, 1),
            ErrorCode::ConcurrencyLimitExceeded => (ErrorCategory::RateLimit, 2),
            ErrorCode::BurstLimitExceeded => (ErrorCategory::RateLimit, 3),
            ErrorCode::UserQuotaExceeded => (ErrorCategory::RateLimit, 4),
            ErrorCode::TenantQuotaExceeded => (ErrorCategory::RateLimit, 5),

            ErrorCode::UnknownError => (ErrorCategory::Unknown, 1),
        };

        category.code_prefix() + offset
    }

    /// 获取错误类别
    pub fn category(&self) -> ErrorCategory {
        match self {
            ErrorCode::InternalError
            | ErrorCode::ServiceUnavailable
            | ErrorCode::GatewayTimeout
            | ErrorCode::UnderMaintenance => ErrorCategory::System,
            ErrorCode::InvalidParameter
            | ErrorCode::MissingParameter
            | ErrorCode::InvalidFormat
            | ErrorCode::OutOfRange
            | ErrorCode::PayloadTooLarge
            | ErrorCode::UnsupportedMediaType => ErrorCategory::Validation,
            ErrorCode::Unauthenticated
            | ErrorCode::AuthenticationFailed
            | ErrorCode::TokenExpired
            | ErrorCode::InvalidToken
            | ErrorCode::PermissionDenied
            | ErrorCode::Forbidden
            | ErrorCode::AccountLocked
            | ErrorCode::AccountDisabled => ErrorCategory::Auth,
            ErrorCode::NotFound
            | ErrorCode::AlreadyExists
            | ErrorCode::Conflict
            | ErrorCode::ResourceLocked
            | ErrorCode::ResourceExpired
            | ErrorCode::QuotaExceeded => ErrorCategory::Resource,
            ErrorCode::BusinessRuleViolation
            | ErrorCode::OperationNotAllowed
            | ErrorCode::InvalidState
            | ErrorCode::OperationTimeout
            | ErrorCode::OperationFailed
            | ErrorCode::DataInconsistency => ErrorCategory::Business,
            ErrorCode::ExternalServiceFailed
            | ErrorCode::ExternalServiceTimeout
            | ErrorCode::ExternalServiceUnavailable
            | ErrorCode::ExternalServiceError
            | ErrorCode::LLMCallFailed
            | ErrorCode::DatabaseError
            | ErrorCode::CacheError
            | ErrorCode::MessageQueueError => ErrorCategory::External,
            ErrorCode::ConfigMissing
            | ErrorCode::ConfigInvalid
            | ErrorCode::ConfigLoadFailed
            | ErrorCode::EnvVarMissing => ErrorCategory::Config,
            ErrorCode::RateLimitExceeded
            | ErrorCode::ConcurrencyLimitExceeded
            | ErrorCode::BurstLimitExceeded
            | ErrorCode::UserQuotaExceeded
            | ErrorCode::TenantQuotaExceeded => ErrorCategory::RateLimit,
            ErrorCode::UnknownError => ErrorCategory::Unknown,
        }
    }

    /// 获取默认错误消息
    pub fn default_message(&self) -> &str {
        match self {
            ErrorCode::InternalError => "内部服务器错误",
            ErrorCode::ServiceUnavailable => "服务不可用",
            ErrorCode::GatewayTimeout => "网关超时",
            ErrorCode::UnderMaintenance => "系统维护中",

            ErrorCode::InvalidParameter => "请求参数无效",
            ErrorCode::MissingParameter => "缺少必需参数",
            ErrorCode::InvalidFormat => "参数格式错误",
            ErrorCode::OutOfRange => "参数值超出范围",
            ErrorCode::PayloadTooLarge => "请求体过大",
            ErrorCode::UnsupportedMediaType => "不支持的媒体类型",

            ErrorCode::Unauthenticated => "未认证",
            ErrorCode::AuthenticationFailed => "认证失败",
            ErrorCode::TokenExpired => "Token 已过期",
            ErrorCode::InvalidToken => "Token 无效",
            ErrorCode::PermissionDenied => "权限不足",
            ErrorCode::Forbidden => "访问被禁止",
            ErrorCode::AccountLocked => "账户已锁定",
            ErrorCode::AccountDisabled => "账户已禁用",

            ErrorCode::NotFound => "资源不存在",
            ErrorCode::AlreadyExists => "资源已存在",
            ErrorCode::Conflict => "资源冲突",
            ErrorCode::ResourceLocked => "资源被锁定",
            ErrorCode::ResourceExpired => "资源已过期",
            ErrorCode::QuotaExceeded => "资源配额超限",

            ErrorCode::BusinessRuleViolation => "违反业务规则",
            ErrorCode::OperationNotAllowed => "操作不允许",
            ErrorCode::InvalidState => "状态无效",
            ErrorCode::OperationTimeout => "操作超时",
            ErrorCode::OperationFailed => "操作失败",
            ErrorCode::DataInconsistency => "数据不一致",

            ErrorCode::ExternalServiceFailed => "外部服务调用失败",
            ErrorCode::ExternalServiceTimeout => "外部服务超时",
            ErrorCode::ExternalServiceUnavailable => "外部服务不可用",
            ErrorCode::ExternalServiceError => "外部服务返回错误",
            ErrorCode::LLMCallFailed => "LLM 调用失败",
            ErrorCode::DatabaseError => "数据库错误",
            ErrorCode::CacheError => "缓存错误",
            ErrorCode::MessageQueueError => "消息队列错误",

            ErrorCode::ConfigMissing => "配置缺失",
            ErrorCode::ConfigInvalid => "配置无效",
            ErrorCode::ConfigLoadFailed => "配置加载失败",
            ErrorCode::EnvVarMissing => "环境变量缺失",

            ErrorCode::RateLimitExceeded => "请求频率超限",
            ErrorCode::ConcurrencyLimitExceeded => "并发数超限",
            ErrorCode::BurstLimitExceeded => "突发流量超限",
            ErrorCode::UserQuotaExceeded => "用户配额超限",
            ErrorCode::TenantQuotaExceeded => "租户配额超限",

            ErrorCode::UnknownError => "未知错误",
        }
    }

    /// 获取 HTTP 状态码
    pub fn http_status(&self) -> u16 {
        match self {
            ErrorCode::InternalError | ErrorCode::UnderMaintenance => 500,
            ErrorCode::ServiceUnavailable => 503,
            ErrorCode::GatewayTimeout => 504,

            ErrorCode::InvalidParameter
            | ErrorCode::MissingParameter
            | ErrorCode::InvalidFormat
            | ErrorCode::OutOfRange => 400,
            ErrorCode::PayloadTooLarge => 413,
            ErrorCode::UnsupportedMediaType => 415,

            ErrorCode::Unauthenticated
            | ErrorCode::AuthenticationFailed
            | ErrorCode::TokenExpired
            | ErrorCode::InvalidToken => 401,
            ErrorCode::PermissionDenied
            | ErrorCode::Forbidden
            | ErrorCode::AccountLocked
            | ErrorCode::AccountDisabled => 403,

            ErrorCode::NotFound => 404,
            ErrorCode::AlreadyExists | ErrorCode::Conflict => 409,
            ErrorCode::ResourceLocked => 423,
            ErrorCode::ResourceExpired => 410,
            ErrorCode::QuotaExceeded => 429,

            ErrorCode::BusinessRuleViolation
            | ErrorCode::OperationNotAllowed
            | ErrorCode::InvalidState => 422,
            ErrorCode::OperationTimeout => 408,
            ErrorCode::OperationFailed | ErrorCode::DataInconsistency => 500,

            ErrorCode::ExternalServiceFailed
            | ErrorCode::ExternalServiceError
            | ErrorCode::LLMCallFailed
            | ErrorCode::DatabaseError
            | ErrorCode::CacheError
            | ErrorCode::MessageQueueError => 502,
            ErrorCode::ExternalServiceTimeout => 504,
            ErrorCode::ExternalServiceUnavailable => 503,

            ErrorCode::ConfigMissing
            | ErrorCode::ConfigInvalid
            | ErrorCode::ConfigLoadFailed
            | ErrorCode::EnvVarMissing => 500,

            ErrorCode::RateLimitExceeded
            | ErrorCode::ConcurrencyLimitExceeded
            | ErrorCode::BurstLimitExceeded
            | ErrorCode::UserQuotaExceeded
            | ErrorCode::TenantQuotaExceeded => 429,

            ErrorCode::UnknownError => 500,
        }
    }

    /// 是否可重试
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            ErrorCode::ServiceUnavailable
                | ErrorCode::GatewayTimeout
                | ErrorCode::OperationTimeout
                | ErrorCode::ExternalServiceFailed
                | ErrorCode::ExternalServiceTimeout
                | ErrorCode::ExternalServiceUnavailable
                | ErrorCode::LLMCallFailed
                | ErrorCode::DatabaseError
                | ErrorCode::CacheError
                | ErrorCode::MessageQueueError
                | ErrorCode::RateLimitExceeded
                | ErrorCode::ConcurrencyLimitExceeded
                | ErrorCode::BurstLimitExceeded
        )
    }
}

impl fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.code(), self.default_message())
    }
}

// ============================================================================
// 标准错误
// ============================================================================

/// 标准错误结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandardError {
    /// 错误码
    pub code: u32,
    /// 错误类别
    pub category: String,
    /// 错误消息
    pub message: String,
    /// 详细信息
    pub details: Option<HashMap<String, serde_json::Value>>,
    /// 错误追踪 ID
    pub trace_id: Option<String>,
    /// 发生时间
    pub timestamp: String,
    /// 是否可重试
    pub retryable: bool,
}

impl StandardError {
    /// 创建新的标准错误
    pub fn new(error_code: ErrorCode) -> Self {
        Self {
            code: error_code.code(),
            category: error_code.category().as_str().to_string(),
            message: error_code.default_message().to_string(),
            details: None,
            trace_id: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
            retryable: error_code.is_retryable(),
        }
    }

    /// 创建带自定义消息的标准错误
    pub fn with_message(error_code: ErrorCode, message: impl Into<String>) -> Self {
        let mut error = Self::new(error_code);
        error.message = message.into();
        error
    }

    /// 添加详细信息
    pub fn with_details(mut self, details: HashMap<String, serde_json::Value>) -> Self {
        self.details = Some(details);
        self
    }

    /// 添加追踪 ID
    pub fn with_trace_id(mut self, trace_id: impl Into<String>) -> Self {
        self.trace_id = Some(trace_id.into());
        self
    }

    /// 获取 HTTP 状态码
    pub fn http_status(&self) -> u16 {
        // 根据错误码前缀推断
        match self.code / 10000 {
            1 => 500,
            2 => 400,
            3 => 401,
            4 => 404,
            5 => 422,
            6 => 502,
            7 => 500,
            8 => 429,
            _ => 500,
        }
    }
}

impl fmt::Display for StandardError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {} - {}", self.code, self.category, self.message)
    }
}

impl std::error::Error for StandardError {}

// ============================================================================
// 标准响应
// ============================================================================

/// 标准响应结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandardResponse<T> {
    /// 是否成功
    pub success: bool,
    /// 响应数据
    pub data: Option<T>,
    /// 错误信息
    pub error: Option<StandardError>,
    /// 元数据
    pub meta: Option<ResponseMeta>,
    /// 追踪 ID
    pub trace_id: Option<String>,
    /// 时间戳
    pub timestamp: String,
}

/// 响应元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseMeta {
    /// 总记录数（分页时使用）
    pub total: Option<u64>,
    /// 当前页码
    pub page: Option<u32>,
    /// 每页大小
    pub page_size: Option<u32>,
    /// 总页数
    pub total_pages: Option<u32>,
    /// 下一页游标
    pub next_cursor: Option<String>,
    /// 处理耗时（毫秒）
    pub processing_time_ms: Option<u64>,
    /// API 版本
    pub api_version: Option<String>,
}

impl<T> StandardResponse<T> {
    /// 创建成功响应
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            meta: None,
            trace_id: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// 创建带元数据的成功响应
    pub fn success_with_meta(data: T, meta: ResponseMeta) -> Self {
        let mut response = Self::success(data);
        response.meta = Some(meta);
        response
    }

    /// 创建错误响应
    pub fn error(error: StandardError) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
            meta: None,
            trace_id: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// 从错误码创建错误响应
    pub fn from_error_code(error_code: ErrorCode) -> Self {
        Self::error(StandardError::new(error_code))
    }

    /// 添加追踪 ID
    pub fn with_trace_id(mut self, trace_id: impl Into<String>) -> Self {
        let trace_id = trace_id.into();
        self.trace_id = Some(trace_id.clone());
        if let Some(error) = &mut self.error {
            error.trace_id = Some(trace_id);
        }
        self
    }

    /// 转换数据类型
    pub fn map<U, F: FnOnce(T) -> U>(self, f: F) -> StandardResponse<U> {
        StandardResponse {
            success: self.success,
            data: self.data.map(f),
            error: self.error,
            meta: self.meta,
            trace_id: self.trace_id,
            timestamp: self.timestamp,
        }
    }
}

// ============================================================================
// 分页请求
// ============================================================================

/// 分页请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedRequest {
    /// 页码（从 1 开始）
    pub page: u32,
    /// 每页大小
    pub page_size: u32,
    /// 排序字段
    pub sort_by: Option<String>,
    /// 排序方向
    pub sort_order: Option<SortOrder>,
    /// 搜索关键词
    pub keyword: Option<String>,
    /// 过滤条件
    pub filters: Option<HashMap<String, String>>,
}

impl Default for PaginatedRequest {
    fn default() -> Self {
        Self {
            page: 1,
            page_size: 20,
            sort_by: None,
            sort_order: None,
            keyword: None,
            filters: None,
        }
    }
}

impl PaginatedRequest {
    /// 创建新的分页请求
    pub fn new(page: u32, page_size: u32) -> Self {
        Self {
            page: page.max(1),
            page_size: page_size.clamp(1, 100),
            ..Default::default()
        }
    }

    /// 获取偏移量
    pub fn offset(&self) -> u64 {
        ((self.page - 1) as u64) * (self.page_size as u64)
    }

    /// 验证请求
    pub fn validate(&self) -> Result<(), StandardError> {
        if self.page == 0 {
            return Err(StandardError::with_message(
                ErrorCode::InvalidParameter,
                "页码必须大于 0",
            ));
        }
        if self.page_size == 0 || self.page_size > 100 {
            return Err(StandardError::with_message(
                ErrorCode::InvalidParameter,
                "每页大小必须在 1-100 之间",
            ));
        }
        Ok(())
    }
}

/// 排序方向
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SortOrder {
    /// 升序
    Asc,
    /// 降序
    Desc,
}

impl SortOrder {
    pub fn as_str(&self) -> &str {
        match self {
            SortOrder::Asc => "asc",
            SortOrder::Desc => "desc",
        }
    }
}

// ============================================================================
// API 版本
// ============================================================================

/// API 版本
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum ApiVersion {
    /// V1
    V1,
    /// V2
    V2,
    /// V3
    V3,
}

impl ApiVersion {
    pub fn as_str(&self) -> &str {
        match self {
            ApiVersion::V1 => "v1",
            ApiVersion::V2 => "v2",
            ApiVersion::V3 => "v3",
        }
    }

    pub fn current() -> Self {
        ApiVersion::V1
    }
}

// ============================================================================
// 标准化工具函数
// ============================================================================

/// 生成追踪 ID
pub fn generate_trace_id() -> String {
    format!("trace_{}", uuid::Uuid::new_v4())
}

/// 生成请求 ID
pub fn generate_request_id() -> String {
    format!("req_{}", uuid::Uuid::new_v4())
}

/// 标准化时间戳
pub fn standard_timestamp() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// 创建成功响应
pub fn ok<T>(data: T) -> StandardResponse<T> {
    StandardResponse::success(data)
}

/// 创建错误响应
pub fn err<T>(error_code: ErrorCode) -> StandardResponse<T> {
    StandardResponse::from_error_code(error_code)
}

/// 创建带消息的错误响应
pub fn err_with_message<T>(
    error_code: ErrorCode,
    message: impl Into<String>,
) -> StandardResponse<T> {
    StandardResponse::error(StandardError::with_message(error_code, message))
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_category_code_prefix() {
        assert_eq!(ErrorCategory::System.code_prefix(), 10000);
        assert_eq!(ErrorCategory::Validation.code_prefix(), 20000);
        assert_eq!(ErrorCategory::Auth.code_prefix(), 30000);
        assert_eq!(ErrorCategory::Resource.code_prefix(), 40000);
        assert_eq!(ErrorCategory::Business.code_prefix(), 50000);
        assert_eq!(ErrorCategory::External.code_prefix(), 60000);
        assert_eq!(ErrorCategory::Config.code_prefix(), 70000);
        assert_eq!(ErrorCategory::RateLimit.code_prefix(), 80000);
        assert_eq!(ErrorCategory::Unknown.code_prefix(), 90000);
    }

    #[test]
    fn test_error_code_values() {
        assert_eq!(ErrorCode::InternalError.code(), 10001);
        assert_eq!(ErrorCode::InvalidParameter.code(), 20001);
        assert_eq!(ErrorCode::Unauthenticated.code(), 30001);
        assert_eq!(ErrorCode::NotFound.code(), 40001);
        assert_eq!(ErrorCode::BusinessRuleViolation.code(), 50001);
        assert_eq!(ErrorCode::ExternalServiceFailed.code(), 60001);
        assert_eq!(ErrorCode::ConfigMissing.code(), 70001);
        assert_eq!(ErrorCode::RateLimitExceeded.code(), 80001);
        assert_eq!(ErrorCode::UnknownError.code(), 90001);
    }

    #[test]
    fn test_error_code_category() {
        assert_eq!(ErrorCode::InternalError.category(), ErrorCategory::System);
        assert_eq!(
            ErrorCode::InvalidParameter.category(),
            ErrorCategory::Validation
        );
        assert_eq!(ErrorCode::Unauthenticated.category(), ErrorCategory::Auth);
        assert_eq!(ErrorCode::NotFound.category(), ErrorCategory::Resource);
        assert_eq!(
            ErrorCode::BusinessRuleViolation.category(),
            ErrorCategory::Business
        );
        assert_eq!(
            ErrorCode::ExternalServiceFailed.category(),
            ErrorCategory::External
        );
        assert_eq!(ErrorCode::ConfigMissing.category(), ErrorCategory::Config);
        assert_eq!(
            ErrorCode::RateLimitExceeded.category(),
            ErrorCategory::RateLimit
        );
    }

    #[test]
    fn test_error_code_default_message() {
        assert!(!ErrorCode::InternalError.default_message().is_empty());
        assert!(!ErrorCode::NotFound.default_message().is_empty());
        assert!(!ErrorCode::UnknownError.default_message().is_empty());
    }

    #[test]
    fn test_error_code_http_status() {
        assert_eq!(ErrorCode::InternalError.http_status(), 500);
        assert_eq!(ErrorCode::InvalidParameter.http_status(), 400);
        assert_eq!(ErrorCode::Unauthenticated.http_status(), 401);
        assert_eq!(ErrorCode::NotFound.http_status(), 404);
        assert_eq!(ErrorCode::AlreadyExists.http_status(), 409);
        assert_eq!(ErrorCode::RateLimitExceeded.http_status(), 429);
    }

    #[test]
    fn test_error_code_is_retryable() {
        assert!(ErrorCode::ServiceUnavailable.is_retryable());
        assert!(ErrorCode::OperationTimeout.is_retryable());
        assert!(ErrorCode::ExternalServiceFailed.is_retryable());
        assert!(ErrorCode::LLMCallFailed.is_retryable());
        assert!(ErrorCode::RateLimitExceeded.is_retryable());

        assert!(!ErrorCode::InternalError.is_retryable());
        assert!(!ErrorCode::InvalidParameter.is_retryable());
        assert!(!ErrorCode::NotFound.is_retryable());
        assert!(!ErrorCode::PermissionDenied.is_retryable());
    }

    #[test]
    fn test_standard_error_new() {
        let error = StandardError::new(ErrorCode::NotFound);
        assert_eq!(error.code, 40001);
        assert_eq!(error.category, "resource");
        assert!(!error.message.is_empty());
        assert!(error.details.is_none());
        assert!(error.trace_id.is_none());
        assert!(!error.timestamp.is_empty());
        assert!(!error.retryable);
    }

    #[test]
    fn test_standard_error_with_message() {
        let error = StandardError::with_message(ErrorCode::NotFound, "用户不存在");
        assert_eq!(error.message, "用户不存在");
    }

    #[test]
    fn test_standard_error_with_details() {
        let mut details = HashMap::new();
        details.insert("field".to_string(), serde_json::json!("user_id"));

        let error = StandardError::new(ErrorCode::InvalidParameter).with_details(details);
        assert!(error.details.is_some());
    }

    #[test]
    fn test_standard_error_with_trace_id() {
        let error = StandardError::new(ErrorCode::InternalError).with_trace_id("trace_123");
        assert_eq!(error.trace_id.as_deref(), Some("trace_123"));
    }

    #[test]
    fn test_standard_error_display() {
        let error = StandardError::new(ErrorCode::NotFound);
        let display = format!("{}", error);
        assert!(display.contains("40001"));
        assert!(display.contains("resource"));
    }

    #[test]
    fn test_standard_response_success() {
        let response = StandardResponse::success("hello");
        assert!(response.success);
        assert_eq!(response.data, Some("hello"));
        assert!(response.error.is_none());
    }

    #[test]
    fn test_standard_response_error() {
        let error = StandardError::new(ErrorCode::NotFound);
        let response: StandardResponse<String> = StandardResponse::error(error);
        assert!(!response.success);
        assert!(response.data.is_none());
        assert!(response.error.is_some());
    }

    #[test]
    fn test_standard_response_from_error_code() {
        let response: StandardResponse<String> =
            StandardResponse::from_error_code(ErrorCode::InternalError);
        assert!(!response.success);
        assert!(response.error.is_some());
        assert_eq!(response.error.unwrap().code, 10001);
    }

    #[test]
    fn test_standard_response_with_trace_id() {
        let response = StandardResponse::success("data").with_trace_id("trace_456");
        assert_eq!(response.trace_id.as_deref(), Some("trace_456"));
    }

    #[test]
    fn test_standard_response_map() {
        let response = StandardResponse::success(42);
        let mapped = response.map(|x| x.to_string());
        assert_eq!(mapped.data, Some("42".to_string()));
    }

    #[test]
    fn test_paginated_request_default() {
        let request = PaginatedRequest::default();
        assert_eq!(request.page, 1);
        assert_eq!(request.page_size, 20);
    }

    #[test]
    fn test_paginated_request_new() {
        let request = PaginatedRequest::new(2, 50);
        assert_eq!(request.page, 2);
        assert_eq!(request.page_size, 50);
    }

    #[test]
    fn test_paginated_request_offset() {
        let request = PaginatedRequest::new(3, 20);
        assert_eq!(request.offset(), 40);
    }

    #[test]
    fn test_paginated_request_validate() {
        let valid = PaginatedRequest::new(1, 20);
        assert!(valid.validate().is_ok());

        // 直接构造无效请求（new 方法会自动修正无效值）
        let invalid_page = PaginatedRequest {
            page: 0,
            page_size: 20,
            ..Default::default()
        };
        assert!(invalid_page.validate().is_err());

        let invalid_size = PaginatedRequest {
            page: 1,
            page_size: 200,
            ..Default::default()
        };
        assert!(invalid_size.validate().is_err());
    }

    #[test]
    fn test_sort_order_as_str() {
        assert_eq!(SortOrder::Asc.as_str(), "asc");
        assert_eq!(SortOrder::Desc.as_str(), "desc");
    }

    #[test]
    fn test_api_version_as_str() {
        assert_eq!(ApiVersion::V1.as_str(), "v1");
        assert_eq!(ApiVersion::V2.as_str(), "v2");
        assert_eq!(ApiVersion::V3.as_str(), "v3");
    }

    #[test]
    fn test_api_version_current() {
        assert_eq!(ApiVersion::current(), ApiVersion::V1);
    }

    #[test]
    fn test_generate_trace_id() {
        let trace_id = generate_trace_id();
        assert!(trace_id.starts_with("trace_"));
    }

    #[test]
    fn test_generate_request_id() {
        let request_id = generate_request_id();
        assert!(request_id.starts_with("req_"));
    }

    #[test]
    fn test_standard_timestamp() {
        let timestamp = standard_timestamp();
        assert!(!timestamp.is_empty());
    }

    #[test]
    fn test_ok_helper() {
        let response = ok("test");
        assert!(response.success);
        assert_eq!(response.data, Some("test"));
    }

    #[test]
    fn test_err_helper() {
        let response: StandardResponse<String> = err(ErrorCode::NotFound);
        assert!(!response.success);
        assert!(response.error.is_some());
    }

    #[test]
    fn test_err_with_message_helper() {
        let response: StandardResponse<String> =
            err_with_message(ErrorCode::NotFound, "数据不存在");
        assert!(!response.success);
        assert_eq!(response.error.unwrap().message, "数据不存在");
    }

    #[test]
    fn test_response_meta() {
        let meta = ResponseMeta {
            total: Some(100),
            page: Some(1),
            page_size: Some(20),
            total_pages: Some(5),
            next_cursor: None,
            processing_time_ms: Some(150),
            api_version: Some("v1".to_string()),
        };

        assert_eq!(meta.total, Some(100));
        assert_eq!(meta.total_pages, Some(5));
    }
}

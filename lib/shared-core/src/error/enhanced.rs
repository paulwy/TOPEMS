// 错误处理规范化模块 - 消除 unsafe unwrap，统一错误类型
// =============================================================================

use std::result::Result as StdResult;
use thiserror::Error;

/// TOPEMS 统一错误类型
#[derive(Error, Debug)]
pub enum TopemsError {
    // ========== 数据库错误 ==========
    #[error("数据库连接失败: {0}")]
    DatabaseConnection(String),

    #[error("数据库查询失败: {0}")]
    DatabaseQuery(String),

    #[error("数据库事务失败: {0}")]
    DatabaseTransaction(String),

    #[error("数据库记录不存在: {0}")]
    DatabaseRecordNotFound(String),

    // ========== 认证错误 ==========
    #[error("认证失败: {0}")]
    AuthenticationFailed(String),

    #[error("Token 无效或已过期")]
    InvalidToken,

    #[error("权限不足: 需要 {required} 权限")]
    PermissionDenied { required: String },

    #[error("用户未登录")]
    Unauthorized,

    // ========== 配置错误 ==========
    #[error("配置加载失败: {0}")]
    ConfigLoad(String),

    #[error("配置验证失败: {0}")]
    ConfigValidation(String),

    #[error("环境变量未设置: {0}")]
    EnvVarNotSet(String),

    // ========== 业务逻辑错误 ==========
    #[error("数据验证失败: {0}")]
    ValidationFailed(String),

    #[error("业务逻辑错误: {0}")]
    BusinessLogic(String),

    #[error("资源不存在: {0}")]
    ResourceNotFound(String),

    #[error("资源已存在: {0}")]
    ResourceAlreadyExists(String),

    #[error("操作不允许: {0}")]
    OperationNotAllowed(String),

    // ========== 网络错误 ==========
    #[error("网络请求失败: {0}")]
    NetworkRequest(String),

    #[error("服务不可用: {0}")]
    ServiceUnavailable(String),

    #[error("请求超时")]
    RequestTimeout,

    // ========== 文件错误 ==========
    #[error("文件操作失败: {0}")]
    FileOperation(String),

    #[error("文件不存在: {0}")]
    FileNotFound(String),

    #[error("文件格式错误: {0}")]
    FileFormatError(String),

    // ========== 缓存错误 ==========
    #[error("缓存操作失败: {0}")]
    CacheOperation(String),

    // ========== 内部/通用错误 ==========
    #[error("内部错误: {0}")]
    Internal(String),

    #[error("未知错误: {0}")]
    Unknown(String),

    // ========== 兼容性别名变体 (为了兼容原有代码) ==========
    #[error("配置错误: {0}")]
    Config(String),

    #[error("数据库错误: {0}")]
    Database(String),

    #[error("认证错误: {0}")]
    Auth(String),

    #[error("验证错误: {0}")]
    Validation(String),

    #[error("未找到: {0}")]
    NotFound(String),

    #[error("未授权: {0}")]
    UnauthorizedStr(String),

    #[error("禁止访问: {0}")]
    ForbiddenStr(String),

    #[error("IO错误")]
    Io(std::io::Error),

    #[error("序列化错误: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("SQL错误")]
    Sql(sqlx::Error),

    #[error("HTTP请求错误: {0}")]
    HttpRequest(#[from] reqwest::Error),

    #[error("服务未找到: {0}")]
    ServiceNotFound(String),

    #[error("服务错误: {status_code} - {message}")]
    ServiceError { status_code: u16, message: String },

    #[error("无效的URL: {0}")]
    InvalidUrl(String),

    #[error("Redis错误: {0}")]
    RedisError(#[from] redis::RedisError),
}

/// 安全的结果类型
pub type Result<T> = StdResult<T, TopemsError>;

/// 安全的错误处理工具
pub struct SafeErrorHandler;

impl SafeErrorHandler {
    /// 安全地从 Option 获取值，避免 unwrap
    pub fn safe_unwrap_option<T>(option: Option<T>, error_msg: &str) -> Result<T> {
        option.ok_or_else(|| TopemsError::Internal(error_msg.to_string()))
    }

    /// 安全地从 Result 获取值，避免 unwrap
    pub fn safe_unwrap_result<T, E: std::fmt::Display>(
        result: StdResult<T, E>,
        error_msg: &str,
    ) -> Result<T> {
        result.map_err(|e| TopemsError::Internal(format!("{}: {}", error_msg, e)))
    }

    /// 安全地从环境变量获取值
    pub fn safe_get_env(key: &str) -> Result<String> {
        std::env::var(key).map_err(|_| TopemsError::EnvVarNotSet(key.to_string()))
    }

    /// 安全地解析字符串
    pub fn safe_parse<T: std::str::FromStr>(s: &str, error_msg: &str) -> Result<T> {
        s.parse::<T>()
            .map_err(|_| TopemsError::ValidationFailed(format!("{}: 无法解析 '{}'", error_msg, s)))
    }

    /// 安全地获取集合元素
    pub fn safe_get_element<'a, T>(
        collection: &'a [T],
        index: usize,
        error_msg: &'a str,
    ) -> Result<&'a T> {
        collection
            .get(index)
            .ok_or_else(|| TopemsError::Internal(format!("{}: 索引 {} 超出范围", error_msg, index)))
    }
}

/// 错误转换宏 - 简化错误处理
#[macro_export]
macro_rules! safe_result {
    // 处理 Option
    ($option:expr_2021, $msg:expr_2021) => {
        match $option {
            Some(v) => v,
            None => return Err($crate::error::TopemsError::Internal($msg.to_string())),
        }
    };
}

/// 安全 unwrap 宏
#[macro_export]
macro_rules! safe_unwrap {
    // 处理 Result
    ($result:expr_2021) => {
        $result.map_err(|e| $crate::error::TopemsError::Internal(e.to_string()))?
    };

    // 处理 Result with custom message
    ($result:expr_2021, $msg:expr_2021) => {
        $result.map_err(|e| $crate::error::TopemsError::Internal(format!("{}: {}", $msg, e)))?
    };
}

/// 数据库错误转换
impl From<sqlx::Error> for TopemsError {
    fn from(error: sqlx::Error) -> Self {
        match error {
            sqlx::Error::RowNotFound => {
                TopemsError::DatabaseRecordNotFound("记录不存在".to_string())
            }
            sqlx::Error::PoolTimedOut => TopemsError::DatabaseConnection("连接池超时".to_string()),
            sqlx::Error::PoolClosed => TopemsError::DatabaseConnection("连接池已关闭".to_string()),
            sqlx::Error::Io(e) => TopemsError::DatabaseConnection(format!("IO 错误: {}", e)),
            _ => TopemsError::DatabaseQuery(error.to_string()),
        }
    }
}

/// JWT 错误转换
impl From<jsonwebtoken::errors::Error> for TopemsError {
    fn from(error: jsonwebtoken::errors::Error) -> Self {
        match error.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => TopemsError::InvalidToken,
            jsonwebtoken::errors::ErrorKind::InvalidToken => TopemsError::InvalidToken,
            _ => TopemsError::AuthenticationFailed(error.to_string()),
        }
    }
}

/// 标准错误转换
impl From<std::io::Error> for TopemsError {
    fn from(error: std::io::Error) -> Self {
        match error.kind() {
            std::io::ErrorKind::NotFound => TopemsError::FileNotFound(error.to_string()),
            std::io::ErrorKind::PermissionDenied => TopemsError::PermissionDenied {
                required: "文件访问权限".to_string(),
            },
            _ => TopemsError::FileOperation(error.to_string()),
        }
    }
}

/// 错误上下文增强工具
pub trait ErrorContext<T> {
    /// 添加上下文信息
    fn with_context(self, context: &str) -> Result<T>;

    /// 添加详细的上下文信息
    fn with_detail_context(self, context: &str, detail: &str) -> Result<T>;
}

impl<T, E: std::fmt::Display> ErrorContext<T> for StdResult<T, E> {
    fn with_context(self, context: &str) -> Result<T> {
        self.map_err(|e| TopemsError::Internal(format!("{}: {}", context, e)))
    }

    fn with_detail_context(self, context: &str, detail: &str) -> Result<T> {
        self.map_err(|e| TopemsError::Internal(format!("{} - {}: {}", context, detail, e)))
    }
}

/// 错误恢复工具
pub struct ErrorRecovery;

impl ErrorRecovery {
    /// 尝试恢复，失败时返回默认值
    pub fn try_or_default<T, F>(f: F, default: T) -> T
    where
        F: FnOnce() -> Result<T>,
    {
        match f() {
            Ok(value) => value,
            Err(e) => {
                tracing::warn!("操作失败，使用默认值: {}", e);
                default
            }
        }
    }

    /// 尝试恢复，失败时记录错误并返回 None
    pub fn try_or_log<T, F>(f: F) -> Option<T>
    where
        F: FnOnce() -> Result<T>,
    {
        match f() {
            Ok(value) => Some(value),
            Err(e) => {
                tracing::error!("操作失败: {}", e);
                None
            }
        }
    }

    /// 尝试恢复，失败时返回错误响应
    pub fn try_or_response<T, F>(f: F) -> crate::response::ApiResponse<T>
    where
        F: FnOnce() -> Result<T>,
    {
        match f() {
            Ok(value) => crate::response::ApiResponse::success(value, "操作成功"),
            Err(e) => {
                let code = match &e {
                    TopemsError::Unauthorized => 401,
                    TopemsError::PermissionDenied { .. } => 403,
                    TopemsError::ResourceNotFound(_) => 404,
                    TopemsError::ValidationFailed(_) => 400,
                    _ => 500,
                };
                crate::response::ApiResponse::error(code, &e.to_string())
            }
        }
    }
}

/// 错误日志工具
pub struct ErrorLogger;

impl ErrorLogger {
    /// 记录错误（不中断流程）
    pub fn log_error(error: &TopemsError) {
        match error {
            TopemsError::DatabaseConnection(msg) => {
                tracing::error!("数据库连接错误: {}", msg);
            }
            TopemsError::AuthenticationFailed(msg) => {
                tracing::warn!("认证失败: {}", msg);
            }
            TopemsError::PermissionDenied { required } => {
                tracing::warn!("权限不足: 需要 {}", required);
            }
            TopemsError::ValidationFailed(msg) => {
                tracing::warn!("验证失败: {}", msg);
            }
            TopemsError::Internal(msg) => {
                tracing::error!("内部错误: {}", msg);
            }
            _ => {
                tracing::error!("错误: {}", error);
            }
        }
    }

    /// 记录错误并返回
    pub fn log_and_return<T>(error: TopemsError) -> Result<T> {
        Self::log_error(&error);
        Err(error)
    }
}

/// 错误统计工具
#[derive(Default)]
pub struct ErrorStatistics {
    error_counts: std::collections::HashMap<String, u64>,
}

impl ErrorStatistics {
    pub fn new() -> Self {
        Self::default()
    }

    /// 记录错误
    pub fn record_error(&mut self, error: &TopemsError) {
        let key = error.to_string();
        *self.error_counts.entry(key).or_insert(0) += 1;
    }

    /// 获取错误统计
    pub fn get_statistics(&self) -> Vec<(String, u64)> {
        self.error_counts
            .iter()
            .map(|(k, v)| (k.clone(), *v))
            .collect()
    }

    /// 清空统计
    pub fn clear(&mut self) {
        self.error_counts.clear();
    }
}

impl TopemsError {
    /// 收敛内部错误：`context`（业务上下文）与底层细节**只进服务端日志**，
    /// 客户端只会收到 [`TopemsError::classify`] 输出的通用文案「内部服务器错误」。
    ///
    /// 这是替代历史泄露写法的标准姿势：
    ///
    /// ```ignore
    /// // ❌ 迁移前：sqlx 原始错误（含表名/列名/SQL 片段）直接回给客户端
    /// Err(e) => Json(ApiResponse::error(500, &format!("查询设备失败: {}", e))),
    ///
    /// // ✅ 迁移后：上下文进日志，客户端只收到通用文案
    /// Err(e) => Json(ApiResponse::from(TopemsError::internal("查询设备失败", e))),
    /// ```
    ///
    /// 需要 `?` 风格的等价写法见 [`ErrorContext::with_context`]。
    pub fn internal<E: std::fmt::Display>(context: &str, error: E) -> Self {
        Self::Internal(format!("{}: {}", context, error))
    }

    /// 错误分类：`(HTTP 状态码, 面向客户端的消息, 机器可读错误码)`
    ///
    /// **单一映射源**：`IntoResponse`、`ApiResponse::from`、错误日志均复用本方法，
    /// 新增错误变体只需在这里补充一次。
    ///
    /// 安全约定（重要）：涉及内部实现的变体（数据库 / IO / 序列化 / Redis / 内部错误）
    /// 只在服务端 `tracing::error!` 记录细节，**返回给客户端的 message 不含内部细节**。
    /// 新增变体时必须遵守该约定，参见 `test_classify_does_not_leak_internal_details`。
    #[must_use]
    pub fn classify(&self) -> (axum::http::StatusCode, String, Option<String>) {
        use axum::http::StatusCode;

        match self {
            TopemsError::DatabaseConnection(msg) => {
                tracing::error!("数据库连接错误: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("DATABASE_CONNECTION_ERROR".to_string()),
                )
            }
            TopemsError::DatabaseQuery(msg) => {
                tracing::error!("数据库查询错误: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("DATABASE_QUERY_ERROR".to_string()),
                )
            }
            TopemsError::DatabaseTransaction(msg) => {
                tracing::error!("数据库事务错误: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("DATABASE_TRANSACTION_ERROR".to_string()),
                )
            }
            TopemsError::DatabaseRecordNotFound(msg) => (
                StatusCode::NOT_FOUND,
                msg.to_string(),
                Some("NOT_FOUND".to_string()),
            ),
            TopemsError::AuthenticationFailed(msg) => (
                StatusCode::UNAUTHORIZED,
                msg.to_string(),
                Some("AUTHENTICATION_FAILED".to_string()),
            ),
            TopemsError::InvalidToken => (
                StatusCode::UNAUTHORIZED,
                "Token 无效或已过期".to_string(),
                Some("INVALID_TOKEN".to_string()),
            ),
            TopemsError::PermissionDenied { required } => (
                StatusCode::FORBIDDEN,
                format!("权限不足: 需要 {}", required),
                Some("PERMISSION_DENIED".to_string()),
            ),
            TopemsError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "用户未登录".to_string(),
                Some("UNAUTHORIZED".to_string()),
            ),
            TopemsError::ConfigLoad(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("配置加载失败: {}", msg),
                Some("CONFIG_LOAD_ERROR".to_string()),
            ),
            TopemsError::ConfigValidation(msg) => (
                StatusCode::BAD_REQUEST,
                format!("配置验证失败: {}", msg),
                Some("CONFIG_VALIDATION_ERROR".to_string()),
            ),
            TopemsError::EnvVarNotSet(var) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("环境变量未设置: {}", var),
                Some("ENV_VAR_NOT_SET".to_string()),
            ),
            TopemsError::ValidationFailed(msg) => (
                StatusCode::BAD_REQUEST,
                msg.to_string(),
                Some("VALIDATION_FAILED".to_string()),
            ),
            TopemsError::BusinessLogic(msg) => (
                StatusCode::BAD_REQUEST,
                msg.to_string(),
                Some("BUSINESS_LOGIC_ERROR".to_string()),
            ),
            TopemsError::ResourceNotFound(msg) => (
                StatusCode::NOT_FOUND,
                msg.to_string(),
                Some("RESOURCE_NOT_FOUND".to_string()),
            ),
            TopemsError::ResourceAlreadyExists(msg) => (
                StatusCode::CONFLICT,
                msg.to_string(),
                Some("RESOURCE_ALREADY_EXISTS".to_string()),
            ),
            TopemsError::OperationNotAllowed(msg) => (
                StatusCode::FORBIDDEN,
                msg.to_string(),
                Some("OPERATION_NOT_ALLOWED".to_string()),
            ),
            TopemsError::NetworkRequest(msg) => {
                tracing::error!("网络请求失败: {}", msg);
                (
                    StatusCode::BAD_GATEWAY,
                    "网络请求失败".to_string(),
                    Some("NETWORK_REQUEST_ERROR".to_string()),
                )
            }
            TopemsError::ServiceUnavailable(msg) => (
                StatusCode::SERVICE_UNAVAILABLE,
                msg.to_string(),
                Some("SERVICE_UNAVAILABLE".to_string()),
            ),
            TopemsError::RequestTimeout => (
                StatusCode::REQUEST_TIMEOUT,
                "请求超时".to_string(),
                Some("REQUEST_TIMEOUT".to_string()),
            ),
            TopemsError::FileOperation(msg) => {
                tracing::error!("文件操作失败: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "文件操作失败".to_string(),
                    Some("FILE_OPERATION_ERROR".to_string()),
                )
            }
            TopemsError::FileNotFound(msg) => (
                StatusCode::NOT_FOUND,
                format!("文件不存在: {}", msg),
                Some("FILE_NOT_FOUND".to_string()),
            ),
            TopemsError::FileFormatError(msg) => (
                StatusCode::BAD_REQUEST,
                format!("文件格式错误: {}", msg),
                Some("FILE_FORMAT_ERROR".to_string()),
            ),
            TopemsError::CacheOperation(msg) => {
                tracing::error!("缓存操作失败: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "缓存操作失败".to_string(),
                    Some("CACHE_OPERATION_ERROR".to_string()),
                )
            }
            TopemsError::Internal(msg) => {
                tracing::error!("内部错误: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("INTERNAL_ERROR".to_string()),
                )
            }
            TopemsError::Unknown(msg) => {
                tracing::error!("未知错误: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "未知错误".to_string(),
                    Some("UNKNOWN_ERROR".to_string()),
                )
            }
            // 兼容性变体
            TopemsError::Config(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("配置错误: {}", msg),
                Some("CONFIG_ERROR".to_string()),
            ),
            TopemsError::Database(msg) => {
                tracing::error!("数据库错误: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("DATABASE_ERROR".to_string()),
                )
            }
            TopemsError::Auth(msg) => (
                StatusCode::UNAUTHORIZED,
                format!("认证错误: {}", msg),
                Some("AUTH_ERROR".to_string()),
            ),
            TopemsError::Validation(msg) => (
                StatusCode::BAD_REQUEST,
                format!("验证错误: {}", msg),
                Some("VALIDATION_ERROR".to_string()),
            ),
            TopemsError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                format!("未找到: {}", msg),
                Some("NOT_FOUND".to_string()),
            ),
            TopemsError::UnauthorizedStr(msg) => (
                StatusCode::UNAUTHORIZED,
                format!("未授权: {}", msg),
                Some("UNAUTHORIZED".to_string()),
            ),
            TopemsError::ForbiddenStr(msg) => (
                StatusCode::FORBIDDEN,
                format!("禁止访问: {}", msg),
                Some("FORBIDDEN".to_string()),
            ),
            TopemsError::Io(e) => {
                tracing::error!("IO错误: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "IO错误".to_string(),
                    Some("IO_ERROR".to_string()),
                )
            }
            TopemsError::Serialization(e) => {
                tracing::error!("序列化错误: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "序列化错误".to_string(),
                    Some("SERIALIZATION_ERROR".to_string()),
                )
            }
            TopemsError::Sql(e) => {
                tracing::error!("SQL错误: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "内部服务器错误".to_string(),
                    Some("SQL_ERROR".to_string()),
                )
            }
            TopemsError::HttpRequest(e) => {
                tracing::error!("HTTP请求错误: {}", e);
                (
                    StatusCode::BAD_GATEWAY,
                    "HTTP请求错误".to_string(),
                    Some("HTTP_REQUEST_ERROR".to_string()),
                )
            }
            TopemsError::ServiceNotFound(msg) => (
                StatusCode::NOT_FOUND,
                format!("服务未找到: {}", msg),
                Some("SERVICE_NOT_FOUND".to_string()),
            ),
            TopemsError::ServiceError {
                status_code,
                message,
            } => (
                StatusCode::from_u16(*status_code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
                format!("服务错误: {}", message),
                Some("SERVICE_ERROR".to_string()),
            ),
            TopemsError::InvalidUrl(msg) => (
                StatusCode::BAD_REQUEST,
                format!("无效的URL: {}", msg),
                Some("INVALID_URL".to_string()),
            ),
            TopemsError::RedisError(e) => {
                tracing::error!("Redis错误: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "缓存错误".to_string(),
                    Some("REDIS_ERROR".to_string()),
                )
            }
        }
    }
}

/// Axum `IntoResponse` implementation for `TopemsError`
///
/// V184 统一错误体：使用 `ErrorPayload` 替代历史私有 `ErrorResponse` 结构。
/// 解决 code 类型不一致（string vs number）、缺少 timestamp/data 等问题。
/// 映射逻辑统一复用 [`TopemsError::classify`]，不再在此重复。
impl axum::response::IntoResponse for TopemsError {
    fn into_response(self) -> axum::response::Response {
        let (status, message, error_code) = self.classify();

        let http_code = status.as_u16();
        let mut payload = crate::response::ErrorPayload::new(http_code, &message);
        if let Some(ec) = error_code {
            payload = payload.with_error_code(&ec);
        }
        (status, axum::Json(payload)).into_response()
    }
}

// =============================================================================
// V517 统一错误出口（落地脚手架）
// =============================================================================
// 目标契约（详见 docs/architecture/unified-error-handling-decision.md）：
//
//   service / 业务层 : Result<T, TopemsError>
//   handler   层     : ApiResult<T>            ← 新别名，`?` 一站式收敛
//   main / bootstrap : anyhow 允许（进程边界，直接 panic/退出）
//
// 两者都是**纯加法**，不改变任何既有行为，存量代码可逐个文件迁移。
// =============================================================================

/// handler 层推荐返回类型。
///
/// 成功 → `ApiResponse` 信封（既有前端契约不变）
/// 失败 → `TopemsError`，由 `IntoResponse` 输出 V184 `ErrorPayload`
///        （含 `errorCode` 机器可读码，且**不泄露内部错误细节**）
///
/// 命名说明：不叫 `ApiResult` —— `svc/portal/src/modules/adaptive_execution.rs`
/// 已有一个语义不同的 `ApiResult<T>` 结构体（成功信封），避免"一名两义"。
///
/// 用法：
/// ```ignore
/// pub async fn get_receivable(...) -> HandlerResult<Value> {
///     let data = service.get_receivable(id).await?;   // TopemsError 自动上抛
///     Ok(Json(ApiResponse::success(data, "查询成功")))
/// }
/// ```
pub type HandlerResult<T> = StdResult<axum::Json<crate::response::ApiResponse<T>>, TopemsError>;

/// `TopemsError` → `ApiResponse` 桥接。
///
/// 用于**不改函数签名**的最小改动路径：把
/// `ApiResponse::error(500, &format!("查询失败: {}", e))`（会泄露 SQL 细节）
/// 换成 `ApiResponse::from(TopemsError::from(e))`。
///
/// 注意：`ApiResponse` 没有 `errorCode` 字段，走本路径会丢失机器可读错误码。
/// 需要 `errorCode` 时请把 handler 返回类型改为 [`HandlerResult`]。
impl<T> From<TopemsError> for crate::response::ApiResponse<T> {
    fn from(error: TopemsError) -> Self {
        let (status, message, _error_code) = error.classify();
        crate::response::ApiResponse::error(status.as_u16(), &message)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_safe_unwrap_option() {
        let some_value: Option<i32> = Some(42);
        let result = SafeErrorHandler::safe_unwrap_option(some_value, "值不存在");
        assert_eq!(result.unwrap(), 42);

        let none_value: Option<i32> = None;
        let result = SafeErrorHandler::safe_unwrap_option(none_value, "值不存在");
        assert!(result.is_err());
    }

    #[test]
    fn test_safe_parse() {
        let result = SafeErrorHandler::safe_parse::<i32>("42", "解析数字");
        assert_eq!(result.unwrap(), 42);

        let result = SafeErrorHandler::safe_parse::<i32>("abc", "解析数字");
        assert!(result.is_err());
    }

    #[test]
    fn test_error_context() {
        let result: StdResult<i32, &str> = Err("error");
        let enhanced = result.with_context("操作失败");
        assert!(enhanced.is_err());
        assert!(enhanced.unwrap_err().to_string().contains("操作失败"));
    }

    #[test]
    fn test_error_recovery() {
        let result = ErrorRecovery::try_or_default(|| Ok(42), 0);
        assert_eq!(result, 42);

        let result =
            ErrorRecovery::try_or_default(|| Err(TopemsError::Internal("test".to_string())), 0);
        assert_eq!(result, 0);
    }

    #[test]
    fn test_error_conversion() {
        let db_error = sqlx::Error::RowNotFound;
        let topems_error: TopemsError = db_error.into();
        assert!(matches!(
            topems_error,
            TopemsError::DatabaseRecordNotFound(_)
        ));
    }

    // ===== 新增：更多 SafeErrorHandler 测试 =====
    #[test]
    fn test_safe_unwrap_result_ok_and_err() {
        let ok: StdResult<i32, &str> = Ok(100);
        let r = SafeErrorHandler::safe_unwrap_result(ok, "失败");
        assert_eq!(r.unwrap(), 100);

        let err: StdResult<i32, &str> = Err("boom");
        let r = SafeErrorHandler::safe_unwrap_result(err, "前缀");
        assert!(r.is_err());
        assert!(r.unwrap_err().to_string().contains("前缀"));
    }

    #[test]
    fn test_safe_get_element_in_range_and_out() {
        let arr = [10, 20, 30];
        let r = SafeErrorHandler::safe_get_element(&arr, 1, "数组");
        assert_eq!(*r.unwrap(), 20);
        let r = SafeErrorHandler::safe_get_element(&arr, 5, "数组");
        assert!(r.is_err());
    }

    #[test]
    fn test_safe_get_env_missing() {
        // 用一个极不可能存在的 key
        let r = SafeErrorHandler::safe_get_env("__TOPEMS_NOT_EXIST_ENV_VAR_XYZ_12345__");
        assert!(r.is_err());
    }

    // ===== ErrorRecovery 更多测试 =====
    #[test]
    fn test_error_recovery_try_or_log_some_none() {
        let r = ErrorRecovery::try_or_log(|| Ok("hello"));
        assert_eq!(r, Some("hello"));
        let r: Option<()> =
            ErrorRecovery::try_or_log(|| Err(TopemsError::Internal("x".to_string())));
        assert!(r.is_none());
    }

    #[test]
    fn test_error_recovery_try_or_response_ok() {
        let r: crate::response::ApiResponse<i32> = ErrorRecovery::try_or_response(|| Ok(7));
        assert!(r.success);
        assert_eq!(r.data, Some(7));
    }

    #[test]
    fn test_error_recovery_try_or_response_maps_error_codes() {
        let r: crate::response::ApiResponse<()> =
            ErrorRecovery::try_or_response(|| Err(TopemsError::Unauthorized));
        assert_eq!(r.code, 401);

        let r: crate::response::ApiResponse<()> = ErrorRecovery::try_or_response(|| {
            Err(TopemsError::PermissionDenied {
                required: "admin".to_string(),
            })
        });
        assert_eq!(r.code, 403);

        let r: crate::response::ApiResponse<()> =
            ErrorRecovery::try_or_response(|| Err(TopemsError::ResourceNotFound("x".to_string())));
        assert_eq!(r.code, 404);

        let r: crate::response::ApiResponse<()> =
            ErrorRecovery::try_or_response(|| Err(TopemsError::ValidationFailed("x".to_string())));
        assert_eq!(r.code, 400);

        let r: crate::response::ApiResponse<()> =
            ErrorRecovery::try_or_response(|| Err(TopemsError::Internal("x".to_string())));
        assert_eq!(r.code, 500);
    }

    // ===== ErrorStatistics 测试 =====
    #[test]
    fn test_error_statistics_new_is_empty() {
        let stats = ErrorStatistics::new();
        assert!(stats.get_statistics().is_empty());
    }

    #[test]
    fn test_error_statistics_record_and_count() {
        let mut stats = ErrorStatistics::new();
        let e1 = TopemsError::Internal("a".to_string());
        let e2 = TopemsError::Internal("b".to_string());
        stats.record_error(&e1);
        stats.record_error(&e1);
        stats.record_error(&e2);
        let vec = stats.get_statistics();
        assert_eq!(vec.len(), 2);
        // a 出现 2 次，b 出现 1 次
        let total: u64 = vec.iter().map(|(_, c)| *c).sum();
        assert_eq!(total, 3);
    }

    #[test]
    fn test_error_statistics_clear() {
        let mut stats = ErrorStatistics::new();
        stats.record_error(&TopemsError::Internal("x".to_string()));
        assert!(!stats.get_statistics().is_empty());
        stats.clear();
        assert!(stats.get_statistics().is_empty());
    }

    // ===== ErrorContext detail 测试 =====
    #[test]
    fn test_error_with_detail_context() {
        let r: StdResult<i32, &str> = Err("orig");
        let r = r.with_detail_context("CTX", "detail");
        let msg = r.unwrap_err().to_string();
        assert!(msg.contains("CTX"));
        assert!(msg.contains("detail"));
        assert!(msg.contains("orig"));
    }

    // ===== IO 错误转换测试 =====
    #[test]
    fn test_io_error_not_found_mapping() {
        let io = std::io::Error::new(std::io::ErrorKind::NotFound, "missing");
        let te: TopemsError = io.into();
        assert!(matches!(te, TopemsError::FileNotFound(_)));
    }

    #[test]
    fn test_io_error_permission_denied_mapping() {
        let io = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "denied");
        let te: TopemsError = io.into();
        assert!(matches!(te, TopemsError::PermissionDenied { required: _ }));
    }

    // ===== 第五批补充测试 =====
    use axum::response::IntoResponse;

    // ---------- Display 各变体 ----------
    #[test]
    fn display_database_connection_contains_message() {
        let e = TopemsError::DatabaseConnection("conn failed".to_string());
        assert_eq!(e.to_string(), "数据库连接失败: conn failed");
    }

    #[test]
    fn display_database_query_contains_message() {
        let e = TopemsError::DatabaseQuery("select error".to_string());
        assert_eq!(e.to_string(), "数据库查询失败: select error");
    }

    #[test]
    fn display_authentication_failed_contains_message() {
        let e = TopemsError::AuthenticationFailed("bad token".to_string());
        assert_eq!(e.to_string(), "认证失败: bad token");
    }

    #[test]
    fn display_permission_denied_contains_required() {
        let e = TopemsError::PermissionDenied {
            required: "admin".to_string(),
        };
        assert_eq!(e.to_string(), "权限不足: 需要 admin 权限");
    }

    #[test]
    fn display_invalid_token_is_static_message() {
        let e = TopemsError::InvalidToken;
        assert_eq!(e.to_string(), "Token 无效或已过期");
    }

    #[test]
    fn display_unauthorized_is_static_message() {
        let e = TopemsError::Unauthorized;
        assert_eq!(e.to_string(), "用户未登录");
    }

    #[test]
    fn display_config_load_contains_message() {
        let e = TopemsError::ConfigLoad("file missing".to_string());
        assert_eq!(e.to_string(), "配置加载失败: file missing");
    }

    #[test]
    fn display_validation_failed_contains_message() {
        let e = TopemsError::ValidationFailed("field required".to_string());
        assert_eq!(e.to_string(), "数据验证失败: field required");
    }

    #[test]
    fn display_resource_not_found_contains_message() {
        let e = TopemsError::ResourceNotFound("user 42".to_string());
        assert_eq!(e.to_string(), "资源不存在: user 42");
    }

    #[test]
    fn display_resource_already_exists_contains_message() {
        let e = TopemsError::ResourceAlreadyExists("email".to_string());
        assert_eq!(e.to_string(), "资源已存在: email");
    }

    #[test]
    fn display_request_timeout_is_static_message() {
        let e = TopemsError::RequestTimeout;
        assert_eq!(e.to_string(), "请求超时");
    }

    #[test]
    fn display_service_error_contains_status_and_message() {
        let e = TopemsError::ServiceError {
            status_code: 502,
            message: "bad gateway".to_string(),
        };
        assert_eq!(e.to_string(), "服务错误: 502 - bad gateway");
    }

    #[test]
    fn display_invalid_url_contains_message() {
        let e = TopemsError::InvalidUrl("not a url".to_string());
        assert_eq!(e.to_string(), "无效的URL: not a url");
    }

    #[test]
    fn display_business_logic_contains_message() {
        let e = TopemsError::BusinessLogic("cannot delete".to_string());
        assert_eq!(e.to_string(), "业务逻辑错误: cannot delete");
    }

    #[test]
    fn display_file_not_found_contains_message() {
        let e = TopemsError::FileNotFound("/tmp/x".to_string());
        assert_eq!(e.to_string(), "文件不存在: /tmp/x");
    }

    // ---------- IntoResponse HTTP 状态码映射 ----------
    #[test]
    fn into_response_database_connection_returns_500() {
        let e = TopemsError::DatabaseConnection("x".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 500);
    }

    #[test]
    fn into_response_database_record_not_found_returns_404() {
        let e = TopemsError::DatabaseRecordNotFound("rec".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 404);
    }

    #[test]
    fn into_response_authentication_failed_returns_401() {
        let e = TopemsError::AuthenticationFailed("x".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 401);
    }

    #[test]
    fn into_response_invalid_token_returns_401() {
        let resp = TopemsError::InvalidToken.into_response();
        assert_eq!(resp.status().as_u16(), 401);
    }

    #[test]
    fn into_response_unauthorized_returns_401() {
        let resp = TopemsError::Unauthorized.into_response();
        assert_eq!(resp.status().as_u16(), 401);
    }

    #[test]
    fn into_response_permission_denied_returns_403() {
        let e = TopemsError::PermissionDenied {
            required: "admin".to_string(),
        };
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 403);
    }

    #[test]
    fn into_response_config_validation_returns_400() {
        let e = TopemsError::ConfigValidation("bad".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 400);
    }

    #[test]
    fn into_response_validation_failed_returns_400() {
        let e = TopemsError::ValidationFailed("bad".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 400);
    }

    #[test]
    fn into_response_resource_not_found_returns_404() {
        let e = TopemsError::ResourceNotFound("x".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 404);
    }

    #[test]
    fn into_response_resource_already_exists_returns_409() {
        let e = TopemsError::ResourceAlreadyExists("x".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 409);
    }

    #[test]
    fn into_response_operation_not_allowed_returns_403() {
        let e = TopemsError::OperationNotAllowed("x".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 403);
    }

    #[test]
    fn into_response_request_timeout_returns_408() {
        let resp = TopemsError::RequestTimeout.into_response();
        assert_eq!(resp.status().as_u16(), 408);
    }

    #[test]
    fn into_response_service_unavailable_returns_503() {
        let e = TopemsError::ServiceUnavailable("x".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 503);
    }

    #[test]
    fn into_response_service_error_custom_status() {
        let e = TopemsError::ServiceError {
            status_code: 422,
            message: "unprocessable".to_string(),
        };
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 422);
    }

    #[test]
    fn into_response_service_error_invalid_status_falls_back_to_500() {
        let e = TopemsError::ServiceError {
            status_code: 99,
            message: "invalid".to_string(),
        };
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 500);
    }

    #[test]
    fn into_response_file_not_found_returns_404() {
        let e = TopemsError::FileNotFound("/tmp/missing".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 404);
    }

    #[test]
    fn into_response_invalid_url_returns_400() {
        let e = TopemsError::InvalidUrl("bad".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 400);
    }

    #[test]
    fn into_response_env_var_not_set_returns_500() {
        let e = TopemsError::EnvVarNotSet("MY_VAR".to_string());
        let resp = e.into_response();
        assert_eq!(resp.status().as_u16(), 500);
    }

    // ---------- From<sqlx::Error> 转换 ----------
    #[test]
    fn from_sqlx_pool_timed_out_maps_to_database_connection() {
        let sqlx_err = sqlx::Error::PoolTimedOut;
        let te: TopemsError = sqlx_err.into();
        assert!(matches!(te, TopemsError::DatabaseConnection(_)));
    }

    #[test]
    fn from_sqlx_pool_closed_maps_to_database_connection() {
        let sqlx_err = sqlx::Error::PoolClosed;
        let te: TopemsError = sqlx_err.into();
        assert!(matches!(te, TopemsError::DatabaseConnection(_)));
    }

    #[test]
    fn from_sqlx_io_error_maps_to_database_connection() {
        let io = std::io::Error::new(std::io::ErrorKind::ConnectionRefused, "refused");
        let sqlx_err = sqlx::Error::Io(io);
        let te: TopemsError = sqlx_err.into();
        assert!(matches!(te, TopemsError::DatabaseConnection(_)));
    }

    // ---------- From<std::io::Error> 其他类型 ----------
    #[test]
    fn from_io_other_error_kind_maps_to_file_operation() {
        let io = std::io::Error::new(std::io::ErrorKind::ConnectionRefused, "refused");
        let te: TopemsError = io.into();
        assert!(matches!(te, TopemsError::FileOperation(_)));
    }

    #[test]
    fn from_io_already_exists_maps_to_file_operation() {
        let io = std::io::Error::new(std::io::ErrorKind::AlreadyExists, "exists");
        let te: TopemsError = io.into();
        assert!(matches!(te, TopemsError::FileOperation(_)));
    }

    // ---------- From<serde_json::Error> 转换 ----------
    #[test]
    fn from_serde_json_error_maps_to_serialization() {
        let json_err = serde_json::from_str::<String>("not valid json").unwrap_err();
        let te: TopemsError = json_err.into();
        assert!(matches!(te, TopemsError::Serialization(_)));
    }

    // ---------- ErrorContext Ok 透传 ----------
    #[test]
    fn error_context_ok_result_passes_through() {
        let result: StdResult<i32, &str> = Ok(42);
        let enhanced = result.with_context("should not fire");
        assert_eq!(enhanced.unwrap(), 42);
    }

    #[test]
    fn error_context_detail_ok_result_passes_through() {
        let result: StdResult<i32, &str> = Ok(99);
        let enhanced = result.with_detail_context("CTX", "detail");
        assert_eq!(enhanced.unwrap(), 99);
    }

    // ---------- ErrorLogger log_and_return ----------
    #[test]
    fn error_logger_log_and_return_returns_err() {
        let err = TopemsError::Internal("log test".to_string());
        let result: Result<()> = ErrorLogger::log_and_return(err);
        assert!(result.is_err());
    }

    #[test]
    fn error_logger_log_error_does_not_panic() {
        // 验证 log_error 对各种变体不 panic
        ErrorLogger::log_error(&TopemsError::DatabaseConnection("x".to_string()));
        ErrorLogger::log_error(&TopemsError::AuthenticationFailed("x".to_string()));
        ErrorLogger::log_error(&TopemsError::PermissionDenied {
            required: "x".to_string(),
        });
        ErrorLogger::log_error(&TopemsError::ValidationFailed("x".to_string()));
        ErrorLogger::log_error(&TopemsError::Internal("x".to_string()));
        ErrorLogger::log_error(&TopemsError::Unknown("x".to_string()));
    }

    // ---------- SafeErrorHandler 补充 ----------
    #[test]
    fn safe_parse_u64_success_and_failure() {
        let ok = SafeErrorHandler::safe_parse::<u64>("18446744073709551615", "u64");
        assert_eq!(ok.unwrap(), u64::MAX);

        let err = SafeErrorHandler::safe_parse::<u64>("not a number", "u64");
        assert!(err.is_err());
    }

    #[test]
    fn safe_unwrap_option_with_value_returns_value() {
        let val: Option<String> = Some("hello".to_string());
        let r = SafeErrorHandler::safe_unwrap_option(val, "missing");
        assert_eq!(r.unwrap(), "hello");
    }

    // ---------- classify() 单一映射源（V517 统一错误出口）----------
    #[test]
    fn test_classify_status_and_error_code() {
        use axum::http::StatusCode;

        let cases: Vec<(TopemsError, StatusCode, &str)> = vec![
            (
                TopemsError::DatabaseRecordNotFound("x".to_string()),
                StatusCode::NOT_FOUND,
                "NOT_FOUND",
            ),
            (
                TopemsError::AuthenticationFailed("x".to_string()),
                StatusCode::UNAUTHORIZED,
                "AUTHENTICATION_FAILED",
            ),
            (
                TopemsError::PermissionDenied {
                    required: "perm".to_string(),
                },
                StatusCode::FORBIDDEN,
                "PERMISSION_DENIED",
            ),
            (
                TopemsError::ValidationFailed("x".to_string()),
                StatusCode::BAD_REQUEST,
                "VALIDATION_FAILED",
            ),
            (
                TopemsError::ResourceAlreadyExists("x".to_string()),
                StatusCode::CONFLICT,
                "RESOURCE_ALREADY_EXISTS",
            ),
            (
                TopemsError::DatabaseQuery("x".to_string()),
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_QUERY_ERROR",
            ),
        ];

        for (err, want_status, want_code) in cases {
            let (status, _msg, code) = err.classify();
            assert_eq!(status, want_status, "状态码不符: {:?}", err);
            assert_eq!(code.as_deref(), Some(want_code), "错误码不符: {:?}", err);
        }
    }

    /// 关键安全约束：内部类错误的客户端消息**不得**回显内部细节。
    ///
    /// 背景：svc 层历史上有 700 处 `ApiResponse::error(500, &format!("... {}", e))`
    /// 直接把 sqlx/IO 原始错误回给客户端（含表名、列名、SQL 片段）。
    /// 迁移到 TopemsError 后必须保持"细节只进日志"的行为，此测试为回归防线。
    /// 每个变体的**源错误本身都携带 SECRET**，因此能真实检验是否被回显。
    #[test]
    fn test_classify_does_not_leak_internal_details() {
        const SECRET: &str = "relation \"iam.users\" does not exist";

        let internal_variants = vec![
            // 字符串载体变体
            TopemsError::DatabaseQuery(SECRET.to_string()),
            TopemsError::DatabaseConnection(SECRET.to_string()),
            TopemsError::DatabaseTransaction(SECRET.to_string()),
            TopemsError::Internal(SECRET.to_string()),
            TopemsError::Unknown(SECRET.to_string()),
            TopemsError::Database(SECRET.to_string()),
            TopemsError::CacheOperation(SECRET.to_string()),
            // 类型化载体变体（Display 中同样含 SECRET）
            TopemsError::Sql(sqlx::Error::ColumnNotFound(SECRET.to_string())),
            TopemsError::Io(std::io::Error::other(SECRET)),
            TopemsError::RedisError(redis::RedisError::from((
                redis::ErrorKind::TypeError,
                SECRET,
            ))),
            TopemsError::Serialization(
                serde_json::from_str::<i32>(&format!("\"{}\"", SECRET)).unwrap_err(),
            ),
        ];

        for err in internal_variants {
            let (status, msg, code) = err.classify();
            assert!(
                !msg.contains("iam.users"),
                "内部细节泄露到客户端消息: {:?} → {}",
                err,
                msg
            );
            assert!(
                !msg.contains(SECRET),
                "内部细节泄露到客户端消息: {:?} → {}",
                err,
                msg
            );
            assert_eq!(
                status,
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "内部错误应映射为 500: {:?}",
                err
            );
            assert!(code.is_some(), "内部错误应带机器可读错误码: {:?}", err);
        }
    }

    // ---------- TopemsError::internal 构造器 ----------
    /// 迁移主力工具：业务上下文与底层细节**进日志**，客户端只收到通用文案。
    #[test]
    fn internal_keeps_context_in_display_but_not_in_client_message() {
        const SECRET: &str = "relation \"gis.device\" does not exist";
        let err = TopemsError::internal("查询设备失败", SECRET);

        // Display（tracing 日志用）保留业务上下文 + 底层细节，可诊断性不降级
        let shown = err.to_string();
        assert!(
            shown.contains("查询设备失败"),
            "日志应保留业务上下文: {}",
            shown
        );
        assert!(shown.contains(SECRET), "日志应保留底层细节: {}", shown);

        // 面向客户端的消息不得包含任何内部细节
        let (status, msg, code) = err.classify();
        assert_eq!(status, axum::http::StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(msg, "内部服务器错误");
        assert!(!msg.contains(SECRET) && !msg.contains("gis.device"));
        assert_eq!(code.as_deref(), Some("INTERNAL_ERROR"));
    }

    #[test]
    fn internal_accepts_any_display_error() {
        // 类型化错误（sqlx::Error）同样可用；无需为每种错误源写 From 实现
        let err = TopemsError::internal(
            "查询失败",
            sqlx::Error::ColumnNotFound("device_code".to_string()),
        );
        assert!(matches!(err, TopemsError::Internal(_)));
        assert!(err.to_string().contains("device_code"));
    }

    // ---------- HandlerResult / ApiResponse 桥接 ----------
    #[test]
    fn test_api_response_from_topems_error_maps_status() {
        use crate::response::ApiResponse;

        let resp: ApiResponse<serde_json::Value> = ApiResponse::from(
            TopemsError::DatabaseRecordNotFound("单号不存在".to_string()),
        );
        assert!(!resp.success);
        assert_eq!(resp.code, 404);
        assert_eq!(resp.message, "单号不存在");
        assert!(resp.data.is_none());

        let resp: ApiResponse<serde_json::Value> = ApiResponse::from(TopemsError::DatabaseQuery(
            "SELECT * FROM users".to_string(),
        ));
        assert!(!resp.success);
        assert_eq!(resp.code, 500);
        assert!(
            !resp.message.contains("SELECT"),
            "桥接路径同样不得泄露内部细节: {}",
            resp.message
        );
    }

    #[test]
    fn test_handler_result_is_usable_as_handler_return() {
        // 编译期契约：HandlerResult<T> 必须能承载 Json<ApiResponse<T>> 与 TopemsError
        fn handler_ok() -> HandlerResult<serde_json::Value> {
            Ok(axum::Json(crate::response::ApiResponse::success(
                serde_json::json!({"ok": true}),
                "成功",
            )))
        }
        fn handler_err() -> HandlerResult<serde_json::Value> {
            Err(TopemsError::NotFound("不存在".to_string()))
        }

        assert!(handler_ok().is_ok());
        assert!(handler_err().is_err());
    }
}

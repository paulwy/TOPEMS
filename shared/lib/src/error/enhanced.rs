// 错误处理规范化模块 - 消除 unsafe unwrap，统一错误类型
// =============================================================================

use thiserror::Error;
use anyhow::Context;
use std::result::Result as StdResult;

/// TOPEMS 统一错误类型
#[derive(Error, Debug)]
pub enum TopemsError {
    // 数据库错误
    #[error("数据库连接失败: {0}")]
    DatabaseConnection(String),
    
    #[error("数据库查询失败: {0}")]
    DatabaseQuery(String),
    
    #[error("数据库事务失败: {0}")]
    DatabaseTransaction(String),
    
    #[error("数据库记录不存在: {0}")]
    DatabaseRecordNotFound(String),
    
    // 认证错误
    #[error("认证失败: {0}")]
    AuthenticationFailed(String),
    
    #[error("Token 无效或已过期")]
    InvalidToken,
    
    #[error("权限不足: 需要 {required} 权限")]
    PermissionDenied { required: String },
    
    #[error("用户未登录")]
    Unauthorized,
    
    // 配置错误
    #[error("配置加载失败: {0}")]
    ConfigLoad(String),
    
    #[error("配置验证失败: {0}")]
    ConfigValidation(String),
    
    #[error("环境变量未设置: {0}")]
    EnvVarNotSet(String),
    
    // 业务逻辑错误
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
    
    // 网络错误
    #[error("网络请求失败: {0}")]
    NetworkRequest(String),
    
    #[error("服务不可用: {0}")]
    ServiceUnavailable(String),
    
    #[error("请求超时")]
    RequestTimeout,
    
    // 文件错误
    #[error("文件操作失败: {0}")]
    FileOperation(String),
    
    #[error("文件不存在: {0}")]
    FileNotFound(String),
    
    #[error("文件格式错误: {0}")]
    FileFormatError(String),
    
    // 缓存错误
    #[error("缓存操作失败: {0}")]
    CacheOperation(String),
    
    // 内部错误
    #[error("内部错误: {0}")]
    Internal(String),
    
    #[error("未知错误: {0}")]
    Unknown(String),
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
        s.parse::<T>().map_err(|_| {
            TopemsError::ValidationFailed(format!("{}: 无法解析 '{}'", error_msg, s))
        })
    }
    
    /// 安全地获取集合元素
    pub fn safe_get_element<T>(collection: &[T], index: usize, error_msg: &str) -> Result<&T> {
        collection.get(index).ok_or_else(|| {
            TopemsError::Internal(format!("{}: 索引 {} 超出范围", error_msg, index))
        })
    }
}

/// 错误转换宏 - 简化错误处理
#[macro_export]
macro_rules! safe_result {
    // 处理 Option
    ($option:expr, $msg:expr) => {
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
    ($result:expr) => {
        $result.map_err(|e| $crate::error::TopemsError::Internal(e.to_string()))?
    };
    
    // 处理 Result with custom message
    ($result:expr, $msg:expr) => {
        $result.map_err(|e| {
            $crate::error::TopemsError::Internal(format!("{}: {}", $msg, e))
        })?
    };
}

/// 数据库错误转换
impl From<sqlx::Error> for TopemsError {
    fn from(error: sqlx::Error) -> Self {
        match error {
            sqlx::Error::RowNotFound => TopemsError::DatabaseRecordNotFound("记录不存在".to_string()),
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
        self.map_err(|e| {
            TopemsError::Internal(format!("{} - {}: {}", context, detail, e))
        })
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
pub struct ErrorStatistics {
    error_counts: std::collections::HashMap<String, u64>,
}

impl ErrorStatistics {
    pub fn new() -> Self {
        Self {
            error_counts: std::collections::HashMap::new(),
        }
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
        
        let result = ErrorRecovery::try_or_default(|| Err(TopemsError::Internal("test".to_string())), 0);
        assert_eq!(result, 0);
    }
    
    #[test]
    fn test_error_conversion() {
        let db_error = sqlx::Error::RowNotFound;
        let topems_error: TopemsError = db_error.into();
        assert!(matches!(topems_error, TopemsError::DatabaseRecordNotFound(_)));
    }
}
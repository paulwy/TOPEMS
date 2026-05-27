use thiserror::Error;
use axum::http::StatusCode;

#[derive(Error, Debug)]
pub enum IamError {
    #[error("数据库错误: {0}")]
    DatabaseError(String),
    
    #[error("认证失败: {0}")]
    AuthError(String),
    
    #[error("未授权")]
    Unauthorized,
    
    #[error("令牌已过期")]
    TokenExpired,
    
    #[error("用户不存在")]
    UserNotFound,
    
    #[error("角色不存在")]
    RoleNotFound,
    
    #[error("权限不存在")]
    PermissionNotFound,
    
    #[error("资源未找到")]
    NotFound,
    
    #[error("无效的请求: {0}")]
    InvalidRequest(String),
    
    #[error("内部服务器错误")]
    InternalError,
    
    #[error("密码加密失败")]
    PasswordHashError,
    
    #[error("JWT 令牌生成失败")]
    JwtGenerationError,
    
    #[error("用户已被禁用")]
    UserDisabled,
    
    #[error("用户名或密码错误")]
    InvalidCredentials,
}

impl IamError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            IamError::Unauthorized | IamError::TokenExpired | IamError::InvalidCredentials => {
                StatusCode::UNAUTHORIZED
            }
            IamError::UserNotFound | IamError::RoleNotFound | IamError::PermissionNotFound | IamError::NotFound => {
                StatusCode::NOT_FOUND
            }
            IamError::InvalidRequest(_) => StatusCode::BAD_REQUEST,
            IamError::UserDisabled => StatusCode::FORBIDDEN,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl From<sqlx::Error> for IamError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => IamError::NotFound,
            _ => IamError::DatabaseError(err.to_string()),
        }
    }
}

impl From<bcrypt::BcryptError> for IamError {
    fn from(_: bcrypt::BcryptError) -> Self {
        IamError::PasswordHashError
    }
}

impl From<jsonwebtoken::errors::Error> for IamError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        if err.kind() == &jsonwebtoken::errors::ErrorKind::ExpiredSignature {
            IamError::TokenExpired
        } else {
            IamError::AuthError(err.to_string())
        }
    }
}
//! Migration SDK 错误类型

use thiserror::Error;

#[derive(Error, Debug)]
pub enum MigrationError {
    #[error("数据库错误: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Redis错误: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("迁移脚本执行失败: {0}")]
    ScriptFailed(String),

    #[error("迁移未找到: {0}")]
    NotFound(String),

    #[error("迁移冲突: 正在执行中的迁移 {0}")]
    Conflict(String),

    #[error("分布式锁获取失败: {0}")]
    LockFailed(String),

    #[error("回滚失败: {0}")]
    RollbackFailed(String),

    #[error("迁移版本错误: {0}")]
    VersionError(String),

    #[error("迁移已锁定: {plugin} - {reason}")]
    Locked { plugin: String, reason: String },

    #[error("IO错误: {0}")]
    Io(#[from] std::io::Error),

    #[error("序列化错误: {0}")]
    Serialization(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, MigrationError>;

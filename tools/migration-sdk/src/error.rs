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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_display_script_failed() {
        let e = MigrationError::ScriptFailed("table missing".into());
        assert_eq!(e.to_string(), "迁移脚本执行失败: table missing");
    }

    #[test]
    fn error_display_not_found() {
        let e = MigrationError::NotFound("v1.2.3".into());
        assert_eq!(e.to_string(), "迁移未找到: v1.2.3");
    }

    #[test]
    fn error_display_conflict() {
        let e = MigrationError::Conflict("migration_001".into());
        assert_eq!(e.to_string(), "迁移冲突: 正在执行中的迁移 migration_001");
    }

    #[test]
    fn error_display_lock_failed() {
        let e = MigrationError::LockFailed("timeout".into());
        assert_eq!(e.to_string(), "分布式锁获取失败: timeout");
    }

    #[test]
    fn error_display_rollback_failed() {
        let e = MigrationError::RollbackFailed("not reversible".into());
        assert_eq!(e.to_string(), "回滚失败: not reversible");
    }

    #[test]
    fn error_display_version_error() {
        let e = MigrationError::VersionError("bad format".into());
        assert_eq!(e.to_string(), "迁移版本错误: bad format");
    }

    #[test]
    fn error_display_locked_struct_variant() {
        let e = MigrationError::Locked {
            plugin: "plugin-a".into(),
            reason: "another instance running".into(),
        };
        assert_eq!(e.to_string(), "迁移已锁定: plugin-a - another instance running");
    }

    #[test]
    fn error_is_std_error() {
        fn assert_error<E: std::error::Error>(_: &E) {}
        let e = MigrationError::ScriptFailed("x".into());
        assert_error(&e);
    }
}

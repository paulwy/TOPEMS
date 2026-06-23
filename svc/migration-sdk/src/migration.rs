//! 迁移脚本定义

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::fmt;

/// 迁移状态
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MigrationStatus {
    Pending,
    Applied,
    Failed,
    RolledBack,
}

impl fmt::Display for MigrationStatus {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            MigrationStatus::Pending => write!(f, "pending"),
            MigrationStatus::Applied => write!(f, "applied"),
            MigrationStatus::Failed => write!(f, "failed"),
            MigrationStatus::RolledBack => write!(f, "rolled_back"),
        }
    }
}

/// 迁移脚本元信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationScript {
    /// 版本号，格式：YYYYMMDDHHMMSS 或 1.0.0
    pub version: String,
    /// 脚本名称
    pub name: String,
    /// 脚本描述
    pub description: String,
    /// 是否可回滚
    pub reversible: bool,
}

/// 迁移脚本 trait
/// 插件需要实现此 trait 来定义迁移脚本
#[async_trait]
pub trait Migration: Send + Sync {
    /// 获取迁移元信息
    fn metadata(&self) -> &MigrationScript;

    /// 执行迁移（up）
    async fn up(&self, pool: &sqlx::PgPool) -> Result<(), crate::error::MigrationError>;

    /// 回滚迁移（down），可选实现
    async fn down(&self, _pool: &sqlx::PgPool) -> Result<(), crate::error::MigrationError> {
        Err(crate::error::MigrationError::RollbackFailed(
            "Rollback not implemented for this migration".to_string(),
        ))
    }

    /// 获取版本号
    fn version(&self) -> String {
        self.metadata().version.clone()
    }

    /// 获取名称
    fn name(&self) -> String {
        self.metadata().name.clone()
    }
}

/// 简单的 SQL 迁移脚本
#[derive(Debug, Clone)]
pub struct SqlMigration {
    pub script: MigrationScript,
    pub up_sql: String,
    pub down_sql: Option<String>,
}

impl SqlMigration {
    pub fn new(version: &str, name: &str, description: &str, up_sql: &str) -> Self {
        Self {
            script: MigrationScript {
                version: version.to_string(),
                name: name.to_string(),
                description: description.to_string(),
                reversible: false,
            },
            up_sql: up_sql.to_string(),
            down_sql: None,
        }
    }

    pub fn reversible(
        version: &str,
        name: &str,
        description: &str,
        up_sql: &str,
        down_sql: &str,
    ) -> Self {
        Self {
            script: MigrationScript {
                version: version.to_string(),
                name: name.to_string(),
                description: description.to_string(),
                reversible: true,
            },
            up_sql: up_sql.to_string(),
            down_sql: Some(down_sql.to_string()),
        }
    }
}

#[async_trait]
impl Migration for SqlMigration {
    fn metadata(&self) -> &MigrationScript {
        &self.script
    }

    async fn up(&self, pool: &sqlx::PgPool) -> Result<(), crate::error::MigrationError> {
        sqlx::query(&self.up_sql)
            .execute(pool)
            .await
            .map_err(|e| crate::error::MigrationError::ScriptFailed(e.to_string()))?;
        Ok(())
    }

    async fn down(&self, pool: &sqlx::PgPool) -> Result<(), crate::error::MigrationError> {
        if let Some(down_sql) = &self.down_sql {
            sqlx::query(down_sql)
                .execute(pool)
                .await
                .map_err(|e| crate::error::MigrationError::RollbackFailed(e.to_string()))?;
        }
        Ok(())
    }
}

/// 迁移束（包含多个迁移）
pub struct MigrationBundle {
    pub plugin_name: String,
    pub migrations: Vec<Box<dyn Migration>>,
}

impl MigrationBundle {
    pub fn new(plugin_name: &str) -> Self {
        Self {
            plugin_name: plugin_name.to_string(),
            migrations: Vec::new(),
        }
    }

    pub fn add<M: Migration + 'static>(mut self, migration: M) -> Self {
        self.migrations.push(Box::new(migration));
        self
    }

    pub fn migrations(&self) -> &[Box<dyn Migration>] {
        &self.migrations
    }
}

//! 迁移运行器 - 便捷的迁移执行入口

use std::sync::Arc;
use sqlx::PgPool;
use tracing::{info, error};

use crate::error::Result;
use crate::executor::{ExecutorConfig, MigrationExecutor};
use crate::migration::Migration;

/// 迁移运行器
pub struct MigrationRunner {
    executor: MigrationExecutor,
}

impl MigrationRunner {
    /// 创建迁移运行器
    pub fn new(pool: Arc<PgPool>, plugin_name: &str) -> Self {
        let config = ExecutorConfig::new(plugin_name);
        let executor = MigrationExecutor::new(pool, config);
        Self { executor }
    }

    /// 使用配置创建
    pub fn with_config(pool: Arc<PgPool>, config: ExecutorConfig) -> Self {
        let executor = MigrationExecutor::new(pool, config);
        Self { executor }
    }

    /// 初始化迁移表
    pub async fn init(&self) -> Result<()> {
        self.executor.init().await
    }

    /// 运行所有迁移
    pub async fn run<M: Migration + 'static>(&self, migrations: Vec<M>) -> Result<()> {
        info!(
            plugin = %self.executor.config.plugin_name,
            count = %migrations.len(),
            "Starting migrations"
        );

        // 检查是否有待应用的迁移
        let pending_indices = self.executor.get_pending_migrations(&migrations).await?;

        if pending_indices.is_empty() {
            info!(
                plugin = %self.executor.config.plugin_name,
                "All migrations already applied"
            );
            return Ok(());
        }

        info!(
            plugin = %self.executor.config.plugin_name,
            pending_count = %pending_indices.len(),
            "Running pending migrations"
        );

        for &idx in &pending_indices {
            let m = &migrations[idx];
            if let Err(e) = self.executor.execute_one(m).await {
                error!(
                    plugin = %self.executor.config.plugin_name,
                    version = %m.version(),
                    error = %e,
                    "Migration failed"
                );
                return Err(e);
            }
        }

        info!(
            plugin = %self.executor.config.plugin_name,
            "All migrations completed"
        );

        Ok(())
    }

    /// 回滚到指定版本
    pub async fn rollback<M: Migration + 'static>(
        &self,
        migrations: Vec<M>,
        target_version: &str,
    ) -> Result<()> {
        info!(
            plugin = %self.executor.config.plugin_name,
            target_version = %target_version,
            "Starting rollback"
        );

        self.executor.rollback_to(&migrations, target_version, false).await?;

        info!(
            plugin = %self.executor.config.plugin_name,
            target_version = %target_version,
            "Rollback completed"
        );

        Ok(())
    }

    /// 查看迁移状态
    pub async fn status(&self) -> Result<Vec<crate::history::MigrationHistory>> {
        self.executor.status().await
    }

    /// 检查是否需要迁移
    pub async fn needs_migration<M: Migration + 'static>(&self, migrations: &[M]) -> Result<bool> {
        self.executor.needs_migration(migrations).await
    }

    /// 重置所有迁移（危险操作）
    pub async fn reset<M: Migration + 'static>(&self, migrations: Vec<M>) -> Result<()> {
        info!(
            plugin = %self.executor.config.plugin_name,
            "Resetting all migrations (dangerous!)"
        );

        // 按倒序回滚所有迁移
        let mut sorted = migrations;
        sorted.sort_by(|a, b| b.version().cmp(&a.version()));

        for m in sorted {
            if let Err(e) = self.executor.rollback(&m, true).await {
                error!(
                    plugin = %self.executor.config.plugin_name,
                    version = %m.version(),
                    error = %e,
                    "Rollback failed during reset"
                );
                return Err(e);
            }
        }

        info!(
            plugin = %self.executor.config.plugin_name,
            "All migrations reset"
        );

        Ok(())
    }
}

/// 宏：快速定义迁移
#[macro_export]
macro_rules! migration {
    ($version:expr, $name:expr, $description:expr, $up:expr) => {{
        struct __Migration {
            script: migration_sdk::MigrationScript,
            up_sql: String,
            down_sql: Option<String>,
        }

        impl __Migration {
            fn new(version: &str, name: &str, description: &str, up: &str, down: Option<&str>) -> Self {
                Self {
                    script: migration_sdk::MigrationScript {
                        version: version.to_string(),
                        name: name.to_string(),
                        description: description.to_string(),
                        reversible: down.is_some(),
                    },
                    up_sql: up.to_string(),
                    down_sql: down.map(|s| s.to_string()),
                }
            }
        }

        impl migration_sdk::Migration for __Migration {
            fn metadata(&self) -> &migration_sdk::MigrationScript {
                &self.script
            }

            async fn up(&self, pool: &sqlx::PgPool) -> Result<(), migration_sdk::MigrationError> {
                sqlx::query(&self.up_sql)
                    .execute(pool)
                    .await
                    .map_err(|e| migration_sdk::MigrationError::ScriptFailed(e.to_string()))?;
                Ok(())
            }

            async fn down(&self, pool: &sqlx::PgPool) -> Result<(), migration_sdk::MigrationError> {
                if let Some(ref down_sql) = self.down_sql {
                    sqlx::query(down_sql)
                        .execute(pool)
                        .await
                        .map_err(|e| migration_sdk::MigrationError::RollbackFailed(e.to_string()))?;
                }
                Ok(())
            }
        }

        __Migration::new($version, $name, $description, $up, None)
    }};
}

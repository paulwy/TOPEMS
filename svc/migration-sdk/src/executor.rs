//! 迁移执行器

use chrono::Utc;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use std::sync::Arc;
use tracing::{error, info, warn};

use crate::error::{MigrationError, Result};
use crate::history::MigrationHistory;
use crate::lock::DistLock;
use crate::migration::Migration;

/// 迁移执行器配置
#[derive(Clone)]
pub struct ExecutorConfig {
    pub plugin_name: String,
    pub redis_url: Option<String>,
    pub lock_timeout_secs: u64,
    pub enable_rollback: bool,
}

impl ExecutorConfig {
    pub fn new(plugin_name: &str) -> Self {
        Self {
            plugin_name: plugin_name.to_string(),
            redis_url: None,
            lock_timeout_secs: 300,
            enable_rollback: true,
        }
    }

    pub fn with_redis(mut self, redis_url: &str) -> Self {
        self.redis_url = Some(redis_url.to_string());
        self
    }

    pub fn with_lock_timeout(mut self, timeout_secs: u64) -> Self {
        self.lock_timeout_secs = timeout_secs;
        self
    }

    pub fn with_rollback(mut self, enable: bool) -> Self {
        self.enable_rollback = enable;
        self
    }
}

/// 迁移执行器
pub struct MigrationExecutor {
    pool: Arc<PgPool>,
    pub config: ExecutorConfig,
    lock: Option<DistLock>,
}

impl MigrationExecutor {
    /// 创建迁移执行器
    pub fn new(pool: Arc<PgPool>, config: ExecutorConfig) -> Self {
        let lock = config.redis_url.as_ref().map(|url| DistLock::new(url));
        Self { pool, config, lock }
    }

    /// 创建 MigrationHistory 表
    pub async fn init(&self) -> Result<()> {
        MigrationHistory::create_table(&self.pool).await
    }

    /// 计算脚本 checksum
    fn calculate_checksum(sql: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(sql.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// 执行单个迁移
    pub async fn execute_one<M: Migration>(&self, migration: &M) -> Result<()> {
        let version = migration.version();
        let version_str: &str = &version;
        let name = migration.name();
        let script_name = format!("{}_{}.sql", version, name);

        info!(
            plugin = %self.config.plugin_name,
            version = %version,
            name = %name,
            "Executing migration"
        );

        // 获取分布式锁
        let lock_guard = if let Some(ref lock) = self.lock {
            let resource = format!("{}:{}", self.config.plugin_name, version);
            match lock
                .acquire_with_ttl(
                    &resource,
                    std::time::Duration::from_secs(self.config.lock_timeout_secs),
                )
                .await?
            {
                Some(guard) => Some(guard),
                None => {
                    return Err(MigrationError::Locked {
                        plugin: self.config.plugin_name.clone(),
                        reason: format!(
                            "Migration {} is being executed by another process",
                            version
                        ),
                    });
                }
            }
        } else {
            None
        };

        // 检查是否已执行
        let is_applied = MigrationHistory::is_applied(
            &self.pool,
            &self.config.plugin_name,
            version_str,
            &script_name,
        )
        .await?;

        if is_applied {
            info!(
                plugin = %self.config.plugin_name,
                version = %version,
                "Migration already applied, skipping"
            );
            return Ok(());
        }

        // 执行迁移
        let start_time = Utc::now();
        let result = migration.up(&self.pool).await;
        let execution_time_ms = (Utc::now() - start_time).num_milliseconds();

        match result {
            Ok(()) => {
                let checksum = Self::calculate_checksum(&format!("{}:{}", version, name));
                MigrationHistory::record_applied(
                    &self.pool,
                    &self.config.plugin_name,
                    version_str,
                    &script_name,
                    &checksum,
                    Some(migration.metadata().description.as_str()),
                    execution_time_ms,
                )
                .await?;

                info!(
                    plugin = %self.config.plugin_name,
                    version = %version,
                    execution_time_ms = %execution_time_ms,
                    "Migration applied successfully"
                );

                // 释放锁
                if let Some(guard) = lock_guard {
                    let _ = guard.release().await;
                }

                Ok(())
            }
            Err(e) => {
                let error_msg = e.to_string();
                let checksum = Self::calculate_checksum(&format!("{}:{}", version, name));

                MigrationHistory::record_failed(
                    &self.pool,
                    &self.config.plugin_name,
                    version_str,
                    &script_name,
                    &checksum,
                    &error_msg,
                )
                .await?;

                error!(
                    plugin = %self.config.plugin_name,
                    version = %version,
                    error = %error_msg,
                    "Migration failed"
                );

                Err(e)
            }
        }
    }

    /// 执行多个迁移
    pub async fn execute_all<M: Migration + 'static>(
        &self,
        migrations: Vec<M>,
    ) -> Result<Vec<String>> {
        let mut applied = Vec::new();

        for migration in migrations {
            let version = migration.version().to_string();
            if let Err(e) = self.execute_one(&migration).await {
                error!(
                    plugin = %self.config.plugin_name,
                    version = %version,
                    error = %e,
                    "Migration failed, stopping execution"
                );
                return Err(e);
            }
            applied.push(version);
        }

        Ok(applied)
    }

    /// 回滚指定版本
    pub async fn rollback<M: Migration + 'static>(&self, migration: &M, force: bool) -> Result<()> {
        if !self.config.enable_rollback && !force {
            return Err(MigrationError::RollbackFailed(
                "Rollback is disabled".to_string(),
            ));
        }

        let version = migration.version();
        let version_str: &str = &version;
        let name = migration.name();
        let script_name = format!("{}_{}.sql", version, name);

        info!(
            plugin = %self.config.plugin_name,
            version = %version,
            "Rolling back migration"
        );

        // 检查迁移是否可以回滚
        if !migration.metadata().reversible && !force {
            return Err(MigrationError::RollbackFailed(format!(
                "Migration {} is not reversible",
                version
            )));
        }

        // 执行回滚
        migration.down(&self.pool).await?;

        // 更新历史记录
        MigrationHistory::record_rolled_back(
            &self.pool,
            &self.config.plugin_name,
            version_str,
            &script_name,
        )
        .await?;

        info!(
            plugin = %self.config.plugin_name,
            version = %version,
            "Migration rolled back successfully"
        );

        Ok(())
    }

    /// 回滚到指定版本
    pub async fn rollback_to<M: Migration + 'static>(
        &self,
        migrations: &[M],
        target_version: &str,
        force: bool,
    ) -> Result<()> {
        // 按版本倒序排列
        let mut sorted: Vec<&M> = migrations.iter().collect();
        sorted.sort_by_key(|b| std::cmp::Reverse(b.version()));

        let mut rolled_back = false;
        for migration in sorted {
            if migration.version().as_str() >= target_version {
                if let Err(e) = self.rollback(migration, force).await {
                    error!(
                        plugin = %self.config.plugin_name,
                        version = %migration.version(),
                        error = %e,
                        "Rollback failed"
                    );
                    return Err(e);
                }
                rolled_back = true;
            }
        }

        if !rolled_back {
            warn!(
                plugin = %self.config.plugin_name,
                target_version = %target_version,
                "No migrations to rollback"
            );
        }

        Ok(())
    }

    /// 获取迁移状态
    pub async fn status(&self) -> Result<Vec<MigrationHistory>> {
        MigrationHistory::get_by_plugin(&self.pool, &self.config.plugin_name).await
    }

    /// 检查是否需要迁移
    pub async fn needs_migration<M: Migration + 'static>(&self, migrations: &[M]) -> Result<bool> {
        let latest =
            MigrationHistory::get_latest_version(&self.pool, &self.config.plugin_name).await?;

        match latest {
            Some(ver) => {
                // 检查是否有更新的迁移
                for m in migrations {
                    if m.version() > ver {
                        return Ok(true);
                    }
                }
                Ok(false)
            }
            None => Ok(!migrations.is_empty()),
        }
    }

    /// 获取待应用的迁移
    pub async fn get_pending_migrations<M: Migration + 'static>(
        &self,
        migrations: &[M],
    ) -> Result<Vec<usize>> {
        let latest =
            MigrationHistory::get_latest_version(&self.pool, &self.config.plugin_name).await?;

        let pending: Vec<usize> = migrations
            .iter()
            .enumerate()
            .filter(|(_, m)| match &latest {
                Some(ver) => m.version().as_str() > ver.as_str(),
                None => true,
            })
            .map(|(i, _)| i)
            .collect();

        Ok(pending)
    }
}

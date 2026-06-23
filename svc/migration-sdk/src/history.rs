//! 迁移历史记录管理

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPool, FromRow};
use uuid::Uuid;

use crate::error::Result;

/// 迁移历史记录
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct MigrationHistory {
    pub id: Uuid,
    pub plugin_name: String,
    pub version: String,
    pub description: Option<String>,
    pub script_name: String,
    pub checksum: String,
    pub status: String,
    pub applied_at: Option<DateTime<Utc>>,
    pub rolled_back_at: Option<DateTime<Utc>>,
    pub execution_time_ms: Option<i64>,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl MigrationHistory {
    /// 创建 MigrationHistory 表
    pub async fn create_table(pool: &PgPool) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS core_migration_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                plugin_name VARCHAR(100) NOT NULL,
                version VARCHAR(50) NOT NULL,
                description TEXT,
                script_name VARCHAR(255) NOT NULL,
                checksum VARCHAR(64) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                applied_at TIMESTAMP,
                rolled_back_at TIMESTAMP,
                execution_time_ms BIGINT,
                error_message TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_migration UNIQUE (plugin_name, version, script_name)
            )
            "#,
        )
        .execute(pool)
        .await?;

        // 创建索引
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_migration_plugin 
            ON core_migration_history(plugin_name)
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_migration_status 
            ON core_migration_history(status)
            "#,
        )
        .execute(pool)
        .await?;

        Ok(())
    }

    /// 记录已完成的迁移
    pub async fn record_applied(
        pool: &PgPool,
        plugin_name: &str,
        version: &str,
        script_name: &str,
        checksum: &str,
        description: Option<&str>,
        execution_time_ms: i64,
    ) -> Result<Self> {
        let record = sqlx::query_as::<_, MigrationHistory>(
            r#"
            INSERT INTO core_migration_history
            (plugin_name, version, script_name, checksum, status, description, applied_at, execution_time_ms)
            VALUES ($1, $2, $3, $4, 'applied', $5, NOW(), $6)
            ON CONFLICT (plugin_name, version, script_name)
            DO UPDATE SET
                status = 'applied',
                applied_at = NOW(),
                execution_time_ms = $6,
                error_message = NULL
            RETURNING *
            "#,
        )
        .bind(plugin_name)
        .bind(version)
        .bind(script_name)
        .bind(checksum)
        .bind(description)
        .bind(execution_time_ms)
        .fetch_one(pool)
        .await?;

        Ok(record)
    }

    /// 记录失败的迁移
    pub async fn record_failed(
        pool: &PgPool,
        plugin_name: &str,
        version: &str,
        script_name: &str,
        checksum: &str,
        error_message: &str,
    ) -> Result<Self> {
        let record = sqlx::query_as::<_, MigrationHistory>(
            r#"
            INSERT INTO core_migration_history
            (plugin_name, version, script_name, checksum, status, error_message)
            VALUES ($1, $2, $3, $4, 'failed', $5)
            ON CONFLICT (plugin_name, version, script_name)
            DO UPDATE SET
                status = 'failed',
                error_message = $5
            RETURNING *
            "#,
        )
        .bind(plugin_name)
        .bind(version)
        .bind(script_name)
        .bind(checksum)
        .bind(error_message)
        .fetch_one(pool)
        .await?;

        Ok(record)
    }

    /// 记录回滚的迁移
    pub async fn record_rolled_back(
        pool: &PgPool,
        plugin_name: &str,
        version: &str,
        script_name: &str,
    ) -> Result<Self> {
        let record = sqlx::query_as::<_, MigrationHistory>(
            r#"
            UPDATE core_migration_history
            SET status = 'rolled_back', rolled_back_at = NOW()
            WHERE plugin_name = $1 AND version = $2 AND script_name = $3
            RETURNING *
            "#,
        )
        .bind(plugin_name)
        .bind(version)
        .bind(script_name)
        .fetch_one(pool)
        .await?;

        Ok(record)
    }

    /// 获取插件的所有迁移记录
    pub async fn get_by_plugin(pool: &PgPool, plugin_name: &str) -> Result<Vec<Self>> {
        let records = sqlx::query_as::<_, MigrationHistory>(
            r#"
            SELECT * FROM core_migration_history
            WHERE plugin_name = $1
            ORDER BY version, applied_at
            "#,
        )
        .bind(plugin_name)
        .fetch_all(pool)
        .await?;

        Ok(records)
    }

    /// 获取插件的最新版本
    pub async fn get_latest_version(pool: &PgPool, plugin_name: &str) -> Result<Option<String>> {
        let result: Option<(String,)> = sqlx::query_as(
            r#"
            SELECT version FROM core_migration_history
            WHERE plugin_name = $1 AND status = 'applied'
            ORDER BY applied_at DESC
            LIMIT 1
            "#,
        )
        .bind(plugin_name)
        .fetch_optional(pool)
        .await?;

        Ok(result.map(|r| r.0))
    }

    /// 检查迁移是否已应用
    pub async fn is_applied(
        pool: &PgPool,
        plugin_name: &str,
        version: &str,
        script_name: &str,
    ) -> Result<bool> {
        let result: Option<(i64,)> = sqlx::query_as(
            r#"
            SELECT 1 FROM core_migration_history
            WHERE plugin_name = $1 AND version = $2 AND script_name = $3 AND status = 'applied'
            "#,
        )
        .bind(plugin_name)
        .bind(version)
        .bind(script_name)
        .fetch_optional(pool)
        .await?;

        Ok(result.is_some())
    }

    /// 删除插件的所有迁移记录（用于清理）
    pub async fn delete_by_plugin(pool: &PgPool, plugin_name: &str) -> Result<u64> {
        let result = sqlx::query(
            r#"
            DELETE FROM core_migration_history WHERE plugin_name = $1
            "#,
        )
        .bind(plugin_name)
        .execute(pool)
        .await?;

        Ok(result.rows_affected())
    }
}

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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Utc};

    fn rt<T: Serialize + serde::de::DeserializeOwned>(val: &T) -> T {
        let s = serde_json::to_string(val).unwrap();
        serde_json::from_str(&s).unwrap()
    }

    fn sample_history() -> MigrationHistory {
        MigrationHistory {
            id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
            plugin_name: "my-plugin".into(),
            version: "20260101000001".into(),
            description: Some("init migration".into()),
            script_name: "20260101000001_init.sql".into(),
            checksum: "abc123def456".into(),
            status: "applied".into(),
            applied_at: Some(Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 1).unwrap()),
            rolled_back_at: None,
            execution_time_ms: Some(150),
            error_message: None,
            created_at: Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).unwrap(),
        }
    }

    #[test]
    fn migration_history_roundtrip_full() {
        let h = sample_history();
        let back = rt(&h);
        assert_eq!(back.id, h.id);
        assert_eq!(back.plugin_name, h.plugin_name);
        assert_eq!(back.version, h.version);
        assert_eq!(back.description, h.description);
        assert_eq!(back.script_name, h.script_name);
        assert_eq!(back.checksum, h.checksum);
        assert_eq!(back.status, h.status);
        assert_eq!(back.applied_at, h.applied_at);
        assert_eq!(back.rolled_back_at, h.rolled_back_at);
        assert_eq!(back.execution_time_ms, h.execution_time_ms);
        assert_eq!(back.error_message, h.error_message);
        assert_eq!(back.created_at, h.created_at);
    }

    #[test]
    fn migration_history_with_error() {
        let mut h = sample_history();
        h.status = "failed".into();
        h.applied_at = None;
        h.execution_time_ms = None;
        h.error_message = Some("syntax error near 'CREATE'".into());
        let back = rt(&h);
        assert_eq!(back.status, "failed");
        assert!(back.applied_at.is_none());
        assert_eq!(back.error_message.as_deref(), Some("syntax error near 'CREATE'"));
    }

    #[test]
    fn migration_history_rolled_back() {
        let mut h = sample_history();
        h.status = "rolled_back".into();
        h.rolled_back_at = Some(Utc.with_ymd_and_hms(2026, 1, 2, 0, 0, 0).unwrap());
        let back = rt(&h);
        assert_eq!(back.status, "rolled_back");
        assert!(back.rolled_back_at.is_some());
    }

    #[test]
    fn migration_history_json_serializable() {
        let h = sample_history();
        let json = serde_json::to_string(&h).unwrap();
        assert!(json.contains("\"plugin_name\":\"my-plugin\""));
        assert!(json.contains("\"version\":\"20260101000001\""));
        assert!(json.contains("\"checksum\":\"abc123def456\""));
        assert!(json.contains("\"status\":\"applied\""));
    }
}

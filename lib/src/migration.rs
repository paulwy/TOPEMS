use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use chrono::{DateTime, Utc};
use sqlx::{postgres::PgPool, FromRow, Row};
use uuid::Uuid;

use crate::error::TopemsError;

pub struct MigrationSDK {
    db_pool: Arc<PgPool>,
    migration_table: String,
    lock_timeout_seconds: u64,
}

#[derive(Debug, Clone, FromRow)]
pub struct MigrationHistory {
    pub id: Uuid,
    pub plugin_code: String,
    pub version: String,
    pub name: String,
    pub applied_at: DateTime<Utc>,
    pub status: MigrationStatus,
    pub checksum: String,
    pub executed_by: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MigrationStatus {
    Success,
    Failed,
    RollingBack,
}

#[derive(Debug, Clone)]
pub struct MigrationResult {
    pub success: bool,
    pub plugin_code: String,
    pub version: String,
    pub message: String,
}

pub type Result<T> = std::result::Result<T, TopemsError>;

impl MigrationSDK {
    pub fn new(db_pool: Arc<PgPool>) -> Self {
        Self {
            db_pool,
            migration_table: "core_migration_history".to_string(),
            lock_timeout_seconds: 30,
        }
    }

    pub async fn init(&self) -> Result<()> {
        let create_table_sql = r#"
            CREATE TABLE IF NOT EXISTS core_migration_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                plugin_code VARCHAR(50) NOT NULL,
                version VARCHAR(20) NOT NULL,
                name VARCHAR(255) NOT NULL,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) NOT NULL DEFAULT 'success',
                checksum VARCHAR(64) NOT NULL,
                executed_by VARCHAR(100) NOT NULL,
                error_message TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_plugin_version UNIQUE (plugin_code, version)
            );

            CREATE INDEX IF NOT EXISTS idx_migration_plugin_code ON core_migration_history(plugin_code);
            CREATE INDEX IF NOT EXISTS idx_migration_status ON core_migration_history(status);

            CREATE TABLE IF NOT EXISTS core_migration_locks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                plugin_code VARCHAR(50) NOT NULL UNIQUE,
                lock_value VARCHAR(100) NOT NULL,
                acquired_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_migration_lock_plugin_code ON core_migration_locks(plugin_code);
        "#;

        sqlx::query(create_table_sql)
            .execute(&*self.db_pool)
            .await?;

        Ok(())
    }

    pub async fn execute_migrations(
        &self,
        plugin_code: &str,
        migrations_dir: &std::path::Path,
        executed_by: &str,
    ) -> Result<Vec<MigrationResult>> {
        let lock_value = generate_lock_value();
        let expires_at = Utc::now() + chrono::Duration::seconds(self.lock_timeout_seconds as i64);

        let acquired = self
            .acquire_lock(plugin_code, &lock_value, expires_at)
            .await?;
        if !acquired {
            return Err(TopemsError::Internal(
                "Migration lock already held by another process".to_string(),
            ));
        }

        let results = self
            .execute_migrations_unlocked(plugin_code, migrations_dir, executed_by)
            .await;

        let _ = self.release_lock(plugin_code, &lock_value).await;

        results
    }

    async fn acquire_lock(
        &self,
        plugin_code: &str,
        lock_value: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<bool> {
        let query = r#"
            INSERT INTO core_migration_locks (plugin_code, lock_value, expires_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (plugin_code) DO UPDATE SET
                lock_value = EXCLUDED.lock_value,
                acquired_at = CURRENT_TIMESTAMP,
                expires_at = EXCLUDED.expires_at
            WHERE core_migration_locks.expires_at < CURRENT_TIMESTAMP
            RETURNING plugin_code
        "#;

        let result = sqlx::query(query)
            .bind(plugin_code)
            .bind(lock_value)
            .bind(expires_at)
            .fetch_optional(&*self.db_pool)
            .await?;

        Ok(result.is_some())
    }

    async fn release_lock(&self, plugin_code: &str, lock_value: &str) -> Result<()> {
        let query = "DELETE FROM core_migration_locks WHERE plugin_code = $1 AND lock_value = $2";
        sqlx::query(query)
            .bind(plugin_code)
            .bind(lock_value)
            .execute(&*self.db_pool)
            .await?;
        Ok(())
    }

    async fn execute_migrations_unlocked(
        &self,
        plugin_code: &str,
        migrations_dir: &std::path::Path,
        executed_by: &str,
    ) -> Result<Vec<MigrationResult>> {
        let mut results = Vec::new();

        let migrations = self.discover_migrations(migrations_dir)?;
        let applied_versions = self.get_applied_versions(plugin_code).await?;

        for migration in migrations {
            if applied_versions.contains(&migration.version) {
                continue;
            }

            let result = self
                .execute_migration(plugin_code, &migration, executed_by)
                .await;
            results.push(result.clone());

            if !result.success {
                self.rollback_migrations(plugin_code, &migration.version)
                    .await?;
                return Ok(results);
            }
        }

        Ok(results)
    }

    fn discover_migrations(&self, migrations_dir: &std::path::Path) -> Result<Vec<MigrationFile>> {
        let mut migrations = Vec::new();

        if !migrations_dir.exists() {
            return Ok(migrations);
        }

        let entries = std::fs::read_dir(migrations_dir)?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().is_some_and(|ext| ext == "sql") {
                let filename = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                let version = extract_version(&filename);
                let name = extract_name(&filename);

                let content = std::fs::read_to_string(&path)?;
                let checksum = calculate_checksum(&content);

                migrations.push(MigrationFile {
                    path,
                    version,
                    name,
                    content,
                    checksum,
                });
            }
        }

        migrations.sort_by_key(|m| m.version.clone());
        Ok(migrations)
    }

    async fn get_applied_versions(&self, plugin_code: &str) -> Result<Vec<String>> {
        let query = format!(
            "SELECT version FROM {} WHERE plugin_code = $1 AND status = 'success'",
            self.migration_table
        );

        let rows = sqlx::query(&query)
            .bind(plugin_code)
            .fetch_all(&*self.db_pool)
            .await?;

        Ok(rows.into_iter().map(|r| r.get(0)).collect())
    }

    async fn execute_migration(
        &self,
        plugin_code: &str,
        migration: &MigrationFile,
        executed_by: &str,
    ) -> MigrationResult {
        let result = sqlx::query(&migration.content)
            .execute(&*self.db_pool)
            .await;

        match result {
            Ok(_) => {
                let _ = self
                    .record_migration(
                        plugin_code,
                        migration,
                        executed_by,
                        MigrationStatus::Success,
                        None,
                    )
                    .await;

                MigrationResult {
                    success: true,
                    plugin_code: plugin_code.to_string(),
                    version: migration.version.clone(),
                    message: "Migration executed successfully".to_string(),
                }
            }
            Err(e) => {
                let _ = self
                    .record_migration(
                        plugin_code,
                        migration,
                        executed_by,
                        MigrationStatus::Failed,
                        Some(e.to_string()),
                    )
                    .await;

                MigrationResult {
                    success: false,
                    plugin_code: plugin_code.to_string(),
                    version: migration.version.clone(),
                    message: format!("Migration failed: {}", e),
                }
            }
        }
    }

    async fn record_migration(
        &self,
        plugin_code: &str,
        migration: &MigrationFile,
        executed_by: &str,
        status: MigrationStatus,
        error_message: Option<String>,
    ) {
        let status_str = match status {
            MigrationStatus::Success => "success",
            MigrationStatus::Failed => "failed",
            MigrationStatus::RollingBack => "rolling_back",
        };

        let query = format!(
            "INSERT INTO {} (plugin_code, version, name, checksum, executed_by, status, error_message)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (plugin_code, version) DO UPDATE SET status = $6, error_message = $7, updated_at = CURRENT_TIMESTAMP",
            self.migration_table
        );

        let _ = sqlx::query(&query)
            .bind(plugin_code)
            .bind(&migration.version)
            .bind(&migration.name)
            .bind(&migration.checksum)
            .bind(executed_by)
            .bind(status_str)
            .bind(error_message)
            .execute(&*self.db_pool)
            .await;
    }

    async fn rollback_migrations(&self, plugin_code: &str, failed_version: &str) -> Result<()> {
        let query = format!(
            "SELECT version, name, checksum FROM {} 
             WHERE plugin_code = $1 AND status = 'success' AND version > $2
             ORDER BY version DESC",
            self.migration_table
        );

        let migrations = sqlx::query(&query)
            .bind(plugin_code)
            .bind(failed_version)
            .fetch_all(&*self.db_pool)
            .await?;

        for migration in migrations {
            let version: String = migration.get(0);
            let rollback_sql = self.generate_rollback_sql(&version).await?;
            if let Err(e) = sqlx::query(&rollback_sql).execute(&*self.db_pool).await {
                tracing::warn!("Failed to rollback migration {}: {}", version, e);
            }

            let update_query = format!(
                "UPDATE {} SET status = 'rolling_back' WHERE plugin_code = $1 AND version = $2",
                self.migration_table
            );
            let _ = sqlx::query(&update_query)
                .bind(plugin_code)
                .bind(&version)
                .execute(&*self.db_pool)
                .await;
        }

        Ok(())
    }

    async fn generate_rollback_sql(&self, version: &str) -> Result<String> {
        Ok(format!("-- Rollback migration {}", version))
    }

    pub async fn get_migration_history(
        &self,
        plugin_code: Option<&str>,
    ) -> Result<Vec<MigrationHistory>> {
        let query = if let Some(_code) = plugin_code {
            format!(
                "SELECT * FROM {} WHERE plugin_code = $1 ORDER BY applied_at DESC",
                self.migration_table
            )
        } else {
            format!(
                "SELECT * FROM {} ORDER BY applied_at DESC",
                self.migration_table
            )
        };

        let rows = sqlx::query(&query)
            .bind(plugin_code)
            .fetch_all(&*self.db_pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| MigrationHistory {
                id: r.get("id"),
                plugin_code: r.get("plugin_code"),
                version: r.get("version"),
                name: r.get("name"),
                applied_at: r.get("applied_at"),
                status: match r.get::<String, _>("status").as_str() {
                    "failed" => MigrationStatus::Failed,
                    "rolling_back" => MigrationStatus::RollingBack,
                    _ => MigrationStatus::Success,
                },
                checksum: r.get("checksum"),
                executed_by: r.get("executed_by"),
                error_message: r.get("error_message"),
            })
            .collect())
    }
}

struct MigrationFile {
    #[allow(dead_code)]
    path: std::path::PathBuf,
    version: String,
    name: String,
    content: String,
    checksum: String,
}

fn extract_version(filename: &str) -> String {
    filename.split('_').next().unwrap_or("0").to_string()
}

fn extract_name(filename: &str) -> String {
    filename
        .replace(".sql", "")
        .split('_')
        .skip(1)
        .collect::<Vec<_>>()
        .join("_")
}

fn calculate_checksum(content: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    hex::encode(hasher.finalize())
}

fn generate_lock_value() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_else(|e| {
            tracing::error!("System clock error: {}", e);
            std::time::Duration::ZERO
        })
        .as_nanos();
    format!("lock_{}", timestamp)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_checksum() {
        let content = "SELECT 1";
        let checksum = calculate_checksum(content);
        assert_eq!(checksum.len(), 64);
    }

    #[test]
    fn test_extract_version() {
        assert_eq!(extract_version("001_init.sql"), "001");
        assert_eq!(extract_version("002_add_column.sql"), "002");
    }
}

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

    pub fn push_migration<M: Migration + 'static>(mut self, migration: M) -> Self {
        self.migrations.push(Box::new(migration));
        self
    }

    pub fn migrations(&self) -> &[Box<dyn Migration>] {
        &self.migrations
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rt<T: Serialize + serde::de::DeserializeOwned>(val: &T) -> T {
        let s = serde_json::to_string(val).unwrap();
        serde_json::from_str(&s).unwrap()
    }

    #[test]
    fn migration_status_roundtrip_all_variants() {
        for v in [MigrationStatus::Pending, MigrationStatus::Applied, MigrationStatus::Failed, MigrationStatus::RolledBack] {
            let back = rt(&v);
            assert_eq!(back, v);
        }
    }

    #[test]
    fn migration_status_serde_snake_case() {
        let json = serde_json::to_string(&MigrationStatus::RolledBack).unwrap();
        assert_eq!(json, "\"rolled_back\"");
    }

    #[test]
    fn migration_status_display() {
        assert_eq!(MigrationStatus::Pending.to_string(), "pending");
        assert_eq!(MigrationStatus::Applied.to_string(), "applied");
        assert_eq!(MigrationStatus::Failed.to_string(), "failed");
        assert_eq!(MigrationStatus::RolledBack.to_string(), "rolled_back");
    }

    #[test]
    fn migration_script_roundtrip() {
        let s = MigrationScript {
            version: "20260101000001".into(),
            name: "create_users".into(),
            description: "create user table".into(),
            reversible: true,
        };
        let back = rt(&s);
        assert_eq!(back.version, s.version);
        assert_eq!(back.name, s.name);
        assert_eq!(back.description, s.description);
        assert_eq!(back.reversible, s.reversible);
    }

    #[test]
    fn migration_script_default_values() {
        let s = MigrationScript {
            version: "1.0.0".into(),
            name: "init".into(),
            description: String::new(),
            reversible: false,
        };
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("\"version\":\"1.0.0\""));
        assert!(json.contains("\"reversible\":false"));
    }

    #[test]
    fn sql_migration_new_not_reversible() {
        let m = SqlMigration::new(
            "20260101000001",
            "create_users",
            "create user table",
            "CREATE TABLE users (id UUID PRIMARY KEY);",
        );
        assert_eq!(m.script.version, "20260101000001");
        assert_eq!(m.script.name, "create_users");
        assert_eq!(m.script.description, "create user table");
        assert!(!m.script.reversible);
        assert_eq!(m.down_sql, None);
        assert_eq!(m.up_sql, "CREATE TABLE users (id UUID PRIMARY KEY);");
    }

    #[test]
    fn sql_migration_reversible_has_down_sql() {
        let m = SqlMigration::reversible(
            "20260101000002",
            "add_email",
            "add email column",
            "ALTER TABLE users ADD COLUMN email TEXT;",
            "ALTER TABLE users DROP COLUMN email;",
        );
        assert!(m.script.reversible);
        assert_eq!(m.down_sql.as_deref(), Some("ALTER TABLE users DROP COLUMN email;"));
    }

    #[test]
    fn migration_default_methods() {
        use crate::error::Result as MResult;
        struct Stub { script: MigrationScript }
        #[async_trait]
        impl Migration for Stub {
            fn metadata(&self) -> &MigrationScript { &self.script }
            async fn up(&self, _pool: &sqlx::PgPool) -> MResult<()> { Ok(()) }
        }
        let s = Stub { script: MigrationScript {
            version: "9.9.9".into(), name: "stub".into(),
            description: "stub migration".into(), reversible: false,
        }};
        assert_eq!(s.version(), "9.9.9");
        assert_eq!(s.name(), "stub");
    }

    #[test]
    fn migration_builder_push_and_count() {
        let bundle = MigrationBundle::new("test-plugin")
            .push_migration(SqlMigration::new("1", "a", "d1", "SELECT 1"))
            .push_migration(SqlMigration::new("2", "b", "d2", "SELECT 2"));
        assert_eq!(bundle.plugin_name, "test-plugin");
        assert_eq!(bundle.migrations().len(), 2);
    }

    #[test]
    fn migration_bundle_new_is_empty() {
        let bundle = MigrationBundle::new("empty");
        assert_eq!(bundle.plugin_name, "empty");
        assert!(bundle.migrations().is_empty());
    }
}

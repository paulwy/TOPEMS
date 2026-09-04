//! V465: Configuration Store Service
//!
//! Provides persistent storage for system configurations, including audit log retention policies.

use std::sync::Arc;

use sqlx::PgPool;
use tokio::sync::RwLock;
use tracing::{error, info};
use uuid::Uuid;

use crate::routes::business_tools::audit_retention::RetentionPolicy;

// ===== Configuration Store Types =====

/// Configuration key types
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ConfigKey {
    /// Audit log retention policy
    AuditRetentionPolicy,
    /// Custom configuration key
    Custom(String),
}

impl ConfigKey {
    /// Get the string representation of the config key
    pub fn as_str(&self) -> &str {
        match self {
            ConfigKey::AuditRetentionPolicy => "audit_retention_policy",
            ConfigKey::Custom(key) => key.as_str(),
        }
    }
}

/// Configuration value stored in the database
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConfigValue {
    /// Unique identifier for the configuration entry
    pub id: Uuid,
    /// Configuration key
    pub key: String,
    /// Configuration value (JSON)
    pub value: String,
    /// Tenant ID (for multi-tenancy)
    pub tenant_id: Uuid,
    /// Whether the configuration is active
    pub active: bool,
    /// Created at timestamp
    pub created_at: chrono::DateTime<chrono::Utc>,
    /// Updated at timestamp
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

// ===== Configuration Store =====

/// Configuration store for persistent system configurations
pub struct ConfigStore {
    pool: PgPool,
    cache: Arc<RwLock<std::collections::HashMap<String, String>>>,
}

impl ConfigStore {
    /// Create a new configuration store
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            cache: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }

    /// Initialize the configuration store tables
    pub async fn init(&self) -> Result<(), sqlx::Error> {
        // Create config table if it doesn't exist
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS system_configs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
                active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(key, tenant_id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create indexes for better performance
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(key);
            CREATE INDEX IF NOT EXISTS idx_system_configs_tenant_id ON system_configs(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_system_configs_active ON system_configs(active);
            "#,
        )
        .execute(&self.pool)
        .await?;

        info!("Configuration store initialized successfully");
        Ok(())
    }

    /// Load configurations into cache
    pub async fn load_cache(&self) -> Result<(), sqlx::Error> {
        let configs = sqlx::query_as::<_, ConfigValue>(
            r#"
            SELECT id, key, value, tenant_id, active, created_at, updated_at
            FROM system_configs
            WHERE active = true
            ORDER BY key, updated_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut cache = self.cache.write().await;
        cache.clear();
        
        for config in configs {
            cache.insert(config.key, config.value);
        }

        info!("Loaded {} configurations into cache", configs.len());
        Ok(())
    }

    /// Get a configuration value by key
    pub async fn get(&self, key: &ConfigKey) -> Option<String> {
        let cache = self.cache.read().await;
        cache.get(key.as_str()).cloned()
    }

    /// Set a configuration value
    pub async fn set(&self, key: ConfigKey, value: &serde_json::Value) -> Result<(), sqlx::Error> {
        let key_str = key.as_str();
        let value_str = serde_json::to_string(value)
            .map_err(|e| {
                error!("Failed to serialize config value: {}", e);
                sqlx::Error::config(e)
            })?;

        // Update database
        sqlx::query!(
            r#"
            INSERT INTO system_configs (key, value, tenant_id, active, created_at, updated_at)
            VALUES ($1, $2, gen_random_uuid(), true, NOW(), NOW())
            ON CONFLICT (key, tenant_id) DO UPDATE SET
                value = $2,
                updated_at = NOW()
            "#,
            key_str,
            value_str
        )
        .execute(&self.pool)
        .await?;

        // Update cache
        let mut cache = self.cache.write().await;
        cache.insert(key_str.to_string(), value_str);

        info!("Configuration updated: {}", key_str);
        Ok(())
    }

    /// Get audit retention policy from store
    pub async fn get_audit_retention_policy(&self) -> Result<Option<RetentionPolicy>, sqlx::Error> {
        match self.get(&ConfigKey::AuditRetentionPolicy).await {
            Some(value_str) => {
                match serde_json::from_str(&value_str) {
                    Ok(policy) => Ok(Some(policy)),
                    Err(e) => {
                        error!("Failed to deserialize audit retention policy: {}", e);
                        Ok(None)
                    }
                }
            }
            None => Ok(None),
        }
    }

    /// Set audit retention policy in store
    pub async fn set_audit_retention_policy(&self, policy: &RetentionPolicy) -> Result<(), sqlx::Error> {
        let value = serde_json::to_value(policy)
            .map_err(|e| {
                error!("Failed to serialize audit retention policy: {}", e);
                sqlx::Error::config(e)
            })?;
        
        self.set(ConfigKey::AuditRetentionPolicy, &value).await
    }

    /// Delete a configuration value
    pub async fn delete(&self, key: &ConfigKey) -> Result<(), sqlx::Error> {
        let key_str = key.as_str();

        // Update database
        sqlx::query!(
            r#"
            UPDATE system_configs SET active = false, updated_at = NOW()
            WHERE key = $1
            "#,
            key_str
        )
        .execute(&self.pool)
        .await?;

        // Update cache
        let mut cache = self.cache.write().await;
        cache.remove(key_str);

        info!("Configuration deleted: {}", key_str);
        Ok(())
    }

    /// Get all active configurations
    pub async fn get_all_configs(&self) -> Result<Vec<ConfigValue>, sqlx::Error> {
        sqlx::query_as!(
            ConfigValue,
            r#"
            SELECT id, key, value, tenant_id, active, created_at, updated_at
            FROM system_configs
            WHERE active = true
            ORDER BY key, updated_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
    }
}

// ===== Configuration Store Service =====

/// Configuration store service for easy access
#[derive(Clone)]
pub struct ConfigStoreService {
    store: Arc<ConfigStore>,
}

impl ConfigStoreService {
    /// Create a new configuration store service
    pub fn new(pool: PgPool) -> Self {
        Self {
            store: Arc::new(ConfigStore::new(pool)),
        }
    }

    /// Initialize the configuration store
    pub async fn init(&self) -> Result<(), sqlx::Error> {
        self.store.init().await?;
        self.store.load_cache().await?;
        Ok(())
    }

    /// Get the configuration store
    pub fn store(&self) -> &Arc<ConfigStore> {
        &self.store
    }

    /// Get audit retention policy with fallback to defaults
    pub async fn get_audit_retention_policy_with_defaults(&self) -> RetentionPolicy {
        match self.store.get_audit_retention_policy().await {
            Ok(Some(policy)) => policy,
            Ok(None) => {
                // Return default policy
                RetentionPolicy::default()
            }
            Err(e) => {
                error!("Failed to get audit retention policy: {}", e);
                RetentionPolicy::default()
            }
        }
    }

    /// Save audit retention policy and update cache
    pub async fn save_audit_retention_policy(&self, policy: &RetentionPolicy) -> Result<(), sqlx::Error> {
        self.store.set_audit_retention_policy(policy).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_config_key_as_str() {
        assert_eq!(ConfigKey::AuditRetentionPolicy.as_str(), "audit_retention_policy");
        assert_eq!(ConfigKey::Custom("test".to_string()).as_str(), "test");
    }

    #[test]
    fn test_config_key_equality() {
        assert_eq!(ConfigKey::AuditRetentionPolicy, ConfigKey::AuditRetentionPolicy);
        assert_ne!(ConfigKey::AuditRetentionPolicy, ConfigKey::Custom("test".to_string()));
        assert_eq!(ConfigKey::Custom("test".to_string()), ConfigKey::Custom("test".to_string()));
    }

    #[test]
    fn test_config_key_hash() {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        ConfigKey::AuditRetentionPolicy.hash(&mut hasher);
        let hash1 = hasher.finish();

        let mut hasher = DefaultHasher::new();
        ConfigKey::AuditRetentionPolicy.hash(&mut hasher);
        let hash2 = hasher.finish();

        assert_eq!(hash1, hash2);

        let mut hasher = DefaultHasher::new();
        ConfigKey::Custom("test".to_string()).hash(&mut hasher);
        let hash3 = hasher.finish();

        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_retention_policy_default() {
        let policy = RetentionPolicy::default();
        assert_eq!(policy.retention_days, 90);
        assert!(!policy.archive_enabled);
        assert_eq!(policy.batch_size, 1000);
        assert_eq!(policy.cleanup_interval_hours, 24);
    }

    #[test]
    fn test_retention_policy_serialization() {
        let policy = RetentionPolicy::new(30);
        let json = serde_json::to_string(&policy).unwrap();
        let deserialized: RetentionPolicy = serde_json::from_str(&json).unwrap();
        assert_eq!(policy.retention_days, deserialized.retention_days);
        assert_eq!(policy.archive_enabled, deserialized.archive_enabled);
        assert_eq!(policy.batch_size, deserialized.batch_size);
        assert_eq!(policy.cleanup_interval_hours, deserialized.cleanup_interval_hours);
    }
}
//! V450: Permission Store Factory
//!
//! Provides a factory for creating permission store instances based on
//! configuration. Supports both in-memory and PostgreSQL-backed storage,
//! allowing seamless switching between storage backends without changing
//! application code.

use std::sync::Arc;

use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use super::permission_store::{InMemoryPermissionStore, PermissionStore};
use super::database_permission_store::DatabasePermissionStore;

// ===== Permission Store Configuration =====

/// Type of permission store to use.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PermissionStoreType {
    /// In-memory permission store (suitable for testing and single-instance deployments).
    Memory,
    /// PostgreSQL-backed permission store (suitable for multi-instance deployments).
    Database,
}

impl Default for PermissionStoreType {
    fn default() -> Self {
        Self::Memory
    }
}

impl std::fmt::Display for PermissionStoreType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Memory => write!(f, "memory"),
            Self::Database => write!(f, "database"),
        }
    }
}

impl std::str::FromStr for PermissionStoreType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "memory" => Ok(Self::Memory),
            "database" | "db" | "postgres" | "postgresql" => Ok(Self::Database),
            _ => Err(format!("Unknown permission store type: {}", s)),
        }
    }
}

/// Configuration for the permission store.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionStoreConfig {
    /// Type of permission store to use. Defaults to "memory".
    #[serde(default)]
    pub store_type: PermissionStoreType,
    /// Cache TTL in seconds for database-backed store. Defaults to 300 (5 minutes).
    #[serde(default = "default_cache_ttl")]
    pub cache_ttl_secs: u64,
    /// Whether to seed default permissions on startup. Defaults to true.
    #[serde(default = "default_seed_defaults")]
    pub seed_defaults: bool,
}

fn default_cache_ttl() -> u64 {
    300
}

fn default_seed_defaults() -> bool {
    true
}

impl Default for PermissionStoreConfig {
    fn default() -> Self {
        Self {
            store_type: PermissionStoreType::default(),
            cache_ttl_secs: default_cache_ttl(),
            seed_defaults: default_seed_defaults(),
        }
    }
}

impl PermissionStoreConfig {
    /// Create a configuration for in-memory storage.
    pub fn memory() -> Self {
        Self {
            store_type: PermissionStoreType::Memory,
            ..Default::default()
        }
    }

    /// Create a configuration for database-backed storage.
    pub fn database() -> Self {
        Self {
            store_type: PermissionStoreType::Database,
            ..Default::default()
        }
    }

    /// Create a configuration from environment variables.
    ///
    /// Environment variables:
    /// - PERMISSION_STORE_TYPE: "memory" or "database" (default: "memory")
    /// - PERMISSION_STORE_CACHE_TTL: cache TTL in seconds (default: 300)
    /// - PERMISSION_STORE_SEED_DEFAULTS: "true" or "false" (default: "true")
    pub fn from_env() -> Self {
        let store_type = std::env::var("PERMISSION_STORE_TYPE")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or_default();

        let cache_ttl_secs = std::env::var("PERMISSION_STORE_CACHE_TTL")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or_else(default_cache_ttl);

        let seed_defaults = std::env::var("PERMISSION_STORE_SEED_DEFAULTS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or_else(default_seed_defaults);

        Self {
            store_type,
            cache_ttl_secs,
            seed_defaults,
        }
    }
}

// ===== Permission Store Factory =====

/// Factory for creating permission store instances.
pub struct PermissionStoreFactory;

impl PermissionStoreFactory {
    /// Create a permission store based on the provided configuration.
    ///
    /// # Arguments
    ///
    /// * `config` - Permission store configuration
    /// * `pool` - PostgreSQL connection pool (required for database-backed store)
    ///
    /// # Returns
    ///
    /// An `Arc<dyn PermissionStore>` instance.
    ///
    /// # Example
    ///
    /// ```rust
    /// use topems_unified_core::routes::business_tools::permission_store_factory::{
    ///     PermissionStoreConfig, PermissionStoreFactory, PermissionStoreType,
    /// };
    ///
    /// # async fn example(pool: sqlx::PgPool) {
    /// let config = PermissionStoreConfig {
    ///     store_type: PermissionStoreType::Database,
    ///     ..Default::default()
    /// };
    ///
    /// let store = PermissionStoreFactory::create(&config, Some(pool));
    /// // Use the store...
    /// # }
    /// ```
    pub fn create(
        config: &PermissionStoreConfig,
        pool: Option<PgPool>,
    ) -> Arc<dyn PermissionStore> {
        match config.store_type {
            PermissionStoreType::Memory => {
                tracing::info!("Creating in-memory permission store");
                let store = if config.seed_defaults {
                    InMemoryPermissionStore::with_defaults()
                } else {
                    InMemoryPermissionStore::new()
                };
                Arc::new(store)
            }
            PermissionStoreType::Database => {
                tracing::info!("Creating database-backed permission store");
                let pool = pool.unwrap_or_else(|| {
                    panic!(
                        "PostgreSQL connection pool is required for database-backed permission store. \
                         Set PERMISSION_STORE_TYPE=memory or provide a valid database pool."
                    )
                });
                let store = DatabasePermissionStore::with_cache_ttl(pool, config.cache_ttl_secs);
                Arc::new(store)
            }
        }
    }

    /// Create a permission store from environment variables.
    ///
    /// This is a convenience method that reads configuration from environment
    /// variables and creates the appropriate permission store.
    pub fn from_env(pool: Option<PgPool>) -> Arc<dyn PermissionStore> {
        let config = PermissionStoreConfig::from_env();
        Self::create(&config, pool)
    }

    /// Create an in-memory permission store with default permissions.
    pub fn memory_with_defaults() -> Arc<dyn PermissionStore> {
        let config = PermissionStoreConfig::memory();
        Self::create(&config, None)
    }

    /// Create a database-backed permission store.
    pub fn database(pool: PgPool, cache_ttl_secs: u64) -> Arc<dyn PermissionStore> {
        let config = PermissionStoreConfig {
            store_type: PermissionStoreType::Database,
            cache_ttl_secs,
            seed_defaults: false,
        };
        Self::create(&config, Some(pool))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_store_type_default() {
        assert_eq!(PermissionStoreType::default(), PermissionStoreType::Memory);
    }

    #[test]
    fn test_permission_store_type_display() {
        assert_eq!(PermissionStoreType::Memory.to_string(), "memory");
        assert_eq!(PermissionStoreType::Database.to_string(), "database");
    }

    #[test]
    fn test_permission_store_type_from_str() {
        assert_eq!("memory".parse::<PermissionStoreType>().unwrap(), PermissionStoreType::Memory);
        assert_eq!("database".parse::<PermissionStoreType>().unwrap(), PermissionStoreType::Database);
        assert_eq!("db".parse::<PermissionStoreType>().unwrap(), PermissionStoreType::Database);
        assert_eq!("postgres".parse::<PermissionStoreType>().unwrap(), PermissionStoreType::Database);
        assert!("invalid".parse::<PermissionStoreType>().is_err());
    }

    #[test]
    fn test_permission_store_config_default() {
        let config = PermissionStoreConfig::default();
        assert_eq!(config.store_type, PermissionStoreType::Memory);
        assert_eq!(config.cache_ttl_secs, 300);
        assert!(config.seed_defaults);
    }

    #[test]
    fn test_permission_store_config_memory() {
        let config = PermissionStoreConfig::memory();
        assert_eq!(config.store_type, PermissionStoreType::Memory);
    }

    #[test]
    fn test_permission_store_config_database() {
        let config = PermissionStoreConfig::database();
        assert_eq!(config.store_type, PermissionStoreType::Database);
    }

    #[test]
    fn test_create_memory_store() {
        let config = PermissionStoreConfig::memory();
        let store = PermissionStoreFactory::create(&config, None);
        // The store should be created successfully
        // We can't easily test the concrete type, but we can verify it's not null
        let _ = store;
    }

    #[test]
    fn test_memory_with_defaults() {
        let store = PermissionStoreFactory::memory_with_defaults();
        let _ = store;
    }
}

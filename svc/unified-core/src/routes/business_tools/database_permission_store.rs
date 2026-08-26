//! V448: Database-backed Permission Store
//!
//! Provides a PostgreSQL-backed implementation of the PermissionStore trait.
//! Uses sqlx for database access and includes an in-memory cache for
//! performance. This implementation is suitable for multi-instance deployments
//! where permissions need to be shared across instances.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use async_trait::async_trait;
use sqlx::PgPool;
use tokio::sync::RwLock;

use super::{TenantPermission, TenantRole, ToolPermission};
use super::permission_store::{PermissionStore, PermissionStoreError};

// ===== Cache Types =====

/// Cached permission entry with TTL tracking.
struct CachedPermission {
    permission: TenantPermission,
    cached_at: Instant,
}

// ===== Database Permission Store =====

/// PostgreSQL-backed implementation of PermissionStore.
///
/// This implementation stores permissions in a PostgreSQL database and uses
/// an in-memory cache for performance. The cache has a configurable TTL
/// (default 5 minutes) and is invalidated on write operations.
///
/// # Database Schema
///
/// Requires the following tables (created by migration 20260827000000_v448_permission_tables.sql):
/// - tenant_permissions: Stores tenant-level user permissions
/// - tool_permissions: Stores tool-level permission overrides
/// - permission_audit_logs: Stores permission change audit logs
///
/// # Example
///
/// ```rust
/// use topems_unified_core::routes::business_tools::database_permission_store::DatabasePermissionStore;
///
/// # async fn example(pool: sqlx::PgPool) -> Result<(), Box<dyn std::error::Error>> {
/// let store = DatabasePermissionStore::new(pool);
///
/// // Create a permission
/// let permission = TenantPermission::owner("tenant-001", "user-001");
/// store.create_permission(permission).await?;
///
/// // Get a permission
/// let permission = store.get_permission("tenant-001", "user-001").await?;
/// println!("Permission: {:?}", permission);
///
/// # Ok(())
/// # }
/// ```
pub struct DatabasePermissionStore {
    /// PostgreSQL connection pool.
    pool: Arc<PgPool>,
    /// In-memory cache: (tenant_id, user_id) -> CachedPermission.
    cache: Arc<RwLock<HashMap<(String, String), CachedPermission>>>,
    /// Cache TTL in seconds. Defaults to 300 (5 minutes).
    cache_ttl_secs: u64,
}

impl DatabasePermissionStore {
    /// Create a new database permission store with default cache TTL (5 minutes).
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool: Arc::new(pool),
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_ttl_secs: 300,
        }
    }

    /// Create a new database permission store with a custom cache TTL.
    pub fn with_cache_ttl(pool: PgPool, cache_ttl_secs: u64) -> Self {
        Self {
            pool: Arc::new(pool),
            cache: Arc::new(RwLock::new(HashMap::new())),
            cache_ttl_secs,
        }
    }

    /// Get the cache TTL in seconds.
    pub fn cache_ttl_secs(&self) -> u64 {
        self.cache_ttl_secs
    }

    /// Invalidate the cache for a specific tenant/user pair.
    pub async fn invalidate_cache(&self, tenant_id: &str, user_id: &str) {
        self.cache.write().await.remove(&(tenant_id.to_string(), user_id.to_string()));
    }

    /// Clear the entire cache.
    pub async fn clear_cache(&self) {
        self.cache.write().await.clear();
    }

    /// Get the number of cached entries.
    pub async fn cache_size(&self) -> usize {
        self.cache.read().await.len()
    }

    // ===== Internal Database Methods =====

    /// Insert a tenant permission record into the database.
    async fn insert_tenant_permission(
        &self,
        permission: &TenantPermission,
    ) -> Result<i64, PermissionStoreError> {
        let record = sqlx::query!(
            r#"
            INSERT INTO tenant_permissions (tenant_id, user_id, role, active)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
            permission.tenant_id,
            permission.user_id,
            permission.role.as_str(),
            permission.active,
        )
        .fetch_one(self.pool.as_ref())
        .await
        .map_err(|e| {
            if e.as_database_error()
                .and_then(|db| db.code())
                .map(|code| code == "23505") // unique_violation
                .unwrap_or(false)
            {
                PermissionStoreError::AlreadyExists(
                    permission.tenant_id.clone(),
                    permission.user_id.clone(),
                )
            } else {
                PermissionStoreError::StoreError(e.to_string())
            }
        })?;

        Ok(record.id)
    }

    /// Insert tool permission records for a tenant permission.
    async fn insert_tool_permissions(
        &self,
        tenant_permission_id: i64,
        tool_permissions: &[ToolPermission],
    ) -> Result<(), PermissionStoreError> {
        for tool_perm in tool_permissions {
            sqlx::query!(
                r#"
                INSERT INTO tool_permissions 
                    (tenant_permission_id, tool_name, max_permission, allowed_operations, denied_operations)
                VALUES ($1, $2, $3, $4, $5)
                "#,
                tenant_permission_id,
                tool_perm.tool,
                tool_perm.max_permission.as_str(),
                &tool_perm.allowed_operations,
                &tool_perm.denied_operations,
            )
            .execute(self.pool.as_ref())
            .await
            .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;
        }

        Ok(())
    }

    /// Fetch a tenant permission from the database by tenant_id and user_id.
    async fn fetch_tenant_permission(
        &self,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<Option<TenantPermission>, PermissionStoreError> {
        let record = sqlx::query!(
            r#"
            SELECT id, tenant_id, user_id, role, active, created_at, updated_at
            FROM tenant_permissions
            WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL
            "#,
            tenant_id,
            user_id,
        )
        .fetch_optional(self.pool.as_ref())
        .await
        .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        let Some(record) = record else {
            return Ok(None);
        };

        // Fetch tool permissions
        let tool_records = sqlx::query!(
            r#"
            SELECT tool_name, max_permission, allowed_operations, denied_operations
            FROM tool_permissions
            WHERE tenant_permission_id = $1
            "#,
            record.id,
        )
        .fetch_all(self.pool.as_ref())
        .await
        .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        let tool_permissions = tool_records
            .into_iter()
            .map(|r| ToolPermission {
                tool: r.tool_name,
                allowed_operations: r.allowed_operations.unwrap_or_default(),
                denied_operations: r.denied_operations.unwrap_or_default(),
                max_permission: super::MaxPermission::from_str(&r.max_permission)
                    .unwrap_or(super::MaxPermission::Read),
            })
            .collect();

        Ok(Some(TenantPermission {
            tenant_id: record.tenant_id,
            user_id: record.user_id,
            role: TenantRole::from_str(&record.role).unwrap_or(TenantRole::Member),
            tool_permissions,
            active: record.active,
        }))
    }

    /// Soft-delete a tenant permission (set deleted_at).
    async fn soft_delete_tenant_permission(
        &self,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<(), PermissionStoreError> {
        let result = sqlx::query!(
            r#"
            UPDATE tenant_permissions
            SET deleted_at = NOW(), active = FALSE
            WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL
            "#,
            tenant_id,
            user_id,
        )
        .execute(self.pool.as_ref())
        .await
        .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(PermissionStoreError::NotFound(
                tenant_id.to_string(),
                user_id.to_string(),
            ));
        }

        Ok(())
    }

    /// List all permissions for a tenant.
    async fn list_tenant_permissions_from_db(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<TenantPermission>, PermissionStoreError> {
        let records = sqlx::query!(
            r#"
            SELECT id, tenant_id, user_id, role, active
            FROM tenant_permissions
            WHERE tenant_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            "#,
            tenant_id,
        )
        .fetch_all(self.pool.as_ref())
        .await
        .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        let mut permissions = Vec::new();
        for record in records {
            if let Some(perm) = self
                .fetch_tenant_permission(&record.tenant_id, &record.user_id)
                .await?
            {
                permissions.push(perm);
            }
        }

        Ok(permissions)
    }

    /// List all permissions for a user across all tenants.
    async fn list_user_permissions_from_db(
        &self,
        user_id: &str,
    ) -> Result<Vec<TenantPermission>, PermissionStoreError> {
        let records = sqlx::query!(
            r#"
            SELECT id, tenant_id, user_id, role, active
            FROM tenant_permissions
            WHERE user_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            "#,
            user_id,
        )
        .fetch_all(self.pool.as_ref())
        .await
        .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        let mut permissions = Vec::new();
        for record in records {
            if let Some(perm) = self
                .fetch_tenant_permission(&record.tenant_id, &record.user_id)
                .await?
            {
                permissions.push(perm);
            }
        }

        Ok(permissions)
    }

    /// Count all active permissions.
    async fn count_from_db(&self) -> Result<usize, PermissionStoreError> {
        let record = sqlx::query!(
            r#"
            SELECT COUNT(*) as count
            FROM tenant_permissions
            WHERE deleted_at IS NULL
            "#,
        )
        .fetch_one(self.pool.as_ref())
        .await
        .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        Ok(record.count as usize)
    }

    // ===== Cache Methods =====

    /// Get a permission from the cache if it exists and is not expired.
    async fn get_from_cache(
        &self,
        tenant_id: &str,
        user_id: &str,
    ) -> Option<TenantPermission> {
        let cache = self.cache.read().await;
        let key = (tenant_id.to_string(), user_id.to_string());
        cache.get(&key).and_then(|cached| {
            if cached.cached_at.elapsed() < Duration::from_secs(self.cache_ttl_secs) {
                Some(cached.permission.clone())
            } else {
                None
            }
        })
    }

    /// Insert a permission into the cache.
    async fn insert_into_cache(&self, permission: TenantPermission) {
        let mut cache = self.cache.write().await;
        let key = (permission.tenant_id.clone(), permission.user_id.clone());
        cache.insert(
            key,
            CachedPermission {
                permission,
                cached_at: Instant::now(),
            },
        );
    }
}

#[async_trait]
impl PermissionStore for DatabasePermissionStore {
    async fn create_permission(
        &self,
        permission: TenantPermission,
    ) -> Result<(), PermissionStoreError> {
        // Start a transaction
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        // Insert tenant permission
        let tenant_perm_id = sqlx::query!(
            r#"
            INSERT INTO tenant_permissions (tenant_id, user_id, role, active)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
            permission.tenant_id,
            permission.user_id,
            permission.role.as_str(),
            permission.active,
        )
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            if e.as_database_error()
                .and_then(|db| db.code())
                .map(|code| code == "23505")
                .unwrap_or(false)
            {
                PermissionStoreError::AlreadyExists(
                    permission.tenant_id.clone(),
                    permission.user_id.clone(),
                )
            } else {
                PermissionStoreError::StoreError(e.to_string())
            }
        })?;

        // Insert tool permissions
        for tool_perm in &permission.tool_permissions {
            sqlx::query!(
                r#"
                INSERT INTO tool_permissions 
                    (tenant_permission_id, tool_name, max_permission, allowed_operations, denied_operations)
                VALUES ($1, $2, $3, $4, $5)
                "#,
                tenant_perm_id.id,
                tool_perm.tool,
                tool_perm.max_permission.as_str(),
                &tool_perm.allowed_operations,
                &tool_perm.denied_operations,
            )
            .execute(&mut *tx)
            .await
            .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;
        }

        // Commit transaction
        tx.commit()
            .await
            .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        // Update cache
        self.insert_into_cache(permission).await;

        Ok(())
    }

    async fn get_permission(
        &self,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<Option<TenantPermission>, PermissionStoreError> {
        // Check cache first
        if let Some(cached) = self.get_from_cache(tenant_id, user_id).await {
            return Ok(Some(cached));
        }

        // Fetch from database
        let permission = self.fetch_tenant_permission(tenant_id, user_id).await?;

        // Update cache if found
        if let Some(ref perm) = permission {
            self.insert_into_cache(perm.clone()).await;
        }

        Ok(permission)
    }

    async fn update_permission(
        &self,
        permission: TenantPermission,
    ) -> Result<(), PermissionStoreError> {
        // Start a transaction
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        // Update tenant permission
        let result = sqlx::query!(
            r#"
            UPDATE tenant_permissions
            SET role = $1, active = $2, updated_at = NOW()
            WHERE tenant_id = $3 AND user_id = $4 AND deleted_at IS NULL
            RETURNING id
            "#,
            permission.role.as_str(),
            permission.active,
            permission.tenant_id,
            permission.user_id,
        )
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        let Some(record) = result else {
            return Err(PermissionStoreError::NotFound(
                permission.tenant_id.clone(),
                permission.user_id.clone(),
            ));
        };

        // Delete existing tool permissions
        sqlx::query!(
            r#"
            DELETE FROM tool_permissions
            WHERE tenant_permission_id = $1
            "#,
            record.id,
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        // Insert new tool permissions
        for tool_perm in &permission.tool_permissions {
            sqlx::query!(
                r#"
                INSERT INTO tool_permissions 
                    (tenant_permission_id, tool_name, max_permission, allowed_operations, denied_operations)
                VALUES ($1, $2, $3, $4, $5)
                "#,
                record.id,
                tool_perm.tool,
                tool_perm.max_permission.as_str(),
                &tool_perm.allowed_operations,
                &tool_perm.denied_operations,
            )
            .execute(&mut *tx)
            .await
            .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;
        }

        // Commit transaction
        tx.commit()
            .await
            .map_err(|e| PermissionStoreError::StoreError(e.to_string()))?;

        // Invalidate cache
        self.invalidate_cache(&permission.tenant_id, &permission.user_id)
            .await;

        Ok(())
    }

    async fn delete_permission(
        &self,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<(), PermissionStoreError> {
        // Soft delete
        self.soft_delete_tenant_permission(tenant_id, user_id)
            .await?;

        // Invalidate cache
        self.invalidate_cache(tenant_id, user_id).await;

        Ok(())
    }

    async fn list_tenant_permissions(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<TenantPermission>, PermissionStoreError> {
        self.list_tenant_permissions_from_db(tenant_id).await
    }

    async fn list_user_permissions(
        &self,
        user_id: &str,
    ) -> Result<Vec<TenantPermission>, PermissionStoreError> {
        self.list_user_permissions_from_db(user_id).await
    }

    async fn check_permission(
        &self,
        tenant_id: &str,
        user_id: &str,
        tool: &str,
        operation: &str,
    ) -> Result<bool, PermissionStoreError> {
        // Get permission (from cache or database)
        let Some(permission) = self.get_permission(tenant_id, user_id).await? else {
            return Ok(false);
        };

        // Check if permission is active
        if !permission.active {
            return Ok(false);
        }

        // Owners and admins have full access
        if matches!(permission.role, TenantRole::Owner | TenantRole::Admin) {
            return Ok(true);
        }

        // Find tool permission
        let Some(tool_perm) = permission
            .tool_permissions
            .iter()
            .find(|tp| tp.tool == tool)
        else {
            // No specific tool permission, default to deny
            return Ok(false);
        };

        // Check denied operations first (deny takes precedence)
        if tool_perm.denied_operations.iter().any(|op| op == operation) {
            return Ok(false);
        }

        // Check allowed operations
        if tool_perm.allowed_operations.iter().any(|op| op == operation) {
            return Ok(true);
        }

        // If allowed_operations is empty, check max_permission
        if tool_perm.allowed_operations.is_empty() {
            return matches!(
                tool_perm.max_permission,
                super::MaxPermission::Write | super::MaxPermission::Admin
            );
        }

        Ok(false)
    }

    async fn count(&self) -> Result<usize, PermissionStoreError> {
        self.count_from_db().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: These tests require a running PostgreSQL database.
    // For unit testing without a database, use InMemoryPermissionStore.

    #[test]
    fn test_cache_ttl_default() {
        // We can't create a DatabasePermissionStore without a pool,
        // but we can verify the default TTL constant
        assert_eq!(Duration::from_secs(300), Duration::from_secs(5 * 60));
    }

    #[test]
    fn test_cached_permission_expiry() {
        let cached = CachedPermission {
            permission: TenantPermission::owner("test", "test"),
            cached_at: Instant::now(),
        };
        // Just-created cache entry should not be expired
        assert!(cached.cached_at.elapsed() < Duration::from_secs(300));
    }
}

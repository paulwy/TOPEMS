//! V444: Business Tools Permission Store
//!
//! Provides a permission store trait and in-memory implementation for
//! persisting tenant-based permission configurations. This serves as a
//! foundation for future database-backed persistence.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use super::TenantPermission;

// ===== Permission Store Errors =====

#[derive(Debug, Error)]
pub enum PermissionStoreError {
    #[error("Permission not found: tenant={0}, user={1}")]
    NotFound(String, String),

    #[error("Permission already exists: tenant={0}, user={1}")]
    AlreadyExists(String, String),

    #[error("Invalid permission: {0}")]
    Invalid(String),

    #[error("Store error: {0}")]
    StoreError(String),
}

// ===== Permission Store Trait =====

/// Trait for persisting and retrieving tenant-based permission configurations.
#[async_trait]
pub trait PermissionStore: Send + Sync {
    /// Create a new permission configuration.
    async fn create_permission(
        &self,
        permission: TenantPermission,
    ) -> Result<(), PermissionStoreError>;

    /// Get a permission configuration by tenant ID and user ID.
    async fn get_permission(
        &self,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<Option<TenantPermission>, PermissionStoreError>;

    /// Update an existing permission configuration.
    async fn update_permission(
        &self,
        permission: TenantPermission,
    ) -> Result<(), PermissionStoreError>;

    /// Delete a permission configuration.
    async fn delete_permission(
        &self,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<(), PermissionStoreError>;

    /// List all permissions for a tenant.
    async fn list_tenant_permissions(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<TenantPermission>, PermissionStoreError>;

    /// List all permissions for a user across all tenants.
    async fn list_user_permissions(
        &self,
        user_id: &str,
    ) -> Result<Vec<TenantPermission>, PermissionStoreError>;

    /// Check if a user can perform an operation on a tool.
    async fn check_permission(
        &self,
        tenant_id: &str,
        user_id: &str,
        tool: &str,
        operation: &str,
    ) -> Result<bool, PermissionStoreError>;

    /// Get the number of stored permissions.
    async fn count(&self) -> Result<usize, PermissionStoreError>;
}

// ===== In-Memory Permission Store =====

/// In-memory implementation of PermissionStore.
///
/// This implementation stores permissions in memory and is suitable for
/// testing and single-instance deployments. For multi-instance deployments,
/// use a database-backed implementation.
pub struct InMemoryPermissionStore {
    /// Permissions stored as (tenant_id, user_id) -> TenantPermission.
    permissions: Arc<std::sync::Mutex<HashMap<(String, String), TenantPermission>>>,
}

impl InMemoryPermissionStore {
    /// Create a new empty in-memory permission store.
    pub fn new() -> Self {
        Self {
            permissions: Arc::new(std::sync::Mutex::new(HashMap::new())),
        }
    }

    /// Create an in-memory permission store with default permissions.
    pub fn with_defaults() -> Self {
        let store = Self::new();

        // Add a default owner permission for the default tenant
        let default_permission = TenantPermission::owner("default", "admin");
        store.permissions.lock().unwrap().insert(
            ("default".to_string(), "admin".to_string()),
            default_permission,
        );

        store
    }

    /// Get a permission by key (synchronous, for internal use).
    fn get_internal(&self, tenant_id: &str, user_id: &str) -> Option<TenantPermission> {
        self.permissions
            .lock()
            .unwrap()
            .get(&(tenant_id.to_string(), user_id.to_string()))
            .cloned()
    }
}

impl Default for InMemoryPermissionStore {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl PermissionStore for InMemoryPermissionStore {
    async fn create_permission(
        &self,
        permission: TenantPermission,
    ) -> Result<(), PermissionStoreError> {
        let key = (permission.tenant_id.clone(), permission.user_id.clone());

        let mut permissions = self.permissions.lock().unwrap();
        if permissions.contains_key(&key) {
            return Err(PermissionStoreError::AlreadyExists(
                permission.tenant_id,
                permission.user_id,
            ));
        }

        permissions.insert(key, permission);
        Ok(())
    }

    async fn get_permission(
        &self,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<Option<TenantPermission>, PermissionStoreError> {
        Ok(self.get_internal(tenant_id, user_id))
    }

    async fn update_permission(
        &self,
        permission: TenantPermission,
    ) -> Result<(), PermissionStoreError> {
        let key = (permission.tenant_id.clone(), permission.user_id.clone());

        let mut permissions = self.permissions.lock().unwrap();
        if !permissions.contains_key(&key) {
            return Err(PermissionStoreError::NotFound(
                permission.tenant_id,
                permission.user_id,
            ));
        }

        permissions.insert(key, permission);
        Ok(())
    }

    async fn delete_permission(
        &self,
        tenant_id: &str,
        user_id: &str,
    ) -> Result<(), PermissionStoreError> {
        let key = (tenant_id.to_string(), user_id.to_string());

        let mut permissions = self.permissions.lock().unwrap();
        if permissions.remove(&key).is_none() {
            return Err(PermissionStoreError::NotFound(
                tenant_id.to_string(),
                user_id.to_string(),
            ));
        }

        Ok(())
    }

    async fn list_tenant_permissions(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<TenantPermission>, PermissionStoreError> {
        let permissions = self.permissions.lock().unwrap();
        Ok(permissions
            .values()
            .filter(|p| p.tenant_id == tenant_id)
            .cloned()
            .collect())
    }

    async fn list_user_permissions(
        &self,
        user_id: &str,
    ) -> Result<Vec<TenantPermission>, PermissionStoreError> {
        let permissions = self.permissions.lock().unwrap();
        Ok(permissions
            .values()
            .filter(|p| p.user_id == user_id)
            .cloned()
            .collect())
    }

    async fn check_permission(
        &self,
        tenant_id: &str,
        user_id: &str,
        tool: &str,
        operation: &str,
    ) -> Result<bool, PermissionStoreError> {
        match self.get_internal(tenant_id, user_id) {
            Some(permission) => Ok(permission.can_perform(tool, operation)),
            None => Ok(false),
        }
    }

    async fn count(&self) -> Result<usize, PermissionStoreError> {
        Ok(self.permissions.lock().unwrap().len())
    }
}

// ===== Permission Store Factory =====

/// Factory for creating permission store instances.
pub struct PermissionStoreFactory;

impl PermissionStoreFactory {
    /// Create an in-memory permission store.
    pub fn in_memory() -> InMemoryPermissionStore {
        InMemoryPermissionStore::new()
    }

    /// Create an in-memory permission store with default permissions.
    pub fn in_memory_with_defaults() -> InMemoryPermissionStore {
        InMemoryPermissionStore::with_defaults()
    }
}

// ===== Permission Store Summary =====

/// Summary of permission store statistics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionStoreSummary {
    /// Total number of stored permissions.
    pub total_permissions: usize,
    /// Number of unique tenants.
    pub unique_tenants: usize,
    /// Number of unique users.
    pub unique_users: usize,
    /// Role distribution.
    pub role_distribution: HashMap<String, usize>,
    /// Active users count.
    pub active_users: usize,
    /// Inactive users count.
    pub inactive_users: usize,
}

impl InMemoryPermissionStore {
    /// Get a summary of the permission store statistics.
    pub fn summary(&self) -> PermissionStoreSummary {
        let permissions = self.permissions.lock().unwrap();

        let mut unique_tenants = std::collections::HashSet::new();
        let mut unique_users = std::collections::HashSet::new();
        let mut role_distribution = HashMap::new();
        let mut active_users = 0;
        let mut inactive_users = 0;

        for permission in permissions.values() {
            unique_tenants.insert(permission.tenant_id.clone());
            unique_users.insert(permission.user_id.clone());

            *role_distribution
                .entry(permission.role.as_str().to_string())
                .or_insert(0) += 1;

            if permission.active {
                active_users += 1;
            } else {
                inactive_users += 1;
            }
        }

        PermissionStoreSummary {
            total_permissions: permissions.len(),
            unique_tenants: unique_tenants.len(),
            unique_users: unique_users.len(),
            role_distribution,
            active_users,
            inactive_users,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::TenantRole;
    use super::*;

    #[tokio::test]
    async fn test_create_and_get_permission() {
        let store = InMemoryPermissionStore::new();
        let permission = TenantPermission::owner("tenant1", "user1");

        store.create_permission(permission.clone()).await.unwrap();

        let retrieved = store
            .get_permission("tenant1", "user1")
            .await
            .unwrap()
            .unwrap();

        assert_eq!(retrieved.tenant_id, "tenant1");
        assert_eq!(retrieved.user_id, "user1");
        assert!(matches!(retrieved.role, TenantRole::Owner));
    }

    #[tokio::test]
    async fn test_duplicate_permission_error() {
        let store = InMemoryPermissionStore::new();
        let permission = TenantPermission::owner("tenant1", "user1");

        store.create_permission(permission.clone()).await.unwrap();

        let result = store.create_permission(permission).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_update_permission() {
        let store = InMemoryPermissionStore::new();
        let mut permission = TenantPermission::owner("tenant1", "user1");

        store.create_permission(permission.clone()).await.unwrap();

        permission.active = false;
        store.update_permission(permission.clone()).await.unwrap();

        let retrieved = store
            .get_permission("tenant1", "user1")
            .await
            .unwrap()
            .unwrap();

        assert!(!retrieved.active);
    }

    #[tokio::test]
    async fn test_delete_permission() {
        let store = InMemoryPermissionStore::new();
        let permission = TenantPermission::owner("tenant1", "user1");

        store.create_permission(permission).await.unwrap();
        store.delete_permission("tenant1", "user1").await.unwrap();

        let retrieved = store.get_permission("tenant1", "user1").await.unwrap();
        assert!(retrieved.is_none());
    }

    #[tokio::test]
    async fn test_check_permission() {
        let store = InMemoryPermissionStore::new();
        let permission = TenantPermission::owner("tenant1", "user1");

        store.create_permission(permission).await.unwrap();

        // Owner should have all permissions
        let can_create = store
            .check_permission("tenant1", "user1", "crm", "create_customer")
            .await
            .unwrap();
        assert!(can_create);

        // Non-existent user should not have permissions
        let no_permission = store
            .check_permission("tenant1", "user2", "crm", "create_customer")
            .await
            .unwrap();
        assert!(!no_permission);
    }

    #[tokio::test]
    async fn test_list_tenant_permissions() {
        let store = InMemoryPermissionStore::new();

        store
            .create_permission(TenantPermission::owner("tenant1", "user1"))
            .await
            .unwrap();
        store
            .create_permission(TenantPermission {
                tenant_id: "tenant1".to_string(),
                user_id: "user2".to_string(),
                role: TenantRole::Member,
                tool_permissions: Vec::new(),
                active: true,
            })
            .await
            .unwrap();
        store
            .create_permission(TenantPermission::owner("tenant2", "user3"))
            .await
            .unwrap();

        let tenant1_permissions = store.list_tenant_permissions("tenant1").await.unwrap();
        assert_eq!(tenant1_permissions.len(), 2);

        let tenant2_permissions = store.list_tenant_permissions("tenant2").await.unwrap();
        assert_eq!(tenant2_permissions.len(), 1);
    }

    #[tokio::test]
    async fn test_count() {
        let store = InMemoryPermissionStore::new();

        assert_eq!(store.count().await.unwrap(), 0);

        store
            .create_permission(TenantPermission::owner("tenant1", "user1"))
            .await
            .unwrap();

        assert_eq!(store.count().await.unwrap(), 1);
    }

    #[test]
    fn test_summary() {
        let store = InMemoryPermissionStore::with_defaults();

        let summary = store.summary();
        assert_eq!(summary.total_permissions, 1);
        assert_eq!(summary.unique_tenants, 1);
        assert_eq!(summary.unique_users, 1);
        assert_eq!(summary.active_users, 1);
        assert_eq!(summary.inactive_users, 0);
    }
}

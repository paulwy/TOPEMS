//! V454: Business Tools Permission Audit Log
//!
//! Provides audit logging for permission changes. Records all create, update,
//! delete, activate, deactivate, and role change operations with before/after
//! snapshots, actor information, and timestamps.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use super::{TenantPermission, TenantRole};

// ===== Audit Log Types =====

/// Type of permission audit action.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditAction {
    /// A new permission was created.
    Create,
    /// An existing permission was updated.
    Update,
    /// A permission was deleted.
    Delete,
    /// A permission was activated.
    Activate,
    /// A permission was deactivated.
    Deactivate,
    /// A user's role was changed.
    RoleChange,
    /// A permission check was performed (optional logging).
    Check,
}

impl std::fmt::Display for AuditAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Create => write!(f, "create"),
            Self::Update => write!(f, "update"),
            Self::Delete => write!(f, "delete"),
            Self::Activate => write!(f, "activate"),
            Self::Deactivate => write!(f, "deactivate"),
            Self::RoleChange => write!(f, "role_change"),
            Self::Check => write!(f, "check"),
        }
    }
}

impl std::str::FromStr for AuditAction {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "create" => Ok(Self::Create),
            "update" => Ok(Self::Update),
            "delete" => Ok(Self::Delete),
            "activate" => Ok(Self::Activate),
            "deactivate" => Ok(Self::Deactivate),
            "role_change" | "rolechange" => Ok(Self::RoleChange),
            "check" => Ok(Self::Check),
            _ => Err(format!("Unknown audit action: {}", s)),
        }
    }
}

/// A single permission audit log entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    /// Unique entry ID.
    pub id: String,
    /// Tenant ID.
    pub tenant_id: String,
    /// User ID whose permission was changed.
    pub user_id: String,
    /// Action performed.
    pub action: AuditAction,
    /// Permission state before the change (JSON-serialized).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_value: Option<serde_json::Value>,
    /// Permission state after the change (JSON-serialized).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_value: Option<serde_json::Value>,
    /// ID of the user/actor who performed the change.
    pub changed_by: String,
    /// Timestamp of the change (RFC3339).
    pub changed_at: String,
    /// IP address of the actor (optional).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_address: Option<String>,
    /// User agent of the actor (optional).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_agent: Option<String>,
    /// Additional metadata (optional).
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub metadata: HashMap<String, String>,
}

/// Request to query audit logs.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AuditLogQuery {
    /// Filter by tenant ID (optional).
    #[serde(default)]
    pub tenant_id: Option<String>,
    /// Filter by user ID (optional).
    #[serde(default)]
    pub user_id: Option<String>,
    /// Filter by action (optional).
    #[serde(default)]
    pub action: Option<String>,
    /// Filter by actor (optional).
    #[serde(default)]
    pub changed_by: Option<String>,
    /// Start time (RFC3339, optional).
    #[serde(default)]
    pub start_time: Option<String>,
    /// End time (RFC3339, optional).
    #[serde(default)]
    pub end_time: Option<String>,
    /// Maximum number of results to return. Defaults to 100.
    #[serde(default = "default_limit")]
    pub limit: usize,
    /// Offset for pagination. Defaults to 0.
    #[serde(default)]
    pub offset: usize,
}

fn default_limit() -> usize {
    100
}

impl Default for AuditLogQuery {
    fn default() -> Self {
        Self {
            tenant_id: None,
            user_id: None,
            action: None,
            changed_by: None,
            start_time: None,
            end_time: None,
            limit: default_limit(),
            offset: 0,
        }
    }
}

/// Response for audit log queries.
#[derive(Debug, Clone, Serialize)]
pub struct AuditLogResponse {
    /// Total number of matching entries.
    pub total: usize,
    /// Number of entries returned in this page.
    pub count: usize,
    /// Offset of the first entry.
    pub offset: usize,
    /// Limit used for this query.
    pub limit: usize,
    /// Audit log entries.
    pub entries: Vec<AuditLogEntry>,
}

// ===== Audit Log Store Trait =====

/// Trait for storing and querying permission audit logs.
#[async_trait]
pub trait AuditLogStore: Send + Sync {
    /// Record an audit log entry.
    async fn record(&self, entry: AuditLogEntry) -> Result<(), AuditLogError>;

    /// Query audit logs with filters.
    async fn query(&self, query: &AuditLogQuery) -> Result<AuditLogResponse, AuditLogError>;

    /// Get a single audit log entry by ID.
    async fn get_by_id(&self, id: &str) -> Result<Option<AuditLogEntry>, AuditLogError>;

    /// Get the total number of audit log entries.
    async fn count(&self) -> Result<usize, AuditLogError>;
}

/// Errors that can occur in audit log operations.
#[derive(Debug, thiserror::Error)]
pub enum AuditLogError {
    #[error("Audit log not found: {0}")]
    NotFound(String),

    #[error("Invalid query: {0}")]
    InvalidQuery(String),

    #[error("Store error: {0}")]
    StoreError(String),
}

// ===== In-Memory Audit Log Store =====

/// In-memory implementation of AuditLogStore.
///
/// Suitable for testing and single-instance deployments. For multi-instance
/// deployments, use a database-backed implementation.
pub struct InMemoryAuditLogStore {
    entries: Arc<RwLock<Vec<AuditLogEntry>>>,
}

impl InMemoryAuditLogStore {
    /// Create a new empty in-memory audit log store.
    pub fn new() -> Self {
        Self {
            entries: Arc::new(RwLock::new(Vec::new())),
        }
    }
}

impl Default for InMemoryAuditLogStore {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AuditLogStore for InMemoryAuditLogStore {
    async fn record(&self, entry: AuditLogEntry) -> Result<(), AuditLogError> {
        let mut entries = self.entries.write().await;
        entries.push(entry);
        Ok(())
    }

    async fn query(&self, query: &AuditLogQuery) -> Result<AuditLogResponse, AuditLogError> {
        let entries = self.entries.read().await;

        // Filter entries
        let mut filtered: Vec<&AuditLogEntry> = entries
            .iter()
            .filter(|entry| {
                if let Some(tenant_id) = &query.tenant_id {
                    if &entry.tenant_id != tenant_id {
                        return false;
                    }
                }
                if let Some(user_id) = &query.user_id {
                    if &entry.user_id != user_id {
                        return false;
                    }
                }
                if let Some(action) = &query.action {
                    if entry.action.to_string() != *action {
                        return false;
                    }
                }
                if let Some(changed_by) = &query.changed_by {
                    if &entry.changed_by != changed_by {
                        return false;
                    }
                }
                if let Some(start_time) = &query.start_time {
                    if &entry.changed_at < start_time {
                        return false;
                    }
                }
                if let Some(end_time) = &query.end_time {
                    if &entry.changed_at > end_time {
                        return false;
                    }
                }
                true
            })
            .collect();

        // Sort by changed_at descending (newest first)
        filtered.sort_by(|a, b| b.changed_at.cmp(&a.changed_at));

        let total = filtered.len();

        // Apply pagination
        let start = query.offset.min(total);
        let end = (start + query.limit).min(total);
        let page: Vec<AuditLogEntry> = filtered[start..end]
            .iter()
            .map(|e| (*e).clone())
            .collect();

        Ok(AuditLogResponse {
            total,
            count: page.len(),
            offset: query.offset,
            limit: query.limit,
            entries: page,
        })
    }

    async fn get_by_id(&self, id: &str) -> Result<Option<AuditLogEntry>, AuditLogError> {
        let entries = self.entries.read().await;
        Ok(entries.iter().find(|e| e.id == id).cloned())
    }

    async fn count(&self) -> Result<usize, AuditLogError> {
        Ok(self.entries.read().await.len())
    }
}

// ===== Audit Log Helper =====

/// Helper for creating audit log entries.
pub struct AuditLogger<S: AuditLogStore> {
    store: Arc<S>,
}

impl<S: AuditLogStore> AuditLogger<S> {
    /// Create a new audit logger.
    pub fn new(store: Arc<S>) -> Self {
        Self { store }
    }

    /// Generate a unique entry ID.
    fn generate_id() -> String {
        use std::time::{SystemTime, UNIX_EPOCH};
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        format!("audit-{}-{}", nanos, uuid::Uuid::new_v4())
    }

    /// Log a permission creation.
    pub async fn log_create(
        &self,
        permission: &TenantPermission,
        changed_by: &str,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) -> Result<(), AuditLogError> {
        let entry = AuditLogEntry {
            id: Self::generate_id(),
            tenant_id: permission.tenant_id.clone(),
            user_id: permission.user_id.clone(),
            action: AuditAction::Create,
            old_value: None,
            new_value: Some(serde_json::to_value(permission).unwrap_or(serde_json::Value::Null)),
            changed_by: changed_by.to_string(),
            changed_at: chrono::Utc::now().to_rfc3339(),
            ip_address: ip_address.map(|s| s.to_string()),
            user_agent: user_agent.map(|s| s.to_string()),
            metadata: HashMap::new(),
        };
        self.store.record(entry).await
    }

    /// Log a permission update.
    pub async fn log_update(
        &self,
        old_permission: &TenantPermission,
        new_permission: &TenantPermission,
        changed_by: &str,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) -> Result<(), AuditLogError> {
        let action = if old_permission.role != new_permission.role {
            AuditAction::RoleChange
        } else {
            AuditAction::Update
        };

        let entry = AuditLogEntry {
            id: Self::generate_id(),
            tenant_id: new_permission.tenant_id.clone(),
            user_id: new_permission.user_id.clone(),
            action,
            old_value: Some(serde_json::to_value(old_permission).unwrap_or(serde_json::Value::Null)),
            new_value: Some(serde_json::to_value(new_permission).unwrap_or(serde_json::Value::Null)),
            changed_by: changed_by.to_string(),
            changed_at: chrono::Utc::now().to_rfc3339(),
            ip_address: ip_address.map(|s| s.to_string()),
            user_agent: user_agent.map(|s| s.to_string()),
            metadata: HashMap::new(),
        };
        self.store.record(entry).await
    }

    /// Log a permission deletion.
    pub async fn log_delete(
        &self,
        permission: &TenantPermission,
        changed_by: &str,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) -> Result<(), AuditLogError> {
        let entry = AuditLogEntry {
            id: Self::generate_id(),
            tenant_id: permission.tenant_id.clone(),
            user_id: permission.user_id.clone(),
            action: AuditAction::Delete,
            old_value: Some(serde_json::to_value(permission).unwrap_or(serde_json::Value::Null)),
            new_value: None,
            changed_by: changed_by.to_string(),
            changed_at: chrono::Utc::now().to_rfc3339(),
            ip_address: ip_address.map(|s| s.to_string()),
            user_agent: user_agent.map(|s| s.to_string()),
            metadata: HashMap::new(),
        };
        self.store.record(entry).await
    }

    /// Log a permission activation/deactivation.
    pub async fn log_activation(
        &self,
        permission: &TenantPermission,
        activated: bool,
        changed_by: &str,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) -> Result<(), AuditLogError> {
        let entry = AuditLogEntry {
            id: Self::generate_id(),
            tenant_id: permission.tenant_id.clone(),
            user_id: permission.user_id.clone(),
            action: if activated { AuditAction::Activate } else { AuditAction::Deactivate },
            old_value: None,
            new_value: Some(serde_json::to_value(permission).unwrap_or(serde_json::Value::Null)),
            changed_by: changed_by.to_string(),
            changed_at: chrono::Utc::now().to_rfc3339(),
            ip_address: ip_address.map(|s| s.to_string()),
            user_agent: user_agent.map(|s| s.to_string()),
            metadata: HashMap::new(),
        };
        self.store.record(entry).await
    }

    /// Query audit logs.
    pub async fn query(&self, query: &AuditLogQuery) -> Result<AuditLogResponse, AuditLogError> {
        self.store.query(query).await
    }

    /// Get an audit log entry by ID.
    pub async fn get_by_id(&self, id: &str) -> Result<Option<AuditLogEntry>, AuditLogError> {
        self.store.get_by_id(id).await
    }

    /// Get the total number of audit log entries.
    pub async fn count(&self) -> Result<usize, AuditLogError> {
        self.store.count().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_action_display() {
        assert_eq!(AuditAction::Create.to_string(), "create");
        assert_eq!(AuditAction::Update.to_string(), "update");
        assert_eq!(AuditAction::Delete.to_string(), "delete");
        assert_eq!(AuditAction::Activate.to_string(), "activate");
        assert_eq!(AuditAction::Deactivate.to_string(), "deactivate");
        assert_eq!(AuditAction::RoleChange.to_string(), "role_change");
        assert_eq!(AuditAction::Check.to_string(), "check");
    }

    #[test]
    fn test_audit_action_from_str() {
        assert_eq!("create".parse::<AuditAction>().unwrap(), AuditAction::Create);
        assert_eq!("update".parse::<AuditAction>().unwrap(), AuditAction::Update);
        assert_eq!("delete".parse::<AuditAction>().unwrap(), AuditAction::Delete);
        assert_eq!("activate".parse::<AuditAction>().unwrap(), AuditAction::Activate);
        assert_eq!("deactivate".parse::<AuditAction>().unwrap(), AuditAction::Deactivate);
        assert_eq!("role_change".parse::<AuditAction>().unwrap(), AuditAction::RoleChange);
        assert!("invalid".parse::<AuditAction>().is_err());
    }

    #[test]
    fn test_audit_log_query_default() {
        let query = AuditLogQuery::default();
        assert_eq!(query.limit, 100);
        assert_eq!(query.offset, 0);
        assert!(query.tenant_id.is_none());
    }

    #[tokio::test]
    async fn test_in_memory_store_record_and_query() {
        let store = InMemoryAuditLogStore::new();
        let logger = AuditLogger::new(Arc::new(store));

        let permission = TenantPermission::owner("tenant-1", "user-1");
        logger.log_create(&permission, "admin", Some("127.0.0.1"), Some("test-agent")).await.unwrap();

        let count = logger.count().await.unwrap();
        assert_eq!(count, 1);

        let query = AuditLogQuery::default();
        let response = logger.query(&query).await.unwrap();
        assert_eq!(response.total, 1);
        assert_eq!(response.count, 1);
        assert_eq!(response.entries[0].action, AuditAction::Create);
        assert_eq!(response.entries[0].tenant_id, "tenant-1");
        assert_eq!(response.entries[0].user_id, "user-1");
    }

    #[tokio::test]
    async fn test_in_memory_store_filter_by_tenant() {
        let store = InMemoryAuditLogStore::new();
        let logger = AuditLogger::new(Arc::new(store));

        let perm1 = TenantPermission::owner("tenant-1", "user-1");
        let perm2 = TenantPermission::owner("tenant-2", "user-2");
        logger.log_create(&perm1, "admin", None, None).await.unwrap();
        logger.log_create(&perm2, "admin", None, None).await.unwrap();

        let query = AuditLogQuery {
            tenant_id: Some("tenant-1".to_string()),
            ..Default::default()
        };
        let response = logger.query(&query).await.unwrap();
        assert_eq!(response.total, 1);
        assert_eq!(response.entries[0].tenant_id, "tenant-1");
    }

    #[tokio::test]
    async fn test_in_memory_store_pagination() {
        let store = InMemoryAuditLogStore::new();
        let logger = AuditLogger::new(Arc::new(store));

        for i in 0..5 {
            let perm = TenantPermission::owner("tenant-1", &format!("user-{}", i));
            logger.log_create(&perm, "admin", None, None).await.unwrap();
        }

        let query = AuditLogQuery {
            limit: 2,
            offset: 0,
            ..Default::default()
        };
        let response = logger.query(&query).await.unwrap();
        assert_eq!(response.total, 5);
        assert_eq!(response.count, 2);

        let query = AuditLogQuery {
            limit: 2,
            offset: 4,
            ..Default::default()
        };
        let response = logger.query(&query).await.unwrap();
        assert_eq!(response.count, 1);
    }

    #[tokio::test]
    async fn test_log_update_detects_role_change() {
        let store = InMemoryAuditLogStore::new();
        let logger = AuditLogger::new(Arc::new(store));

        let old_perm = TenantPermission::member("tenant-1", "user-1");
        let new_perm = TenantPermission::admin("tenant-1", "user-1");
        logger.log_update(&old_perm, &new_perm, "admin", None, None).await.unwrap();

        let response = logger.query(&AuditLogQuery::default()).await.unwrap();
        assert_eq!(response.entries[0].action, AuditAction::RoleChange);
    }

    #[tokio::test]
    async fn test_log_delete() {
        let store = InMemoryAuditLogStore::new();
        let logger = AuditLogger::new(Arc::new(store));

        let perm = TenantPermission::owner("tenant-1", "user-1");
        logger.log_delete(&perm, "admin", None, None).await.unwrap();

        let response = logger.query(&AuditLogQuery::default()).await.unwrap();
        assert_eq!(response.entries[0].action, AuditAction::Delete);
        assert!(response.entries[0].old_value.is_some());
        assert!(response.entries[0].new_value.is_none());
    }

    #[tokio::test]
    async fn test_get_by_id() {
        let store = InMemoryAuditLogStore::new();
        let logger = AuditLogger::new(Arc::new(store));

        let perm = TenantPermission::owner("tenant-1", "user-1");
        logger.log_create(&perm, "admin", None, None).await.unwrap();

        let response = logger.query(&AuditLogQuery::default()).await.unwrap();
        let id = &response.entries[0].id;

        let entry = logger.get_by_id(id).await.unwrap();
        assert!(entry.is_some());
        assert_eq!(entry.unwrap().id, *id);
    }
}

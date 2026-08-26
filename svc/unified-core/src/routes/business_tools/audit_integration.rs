//! V458: Permission Audit Log Integration
//!
//! Provides helper functions for integrating audit logging into permission
//! management API endpoints. Extracts actor information from request headers
//! and records audit log entries for create, update, and delete operations.

use std::collections::HashMap;
use std::sync::Arc;

use axum::http::HeaderMap;

use super::permission_audit_log::{
    AuditAction, AuditLogEntry, AuditLogStore, AuditLogger, InMemoryAuditLogStore,
};
use super::{TenantPermission};

// ===== Actor Information =====

/// Information about the actor performing a permission change.
#[derive(Debug, Clone)]
pub struct ActorInfo {
    /// ID of the user/actor performing the change.
    pub changed_by: String,
    /// IP address of the actor (optional).
    pub ip_address: Option<String>,
    /// User agent of the actor (optional).
    pub user_agent: Option<String>,
}

impl ActorInfo {
    /// Create actor info from request headers.
    ///
    /// Extracts:
    /// - X-User-ID or X-Actor-ID header for changed_by
    /// - X-Forwarded-For or X-Real-IP header for ip_address
    /// - User-Agent header for user_agent
    pub fn from_headers(headers: &HeaderMap) -> Self {
        let changed_by = headers
            .get("x-user-id")
            .or_else(|| headers.get("x-actor-id"))
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "system".to_string());

        let ip_address = headers
            .get("x-forwarded-for")
            .or_else(|| headers.get("x-real-ip"))
            .and_then(|v| v.to_str().ok())
            .map(|s| {
                // X-Forwarded-For may contain multiple IPs, take the first one
                s.split(',').next().unwrap_or(s).trim().to_string()
            });

        let user_agent = headers
            .get("user-agent")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        Self {
            changed_by,
            ip_address,
            user_agent,
        }
    }
}

impl Default for ActorInfo {
    fn default() -> Self {
        Self {
            changed_by: "system".to_string(),
            ip_address: None,
            user_agent: None,
        }
    }
}

// ===== Audit Log Recorder =====

/// Recorder for permission audit logs.
///
/// Wraps an AuditLogStore and provides convenience methods for recording
/// permission create, update, and delete operations.
pub struct PermissionAuditRecorder<S: AuditLogStore> {
    logger: AuditLogger<S>,
}

impl<S: AuditLogStore> PermissionAuditRecorder<S> {
    /// Create a new permission audit recorder.
    pub fn new(store: Arc<S>) -> Self {
        Self {
            logger: AuditLogger::new(store),
        }
    }

    /// Record a permission creation.
    pub async fn record_create(
        &self,
        permission: &TenantPermission,
        actor: &ActorInfo,
    ) -> Result<(), String> {
        self.logger
            .log_create(
                permission,
                &actor.changed_by,
                actor.ip_address.as_deref(),
                actor.user_agent.as_deref(),
            )
            .await
            .map_err(|e| format!("Failed to record create audit log: {}", e))
    }

    /// Record a permission update.
    pub async fn record_update(
        &self,
        old_permission: &TenantPermission,
        new_permission: &TenantPermission,
        actor: &ActorInfo,
    ) -> Result<(), String> {
        self.logger
            .log_update(
                old_permission,
                new_permission,
                &actor.changed_by,
                actor.ip_address.as_deref(),
                actor.user_agent.as_deref(),
            )
            .await
            .map_err(|e| format!("Failed to record update audit log: {}", e))
    }

    /// Record a permission deletion.
    pub async fn record_delete(
        &self,
        permission: &TenantPermission,
        actor: &ActorInfo,
    ) -> Result<(), String> {
        self.logger
            .log_delete(
                permission,
                &actor.changed_by,
                actor.ip_address.as_deref(),
                actor.user_agent.as_deref(),
            )
            .await
            .map_err(|e| format!("Failed to record delete audit log: {}", e))
    }

    /// Record a permission activation/deactivation.
    pub async fn record_activation(
        &self,
        permission: &TenantPermission,
        activated: bool,
        actor: &ActorInfo,
    ) -> Result<(), String> {
        self.logger
            .log_activation(
                permission,
                activated,
                &actor.changed_by,
                actor.ip_address.as_deref(),
                actor.user_agent.as_deref(),
            )
            .await
            .map_err(|e| format!("Failed to record activation audit log: {}", e))
    }

    /// Get the underlying audit logger.
    pub fn logger(&self) -> &AuditLogger<S> {
        &self.logger
    }
}

// ===== Default In-Memory Recorder =====

/// Type alias for the default in-memory permission audit recorder.
pub type InMemoryPermissionAuditRecorder = PermissionAuditRecorder<InMemoryAuditLogStore>;

impl InMemoryPermissionAuditRecorder {
    /// Create a new in-memory permission audit recorder.
    pub fn in_memory() -> Self {
        Self::new(Arc::new(InMemoryAuditLogStore::new()))
    }
}

// ===== Manual Audit Log Creation =====

/// Create a manual audit log entry for a permission operation.
///
/// This is useful when you need more control over the audit log entry
/// than the convenience methods provide.
pub fn create_audit_entry(
    permission: &TenantPermission,
    action: AuditAction,
    actor: &ActorInfo,
    old_value: Option<&TenantPermission>,
    new_value: Option<&TenantPermission>,
) -> AuditLogEntry {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);

    AuditLogEntry {
        id: format!("audit-{}-{}", nanos, uuid::Uuid::new_v4()),
        tenant_id: permission.tenant_id.clone(),
        user_id: permission.user_id.clone(),
        action,
        old_value: old_value.map(|p| serde_json::to_value(p).unwrap_or(serde_json::Value::Null)),
        new_value: new_value.map(|p| serde_json::to_value(p).unwrap_or(serde_json::Value::Null)),
        changed_by: actor.changed_by.clone(),
        changed_at: chrono::Utc::now().to_rfc3339(),
        ip_address: actor.ip_address.clone(),
        user_agent: actor.user_agent.clone(),
        metadata: HashMap::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_actor_info_from_headers() {
        let mut headers = HeaderMap::new();
        headers.insert("x-user-id", "user-123".parse().unwrap());
        headers.insert("x-forwarded-for", "192.168.1.1, 10.0.0.1".parse().unwrap());
        headers.insert("user-agent", "TestAgent/1.0".parse().unwrap());

        let actor = ActorInfo::from_headers(&headers);
        assert_eq!(actor.changed_by, "user-123");
        assert_eq!(actor.ip_address.as_deref(), Some("192.168.1.1"));
        assert_eq!(actor.user_agent.as_deref(), Some("TestAgent/1.0"));
    }

    #[test]
    fn test_actor_info_from_headers_actor_id() {
        let mut headers = HeaderMap::new();
        headers.insert("x-actor-id", "admin-456".parse().unwrap());

        let actor = ActorInfo::from_headers(&headers);
        assert_eq!(actor.changed_by, "admin-456");
    }

    #[test]
    fn test_actor_info_default() {
        let headers = HeaderMap::new();
        let actor = ActorInfo::from_headers(&headers);
        assert_eq!(actor.changed_by, "system");
        assert!(actor.ip_address.is_none());
        assert!(actor.user_agent.is_none());
    }

    #[test]
    fn test_actor_info_real_ip() {
        let mut headers = HeaderMap::new();
        headers.insert("x-real-ip", "10.0.0.5".parse().unwrap());

        let actor = ActorInfo::from_headers(&headers);
        assert_eq!(actor.ip_address.as_deref(), Some("10.0.0.5"));
    }

    #[test]
    fn test_actor_info_default_trait() {
        let actor = ActorInfo::default();
        assert_eq!(actor.changed_by, "system");
    }

    #[tokio::test]
    async fn test_in_memory_recorder_create() {
        let recorder = InMemoryPermissionAuditRecorder::in_memory();
        let permission = TenantPermission::owner("tenant-1", "user-1");
        let actor = ActorInfo::default();

        let result = recorder.record_create(&permission, &actor).await;
        assert!(result.is_ok());

        let count = recorder.logger().count().await.unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn test_in_memory_recorder_update() {
        let recorder = InMemoryPermissionAuditRecorder::in_memory();
        let old_perm = TenantPermission::member("tenant-1", "user-1");
        let new_perm = TenantPermission::admin("tenant-1", "user-1");
        let actor = ActorInfo::default();

        let result = recorder.record_update(&old_perm, &new_perm, &actor).await;
        assert!(result.is_ok());

        let response = recorder.logger().query(&Default::default()).await.unwrap();
        assert_eq!(response.total, 1);
        assert_eq!(response.entries[0].action, AuditAction::RoleChange);
    }

    #[tokio::test]
    async fn test_in_memory_recorder_delete() {
        let recorder = InMemoryPermissionAuditRecorder::in_memory();
        let permission = TenantPermission::owner("tenant-1", "user-1");
        let actor = ActorInfo::default();

        let result = recorder.record_delete(&permission, &actor).await;
        assert!(result.is_ok());

        let response = recorder.logger().query(&Default::default()).await.unwrap();
        assert_eq!(response.total, 1);
        assert_eq!(response.entries[0].action, AuditAction::Delete);
    }

    #[tokio::test]
    async fn test_in_memory_recorder_activation() {
        let recorder = InMemoryPermissionAuditRecorder::in_memory();
        let permission = TenantPermission::owner("tenant-1", "user-1");
        let actor = ActorInfo::default();

        let result = recorder.record_activation(&permission, true, &actor).await;
        assert!(result.is_ok());

        let response = recorder.logger().query(&Default::default()).await.unwrap();
        assert_eq!(response.total, 1);
        assert_eq!(response.entries[0].action, AuditAction::Activate);
    }

    #[test]
    fn test_create_audit_entry() {
        let permission = TenantPermission::owner("tenant-1", "user-1");
        let actor = ActorInfo::default();

        let entry = create_audit_entry(
            &permission,
            AuditAction::Create,
            &actor,
            None,
            Some(&permission),
        );

        assert_eq!(entry.tenant_id, "tenant-1");
        assert_eq!(entry.user_id, "user-1");
        assert_eq!(entry.action, AuditAction::Create);
        assert!(entry.old_value.is_none());
        assert!(entry.new_value.is_some());
        assert_eq!(entry.changed_by, "system");
    }
}

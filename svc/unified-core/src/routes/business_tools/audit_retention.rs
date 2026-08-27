//! V464: Audit Log Retention Policy
//!
//! Provides retention policy management for audit logs, including
//! automatic cleanup and archival of old audit log entries.

use std::time::Duration;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::routes::business_tools::audit_log::{AuditLogEntry, AuditLogStore, AuditLogStoreError};
use crate::routes::business_tools::audit_archiver::{ArchiveConfig, AuditLogArchiver};

// ===== Retention Policy Configuration =====

/// Retention policy for audit logs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetentionPolicy {
    /// Maximum age of audit logs to keep (in days).
    #[serde(default = "default_retention_days")]
    pub retention_days: u32,
    /// Whether to archive old logs before deleting.
    #[serde(default = "default_archive_enabled")]
    pub archive_enabled: bool,
    /// Directory path for archived logs (if archive_enabled).
    #[serde(default)]
    pub archive_path: Option<String>,
    /// Maximum number of logs to delete per cleanup run.
    #[serde(default = "default_batch_size")]
    pub batch_size: u32,
    /// Cleanup interval (in hours).
    #[serde(default = "default_cleanup_interval_hours")]
    pub cleanup_interval_hours: u32,
}

fn default_retention_days() -> u32 {
    90
}

fn default_archive_enabled() -> bool {
    false
}

fn default_batch_size() -> u32 {
    1000
}

fn default_cleanup_interval_hours() -> u32 {
    24
}

impl Default for RetentionPolicy {
    fn default() -> Self {
        Self {
            retention_days: default_retention_days(),
            archive_enabled: default_archive_enabled(),
            archive_path: None,
            batch_size: default_batch_size(),
            cleanup_interval_hours: default_cleanup_interval_hours(),
        }
    }
}

impl RetentionPolicy {
    /// Create a new retention policy with the given retention days.
    pub fn new(retention_days: u32) -> Self {
        Self {
            retention_days,
            ..Default::default()
        }
    }

    /// Enable archiving with the given archive path.
    pub fn with_archive(mut self, archive_path: impl Into<String>) -> Self {
        self.archive_enabled = true;
        self.archive_path = Some(archive_path.into());
        self
    }

    /// Set the batch size for cleanup.
    pub fn with_batch_size(mut self, batch_size: u32) -> Self {
        self.batch_size = batch_size;
        self
    }

    /// Set the cleanup interval.
    pub fn with_cleanup_interval(mut self, hours: u32) -> Self {
        self.cleanup_interval_hours = hours;
        self
    }

    /// Calculate the cutoff timestamp for retention.
    pub fn cutoff_time(&self) -> DateTime<Utc> {
        Utc::now() - Duration::from_secs(self.retention_days as u64 * 86400)
    }

    /// Get the cleanup interval as a Duration.
    pub fn cleanup_interval(&self) -> Duration {
        Duration::from_secs(self.cleanup_interval_hours as u64 * 3600)
    }
}

// ===== Cleanup Result =====

/// Result of a cleanup operation.
#[derive(Debug, Clone, Serialize)]
pub struct CleanupResult {
    /// Number of entries deleted.
    pub deleted_count: usize,
    /// Number of entries archived.
    pub archived_count: usize,
    /// Cutoff time used for cleanup.
    pub cutoff_time: String,
    /// Whether the cleanup was successful.
    pub success: bool,
    /// Error message if cleanup failed (optional).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ===== Retention Manager =====

/// Manages audit log retention and cleanup.
pub struct RetentionManager<S: AuditLogStore> {
    policy: RetentionPolicy,
    store: S,
    /// V469: Optional archiver for actual archival of old entries.
    archiver: Option<AuditLogArchiver>,
}

impl<S: AuditLogStore> RetentionManager<S> {
    /// Create a new retention manager with the given policy and store.
    pub fn new(policy: RetentionPolicy, store: S) -> Self {
        let archiver = if policy.archive_enabled {
            policy.archive_path.as_ref().map(|path| {
                let config = ArchiveConfig::new(path.clone());
                AuditLogArchiver::new(config)
            })
        } else {
            None
        };
        Self { policy, store, archiver }
    }

    /// Create a new retention manager with an explicit archiver.
    pub fn with_archiver(policy: RetentionPolicy, store: S, archiver: AuditLogArchiver) -> Self {
        Self { policy, store, archiver: Some(archiver) }
    }

    /// Get the current retention policy.
    pub fn policy(&self) -> &RetentionPolicy {
        &self.policy
    }

    /// Get the archiver reference.
    pub fn archiver(&self) -> Option<&AuditLogArchiver> {
        self.archiver.as_ref()
    }

    /// Update the retention policy.
    pub fn update_policy(&mut self, policy: RetentionPolicy) {
        self.policy = policy;
    }

    /// Run a cleanup operation.
    pub async fn cleanup(&self) -> CleanupResult {
        let cutoff = self.policy.cutoff_time();
        let cutoff_str = cutoff.to_rfc3339();

        // Query old entries
        let old_entries = match self.store.query_logs(
            None, None, None, None,
            Some(cutoff_str.clone()),
            None,
            Some(self.policy.batch_size as usize),
            None,
        ).await {
            Ok(entries) => entries,
            Err(e) => {
                return CleanupResult {
                    deleted_count: 0,
                    archived_count: 0,
                    cutoff_time: cutoff_str,
                    success: false,
                    error: Some(format!("Failed to query old logs: {}", e)),
                };
            }
        };

        if old_entries.is_empty() {
            return CleanupResult {
                deleted_count: 0,
                archived_count: 0,
                cutoff_time: cutoff_str,
                success: true,
                error: None,
            };
        }

        // Archive if enabled
        let archived_count = if self.policy.archive_enabled {
            self.archive_entries(&old_entries).await
        } else {
            0
        };

        // Delete old entries
        let mut deleted_count = 0;
        for entry in &old_entries {
            match self.store.delete_log(&entry.id).await {
                Ok(_) => deleted_count += 1,
                Err(e) => {
                    return CleanupResult {
                        deleted_count,
                        archived_count,
                        cutoff_time: cutoff_str,
                        success: false,
                        error: Some(format!("Failed to delete log {}: {}", entry.id, e)),
                    };
                }
            }
        }

        CleanupResult {
            deleted_count,
            archived_count,
            cutoff_time: cutoff_str,
            success: true,
            error: None,
        }
    }

    /// Archive entries to the configured archive path.
    async fn archive_entries(&self, entries: &[AuditLogEntry]) -> usize {
        if !self.policy.archive_enabled {
            return 0;
        }

        let archiver = match &self.archiver {
            Some(a) => a,
            None => return 0,
        };

        // V469: Use AuditLogArchiver for actual archival
        match archiver.archive_entries(entries).await {
            Ok(count) => count,
            Err(e) => {
                tracing::error!(error = %e, "Failed to archive audit log entries");
                0
            }
        }
    }

    /// Get statistics about audit log retention.
    pub async fn get_stats(&self) -> RetentionStats {
        let cutoff = self.policy.cutoff_time();
        let cutoff_str = cutoff.to_rfc3339();

        let old_count = match self.store.query_logs(
            None, None, None, None,
            Some(cutoff_str),
            None,
            None,
            None,
        ).await {
            Ok(entries) => entries.len(),
            Err(_) => 0,
        };

        RetentionStats {
            retention_days: self.policy.retention_days,
            cutoff_time: cutoff.to_rfc3339(),
            entries_older_than_cutoff: old_count,
            archive_enabled: self.policy.archive_enabled,
            batch_size: self.policy.batch_size,
            cleanup_interval_hours: self.policy.cleanup_interval_hours,
        }
    }
}

// ===== Retention Statistics =====

/// Statistics about audit log retention.
#[derive(Debug, Clone, Serialize)]
pub struct RetentionStats {
    /// Retention period in days.
    pub retention_days: u32,
    /// Cutoff time for retention.
    pub cutoff_time: String,
    /// Number of entries older than the cutoff.
    pub entries_older_than_cutoff: usize,
    /// Whether archiving is enabled.
    pub archive_enabled: bool,
    /// Batch size for cleanup.
    pub batch_size: u32,
    /// Cleanup interval in hours.
    pub cleanup_interval_hours: u32,
}

// ===== Tests =====

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // Mock AuditLogStore for testing
    struct MockAuditLogStore {
        entries: Mutex<Vec<AuditLogEntry>>,
    }

    impl MockAuditLogStore {
        fn new() -> Self {
            Self {
                entries: Mutex::new(Vec::new()),
            }
        }

        fn add_entry(&self, entry: AuditLogEntry) {
            self.entries.lock().unwrap().push(entry);
        }
    }

    impl AuditLogStore for MockAuditLogStore {
        async fn create_log(&self, entry: AuditLogEntry) -> Result<AuditLogEntry, AuditLogStoreError> {
            self.entries.lock().unwrap().push(entry.clone());
            Ok(entry)
        }

        async fn get_log(&self, id: &str) -> Result<Option<AuditLogEntry>, AuditLogStoreError> {
            Ok(self.entries.lock().unwrap().iter().find(|e| e.id == id).cloned())
        }

        async fn query_logs(
            &self,
            _tenant_id: Option<String>,
            _user_id: Option<String>,
            _action: Option<String>,
            _changed_by: Option<String>,
            _start_time: Option<String>,
            _end_time: Option<String>,
            _limit: Option<usize>,
            _offset: Option<usize>,
        ) -> Result<Vec<AuditLogEntry>, AuditLogStoreError> {
            Ok(self.entries.lock().unwrap().clone())
        }

        async fn delete_log(&self, id: &str) -> Result<(), AuditLogStoreError> {
            let mut entries = self.entries.lock().unwrap();
            entries.retain(|e| e.id != id);
            Ok(())
        }
    }

    fn make_entry(id: &str, created_at: &str) -> AuditLogEntry {
        AuditLogEntry {
            id: id.to_string(),
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            action: "create".to_string(),
            resource_type: "permission".to_string(),
            resource_id: "r1".to_string(),
            changed_by: "admin".to_string(),
            old_value: None,
            new_value: None,
            metadata: None,
            created_at: created_at.to_string(),
        }
    }

    #[test]
    fn test_retention_policy_default() {
        let policy = RetentionPolicy::default();
        assert_eq!(policy.retention_days, 90);
        assert!(!policy.archive_enabled);
        assert!(policy.archive_path.is_none());
        assert_eq!(policy.batch_size, 1000);
        assert_eq!(policy.cleanup_interval_hours, 24);
    }

    #[test]
    fn test_retention_policy_new() {
        let policy = RetentionPolicy::new(30);
        assert_eq!(policy.retention_days, 30);
    }

    #[test]
    fn test_retention_policy_with_archive() {
        let policy = RetentionPolicy::new(30).with_archive("/var/log/archive");
        assert!(policy.archive_enabled);
        assert_eq!(policy.archive_path.as_deref(), Some("/var/log/archive"));
    }

    #[test]
    fn test_retention_policy_with_batch_size() {
        let policy = RetentionPolicy::new(30).with_batch_size(500);
        assert_eq!(policy.batch_size, 500);
    }

    #[test]
    fn test_retention_policy_with_cleanup_interval() {
        let policy = RetentionPolicy::new(30).with_cleanup_interval(12);
        assert_eq!(policy.cleanup_interval_hours, 12);
    }

    #[test]
    fn test_retention_policy_cutoff_time() {
        let policy = RetentionPolicy::new(30);
        let cutoff = policy.cutoff_time();
        let expected = Utc::now() - Duration::from_secs(30 * 86400);
        // Allow 1 second tolerance
        assert!((cutoff - expected).num_seconds().abs() <= 1);
    }

    #[test]
    fn test_retention_policy_cleanup_interval() {
        let policy = RetentionPolicy::new(30).with_cleanup_interval(6);
        assert_eq!(policy.cleanup_interval(), Duration::from_secs(6 * 3600));
    }

    #[test]
    fn test_retention_policy_serialization() {
        let policy = RetentionPolicy::new(30).with_archive("/tmp/archive");
        let json = serde_json::to_string(&policy).unwrap();
        assert!(json.contains("\"retention_days\":30"));
        assert!(json.contains("\"archive_enabled\":true"));
        assert!(json.contains("/tmp/archive"));
    }

    #[test]
    fn test_retention_policy_deserialization() {
        let json = r#"{"retention_days":60,"archive_enabled":false,"batch_size":500,"cleanup_interval_hours":12}"#;
        let policy: RetentionPolicy = serde_json::from_str(json).unwrap();
        assert_eq!(policy.retention_days, 60);
        assert!(!policy.archive_enabled);
        assert_eq!(policy.batch_size, 500);
        assert_eq!(policy.cleanup_interval_hours, 12);
    }

    #[test]
    fn test_cleanup_result_serialization() {
        let result = CleanupResult {
            deleted_count: 10,
            archived_count: 5,
            cutoff_time: "2026-01-01T00:00:00Z".to_string(),
            success: true,
            error: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"deleted_count\":10"));
        assert!(json.contains("\"archived_count\":5"));
        assert!(json.contains("\"success\":true"));
        assert!(!json.contains("error")); // None should be skipped
    }

    #[test]
    fn test_retention_stats_serialization() {
        let stats = RetentionStats {
            retention_days: 90,
            cutoff_time: "2026-01-01T00:00:00Z".to_string(),
            entries_older_than_cutoff: 100,
            archive_enabled: false,
            batch_size: 1000,
            cleanup_interval_hours: 24,
        };
        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("\"retention_days\":90"));
        assert!(json.contains("\"entries_older_than_cutoff\":100"));
    }

    #[tokio::test]
    async fn test_retention_manager_cleanup_empty() {
        let store = MockAuditLogStore::new();
        let policy = RetentionPolicy::new(30);
        let manager = RetentionManager::new(policy, store);

        let result = manager.cleanup().await;
        assert!(result.success);
        assert_eq!(result.deleted_count, 0);
        assert_eq!(result.archived_count, 0);
    }

    #[tokio::test]
    async fn test_retention_manager_cleanup_with_entries() {
        let store = MockAuditLogStore::new();
        store.add_entry(make_entry("1", "2020-01-01T00:00:00Z"));
        store.add_entry(make_entry("2", "2020-01-02T00:00:00Z"));

        let policy = RetentionPolicy::new(30);
        let manager = RetentionManager::new(policy, store);

        let result = manager.cleanup().await;
        assert!(result.success);
        assert_eq!(result.deleted_count, 2);
    }

    #[tokio::test]
    async fn test_retention_manager_get_stats() {
        let store = MockAuditLogStore::new();
        store.add_entry(make_entry("1", "2020-01-01T00:00:00Z"));

        let policy = RetentionPolicy::new(30);
        let manager = RetentionManager::new(policy, store);

        let stats = manager.get_stats().await;
        assert_eq!(stats.retention_days, 30);
        assert_eq!(stats.entries_older_than_cutoff, 1);
        assert!(!stats.archive_enabled);
    }

    #[tokio::test]
    async fn test_retention_manager_update_policy() {
        let store = MockAuditLogStore::new();
        let policy = RetentionPolicy::new(30);
        let mut manager = RetentionManager::new(policy, store);

        assert_eq!(manager.policy().retention_days, 30);

        let new_policy = RetentionPolicy::new(60);
        manager.update_policy(new_policy);

        assert_eq!(manager.policy().retention_days, 60);
    }

    #[tokio::test]
    async fn test_retention_manager_with_archiver() {
        let temp_dir = tempfile::TempDir::new().unwrap();
        let store = MockAuditLogStore::new();
        let policy = RetentionPolicy::new(30).with_archive(temp_dir.path().to_string_lossy());
        let config = ArchiveConfig::new(temp_dir.path());
        let archiver = AuditLogArchiver::new(config);
        let manager = RetentionManager::with_archiver(policy, store, archiver);

        assert!(manager.archiver().is_some());
        assert!(manager.policy().archive_enabled);
    }

    #[tokio::test]
    async fn test_retention_manager_archiver_auto_create() {
        let temp_dir = tempfile::TempDir::new().unwrap();
        let store = MockAuditLogStore::new();
        let policy = RetentionPolicy::new(30).with_archive(temp_dir.path().to_string_lossy());
        let manager = RetentionManager::new(policy, store);

        // When archive_enabled and archive_path are set, new() should auto-create archiver
        assert!(manager.archiver().is_some());
    }

    #[tokio::test]
    async fn test_retention_manager_no_archiver_when_disabled() {
        let store = MockAuditLogStore::new();
        let policy = RetentionPolicy::new(30); // archive_enabled = false
        let manager = RetentionManager::new(policy, store);

        assert!(manager.archiver().is_none());
    }

    #[tokio::test]
    async fn test_retention_manager_cleanup_with_archive() {
        let temp_dir = tempfile::TempDir::new().unwrap();
        let store = MockAuditLogStore::new();
        store.add_entry(make_entry("1", "2020-01-01T00:00:00Z"));
        store.add_entry(make_entry("2", "2020-01-02T00:00:00Z"));

        let policy = RetentionPolicy::new(30).with_archive(temp_dir.path().to_string_lossy());
        let manager = RetentionManager::new(policy, store);

        let result = manager.cleanup().await;
        assert!(result.success);
        assert_eq!(result.deleted_count, 2);
        assert_eq!(result.archived_count, 2);

        // Verify archive file was created
        let archives = manager.archiver().unwrap().list_archives().unwrap();
        assert!(!archives.is_empty());
    }
}

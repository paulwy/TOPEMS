//! V466: Audit Log Retention Cleanup Task
//!
//! Provides a background task that periodically runs audit log cleanup
//! based on the configured retention policy.

use std::sync::Arc;
use std::time::Duration;

use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tracing::{info, warn, error};

use crate::routes::business_tools::audit_retention::{RetentionPolicy, RetentionManager, CleanupResult};
use crate::routes::business_tools::permission_audit_log::AuditLogStore;

// ===== Cleanup Task =====

/// Manages the background audit log cleanup task.
pub struct RetentionCleanupTask<S: AuditLogStore + Send + Sync + 'static> {
    policy: Arc<Mutex<RetentionPolicy>>,
    store: Arc<S>,
    handle: Option<JoinHandle<()>>,
}

impl<S: AuditLogStore + Send + Sync + 'static> RetentionCleanupTask<S> {
    /// Create a new cleanup task with the given policy and store.
    pub fn new(policy: Arc<Mutex<RetentionPolicy>>, store: Arc<S>) -> Self {
        Self {
            policy,
            store,
            handle: None,
        }
    }

    /// Start the background cleanup task.
    pub fn start(&mut self) {
        if self.handle.is_some() {
            warn!("Retention cleanup task is already running");
            return;
        }

        let policy = self.policy.clone();
        let store = self.store.clone();

        let handle = tokio::spawn(async move {
            // Get initial cleanup interval
            let interval = {
                let policy = policy.lock().await;
                policy.cleanup_interval()
            };

            info!(
                interval_hours = interval.as_secs() / 3600,
                "Starting audit log retention cleanup task"
            );

            let mut ticker = tokio::time::interval(interval);

            loop {
                ticker.tick().await;

                // Get current policy (may have been updated)
                let current_policy = {
                    policy.lock().await.clone()
                };

                // Check if interval changed and recreate ticker if needed
                let current_interval = current_policy.cleanup_interval();
                if current_interval != interval {
                    info!(
                        old_interval_hours = interval.as_secs() / 3600,
                        new_interval_hours = current_interval.as_secs() / 3600,
                        "Retention cleanup interval changed, restarting ticker"
                    );
                    ticker = tokio::time::interval(current_interval);
                    continue;
                }

                // Run cleanup
                let manager = RetentionManager::new(current_policy, store.as_ref());
                let result = manager.cleanup().await;

                if result.success {
                    info!(
                        deleted_count = result.deleted_count,
                        archived_count = result.archived_count,
                        cutoff_time = %result.cutoff_time,
                        "Audit log retention cleanup completed"
                    );
                } else {
                    error!(
                        deleted_count = result.deleted_count,
                        error = ?result.error,
                        "Audit log retention cleanup failed"
                    );
                }
            }
        });

        self.handle = Some(handle);
        info!("Audit log retention cleanup task started");
    }

    /// Stop the background cleanup task.
    pub fn stop(&mut self) {
        if let Some(handle) = self.handle.take() {
            handle.abort();
            info!("Audit log retention cleanup task stopped");
        }
    }

    /// Check if the task is running.
    pub fn is_running(&self) -> bool {
        self.handle.is_some()
    }

    /// Run a single cleanup immediately (for testing or manual trigger).
    pub async fn run_once(&self) -> CleanupResult {
        let policy = self.policy.lock().await.clone();
        let manager = RetentionManager::new(policy, self.store.as_ref());
        manager.cleanup().await
    }
}

// ===== Cleanup Task Stats =====

/// Statistics about the cleanup task.
#[derive(Debug, Clone, serde::Serialize)]
pub struct CleanupTaskStats {
    /// Whether the task is running.
    pub running: bool,
    /// Cleanup interval in hours.
    pub cleanup_interval_hours: u32,
    /// Retention days.
    pub retention_days: u32,
}

impl<S: AuditLogStore + Send + Sync + 'static> RetentionCleanupTask<S> {
    /// Get statistics about the cleanup task.
    pub async fn get_stats(&self) -> CleanupTaskStats {
        let policy = self.policy.lock().await;
        CleanupTaskStats {
            running: self.is_running(),
            cleanup_interval_hours: policy.cleanup_interval_hours,
            retention_days: policy.retention_days,
        }
    }
}

// ===== Tests =====

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex as StdMutex;

    // Mock AuditLogStore for testing
    struct MockAuditLogStore {
        entries: StdMutex<Vec<crate::routes::business_tools::audit_log::AuditLogEntry>>,
    }

    impl MockAuditLogStore {
        fn new() -> Self {
            Self {
                entries: StdMutex::new(Vec::new()),
            }
        }
    }

    impl AuditLogStore for MockAuditLogStore {
        async fn create_log(
            &self,
            entry: crate::routes::business_tools::audit_log::AuditLogEntry,
        ) -> Result<crate::routes::business_tools::audit_log::AuditLogEntry, crate::routes::business_tools::audit_log::AuditLogStoreError> {
            self.entries.lock().unwrap().push(entry.clone());
            Ok(entry)
        }

        async fn get_log(
            &self,
            id: &str,
        ) -> Result<Option<crate::routes::business_tools::audit_log::AuditLogEntry>, crate::routes::business_tools::audit_log::AuditLogStoreError> {
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
        ) -> Result<Vec<crate::routes::business_tools::audit_log::AuditLogEntry>, crate::routes::business_tools::audit_log::AuditLogStoreError> {
            Ok(self.entries.lock().unwrap().clone())
        }

        async fn delete_log(&self, id: &str) -> Result<(), crate::routes::business_tools::audit_log::AuditLogStoreError> {
            let mut entries = self.entries.lock().unwrap();
            entries.retain(|e| e.id != id);
            Ok(())
        }
    }

    fn make_entry(id: &str, created_at: &str) -> crate::routes::business_tools::audit_log::AuditLogEntry {
        crate::routes::business_tools::audit_log::AuditLogEntry {
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

    #[tokio::test]
    async fn test_cleanup_task_creation() {
        let policy = Arc::new(Mutex::new(RetentionPolicy::new(30)));
        let store = Arc::new(MockAuditLogStore::new());
        let task = RetentionCleanupTask::new(policy, store);
        assert!(!task.is_running());
    }

    #[tokio::test]
    async fn test_cleanup_task_start_stop() {
        let policy = Arc::new(Mutex::new(RetentionPolicy::new(30)));
        let store = Arc::new(MockAuditLogStore::new());
        let mut task = RetentionCleanupTask::new(policy, store);

        task.start();
        assert!(task.is_running());

        task.stop();
        assert!(!task.is_running());
    }

    #[tokio::test]
    async fn test_cleanup_task_run_once_empty() {
        let policy = Arc::new(Mutex::new(RetentionPolicy::new(30)));
        let store = Arc::new(MockAuditLogStore::new());
        let task = RetentionCleanupTask::new(policy, store);

        let result = task.run_once().await;
        assert!(result.success);
        assert_eq!(result.deleted_count, 0);
    }

    #[tokio::test]
    async fn test_cleanup_task_run_once_with_entries() {
        let store = Arc::new(MockAuditLogStore::new());
        store.create_log(make_entry("1", "2020-01-01T00:00:00Z")).await.unwrap();
        store.create_log(make_entry("2", "2020-01-02T00:00:00Z")).await.unwrap();

        let policy = Arc::new(Mutex::new(RetentionPolicy::new(30)));
        let task = RetentionCleanupTask::new(policy, store);

        let result = task.run_once().await;
        assert!(result.success);
        assert_eq!(result.deleted_count, 2);
    }

    #[tokio::test]
    async fn test_cleanup_task_get_stats() {
        let policy = Arc::new(Mutex::new(RetentionPolicy::new(60).with_cleanup_interval(12)));
        let store = Arc::new(MockAuditLogStore::new());
        let task = RetentionCleanupTask::new(policy, store);

        let stats = task.get_stats().await;
        assert!(!stats.running);
        assert_eq!(stats.retention_days, 60);
        assert_eq!(stats.cleanup_interval_hours, 12);
    }

    #[tokio::test]
    async fn test_cleanup_task_stats_running() {
        let policy = Arc::new(Mutex::new(RetentionPolicy::new(30)));
        let store = Arc::new(MockAuditLogStore::new());
        let mut task = RetentionCleanupTask::new(policy, store);

        task.start();
        let stats = task.get_stats().await;
        assert!(stats.running);
        task.stop();
    }

    #[test]
    fn test_cleanup_task_stats_serialization() {
        let stats = CleanupTaskStats {
            running: true,
            cleanup_interval_hours: 24,
            retention_days: 90,
        };
        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("\"running\":true"));
        assert!(json.contains("\"cleanup_interval_hours\":24"));
        assert!(json.contains("\"retention_days\":90"));
    }

    #[tokio::test]
    async fn test_cleanup_task_double_start() {
        let policy = Arc::new(Mutex::new(RetentionPolicy::new(30)));
        let store = Arc::new(MockAuditLogStore::new());
        let mut task = RetentionCleanupTask::new(policy, store);

        task.start();
        task.start(); // Should not panic, just warn
        assert!(task.is_running());
        task.stop();
    }

    #[tokio::test]
    async fn test_cleanup_task_stop_when_not_running() {
        let policy = Arc::new(Mutex::new(RetentionPolicy::new(30)));
        let store = Arc::new(MockAuditLogStore::new());
        let mut task = RetentionCleanupTask::new(policy, store);

        task.stop(); // Should not panic
        assert!(!task.is_running());
    }

    #[tokio::test]
    async fn test_cleanup_task_policy_update() {
        let policy = Arc::new(Mutex::new(RetentionPolicy::new(30)));
        let store = Arc::new(MockAuditLogStore::new());
        let task = RetentionCleanupTask::new(policy.clone(), store);

        // Update policy
        {
            let mut p = policy.lock().await;
            p.retention_days = 60;
        }

        let stats = task.get_stats().await;
        assert_eq!(stats.retention_days, 60);
    }
}

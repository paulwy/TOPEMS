//! V466: Audit Log Retention Cleanup Task
//!
//! Provides a background task that periodically runs audit log cleanup
//! based on the configured retention policy.

use std::sync::Arc;

use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tracing::{info, warn, error};

use std::future::Future;
use std::pin::Pin;

use crate::routes::business_tools::audit_retention::{RetentionPolicy, RetentionManager, CleanupResult};
use crate::routes::business_tools::permission_audit_log::AuditLogStore;

// ===== Cleanup Task =====

/// Manages the background audit log cleanup task.
pub struct RetentionCleanupTask<S: AuditLogStore + Send + Sync + 'static + ?Sized> {
    policy: Arc<Mutex<RetentionPolicy>>,
    store: Arc<S>,
    handle: Option<JoinHandle<()>>,
}

impl<S: AuditLogStore + Send + Sync + 'static + ?Sized> RetentionCleanupTask<S> {
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
                let manager = RetentionManager::new(current_policy, store.clone());
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
        let manager = RetentionManager::new(policy, self.store.clone());
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

impl<S: AuditLogStore + Send + Sync + 'static + ?Sized> RetentionCleanupTask<S> {
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

// ===== Object-safe Controller (AppState Integration) =====

use std::sync::atomic::{AtomicBool, Ordering};

/// Controller owns the generic [`RetentionCleanupTask`] but exposes an
/// object-safe, store-agnostic interface so it can be stored directly in
/// [`AppState`] without any type parameter leakage.
///
/// The controller is built from the two dynamic pieces already present in
/// `AppState`: the retention policy (shared `Arc<Mutex<RetentionPolicy>>`)
/// and the audit log store (`Arc<dyn AuditLogStore>`).  It therefore
/// requires nothing new from callers and can be constructed as a simple
/// one-liner during state boot.
pub struct AuditCleanupController {
    inner: Mutex<Box<dyn AuditCleanupControl + Send + Sync>>,
    /// Quick path for "is it running?" without acquiring the inner lock.
    running_flag: AtomicBool,
}

/// Object-safe trait that erases the `<S: AuditLogStore>` parameter from
/// [`RetentionCleanupTask`].  Kept as a trait so callers can swap in a
/// fake implementation in tests.
pub trait AuditCleanupControl {
    fn start(&mut self);
    fn stop(&mut self);
    fn is_running(&self) -> bool;
    fn get_stats(&self) -> Pin<Box<dyn Future<Output = CleanupTaskStats> + Send + '_>>;
}

impl<S: AuditLogStore + Send + Sync + 'static + ?Sized> AuditCleanupControl
    for RetentionCleanupTask<S>
{
    fn start(&mut self) {
        <RetentionCleanupTask<S>>::start(self);
    }

    fn stop(&mut self) {
        <RetentionCleanupTask<S>>::stop(self);
    }

    fn is_running(&self) -> bool {
        <RetentionCleanupTask<S>>::is_running(self)
    }

    fn get_stats(&self) -> Pin<Box<dyn Future<Output = CleanupTaskStats> + Send + '_>> {
        Box::pin(<RetentionCleanupTask<S>>::get_stats(self))
    }
}

impl AuditCleanupController {
    /// Build a controller wired up to the same policy + store as the
    /// running service.  This is the constructor used by `AppState`
    /// initialisers.
    pub fn new(
        policy: Arc<Mutex<RetentionPolicy>>,
        store: Arc<dyn AuditLogStore>,
    ) -> Self {
        let task: RetentionCleanupTask<dyn AuditLogStore> =
            RetentionCleanupTask::new(policy, store);
        let boxed: Box<dyn AuditCleanupControl + Send + Sync> = Box::new(task);
        Self {
            inner: Mutex::new(boxed),
            running_flag: AtomicBool::new(false),
        }
    }

    /// Build a no-op controller for tests / minimal binaries.  The
    /// controller will report `running=false` and start/stop are no-ops.
    pub fn noop() -> Self {
        Self {
            inner: Mutex::new(Box::new(NoopCleanupControl)),
            running_flag: AtomicBool::new(false),
        }
    }

    /// Start the periodic cleanup background task.  Calling `start`
    /// while already running is a no-op (with a warning in the logs).
    pub async fn start(&self) {
        let mut inner = self.inner.lock().await;
        if inner.is_running() {
            warn!("AuditCleanupController::start called while already running");
            return;
        }
        inner.start();
        self.running_flag.store(inner.is_running(), Ordering::Relaxed);
        info!("Audit cleanup task started via API");
    }

    /// Stop the periodic cleanup background task.
    pub async fn stop(&self) {
        let mut inner = self.inner.lock().await;
        inner.stop();
        self.running_flag.store(inner.is_running(), Ordering::Relaxed);
        info!("Audit cleanup task stopped via API");
    }

    /// Cheap running check (atomic read, no lock).
    pub fn is_running(&self) -> bool {
        self.running_flag.load(Ordering::Relaxed)
    }

    /// Fetch full statistics for the task (running flag, retention
    /// policy values, etc).
    pub async fn status(&self) -> CleanupTaskStats {
        let inner = self.inner.lock().await;
        let mut stats = inner.get_stats().await;
        // Re-sync the fast flag in case it drifted (e.g. task exited)
        self.running_flag.store(stats.running, Ordering::Relaxed);
        // Ensure the HTTP-facing running flag always reflects reality.
        if stats.running != self.is_running() {
            self.running_flag.store(stats.running, Ordering::Relaxed);
        }
        stats.running = self.is_running();
        stats
    }
}

/// Drop implementation: we do our best to abort any background task that
/// is still owned by the controller when it goes out of scope, so an
/// orderly shutdown of the server doesn't leave cleanup futures running
/// against (now-dropped) database state.
impl Drop for AuditCleanupController {
    fn drop(&mut self) {
        // We can't await inside drop, so best-effort: try_lock and stop.
        if let Ok(mut inner) = self.inner.try_lock() {
            inner.stop();
        }
    }
}

/// Sentinel [`AuditCleanupControl`] implementation used by
/// [`AuditCleanupController::noop`] and in bare tests.
pub(crate) struct NoopCleanupControl;

impl AuditCleanupControl for NoopCleanupControl {
    fn start(&mut self) {}
    fn stop(&mut self) {}
    fn is_running(&self) -> bool { false }
    fn get_stats(&self) -> Pin<Box<dyn Future<Output = CleanupTaskStats> + Send + '_>> {
        Box::pin(async {
            CleanupTaskStats {
                running: false,
                cleanup_interval_hours: 24,
                retention_days: 90,
            }
        })
    }
}

// ===== Tests =====

#[cfg(test)]
mod tests {
    use super::*;
    use crate::routes::business_tools::mock_audit_store::{make_test_entry, MockAuditLogStore};

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
        store.record(make_test_entry("1", "2020-01-01T00:00:00Z")).await.unwrap();
        store.record(make_test_entry("2", "2020-01-02T00:00:00Z")).await.unwrap();

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

    // ===== AuditCleanupController (object-safe wrapper) unit tests =====

    #[tokio::test]
    async fn test_controller_noop_defaults() {
        let ctl = AuditCleanupController::noop();
        assert!(!ctl.is_running());
        let stats = ctl.status().await;
        assert!(!stats.running);
        assert_eq!(stats.retention_days, 90);
        assert_eq!(stats.cleanup_interval_hours, 24);
    }

    #[tokio::test]
    async fn test_controller_noop_start_stop_is_idempotent() {
        let ctl = AuditCleanupController::noop();
        ctl.start().await; // should not panic
        ctl.start().await; // double start is fine
        assert!(!ctl.is_running()); // noop impl stays false
        ctl.stop().await;
        ctl.stop().await;
        assert!(!ctl.is_running());
    }

    #[tokio::test]
    async fn test_controller_new_with_mock_store_works() {
        // Build a real controller (not noop) and ensure start/stop/status
        // all round-trip without panicking or spawning runaway tasks.
        let policy = Arc::new(Mutex::new(RetentionPolicy::new(45).with_cleanup_interval(6)));
        let store = Arc::new(MockAuditLogStore::new());
        let dynamic_store: Arc<dyn AuditLogStore> = store;
        let ctl = AuditCleanupController::new(policy, dynamic_store);

        let stats_before = ctl.status().await;
        assert!(!stats_before.running);
        assert_eq!(stats_before.retention_days, 45);
        assert_eq!(stats_before.cleanup_interval_hours, 6);

        ctl.start().await;
        assert!(ctl.is_running());
        let stats_running = ctl.status().await;
        assert!(stats_running.running);

        ctl.stop().await;
        assert!(!ctl.is_running());
        let stats_after = ctl.status().await;
        assert!(!stats_after.running);
    }
}

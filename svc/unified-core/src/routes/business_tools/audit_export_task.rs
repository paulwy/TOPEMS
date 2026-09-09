//! V474: Audit Log Export Task
//!
//! Provides a background task that periodically exports (archives) audit
//! log entries to JSON / JSON.gz files. Unlike the retention cleanup task
//! (which deletes old entries), the export task only *reads* the store
//! and writes copies to disk, leaving the live audit log intact.
//!
//! Each run exports entries created since the previous run's timestamp
//! (incremental export), so the same entry is not archived twice across
//! runs. On the first run (no previous timestamp), everything is exported.

use std::sync::Arc;

use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tracing::{error, info, warn};

use std::future::Future;
use std::pin::Pin;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

use chrono::Utc;

use crate::routes::business_tools::audit_archiver::{ArchiveError, AuditLogArchiver};
use crate::routes::business_tools::permission_audit_log::{
    AuditLogEntry, AuditLogQuery, AuditLogStore,
};

// ===== Export Task Config =====

/// Configuration for the periodic audit log export task.
#[derive(Debug, Clone)]
pub struct ExportTaskConfig {
    /// Export interval in seconds. Defaults to 24 hours.
    pub interval_secs: u64,
    /// Page size used when querying the store in batches.
    pub batch_size: usize,
}

impl Default for ExportTaskConfig {
    fn default() -> Self {
        Self {
            interval_secs: 86400, // 24h
            batch_size: 500,
        }
    }
}

impl ExportTaskConfig {
    /// Create a new config with the given interval (seconds).
    pub fn new(interval_secs: u64) -> Self {
        Self {
            interval_secs,
            ..Default::default()
        }
    }

    /// Set the batch page size.
    pub fn with_batch_size(mut self, batch: usize) -> Self {
        self.batch_size = batch;
        self
    }

    fn interval(&self) -> std::time::Duration {
        std::time::Duration::from_secs(self.interval_secs)
    }
}

// ===== Export Run Result =====

/// Result of a single export run.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ExportRunResult {
    /// Whether the run completed without fatal errors.
    pub success: bool,
    /// Number of entries queried and written this run.
    pub exported: usize,
    /// Number of entries actually persisted to archive files.
    pub archived: usize,
    /// RFC3339 timestamp marking the lower bound of this run's window.
    pub window_start: String,
    /// Error message if the run failed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ===== Export Task Stats =====

/// Statistics about the export task (HTTP-facing).
#[derive(Debug, Clone, serde::Serialize)]
pub struct ExportTaskStats {
    /// Whether the background task is currently running.
    pub running: bool,
    /// Export interval in seconds.
    pub interval_secs: u64,
    /// Number of entries exported in the most recent run.
    pub last_export_count: usize,
    /// RFC3339 timestamp of the most recent run (None if never run).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_export_at: Option<String>,
}

// ===== Export Error =====

#[derive(Debug, thiserror::Error)]
pub enum ExportError {
    #[error("audit store error: {0}")]
    Store(String),
    #[error("archive error: {0}")]
    Archive(String),
}

impl From<crate::routes::business_tools::permission_audit_log::AuditLogError> for ExportError {
    fn from(e: crate::routes::business_tools::permission_audit_log::AuditLogError) -> Self {
        ExportError::Store(e.to_string())
    }
}

impl From<ArchiveError> for ExportError {
    fn from(e: ArchiveError) -> Self {
        ExportError::Archive(e.to_string())
    }
}

// ===== Export Task =====

/// Manages the background audit log export task.
pub struct AuditExportTask<S: AuditLogStore + Send + Sync + 'static + ?Sized> {
    config: Arc<Mutex<ExportTaskConfig>>,
    store: Arc<S>,
    archiver: Arc<AuditLogArchiver>,
    handle: Option<JoinHandle<()>>,
    /// Lower bound (RFC3339) of the next export window. Shared with the
    /// spawned loop so background runs stay incremental.
    last_window_start: Arc<Mutex<Option<String>>>,
    /// Count of entries written in the most recent run.
    last_count: Arc<AtomicUsize>,
    /// Timestamp of the most recent run.
    last_run_at: Arc<Mutex<Option<String>>>,
}

impl<S: AuditLogStore + Send + Sync + 'static + ?Sized> AuditExportTask<S> {
    /// Create a new export task.
    pub fn new(
        config: Arc<Mutex<ExportTaskConfig>>,
        store: Arc<S>,
        archiver: Arc<AuditLogArchiver>,
    ) -> Self {
        Self {
            config,
            store,
            archiver,
            handle: None,
            last_window_start: Arc::new(Mutex::new(None)),
            last_count: Arc::new(AtomicUsize::new(0)),
            last_run_at: Arc::new(Mutex::new(None)),
        }
    }

    /// Start the background export task.
    pub fn start(&mut self) {
        if self.handle.is_some() {
            warn!("Audit export task is already running");
            return;
        }

        let config = self.config.clone();
        let store = self.store.clone();
        let archiver = self.archiver.clone();
        let window_start = self.last_window_start.clone();
        let last_count = self.last_count.clone();
        let last_run_at = self.last_run_at.clone();

        let handle = tokio::spawn(async move {
            let interval = {
                let c = config.lock().await;
                c.interval()
            };

            info!(
                interval_secs = interval.as_secs(),
                "Starting audit log export task"
            );

            let mut ticker = tokio::time::interval(interval);
            ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

            loop {
                ticker.tick().await;

                let current_cfg = config.lock().await.clone();
                if current_cfg.interval() != interval {
                    info!(
                        old = interval.as_secs(),
                        new = current_cfg.interval().as_secs(),
                        "Export interval changed; task will use new interval on restart"
                    );
                }

                let result = Self::export_once(
                    &store,
                    &archiver,
                    &current_cfg,
                    &window_start,
                    &last_count,
                    &last_run_at,
                )
                .await;

                if result.success {
                    info!(
                        exported = result.exported,
                        archived = result.archived,
                        "Audit log export run completed"
                    );
                } else {
                    error!(
                        exported = result.exported,
                        error = ?result.error,
                        "Audit log export run failed"
                    );
                }
            }
        });

        self.handle = Some(handle);
        info!("Audit log export task started");
    }

    /// Stop the background export task.
    pub fn stop(&mut self) {
        if let Some(handle) = self.handle.take() {
            handle.abort();
            info!("Audit log export task stopped");
        }
    }

    /// Check if the task is running.
    pub fn is_running(&self) -> bool {
        self.handle.is_some()
    }

    /// Core single-run logic. Shared by the spawned background loop and
    /// `run_once`. Takes the shared window/counter state by reference so
    /// both paths stay incremental.
    async fn export_once(
        store: &Arc<S>,
        archiver: &Arc<AuditLogArchiver>,
        config: &ExportTaskConfig,
        window_start: &Arc<Mutex<Option<String>>>,
        last_count: &Arc<AtomicUsize>,
        last_run_at: &Arc<Mutex<Option<String>>>,
    ) -> ExportRunResult {
        let now = Utc::now();
        let lower_bound = window_start.lock().await.clone();

        let mut base_query = AuditLogQuery::default();
        base_query.start_time = lower_bound.clone();

        // Page through the store and collect all matching entries.
        let mut all: Vec<AuditLogEntry> = Vec::new();
        let mut offset = 0usize;
        loop {
            let mut q = base_query.clone();
            q.offset = offset;
            q.limit = config.batch_size;
            let resp = match store.query(&q).await {
                Ok(r) => r,
                Err(e) => {
                    return ExportRunResult {
                        success: false,
                        exported: 0,
                        archived: 0,
                        window_start: lower_bound.unwrap_or_default(),
                        error: Some(ExportError::from(e).to_string()),
                    };
                }
            };
            if resp.entries.is_empty() {
                break;
            }
            all.extend(resp.entries);
            offset += resp.count;
            if resp.count < config.batch_size {
                break;
            }
        }

        let exported = all.len();
        let archived = match archiver.archive_entries(&all).await {
            Ok(n) => n,
            Err(e) => {
                return ExportRunResult {
                    success: false,
                    exported,
                    archived: 0,
                    window_start: lower_bound.unwrap_or_default(),
                    error: Some(ExportError::from(e).to_string()),
                };
            }
        };

        // Advance the window so the next run is incremental.
        let now_rfc = now.to_rfc3339();
        *window_start.lock().await = Some(now_rfc.clone());
        last_count.store(exported, Ordering::Relaxed);
        *last_run_at.lock().await = Some(now_rfc.clone());

        ExportRunResult {
            success: true,
            exported,
            archived,
            window_start: now_rfc,
            error: None,
        }
    }

    /// Run a single export immediately (for testing or manual trigger).
    pub async fn run_once(&self) -> ExportRunResult {
        let config = self.config.lock().await.clone();
        Self::export_once(
            &self.store,
            &self.archiver,
            &config,
            &self.last_window_start,
            &self.last_count,
            &self.last_run_at,
        )
        .await
    }

    /// Get statistics about the export task.
    pub async fn get_stats(&self) -> ExportTaskStats {
        let config = self.config.lock().await;
        let last_run_at = self.last_run_at.lock().await.clone();
        ExportTaskStats {
            running: self.is_running(),
            interval_secs: config.interval_secs,
            last_export_count: self.last_count.load(Ordering::Relaxed),
            last_export_at: last_run_at,
        }
    }
}

// ===== Object-safe Controller (AppState Integration) =====

/// Object-safe trait that erases the `<S: AuditLogStore>` parameter from
/// [`AuditExportTask`], mirroring the retention controller pattern.
pub trait AuditExportControl {
    fn start(&mut self);
    fn stop(&mut self);
    fn is_running(&self) -> bool;
    fn get_stats(&self) -> Pin<Box<dyn Future<Output = ExportTaskStats> + Send + '_>>;
    /// Run a single export immediately (manual trigger).  Does not
    /// affect the background loop's schedule.  Returns the run result.
    fn trigger_once(&self) -> Pin<Box<dyn Future<Output = ExportRunResult> + Send + '_>>;
}

impl<S: AuditLogStore + Send + Sync + 'static + ?Sized> AuditExportControl for AuditExportTask<S> {
    fn start(&mut self) {
        <AuditExportTask<S>>::start(self);
    }

    fn stop(&mut self) {
        <AuditExportTask<S>>::stop(self);
    }

    fn is_running(&self) -> bool {
        <AuditExportTask<S>>::is_running(self)
    }

    fn get_stats(&self) -> Pin<Box<dyn Future<Output = ExportTaskStats> + Send + '_>> {
        Box::pin(<AuditExportTask<S>>::get_stats(self))
    }

    fn trigger_once(&self) -> Pin<Box<dyn Future<Output = ExportRunResult> + Send + '_>> {
        Box::pin(<AuditExportTask<S>>::run_once(self))
    }
}

/// Controller owning a generic [`AuditExportTask`] behind an object-safe
/// interface. Stored in [`AppState`] and driven by the export HTTP API.
pub struct AuditExportController {
    inner: Mutex<Box<dyn AuditExportControl + Send + Sync>>,
    running_flag: AtomicBool,
}

impl AuditExportController {
    /// Build a controller wired to the shared config + store + archiver.
    pub fn new(
        config: Arc<Mutex<ExportTaskConfig>>,
        store: Arc<dyn AuditLogStore>,
        archiver: Arc<AuditLogArchiver>,
    ) -> Self {
        let task: AuditExportTask<dyn AuditLogStore> =
            AuditExportTask::new(config, store, archiver);
        let boxed: Box<dyn AuditExportControl + Send + Sync> = Box::new(task);
        Self {
            inner: Mutex::new(boxed),
            running_flag: AtomicBool::new(false),
        }
    }

    /// Build a no-op controller for tests / minimal binaries.
    pub fn noop() -> Self {
        Self {
            inner: Mutex::new(Box::new(NoopExportControl)),
            running_flag: AtomicBool::new(false),
        }
    }

    /// Start the periodic export background task.
    pub async fn start(&self) {
        let mut inner = self.inner.lock().await;
        if inner.is_running() {
            warn!("AuditExportController::start called while already running");
            return;
        }
        inner.start();
        self.running_flag
            .store(inner.is_running(), Ordering::Relaxed);
        info!("Audit export task started via API");
    }

    /// Stop the periodic export background task.
    pub async fn stop(&self) {
        let mut inner = self.inner.lock().await;
        inner.stop();
        self.running_flag
            .store(inner.is_running(), Ordering::Relaxed);
        info!("Audit export task stopped via API");
    }

    /// Cheap running check (atomic read, no lock).
    pub fn is_running(&self) -> bool {
        self.running_flag.load(Ordering::Relaxed)
    }

    /// Fetch full statistics for the task.
    pub async fn status(&self) -> ExportTaskStats {
        let inner = self.inner.lock().await;
        let mut stats = inner.get_stats().await;
        self.running_flag.store(stats.running, Ordering::Relaxed);
        if stats.running != self.is_running() {
            self.running_flag.store(stats.running, Ordering::Relaxed);
        }
        stats.running = self.is_running();
        stats
    }

    /// Trigger a single export run immediately (manual trigger).
    /// Does not affect the background loop's schedule.
    pub async fn trigger_once(&self) -> ExportRunResult {
        let inner = self.inner.lock().await;
        inner.trigger_once().await
    }
}

impl Drop for AuditExportController {
    fn drop(&mut self) {
        if let Ok(mut inner) = self.inner.try_lock() {
            inner.stop();
        }
    }
}

/// Sentinel [`AuditExportControl`] used by [`AuditExportController::noop`].
pub(crate) struct NoopExportControl;

impl AuditExportControl for NoopExportControl {
    fn start(&mut self) {}
    fn stop(&mut self) {}
    fn is_running(&self) -> bool {
        false
    }
    fn get_stats(&self) -> Pin<Box<dyn Future<Output = ExportTaskStats> + Send + '_>> {
        Box::pin(async {
            ExportTaskStats {
                running: false,
                interval_secs: 86400,
                last_export_count: 0,
                last_export_at: None,
            }
        })
    }
    fn trigger_once(&self) -> Pin<Box<dyn Future<Output = ExportRunResult> + Send + '_>> {
        Box::pin(async {
            ExportRunResult {
                success: true,
                exported: 0,
                archived: 0,
                window_start: String::new(),
                error: None,
            }
        })
    }
}

// ===== Tests =====

#[cfg(test)]
mod tests {
    use super::*;
    use crate::routes::business_tools::audit_archiver::ArchiveConfig;
    use crate::routes::business_tools::mock_audit_store::{make_test_entry, MockAuditLogStore};
    use tempfile::TempDir;

    fn make_task() -> (
        Arc<Mutex<ExportTaskConfig>>,
        Arc<MockAuditLogStore>,
        Arc<AuditLogArchiver>,
        AuditExportTask<MockAuditLogStore>,
        TempDir,
    ) {
        let dir = TempDir::new().unwrap();
        let config = Arc::new(Mutex::new(ExportTaskConfig::new(3600).with_batch_size(50)));
        let store = Arc::new(MockAuditLogStore::new());
        let archiver = Arc::new(AuditLogArchiver::new(ArchiveConfig::new(dir.path())));
        let task = AuditExportTask::new(config.clone(), store.clone(), archiver.clone());
        (config, store, archiver, task, dir)
    }

    #[tokio::test]
    async fn test_export_task_creation() {
        let (_, _, _, task, _dir) = make_task();
        assert!(!task.is_running());
    }

    #[tokio::test]
    async fn test_export_task_start_stop() {
        let (_, _, _, mut task, _dir) = make_task();
        task.start();
        assert!(task.is_running());
        task.stop();
        assert!(!task.is_running());
    }

    #[tokio::test]
    async fn test_export_task_run_once_empty() {
        let (_, _, _, task, _dir) = make_task();
        let result = task.run_once().await;
        assert!(result.success);
        assert_eq!(result.exported, 0);
        assert_eq!(result.archived, 0);
    }

    #[tokio::test]
    async fn test_export_task_run_once_with_entries() {
        let (_, store, archiver, task, _dir) = make_task();
        store.add_entry(make_test_entry("1", "2026-01-15T10:00:00Z"));
        store.add_entry(make_test_entry("2", "2026-01-15T11:00:00Z"));

        let result = task.run_once().await;
        assert!(result.success);
        assert_eq!(result.exported, 2);
        assert_eq!(result.archived, 2);

        let archives = archiver.list_archives().unwrap();
        assert_eq!(archives.len(), 1);
        assert!(archives[0].path.contains("2026-01-15"));
    }

    #[tokio::test]
    async fn test_export_task_incremental_window() {
        // Second run should export 0 entries because the window advanced
        // past all entries inserted before the first run.
        let (_, store, _, task, _dir) = make_task();
        store.add_entry(make_test_entry("1", "2026-01-15T10:00:00Z"));

        let first = task.run_once().await;
        assert!(first.success);
        assert_eq!(first.exported, 1);

        let second = task.run_once().await;
        assert!(second.success);
        assert_eq!(second.exported, 0);
    }

    #[tokio::test]
    async fn test_export_task_get_stats() {
        let (_, store, _, task, _dir) = make_task();
        store.add_entry(make_test_entry("1", "2026-01-15T10:00:00Z"));
        task.run_once().await;

        let stats = task.get_stats().await;
        assert!(!stats.running);
        assert_eq!(stats.interval_secs, 3600);
        assert_eq!(stats.last_export_count, 1);
        assert!(stats.last_export_at.is_some());
    }

    #[tokio::test]
    async fn test_export_task_double_start() {
        let (_, _, _, mut task, _dir) = make_task();
        task.start();
        task.start();
        assert!(task.is_running());
        task.stop();
    }

    #[tokio::test]
    async fn test_export_task_stop_when_not_running() {
        let (_, _, _, mut task, _dir) = make_task();
        task.stop();
        assert!(!task.is_running());
    }

    // ===== AuditExportController (object-safe wrapper) =====

    #[tokio::test]
    async fn test_controller_noop_defaults() {
        let ctl = AuditExportController::noop();
        assert!(!ctl.is_running());
        let stats = ctl.status().await;
        assert!(!stats.running);
        assert_eq!(stats.interval_secs, 86400);
        assert_eq!(stats.last_export_count, 0);
        assert!(stats.last_export_at.is_none());
    }

    #[tokio::test]
    async fn test_controller_noop_start_stop_idempotent() {
        let ctl = AuditExportController::noop();
        ctl.start().await;
        ctl.start().await;
        assert!(!ctl.is_running());
        ctl.stop().await;
        ctl.stop().await;
        assert!(!ctl.is_running());
    }

    #[tokio::test]
    async fn test_controller_noop_trigger_once() {
        let ctl = AuditExportController::noop();
        let result = ctl.trigger_once().await;
        assert!(result.success);
        assert_eq!(result.exported, 0);
    }

    #[tokio::test]
    async fn test_controller_trigger_once_with_mock_store() {
        let dir = TempDir::new().unwrap();
        let config = Arc::new(Mutex::new(ExportTaskConfig::new(7200)));
        let store: Arc<dyn AuditLogStore> = Arc::new(MockAuditLogStore::new());
        let archiver = Arc::new(AuditLogArchiver::new(ArchiveConfig::new(dir.path())));
        let ctl = AuditExportController::new(config, store, archiver.clone());

        // Empty mock store → run_once returns success with 0 exported.
        let result = ctl.trigger_once().await;
        assert!(result.success);
        assert_eq!(result.exported, 0);
        assert_eq!(result.archived, 0);
        // No archive file should be written for 0 entries.
        let archives = archiver.list_archives().unwrap();
        assert!(archives.is_empty());
    }

    #[tokio::test]
    async fn test_controller_new_with_mock_store() {
        let dir = TempDir::new().unwrap();
        let config = Arc::new(Mutex::new(ExportTaskConfig::new(7200)));
        let store: Arc<dyn AuditLogStore> = Arc::new(MockAuditLogStore::new());
        let archiver = Arc::new(AuditLogArchiver::new(ArchiveConfig::new(dir.path())));
        let ctl = AuditExportController::new(config, store, archiver);

        let stats_before = ctl.status().await;
        assert!(!stats_before.running);
        assert_eq!(stats_before.interval_secs, 7200);

        ctl.start().await;
        assert!(ctl.is_running());
        let stats_running = ctl.status().await;
        assert!(stats_running.running);

        ctl.stop().await;
        assert!(!ctl.is_running());
    }

    #[test]
    fn test_export_task_stats_serialization() {
        let stats = ExportTaskStats {
            running: true,
            interval_secs: 3600,
            last_export_count: 42,
            last_export_at: Some("2026-08-31T10:00:00Z".to_string()),
        };
        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("\"running\":true"));
        assert!(json.contains("\"interval_secs\":3600"));
        assert!(json.contains("\"last_export_count\":42"));
    }

    #[test]
    fn test_export_run_result_serialization() {
        let result = ExportRunResult {
            success: true,
            exported: 5,
            archived: 5,
            window_start: "2026-08-31T10:00:00Z".to_string(),
            error: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"exported\":5"));
        assert!(!json.contains("error"));
    }
}

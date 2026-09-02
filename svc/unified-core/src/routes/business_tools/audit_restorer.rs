//! V470: Audit Log Restorer
//!
//! Provides functionality to restore audit log entries from archive files
//! back to the audit log store. Supports restoring by date range and
//! individual files.

use std::fs;
use std::path::{Path, PathBuf};

use serde::Deserialize;
use tracing::{error, info, warn};

use crate::routes::business_tools::audit_archiver::ArchivedEntry;
use crate::routes::business_tools::permission_audit_log::AuditLogStore;

// ===== Restore Configuration =====

/// Configuration for audit log restoration.
#[derive(Debug, Clone)]
pub struct RestoreConfig {
    /// Base directory for archived logs.
    pub archive_dir: PathBuf,
    /// Archive filename prefix.
    pub file_prefix: String,
    /// Whether to skip entries that already exist (by ID).
    pub skip_existing: bool,
    /// Maximum number of entries to restore per batch.
    pub batch_size: usize,
}

impl Default for RestoreConfig {
    fn default() -> Self {
        Self {
            archive_dir: PathBuf::from("audit_archives"),
            file_prefix: "audit_log".to_string(),
            skip_existing: true,
            batch_size: 1000,
        }
    }
}

impl RestoreConfig {
    /// Create a new restore configuration with the given archive directory.
    pub fn new(archive_dir: impl Into<PathBuf>) -> Self {
        Self {
            archive_dir: archive_dir.into(),
            ..Default::default()
        }
    }

    /// Set whether to skip existing entries.
    pub fn with_skip_existing(mut self, skip: bool) -> Self {
        self.skip_existing = skip;
        self
    }

    /// Set the batch size for restoration.
    pub fn with_batch_size(mut self, size: usize) -> Self {
        self.batch_size = size;
        self
    }

    /// Set the archive filename prefix.
    pub fn with_file_prefix(mut self, prefix: impl Into<String>) -> Self {
        self.file_prefix = prefix.into();
        self
    }
}

// ===== Restore Result =====

/// Result of a restore operation.
#[derive(Debug, Clone, serde::Serialize)]
pub struct RestoreResult {
    /// Number of entries successfully restored.
    pub restored_count: usize,
    /// Number of entries skipped (already exist).
    pub skipped_count: usize,
    /// Number of entries that failed to restore.
    pub failed_count: usize,
    /// Number of archive files processed.
    pub files_processed: usize,
    /// Whether the restore was successful.
    pub success: bool,
    /// Error message if restore failed (optional).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ===== Restore Query =====

/// Query parameters for restoring audit logs.
#[derive(Debug, Clone, Deserialize)]
pub struct RestoreQuery {
    /// Start date for restoration (YYYY-MM-DD, optional).
    #[serde(default)]
    pub start_date: Option<String>,
    /// End date for restoration (YYYY-MM-DD, optional).
    #[serde(default)]
    pub end_date: Option<String>,
    /// Specific filename to restore (optional).
    #[serde(default)]
    pub filename: Option<String>,
}

// ===== Audit Log Restorer =====

/// Restores audit log entries from archive files.
pub struct AuditLogRestorer {
    config: RestoreConfig,
}

impl AuditLogRestorer {
    /// Create a new restorer with the given configuration.
    pub fn new(config: RestoreConfig) -> Self {
        Self { config }
    }

    /// Get the restore configuration.
    pub fn config(&self) -> &RestoreConfig {
        &self.config
    }

    /// Restore audit logs based on the query.
    pub async fn restore(
        &self,
        store: &dyn AuditLogStore,
        query: &RestoreQuery,
    ) -> Result<RestoreResult, RestoreError> {
        // Find archive files to restore
        let files = self.find_archive_files(query)?;

        if files.is_empty() {
            return Ok(RestoreResult {
                restored_count: 0,
                skipped_count: 0,
                failed_count: 0,
                files_processed: 0,
                success: true,
                error: None,
            });
        }

        let mut result = RestoreResult {
            restored_count: 0,
            skipped_count: 0,
            failed_count: 0,
            files_processed: 0,
            success: true,
            error: None,
        };

        for file_path in files {
            match self.restore_from_file(store, &file_path).await {
                Ok((restored, skipped, failed)) => {
                    result.restored_count += restored;
                    result.skipped_count += skipped;
                    result.failed_count += failed;
                    result.files_processed += 1;
                    info!(
                        file = %file_path.display(),
                        restored = restored,
                        skipped = skipped,
                        failed = failed,
                        "Restored audit log entries from file"
                    );
                }
                Err(e) => {
                    result.failed_count += 1;
                    result.success = false;
                    result.error =
                        Some(format!("Failed to restore {}: {}", file_path.display(), e));
                    error!(
                        file = %file_path.display(),
                        error = %e,
                        "Failed to restore audit log entries from file"
                    );
                }
            }
        }

        Ok(result)
    }

    /// Restore entries from a single archive file.
    async fn restore_from_file(
        &self,
        store: &dyn AuditLogStore,
        file_path: &Path,
    ) -> Result<(usize, usize, usize), RestoreError> {
        // Read and parse archive file
        let entries = self.read_archive_file(file_path)?;

        let mut restored = 0;
        let mut skipped = 0;
        let mut failed = 0;

        for archived_entry in entries {
            let entry = archived_entry.entry;

            // Check if entry already exists
            if self.config.skip_existing {
                match store.get_by_id(&entry.id).await {
                    Ok(Some(_)) => {
                        skipped += 1;
                        continue;
                    }
                    Ok(None) => {}
                    Err(e) => {
                        warn!(id = %entry.id, error = %e, "Failed to check if entry exists");
                        failed += 1;
                        continue;
                    }
                }
            }

            // Restore the entry
            match store.record(entry).await {
                Ok(_) => restored += 1,
                Err(e) => {
                    failed += 1;
                    warn!(error = %e, "Failed to restore audit log entry");
                }
            }
        }

        Ok((restored, skipped, failed))
    }

    /// Read and parse an archive file.
    fn read_archive_file(&self, file_path: &Path) -> Result<Vec<ArchivedEntry>, RestoreError> {
        let content = fs::read_to_string(file_path).map_err(|e| {
            RestoreError::Io(format!(
                "Failed to read file {}: {}",
                file_path.display(),
                e
            ))
        })?;

        // Try to parse as JSON array (standard format)
        match serde_json::from_str::<Vec<ArchivedEntry>>(&content) {
            Ok(entries) => Ok(entries),
            Err(_) => {
                // Try to parse as JSONL (one JSON object per line)
                let mut entries = Vec::new();
                for line in content.lines() {
                    if line.trim().is_empty() {
                        continue;
                    }
                    match serde_json::from_str::<ArchivedEntry>(line) {
                        Ok(entry) => entries.push(entry),
                        Err(e) => {
                            warn!(error = %e, "Failed to parse archive line");
                        }
                    }
                }
                if entries.is_empty() {
                    Err(RestoreError::Parse(format!(
                        "Failed to parse archive file {}: no valid entries found",
                        file_path.display()
                    )))
                } else {
                    Ok(entries)
                }
            }
        }
    }

    /// Find archive files matching the query.
    fn find_archive_files(&self, query: &RestoreQuery) -> Result<Vec<PathBuf>, RestoreError> {
        if !self.config.archive_dir.exists() {
            return Ok(Vec::new());
        }

        let mut files = Vec::new();

        for entry in fs::read_dir(&self.config.archive_dir)
            .map_err(|e| RestoreError::Io(format!("Failed to read archive directory: {}", e)))?
        {
            let entry = entry
                .map_err(|e| RestoreError::Io(format!("Failed to read directory entry: {}", e)))?;
            let path = entry.path();

            if !path.is_file() {
                continue;
            }

            let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

            // Check if file matches prefix
            if !filename.starts_with(&self.config.file_prefix) {
                continue;
            }

            // If specific filename is specified, only match that
            if let Some(target_filename) = &query.filename {
                if filename != target_filename {
                    continue;
                }
            }

            // Check date range
            if let Some(start_date) = &query.start_date {
                if !filename.contains(start_date) {
                    // Check if file date is after start date
                    if let Some(file_date) =
                        extract_date_from_filename(filename, &self.config.file_prefix)
                    {
                        if file_date.as_str() < start_date.as_str() {
                            continue;
                        }
                    }
                }
            }

            if let Some(end_date) = &query.end_date {
                if let Some(file_date) =
                    extract_date_from_filename(filename, &self.config.file_prefix)
                {
                    if file_date.as_str() > end_date.as_str() {
                        continue;
                    }
                }
            }

            files.push(path);
        }

        files.sort();
        Ok(files)
    }

    /// List available archive files.
    pub fn list_archive_files(&self) -> Result<Vec<String>, RestoreError> {
        if !self.config.archive_dir.exists() {
            return Ok(Vec::new());
        }

        let mut files = Vec::new();

        for entry in fs::read_dir(&self.config.archive_dir)
            .map_err(|e| RestoreError::Io(format!("Failed to read archive directory: {}", e)))?
        {
            let entry = entry
                .map_err(|e| RestoreError::Io(format!("Failed to read directory entry: {}", e)))?;
            let filename = entry.file_name().to_string_lossy().to_string();

            if filename.starts_with(&self.config.file_prefix) {
                files.push(filename);
            }
        }

        files.sort();
        Ok(files)
    }
}

// ===== Restore Error =====

/// Errors that can occur during restoration.
#[derive(Debug, thiserror::Error)]
pub enum RestoreError {
    /// I/O error.
    #[error("I/O error: {0}")]
    Io(String),
    /// Parse error.
    #[error("Parse error: {0}")]
    Parse(String),
    /// Store error.
    #[error("Store error: {0}")]
    Store(String),
}

// ===== Helper Functions =====

/// Extract date from archive filename.
fn extract_date_from_filename(filename: &str, prefix: &str) -> Option<String> {
    // Expected format: {prefix}_{YYYY-MM-DD}.json or {prefix}_{YYYY-MM-DD}.json.gz
    let rest = filename.strip_prefix(prefix)?;
    let rest = rest.strip_prefix('_')?;
    let date_part: String = rest.chars().take(10).collect();
    if date_part.len() == 10
        && date_part.chars().nth(4) == Some('-')
        && date_part.chars().nth(7) == Some('-')
    {
        Some(date_part)
    } else {
        None
    }
}

// ===== Tests =====

// ===== Tests =====

#[cfg(test)]
mod tests {
    use super::*;
    use crate::routes::business_tools::mock_audit_store::{make_test_entry, MockAuditLogStore};
    use tempfile::TempDir;

    fn make_archived_entry(id: &str, created_at: &str) -> ArchivedEntry {
        ArchivedEntry {
            archived_at: "2026-01-15T10:00:00Z".to_string(),
            entry: make_test_entry(id, created_at),
        }
    }

    #[test]
    fn test_restore_config_default() {
        let config = RestoreConfig::default();
        assert_eq!(config.archive_dir, PathBuf::from("audit_archives"));
        assert_eq!(config.file_prefix, "audit_log");
        assert!(config.skip_existing);
        assert_eq!(config.batch_size, 1000);
    }

    #[test]
    fn test_restore_config_new() {
        let config = RestoreConfig::new("/tmp/archives");
        assert_eq!(config.archive_dir, PathBuf::from("/tmp/archives"));
    }

    #[test]
    fn test_restore_config_with_skip_existing() {
        let config = RestoreConfig::default().with_skip_existing(false);
        assert!(!config.skip_existing);
    }

    #[test]
    fn test_restore_config_with_batch_size() {
        let config = RestoreConfig::default().with_batch_size(500);
        assert_eq!(config.batch_size, 500);
    }

    #[test]
    fn test_extract_date_from_filename() {
        assert_eq!(
            extract_date_from_filename("audit_log_2026-01-15.json", "audit_log"),
            Some("2026-01-15".to_string())
        );
        assert_eq!(
            extract_date_from_filename("audit_log_2026-01-15.json.gz", "audit_log"),
            Some("2026-01-15".to_string())
        );
        assert_eq!(
            extract_date_from_filename("other_file.json", "audit_log"),
            None
        );
    }

    #[test]
    fn test_restore_result_serialization() {
        let result = RestoreResult {
            restored_count: 10,
            skipped_count: 5,
            failed_count: 1,
            files_processed: 2,
            success: true,
            error: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"restored_count\":10"));
        assert!(json.contains("\"skipped_count\":5"));
        assert!(json.contains("\"success\":true"));
        assert!(!json.contains("error"));
    }

    #[tokio::test]
    async fn test_restore_empty_directory() {
        let temp_dir = TempDir::new().unwrap();
        let config = RestoreConfig::new(temp_dir.path());
        let restorer = AuditLogRestorer::new(config);
        let store = MockAuditLogStore::new();
        let query = RestoreQuery {
            start_date: None,
            end_date: None,
            filename: None,
        };

        let result = restorer.restore(&store, &query).await.unwrap();
        assert_eq!(result.restored_count, 0);
        assert_eq!(result.files_processed, 0);
    }

    #[tokio::test]
    async fn test_restore_from_file() {
        let temp_dir = TempDir::new().unwrap();
        let archive_path = temp_dir.path().join("audit_log_2026-01-15.json");

        // Create an archive file with entries
        let entries = vec![
            make_archived_entry("1", "2026-01-15T10:00:00Z"),
            make_archived_entry("2", "2026-01-15T11:00:00Z"),
        ];
        let json = serde_json::to_string_pretty(&entries).unwrap();
        fs::write(&archive_path, json).unwrap();

        let config = RestoreConfig::new(temp_dir.path());
        let restorer = AuditLogRestorer::new(config);
        let store = MockAuditLogStore::new();
        let query = RestoreQuery {
            start_date: None,
            end_date: None,
            filename: Some("audit_log_2026-01-15.json".to_string()),
        };

        let result = restorer.restore(&store, &query).await.unwrap();
        assert_eq!(result.restored_count, 2);
        assert_eq!(result.files_processed, 1);
        assert!(result.success);
    }

    #[tokio::test]
    async fn test_restore_skip_existing() {
        let temp_dir = TempDir::new().unwrap();
        let archive_path = temp_dir.path().join("audit_log_2026-01-15.json");

        let entries = vec![make_archived_entry("1", "2026-01-15T10:00:00Z")];
        let json = serde_json::to_string_pretty(&entries).unwrap();
        fs::write(&archive_path, json).unwrap();

        let config = RestoreConfig::new(temp_dir.path()).with_skip_existing(true);
        let restorer = AuditLogRestorer::new(config);
        let store = MockAuditLogStore::new();

        // Pre-populate store with entry "1"
        store
            .record(make_test_entry("1", "2026-01-15T10:00:00Z"))
            .await
            .unwrap();

        let query = RestoreQuery {
            start_date: None,
            end_date: None,
            filename: Some("audit_log_2026-01-15.json".to_string()),
        };

        let result = restorer.restore(&store, &query).await.unwrap();
        assert_eq!(result.restored_count, 0);
        assert_eq!(result.skipped_count, 1);
    }

    #[test]
    fn test_list_archive_files() {
        let temp_dir = TempDir::new().unwrap();
        fs::write(temp_dir.path().join("audit_log_2026-01-15.json"), "[]").unwrap();
        fs::write(temp_dir.path().join("audit_log_2026-01-16.json"), "[]").unwrap();
        fs::write(temp_dir.path().join("other_file.json"), "[]").unwrap();

        let config = RestoreConfig::new(temp_dir.path());
        let restorer = AuditLogRestorer::new(config);
        let files = restorer.list_archive_files().unwrap();

        assert_eq!(files.len(), 2);
        assert!(files.contains(&"audit_log_2026-01-15.json".to_string()));
        assert!(files.contains(&"audit_log_2026-01-16.json".to_string()));
    }

    #[test]
    fn test_restore_error_display() {
        let err = RestoreError::Io("permission denied".to_string());
        assert_eq!(err.to_string(), "I/O error: permission denied");

        let err = RestoreError::Parse("invalid JSON".to_string());
        assert_eq!(err.to_string(), "Parse error: invalid JSON");
    }
}

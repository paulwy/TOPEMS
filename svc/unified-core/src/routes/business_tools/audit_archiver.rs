//! V467: Audit Log Archiver
//!
//! Provides archival functionality for audit logs, supporting writing
//! old audit log entries to JSON files before deletion.

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tracing::{error, info, warn};

use crate::routes::business_tools::permission_audit_log::AuditLogEntry;

// ===== Archive Configuration =====

/// Configuration for audit log archival.
#[derive(Debug, Clone)]
pub struct ArchiveConfig {
    /// Base directory for archived logs.
    pub archive_dir: PathBuf,
    /// Whether to compress archived files with gzip.
    pub compress: bool,
    /// Maximum archive file size in bytes before rotating.
    pub max_file_size: u64,
    /// Archive filename prefix.
    pub file_prefix: String,
}

impl Default for ArchiveConfig {
    fn default() -> Self {
        Self {
            archive_dir: PathBuf::from("audit_archives"),
            compress: false,
            max_file_size: 10 * 1024 * 1024, // 10 MB
            file_prefix: "audit_log".to_string(),
        }
    }
}

impl ArchiveConfig {
    /// Create a new archive configuration with the given directory.
    pub fn new(archive_dir: impl Into<PathBuf>) -> Self {
        Self {
            archive_dir: archive_dir.into(),
            ..Default::default()
        }
    }

    /// Enable gzip compression for archived files.
    pub fn with_compression(mut self) -> Self {
        self.compress = true;
        self
    }

    /// Set the maximum archive file size.
    pub fn with_max_file_size(mut self, max_size: u64) -> Self {
        self.max_file_size = max_size;
        self
    }

    /// Set the archive filename prefix.
    pub fn with_file_prefix(mut self, prefix: impl Into<String>) -> Self {
        self.file_prefix = prefix.into();
        self
    }
}

// ===== Archive Entry =====

/// A single archived audit log entry with archive metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchivedEntry {
    /// Archive timestamp.
    pub archived_at: String,
    /// The original audit log entry.
    pub entry: AuditLogEntry,
}

// ===== Archive File Info =====

/// Information about an archive file.
#[derive(Debug, Clone, Serialize)]
pub struct ArchiveFileInfo {
    /// File path.
    pub path: String,
    /// File size in bytes.
    pub size: u64,
    /// Number of entries in the file.
    pub entry_count: usize,
    /// Creation time.
    pub created_at: String,
    /// Whether the file is compressed.
    pub compressed: bool,
}

// ===== Audit Log Archiver =====

/// Archives audit log entries to files.
pub struct AuditLogArchiver {
    config: ArchiveConfig,
}

impl AuditLogArchiver {
    /// Create a new archiver with the given configuration.
    pub fn new(config: ArchiveConfig) -> Self {
        Self { config }
    }

    /// Get the archive configuration.
    pub fn config(&self) -> &ArchiveConfig {
        &self.config
    }

    /// Archive a batch of audit log entries.
    /// Returns the number of entries successfully archived.
    pub async fn archive_entries(&self, entries: &[AuditLogEntry]) -> Result<usize, ArchiveError> {
        if entries.is_empty() {
            return Ok(0);
        }

        // Ensure archive directory exists
        self.ensure_archive_dir()?;

        // Group entries by date
        let mut by_date: std::collections::HashMap<String, Vec<&AuditLogEntry>> =
            std::collections::HashMap::new();
        for entry in entries {
            let date = extract_date(&entry.changed_at);
            by_date.entry(date).or_default().push(entry);
        }

        let mut total_archived = 0;

        for (date, date_entries) in by_date {
            let archived_entries: Vec<ArchivedEntry> = date_entries
                .iter()
                .map(|e| ArchivedEntry {
                    archived_at: Utc::now().to_rfc3339(),
                    entry: (*e).clone(),
                })
                .collect();

            match self.write_archive_file(&date, &archived_entries) {
                Ok(count) => {
                    total_archived += count;
                    info!(
                        date = %date,
                        count = count,
                        "Archived audit log entries"
                    );
                }
                Err(e) => {
                    error!(
                        date = %date,
                        error = %e,
                        "Failed to archive audit log entries"
                    );
                    return Err(e);
                }
            }
        }

        Ok(total_archived)
    }

    /// Write entries to an archive file.
    fn write_archive_file(
        &self,
        date: &str,
        entries: &[ArchivedEntry],
    ) -> Result<usize, ArchiveError> {
        let filename = if self.config.compress {
            format!("{}_{}.json.gz", self.config.file_prefix, date)
        } else {
            format!("{}_{}.json", self.config.file_prefix, date)
        };

        let filepath = self.config.archive_dir.join(&filename);

        // Serialize entries to JSON
        let json = serde_json::to_string_pretty(entries)
            .map_err(|e| ArchiveError::Serialization(e.to_string()))?;

        if self.config.compress {
            self.write_compressed_file(&filepath, json.as_bytes())?;
        } else {
            self.write_plain_file(&filepath, json.as_bytes())?;
        }

        Ok(entries.len())
    }

    /// Write a plain (uncompressed) file.
    fn write_plain_file(&self, path: &Path, data: &[u8]) -> Result<(), ArchiveError> {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|e| ArchiveError::Io(e.to_string()))?;

        file.write_all(data)
            .map_err(|e| ArchiveError::Io(e.to_string()))?;
        file.write_all(b"\n")
            .map_err(|e| ArchiveError::Io(e.to_string()))?;

        Ok(())
    }

    /// V472: Write a gzip-compressed file using flate2.
    fn write_compressed_file(&self, path: &Path, data: &[u8]) -> Result<(), ArchiveError> {
        // Compress data using flate2
        let compressed = compress_gzip(data)?;

        // Write compressed file (append mode)
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|e| ArchiveError::Io(e.to_string()))?;

        file.write_all(&compressed)
            .map_err(|e| ArchiveError::Io(e.to_string()))?;

        Ok(())
    }

    /// Ensure the archive directory exists.
    fn ensure_archive_dir(&self) -> Result<(), ArchiveError> {
        if !self.config.archive_dir.exists() {
            fs::create_dir_all(&self.config.archive_dir)
                .map_err(|e| ArchiveError::Io(e.to_string()))?;
            info!(
                dir = ?self.config.archive_dir,
                "Created archive directory"
            );
        }
        Ok(())
    }

    /// List archive files in the archive directory.
    pub fn list_archives(&self) -> Result<Vec<ArchiveFileInfo>, ArchiveError> {
        if !self.config.archive_dir.exists() {
            return Ok(Vec::new());
        }

        let mut archives = Vec::new();

        for entry in
            fs::read_dir(&self.config.archive_dir).map_err(|e| ArchiveError::Io(e.to_string()))?
        {
            let entry = entry.map_err(|e| ArchiveError::Io(e.to_string()))?;
            let path = entry.path();

            if path.is_file() {
                let metadata = entry
                    .metadata()
                    .map_err(|e| ArchiveError::Io(e.to_string()))?;
                let created = metadata
                    .created()
                    .ok()
                    .map(|t| {
                        let dt: DateTime<Utc> = t.into();
                        dt.to_rfc3339()
                    })
                    .unwrap_or_else(|| Utc::now().to_rfc3339());

                let compressed = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e == "gz")
                    .unwrap_or(false);

                archives.push(ArchiveFileInfo {
                    path: path.to_string_lossy().to_string(),
                    size: metadata.len(),
                    entry_count: 0, // Would need to parse file to count
                    created_at: created,
                    compressed,
                });
            }
        }

        archives.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(archives)
    }

    /// Get total size of all archive files.
    pub fn total_archive_size(&self) -> Result<u64, ArchiveError> {
        let archives = self.list_archives()?;
        Ok(archives.iter().map(|a| a.size).sum())
    }

    /// Clean up archives older than the given number of days.
    pub fn cleanup_old_archives(&self, max_age_days: u32) -> Result<usize, ArchiveError> {
        let archives = self.list_archives()?;
        let cutoff = Utc::now() - chrono::Duration::days(max_age_days as i64);
        let mut removed = 0;

        for archive in archives {
            let created = DateTime::parse_from_rfc3339(&archive.created_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or(Utc::now());

            if created < cutoff {
                match fs::remove_file(&archive.path) {
                    Ok(_) => {
                        removed += 1;
                        info!(path = %archive.path, "Removed old archive file");
                    }
                    Err(e) => {
                        warn!(path = %archive.path, error = %e, "Failed to remove old archive file");
                    }
                }
            }
        }

        Ok(removed)
    }
}

// ===== Archive Error =====

/// Errors that can occur during archival.
#[derive(Debug, thiserror::Error)]
pub enum ArchiveError {
    /// I/O error.
    #[error("I/O error: {0}")]
    Io(String),
    /// Serialization error.
    #[error("Serialization error: {0}")]
    Serialization(String),
    /// Compression error.
    #[error("Compression error: {0}")]
    Compression(String),
}

// ===== Helper Functions =====

/// Extract date (YYYY-MM-DD) from an RFC3339 timestamp string.
fn extract_date(timestamp: &str) -> String {
    timestamp.get(..10).unwrap_or("unknown").to_string()
}

/// V472: Gzip compression using the flate2 library.
fn compress_gzip(data: &[u8]) -> Result<Vec<u8>, ArchiveError> {
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::Write;

    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(data).map_err(|e| {
        ArchiveError::Compression(format!("Failed to write to gzip encoder: {}", e))
    })?;
    let compressed = encoder
        .finish()
        .map_err(|e| ArchiveError::Compression(format!("Failed to finish gzip encoding: {}", e)))?;
    Ok(compressed)
}

// ===== Tests =====

#[cfg(test)]
mod tests {
    use super::*;
    use crate::routes::business_tools::mock_audit_store::make_test_entry;
    use tempfile::TempDir;

    #[test]
    fn test_archive_config_default() {
        let config = ArchiveConfig::default();
        assert_eq!(config.archive_dir, PathBuf::from("audit_archives"));
        assert!(!config.compress);
        assert_eq!(config.max_file_size, 10 * 1024 * 1024);
        assert_eq!(config.file_prefix, "audit_log");
    }

    #[test]
    fn test_archive_config_new() {
        let config = ArchiveConfig::new("/tmp/archives");
        assert_eq!(config.archive_dir, PathBuf::from("/tmp/archives"));
    }

    #[test]
    fn test_archive_config_with_compression() {
        let config = ArchiveConfig::default().with_compression();
        assert!(config.compress);
    }

    #[test]
    fn test_archive_config_with_max_file_size() {
        let config = ArchiveConfig::default().with_max_file_size(5 * 1024 * 1024);
        assert_eq!(config.max_file_size, 5 * 1024 * 1024);
    }

    #[test]
    fn test_archive_config_with_file_prefix() {
        let config = ArchiveConfig::default().with_file_prefix("my_audit");
        assert_eq!(config.file_prefix, "my_audit");
    }

    #[test]
    fn test_extract_date() {
        assert_eq!(extract_date("2026-01-15T10:30:00Z"), "2026-01-15");
        assert_eq!(extract_date("invalid"), "unknown");
    }

    #[tokio::test]
    async fn test_archive_entries_empty() {
        let temp_dir = TempDir::new().unwrap();
        let config = ArchiveConfig::new(temp_dir.path());
        let archiver = AuditLogArchiver::new(config);

        let result = archiver.archive_entries(&[]).await.unwrap();
        assert_eq!(result, 0);
    }

    #[tokio::test]
    async fn test_archive_entries_single_date() {
        let temp_dir = TempDir::new().unwrap();
        let config = ArchiveConfig::new(temp_dir.path());
        let archiver = AuditLogArchiver::new(config);

        let entries = vec![
            make_test_entry("1", "2026-01-15T10:00:00Z"),
            make_test_entry("2", "2026-01-15T11:00:00Z"),
        ];

        let result = archiver.archive_entries(&entries).await.unwrap();
        assert_eq!(result, 2);

        // Verify file was created
        let archives = archiver.list_archives().unwrap();
        assert_eq!(archives.len(), 1);
        assert!(archives[0].path.contains("2026-01-15"));
    }

    #[tokio::test]
    async fn test_archive_entries_multiple_dates() {
        let temp_dir = TempDir::new().unwrap();
        let config = ArchiveConfig::new(temp_dir.path());
        let archiver = AuditLogArchiver::new(config);

        let entries = vec![
            make_test_entry("1", "2026-01-15T10:00:00Z"),
            make_test_entry("2", "2026-01-16T10:00:00Z"),
            make_test_entry("3", "2026-01-15T11:00:00Z"),
        ];

        let result = archiver.archive_entries(&entries).await.unwrap();
        assert_eq!(result, 3);

        let archives = archiver.list_archives().unwrap();
        assert_eq!(archives.len(), 2);
    }

    #[test]
    fn test_list_archives_empty() {
        let temp_dir = TempDir::new().unwrap();
        let config = ArchiveConfig::new(temp_dir.path());
        let archiver = AuditLogArchiver::new(config);

        let archives = archiver.list_archives().unwrap();
        assert!(archives.is_empty());
    }

    #[test]
    fn test_total_archive_size() {
        let temp_dir = TempDir::new().unwrap();
        let config = ArchiveConfig::new(temp_dir.path());
        let archiver = AuditLogArchiver::new(config);

        let size = archiver.total_archive_size().unwrap();
        assert_eq!(size, 0);
    }

    #[test]
    fn test_archived_entry_serialization() {
        let entry = ArchivedEntry {
            archived_at: "2026-01-15T10:00:00Z".to_string(),
            entry: make_test_entry("1", "2026-01-15T10:00:00Z"),
        };
        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("\"archived_at\""));
        assert!(json.contains("\"id\":\"1\""));
    }

    #[test]
    fn test_archive_file_info_serialization() {
        let info = ArchiveFileInfo {
            path: "/tmp/audit.json".to_string(),
            size: 1024,
            entry_count: 10,
            created_at: "2026-01-15T10:00:00Z".to_string(),
            compressed: false,
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"path\""));
        assert!(json.contains("\"size\":1024"));
    }

    #[test]
    fn test_archive_error_display() {
        let err = ArchiveError::Io("permission denied".to_string());
        assert_eq!(err.to_string(), "I/O error: permission denied");

        let err = ArchiveError::Serialization("invalid JSON".to_string());
        assert_eq!(err.to_string(), "Serialization error: invalid JSON");
    }

    #[test]
    fn test_compress_gzip() {
        use flate2::read::GzDecoder;
        use std::io::Read;

        let data = b"test data for gzip compression test";
        let compressed = compress_gzip(data).unwrap();

        // Compressed data should be different from original
        assert_ne!(compressed.as_slice(), &data[..]);

        // Should be able to decompress back to original
        let mut decoder = GzDecoder::new(&compressed[..]);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed).unwrap();
        assert_eq!(decompressed, data);
    }

    #[test]
    fn test_compress_gzip_large_data() {
        use flate2::read::GzDecoder;
        use std::io::Read;

        // Create larger data to test compression ratio
        let data: Vec<u8> = (0..10000).map(|i| (i % 256) as u8).collect();
        let compressed = compress_gzip(&data).unwrap();

        // Compressed should be smaller for repetitive data
        assert!(compressed.len() < data.len());

        // Should decompress correctly
        let mut decoder = GzDecoder::new(&compressed[..]);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed).unwrap();
        assert_eq!(decompressed, data);
    }
}

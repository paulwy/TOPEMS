use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::process::Command;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupConfig {
    pub enabled: bool,
    pub backup_dir: PathBuf,
    pub retention_days: u32,
    pub schedule: BackupSchedule,
    pub compression: CompressionType,
    pub encryption_enabled: bool,
    pub remote_backup_enabled: bool,
    pub remote_backup_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BackupSchedule {
    Hourly,
    Daily,
    Weekly,
    Monthly,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum CompressionType {
    None,
    Gzip,
    Zstd,
}

impl Default for BackupConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            backup_dir: PathBuf::from("/var/backups/topems"),
            retention_days: 30,
            schedule: BackupSchedule::Daily,
            compression: CompressionType::Gzip,
            encryption_enabled: false,
            remote_backup_enabled: false,
            remote_backup_url: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub id: Uuid,
    pub backup_type: BackupType,
    pub status: BackupStatus,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub file_path: PathBuf,
    pub file_size: u64,
    pub checksum: String,
    pub database_name: String,
    pub tables_backed_up: Vec<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum BackupType {
    Full,
    Incremental,
    Differential,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum BackupStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    Restored,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupRequest {
    pub backup_type: BackupType,
    pub description: Option<String>,
    pub compression: Option<CompressionType>,
    pub encrypt: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreRequest {
    pub backup_id: Uuid,
    pub target_database: Option<String>,
    pub overwrite: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupScheduleConfig {
    pub schedule: BackupSchedule,
    pub hour: u8,
    pub minute: u8,
    pub day_of_week: Option<u8>,
    pub day_of_month: Option<u8>,
}

impl Default for BackupScheduleConfig {
    fn default() -> Self {
        Self {
            schedule: BackupSchedule::Daily,
            hour: 2,
            minute: 0,
            day_of_week: None,
            day_of_month: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupStatistics {
    pub total_backups: u64,
    pub successful_backups: u64,
    pub failed_backups: u64,
    pub total_size_bytes: u64,
    pub oldest_backup: Option<DateTime<Utc>>,
    pub newest_backup: Option<DateTime<Utc>>,
    pub average_backup_duration_seconds: f64,
    pub last_restore: Option<DateTime<Utc>>,
}

pub struct BackupManager {
    config: Arc<RwLock<BackupConfig>>,
    backups: Arc<RwLock<Vec<BackupMetadata>>>,
}

impl Default for BackupManager {
    fn default() -> Self {
        Self::new()
    }
}

impl BackupManager {
    pub fn new() -> Self {
        Self {
            config: Arc::new(RwLock::new(BackupConfig::default())),
            backups: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn configure(&self, config: BackupConfig) {
        let mut cfg = self.config.write().await;
        *cfg = config;
    }

    pub async fn get_config(&self) -> BackupConfig {
        self.config.read().await.clone()
    }

    pub async fn create_backup(
        &self,
        request: BackupRequest,
    ) -> Result<BackupMetadata, BackupError> {
        let config = self.config.read().await.clone();

        if !config.enabled {
            return Err(BackupError::BackupDisabled);
        }

        let backup_id = Uuid::new_v4();
        let timestamp = Utc::now();
        let file_name = format!(
            "topems_backup_{}_{}.sql.{}",
            timestamp.format("%Y%m%d_%H%M%S"),
            backup_id,
            match request.compression.unwrap_or(config.compression) {
                CompressionType::Gzip => "gz",
                CompressionType::Zstd => "zst",
                CompressionType::None => "sql",
            }
        );

        let backup = BackupMetadata {
            id: backup_id,
            backup_type: request.backup_type,
            status: BackupStatus::InProgress,
            created_at: timestamp,
            completed_at: None,
            file_path: config.backup_dir.join(&file_name),
            file_size: 0,
            checksum: String::new(),
            database_name: "topems".to_string(),
            tables_backed_up: Vec::new(),
            error_message: None,
        };

        self.backups.write().await.push(backup.clone());

        match self.perform_backup(&backup, &config).await {
            Ok(mut completed_backup) => {
                completed_backup.status = BackupStatus::Completed;
                completed_backup.completed_at = Some(Utc::now());

                let mut backups = self.backups.write().await;
                if let Some(pos) = backups.iter().position(|b| b.id == backup_id) {
                    backups[pos] = completed_backup.clone();
                }

                self.cleanup_old_backups(&config).await;

                Ok(completed_backup)
            }
            Err(e) => {
                let mut backups = self.backups.write().await;
                if let Some(pos) = backups.iter().position(|b| b.id == backup_id) {
                    backups[pos].status = BackupStatus::Failed;
                    backups[pos].error_message = Some(e.to_string());
                }
                Err(e)
            }
        }
    }

    async fn perform_backup(
        &self,
        backup: &BackupMetadata,
        _config: &BackupConfig,
    ) -> Result<BackupMetadata, BackupError> {
        let pg_dump_result = Command::new("pg_dump")
            .args([
                "-h",
                "localhost",
                "-U",
                "postgres",
                "-d",
                &backup.database_name,
                "-f",
                backup.file_path.to_str().unwrap_or(""),
            ])
            .output()
            .await;

        match pg_dump_result {
            Ok(output) if output.status.success() => {
                let metadata = std::fs::metadata(&backup.file_path)
                    .map_err(|e| BackupError::IoError(e.to_string()))?;

                let checksum = self.calculate_checksum(&backup.file_path)?;

                Ok(BackupMetadata {
                    file_size: metadata.len(),
                    checksum,
                    ..backup.clone()
                })
            }
            Ok(output) => Err(BackupError::PgDumpFailed(
                String::from_utf8_lossy(&output.stderr).to_string(),
            )),
            Err(e) => Err(BackupError::PgDumpNotFound(e.to_string())),
        }
    }

    fn calculate_checksum(&self, path: &PathBuf) -> Result<String, BackupError> {
        use std::io::Read;

        let mut file =
            std::fs::File::open(path).map_err(|e| BackupError::IoError(e.to_string()))?;

        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .map_err(|e| BackupError::IoError(e.to_string()))?;

        let digest = md5::compute(&buffer);
        Ok(format!("{:x}", digest))
    }

    pub async fn restore(&self, request: RestoreRequest) -> Result<(), BackupError> {
        let backups = self.backups.read().await;
        let backup = backups
            .iter()
            .find(|b| b.id == request.backup_id)
            .ok_or(BackupError::BackupNotFound)?
            .clone();
        drop(backups);

        if backup.status != BackupStatus::Completed {
            return Err(BackupError::BackupNotComplete);
        }

        let target_db = request
            .target_database
            .unwrap_or(backup.database_name.clone());

        let restore_result = Command::new("psql")
            .args([
                "-h",
                "localhost",
                "-U",
                "postgres",
                "-d",
                &target_db,
                "-f",
                backup.file_path.to_str().unwrap_or(""),
            ])
            .output()
            .await;

        match restore_result {
            Ok(output) if output.status.success() => {
                let mut backups = self.backups.write().await;
                if let Some(pos) = backups.iter().position(|b| b.id == request.backup_id) {
                    backups[pos].status = BackupStatus::Restored;
                }
                Ok(())
            }
            Ok(output) => Err(BackupError::RestoreFailed(
                String::from_utf8_lossy(&output.stderr).to_string(),
            )),
            Err(e) => Err(BackupError::PsqlNotFound(e.to_string())),
        }
    }

    pub async fn list_backups(&self, status: Option<BackupStatus>) -> Vec<BackupMetadata> {
        let backups = self.backups.read().await;
        match status {
            Some(s) => backups.iter().filter(|b| b.status == s).cloned().collect(),
            None => backups.clone(),
        }
    }

    pub async fn get_backup(&self, id: Uuid) -> Option<BackupMetadata> {
        let backups = self.backups.read().await;
        backups.iter().find(|b| b.id == id).cloned()
    }

    pub async fn delete_backup(&self, id: Uuid) -> Result<(), BackupError> {
        let mut backups = self.backups.write().await;
        if let Some(pos) = backups.iter().position(|b| b.id == id) {
            let backup = backups.remove(pos);
            std::fs::remove_file(&backup.file_path)
                .map_err(|e| BackupError::IoError(e.to_string()))?;
            Ok(())
        } else {
            Err(BackupError::BackupNotFound)
        }
    }

    async fn cleanup_old_backups(&self, config: &BackupConfig) {
        let cutoff = Utc::now() - chrono::Duration::days(config.retention_days as i64);
        let mut backups = self.backups.write().await;

        backups.retain(|b| {
            if b.created_at < cutoff {
                let _ = std::fs::remove_file(&b.file_path);
                false
            } else {
                true
            }
        });
    }

    pub async fn get_statistics(&self) -> BackupStatistics {
        let backups = self.backups.read().await;

        let completed: Vec<_> = backups
            .iter()
            .filter(|b| b.status == BackupStatus::Completed)
            .collect();
        let failed: Vec<_> = backups
            .iter()
            .filter(|b| b.status == BackupStatus::Failed)
            .collect();

        let total_size: u64 = completed.iter().map(|b| b.file_size).sum();

        let durations: Vec<f64> = completed
            .iter()
            .filter_map(|b| {
                b.completed_at
                    .map(|c| (c - b.created_at).num_seconds() as f64)
            })
            .collect();

        let avg_duration = if durations.is_empty() {
            0.0
        } else {
            durations.iter().sum::<f64>() / durations.len() as f64
        };

        BackupStatistics {
            total_backups: backups.len() as u64,
            successful_backups: completed.len() as u64,
            failed_backups: failed.len() as u64,
            total_size_bytes: total_size,
            oldest_backup: completed.first().map(|b| b.created_at),
            newest_backup: completed.last().map(|b| b.created_at),
            average_backup_duration_seconds: avg_duration,
            last_restore: backups
                .iter()
                .find(|b| b.status == BackupStatus::Restored)
                .and_then(|b| b.completed_at),
        }
    }

    pub async fn verify_backup(&self, id: Uuid) -> Result<bool, BackupError> {
        let backups = self.backups.read().await;
        let backup = backups
            .iter()
            .find(|b| b.id == id)
            .ok_or(BackupError::BackupNotFound)?;

        if backup.status != BackupStatus::Completed {
            return Err(BackupError::BackupNotComplete);
        }

        let current_checksum = self.calculate_checksum(&backup.file_path)?;
        Ok(current_checksum == backup.checksum)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum BackupError {
    #[error("Backup is disabled")]
    BackupDisabled,

    #[error("Backup not found")]
    BackupNotFound,

    #[error("Backup not complete")]
    BackupNotComplete,

    #[error("pg_dump not found: {0}")]
    PgDumpNotFound(String),

    #[error("pg_dump failed: {0}")]
    PgDumpFailed(String),

    #[error("psql not found: {0}")]
    PsqlNotFound(String),

    #[error("Restore failed: {0}")]
    RestoreFailed(String),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("Checksum mismatch")]
    ChecksumMismatch,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_backup_manager() {
        let manager = BackupManager::new();

        let config = BackupConfig {
            enabled: true,
            backup_dir: PathBuf::from("/tmp/test_backups"),
            retention_days: 7,
            schedule: BackupSchedule::Daily,
            compression: CompressionType::Gzip,
            encryption_enabled: false,
            remote_backup_enabled: false,
            remote_backup_url: None,
        };

        manager.configure(config).await;
        let retrieved = manager.get_config().await;
        assert!(retrieved.enabled);
        assert_eq!(retrieved.retention_days, 7);
    }

    #[tokio::test]
    async fn test_statistics() {
        let manager = BackupManager::new();
        let stats = manager.get_statistics().await;

        assert_eq!(stats.total_backups, 0);
        assert_eq!(stats.successful_backups, 0);
    }

    #[test]
    fn test_backup_config_default() {
        let config = BackupConfig::default();
        assert!(config.enabled);
        assert_eq!(config.backup_dir, PathBuf::from("/var/backups/topems"));
        assert_eq!(config.retention_days, 30);
        assert!(matches!(config.schedule, BackupSchedule::Daily));
        assert!(matches!(config.compression, CompressionType::Gzip));
        assert!(!config.encryption_enabled);
        assert!(!config.remote_backup_enabled);
        assert!(config.remote_backup_url.is_none());
    }

    #[test]
    fn test_backup_schedule_config_default() {
        let sc = BackupScheduleConfig::default();
        assert!(matches!(sc.schedule, BackupSchedule::Daily));
        assert_eq!(sc.hour, 2);
        assert_eq!(sc.minute, 0);
        assert!(sc.day_of_week.is_none());
        assert!(sc.day_of_month.is_none());
    }

    #[tokio::test]
    async fn test_backup_manager_new_default_empty() {
        let m1 = BackupManager::new();
        let m2 = BackupManager::default();
        let cfg1 = m1.get_config().await;
        let cfg2 = m2.get_config().await;
        assert_eq!(cfg1.backup_dir, cfg2.backup_dir);
        assert_eq!(cfg1.retention_days, cfg2.retention_days);
        assert!(m1.list_backups(None).await.is_empty());
        assert!(m2.list_backups(None).await.is_empty());
        let stats1 = m1.get_statistics().await;
        let stats2 = m2.get_statistics().await;
        assert_eq!(stats1.total_backups, 0);
        assert_eq!(stats2.total_backups, 0);
    }

    #[tokio::test]
    async fn test_backup_manager_configure_and_get_config() {
        let manager = BackupManager::new();
        let custom = BackupConfig {
            enabled: false,
            backup_dir: PathBuf::from("/tmp/custom"),
            retention_days: 14,
            schedule: BackupSchedule::Weekly,
            compression: CompressionType::Zstd,
            encryption_enabled: true,
            remote_backup_enabled: true,
            remote_backup_url: Some("http://example.com".to_string()),
        };
        manager.configure(custom.clone()).await;
        let retrieved = manager.get_config().await;
        assert_eq!(retrieved.enabled, custom.enabled);
        assert_eq!(retrieved.backup_dir, custom.backup_dir);
        assert_eq!(retrieved.retention_days, custom.retention_days);
        assert!(matches!(retrieved.schedule, BackupSchedule::Weekly));
        assert!(matches!(retrieved.compression, CompressionType::Zstd));
        assert_eq!(retrieved.encryption_enabled, custom.encryption_enabled);
        assert_eq!(
            retrieved.remote_backup_enabled,
            custom.remote_backup_enabled
        );
        assert_eq!(retrieved.remote_backup_url, custom.remote_backup_url);
    }

    #[test]
    fn test_backup_type_serde_roundtrip() {
        let variants = [
            BackupType::Full,
            BackupType::Incremental,
            BackupType::Differential,
        ];
        for v in variants {
            let s = serde_json::to_string(&v).expect("serialize");
            let d: BackupType = serde_json::from_str(&s).expect("deserialize");
            assert_eq!(d, v);
        }
    }

    #[test]
    fn test_backup_status_serde_roundtrip() {
        let variants = [
            BackupStatus::Pending,
            BackupStatus::InProgress,
            BackupStatus::Completed,
            BackupStatus::Failed,
            BackupStatus::Restored,
        ];
        for v in variants {
            let s = serde_json::to_string(&v).expect("serialize");
            let d: BackupStatus = serde_json::from_str(&s).expect("deserialize");
            assert_eq!(d, v);
        }
    }

    #[test]
    fn test_compression_type_serde_roundtrip() {
        let variants = [
            CompressionType::None,
            CompressionType::Gzip,
            CompressionType::Zstd,
        ];
        for v in variants {
            let s1 = serde_json::to_string(&v).expect("serialize");
            let d: CompressionType = serde_json::from_str(&s1).expect("deserialize");
            let s2 = serde_json::to_string(&d).expect("serialize2");
            assert_eq!(s1, s2);
        }
    }

    #[test]
    fn test_backup_schedule_serde_roundtrip() {
        let variants = [
            BackupSchedule::Hourly,
            BackupSchedule::Daily,
            BackupSchedule::Weekly,
            BackupSchedule::Monthly,
        ];
        for v in variants {
            let s1 = serde_json::to_string(&v).expect("serialize");
            let d: BackupSchedule = serde_json::from_str(&s1).expect("deserialize");
            let s2 = serde_json::to_string(&d).expect("serialize2");
            assert_eq!(s1, s2);
        }
    }

    #[test]
    fn test_backup_config_serde_roundtrip() {
        let config = BackupConfig {
            enabled: true,
            backup_dir: PathBuf::from("/tmp/x"),
            retention_days: 7,
            schedule: BackupSchedule::Weekly,
            compression: CompressionType::Zstd,
            encryption_enabled: true,
            remote_backup_enabled: true,
            remote_backup_url: Some("http://x".to_string()),
        };
        let s = serde_json::to_string(&config).expect("serialize");
        let d: BackupConfig = serde_json::from_str(&s).expect("deserialize");
        assert_eq!(d.enabled, config.enabled);
        assert_eq!(d.backup_dir, config.backup_dir);
        assert_eq!(d.retention_days, config.retention_days);
        assert!(matches!(d.schedule, BackupSchedule::Weekly));
        assert!(matches!(d.compression, CompressionType::Zstd));
        assert_eq!(d.encryption_enabled, config.encryption_enabled);
        assert_eq!(d.remote_backup_enabled, config.remote_backup_enabled);
        assert_eq!(d.remote_backup_url, config.remote_backup_url);
    }

    #[test]
    fn test_backup_request_construction_and_serde() {
        let req = BackupRequest {
            backup_type: BackupType::Full,
            description: Some("test".to_string()),
            compression: Some(CompressionType::Gzip),
            encrypt: Some(false),
        };
        assert_eq!(req.backup_type, BackupType::Full);
        assert_eq!(req.description.as_deref(), Some("test"));
        assert!(matches!(req.compression, Some(CompressionType::Gzip)));
        assert_eq!(req.encrypt, Some(false));

        let s = serde_json::to_string(&req).expect("serialize");
        let d: BackupRequest = serde_json::from_str(&s).expect("deserialize");
        assert_eq!(d.backup_type, req.backup_type);
        assert_eq!(d.description, req.description);
        assert_eq!(d.encrypt, req.encrypt);
        let s_orig = serde_json::to_string(&req.compression).expect("serialize orig");
        let s_de = serde_json::to_string(&d.compression).expect("serialize de");
        assert_eq!(s_orig, s_de);
    }

    #[test]
    fn test_restore_request_construction_and_serde() {
        let id = Uuid::new_v4();
        let req = RestoreRequest {
            backup_id: id,
            target_database: Some("other_db".to_string()),
            overwrite: true,
        };
        assert_eq!(req.backup_id, id);
        assert_eq!(req.target_database.as_deref(), Some("other_db"));
        assert!(req.overwrite);

        let s = serde_json::to_string(&req).expect("serialize");
        let d: RestoreRequest = serde_json::from_str(&s).expect("deserialize");
        assert_eq!(d.backup_id, req.backup_id);
        assert_eq!(d.target_database, req.target_database);
        assert_eq!(d.overwrite, req.overwrite);
    }

    #[test]
    fn test_backup_statistics_construction_and_serde() {
        let now = Utc::now();
        let earlier = now - chrono::Duration::hours(2);
        let stats = BackupStatistics {
            total_backups: 10,
            successful_backups: 8,
            failed_backups: 2,
            total_size_bytes: 1024 * 1024,
            oldest_backup: Some(earlier),
            newest_backup: Some(now),
            average_backup_duration_seconds: 42.5,
            last_restore: Some(now),
        };
        assert_eq!(stats.total_backups, 10);
        assert_eq!(stats.successful_backups, 8);
        assert_eq!(stats.failed_backups, 2);
        assert_eq!(stats.total_size_bytes, 1024 * 1024);
        assert_eq!(stats.oldest_backup, Some(earlier));
        assert_eq!(stats.newest_backup, Some(now));
        assert_eq!(stats.average_backup_duration_seconds, 42.5);
        assert_eq!(stats.last_restore, Some(now));

        let s = serde_json::to_string(&stats).expect("serialize");
        let d: BackupStatistics = serde_json::from_str(&s).expect("deserialize");
        assert_eq!(d.total_backups, stats.total_backups);
        assert_eq!(d.successful_backups, stats.successful_backups);
        assert_eq!(d.failed_backups, stats.failed_backups);
        assert_eq!(d.total_size_bytes, stats.total_size_bytes);
        assert_eq!(d.oldest_backup, stats.oldest_backup);
        assert_eq!(d.newest_backup, stats.newest_backup);
        assert_eq!(
            d.average_backup_duration_seconds,
            stats.average_backup_duration_seconds
        );
        assert_eq!(d.last_restore, stats.last_restore);
    }

    #[test]
    fn test_backup_metadata_construction_and_serde() {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let meta = BackupMetadata {
            id,
            backup_type: BackupType::Incremental,
            status: BackupStatus::Completed,
            created_at: now,
            completed_at: Some(now),
            file_path: PathBuf::from("/tmp/backup.sql.gz"),
            file_size: 4096,
            checksum: "abc123".to_string(),
            database_name: "topems".to_string(),
            tables_backed_up: vec!["users".to_string(), "orders".to_string()],
            error_message: None,
        };
        assert_eq!(meta.id, id);
        assert_eq!(meta.backup_type, BackupType::Incremental);
        assert_eq!(meta.status, BackupStatus::Completed);
        assert_eq!(meta.created_at, now);
        assert_eq!(meta.completed_at, Some(now));
        assert_eq!(meta.file_path, PathBuf::from("/tmp/backup.sql.gz"));
        assert_eq!(meta.file_size, 4096);
        assert_eq!(meta.checksum, "abc123");
        assert_eq!(meta.database_name, "topems");
        assert_eq!(meta.tables_backed_up.len(), 2);
        assert!(meta.error_message.is_none());

        let s = serde_json::to_string(&meta).expect("serialize");
        let d: BackupMetadata = serde_json::from_str(&s).expect("deserialize");
        assert_eq!(d.id, meta.id);
        assert_eq!(d.backup_type, meta.backup_type);
        assert_eq!(d.status, meta.status);
        assert_eq!(d.created_at, meta.created_at);
        assert_eq!(d.completed_at, meta.completed_at);
        assert_eq!(d.file_path, meta.file_path);
        assert_eq!(d.file_size, meta.file_size);
        assert_eq!(d.checksum, meta.checksum);
        assert_eq!(d.database_name, meta.database_name);
        assert_eq!(d.tables_backed_up, meta.tables_backed_up);
        assert_eq!(d.error_message, meta.error_message);
    }

    #[test]
    fn test_backup_schedule_config_serde_roundtrip() {
        let sc = BackupScheduleConfig {
            schedule: BackupSchedule::Weekly,
            hour: 3,
            minute: 30,
            day_of_week: Some(1),
            day_of_month: None,
        };
        let s = serde_json::to_string(&sc).expect("serialize");
        let d: BackupScheduleConfig = serde_json::from_str(&s).expect("deserialize");
        assert!(matches!(d.schedule, BackupSchedule::Weekly));
        assert_eq!(d.hour, sc.hour);
        assert_eq!(d.minute, sc.minute);
        assert_eq!(d.day_of_week, sc.day_of_week);
        assert_eq!(d.day_of_month, sc.day_of_month);
    }
}

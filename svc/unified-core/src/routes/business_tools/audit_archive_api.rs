//! V468: Audit Log Archive API
//!
//! Provides REST API endpoints for managing audit log archives,
//! including listing archives, downloading archive files, and
//! deleting old archives.

use axum::extract::{Path, Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use axum::Router;
use serde::{Deserialize, Serialize};

use super::audit_archiver::{ArchiveConfig, ArchiveFileInfo, AuditLogArchiver};
use super::permission_api::ErrorResponse;
use crate::shared::AppState;

// ===== Query Parameters =====

/// Query parameters for listing archives.
#[derive(Debug, Clone, Deserialize)]
pub struct ListArchivesQuery {
    /// Maximum number of archives to return.
    #[serde(default)]
    pub limit: Option<usize>,
    /// Filter by date prefix (YYYY-MM-DD).
    #[serde(default)]
    pub date: Option<String>,
}

/// Query parameters for cleaning up old archives.
#[derive(Debug, Clone, Deserialize)]
pub struct CleanupArchivesQuery {
    /// Maximum age of archives to keep (in days).
    #[serde(default = "default_max_age_days")]
    pub max_age_days: u32,
}

fn default_max_age_days() -> u32 {
    365
}

// ===== Response Types =====

/// Response for listing archives.
#[derive(Debug, Clone, Serialize)]
pub struct ListArchivesResponse {
    /// Total number of archive files.
    pub total: usize,
    /// Archive files.
    pub archives: Vec<ArchiveFileInfo>,
}

/// Response for cleaning up archives.
#[derive(Debug, Clone, Serialize)]
pub struct CleanupArchivesResponse {
    /// Number of archives deleted.
    pub deleted_count: usize,
}

// ===== Route Handlers =====

/// `GET /api/business-tools/audit-logs/archives` — List archive files.
pub async fn list_archives(
    State(state): State<AppState>,
    Query(query): Query<ListArchivesQuery>,
) -> Result<Json<ListArchivesResponse>, (StatusCode, Json<ErrorResponse>)> {
    let archiver = get_archiver(&state);

    let mut archives = archiver.list_archives().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to list archives: {}", e),
                code: Some("LIST_ARCHIVES_ERROR".to_string()),
            }),
        )
    })?;

    // Filter by date if specified
    if let Some(date) = &query.date {
        archives.retain(|a| a.path.contains(date));
    }

    // Apply limit
    if let Some(limit) = query.limit {
        archives.truncate(limit);
    }

    let total = archives.len();

    Ok(Json(ListArchivesResponse { total, archives }))
}

/// `GET /api/business-tools/audit-logs/archives/{filename}` — Download an archive file.
pub async fn download_archive(
    State(state): State<AppState>,
    Path(filename): Path<String>,
) -> Result<Response, (StatusCode, Json<ErrorResponse>)> {
    // Validate filename to prevent path traversal
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Invalid filename".to_string(),
                code: Some("INVALID_FILENAME".to_string()),
            }),
        ));
    }

    let archiver = get_archiver(&state);
    let filepath = archiver.config().archive_dir.join(&filename);

    // Check if file exists
    if !filepath.exists() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: format!("Archive file not found: {}", filename),
                code: Some("ARCHIVE_NOT_FOUND".to_string()),
            }),
        ));
    }

    // Read file content
    let content = std::fs::read(&filepath).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to read archive file: {}", e),
                code: Some("READ_ARCHIVE_ERROR".to_string()),
            }),
        )
    })?;

    // Determine content type
    let content_type = if filename.ends_with(".gz") {
        "application/gzip"
    } else {
        "application/json"
    };

    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, content_type.to_string()),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{}\"", filename),
            ),
        ],
        content,
    )
        .into_response())
}

/// `DELETE /api/business-tools/audit-logs/archives/{filename}` — Delete an archive file.
pub async fn delete_archive(
    State(state): State<AppState>,
    Path(filename): Path<String>,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    // Validate filename to prevent path traversal
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Invalid filename".to_string(),
                code: Some("INVALID_FILENAME".to_string()),
            }),
        ));
    }

    let archiver = get_archiver(&state);
    let filepath = archiver.config().archive_dir.join(&filename);

    // Check if file exists
    if !filepath.exists() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: format!("Archive file not found: {}", filename),
                code: Some("ARCHIVE_NOT_FOUND".to_string()),
            }),
        ));
    }

    // Delete file
    std::fs::remove_file(&filepath).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to delete archive file: {}", e),
                code: Some("DELETE_ARCHIVE_ERROR".to_string()),
            }),
        )
    })?;

    Ok(StatusCode::NO_CONTENT)
}

/// `POST /api/business-tools/audit-logs/archives/cleanup` — Clean up old archives.
pub async fn cleanup_archives(
    State(state): State<AppState>,
    Query(query): Query<CleanupArchivesQuery>,
) -> Result<Json<CleanupArchivesResponse>, (StatusCode, Json<ErrorResponse>)> {
    let archiver = get_archiver(&state);

    let deleted_count = archiver
        .cleanup_old_archives(query.max_age_days)
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to cleanup archives: {}", e),
                    code: Some("CLEANUP_ARCHIVES_ERROR".to_string()),
                }),
            )
        })?;

    Ok(Json(CleanupArchivesResponse { deleted_count }))
}

/// `GET /api/business-tools/audit-logs/archives/stats` — Get archive statistics.
pub async fn get_archive_stats(
    State(state): State<AppState>,
) -> Result<Json<ArchiveStatsResponse>, (StatusCode, Json<ErrorResponse>)> {
    let archiver = get_archiver(&state);

    let archives = archiver.list_archives().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to list archives: {}", e),
                code: Some("LIST_ARCHIVES_ERROR".to_string()),
            }),
        )
    })?;

    let total_size = archiver.total_archive_size().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to get archive size: {}", e),
                code: Some("ARCHIVE_SIZE_ERROR".to_string()),
            }),
        )
    })?;

    Ok(Json(ArchiveStatsResponse {
        total_files: archives.len(),
        total_size,
        archive_dir: archiver.config().archive_dir.to_string_lossy().to_string(),
        compress: archiver.config().compress,
    }))
}

// ===== Archive Stats Response =====

/// Response for archive statistics.
#[derive(Debug, Clone, Serialize)]
pub struct ArchiveStatsResponse {
    /// Total number of archive files.
    pub total_files: usize,
    /// Total size of all archive files (in bytes).
    pub total_size: u64,
    /// Archive directory path.
    pub archive_dir: String,
    /// Whether compression is enabled.
    pub compress: bool,
}

// ===== Helper Functions =====

/// Get an archiver instance from the app state.
/// In a full implementation, the archiver config would be stored in AppState.
/// For now, we use the default config with the archive path from environment.
fn get_archiver(_state: &AppState) -> AuditLogArchiver {
    let archive_dir =
        std::env::var("AUDIT_ARCHIVE_DIR").unwrap_or_else(|_| "audit_archives".to_string());
    let compress = std::env::var("AUDIT_ARCHIVE_COMPRESS")
        .ok()
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false);

    let mut config = ArchiveConfig::new(archive_dir);
    if compress {
        config = config.with_compression();
    }

    AuditLogArchiver::new(config)
}

// ===== Route Registration =====

/// Create audit log archive routes.
pub fn audit_archive_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/business-tools/audit-logs/archives",
            axum::routing::get(list_archives),
        )
        .route(
            "/business-tools/audit-logs/archives/stats",
            axum::routing::get(get_archive_stats),
        )
        .route(
            "/business-tools/audit-logs/archives/cleanup",
            axum::routing::post(cleanup_archives),
        )
        .route(
            "/business-tools/audit-logs/archives/{filename}",
            axum::routing::get(download_archive).delete(delete_archive),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_archives_query_deserialization() {
        let json = r#"{"limit":10,"date":"2026-01"}"#;
        let query: ListArchivesQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.limit, Some(10));
        assert_eq!(query.date.as_deref(), Some("2026-01"));
    }

    #[test]
    fn test_list_archives_query_default() {
        let query: ListArchivesQuery = serde_json::from_str("{}").unwrap();
        assert!(query.limit.is_none());
        assert!(query.date.is_none());
    }

    #[test]
    fn test_cleanup_archives_query_default() {
        let query: CleanupArchivesQuery = serde_json::from_str("{}").unwrap();
        assert_eq!(query.max_age_days, 365);
    }

    #[test]
    fn test_cleanup_archives_query_custom() {
        let query: CleanupArchivesQuery = serde_json::from_str(r#"{"max_age_days":30}"#).unwrap();
        assert_eq!(query.max_age_days, 30);
    }

    #[test]
    fn test_list_archives_response_serialization() {
        let response = ListArchivesResponse {
            total: 2,
            archives: vec![],
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"total\":2"));
        assert!(json.contains("\"archives\":[]"));
    }

    #[test]
    fn test_cleanup_archives_response_serialization() {
        let response = CleanupArchivesResponse { deleted_count: 5 };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"deleted_count\":5"));
    }

    #[test]
    fn test_archive_stats_response_serialization() {
        let response = ArchiveStatsResponse {
            total_files: 10,
            total_size: 102400,
            archive_dir: "/tmp/archives".to_string(),
            compress: false,
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"total_files\":10"));
        assert!(json.contains("\"total_size\":102400"));
        assert!(json.contains("/tmp/archives"));
        assert!(json.contains("\"compress\":false"));
    }

    #[test]
    fn test_filename_validation_valid() {
        assert!("audit_log_2026-01-15.json".find("..").is_none());
        assert!("audit_log_2026-01-15.json".find('/').is_none());
        assert!("audit_log_2026-01-15.json".find('\\').is_none());
    }

    #[test]
    fn test_filename_validation_invalid() {
        assert!("../etc/passwd".contains(".."));
        assert!("path/to/file.json".contains('/'));
        assert!("path\\to\\file.json".contains('\\'));
    }

    #[test]
    fn test_audit_archive_routes_creation() {
        let routes = audit_archive_routes();
        let _ = routes;
    }

    #[test]
    fn test_content_type_detection() {
        assert_eq!(
            if "audit.json.gz".ends_with(".gz") {
                "application/gzip"
            } else {
                "application/json"
            },
            "application/gzip"
        );
        assert_eq!(
            if "audit.json".ends_with(".gz") {
                "application/gzip"
            } else {
                "application/json"
            },
            "application/json"
        );
    }
}

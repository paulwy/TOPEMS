//! V471: Audit Log Archive Restore API
//!
//! Provides REST API endpoints for restoring audit logs from archive files,
//! including triggering restores and listing available archive files.

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use axum::Router;
use serde::{Deserialize, Serialize};

use crate::shared::AppState;
use super::audit_restorer::{RestoreConfig, RestoreQuery, RestoreResult, AuditLogRestorer};
use super::permission_api::ErrorResponse;

// ===== Request Types =====

/// Request to trigger an archive restore.
#[derive(Debug, Clone, Deserialize)]
pub struct RestoreRequest {
    /// Start date for restoration (YYYY-MM-DD, optional).
    #[serde(default)]
    pub start_date: Option<String>,
    /// End date for restoration (YYYY-MM-DD, optional).
    #[serde(default)]
    pub end_date: Option<String>,
    /// Specific filename to restore (optional).
    #[serde(default)]
    pub filename: Option<String>,
    /// Whether to skip existing entries (default: true).
    #[serde(default = "default_skip_existing")]
    pub skip_existing: bool,
}

fn default_skip_existing() -> bool {
    true
}

impl Default for RestoreRequest {
    fn default() -> Self {
        Self {
            start_date: None,
            end_date: None,
            filename: None,
            skip_existing: true,
        }
    }
}

// ===== Response Types =====

/// Response for listing restorable archive files.
#[derive(Debug, Clone, Serialize)]
pub struct ListRestorableResponse {
    /// Total number of restorable files.
    pub total: usize,
    /// List of restorable archive filenames.
    pub files: Vec<String>,
}

// ===== Route Handlers =====

/// `GET /api/business-tools/audit-logs/archives/restorable` — List restorable archive files.
pub async fn list_restorable_files(
    State(_state): State<AppState>,
) -> Result<Json<ListRestorableResponse>, (StatusCode, Json<ErrorResponse>)> {
    let restorer = get_restorer();

    let files = restorer.list_archive_files().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to list restorable files: {}", e),
                code: Some("LIST_RESTORABLE_ERROR".to_string()),
            }),
        )
    })?;

    let total = files.len();

    Ok(Json(ListRestorableResponse { total, files }))
}

/// `POST /api/business-tools/audit-logs/archives/restore` — Trigger archive restore.
pub async fn restore_archives(
    State(state): State<AppState>,
    Json(request): Json<RestoreRequest>,
) -> Result<Json<RestoreResult>, (StatusCode, Json<ErrorResponse>)> {
    // Validate date format if provided
    if let Some(start_date) = &request.start_date {
        if !is_valid_date_format(start_date) {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: format!("Invalid start_date format: {}. Expected YYYY-MM-DD", start_date),
                    code: Some("INVALID_DATE_FORMAT".to_string()),
                }),
            ));
        }
    }

    if let Some(end_date) = &request.end_date {
        if !is_valid_date_format(end_date) {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: format!("Invalid end_date format: {}. Expected YYYY-MM-DD", end_date),
                    code: Some("INVALID_DATE_FORMAT".to_string()),
                }),
            ));
        }
    }

    let restorer = get_restorer_with_config(request.skip_existing);
    let query = RestoreQuery {
        start_date: request.start_date,
        end_date: request.end_date,
        filename: request.filename,
    };

    let result = restorer.restore(&*state.audit_logger, &query).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to restore archives: {}", e),
                code: Some("RESTORE_ERROR".to_string()),
            }),
        )
    })?;

    Ok(Json(result))
}

// ===== Helper Functions =====

/// Get a restorer instance with default configuration.
fn get_restorer() -> AuditLogRestorer {
    let archive_dir = std::env::var("AUDIT_ARCHIVE_DIR")
        .unwrap_or_else(|_| "audit_archives".to_string());
    let config = RestoreConfig::new(archive_dir);
    AuditLogRestorer::new(config)
}

/// Get a restorer instance with custom skip_existing setting.
fn get_restorer_with_config(skip_existing: bool) -> AuditLogRestorer {
    let archive_dir = std::env::var("AUDIT_ARCHIVE_DIR")
        .unwrap_or_else(|_| "audit_archives".to_string());
    let config = RestoreConfig::new(archive_dir).with_skip_existing(skip_existing);
    AuditLogRestorer::new(config)
}

/// Validate date format (YYYY-MM-DD).
fn is_valid_date_format(date: &str) -> bool {
    if date.len() != 10 {
        return false;
    }
    let chars: Vec<char> = date.chars().collect();
    chars[4] == '-' && chars[7] == '-' &&
    chars[0..4].iter().all(|c| c.is_ascii_digit()) &&
    chars[5..7].iter().all(|c| c.is_ascii_digit()) &&
    chars[8..10].iter().all(|c| c.is_ascii_digit())
}

// ===== Route Registration =====

/// Create audit log archive restore routes.
pub fn audit_restore_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/business-tools/audit-logs/archives/restorable",
            axum::routing::get(list_restorable_files),
        )
        .route(
            "/business-tools/audit-logs/archives/restore",
            axum::routing::post(restore_archives),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_restore_request_deserialization() {
        let json = r#"{
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "filename": "audit_log_2026-01-15.json",
            "skip_existing": false
        }"#;
        let req: RestoreRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.start_date.as_deref(), Some("2026-01-01"));
        assert_eq!(req.end_date.as_deref(), Some("2026-01-31"));
        assert_eq!(req.filename.as_deref(), Some("audit_log_2026-01-15.json"));
        assert!(!req.skip_existing);
    }

    #[test]
    fn test_restore_request_default() {
        let req = RestoreRequest::default();
        assert!(req.start_date.is_none());
        assert!(req.end_date.is_none());
        assert!(req.filename.is_none());
        assert!(req.skip_existing);
    }

    #[test]
    fn test_restore_request_partial() {
        let json = r#"{"start_date": "2026-01-01"}"#;
        let req: RestoreRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.start_date.as_deref(), Some("2026-01-01"));
        assert!(req.end_date.is_none());
        assert!(req.skip_existing); // default
    }

    #[test]
    fn test_list_restorable_response_serialization() {
        let response = ListRestorableResponse {
            total: 2,
            files: vec![
                "audit_log_2026-01-15.json".to_string(),
                "audit_log_2026-01-16.json".to_string(),
            ],
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"total\":2"));
        assert!(json.contains("audit_log_2026-01-15.json"));
    }

    #[test]
    fn test_is_valid_date_format_valid() {
        assert!(is_valid_date_format("2026-01-15"));
        assert!(is_valid_date_format("2020-12-31"));
    }

    #[test]
    fn test_is_valid_date_format_invalid() {
        assert!(!is_valid_date_format("2026/01/15"));
        assert!(!is_valid_date_format("01-15-2026"));
        assert!(!is_valid_date_format("2026-1-15"));
        assert!(!is_valid_date_format("2026-01-1"));
        assert!(!is_valid_date_format("invalid"));
        assert!(!is_valid_date_format(""));
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
    }

    #[test]
    fn test_get_restorer() {
        let restorer = get_restorer();
        assert_eq!(restorer.config().file_prefix, "audit_log");
        assert!(restorer.config().skip_existing);
    }

    #[test]
    fn test_get_restorer_with_config() {
        let restorer = get_restorer_with_config(false);
        assert!(!restorer.config().skip_existing);
    }

    #[test]
    fn test_audit_restore_routes_creation() {
        let routes = audit_restore_routes();
        let _ = routes;
    }

    #[test]
    fn test_default_skip_existing() {
        assert!(default_skip_existing());
    }
}

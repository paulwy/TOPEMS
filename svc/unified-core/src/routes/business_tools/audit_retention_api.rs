//! V465: Audit Log Retention Policy API
//!
//! Provides REST API endpoints for managing audit log retention policy,
//! triggering cleanup, and viewing retention statistics.

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use axum::Router;
use serde::{Deserialize, Serialize};

use crate::shared::AppState;
use super::audit_retention::{RetentionPolicy, CleanupResult, RetentionStats};
use super::audit_retention_task::CleanupTaskStats;
use super::permission_api::ErrorResponse;

// ===== Request Types =====

/// Request to update the retention policy.
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateRetentionPolicyRequest {
    /// Maximum age of audit logs to keep (in days).
    #[serde(default)]
    pub retention_days: Option<u32>,
    /// Whether to archive old logs before deleting.
    #[serde(default)]
    pub archive_enabled: Option<bool>,
    /// Directory path for archived logs.
    #[serde(default)]
    pub archive_path: Option<String>,
    /// Maximum number of logs to delete per cleanup run.
    #[serde(default)]
    pub batch_size: Option<u32>,
    /// Cleanup interval (in hours).
    #[serde(default)]
    pub cleanup_interval_hours: Option<u32>,
}

/// Request to trigger a manual cleanup.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct TriggerCleanupRequest {
    /// Override retention days for this cleanup (optional).
    #[serde(default)]
    pub retention_days: Option<u32>,
}

// ===== Response Types =====

/// Response containing the current retention policy.
#[derive(Debug, Clone, Serialize)]
pub struct RetentionPolicyResponse {
    /// Current retention policy.
    pub policy: RetentionPolicy,
}

/// Response for cleanup trigger.
#[derive(Debug, Clone, Serialize)]
pub struct TriggerCleanupResponse {
    /// Whether cleanup was triggered successfully.
    pub triggered: bool,
    /// Cleanup result (if completed synchronously).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<CleanupResult>,
}

// ===== Route Handlers =====

/// `GET /api/business-tools/audit-logs/retention/policy` — Get retention policy.
pub async fn get_retention_policy(
    State(state): State<AppState>,
) -> Result<Json<RetentionPolicyResponse>, (StatusCode, Json<ErrorResponse>)> {
    // In a full implementation, the policy would be stored in AppState or a config store.
    // For now, we return the default policy.
    // TODO: Integrate RetentionManager into AppState
    let policy = state.audit_retention_policy.lock().await.clone();

    Ok(Json(RetentionPolicyResponse { policy }))
}

/// `PUT /api/business-tools/audit-logs/retention/policy` — Update retention policy.
pub async fn update_retention_policy(
    State(state): State<AppState>,
    Json(request): Json<UpdateRetentionPolicyRequest>,
) -> Result<Json<RetentionPolicyResponse>, (StatusCode, Json<ErrorResponse>)> {
    let mut policy = state.audit_retention_policy.lock().await.clone();

    if let Some(retention_days) = request.retention_days {
        if retention_days == 0 {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "retention_days must be greater than 0".to_string(),
                    code: Some("INVALID_RETENTION_DAYS".to_string()),
                }),
            ));
        }
        policy.retention_days = retention_days;
    }

    if let Some(archive_enabled) = request.archive_enabled {
        policy.archive_enabled = archive_enabled;
    }

    if let Some(archive_path) = request.archive_path {
        policy.archive_path = if archive_path.is_empty() {
            None
        } else {
            Some(archive_path)
        };
    }

    if let Some(batch_size) = request.batch_size {
        if batch_size == 0 {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "batch_size must be greater than 0".to_string(),
                    code: Some("INVALID_BATCH_SIZE".to_string()),
                }),
            ));
        }
        policy.batch_size = batch_size;
    }

    if let Some(cleanup_interval_hours) = request.cleanup_interval_hours {
        if cleanup_interval_hours == 0 {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "cleanup_interval_hours must be greater than 0".to_string(),
                    code: Some("INVALID_CLEANUP_INTERVAL".to_string()),
                }),
            ));
        }
        policy.cleanup_interval_hours = cleanup_interval_hours;
    }

    // Update the policy in AppState
    // In a full implementation, this would be persisted to a config store.
    // For now, we update the in-memory policy.
    // TODO: Persist policy to config store
    *state.audit_retention_policy.lock().await = policy.clone();

    Ok(Json(RetentionPolicyResponse { policy }))
}

/// `POST /api/business-tools/audit-logs/retention/cleanup` — Trigger manual cleanup.
pub async fn trigger_cleanup(
    State(state): State<AppState>,
    Json(request): Json<TriggerCleanupRequest>,
) -> Result<Json<TriggerCleanupResponse>, (StatusCode, Json<ErrorResponse>)> {
    let mut policy = state.audit_retention_policy.lock().await.clone();

    // Override retention days if provided
    if let Some(retention_days) = request.retention_days {
        if retention_days == 0 {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "retention_days must be greater than 0".to_string(),
                    code: Some("INVALID_RETENTION_DAYS".to_string()),
                }),
            ));
        }
        policy.retention_days = retention_days;
    }

    // Create a retention manager and run cleanup
    // In a full implementation, the store would come from AppState.
    // For now, we use the audit_logger's store if available.
    // TODO: Integrate AuditLogStore into AppState for cleanup
    let result = CleanupResult {
        deleted_count: 0,
        archived_count: 0,
        cutoff_time: policy.cutoff_time().to_rfc3339(),
        success: true,
        error: Some("Cleanup not yet integrated with AuditLogStore in AppState".to_string()),
    };

    Ok(Json(TriggerCleanupResponse {
        triggered: true,
        result: Some(result),
    }))
}

/// `GET /api/business-tools/audit-logs/retention/stats` — Get retention statistics.
pub async fn get_retention_stats(
    State(state): State<AppState>,
) -> Result<Json<RetentionStats>, (StatusCode, Json<ErrorResponse>)> {
    let policy = state.audit_retention_policy.lock().await.clone();
    let cutoff = policy.cutoff_time();

    // In a full implementation, we would query the AuditLogStore for old entries.
    // For now, we return stats with 0 entries.
    // TODO: Integrate AuditLogStore into AppState for stats
    let stats = RetentionStats {
        retention_days: policy.retention_days,
        cutoff_time: cutoff.to_rfc3339(),
        entries_older_than_cutoff: 0,
        archive_enabled: policy.archive_enabled,
        batch_size: policy.batch_size,
        cleanup_interval_hours: policy.cleanup_interval_hours,
    };

    Ok(Json(stats))
}

// ===== V473: Cleanup Task Control API (start / stop / status) =====

/// Response returned by `GET .../retention/task/status`.
#[derive(Debug, Clone, Serialize)]
pub struct CleanupTaskStatusResponse {
    /// Snapshotted cleanup-task statistics.
    #[serde(flatten)]
    pub stats: CleanupTaskStats,
    /// Set to `true` when the task controller is present in AppState and
    /// responding to API calls.  Currently always `true` — reserved for
    /// a future "detached" mode.
    pub controller_ready: bool,
}

/// `GET /api/business-tools/audit-logs/retention/task/status` —
/// Retrieve running flag and policy values from the cleanup controller.
pub async fn get_cleanup_task_status(
    State(state): State<AppState>,
) -> Result<Json<CleanupTaskStatusResponse>, (StatusCode, Json<ErrorResponse>)> {
    let stats = state.audit_cleanup_controller.status().await;
    Ok(Json(CleanupTaskStatusResponse {
        stats,
        controller_ready: true,
    }))
}

/// Response returned by `POST .../retention/task/start` and `.../stop`.
#[derive(Debug, Clone, Serialize)]
pub struct CleanupTaskControlResponse {
    /// Whether the API call executed successfully (always `true` on
    /// HTTP 200 — if the request was invalid, we return 4xx instead).
    pub success: bool,
    /// Effective running flag *after* applying the command.
    pub running: bool,
    /// Human-readable explanation of the applied action.  Informational
    /// only; never parsed by clients.
    pub message: String,
}

/// `POST /api/business-tools/audit-logs/retention/task/start` —
/// Start the periodic audit-log cleanup background task.
pub async fn start_cleanup_task(
    State(state): State<AppState>,
) -> Result<Json<CleanupTaskControlResponse>, (StatusCode, Json<ErrorResponse>)> {
    state.audit_cleanup_controller.start().await;
    let running = state.audit_cleanup_controller.is_running();
    Ok(Json(CleanupTaskControlResponse {
        success: true,
        running,
        message: if running {
            "Retention cleanup task started".to_string()
        } else {
            "Retention cleanup task was already running".to_string()
        },
    }))
}

/// `POST /api/business-tools/audit-logs/retention/task/stop` —
/// Stop the periodic audit-log cleanup background task.
pub async fn stop_cleanup_task(
    State(state): State<AppState>,
) -> Result<Json<CleanupTaskControlResponse>, (StatusCode, Json<ErrorResponse>)> {
    state.audit_cleanup_controller.stop().await;
    let running = state.audit_cleanup_controller.is_running();
    Ok(Json(CleanupTaskControlResponse {
        success: true,
        running,
        message: if running {
            "Retention cleanup task is still running (failed to stop)".to_string()
        } else {
            "Retention cleanup task stopped".to_string()
        },
    }))
}

// ===== Route Registration =====

/// Create audit log retention policy routes.
pub fn audit_retention_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/business-tools/audit-logs/retention/policy",
            axum::routing::get(get_retention_policy)
                .put(update_retention_policy),
        )
        .route(
            "/business-tools/audit-logs/retention/cleanup",
            axum::routing::post(trigger_cleanup),
        )
        .route(
            "/business-tools/audit-logs/retention/stats",
            axum::routing::get(get_retention_stats),
        )
        .route(
            "/business-tools/audit-logs/retention/task/status",
            axum::routing::get(get_cleanup_task_status),
        )
        .route(
            "/business-tools/audit-logs/retention/task/start",
            axum::routing::post(start_cleanup_task),
        )
        .route(
            "/business-tools/audit-logs/retention/task/stop",
            axum::routing::post(stop_cleanup_task),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_retention_policy_request_deserialization() {
        let json = r#"{
            "retention_days": 60,
            "archive_enabled": true,
            "archive_path": "/var/log/archive",
            "batch_size": 500,
            "cleanup_interval_hours": 12
        }"#;
        let req: UpdateRetentionPolicyRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.retention_days, Some(60));
        assert_eq!(req.archive_enabled, Some(true));
        assert_eq!(req.archive_path.as_deref(), Some("/var/log/archive"));
        assert_eq!(req.batch_size, Some(500));
        assert_eq!(req.cleanup_interval_hours, Some(12));
    }

    #[test]
    fn test_update_retention_policy_request_partial() {
        let json = r#"{"retention_days": 30}"#;
        let req: UpdateRetentionPolicyRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.retention_days, Some(30));
        assert!(req.archive_enabled.is_none());
        assert!(req.archive_path.is_none());
        assert!(req.batch_size.is_none());
        assert!(req.cleanup_interval_hours.is_none());
    }

    #[test]
    fn test_trigger_cleanup_request_deserialization() {
        let json = r#"{"retention_days": 7}"#;
        let req: TriggerCleanupRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.retention_days, Some(7));
    }

    #[test]
    fn test_trigger_cleanup_request_default() {
        let req = TriggerCleanupRequest::default();
        assert!(req.retention_days.is_none());
    }

    #[test]
    fn test_retention_policy_response_serialization() {
        let policy = RetentionPolicy::new(30);
        let response = RetentionPolicyResponse { policy };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"retention_days\":30"));
    }

    #[test]
    fn test_trigger_cleanup_response_serialization() {
        let response = TriggerCleanupResponse {
            triggered: true,
            result: None,
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"triggered\":true"));
        assert!(!json.contains("result")); // None should be skipped
    }

    #[test]
    fn test_trigger_cleanup_response_with_result() {
        let result = CleanupResult {
            deleted_count: 10,
            archived_count: 5,
            cutoff_time: "2026-01-01T00:00:00Z".to_string(),
            success: true,
            error: None,
        };
        let response = TriggerCleanupResponse {
            triggered: true,
            result: Some(result),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"triggered\":true"));
        assert!(json.contains("\"deleted_count\":10"));
    }

    #[test]
    fn test_retention_policy_default_values() {
        let policy = RetentionPolicy::default();
        assert_eq!(policy.retention_days, 90);
        assert!(!policy.archive_enabled);
        assert_eq!(policy.batch_size, 1000);
        assert_eq!(policy.cleanup_interval_hours, 24);
    }

    #[test]
    fn test_retention_policy_cutoff_time() {
        let policy = RetentionPolicy::new(30);
        let cutoff = policy.cutoff_time();
        // Cutoff should be approximately 30 days ago
        let expected = chrono::Utc::now() - std::time::Duration::from_secs(30 * 86400);
        assert!((cutoff - expected).num_seconds().abs() <= 1);
    }

    #[test]
    fn test_audit_retention_routes_creation() {
        let routes = audit_retention_routes();
        // Just verify it compiles and creates a router
        let _ = routes;
    }

    // ===== V473: Cleanup task controller API type tests =====

    #[test]
    fn test_cleanup_task_status_response_serialization() {
        let resp = CleanupTaskStatusResponse {
            stats: CleanupTaskStats {
                running: true,
                cleanup_interval_hours: 6,
                retention_days: 45,
            },
            controller_ready: true,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"running\":true"));
        assert!(json.contains("\"cleanup_interval_hours\":6"));
        assert!(json.contains("\"retention_days\":45"));
        assert!(json.contains("\"controller_ready\":true"));
    }

    #[test]
    fn test_cleanup_task_control_response_roundtrip() {
        let started = CleanupTaskControlResponse {
            success: true,
            running: true,
            message: "Retention cleanup task started".to_string(),
        };
        let json = serde_json::to_value(&started).unwrap();
        assert_eq!(json["success"], true);
        assert_eq!(json["running"], true);
        assert_eq!(json["message"], "Retention cleanup task started");

        let stopped = CleanupTaskControlResponse {
            success: true,
            running: false,
            message: "Retention cleanup task stopped".to_string(),
        };
        let json2 = serde_json::to_value(&stopped).unwrap();
        assert_eq!(json2["running"], false);
        assert_eq!(json2["message"], "Retention cleanup task stopped");
    }
}

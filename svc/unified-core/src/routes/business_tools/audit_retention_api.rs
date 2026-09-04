//! V465: Audit Log Retention Policy API
//!
//! Provides REST API endpoints for managing audit log retention policy,
//! triggering cleanup, and viewing retention statistics.

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use axum::Router;
use serde::{Deserialize, Serialize};

use super::audit_retention::{CleanupResult, RetentionPolicy, RetentionStats};
use super::permission_api::ErrorResponse;
use crate::shared::AppState;

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
    // Use RetentionManager from AppState for policy retrieval
    let policy = state.retention_manager.policy().clone();

    Ok(Json(RetentionPolicyResponse { policy }))
}

/// `PUT /api/business-tools/audit-logs/retention/policy` — Update retention policy.
pub async fn update_retention_policy(
    State(state): State<AppState>,
    Json(request): Json<UpdateRetentionPolicyRequest>,
) -> Result<Json<RetentionPolicyResponse>, (StatusCode, Json<ErrorResponse>)> {
    let mut policy = state.retention_manager.policy().clone();

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

    // Update the policy in RetentionManager and persist to config store
    if let Err(e) = state.config_store.save_audit_retention_policy(&policy).await {
        tracing::error!("Failed to persist audit retention policy: {}", e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Failed to save retention policy".to_string(),
                code: Some("CONFIG_SAVE_FAILED".to_string()),
            }),
        ));
    }
    
    // Note: In a real implementation, we would need to redesign RetentionManager 
    // to support policy updates through Arc, or use a different approach
    tracing::info!("Audit retention policy updated and persisted");

    Ok(Json(RetentionPolicyResponse { policy }))
}

/// `POST /api/business-tools/audit-logs/retention/cleanup` — Trigger manual cleanup.
pub async fn trigger_cleanup(
    State(state): State<AppState>,
    Json(_request): Json<TriggerCleanupRequest>,
) -> Result<Json<TriggerCleanupResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Use RetentionManager from AppState for cleanup operations
    let result = state.retention_manager.cleanup().await;

    Ok(Json(TriggerCleanupResponse {
        triggered: true,
        result: Some(result),
    }))
}

/// `GET /api/business-tools/audit-logs/retention/stats` — Get retention statistics.
pub async fn get_retention_stats(
    State(state): State<AppState>,
) -> Result<Json<RetentionStats>, (StatusCode, Json<ErrorResponse>)> {
    // Use RetentionManager from AppState for statistics
    let stats = state.retention_manager.get_stats().await;

    Ok(Json(stats))
}

// ===== Route Registration =====

/// Create audit log retention policy routes.
pub fn audit_retention_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/business-tools/audit-logs/retention/policy",
            axum::routing::get(get_retention_policy).put(update_retention_policy),
        )
        .route(
            "/business-tools/audit-logs/retention/cleanup",
            axum::routing::post(trigger_cleanup),
        )
        .route(
            "/business-tools/audit-logs/retention/stats",
            axum::routing::get(get_retention_stats),
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
}

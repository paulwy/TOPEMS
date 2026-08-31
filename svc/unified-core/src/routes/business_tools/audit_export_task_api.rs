//! V474: Audit Log Export Task Control API
//!
//! Provides REST API endpoints for controlling the periodic audit log
//! export (archive) background task.  Mirrors the retention cleanup
//! task API surface:
//!
//! - `GET  .../export/task/status`  — running flag + last-run stats
//! - `POST .../export/task/start`   — start the background loop
//! - `POST .../export/task/stop`   — stop the background loop
//! - `POST .../export/task/trigger` — run a single export immediately
//! - `GET  .../export/task/config`  — read the export task config
//! - `PUT  .../export/task/config`  — update interval / batch size
//!
//! Unlike the retention cleanup task (which *deletes* old entries),
//! the export task only reads the store and writes copies to disk,
//! leaving the live audit log intact.

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use axum::Router;
use serde::{Deserialize, Serialize};

use crate::shared::AppState;
use super::audit_export_task::{
    ExportRunResult, ExportTaskConfig, ExportTaskStats,
};
use super::permission_api::ErrorResponse;

// ===== Request Types =====

/// Request to update the export task config.
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateExportConfigRequest {
    /// Export interval in seconds.  Must be > 0.
    #[serde(default)]
    pub interval_secs: Option<u64>,
    /// Page size used when querying the store in batches.  Must be > 0.
    #[serde(default)]
    pub batch_size: Option<usize>,
}

// ===== Response Types =====

/// Response returned by `GET .../export/task/config`.
#[derive(Debug, Clone, Serialize)]
pub struct ExportConfigResponse {
    pub interval_secs: u64,
    pub batch_size: usize,
}

impl From<ExportTaskConfig> for ExportConfigResponse {
    fn from(c: ExportTaskConfig) -> Self {
        Self {
            interval_secs: c.interval_secs,
            batch_size: c.batch_size,
        }
    }
}

/// Response returned by `GET .../export/task/status`.
#[derive(Debug, Clone, Serialize)]
pub struct ExportTaskStatusResponse {
    /// Snapshotted export-task statistics.
    #[serde(flatten)]
    pub stats: ExportTaskStats,
    /// Always `true` when the controller is present in AppState.
    pub controller_ready: bool,
}

/// Response returned by `POST .../export/task/start` and `.../stop`.
#[derive(Debug, Clone, Serialize)]
pub struct ExportTaskControlResponse {
    /// Whether the API call executed successfully.
    pub success: bool,
    /// Effective running flag *after* applying the command.
    pub running: bool,
    /// Human-readable explanation.  Informational only.
    pub message: String,
}

/// Response returned by `POST .../export/task/trigger`.
#[derive(Debug, Clone, Serialize)]
pub struct TriggerExportResponse {
    /// Whether the API call executed successfully.
    pub success: bool,
    /// Snapshot of the single run's result.
    #[serde(flatten)]
    pub result: ExportRunResult,
}

// ===== Route Handlers =====

/// `GET /api/business-tools/permissions/audit-logs/export/task/status` —
/// Retrieve running flag and last-run stats from the export controller.
pub async fn get_export_task_status(
    State(state): State<AppState>,
) -> Result<Json<ExportTaskStatusResponse>, (StatusCode, Json<ErrorResponse>)> {
    let stats = state.audit_export_controller.status().await;
    Ok(Json(ExportTaskStatusResponse {
        stats,
        controller_ready: true,
    }))
}

/// `POST /api/business-tools/permissions/audit-logs/export/task/start` —
/// Start the periodic audit-log export background task.
pub async fn start_export_task(
    State(state): State<AppState>,
) -> Result<Json<ExportTaskControlResponse>, (StatusCode, Json<ErrorResponse>)> {
    state.audit_export_controller.start().await;
    let running = state.audit_export_controller.is_running();
    Ok(Json(ExportTaskControlResponse {
        success: true,
        running,
        message: if running {
            "Audit export task started".to_string()
        } else {
            "Audit export task was already running".to_string()
        },
    }))
}

/// `POST /api/business-tools/permissions/audit-logs/export/task/stop` —
/// Stop the periodic audit-log export background task.
pub async fn stop_export_task(
    State(state): State<AppState>,
) -> Result<Json<ExportTaskControlResponse>, (StatusCode, Json<ErrorResponse>)> {
    state.audit_export_controller.stop().await;
    let running = state.audit_export_controller.is_running();
    Ok(Json(ExportTaskControlResponse {
        success: true,
        running,
        message: if running {
            "Audit export task is still running (failed to stop)".to_string()
        } else {
            "Audit export task stopped".to_string()
        },
    }))
}

/// `POST /api/business-tools/permissions/audit-logs/export/task/trigger` —
/// Trigger a single export run immediately (manual export).
pub async fn trigger_export_task(
    State(state): State<AppState>,
) -> Result<Json<TriggerExportResponse>, (StatusCode, Json<ErrorResponse>)> {
    let result = state.audit_export_controller.trigger_once().await;
    Ok(Json(TriggerExportResponse {
        success: result.success,
        result,
    }))
}

/// `GET /api/business-tools/permissions/audit-logs/export/task/config` —
/// Read the current export task config (interval + batch size).
pub async fn get_export_task_config(
    State(state): State<AppState>,
) -> Result<Json<ExportConfigResponse>, (StatusCode, Json<ErrorResponse>)> {
    let config = state.audit_export_config.lock().await.clone();
    Ok(Json(ExportConfigResponse::from(config)))
}

/// `PUT /api/business-tools/permissions/audit-logs/export/task/config` —
/// Update the export task config.  Changes take effect on the next
/// background tick (interval) or next query page (batch size).
pub async fn update_export_task_config(
    State(state): State<AppState>,
    Json(request): Json<UpdateExportConfigRequest>,
) -> Result<Json<ExportConfigResponse>, (StatusCode, Json<ErrorResponse>)> {
    let mut config = state.audit_export_config.lock().await.clone();

    if let Some(interval_secs) = request.interval_secs {
        if interval_secs == 0 {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "interval_secs must be greater than 0".to_string(),
                    code: Some("INVALID_INTERVAL".to_string()),
                }),
            ));
        }
        config.interval_secs = interval_secs;
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
        config.batch_size = batch_size;
    }

    *state.audit_export_config.lock().await = config.clone();

    Ok(Json(ExportConfigResponse::from(config)))
}

// ===== Route Registration =====

/// Create audit log export task control routes.
pub fn audit_export_task_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/business-tools/permissions/audit-logs/export/task/status",
            axum::routing::get(get_export_task_status),
        )
        .route(
            "/business-tools/permissions/audit-logs/export/task/start",
            axum::routing::post(start_export_task),
        )
        .route(
            "/business-tools/permissions/audit-logs/export/task/stop",
            axum::routing::post(stop_export_task),
        )
        .route(
            "/business-tools/permissions/audit-logs/export/task/trigger",
            axum::routing::post(trigger_export_task),
        )
        .route(
            "/business-tools/permissions/audit-logs/export/task/config",
            axum::routing::get(get_export_task_config)
                .put(update_export_task_config),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_export_config_request_full() {
        let json = r#"{
            "interval_secs": 3600,
            "batch_size": 250
        }"#;
        let req: UpdateExportConfigRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.interval_secs, Some(3600));
        assert_eq!(req.batch_size, Some(250));
    }

    #[test]
    fn test_update_export_config_request_partial() {
        let json = r#"{"batch_size": 100}"#;
        let req: UpdateExportConfigRequest = serde_json::from_str(json).unwrap();
        assert!(req.interval_secs.is_none());
        assert_eq!(req.batch_size, Some(100));
    }

    #[test]
    fn test_update_export_config_request_empty() {
        let json = r#"{}"#;
        let req: UpdateExportConfigRequest = serde_json::from_str(json).unwrap();
        assert!(req.interval_secs.is_none());
        assert!(req.batch_size.is_none());
    }

    #[test]
    fn test_export_config_response_from_config() {
        let config = ExportTaskConfig::new(7200).with_batch_size(128);
        let resp = ExportConfigResponse::from(config);
        assert_eq!(resp.interval_secs, 7200);
        assert_eq!(resp.batch_size, 128);
    }

    #[test]
    fn test_export_config_response_serialization() {
        let resp = ExportConfigResponse {
            interval_secs: 86400,
            batch_size: 500,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"interval_secs\":86400"));
        assert!(json.contains("\"batch_size\":500"));
    }

    #[test]
    fn test_export_task_status_response_serialization() {
        let resp = ExportTaskStatusResponse {
            stats: ExportTaskStats {
                running: true,
                interval_secs: 3600,
                last_export_count: 42,
                last_export_at: Some("2026-08-31T10:00:00Z".to_string()),
            },
            controller_ready: true,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"running\":true"));
        assert!(json.contains("\"interval_secs\":3600"));
        assert!(json.contains("\"last_export_count\":42"));
        assert!(json.contains("\"controller_ready\":true"));
    }

    #[test]
    fn test_export_task_control_response_roundtrip() {
        let started = ExportTaskControlResponse {
            success: true,
            running: true,
            message: "Audit export task started".to_string(),
        };
        let json = serde_json::to_value(&started).unwrap();
        assert_eq!(json["success"], true);
        assert_eq!(json["running"], true);
        assert_eq!(json["message"], "Audit export task started");

        let stopped = ExportTaskControlResponse {
            success: true,
            running: false,
            message: "Audit export task stopped".to_string(),
        };
        let json2 = serde_json::to_value(&stopped).unwrap();
        assert_eq!(json2["running"], false);
    }

    #[test]
    fn test_trigger_export_response_serialization() {
        let resp = TriggerExportResponse {
            success: true,
            result: ExportRunResult {
                success: true,
                exported: 5,
                archived: 5,
                window_start: "2026-08-31T10:00:00Z".to_string(),
                error: None,
            },
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"exported\":5"));
        assert!(json.contains("\"archived\":5"));
        assert!(json.contains("\"window_start\""));
        // error is skipped when None
        assert!(!json.contains("error"));
    }

    #[test]
    fn test_trigger_export_response_with_error() {
        let resp = TriggerExportResponse {
            success: false,
            result: ExportRunResult {
                success: false,
                exported: 0,
                archived: 0,
                window_start: String::new(),
                error: Some("store unavailable".to_string()),
            },
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["success"], serde_json::Value::Bool(false));
        assert_eq!(json["error"], "store unavailable");
    }

    #[test]
    fn test_audit_export_task_routes_creation() {
        let routes = audit_export_task_routes();
        let _ = routes;
    }
}

//! Report handlers

use axum::{extract::State, Json};
use tracing::info;

/// List reports
pub async fn list_reports(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Listing reports");
    Json(serde_json::json!({
        "success": true,
        "message": "List reports"
    }))
}

/// Create report
pub async fn create_report(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Creating report");
    Json(serde_json::json!({
        "success": true,
        "message": "Create report"
    }))
}

/// Get report
pub async fn get_report(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Getting report");
    Json(serde_json::json!({
        "success": true,
        "message": "Get report"
    }))
}

/// Update report
pub async fn update_report(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Updating report");
    Json(serde_json::json!({
        "success": true,
        "message": "Update report"
    }))
}

/// Delete report
pub async fn delete_report(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Deleting report");
    Json(serde_json::json!({
        "success": true,
        "message": "Delete report"
    }))
}

/// Export report
pub async fn export_report(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Exporting report");
    Json(serde_json::json!({
        "success": true,
        "message": "Export report"
    }))
}

/// Run report
pub async fn run_report(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Running report");
    Json(serde_json::json!({
        "success": true,
        "message": "Run report"
    }))
}

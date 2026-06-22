//! Dashboard handlers

use axum::{extract::State, Json};
use tracing::info;

/// List dashboards
pub async fn list_dashboards(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Listing dashboards");
    Json(serde_json::json!({
        "success": true,
        "message": "List dashboards"
    }))
}

/// Create dashboard
pub async fn create_dashboard(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Creating dashboard");
    Json(serde_json::json!({
        "success": true,
        "message": "Create dashboard"
    }))
}

/// Get dashboard
pub async fn get_dashboard(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Getting dashboard");
    Json(serde_json::json!({
        "success": true,
        "message": "Get dashboard"
    }))
}

/// Update dashboard
pub async fn update_dashboard(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Updating dashboard");
    Json(serde_json::json!({
        "success": true,
        "message": "Update dashboard"
    }))
}

/// Delete dashboard
pub async fn delete_dashboard(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Deleting dashboard");
    Json(serde_json::json!({
        "success": true,
        "message": "Delete dashboard"
    }))
}

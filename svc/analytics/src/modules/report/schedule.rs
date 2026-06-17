//! Report Schedule handlers

use axum::{extract::State, Json};
use tracing::info;

/// List schedules
pub async fn list_schedules(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Listing schedules");
    Json(serde_json::json!({
        "success": true,
        "message": "List schedules"
    }))
}

/// Create schedule
pub async fn create_schedule(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Creating schedule");
    Json(serde_json::json!({
        "success": true,
        "message": "Create schedule"
    }))
}

/// Get schedule
pub async fn get_schedule(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Getting schedule");
    Json(serde_json::json!({
        "success": true,
        "message": "Get schedule"
    }))
}

/// Update schedule
pub async fn update_schedule(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Updating schedule");
    Json(serde_json::json!({
        "success": true,
        "message": "Update schedule"
    }))
}

/// Delete schedule
pub async fn delete_schedule(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Deleting schedule");
    Json(serde_json::json!({
        "success": true,
        "message": "Delete schedule"
    }))
}

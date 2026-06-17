//! Visualization handlers

use axum::{extract::State, Json};
use tracing::info;

/// List visualizations
pub async fn list_visualizations(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Listing visualizations");
    Json(serde_json::json!({
        "success": true,
        "message": "List visualizations"
    }))
}

/// Create visualization
pub async fn create_visualization(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Creating visualization");
    Json(serde_json::json!({
        "success": true,
        "message": "Create visualization"
    }))
}

/// Get visualization
pub async fn get_visualization(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Getting visualization");
    Json(serde_json::json!({
        "success": true,
        "message": "Get visualization"
    }))
}

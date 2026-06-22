//! DataSource handlers

use axum::{extract::State, Json};
use tracing::info;

/// List datasources
pub async fn list_datasources(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Listing datasources");
    Json(serde_json::json!({
        "success": true,
        "message": "List datasources"
    }))
}

/// Create datasource
pub async fn create_datasource(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Creating datasource");
    Json(serde_json::json!({
        "success": true,
        "message": "Create datasource"
    }))
}

/// Get datasource
pub async fn get_datasource(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Getting datasource");
    Json(serde_json::json!({
        "success": true,
        "message": "Get datasource"
    }))
}

/// Update datasource
pub async fn update_datasource(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Updating datasource");
    Json(serde_json::json!({
        "success": true,
        "message": "Update datasource"
    }))
}

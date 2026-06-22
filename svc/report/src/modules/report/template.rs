//! Report Template handlers

use axum::{extract::State, Json};
use tracing::info;

/// List templates
pub async fn list_templates(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Listing templates");
    Json(serde_json::json!({
        "success": true,
        "message": "List templates"
    }))
}

/// Create template
pub async fn create_template(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Creating template");
    Json(serde_json::json!({
        "success": true,
        "message": "Create template"
    }))
}

/// Get template
pub async fn get_template(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Getting template");
    Json(serde_json::json!({
        "success": true,
        "message": "Get template"
    }))
}

/// Update template
pub async fn update_template(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Updating template");
    Json(serde_json::json!({
        "success": true,
        "message": "Update template"
    }))
}

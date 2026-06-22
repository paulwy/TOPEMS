//! Widget handlers

use axum::{extract::State, Json};
use tracing::info;

/// List widgets
pub async fn list_widgets(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Listing widgets");
    Json(serde_json::json!({
        "success": true,
        "message": "List widgets"
    }))
}

/// Create widget
pub async fn create_widget(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Creating widget");
    Json(serde_json::json!({
        "success": true,
        "message": "Create widget"
    }))
}

/// Get widget
pub async fn get_widget(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Getting widget");
    Json(serde_json::json!({
        "success": true,
        "message": "Get widget"
    }))
}

/// Update widget
pub async fn update_widget(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Updating widget");
    Json(serde_json::json!({
        "success": true,
        "message": "Update widget"
    }))
}

/// Delete widget
pub async fn delete_widget(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Deleting widget");
    Json(serde_json::json!({
        "success": true,
        "message": "Delete widget"
    }))
}

/// Get widget data
pub async fn get_widget_data(State(_state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Getting widget data");
    Json(serde_json::json!({
        "success": true,
        "message": "Get widget data"
    }))
}

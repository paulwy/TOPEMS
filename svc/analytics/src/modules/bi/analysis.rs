//! Analysis handlers

use axum::{extract::State, Json};
use tracing::info;

/// List analyses
pub async fn list_analyses(
    State(_state): State<crate::shared::AppState>,
) -> Json<serde_json::Value> {
    info!("Listing analyses");
    Json(serde_json::json!({
        "success": true,
        "message": "List analyses"
    }))
}

/// Create analysis
pub async fn create_analysis(
    State(_state): State<crate::shared::AppState>,
) -> Json<serde_json::Value> {
    info!("Creating analysis");
    Json(serde_json::json!({
        "success": true,
        "message": "Create analysis"
    }))
}

/// Get analysis
pub async fn get_analysis(
    State(_state): State<crate::shared::AppState>,
) -> Json<serde_json::Value> {
    info!("Getting analysis");
    Json(serde_json::json!({
        "success": true,
        "message": "Get analysis"
    }))
}

/// Execute analysis
pub async fn execute_analysis(
    State(_state): State<crate::shared::AppState>,
) -> Json<serde_json::Value> {
    info!("Executing analysis");
    Json(serde_json::json!({
        "success": true,
        "message": "Execute analysis"
    }))
}

//! Permission submodule - Permission management handlers

use axum::{extract::State, Json};
use crate::AppState;

pub async fn list_permissions(
    State(_state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM permission list_permissions called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_permissions success",
        "data": []
    }))
}
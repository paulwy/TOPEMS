//! Analysis handlers

use axum::{extract::State, Json};
use tracing::info;

/// List analyses
#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/analysis",
    tag = "Analytics",
    responses(
        (status = 200, description = "Success", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:report:write"])),
    path = "/api/bi/analysis",
    tag = "Analytics",
    responses(
        (status = 200, description = "Created successfully", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_analysis(
    State(_state): State<crate::shared::AppState>,
) -> Json<serde_json::Value> {
    info!("Creating analysis");
    Json(serde_json::json!({
        "success": true,
        "message": "Create analysis"
    }))
}

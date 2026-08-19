//! Record submodule - Approval record handlers

use crate::AppState;
use axum::{
    extract::{Path, State},
    Json,
};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified_core:read"])),
    path = "/api/core/flow/records",
    tag = "Flow-Approval",
    responses(
        (status = 200, description = "查询成功", body = serde_json::Value),
    ),
)]
pub async fn list_records(State(_state): State<AppState>) -> Json<serde_json::Value> {
    tracing::info!("Flow record list_records called");
    Json(serde_json::json!({
        "success": true,
        "message": "list_records success",
        "data": []
    }))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified_core:read"])),
    path = "/api/core/flow/records/{approval_id}",
    tag = "Flow-Approval",
    params(
        ("approval_id" = String, Path, description = "审批ID"),
    ),
    responses(
        (status = 200, description = "查询成功", body = serde_json::Value),
    ),
)]
pub async fn get_record(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Flow record get_record called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_record success",
        "data": null
    }))
}

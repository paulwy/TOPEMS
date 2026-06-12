use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::api::response::ApiResponse;
use crate::models::*;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub is_active: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn list_workflows(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> (StatusCode, Json<ApiResponse<PaginatedResult<Workflow>>>) {
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0).max(0);
    info!(
        "Listing workflows: is_active={:?}, limit={}, offset={}",
        query.is_active, limit, offset
    );

    match state
        .repo
        .list_workflows(query.is_active, limit, offset)
        .await
    {
        Ok(result) => {
            info!(
                "Listed {} workflows (total: {})",
                result.items.len(),
                result.total
            );
            (StatusCode::OK, Json(ApiResponse::success(result)))
        }
        Err(e) => {
            error!("Failed to list workflows: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Database error: {}", e))),
            )
        }
    }
}

pub async fn create_workflow(
    State(state): State<AppState>,
    Json(req): Json<CreateWorkflowRequest>,
) -> (StatusCode, Json<ApiResponse<Workflow>>) {
    info!("Creating workflow: {}", req.name);

    if req.name.trim().is_empty() {
        warn!("Attempted to create workflow with empty name");
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error(
                "Workflow name cannot be empty".to_string(),
            )),
        );
    }

    match state.repo.create_workflow(req).await {
        Ok(workflow) => {
            info!("Created workflow: {} (id: {})", workflow.name, workflow.id);
            (
                StatusCode::CREATED,
                Json(ApiResponse::success_with_message(
                    workflow,
                    "Workflow created successfully".to_string(),
                )),
            )
        }
        Err(e) => {
            error!("Failed to create workflow: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Database error: {}", e))),
            )
        }
    }
}

pub async fn get_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<Workflow>>) {
    info!("Getting workflow: {}", id);
    match state.repo.get_workflow(id).await {
        Ok(Some(workflow)) => {
            info!("Retrieved workflow: {} ({})", workflow.name, id);
            (StatusCode::OK, Json(ApiResponse::success(workflow)))
        }
        Ok(None) => {
            warn!("Workflow not found: {}", id);
            (
                StatusCode::NOT_FOUND,
                Json(ApiResponse::error("Workflow not found".to_string())),
            )
        }
        Err(e) => {
            error!("Failed to get workflow {}: {}", id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Database error: {}", e))),
            )
        }
    }
}

pub async fn update_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWorkflowRequest>,
) -> (StatusCode, Json<ApiResponse<Workflow>>) {
    info!("Updating workflow: {}", id);
    match state.repo.update_workflow(id, req).await {
        Ok(Some(workflow)) => {
            info!("Updated workflow: {} ({})", workflow.name, id);
            (
                StatusCode::OK,
                Json(ApiResponse::success_with_message(
                    workflow,
                    "Workflow updated successfully".to_string(),
                )),
            )
        }
        Ok(None) => {
            warn!("Workflow not found for update: {}", id);
            (
                StatusCode::NOT_FOUND,
                Json(ApiResponse::error("Workflow not found".to_string())),
            )
        }
        Err(e) => {
            error!("Failed to update workflow {}: {}", id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Database error: {}", e))),
            )
        }
    }
}

pub async fn delete_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<()>>) {
    info!("Deleting workflow: {}", id);
    match state.repo.delete_workflow(id).await {
        Ok(true) => {
            info!("Deleted workflow: {}", id);
            (
                StatusCode::OK,
                Json(ApiResponse::ok_with_message(
                    "Workflow deleted successfully".to_string(),
                )),
            )
        }
        Ok(false) => {
            warn!("Workflow not found for deletion: {}", id);
            (
                StatusCode::NOT_FOUND,
                Json(ApiResponse::error("Workflow not found".to_string())),
            )
        }
        Err(e) => {
            error!("Failed to delete workflow {}: {}", id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(format!("Database error: {}", e))),
            )
        }
    }
}

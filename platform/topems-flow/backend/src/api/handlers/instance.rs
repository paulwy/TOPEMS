use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Serialize, Deserialize};
use uuid::Uuid;

use crate::api::response::ApiResponse;
use crate::state::AppState;
use crate::models::*;

#[derive(Debug, Deserialize)]
pub struct ListInstancesQuery {
    pub workflow_id: Option<Uuid>,
    pub status: Option<String>,
    pub initiator_id: Option<Uuid>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct StartInstanceRequest {
    pub workflow_id: Uuid,
    pub initiator_id: Option<Uuid>,
    pub data: Option<serde_json::Value>,
}

pub async fn list_instances(
    State(state): State<AppState>,
    Query(query): Query<ListInstancesQuery>,
) -> (StatusCode, Json<ApiResponse<Vec<WorkflowInstance>>>) {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    match state.repo
        .list_instances(
            query.workflow_id,
            query.status,
            query.initiator_id,
            limit,
            offset,
        )
        .await
    {
        Ok(instances) => (
            StatusCode::OK,
            Json(ApiResponse::success(instances)),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn start_instance(
    State(state): State<AppState>,
    Json(req): Json<StartInstanceRequest>,
) -> (StatusCode, Json<ApiResponse<WorkflowInstance>>) {
    match state
        .engine
        .start_workflow_instance(req.workflow_id, req.initiator_id, req.data)
        .await
    {
        Ok(instance) => (
            StatusCode::CREATED,
            Json(ApiResponse::success_with_message(instance, "Workflow instance started successfully".to_string())),
        ),
        Err(crate::services::WorkflowEngineError::WorkflowNotFound) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error("Workflow not found".to_string())),
        ),
        Err(crate::services::WorkflowEngineError::WorkflowNotActive) => (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error("Workflow is not active".to_string())),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn get_instance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<WorkflowInstance>>) {
    match state.repo.get_instance(id).await {
        Ok(Some(instance)) => (
            StatusCode::OK,
            Json(ApiResponse::success(instance)),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error("Workflow instance not found".to_string())),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstanceDetailsResponse {
    pub instance: WorkflowInstance,
    pub approvals: Vec<Approval>,
    pub records: Vec<ApprovalRecord>,
}

#[axum::debug_handler]
pub async fn get_instance_details(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<InstanceDetailsResponse>>) {
    match state.engine.get_instance_details(id).await {
        Ok((instance, approvals, records)) => (
            StatusCode::OK,
            Json(ApiResponse::success(InstanceDetailsResponse {
                instance,
                approvals,
                records,
            })),
        ),
        Err(crate::services::WorkflowEngineError::InstanceNotFound) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error("Workflow instance not found".to_string())),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn update_instance_status(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInstanceStatusRequest>,
) -> (StatusCode, Json<ApiResponse<WorkflowInstance>>) {
    match state.repo.update_instance_status(id, req).await {
        Ok(Some(instance)) => (
            StatusCode::OK,
            Json(ApiResponse::success_with_message(instance, "Instance status updated successfully".to_string())),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error("Workflow instance not found".to_string())),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

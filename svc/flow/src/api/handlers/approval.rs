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
pub struct ListApprovalsQuery {
    pub workflow_instance_id: Option<Uuid>,
    pub assignee_id: Option<Uuid>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ListRecordsQuery {
    pub approval_id: Option<Uuid>,
    pub actor_id: Option<Uuid>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessApprovalResponse {
    pub approval: Approval,
    pub instance: Option<WorkflowInstance>,
}

pub async fn list_approvals(
    State(state): State<AppState>,
    Query(query): Query<ListApprovalsQuery>,
) -> (StatusCode, Json<ApiResponse<Vec<Approval>>>) {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    match state.repo
        .list_approvals(
            query.workflow_instance_id,
            query.assignee_id,
            query.status,
            limit,
            offset,
        )
        .await
    {
        Ok(approvals) => (
            StatusCode::OK,
            Json(ApiResponse::success(approvals)),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn create_approval(
    State(state): State<AppState>,
    Json(req): Json<CreateApprovalRequest>,
) -> (StatusCode, Json<ApiResponse<Approval>>) {
    match state.repo.create_approval(req).await {
        Ok(approval) => (
            StatusCode::CREATED,
            Json(ApiResponse::success_with_message(approval, "Approval created successfully".to_string())),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn get_approval(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<Approval>>) {
    match state.repo.get_approval(id).await {
        Ok(Some(approval)) => (
            StatusCode::OK,
            Json(ApiResponse::success(approval)),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error("Approval not found".to_string())),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn process_approval(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ProcessApprovalRequest>,
) -> (StatusCode, Json<ApiResponse<ProcessApprovalResponse>>) {
    match state.engine.process_approval(id, req).await {
        Ok((approval, instance)) => (
            StatusCode::OK,
            Json(ApiResponse::success_with_message(
                ProcessApprovalResponse { approval, instance },
                "Approval processed successfully".to_string(),
            )),
        ),
        Err(crate::services::WorkflowEngineError::InstanceNotFound) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error("Approval or instance not found".to_string())),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn get_approval_records(
    State(state): State<AppState>,
    Query(query): Query<ListRecordsQuery>,
) -> (StatusCode, Json<ApiResponse<Vec<ApprovalRecord>>>) {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    match state.repo.list_approval_records(query.approval_id, query.actor_id, limit, offset).await {
        Ok(records) => (
            StatusCode::OK,
            Json(ApiResponse::success(records)),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn get_records_by_approval(
    State(state): State<AppState>,
    Path(approval_id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<Vec<ApprovalRecord>>>) {
    match state.repo.get_approval_records(approval_id).await {
        Ok(records) => (
            StatusCode::OK,
            Json(ApiResponse::success(records)),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

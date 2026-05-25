use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::response;
use crate::db::WorkflowRepository;
use crate::models::*;

#[derive(Debug, Deserialize)]
pub struct ListApprovalsQuery {
    pub workflow_instance_id: Option<Uuid>,
    pub assignee_id: Option<Uuid>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn list_approvals(
    State(repo): State<WorkflowRepository>,
    Query(query): Query<ListApprovalsQuery>,
) -> (StatusCode, Json<response::ApiResponse<Vec<Approval>>>) {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    match repo
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
            Json(response::ApiResponse {
                success: true,
                data: Some(approvals),
                message: "Success".to_string(),
            }),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(response::ApiResponse {
                success: false,
                data: None,
                message: e.to_string(),
            }),
        ),
    }
}

pub async fn create_approval(
    State(repo): State<WorkflowRepository>,
    Json(req): Json<CreateApprovalRequest>,
) -> (StatusCode, Json<response::ApiResponse<Approval>>) {
    match repo.create_approval(req).await {
        Ok(approval) => (
            StatusCode::CREATED,
            Json(response::ApiResponse {
                success: true,
                data: Some(approval),
                message: "Approval created".to_string(),
            }),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(response::ApiResponse {
                success: false,
                data: None,
                message: e.to_string(),
            }),
        ),
    }
}

pub async fn get_approval(
    State(repo): State<WorkflowRepository>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<response::ApiResponse<Approval>>) {
    match repo.get_approval(id).await {
        Ok(Some(approval)) => (
            StatusCode::OK,
            Json(response::ApiResponse {
                success: true,
                data: Some(approval),
                message: "Success".to_string(),
            }),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(response::ApiResponse {
                success: false,
                data: None,
                message: "Approval not found".to_string(),
            }),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(response::ApiResponse {
                success: false,
                data: None,
                message: e.to_string(),
            }),
        ),
    }
}

pub async fn process_approval(
    State(repo): State<WorkflowRepository>,
    Path(id): Path<Uuid>,
    Json(req): Json<ProcessApprovalRequest>,
) -> (StatusCode, Json<response::ApiResponse<Approval>>) {
    match repo.process_approval(id, req).await {
        Ok(Some(approval)) => (
            StatusCode::OK,
            Json(response::ApiResponse {
                success: true,
                data: Some(approval),
                message: "Approval processed".to_string(),
            }),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(response::ApiResponse {
                success: false,
                data: None,
                message: "Approval not found".to_string(),
            }),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(response::ApiResponse {
                success: false,
                data: None,
                message: e.to_string(),
            }),
        ),
    }
}

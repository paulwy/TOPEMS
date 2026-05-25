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
pub struct ListInstancesQuery {
    pub workflow_id: Option<Uuid>,
    pub status: Option<String>,
    pub initiator_id: Option<Uuid>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn list_instances(
    State(repo): State<WorkflowRepository>,
    Query(query): Query<ListInstancesQuery>,
) -> (StatusCode, Json<response::ApiResponse<Vec<WorkflowInstance>>>) {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    match repo
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
            Json(response::ApiResponse {
                success: true,
                data: Some(instances),
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

pub async fn create_instance(
    State(repo): State<WorkflowRepository>,
    Json(req): Json<CreateWorkflowInstanceRequest>,
) -> (StatusCode, Json<response::ApiResponse<WorkflowInstance>>) {
    match repo.create_instance(req).await {
        Ok(instance) => (
            StatusCode::CREATED,
            Json(response::ApiResponse {
                success: true,
                data: Some(instance),
                message: "Instance created".to_string(),
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

pub async fn get_instance(
    State(repo): State<WorkflowRepository>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<response::ApiResponse<WorkflowInstance>>) {
    match repo.get_instance(id).await {
        Ok(Some(instance)) => (
            StatusCode::OK,
            Json(response::ApiResponse {
                success: true,
                data: Some(instance),
                message: "Success".to_string(),
            }),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(response::ApiResponse {
                success: false,
                data: None,
                message: "Instance not found".to_string(),
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

pub async fn update_instance_status(
    State(repo): State<WorkflowRepository>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInstanceStatusRequest>,
) -> (StatusCode, Json<response::ApiResponse<WorkflowInstance>>) {
    match repo.update_instance_status(id, req).await {
        Ok(Some(instance)) => (
            StatusCode::OK,
            Json(response::ApiResponse {
                success: true,
                data: Some(instance),
                message: "Instance status updated".to_string(),
            }),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(response::ApiResponse {
                success: false,
                data: None,
                message: "Instance not found".to_string(),
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

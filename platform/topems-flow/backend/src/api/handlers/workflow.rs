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
pub struct ListQuery {
    pub is_active: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn list_workflows(
    State(repo): State<WorkflowRepository>,
    Query(query): Query<ListQuery>,
) -> (StatusCode, Json<response::ApiResponse<Vec<Workflow>>>) {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    match repo.list_workflows(query.is_active, limit, offset).await {
        Ok(workflows) => (
            StatusCode::OK,
            Json(response::ApiResponse {
                success: true,
                data: Some(workflows),
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

pub async fn create_workflow(
    State(repo): State<WorkflowRepository>,
    Json(req): Json<CreateWorkflowRequest>,
) -> (StatusCode, Json<response::ApiResponse<Workflow>>) {
    match repo.create_workflow(req).await {
        Ok(workflow) => (
            StatusCode::CREATED,
            Json(response::ApiResponse {
                success: true,
                data: Some(workflow),
                message: "Workflow created".to_string(),
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

pub async fn get_workflow(
    State(repo): State<WorkflowRepository>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<response::ApiResponse<Workflow>>) {
    match repo.get_workflow(id).await {
        Ok(Some(workflow)) => (
            StatusCode::OK,
            Json(response::ApiResponse {
                success: true,
                data: Some(workflow),
                message: "Success".to_string(),
            }),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(response::ApiResponse {
                success: false,
                data: None,
                message: "Workflow not found".to_string(),
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

pub async fn update_workflow(
    State(repo): State<WorkflowRepository>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWorkflowRequest>,
) -> (StatusCode, Json<response::ApiResponse<Workflow>>) {
    match repo.update_workflow(id, req).await {
        Ok(Some(workflow)) => (
            StatusCode::OK,
            Json(response::ApiResponse {
                success: true,
                data: Some(workflow),
                message: "Workflow updated".to_string(),
            }),
        ),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(response::ApiResponse {
                success: false,
                data: None,
                message: "Workflow not found".to_string(),
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

pub async fn delete_workflow(
    State(repo): State<WorkflowRepository>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<response::ApiResponse<()>>) {
    match repo.delete_workflow(id).await {
        Ok(true) => (
            StatusCode::OK,
            Json(response::ApiResponse {
                success: true,
                data: None,
                message: "Workflow deleted".to_string(),
            }),
        ),
        Ok(false) => (
            StatusCode::NOT_FOUND,
            Json(response::ApiResponse {
                success: false,
                data: None,
                message: "Workflow not found".to_string(),
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

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::response::ApiResponse;
use crate::state::AppState;
use crate::models::*;

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub is_active: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn list_workflows(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> (StatusCode, Json<ApiResponse<Vec<Workflow>>>) {
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);
    match &state.repo {
        crate::state::RepositoryType::Database(repo) => {
            match repo.list_workflows(query.is_active, limit, offset).await {
                Ok(workflows) => (
                    StatusCode::OK,
                    Json(ApiResponse::success(workflows)),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(e.to_string())),
                ),
            }
        }
        crate::state::RepositoryType::Memory(repo) => {
            match repo.list_workflows(query.is_active, limit, offset).await {
                Ok(workflows) => (
                    StatusCode::OK,
                    Json(ApiResponse::success(workflows)),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(e.to_string())),
                ),
            }
        }
    }
}

pub async fn create_workflow(
    State(state): State<AppState>,
    Json(req): Json<CreateWorkflowRequest>,
) -> (StatusCode, Json<ApiResponse<Workflow>>) {
    match &state.repo {
        crate::state::RepositoryType::Database(repo) => {
            match repo.create_workflow(req).await {
                Ok(workflow) => (
                    StatusCode::CREATED,
                    Json(ApiResponse::success_with_message(workflow, "Workflow created successfully".to_string())),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(e.to_string())),
                ),
            }
        }
        crate::state::RepositoryType::Memory(repo) => {
            match repo.create_workflow(req).await {
                Ok(workflow) => (
                    StatusCode::CREATED,
                    Json(ApiResponse::success_with_message(workflow, "Workflow created successfully".to_string())),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(e.to_string())),
                ),
            }
        }
    }
}

pub async fn get_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<Workflow>>) {
    match &state.repo {
        crate::state::RepositoryType::Database(repo) => {
            match repo.get_workflow(id).await {
                Ok(Some(workflow)) => (
                    StatusCode::OK,
                    Json(ApiResponse::success(workflow)),
                ),
                Ok(None) => (
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::error("Workflow not found".to_string())),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(e.to_string())),
                ),
            }
        }
        crate::state::RepositoryType::Memory(repo) => {
            match repo.get_workflow(id).await {
                Ok(Some(workflow)) => (
                    StatusCode::OK,
                    Json(ApiResponse::success(workflow)),
                ),
                Ok(None) => (
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::error("Workflow not found".to_string())),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(e.to_string())),
                ),
            }
        }
    }
}

pub async fn update_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWorkflowRequest>,
) -> (StatusCode, Json<ApiResponse<Workflow>>) {
    match &state.repo {
        crate::state::RepositoryType::Database(repo) => {
            match repo.update_workflow(id, req).await {
                Ok(Some(workflow)) => (
                    StatusCode::OK,
                    Json(ApiResponse::success_with_message(workflow, "Workflow updated successfully".to_string())),
                ),
                Ok(None) => (
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::error("Workflow not found".to_string())),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(e.to_string())),
                ),
            }
        }
        crate::state::RepositoryType::Memory(repo) => {
            match repo.update_workflow(id, req).await {
                Ok(Some(workflow)) => (
                    StatusCode::OK,
                    Json(ApiResponse::success_with_message(workflow, "Workflow updated successfully".to_string())),
                ),
                Ok(None) => (
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::error("Workflow not found".to_string())),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(e.to_string())),
                ),
            }
        }
    }
}

pub async fn delete_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<()>>) {
    match &state.repo {
        crate::state::RepositoryType::Database(repo) => {
            match repo.delete_workflow(id).await {
                Ok(true) => (
                    StatusCode::OK,
                    Json(ApiResponse::ok_with_message("Workflow deleted successfully".to_string())),
                ),
                Ok(false) => (
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::error("Workflow not found".to_string())),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(e.to_string())),
                ),
            }
        }
        crate::state::RepositoryType::Memory(repo) => {
            match repo.delete_workflow(id).await {
                Ok(true) => (
                    StatusCode::OK,
                    Json(ApiResponse::ok_with_message("Workflow deleted successfully".to_string())),
                ),
                Ok(false) => (
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::error("Workflow not found".to_string())),
                ),
                Err(e) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(e.to_string())),
                ),
            }
        }
    }
}

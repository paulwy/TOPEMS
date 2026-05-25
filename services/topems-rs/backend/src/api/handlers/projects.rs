use crate::api::response::ApiResponse;
use crate::db::repository::RsRepository;
use crate::models::*;
use axum::extract::{Path, State};
use axum::Json;
use uuid::Uuid;

pub async fn create_project(
    State(repo): State<RsRepository>,
    Json(req): Json<CreateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    match repo.create_project(req).await {
        Ok(project) => Json(ApiResponse::success(project, "Project created successfully".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to create project: {}", e))),
    }
}

pub async fn get_project(
    State(repo): State<RsRepository>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Project>> {
    match repo.get_project(id).await {
        Ok(Some(project)) => Json(ApiResponse::success(project, "Project found".to_string())),
        Ok(None) => Json(ApiResponse::error("Project not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to get project: {}", e))),
    }
}

pub async fn list_projects(
    State(repo): State<RsRepository>,
) -> Json<ApiResponse<Vec<Project>>> {
    // TODO: add query params for limit and offset
    match repo.list_projects(100, 0).await {
        Ok(projects) => Json(ApiResponse::success(projects, "Projects retrieved successfully".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to list projects: {}", e))),
    }
}

pub async fn update_project(
    State(repo): State<RsRepository>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    match repo.update_project(id, req).await {
        Ok(Some(project)) => Json(ApiResponse::success(project, "Project updated successfully".to_string())),
        Ok(None) => Json(ApiResponse::error("Project not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to update project: {}", e))),
    }
}

pub async fn delete_project(
    State(repo): State<RsRepository>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match repo.delete_project(id).await {
        Ok(true) => Json(ApiResponse::success(true, "Project deleted successfully".to_string())),
        Ok(false) => Json(ApiResponse::error("Project not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to delete project: {}", e))),
    }
}

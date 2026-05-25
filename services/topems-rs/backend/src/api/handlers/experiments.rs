use crate::api::response::ApiResponse;
use crate::db::repository::RsRepository;
use crate::models::*;
use axum::extract::{Path, State};
use axum::Json;
use uuid::Uuid;

pub async fn create_experiment(
    State(repo): State<RsRepository>,
    Json(req): Json<CreateExperimentRequest>,
) -> Json<ApiResponse<Experiment>> {
    match repo.create_experiment(req).await {
        Ok(experiment) => Json(ApiResponse::success(experiment, "Experiment created successfully".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to create experiment: {}", e))),
    }
}

pub async fn get_experiment(
    State(repo): State<RsRepository>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Experiment>> {
    match repo.get_experiment(id).await {
        Ok(Some(experiment)) => Json(ApiResponse::success(experiment, "Experiment found".to_string())),
        Ok(None) => Json(ApiResponse::error("Experiment not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to get experiment: {}", e))),
    }
}

pub async fn list_experiments(
    State(repo): State<RsRepository>,
) -> Json<ApiResponse<Vec<Experiment>>> {
    // TODO: add query params for project_id, limit, offset
    match repo.list_experiments(None, 100, 0).await {
        Ok(experiments) => Json(ApiResponse::success(experiments, "Experiments retrieved successfully".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to list experiments: {}", e))),
    }
}

pub async fn update_experiment(
    State(repo): State<RsRepository>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateExperimentRequest>,
) -> Json<ApiResponse<Experiment>> {
    match repo.update_experiment(id, req).await {
        Ok(Some(experiment)) => Json(ApiResponse::success(experiment, "Experiment updated successfully".to_string())),
        Ok(None) => Json(ApiResponse::error("Experiment not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to update experiment: {}", e))),
    }
}

pub async fn delete_experiment(
    State(repo): State<RsRepository>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match repo.delete_experiment(id).await {
        Ok(true) => Json(ApiResponse::success(true, "Experiment deleted successfully".to_string())),
        Ok(false) => Json(ApiResponse::error("Experiment not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to delete experiment: {}", e))),
    }
}

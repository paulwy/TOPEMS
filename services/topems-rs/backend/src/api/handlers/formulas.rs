use crate::api::response::ApiResponse;
use crate::db::repository::RsRepository;
use crate::models::*;
use axum::extract::{Path, State};
use axum::Json;
use uuid::Uuid;

pub async fn create_formula(
    State(repo): State<RsRepository>,
    Json(req): Json<CreateFormulaRequest>,
) -> Json<ApiResponse<Formula>> {
    match repo.create_formula(req).await {
        Ok(formula) => Json(ApiResponse::success(formula, "Formula created successfully".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to create formula: {}", e))),
    }
}

pub async fn get_formula(
    State(repo): State<RsRepository>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Formula>> {
    match repo.get_formula(id).await {
        Ok(Some(formula)) => Json(ApiResponse::success(formula, "Formula found".to_string())),
        Ok(None) => Json(ApiResponse::error("Formula not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to get formula: {}", e))),
    }
}

pub async fn list_formulas(
    State(repo): State<RsRepository>,
) -> Json<ApiResponse<Vec<Formula>>> {
    // TODO: add query params for project_id, limit, offset
    match repo.list_formulas(None, 100, 0).await {
        Ok(formulas) => Json(ApiResponse::success(formulas, "Formulas retrieved successfully".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to list formulas: {}", e))),
    }
}

pub async fn update_formula(
    State(repo): State<RsRepository>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateFormulaRequest>,
) -> Json<ApiResponse<Formula>> {
    match repo.update_formula(id, req).await {
        Ok(Some(formula)) => Json(ApiResponse::success(formula, "Formula updated successfully".to_string())),
        Ok(None) => Json(ApiResponse::error("Formula not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to update formula: {}", e))),
    }
}

pub async fn delete_formula(
    State(repo): State<RsRepository>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match repo.delete_formula(id).await {
        Ok(true) => Json(ApiResponse::success(true, "Formula deleted successfully".to_string())),
        Ok(false) => Json(ApiResponse::error("Formula not found".to_string())),
        Err(e) => Json(ApiResponse::error(format!("Failed to delete formula: {}", e))),
    }
}

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    db::repository::{
        ArchiveCategoryRepository, ArchiveRepository, ArchiveRepositoryError,
    },
    models::{
        Archive, ArchiveCategory, ArchiveCategoryResponse, ArchiveResponse,
        CreateArchiveCategoryRequest, CreateArchiveRequest, ListArchivesQuery,
        ListArchivesResponse, UpdateArchiveCategoryRequest, UpdateArchiveRequest,
    },
    api::response::{ApiResponse, ApiError},
};

#[derive(Clone)]
pub struct ArchiveState {
    pub archive_repo: ArchiveRepository,
    pub category_repo: ArchiveCategoryRepository,
}

pub async fn create_archive_category(
    State(state): State<ArchiveState>,
    Json(req): Json<CreateArchiveCategoryRequest>,
) -> Result<Json<ApiResponse<ArchiveCategory>>, ApiError> {
    tracing::debug!("Creating archive category: {:?}", req);
    
    let category = state
        .category_repo
        .create(req, "admin".to_string())
        .await
        .map_err(|e| {
            tracing::error!("Error creating archive category: {:?}", e);
            ApiError::InternalError
        })?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(category),
        error: None,
    }))
}

pub async fn list_archive_categories(
    State(state): State<ArchiveState>,
) -> Result<Json<ApiResponse<Vec<ArchiveCategoryResponse>>>, ApiError> {
    tracing::debug!("Listing archive categories");
    
    let categories = state
        .category_repo
        .list_tree()
        .await
        .map_err(|e| {
            tracing::error!("Error listing archive categories: {:?}", e);
            ApiError::InternalError
        })?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(categories),
        error: None,
    }))
}

pub async fn get_archive_category(
    State(state): State<ArchiveState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<ArchiveCategory>>, ApiError> {
    tracing::debug!("Getting archive category: {}", id);
    
    let category = state
        .category_repo
        .find_by_id(id)
        .await
        .map_err(|e| {
            tracing::error!("Error getting archive category: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(category),
        error: None,
    }))
}

pub async fn update_archive_category(
    State(state): State<ArchiveState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateArchiveCategoryRequest>,
) -> Result<Json<ApiResponse<ArchiveCategory>>, ApiError> {
    tracing::debug!("Updating archive category: {}", id);
    
    let category = state
        .category_repo
        .update(id, req)
        .await
        .map_err(|e| {
            tracing::error!("Error updating archive category: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(category),
        error: None,
    }))
}

pub async fn delete_archive_category(
    State(state): State<ArchiveState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, ApiError> {
    tracing::debug!("Deleting archive category: {}", id);
    
    let deleted = state
        .category_repo
        .delete(id)
        .await
        .map_err(|e| {
            tracing::error!("Error deleting archive category: {:?}", e);
            ApiError::InternalError
        })?;

    if !deleted {
        return Err(ApiError::NotFound);
    }

    Ok(Json(ApiResponse {
        success: true,
        data: Some(()),
        error: None,
    }))
}

pub async fn create_archive(
    State(state): State<ArchiveState>,
    Json(req): Json<CreateArchiveRequest>,
) -> Result<Json<ApiResponse<Archive>>, ApiError> {
    tracing::debug!("Creating archive: {:?}", req);
    
    // Verify category exists
    let category = state
        .category_repo
        .find_by_id(req.category_id)
        .await
        .map_err(|e| {
            tracing::error!("Error checking category: {:?}", e);
            ApiError::InternalError
        })?;

    if category.is_none() {
        return Err(ApiError::BadRequest("Invalid category ID".to_string()));
    }

    let archive = state
        .archive_repo
        .create(req, "admin".to_string())
        .await
        .map_err(|e| {
            tracing::error!("Error creating archive: {:?}", e);
            ApiError::InternalError
        })?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(archive),
        error: None,
    }))
}

pub async fn list_archives(
    State(state): State<ArchiveState>,
    Query(query): Query<ListArchivesQuery>,
) -> Result<Json<ApiResponse<ListArchivesResponse>>, ApiError> {
    tracing::debug!("Listing archives with query: {:?}", query);
    
    let (archives, total) = state
        .archive_repo
        .list(query.clone())
        .await
        .map_err(|e| {
            tracing::error!("Error listing archives: {:?}", e);
            ApiError::InternalError
        })?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(ListArchivesResponse {
            items: archives,
            total,
            page: query.page.unwrap_or(1),
            page_size: query.page_size.unwrap_or(20),
        }),
        error: None,
    }))
}

pub async fn get_archive(
    State(state): State<ArchiveState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<ArchiveResponse>>, ApiError> {
    tracing::debug!("Getting archive: {}", id);
    
    let archive = state
        .archive_repo
        .find_by_id(id)
        .await
        .map_err(|e| {
            tracing::error!("Error getting archive: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(archive),
        error: None,
    }))
}

pub async fn update_archive(
    State(state): State<ArchiveState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateArchiveRequest>,
) -> Result<Json<ApiResponse<Archive>>, ApiError> {
    tracing::debug!("Updating archive: {}", id);
    
    let archive = state
        .archive_repo
        .update(id, req)
        .await
        .map_err(|e| {
            tracing::error!("Error updating archive: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(archive),
        error: None,
    }))
}

pub async fn archive_archive(
    State(state): State<ArchiveState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Archive>>, ApiError> {
    tracing::debug!("Archiving archive: {}", id);
    
    let archive = state
        .archive_repo
        .archive(id, "admin".to_string())
        .await
        .map_err(|e| {
            tracing::error!("Error archiving: {:?}", e);
            ApiError::InternalError
        })?
        .ok_or(ApiError::NotFound)?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(archive),
        error: None,
    }))
}

pub async fn delete_archive(
    State(state): State<ArchiveState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, ApiError> {
    tracing::debug!("Deleting archive: {}", id);
    
    let deleted = state
        .archive_repo
        .delete(id)
        .await
        .map_err(|e| {
            tracing::error!("Error deleting archive: {:?}", e);
            ApiError::InternalError
        })?;

    if !deleted {
        return Err(ApiError::NotFound);
    }

    Ok(Json(ApiResponse {
        success: true,
        data: Some(()),
        error: None,
    }))
}

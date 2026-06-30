use std::sync::Arc;

use axum::{
    extract::{Path, State},
    Extension, Json, Router,
};
use uuid::Uuid;

use crate::models::*;
use crate::services::{DocumentService, FolderService, TemplateService};
use crate::AppState;
use topems_shared::{ApiResponse, Claims};

async fn list_documents(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<Document>>> {
    let service = DocumentService::new(Arc::new(state.pool.clone()));
    match service.list_documents().await {
        Ok(documents) => Json(ApiResponse::success(documents, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_document(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
) -> Json<ApiResponse<Option<Document>>> {
    let service = DocumentService::new(Arc::new(state.pool.clone()));
    match service.get_document(document_id).await {
        Ok(document) => Json(ApiResponse::success(document, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDocumentRequest>,
) -> Json<ApiResponse<Document>> {
    let service = DocumentService::new(Arc::new(state.pool.clone()));
    let created_by = claims.username.clone();
    match service.create_document(req, &created_by).await {
        Ok(document) => Json(ApiResponse::success(document, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn update_document(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
    Json(req): Json<UpdateDocumentRequest>,
) -> Json<ApiResponse<Option<Document>>> {
    let service = DocumentService::new(Arc::new(state.pool.clone()));
    match service.update_document(document_id, req).await {
        Ok(document) => Json(ApiResponse::success(document, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn delete_document(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let service = DocumentService::new(Arc::new(state.pool.clone()));
    match service.delete_document(document_id).await {
        Ok(deleted) => Json(ApiResponse::success(deleted, "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// Template handlers
async fn list_templates(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<Template>>> {
    let service = TemplateService::new(Arc::new(state.pool.clone()));
    match service.list_templates().await {
        Ok(templates) => Json(ApiResponse::success(templates, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_template(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<Option<Template>>> {
    let service = TemplateService::new(Arc::new(state.pool.clone()));
    match service.get_template(template_id).await {
        Ok(template) => Json(ApiResponse::success(template, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<ApiResponse<Template>> {
    let service = TemplateService::new(Arc::new(state.pool.clone()));
    let created_by = Uuid::parse_str(&claims.sub).unwrap_or_else(|_| Uuid::nil());
    match service.create_template(req, created_by).await {
        Ok(template) => Json(ApiResponse::success(template, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn update_template(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Json<ApiResponse<Option<Template>>> {
    let service = TemplateService::new(Arc::new(state.pool.clone()));
    match service.update_template(template_id, req).await {
        Ok(template) => Json(ApiResponse::success(template, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn delete_template(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let service = TemplateService::new(Arc::new(state.pool.clone()));
    match service.delete_template(template_id).await {
        Ok(deleted) => Json(ApiResponse::success(deleted, "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// Folder handlers
async fn list_folders(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<Folder>>> {
    let service = FolderService::new(Arc::new(state.pool.clone()));
    match service.list_folders().await {
        Ok(folders) => Json(ApiResponse::success(folders, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_folder(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(folder_id): Path<Uuid>,
) -> Json<ApiResponse<Option<Folder>>> {
    let service = FolderService::new(Arc::new(state.pool.clone()));
    match service.get_folder(folder_id).await {
        Ok(folder) => Json(ApiResponse::success(folder, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_folder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateFolderRequest>,
) -> Json<ApiResponse<Folder>> {
    let service = FolderService::new(Arc::new(state.pool.clone()));
    let owner_id = Uuid::parse_str(&claims.sub).unwrap_or_else(|_| Uuid::nil());
    match service.create_folder(req, owner_id).await {
        Ok(folder) => Json(ApiResponse::success(folder, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn update_folder(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(folder_id): Path<Uuid>,
    Json(req): Json<UpdateFolderRequest>,
) -> Json<ApiResponse<Option<Folder>>> {
    let service = FolderService::new(Arc::new(state.pool.clone()));
    match service.update_folder(folder_id, req).await {
        Ok(folder) => Json(ApiResponse::success(folder, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn delete_folder(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(folder_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let service = FolderService::new(Arc::new(state.pool.clone()));
    match service.delete_folder(folder_id).await {
        Ok(deleted) => Json(ApiResponse::success(deleted, "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/documents", axum::routing::get(list_documents))
        .route("/documents", axum::routing::post(create_document))
        .route("/documents/{document_id}", axum::routing::get(get_document))
        .route(
            "/documents/{document_id}",
            axum::routing::put(update_document),
        )
        .route(
            "/documents/{document_id}",
            axum::routing::delete(delete_document),
        )
        .route("/templates", axum::routing::get(list_templates))
        .route("/templates", axum::routing::post(create_template))
        .route("/templates/{template_id}", axum::routing::get(get_template))
        .route(
            "/templates/{template_id}",
            axum::routing::put(update_template),
        )
        .route(
            "/templates/{template_id}",
            axum::routing::delete(delete_template),
        )
        .route("/folders", axum::routing::get(list_folders))
        .route("/folders", axum::routing::post(create_folder))
        .route("/folders/{folder_id}", axum::routing::get(get_folder))
        .route("/folders/{folder_id}", axum::routing::put(update_folder))
        .route("/folders/{folder_id}", axum::routing::delete(delete_folder))
}

pub mod doc_plugin;

use axum::{
    extract::{Path, State},
    Extension, Json, Router,
};
use uuid::Uuid;

use crate::models::*;
use crate::services::{DocumentService, FolderService, TemplateService};
use crate::shared::AppState;
use topems_shared::{ApiResponse, Claims};

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::new_v4)
}

async fn list_documents(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<Document>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = DocumentService::new(state.pool.clone());
    match service.list_documents(tenant_id).await {
        Ok(documents) => Json(ApiResponse::success(documents, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
) -> Json<ApiResponse<Option<Document>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = DocumentService::new(state.pool.clone());
    match service.get_document(tenant_id, document_id).await {
        Ok(document) => Json(ApiResponse::success(document, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDocumentRequest>,
) -> Json<ApiResponse<Document>> {
    let tenant_id = get_tenant_id(&claims);
    let service = DocumentService::new(state.pool.clone());
    let created_by = claims.username.clone();
    match service.create_document(tenant_id, req, &created_by).await {
        Ok(document) => Json(ApiResponse::success(document, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn update_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
    Json(req): Json<UpdateDocumentRequest>,
) -> Json<ApiResponse<Option<Document>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = DocumentService::new(state.pool.clone());
    match service.update_document(tenant_id, document_id, req).await {
        Ok(document) => Json(ApiResponse::success(document, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn delete_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims);
    let service = DocumentService::new(state.pool.clone());
    match service.delete_document(tenant_id, document_id).await {
        Ok(deleted) => Json(ApiResponse::success(deleted, "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn list_templates(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<Template>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = TemplateService::new(state.pool.clone());
    match service.list_templates(tenant_id).await {
        Ok(templates) => Json(ApiResponse::success(templates, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<Option<Template>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = TemplateService::new(state.pool.clone());
    match service.get_template(tenant_id, template_id).await {
        Ok(template) => Json(ApiResponse::success(template, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<ApiResponse<Template>> {
    let tenant_id = get_tenant_id(&claims);
    let service = TemplateService::new(state.pool.clone());
    let created_by = claims.username.clone();
    match service.create_template(tenant_id, req, &created_by).await {
        Ok(template) => Json(ApiResponse::success(template, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn update_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Json<ApiResponse<Option<Template>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = TemplateService::new(state.pool.clone());
    match service.update_template(tenant_id, template_id, req).await {
        Ok(template) => Json(ApiResponse::success(template, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn delete_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims);
    let service = TemplateService::new(state.pool.clone());
    match service.delete_template(tenant_id, template_id).await {
        Ok(deleted) => Json(ApiResponse::success(deleted, "删除成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn list_folders(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<Folder>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = FolderService::new(state.pool.clone());
    match service.list_folders(tenant_id).await {
        Ok(folders) => Json(ApiResponse::success(folders, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn get_folder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(folder_id): Path<Uuid>,
) -> Json<ApiResponse<Option<Folder>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = FolderService::new(state.pool.clone());
    match service.get_folder(tenant_id, folder_id).await {
        Ok(folder) => Json(ApiResponse::success(folder, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn create_folder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateFolderRequest>,
) -> Json<ApiResponse<Folder>> {
    let tenant_id = get_tenant_id(&claims);
    let service = FolderService::new(state.pool.clone());
    let created_by = claims.username.clone();
    match service.create_folder(tenant_id, req, &created_by).await {
        Ok(folder) => Json(ApiResponse::success(folder, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn update_folder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(folder_id): Path<Uuid>,
    Json(req): Json<UpdateFolderRequest>,
) -> Json<ApiResponse<Option<Folder>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = FolderService::new(state.pool.clone());
    match service.update_folder(tenant_id, folder_id, req).await {
        Ok(folder) => Json(ApiResponse::success(folder, "更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

async fn delete_folder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(folder_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims);
    let service = FolderService::new(state.pool.clone());
    match service.delete_folder(tenant_id, folder_id).await {
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

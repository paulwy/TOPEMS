use axum::{
    extract::{Path, State},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::models::*;
use super::services::{DocumentService, FolderService, TemplateService};
use crate::AppState;
use topems_shared::{ApiResponse, Claims};

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::new_v4)
}

async fn count_table_with_tenant(pool: &sqlx::PgPool, table: &str, tenant_id: Uuid) -> i64 {
    match sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {} WHERE tenant_id = $1",
        table
    ))
    .bind(tenant_id)
    .fetch_one(pool)
    .await
    {
        Ok(v) => v,
        Err(_) => 0,
    }
}

async fn count_table_with_tenant_and_status(
    pool: &sqlx::PgPool,
    table: &str,
    tenant_id: Uuid,
    status: &str,
) -> i64 {
    match sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {} WHERE tenant_id = $1 AND status = $2",
        table
    ))
    .bind(tenant_id)
    .bind(status)
    .fetch_one(pool)
    .await
    {
        Ok(v) => v,
        Err(_) => 0,
    }
}

async fn count_table_with_tenant_and_enabled(
    pool: &sqlx::PgPool,
    table: &str,
    tenant_id: Uuid,
    is_enabled: bool,
) -> i64 {
    match sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {} WHERE tenant_id = $1 AND is_enabled = $2",
        table
    ))
    .bind(tenant_id)
    .bind(is_enabled)
    .fetch_one(pool)
    .await
    {
        Ok(v) => v,
        Err(_) => 0,
    }
}

async fn count_table_with_tenant_and_condition(
    pool: &sqlx::PgPool,
    table: &str,
    tenant_id: Uuid,
    condition: &str,
) -> i64 {
    match sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {} WHERE tenant_id = $1 AND {}",
        table, condition
    ))
    .bind(tenant_id)
    .fetch_one(pool)
    .await
    {
        Ok(v) => v,
        Err(_) => 0,
    }
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

async fn list_template_categories(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<String>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = TemplateService::new(state.pool.clone());
    match service.list_categories(tenant_id).await {
        Ok(categories) => Json(ApiResponse::success(categories, "查询成功")),
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocDashboardStats {
    pub total_documents: i64,
    pub published_documents: i64,
    pub draft_documents: i64,
    pub archived_documents: i64,
    pub total_folders: i64,
    pub total_templates: i64,
    pub active_templates: i64,
    pub this_month_created: i64,
    pub this_month_updated: i64,
}

async fn get_dashboard_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<DocDashboardStats>> {
    let tenant_id = get_tenant_id(&claims);

    let total_documents = count_table_with_tenant(&state.pool, "core_doc_documents", tenant_id).await;
    let published_documents =
        count_table_with_tenant_and_status(&state.pool, "core_doc_documents", tenant_id, "published").await;
    let draft_documents =
        count_table_with_tenant_and_status(&state.pool, "core_doc_documents", tenant_id, "draft").await;
    let archived_documents = count_table_with_tenant_and_condition(
        &state.pool,
        "core_doc_documents",
        tenant_id,
        "archived_at IS NOT NULL",
    )
    .await;

    let total_folders = count_table_with_tenant(&state.pool, "core_doc_folders", tenant_id).await;
    let total_templates = count_table_with_tenant(&state.pool, "core_doc_templates", tenant_id).await;
    let active_templates =
        count_table_with_tenant_and_enabled(&state.pool, "core_doc_templates", tenant_id, true).await;

    let this_month_created = count_table_with_tenant_and_condition(
        &state.pool,
        "core_doc_documents",
        tenant_id,
        "DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())",
    )
    .await;
    let this_month_updated = count_table_with_tenant_and_condition(
        &state.pool,
        "core_doc_documents",
        tenant_id,
        "DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())",
    )
    .await;

    let stats = DocDashboardStats {
        total_documents,
        published_documents,
        draft_documents,
        archived_documents,
        total_folders,
        total_templates,
        active_templates,
        this_month_created,
        this_month_updated,
    };

    Json(ApiResponse::success(stats, "查询成功"))
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/dashboard", axum::routing::get(get_dashboard_handler))
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
        .route(
            "/templates/categories",
            axum::routing::get(list_template_categories),
        )
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

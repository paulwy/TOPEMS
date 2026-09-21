use axum::{
    extract::{Path, State},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::models::*;
use super::services::{DocumentService, FolderService, TemplateService};
use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::{response::ApiResponse, TopemsError};

async fn count_table_with_tenant(pool: &sqlx::PgPool, table: &str, tenant_id: Uuid) -> i64 {
    match sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {} WHERE ($1::uuid IS NULL OR tenant_id = $1)",
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
        "SELECT COUNT(*) FROM {} WHERE ($1::uuid IS NULL OR tenant_id = $1) AND status = $2",
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
        "SELECT COUNT(*) FROM {} WHERE ($1::uuid IS NULL OR tenant_id = $1) AND is_enabled = $2",
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
        "SELECT COUNT(*) FROM {} WHERE ($1::uuid IS NULL OR tenant_id = $1) AND {}",
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:doc:read"])),
    path = "/api/core/doc/documents",
    tag = "Doc",
    responses(
        (status = 200, description = "查询成功"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_documents(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<Document>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = DocumentService::new(state.pool.clone());
    match service.list_documents(tenant_id).await {
        Ok(documents) => Json(ApiResponse::success(documents, "查询成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "list_documents",
            e,
        ))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:doc:read"])),
    path = "/api/core/doc/documents/{document_id}",
    tag = "Doc",
    params(
        ("document_id" = Uuid, Path, description = "文档ID"),
    ),
    responses(
        (status = 200, description = "查询成功"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn get_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
) -> Json<ApiResponse<Option<Document>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = DocumentService::new(state.pool.clone());
    match service.get_document(tenant_id, document_id).await {
        Ok(document) => Json(ApiResponse::success(document, "查询成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("get_document", e))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:doc:write"])),
    path = "/api/core/doc/documents",
    tag = "Doc",
    request_body = serde_json::Value,
    responses(
        (status = 201, description = "创建成功"),
        (status = 500, description = "创建失败"),
    ),
)]
pub async fn create_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDocumentRequest>,
) -> Json<ApiResponse<Document>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = DocumentService::new(state.pool.clone());
    let created_by = claims.username.clone();
    match service.create_document(tenant_id, req, &created_by).await {
        Ok(document) => Json(ApiResponse::success(document, "创建成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "create_document",
            e,
        ))),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["unified-core:doc:write"])),
    path = "/api/core/doc/documents/{document_id}",
    tag = "Doc",
    params(
        ("document_id" = Uuid, Path, description = "文档ID"),
    ),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "更新成功"),
        (status = 500, description = "更新失败"),
    ),
)]
pub async fn update_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
    Json(req): Json<UpdateDocumentRequest>,
) -> Json<ApiResponse<Option<Document>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = DocumentService::new(state.pool.clone());
    match service.update_document(tenant_id, document_id, req).await {
        Ok(document) => Json(ApiResponse::success(document, "更新成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "update_document",
            e,
        ))),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["unified-core:doc:admin"])),
    path = "/api/core/doc/documents/{document_id}",
    tag = "Doc",
    params(
        ("document_id" = Uuid, Path, description = "文档ID"),
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 500, description = "删除失败"),
    ),
)]
pub async fn delete_document(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = DocumentService::new(state.pool.clone());
    match service.delete_document(tenant_id, document_id).await {
        Ok(deleted) => Json(ApiResponse::success(deleted, "删除成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "delete_document",
            e,
        ))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:flow:template:read"])),
    path = "/api/core/doc/templates",
    tag = "Doc",
    responses(
        (status = 200, description = "查询成功"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_templates(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<Template>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = TemplateService::new(state.pool.clone());
    match service.list_templates(tenant_id).await {
        Ok(templates) => Json(ApiResponse::success(templates, "查询成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "list_templates",
            e,
        ))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:doc:category:read"])),
    path = "/api/core/doc/templates/categories",
    tag = "Doc",
    responses(
        (status = 200, description = "查询成功"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_template_categories(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<String>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = TemplateService::new(state.pool.clone());
    match service.list_categories(tenant_id).await {
        Ok(categories) => Json(ApiResponse::success(categories, "查询成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "list_template_categories",
            e,
        ))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:doc:template:read"])),
    path = "/api/core/doc/templates/{template_id}",
    tag = "Doc",
    params(
        ("template_id" = Uuid, Path, description = "模板ID"),
    ),
    responses(
        (status = 200, description = "查询成功"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn get_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<Option<Template>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = TemplateService::new(state.pool.clone());
    match service.get_template(tenant_id, template_id).await {
        Ok(template) => Json(ApiResponse::success(template, "查询成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("get_template", e))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:doc:template:write"])),
    path = "/api/core/doc/templates",
    tag = "Doc",
    request_body = serde_json::Value,
    responses(
        (status = 201, description = "创建成功"),
        (status = 500, description = "创建失败"),
    ),
)]
pub async fn create_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<ApiResponse<Template>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = TemplateService::new(state.pool.clone());
    let created_by = claims.username.clone();
    match service.create_template(tenant_id, req, &created_by).await {
        Ok(template) => Json(ApiResponse::success(template, "创建成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "create_template",
            e,
        ))),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["unified-core:doc:template:write"])),
    path = "/api/core/doc/templates/{template_id}",
    tag = "Doc",
    params(
        ("template_id" = Uuid, Path, description = "模板ID"),
    ),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "更新成功"),
        (status = 500, description = "更新失败"),
    ),
)]
pub async fn update_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Json<ApiResponse<Option<Template>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = TemplateService::new(state.pool.clone());
    match service.update_template(tenant_id, template_id, req).await {
        Ok(template) => Json(ApiResponse::success(template, "更新成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "update_template",
            e,
        ))),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["unified-core:doc:template:admin"])),
    path = "/api/core/doc/templates/{template_id}",
    tag = "Doc",
    params(
        ("template_id" = Uuid, Path, description = "模板ID"),
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 500, description = "删除失败"),
    ),
)]
pub async fn delete_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = TemplateService::new(state.pool.clone());
    match service.delete_template(tenant_id, template_id).await {
        Ok(deleted) => Json(ApiResponse::success(deleted, "删除成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "delete_template",
            e,
        ))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:doc:folder:read"])),
    path = "/api/core/doc/folders",
    tag = "Doc",
    responses(
        (status = 200, description = "查询成功"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_folders(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<Folder>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = FolderService::new(state.pool.clone());
    match service.list_folders(tenant_id).await {
        Ok(folders) => Json(ApiResponse::success(folders, "查询成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("list_folders", e))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:doc:folder:read"])),
    path = "/api/core/doc/folders/{folder_id}",
    tag = "Doc",
    params(
        ("folder_id" = Uuid, Path, description = "文件夹ID"),
    ),
    responses(
        (status = 200, description = "查询成功"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn get_folder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(folder_id): Path<Uuid>,
) -> Json<ApiResponse<Option<Folder>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = FolderService::new(state.pool.clone());
    match service.get_folder(tenant_id, folder_id).await {
        Ok(folder) => Json(ApiResponse::success(folder, "查询成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("get_folder", e))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:doc:folder:write"])),
    path = "/api/core/doc/folders",
    tag = "Doc",
    request_body = serde_json::Value,
    responses(
        (status = 201, description = "创建成功"),
        (status = 500, description = "创建失败"),
    ),
)]
pub async fn create_folder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateFolderRequest>,
) -> Json<ApiResponse<Folder>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = FolderService::new(state.pool.clone());
    let created_by = claims.username.clone();
    match service.create_folder(tenant_id, req, &created_by).await {
        Ok(folder) => Json(ApiResponse::success(folder, "创建成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("create_folder", e))),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["unified-core:doc:folder:write"])),
    path = "/api/core/doc/folders/{folder_id}",
    tag = "Doc",
    params(
        ("folder_id" = Uuid, Path, description = "文件夹ID"),
    ),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "更新成功"),
        (status = 500, description = "更新失败"),
    ),
)]
pub async fn update_folder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(folder_id): Path<Uuid>,
    Json(req): Json<UpdateFolderRequest>,
) -> Json<ApiResponse<Option<Folder>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = FolderService::new(state.pool.clone());
    match service.update_folder(tenant_id, folder_id, req).await {
        Ok(folder) => Json(ApiResponse::success(folder, "更新成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("update_folder", e))),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["unified-core:doc:folder:admin"])),
    path = "/api/core/doc/folders/{folder_id}",
    tag = "Doc",
    params(
        ("folder_id" = Uuid, Path, description = "文件夹ID"),
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 500, description = "删除失败"),
    ),
)]
pub async fn delete_folder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(folder_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = FolderService::new(state.pool.clone());
    match service.delete_folder(tenant_id, folder_id).await {
        Ok(deleted) => Json(ApiResponse::success(deleted, "删除成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("delete_folder", e))),
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified_core:read"])),
    path = "/api/core/doc/dashboard",
    tag = "Doc",
    responses(
        (status = 200, description = "查询成功"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn get_dashboard_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<DocDashboardStats>> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    let total_documents =
        count_table_with_tenant(&state.pool, "core_doc_documents", tenant_id).await;
    let published_documents = count_table_with_tenant_and_status(
        &state.pool,
        "core_doc_documents",
        tenant_id,
        "published",
    )
    .await;
    let draft_documents =
        count_table_with_tenant_and_status(&state.pool, "core_doc_documents", tenant_id, "draft")
            .await;
    let archived_documents = count_table_with_tenant_and_condition(
        &state.pool,
        "core_doc_documents",
        tenant_id,
        "archived_at IS NOT NULL",
    )
    .await;

    let total_folders = count_table_with_tenant(&state.pool, "core_doc_folders", tenant_id).await;
    let total_templates =
        count_table_with_tenant(&state.pool, "core_doc_templates", tenant_id).await;
    let active_templates =
        count_table_with_tenant_and_enabled(&state.pool, "core_doc_templates", tenant_id, true)
            .await;

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
        .route(
            "/documents/{document_id}/versions",
            axum::routing::get(list_document_versions),
        )
        .route(
            "/documents/{document_id}/versions/{version}",
            axum::routing::get(get_document_version),
        )
        .route(
            "/documents/{document_id}/versions/{version}/restore",
            axum::routing::post(restore_document_version),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:doc:read"])),
    path = "/api/core/doc/documents/{document_id}/versions",
    tag = "Doc",
    params(
        ("document_id" = Uuid, Path, description = "文档ID"),
    ),
    responses(
        (status = 200, description = "版本列表", body = ApiResponse<Vec<DocumentVersion>>),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_document_versions(
    State(state): State<AppState>,
    Path(document_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<DocumentVersion>>> {
    let versions = sqlx::query_as::<_, DocumentVersion>(
        "SELECT id, document_id, version, content, summary, created_by, created_at
         FROM core_doc_document_versions
         WHERE document_id = $1
         ORDER BY version DESC",
    )
    .bind(document_id)
    .fetch_all(&state.pool)
    .await;

    match versions {
        Ok(v) => Json(ApiResponse::success(v, "查询成功")),
        Err(e) => {
            tracing::error!("查询文档版本失败: {}", e);
            Json(ApiResponse::error(500, "查询文档版本失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:doc:read"])),
    path = "/api/core/doc/documents/{document_id}/versions/{version}",
    tag = "Doc",
    params(
        ("document_id" = Uuid, Path, description = "文档ID"),
        ("version" = i32, Path, description = "版本号"),
    ),
    responses(
        (status = 200, description = "版本详情", body = ApiResponse<DocumentVersion>),
        (status = 404, description = "版本不存在"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn get_document_version(
    State(state): State<AppState>,
    Path((document_id, version)): Path<(Uuid, i32)>,
) -> Json<ApiResponse<DocumentVersion>> {
    let ver = sqlx::query_as::<_, DocumentVersion>(
        "SELECT id, document_id, version, content, summary, created_by, created_at
         FROM core_doc_document_versions
         WHERE document_id = $1 AND version = $2",
    )
    .bind(document_id)
    .bind(version)
    .fetch_one(&state.pool)
    .await;

    match ver {
        Ok(v) => Json(ApiResponse::success(v, "查询成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(ApiResponse::error(404, "文档版本不存在"));
            }
            tracing::error!("查询文档版本失败: {}", e);
            Json(ApiResponse::error(500, "查询文档版本失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:doc:write"])),
    path = "/api/core/doc/documents/{document_id}/versions/{version}/restore",
    tag = "Doc",
    params(
        ("document_id" = Uuid, Path, description = "文档ID"),
        ("version" = i32, Path, description = "版本号"),
    ),
    responses(
        (status = 200, description = "恢复成功", body = ApiResponse<Document>),
        (status = 404, description = "版本不存在"),
        (status = 500, description = "恢复失败"),
    ),
)]
pub async fn restore_document_version(
    State(state): State<AppState>,
    Path((document_id, version)): Path<(Uuid, i32)>,
) -> Json<ApiResponse<Document>> {
    let content = sqlx::query_scalar::<_, String>(
        "SELECT content FROM core_doc_document_versions WHERE document_id = $1 AND version = $2",
    )
    .bind(document_id)
    .bind(version)
    .fetch_optional(&state.pool)
    .await;

    let content = match content {
        Ok(Some(c)) => c,
        Ok(None) => return Json(ApiResponse::error(404, "文档版本不存在")),
        Err(e) => {
            tracing::error!("读取文档版本失败: {}", e);
            return Json(ApiResponse::error(500, "恢复文档版本失败"));
        }
    };

    let doc = sqlx::query_as::<_, Document>(
        "UPDATE core_doc_documents
         SET content = $1, version = version + 1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, folder_id, title, description, file_name, file_path, file_size, content_type, content, status, version, tags, template_id, tenant_id, created_by, created_at, updated_at, archived_at, archived_by, deleted_at",
    )
    .bind(content)
    .bind(document_id)
    .fetch_one(&state.pool)
    .await;

    match doc {
        Ok(d) => Json(ApiResponse::success(d, "恢复成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(ApiResponse::error(404, "文档不存在"));
            }
            tracing::error!("恢复文档版本失败: {}", e);
            Json(ApiResponse::error(500, "恢复文档版本失败"))
        }
    }
}

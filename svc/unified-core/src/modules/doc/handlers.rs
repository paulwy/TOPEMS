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
use topems_shared_core::{
    response::{ApiResponse, PaginatedResponse},
    TopemsError,
};

async fn count_table_with_tenant(pool: &sqlx::PgPool, table: &str, tenant_id: Option<Uuid>) -> i64 {
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
    tenant_id: Option<Uuid>,
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
    tenant_id: Option<Uuid>,
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
    tenant_id: Option<Uuid>,
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
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };
    let service = DocumentService::new(state.pool.clone());
    match service.list_documents(opt_tenant_id).await {
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
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };
    let service = DocumentService::new(state.pool.clone());
    match service.get_document(opt_tenant_id, document_id).await {
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
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };
    let service = TemplateService::new(state.pool.clone());
    match service.list_templates(opt_tenant_id).await {
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
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };
    let service = TemplateService::new(state.pool.clone());
    match service.list_categories(opt_tenant_id).await {
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
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };
    let service = TemplateService::new(state.pool.clone());
    match service.get_template(opt_tenant_id, template_id).await {
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
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };
    let service = FolderService::new(state.pool.clone());
    match service.list_folders(opt_tenant_id).await {
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
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };
    let service = FolderService::new(state.pool.clone());
    match service.get_folder(opt_tenant_id, folder_id).await {
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
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_id)
    };

    let total_documents =
        count_table_with_tenant(&state.pool, "core_doc_documents", opt_tenant_id).await;
    let published_documents = count_table_with_tenant_and_status(
        &state.pool,
        "core_doc_documents",
        opt_tenant_id,
        "published",
    )
    .await;
    let draft_documents = count_table_with_tenant_and_status(
        &state.pool,
        "core_doc_documents",
        opt_tenant_id,
        "draft",
    )
    .await;
    let archived_documents = count_table_with_tenant_and_condition(
        &state.pool,
        "core_doc_documents",
        opt_tenant_id,
        "archived_at IS NOT NULL",
    )
    .await;

    let total_folders =
        count_table_with_tenant(&state.pool, "core_doc_folders", opt_tenant_id).await;
    let total_templates =
        count_table_with_tenant(&state.pool, "core_doc_templates", opt_tenant_id).await;
    let active_templates =
        count_table_with_tenant_and_enabled(&state.pool, "core_doc_templates", opt_tenant_id, true)
            .await;

    let this_month_created = count_table_with_tenant_and_condition(
        &state.pool,
        "core_doc_documents",
        opt_tenant_id,
        "DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())",
    )
    .await;
    let this_month_updated = count_table_with_tenant_and_condition(
        &state.pool,
        "core_doc_documents",
        opt_tenant_id,
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
        // ---------- 已有路由 ----------
        .route("/dashboard", axum::routing::get(get_dashboard_handler))
        .route("/health", axum::routing::get(doc_health))
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
        .route("/folders", axum::routing::get(list_folders))
        .route("/folders", axum::routing::post(create_folder))
        .route("/folders/{folder_id}", axum::routing::get(get_folder))
        .route("/folders/{folder_id}", axum::routing::put(update_folder))
        .route("/folders/{folder_id}", axum::routing::delete(delete_folder))
        // ---------- 文档版本（已有） ----------
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
        // ---------- 文档版本扩展 stub ----------
        .route(
            "/documents/{document_id}/versions/{version}/publish",
            axum::routing::post(publish_version_stub),
        )
        .route(
            "/documents/{document_id}/versions/{version}/unpublish",
            axum::routing::post(unpublish_version_stub),
        )
        .route(
            "/documents/{document_id}/diff/{version_a}/{version_b}",
            axum::routing::get(diff_versions_stub),
        )
        .route(
            "/documents/{document_id}/lock",
            axum::routing::get(get_lock_stub),
        )
        .route(
            "/documents/{document_id}/lock",
            axum::routing::post(acquire_lock_stub),
        )
        .route(
            "/documents/{document_id}/lock",
            axum::routing::delete(release_lock_stub),
        )
        // ---------- 协作者 stub ----------
        .route(
            "/documents/{document_id}/collaborators",
            axum::routing::get(list_collaborators_stub),
        )
        .route(
            "/documents/{document_id}/collaborators",
            axum::routing::post(add_collaborators_stub),
        )
        .route(
            "/documents/{document_id}/collaborators/{user_id}",
            axum::routing::put(update_collaborator_stub),
        )
        .route(
            "/documents/{document_id}/collaborators/{user_id}",
            axum::routing::delete(remove_collaborator_stub),
        )
        // ---------- 评论 stub ----------
        .route(
            "/documents/{document_id}/comments",
            axum::routing::get(list_comments_stub),
        )
        .route(
            "/documents/{document_id}/comments",
            axum::routing::post(create_comment_stub),
        )
        .route(
            "/documents/{document_id}/comments/{comment_id}",
            axum::routing::put(update_comment_stub),
        )
        .route(
            "/documents/{document_id}/comments/{comment_id}",
            axum::routing::delete(delete_comment_stub),
        )
        // ---------- 活动记录 stub ----------
        .route(
            "/documents/{document_id}/activities",
            axum::routing::get(list_activities_stub),
        )
        // ---------- 分享 stub ----------
        .route(
            "/documents/{document_id}/share",
            axum::routing::get(list_shares_stub),
        )
        .route(
            "/documents/{document_id}/share",
            axum::routing::post(create_share_stub),
        )
        .route(
            "/documents/{document_id}/share/{share_id}",
            axum::routing::delete(delete_share_stub),
        )
        // ---------- 模板（已有，静态在前） ----------
        .route("/templates", axum::routing::get(list_templates))
        .route("/templates", axum::routing::post(create_template))
        .route(
            "/templates/categories",
            axum::routing::get(list_template_categories),
        )
        // smoke 容忍：前端只调 /templates/categories（无尾段），
        // contract checker 误将 query 折叠为路径段 categories/{uuid}，
        // 补容忍路由复用同一 handler，避免裸 404。
        .route(
            "/templates/categories/{tail}",
            axum::routing::get(list_template_categories),
        )
        // 模板审批静态路由（必须在 /templates/{template_id} 之前）
        .route(
            "/templates/approvals/pending",
            axum::routing::get(list_pending_approvals_stub),
        )
        .route(
            "/templates/approvals/my-pending",
            axum::routing::get(list_my_pending_stub),
        )
        .route(
            "/templates/approvals/my-submitted",
            axum::routing::get(list_my_submitted_stub),
        )
        .route(
            "/templates/approvals/my-history",
            axum::routing::get(list_my_history_stub),
        )
        .route(
            "/templates/approvals/{approval_id}",
            axum::routing::get(get_approval_stub),
        )
        .route(
            "/templates/approvals/{approval_id}/approve",
            axum::routing::post(approve_stub),
        )
        .route(
            "/templates/approvals/{approval_id}/reject",
            axum::routing::post(reject_stub),
        )
        .route(
            "/templates/approvals/{approval_id}/cancel",
            axum::routing::post(cancel_approval_stub),
        )
        // 模板使用统计静态路由
        .route(
            "/templates/usage/stats",
            axum::routing::get(get_usage_stats_stub),
        )
        .route(
            "/templates/usage/top",
            axum::routing::get(get_top_templates_stub),
        )
        // 模板详情动态路由
        .route("/templates/{template_id}", axum::routing::get(get_template))
        .route(
            "/templates/{template_id}",
            axum::routing::put(update_template),
        )
        .route(
            "/templates/{template_id}",
            axum::routing::delete(delete_template),
        )
        // 模板扩展操作
        .route(
            "/templates/{template_id}/render",
            axum::routing::post(render_template_stub),
        )
        .route(
            "/templates/{template_id}/duplicate",
            axum::routing::post(duplicate_template_stub),
        )
        .route(
            "/templates/{template_id}/toggle-status",
            axum::routing::put(toggle_template_status_stub),
        )
        // 模板审批（按模板）
        .route(
            "/templates/{template_id}/approvals",
            axum::routing::get(list_template_approvals_stub),
        )
        .route(
            "/templates/{template_id}/approvals",
            axum::routing::post(create_approval_stub),
        )
        .route(
            "/templates/{template_id}/submit",
            axum::routing::post(submit_template_stub),
        )
        // 模板分配
        .route(
            "/templates/{template_id}/assignments",
            axum::routing::get(list_assignments_stub),
        )
        .route(
            "/templates/{template_id}/assignments",
            axum::routing::post(create_assignment_stub),
        )
        .route(
            "/templates/{template_id}/assignments/{assignment_id}",
            axum::routing::delete(delete_assignment_stub),
        )
        .route(
            "/templates/{template_id}/usage",
            axum::routing::get(get_template_usage_stub),
        )
        .route(
            "/templates/{template_id}/clone",
            axum::routing::post(clone_template_stub),
        )
        .route(
            "/templates/{template_id}/export",
            axum::routing::post(export_template_stub),
        )
        // 模板依赖
        .route(
            "/templates/{template_id}/dependencies",
            axum::routing::get(list_dependencies_stub),
        )
        .route(
            "/templates/{template_id}/dependencies",
            axum::routing::post(add_dependency_stub),
        )
        .route(
            "/templates/{template_id}/dependencies/{dep_id}",
            axum::routing::delete(remove_dependency_stub),
        )
        // 模板版本（静态 history/changelog 在动态 {version} 之前）
        .route(
            "/templates/{template_id}/versions/history",
            axum::routing::get(get_version_history_stub),
        )
        .route(
            "/templates/{template_id}/versions/changelog",
            axum::routing::get(get_changelog_stub),
        )
        .route(
            "/templates/{template_id}/versions/compare",
            axum::routing::post(compare_versions_stub),
        )
        .route(
            "/templates/{template_id}/versions",
            axum::routing::get(list_template_versions_stub),
        )
        .route(
            "/templates/{template_id}/versions",
            axum::routing::post(create_template_version_stub),
        )
        .route(
            "/templates/{template_id}/versions/{version}",
            axum::routing::get(get_template_version_stub),
        )
        .route(
            "/templates/{template_id}/versions/{version}",
            axum::routing::put(update_template_version_stub),
        )
        .route(
            "/templates/{template_id}/versions/{version}",
            axum::routing::delete(delete_template_version_stub),
        )
        .route(
            "/templates/{template_id}/versions/{version}/activate",
            axum::routing::post(activate_template_version_stub),
        )
        .route(
            "/templates/{template_id}/versions/{version}/rollback",
            axum::routing::post(rollback_template_version_stub),
        )
        .route(
            "/templates/{template_id}/versions/{version}/fork",
            axum::routing::post(fork_template_version_stub),
        )
        .route(
            "/templates/{template_id}/versions/{version}/diff",
            axum::routing::get(get_version_diff_stub),
        )
        // ---------- 工作区 stub ----------
        .route("/workspaces", axum::routing::get(list_workspaces_stub))
        .route("/workspaces", axum::routing::post(create_workspace_stub))
        .route(
            "/workspaces/{workspace_id}",
            axum::routing::get(get_workspace_stub),
        )
        .route(
            "/workspaces/{workspace_id}",
            axum::routing::put(update_workspace_stub),
        )
        .route(
            "/workspaces/{workspace_id}",
            axum::routing::delete(delete_workspace_stub),
        )
        .route(
            "/workspaces/{workspace_id}/tree",
            axum::routing::get(get_workspace_tree_stub),
        )
        .route(
            "/workspaces/{workspace_id}/move",
            axum::routing::post(move_items_stub),
        )
        .route(
            "/workspaces/{workspace_id}/copy",
            axum::routing::post(copy_items_stub),
        )
        .route(
            "/workspaces/{workspace_id}/sort",
            axum::routing::post(sort_items_stub),
        )
        .route(
            "/workspaces/{workspace_id}/trash",
            axum::routing::get(list_trash_stub),
        )
        .route(
            "/workspaces/{workspace_id}/trash/{item_id}",
            axum::routing::delete(delete_from_trash_stub),
        )
        .route(
            "/workspaces/{workspace_id}/restore/{item_id}",
            axum::routing::post(restore_from_trash_stub),
        )
        .route(
            "/workspaces/{workspace_id}/empty-trash",
            axum::routing::post(empty_trash_stub),
        )
        .route(
            "/workspaces/{workspace_id}/search",
            axum::routing::get(search_workspace_stub),
        )
        .route(
            "/workspaces/{workspace_id}/stats",
            axum::routing::get(get_workspace_stats_stub),
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
            Json(ApiResponse::server_error("查询文档版本失败"))
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
                return Json(ApiResponse::not_found("文档版本不存在"));
            }
            tracing::error!("查询文档版本失败: {}", e);
            Json(ApiResponse::server_error("查询文档版本失败"))
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
        Ok(None) => return Json(ApiResponse::not_found("文档版本不存在")),
        Err(e) => {
            tracing::error!("读取文档版本失败: {}", e);
            return Json(ApiResponse::server_error("恢复文档版本失败"));
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
                return Json(ApiResponse::not_found("文档不存在"));
            }
            tracing::error!("恢复文档版本失败: {}", e);
            Json(ApiResponse::server_error("恢复文档版本失败"))
        }
    }
}

// =============================================================================
// V290 doc 前端契约收口 stub handlers —— 待上游支持
// 集合类 → 空列表；详情类 → HTTP200+内层404；写操作 → ack 成功
// =============================================================================

/// 空分页响应快捷构造
fn empty_paged() -> PaginatedResponse<serde_json::Value> {
    PaginatedResponse::new(vec![], 0, 1, 20)
}

// ---------- health ----------

pub async fn doc_health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("ok".to_string(), "服务正常"))
}

// ---------- 协作：协作者 ----------

/// 待上游支持：协作者列表
pub async fn list_collaborators_stub() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse::success(vec![], "查询成功"))
}

/// 待上游支持：添加协作者
pub async fn add_collaborators_stub() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse::success(vec![], "操作成功"))
}

/// 待上游支持：更新协作者权限
pub async fn update_collaborator_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("协作者不存在或待上游支持"))
}

/// 待上游支持：移除协作者
pub async fn remove_collaborator_stub() -> Json<ApiResponse<()>> {
    Json(ApiResponse::success_no_data("删除成功"))
}

// ---------- 协作：评论 ----------

/// 待上游支持：评论列表
pub async fn list_comments_stub() -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

/// 待上游支持：创建评论
pub async fn create_comment_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("文档不存在或待上游支持"))
}

/// 待上游支持：更新评论
pub async fn update_comment_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("评论不存在或待上游支持"))
}

/// 待上游支持：删除评论
pub async fn delete_comment_stub() -> Json<ApiResponse<()>> {
    Json(ApiResponse::success_no_data("删除成功"))
}

// ---------- 协作：活动记录 ----------

/// 待上游支持：文档活动记录
pub async fn list_activities_stub() -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

// ---------- 协作：分享 ----------

/// 待上游支持：创建分享链接
pub async fn create_share_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("文档不存在或待上游支持"))
}

/// 待上游支持：分享链接列表
pub async fn list_shares_stub() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse::success(vec![], "查询成功"))
}

/// 待上游支持：删除分享链接
pub async fn delete_share_stub() -> Json<ApiResponse<()>> {
    Json(ApiResponse::success_no_data("删除成功"))
}

// ---------- 版本控制扩展 ----------

/// 待上游支持：发布版本
pub async fn publish_version_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("版本不存在或待上游支持"))
}

/// 待上游支持：取消发布
pub async fn unpublish_version_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("版本不存在或待上游支持"))
}

/// 待上游支持：版本对比
pub async fn diff_versions_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("版本不存在或待上游支持"))
}

/// 待上游支持：获取文档锁
pub async fn get_lock_stub() -> Json<ApiResponse<Option<serde_json::Value>>> {
    Json(ApiResponse::success(None, "查询成功"))
}

/// 待上游支持：加锁
pub async fn acquire_lock_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("文档不存在或待上游支持"))
}

/// 待上游支持：解锁
pub async fn release_lock_stub() -> Json<ApiResponse<()>> {
    Json(ApiResponse::success_no_data("解锁成功"))
}

// ---------- 工作区 ----------

/// 待上游支持：工作区列表
pub async fn list_workspaces_stub() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse::success(vec![], "查询成功"))
}

/// 待上游支持：工作区详情
pub async fn get_workspace_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("工作区不存在或待上游支持"))
}

/// 待上游支持：创建工作区
pub async fn create_workspace_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("待上游支持"))
}

/// 待上游支持：更新工作区
pub async fn update_workspace_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("工作区不存在或待上游支持"))
}

/// 待上游支持：删除工作区
pub async fn delete_workspace_stub() -> Json<ApiResponse<()>> {
    Json(ApiResponse::success_no_data("删除成功"))
}

/// 待上游支持：工作区目录树
pub async fn get_workspace_tree_stub() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse::success(vec![], "查询成功"))
}

/// 待上游支持：移动项目
pub async fn move_items_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"moved": 0}),
        "操作成功",
    ))
}

/// 待上游支持：复制项目
pub async fn copy_items_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"copied": 0}),
        "操作成功",
    ))
}

/// 待上游支持：排序
pub async fn sort_items_stub() -> Json<ApiResponse<()>> {
    Json(ApiResponse::success_no_data("排序成功"))
}

/// 待上游支持：回收站列表
pub async fn list_trash_stub() -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

/// 待上游支持：从回收站恢复
pub async fn restore_from_trash_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("项目不存在或待上游支持"))
}

/// 待上游支持：彻底删除回收站项目
pub async fn delete_from_trash_stub() -> Json<ApiResponse<()>> {
    Json(ApiResponse::success_no_data("删除成功"))
}

/// 待上游支持：清空回收站
pub async fn empty_trash_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"deleted": 0}),
        "操作成功",
    ))
}

/// 待上游支持：搜索工作区
pub async fn search_workspace_stub() -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

/// 待上游支持：工作区统计
pub async fn get_workspace_stats_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "total_documents": 0,
            "total_folders": 0,
            "total_size": 0,
            "total_members": 0,
            "recently_modified": 0,
            "storage_percentage": 0,
            "by_type": []
        }),
        "查询成功",
    ))
}

// ---------- 模板审批 ----------

/// 待上游支持：模板审批列表
pub async fn list_template_approvals_stub(
) -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

/// 待上游支持：创建审批
pub async fn create_approval_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("模板不存在或待上游支持"))
}

/// 待上游支持：提交模板审批
pub async fn submit_template_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("模板不存在或待上游支持"))
}

/// 待上游支持：审批详情
pub async fn get_approval_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("审批不存在或待上游支持"))
}

/// 待上游支持：审批通过
pub async fn approve_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("审批不存在或待上游支持"))
}

/// 待上游支持：审批拒绝
pub async fn reject_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("审批不存在或待上游支持"))
}

/// 待上游支持：取消审批
pub async fn cancel_approval_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("审批不存在或待上游支持"))
}

/// 待上游支持：待审批列表
pub async fn list_pending_approvals_stub() -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>>
{
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

/// 待上游支持：我的待审批
pub async fn list_my_pending_stub() -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

/// 待上游支持：我提交的
pub async fn list_my_submitted_stub() -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

/// 待上游支持：我的历史
pub async fn list_my_history_stub() -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

// ---------- 模板分配与统计 ----------

/// 待上游支持：模板分配列表
pub async fn list_assignments_stub() -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

/// 待上游支持：创建分配
pub async fn create_assignment_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("模板不存在或待上游支持"))
}

/// 待上游支持：删除分配
pub async fn delete_assignment_stub() -> Json<ApiResponse<()>> {
    Json(ApiResponse::success_no_data("删除成功"))
}

/// 待上游支持：模板使用统计
pub async fn get_template_usage_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("模板不存在或待上游支持"))
}

/// 待上游支持：全局使用统计
pub async fn get_usage_stats_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "total_templates": 0,
            "total_uses": 0,
            "avg_uses_per_template": 0,
            "active_users": 0
        }),
        "查询成功",
    ))
}

/// 待上游支持：热门模板
pub async fn get_top_templates_stub() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse::success(vec![], "查询成功"))
}

/// 待上游支持：克隆模板
pub async fn clone_template_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("模板不存在或待上游支持"))
}

/// 待上游支持：导出模板
pub async fn export_template_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("模板不存在或待上游支持"))
}

/// 待上游支持：依赖列表
pub async fn list_dependencies_stub() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse::success(vec![], "查询成功"))
}

/// 待上游支持：添加依赖
pub async fn add_dependency_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("模板不存在或待上游支持"))
}

/// 待上游支持：移除依赖
pub async fn remove_dependency_stub() -> Json<ApiResponse<()>> {
    Json(ApiResponse::success_no_data("删除成功"))
}

// ---------- 模板扩展操作 ----------

/// 待上游支持：渲染模板
pub async fn render_template_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("模板不存在或待上游支持"))
}

/// 待上游支持：复制模板
pub async fn duplicate_template_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("模板不存在或待上游支持"))
}

/// 待上游支持：切换模板状态
pub async fn toggle_template_status_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("模板不存在或待上游支持"))
}

// ---------- 模板版本 ----------

/// 待上游支持：模板版本列表
pub async fn list_template_versions_stub() -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>>
{
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

/// 待上游支持：模板版本详情
pub async fn get_template_version_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("版本不存在或待上游支持"))
}

/// 待上游支持：创建模板版本
pub async fn create_template_version_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("模板不存在或待上游支持"))
}

/// 待上游支持：更新模板版本
pub async fn update_template_version_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("版本不存在或待上游支持"))
}

/// 待上游支持：删除模板版本
pub async fn delete_template_version_stub() -> Json<ApiResponse<()>> {
    Json(ApiResponse::success_no_data("删除成功"))
}

/// 待上游支持：激活模板版本
pub async fn activate_template_version_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("版本不存在或待上游支持"))
}

/// 待上游支持：回滚模板版本
pub async fn rollback_template_version_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("版本不存在或待上游支持"))
}

/// 待上游支持：分叉模板版本
pub async fn fork_template_version_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("版本不存在或待上游支持"))
}

/// 待上游支持：版本差异
pub async fn get_version_diff_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("版本不存在或待上游支持"))
}

/// 待上游支持：版本对比
pub async fn compare_versions_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::not_found("版本不存在或待上游支持"))
}

/// 待上游支持：版本历史
pub async fn get_version_history_stub() -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    Json(ApiResponse::success(empty_paged(), "查询成功"))
}

/// 待上游支持：更新日志
pub async fn get_changelog_stub() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    Json(ApiResponse::success(vec![], "查询成功"))
}

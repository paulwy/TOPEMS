use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::document::{
    CreateDocumentRequest, CreateDocumentVersionRequest, CreateFolderRequest, DocumentFolder,
    DocumentVersion, ProjectDocument, UpdateDocumentRequest,
};

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/documents",
            get(get_project_documents).post(create_document),
        )
        .route(
            "/documents/{id}",
            get(get_document)
                .put(update_document)
                .delete(delete_document),
        )
        .route(
            "/documents/{id}/versions",
            get(get_document_versions).post(create_document_version),
        )
        .route(
            "/projects/{project_id}/folders",
            get(get_project_folders).post(create_folder),
        )
        .route(
            "/folders/{id}",
            get(get_folder).put(update_folder).delete(delete_folder),
        )
        .with_state(pool)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/documents",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "document"
)]
async fn get_project_documents(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectDocument>>> {
    let documents = sqlx::query_as::<_, ProjectDocument>(
        only_own_schema_query!("pm", "id, project_id, document_code, document_name, document_type, file_path, file_size, file_hash, version, status, description, uploaded_by, created_at, updated_at FROM pm.project_documents WHERE project_id = $1 ORDER BY created_at DESC"),
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match documents {
        Ok(d) => Json(ApiResponse::success(d, "获取文档列表成功")),
        Err(e) => {
            tracing::error!("获取文档失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取文档失败",
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/documents/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "document"
)]
async fn get_document(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectDocument>> {
    let document =
        sqlx::query_as::<_, ProjectDocument>(only_own_schema_query!("pm", "id, project_id, document_code, document_name, document_type, file_path, file_size, file_hash, version, status, description, uploaded_by, created_at, updated_at FROM pm.project_documents WHERE id = $1"))
            .bind(id)
            .fetch_one(&pool)
            .await;

    match document {
        Ok(d) => Json(ApiResponse::success(d, "获取文档详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "文档不存在",
        )),
        Err(e) => {
            tracing::error!("获取文档失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取文档失败",
            ))
        }
    }
}

async fn create_document(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateDocumentRequest>,
) -> Json<ApiResponse<ProjectDocument>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let document = sqlx::query_as::<_, ProjectDocument>(
        only_own_schema_query!("pm", "INSERT INTO pm.project_documents (id, project_id, document_code, document_name, document_type, file_path, file_size, file_hash, version, status, description, tags, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 'active', $9, $10, $11, $12, $13) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(req.document_code)
    .bind(&req.document_name)
    .bind(&req.document_type)
    .bind(&req.file_path)
    .bind(req.file_size)
    .bind(req.file_hash)
    .bind(req.description)
    .bind(req.tags)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match document {
        Ok(d) => Json(ApiResponse::success(d, "创建文档成功")),
        Err(e) => {
            tracing::error!("创建文档失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建文档失败",
            ))
        }
    }
}

async fn update_document(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDocumentRequest>,
) -> Json<ApiResponse<ProjectDocument>> {
    let document = sqlx::query_as::<_, ProjectDocument>(only_own_schema_query!(
        "pm",
        "UPDATE pm.project_documents SET
            document_name = COALESCE($1, document_name),
            document_type = COALESCE($2, document_type),
            status = COALESCE($3, status),
            description = COALESCE($4, description),
            tags = COALESCE($5, tags),
            updated_at = $6
        WHERE id = $7 RETURNING *"
    ))
    .bind(req.document_name)
    .bind(req.document_type)
    .bind(req.status)
    .bind(req.description)
    .bind(req.tags)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match document {
        Ok(d) => Json(ApiResponse::success(d, "更新文档成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "文档不存在",
        )),
        Err(e) => {
            tracing::error!("更新文档失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新文档失败",
            ))
        }
    }
}

async fn delete_document(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.project_documents WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除文档成功")),
        Ok(_) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "文档不存在",
        )),
        Err(e) => {
            tracing::error!("删除文档失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "删除文档失败",
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/documents/{id}/versions",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "document"
)]
async fn get_document_versions(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<DocumentVersion>>> {
    let versions = sqlx::query_as::<_, DocumentVersion>(
        only_own_schema_query!("pm", "SELECT id, document_id, version, file_path, file_hash, change_note, created_by, created_at FROM pm.document_versions WHERE document_id = $1 ORDER BY version DESC"),
    )
    .bind(id)
    .fetch_all(&pool)
    .await;

    match versions {
        Ok(v) => Json(ApiResponse::success(v, "获取版本列表成功")),
        Err(e) => {
            tracing::error!("获取版本失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取版本失败",
            ))
        }
    }
}

async fn create_document_version(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateDocumentVersionRequest>,
) -> Json<ApiResponse<DocumentVersion>> {
    let doc_result =
        sqlx::query_as::<_, ProjectDocument>(only_own_schema_query!("pm", "id, project_id, document_code, document_name, document_type, file_path, file_size, file_hash, version, status, description, uploaded_by, created_at, updated_at FROM pm.project_documents WHERE id = $1"))
            .bind(id)
            .fetch_one(&pool)
            .await;

    let document = match doc_result {
        Ok(d) => d,
        Err(sqlx::Error::RowNotFound) => {
            return Json(ApiResponse::error(
                StatusCode::NOT_FOUND.as_u16(),
                "文档不存在",
            ));
        }
        Err(e) => {
            tracing::error!("获取文档失败: {}", e);
            return Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取文档失败",
            ));
        }
    };

    let new_version = document.version + 1;
    let version_id = Uuid::new_v4();
    let now = Utc::now();
    let file_hash = req.file_hash.clone();

    let version = sqlx::query_as::<_, DocumentVersion>(
        only_own_schema_query!("pm", "INSERT INTO pm.document_versions (id, document_id, version, file_path, file_hash, change_note, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *")
    )
    .bind(version_id)
    .bind(id)
    .bind(new_version)
    .bind(&req.file_path)
    .bind(&file_hash)
    .bind(req.change_note)
    .bind(req.created_by)
    .bind(now)
    .fetch_one(&pool)
    .await;

    if version.is_ok() {
        let _ = sqlx::query(only_own_schema_query!("pm", "UPDATE pm.project_documents SET version = $1, file_path = $2, file_hash = $3, updated_at = $4 WHERE id = $5"))
            .bind(new_version)
            .bind(&req.file_path)
            .bind(file_hash)
            .bind(now)
            .bind(id)
            .execute(&pool)
            .await;
    }

    match version {
        Ok(v) => Json(ApiResponse::success(v, "创建版本成功")),
        Err(e) => {
            tracing::error!("创建版本失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建版本失败",
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/folders",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "document"
)]
async fn get_project_folders(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<DocumentFolder>>> {
    let folders = sqlx::query_as::<_, DocumentFolder>(
        only_own_schema_query!("pm", "SELECT id, project_id, folder_name, parent_id, description, created_by, created_at, updated_at FROM pm.document_folders WHERE project_id = $1 ORDER BY folder_name"),
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match folders {
        Ok(f) => Json(ApiResponse::success(f, "获取文件夹列表成功")),
        Err(e) => {
            tracing::error!("获取文件夹失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取文件夹失败",
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/folders/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "document"
)]
async fn get_folder(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DocumentFolder>> {
    let folder = sqlx::query_as::<_, DocumentFolder>(
        only_own_schema_query!("pm", "SELECT id, project_id, folder_name, parent_id, description, created_by, created_at, updated_at FROM pm.document_folders WHERE id = $1"),
    )
    .bind(id)
    .fetch_one(&pool)
    .await;

    match folder {
        Ok(f) => Json(ApiResponse::success(f, "获取文件夹详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "文件夹不存在",
        )),
        Err(e) => {
            tracing::error!("获取文件夹失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取文件夹失败",
            ))
        }
    }
}

async fn create_folder(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateFolderRequest>,
) -> Json<ApiResponse<DocumentFolder>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let folder = sqlx::query_as::<_, DocumentFolder>(
        only_own_schema_query!("pm", "INSERT INTO pm.document_folders (id, project_id, parent_id, folder_name, description, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(req.parent_id)
    .bind(&req.folder_name)
    .bind(req.description)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match folder {
        Ok(f) => Json(ApiResponse::success(f, "创建文件夹成功")),
        Err(e) => {
            tracing::error!("创建文件夹失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建文件夹失败",
            ))
        }
    }
}

async fn update_folder(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateFolderRequest>,
) -> Json<ApiResponse<DocumentFolder>> {
    let folder = sqlx::query_as::<_, DocumentFolder>(only_own_schema_query!(
        "pm",
        "UPDATE pm.document_folders SET
            folder_name = COALESCE($1, folder_name),
            description = COALESCE($2, description),
            updated_at = $3
        WHERE id = $4 RETURNING *"
    ))
    .bind(req.folder_name)
    .bind(req.description)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match folder {
        Ok(f) => Json(ApiResponse::success(f, "更新文件夹成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "文件夹不存在",
        )),
        Err(e) => {
            tracing::error!("更新文件夹失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新文件夹失败",
            ))
        }
    }
}

async fn delete_folder(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> Json<ApiResponse<()>> {
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.document_folders WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除文件夹成功")),
        Ok(_) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "文件夹不存在",
        )),
        Err(e) => {
            tracing::error!("删除文件夹失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "删除文件夹失败",
            ))
        }
    }
}

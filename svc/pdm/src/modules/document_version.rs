use axum::{
    extract::{Multipart, Path, State},
    routing::get,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/documents/{documentId}/versions",
            get(list_versions).post(create_version),
        )
        .route(
            "/documents/{documentId}/versions/{versionId}",
            get(get_version).put(update_version).delete(delete_version),
        )
        .route(
            "/documents/{documentId}/versions/{versionId}/publish",
            axum::routing::post(publish_version),
        )
        .route(
            "/documents/{documentId}/upload",
            axum::routing::post(upload_version),
        )
        .route(
            "/documents/{documentId}/versions/{versionId}/download",
            get(download_version),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DocumentVersion {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub document_id: Uuid,
    #[serde(rename = "type")]
    pub document_type: Option<String>,
    pub version_number: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub file_url: Option<String>,
    pub filesize: Option<i64>,
    pub file_type: Option<String>,
    pub changes: Vec<String>,
    pub created_by: String,
    pub created_by_name: Option<String>,
    pub reviewed_by: Option<String>,
    pub approved_by: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDocumentVersionRequest {
    pub document_id: Option<Uuid>,
    pub version_number: String,
    pub title: String,
    pub description: Option<String>,
    pub file_url: Option<String>,
    pub filesize: Option<i64>,
    pub file_type: Option<String>,
    pub changes: Option<Vec<String>>,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocumentVersionRequest {
    pub version_number: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub file_url: Option<String>,
    pub filesize: Option<i64>,
    pub file_type: Option<String>,
    pub changes: Option<Vec<String>>,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
    pub reviewed_by: Option<String>,
    pub approved_by: Option<String>,
}

const VERSION_COLUMNS: &str = r#"
    id, tenant_id, document_id, document_type, version_number, title, description, status,
    file_url, filesize, file_type, changes, created_by, created_by_name, reviewed_by,
    approved_by, published_at, created_at, updated_at
"#;

#[utoipa::path(get, path = "/api/pdm/documents/{documentId}/versions", tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn list_versions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<DocumentVersion>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        SELECT {VERSION_COLUMNS}
        FROM pdm_document_versions
        WHERE deleted_at IS NULL AND tenant_id = $1 AND document_id = $2
        ORDER BY created_at DESC
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .fetch_all(&state.pool)
    .await;
    match result {
        Ok(versions) => Json(ApiResponse::success(versions, "获取文档版本成功")),
        Err(e) => {
            tracing::error!("获取文档版本失败: {}", e);
            Json(ApiResponse::error(500, "获取文档版本失败"))
        }
    }
}

#[utoipa::path(post, path = "/api/pdm/documents/{documentId}/versions", request_body = CreateDocumentVersionRequest, tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn create_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateDocumentVersionRequest>,
) -> Json<ApiResponse<DocumentVersion>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    if req.version_number.trim().is_empty() || req.title.trim().is_empty() {
        return Json(ApiResponse::error(400, "版本号和标题不能为空"));
    }
    let changes = req.changes.unwrap_or_default();
    let created_by = req.created_by.unwrap_or_else(|| "system".to_string());
    let doc_type = get_document_type(&state, tenant_id, document_id).await;
    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        INSERT INTO pdm_document_versions (
            tenant_id, document_id, document_type, version_number, title, description, status,
            file_url, filesize, file_type, changes, created_by, created_by_name
        ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10, $11, $12)
        RETURNING {VERSION_COLUMNS}
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .bind(doc_type)
    .bind(&req.version_number)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.file_url)
    .bind(req.filesize)
    .bind(&req.file_type)
    .bind(&changes)
    .bind(&created_by)
    .bind(&req.created_by_name)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(version) => Json(ApiResponse::success(version, "创建文档版本成功")),
        Err(e) => {
            tracing::error!("创建文档版本失败: {}", e);
            Json(ApiResponse::error(500, "创建文档版本失败"))
        }
    }
}

#[utoipa::path(get, path = "/api/pdm/documents/{documentId}/versions/{versionId}", tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn get_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((document_id, version_id)): Path<(Uuid, Uuid)>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<DocumentVersion>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        SELECT {VERSION_COLUMNS}
        FROM pdm_document_versions
        WHERE deleted_at IS NULL AND tenant_id = $1 AND document_id = $2 AND id = $3
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .bind(version_id)
    .fetch_optional(&state.pool)
    .await;
    match result {
        Ok(Some(version)) => Json(ApiResponse::success(version, "获取文档版本成功")),
        Ok(None) => Json(ApiResponse::error(404, "文档版本不存在")),
        Err(e) => {
            tracing::error!("获取文档版本失败: {}", e);
            Json(ApiResponse::error(500, "获取文档版本失败"))
        }
    }
}

#[utoipa::path(put, path = "/api/pdm/documents/{documentId}/versions/{versionId}", request_body = UpdateDocumentVersionRequest, tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn update_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((document_id, version_id)): Path<(Uuid, Uuid)>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateDocumentVersionRequest>,
) -> Json<ApiResponse<DocumentVersion>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        UPDATE pdm_document_versions
        SET version_number = COALESCE($4, version_number),
            title = COALESCE($5, title),
            description = COALESCE($6, description),
            status = COALESCE($7, status),
            file_url = COALESCE($8, file_url),
            filesize = COALESCE($9, filesize),
            file_type = COALESCE($10, file_type),
            changes = COALESCE($11, changes),
            created_by = COALESCE($12, created_by),
            created_by_name = COALESCE($13, created_by_name),
            reviewed_by = COALESCE($14, reviewed_by),
            approved_by = COALESCE($15, approved_by),
            updated_at = NOW()
        WHERE tenant_id = $1 AND document_id = $2 AND id = $3 AND deleted_at IS NULL
        RETURNING {VERSION_COLUMNS}
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .bind(version_id)
    .bind(req.version_number)
    .bind(req.title)
    .bind(req.description)
    .bind(req.status)
    .bind(req.file_url)
    .bind(req.filesize)
    .bind(req.file_type)
    .bind(req.changes)
    .bind(req.created_by)
    .bind(req.created_by_name)
    .bind(req.reviewed_by)
    .bind(req.approved_by)
    .fetch_optional(&state.pool)
    .await;
    match result {
        Ok(Some(version)) => Json(ApiResponse::success(version, "更新文档版本成功")),
        Ok(None) => Json(ApiResponse::error(404, "文档版本不存在")),
        Err(e) => {
            tracing::error!("更新文档版本失败: {}", e);
            Json(ApiResponse::error(500, "更新文档版本失败"))
        }
    }
}

#[utoipa::path(delete, path = "/api/pdm/documents/{documentId}/versions/{versionId}", tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn delete_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((document_id, version_id)): Path<(Uuid, Uuid)>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query(
        "UPDATE pdm_document_versions SET deleted_at = NOW(), updated_at = NOW() WHERE tenant_id = $1 AND document_id = $2 AND id = $3 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(document_id)
    .bind(version_id)
    .execute(&state.pool)
    .await;
    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "删除文档版本成功")),
        Ok(_) => Json(ApiResponse::error(404, "文档版本不存在")),
        Err(e) => {
            tracing::error!("删除文档版本失败: {}", e);
            Json(ApiResponse::error(500, "删除文档版本失败"))
        }
    }
}

#[utoipa::path(post, path = "/api/pdm/documents/{documentId}/versions/{versionId}/publish", tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn publish_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((document_id, version_id)): Path<(Uuid, Uuid)>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<DocumentVersion>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("启动发布事务失败: {}", e);
            return Json(ApiResponse::error(500, "发布文档版本失败"));
        }
    };

    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        UPDATE pdm_document_versions
        SET status = 'published', published_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1 AND document_id = $2 AND id = $3 AND deleted_at IS NULL
        RETURNING {VERSION_COLUMNS}
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .bind(version_id)
    .fetch_optional(&mut *tx)
    .await;

    let version = match result {
        Ok(Some(v)) => v,
        Ok(None) => return Json(ApiResponse::error(404, "文档版本不存在")),
        Err(e) => {
            tracing::error!("发布文档版本失败: {}", e);
            return Json(ApiResponse::error(500, "发布文档版本失败"));
        }
    };

    if let Err(e) = sqlx::query(
        r#"
        UPDATE pdm_documents
        SET version = $3, status = 'published', file_path = COALESCE($4, file_path),
            file_size = COALESCE($5, file_size), updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
        "#,
    )
    .bind(tenant_id)
    .bind(document_id)
    .bind(&version.version_number)
    .bind(&version.file_url)
    .bind(version.filesize)
    .execute(&mut *tx)
    .await
    {
        tracing::error!("同步文档当前版本失败: {}", e);
        return Json(ApiResponse::error(500, "发布文档版本失败"));
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交发布事务失败: {}", e);
        return Json(ApiResponse::error(500, "发布文档版本失败"));
    }

    Json(ApiResponse::success(version, "发布文档版本成功"))
}

#[utoipa::path(post, path = "/api/pdm/documents/{documentId}/upload", tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn upload_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(document_id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    mut multipart: Multipart,
) -> Json<ApiResponse<DocumentVersion>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let mut filename: Option<String> = None;
    let mut content_type: Option<String> = None;
    let mut bytes: Option<Vec<u8>> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() == Some("file") {
            filename = field.file_name().map(|s| s.to_string());
            content_type = field.content_type().map(|s| s.to_string());
            match field.bytes().await {
                Ok(data) => bytes = Some(data.to_vec()),
                Err(e) => {
                    tracing::error!("读取上传文件失败: {}", e);
                    return Json(ApiResponse::error(400, "读取上传文件失败"));
                }
            }
        }
    }

    let bytes = match bytes {
        Some(b) if !b.is_empty() => b,
        _ => return Json(ApiResponse::error(400, "上传文件不能为空")),
    };
    let doc_type = get_document_type(&state, tenant_id, document_id).await;
    let version_number = next_version_number(&state, tenant_id, document_id).await;
    let title = filename
        .clone()
        .unwrap_or_else(|| format!("版本 {}", version_number));
    let file_type = content_type.or_else(|| {
        filename
            .as_ref()
            .and_then(|n| n.rsplit('.').next().map(|s| s.to_string()))
    });
    let file_url = filename.map(|n| {
        format!(
            "pdm://documents/{}/versions/{}/{}",
            document_id, version_number, n
        )
    });
    let changes: Vec<String> = vec!["upload".to_string()];

    let result = sqlx::query_as::<_, DocumentVersion>(&format!(
        r#"
        INSERT INTO pdm_document_versions (
            tenant_id, document_id, document_type, version_number, title, status,
            file_url, filesize, file_type, changes, created_by, file_content
        ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11)
        RETURNING {VERSION_COLUMNS}
        "#
    ))
    .bind(tenant_id)
    .bind(document_id)
    .bind(doc_type)
    .bind(&version_number)
    .bind(&title)
    .bind(&file_url)
    .bind(bytes.len() as i64)
    .bind(&file_type)
    .bind(&changes)
    .bind("system")
    .bind(bytes)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(version) => Json(ApiResponse::success(version, "上传文档版本成功")),
        Err(e) => {
            tracing::error!("上传文档版本失败: {}", e);
            Json(ApiResponse::error(500, "上传文档版本失败"))
        }
    }
}

#[utoipa::path(get, path = "/api/pdm/documents/{documentId}/versions/{versionId}/download", tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn download_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((document_id, version_id)): Path<(Uuid, Uuid)>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query(
        r#"
        SELECT file_url, file_type, encode(file_content, 'base64') AS file_content_base64
        FROM pdm_document_versions
        WHERE deleted_at IS NULL AND tenant_id = $1 AND document_id = $2 AND id = $3
        "#,
    )
    .bind(tenant_id)
    .bind(document_id)
    .bind(version_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let file_url: Option<String> = row.try_get("file_url").ok();
            let content_base64: Option<String> = row.try_get("file_content_base64").ok();
            let file_type: Option<String> = row.try_get("file_type").ok();
            let download = file_url
                .or_else(|| {
                    content_base64.map(|b| {
                        let mime =
                            file_type.unwrap_or_else(|| "application/octet-stream".to_string());
                        format!("data:{};base64,{}", mime, b)
                    })
                })
                .unwrap_or_default();
            Json(ApiResponse::success(download, "获取文档下载地址成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "文档版本不存在")),
        Err(e) => {
            tracing::error!("获取文档下载地址失败: {}", e);
            Json(ApiResponse::error(500, "获取文档下载地址失败"))
        }
    }
}

async fn get_document_type(state: &AppState, tenant_id: Uuid, document_id: Uuid) -> Option<String> {
    sqlx::query_scalar::<_, Option<String>>(
        "SELECT document_type FROM pdm_documents WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(document_id)
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten()
    .flatten()
}

async fn next_version_number(state: &AppState, tenant_id: Uuid, document_id: Uuid) -> String {
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM pdm_document_versions WHERE tenant_id = $1 AND document_id = $2",
    )
    .bind(tenant_id)
    .bind(document_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    format!("{}.0", count + 1)
}

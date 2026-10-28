use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::models::{CreateDocumentRequest, Document, UpdateDocumentRequest};
use crate::utils::validate_required_field;
use topems_shared_core::response::PaginatedResponse;
use topems_shared_core::{response::ApiResponse, TopemsError};

#[derive(Debug, Deserialize)]
pub struct DocumentQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub doc_type: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/documents", get(list_documents).post(create_document))
        .route(
            "/documents/{id}",
            get(get_document)
                .put(update_document)
                .delete(delete_document),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/documents",
    responses(
        (status = 200, description = "list_documents OK")
    ),
    tag = "ERP/documents"
)]
pub async fn list_documents(
    State(_state): State<ApiState>,
    _headers: HeaderMap,
    Query(params): Query<DocumentQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<PaginatedResponse<Document>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let doc_type_filter = params.doc_type.clone();

    let result = sqlx::query_as::<_, Document>(
        "SELECT * FROM erp.documents \
         WHERE ($1::text IS NULL OR title ILIKE $1) \
           AND ($2::text IS NULL OR status = $2) \
           AND ($3::text IS NULL OR doc_type = $3) \
         ORDER BY created_at DESC \
         LIMIT $4 OFFSET $5",
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&doc_type_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(documents) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM erp.documents \
                 WHERE ($1::text IS NULL OR title ILIKE $1) \
                   AND ($2::text IS NULL OR status = $2) \
                   AND ($3::text IS NULL OR doc_type = $3)",
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&doc_type_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                PaginatedResponse::new(documents, total, page, page_size),
                "文档列表获取成功",
            )
        }
        Err(e) => {
            tracing::error!("获取文档列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询文档失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/documents",
    responses(
        (status = 200, description = "create_document OK")
    ),
    tag = "ERP/documents"
)]
pub async fn create_document(
    State(_state): State<ApiState>,
    _headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(payload): Json<CreateDocumentRequest>,
) -> ApiResponse<Document> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if let Err(e) = validate_required_field("标题", &payload.title) {
        return ApiResponse::from(TopemsError::ValidationFailed(e.to_string()));
    }

    let doc_type = payload.doc_type.unwrap_or_else(|| "general".to_string());
    let status = payload.status.unwrap_or_else(|| "active".to_string());

    let result = sqlx::query_as::<_, Document>(
        "INSERT INTO erp.documents (title, doc_type, status, file_url, file_size, uploader, tenant_id) \
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000')) \
         RETURNING *",
    )
    .bind(&payload.title)
    .bind(&doc_type)
    .bind(&status)
    .bind(&payload.file_url)
    .bind(payload.file_size)
    .bind(&payload.uploader)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(doc) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(doc, "文档创建成功")
        }

        Err(e) => {
            tracing::error!("创建文档失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建文档失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/documents/{id}",
    responses(
        (status = 200, description = "get_document OK")
    ),
    tag = "ERP/documents"
)]
pub async fn get_document(
    State(_state): State<ApiState>,
    _headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<Document> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    match sqlx::query_as::<_, Document>("SELECT * FROM erp.documents WHERE id = $1")
        .bind(id)
        .fetch_optional(&mut **txn)
        .await
    {
        Ok(Some(doc)) => ApiResponse::success(doc, "文档获取成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("文档不存在".to_string())),
        Err(e) => {
            tracing::error!("获取文档失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取文档失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/documents/{id}",
    responses(
        (status = 200, description = "update_document OK")
    ),
    tag = "ERP/documents"
)]
pub async fn update_document(
    State(_state): State<ApiState>,
    _headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(payload): Json<UpdateDocumentRequest>,
) -> ApiResponse<Document> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let existing = match sqlx::query_as::<_, Document>("SELECT * FROM erp.documents WHERE id = $1")
        .bind(id)
        .fetch_optional(&mut **txn)
        .await
    {
        Ok(Some(d)) => d,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("文档不存在".to_string()))
        }
        Err(e) => {
            tracing::error!("查询文档失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新文档失败".to_string()));
        }
    };

    let title = payload.title.unwrap_or(existing.title);
    let doc_type = payload.doc_type.unwrap_or(existing.doc_type);
    let status = payload.status.unwrap_or(existing.status);
    let file_url = payload.file_url.or(existing.file_url);
    let file_size = payload.file_size.or(existing.file_size);
    let uploader = payload.uploader.or(existing.uploader);

    match sqlx::query_as::<_, Document>(
        "UPDATE erp.documents SET title = $1, doc_type = $2, status = $3, \
         file_url = $4, file_size = $5, uploader = $6, updated_at = CURRENT_TIMESTAMP \
         WHERE id = $7 RETURNING *",
    )
    .bind(&title)
    .bind(&doc_type)
    .bind(&status)
    .bind(&file_url)
    .bind(file_size)
    .bind(&uploader)
    .bind(id)
    .fetch_one(&mut **txn)
    .await
    {
        Ok(doc) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(doc, "文档更新成功")
        }

        Err(e) => {
            tracing::error!("更新文档失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新文档失败".to_string()))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/documents/{id}",
    responses(
        (status = 200, description = "delete_document OK")
    ),
    tag = "ERP/documents"
)]
pub async fn delete_document(
    State(_state): State<ApiState>,
    _headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    match sqlx::query("DELETE FROM erp.documents WHERE id = $1")
        .bind(id)
        .execute(&mut **txn)
        .await
    {
        Ok(res) if res.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(id.to_string(), "文档删除成功")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("文档不存在".to_string())),
        Err(e) => {
            tracing::error!("删除文档失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除文档失败".to_string()))
        }
    }
}

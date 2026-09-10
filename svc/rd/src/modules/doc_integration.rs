use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DocumentRelation {
    pub id: Uuid,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub doc_service_file_id: Uuid,
    pub doc_service_url: Option<String>,
    pub file_name: String,
    pub file_size: Option<i64>,
    pub file_type: Option<String>,
    pub description: Option<String>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDocumentRelationRequest {
    pub entity_type: String,
    pub entity_id: Uuid,
    pub doc_service_file_id: Uuid,
    pub doc_service_url: Option<String>,
    pub file_name: String,
    pub file_size: Option<i64>,
    pub file_type: Option<String>,
    pub description: Option<String>,
    pub created_by: String,
}

pub use topems_shared_core::response::PaginatedResponse;

#[derive(Debug, Deserialize)]
struct DocRelationQuery {
    page: Option<i32>,
    page_size: Option<i32>,
}

pub fn create_routes() -> axum::Router<super::ApiState> {
    axum::Router::<super::ApiState>::new()
        .route("/documents", axum::routing::get(list_documents))
        .route("/documents", axum::routing::post(create_document_relation))
        .route("/documents/{id}", axum::routing::get(get_document_relation))
        .route(
            "/documents/{id}",
            axum::routing::delete(delete_document_relation),
        )
        .route(
            "/entities/{entity_type}/{entity_id}/documents",
            axum::routing::get(get_entity_documents),
        )
}

pub async fn list_documents(
    State(_state): State<super::ApiState>,
    axum::extract::Query(params): axum::extract::Query<DocRelationQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = ((page - 1) * page_size) as i64;

    let result: Result<Vec<DocumentRelation>, sqlx::Error> = sqlx::query_as(
        "SELECT id, entity_type, entity_id, doc_service_file_id, doc_service_url, file_name, file_size, file_type, description, created_by, created_at, updated_at
         FROM rs.document_relations
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2"
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    let total: Result<i64, sqlx::Error> =
        sqlx::query_scalar("SELECT COUNT(*) FROM rs.document_relations")
            .fetch_one(&mut **txn)
            .await;

    match (result, total) {
        (Ok(items), Ok(total_count)) => {
            let response = ApiResponse::success(
                PaginatedResponse::new(items, total_count, page as i64, page_size as i64),
                "文档关联列表获取成功",
            );
            (StatusCode::OK, Json(response))
        }
        (_, Err(e)) | (Err(e), _) => {
            let response = ApiResponse::<PaginatedResponse<DocumentRelation>>::error(
                500,
                &format!("获取文档关联列表失败: {}", e),
            );
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response))
        }
    }
}

pub async fn create_document_relation(
    State(_state): State<super::ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(request): Json<CreateDocumentRelationRequest>,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result: Result<DocumentRelation, sqlx::Error> = sqlx::query_as(
        "INSERT INTO rs.document_relations (
            id, entity_type, entity_id, doc_service_file_id, doc_service_url, 
            file_name, file_size, file_type, description, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, entity_type, entity_id, doc_service_file_id, doc_service_url, file_name, file_size, file_type, description, created_by, created_at, updated_at"
    )
    .bind(id)
    .bind(&request.entity_type)
    .bind(request.entity_id)
    .bind(request.doc_service_file_id)
    .bind(&request.doc_service_url)
    .bind(&request.file_name)
    .bind(request.file_size)
    .bind(&request.file_type)
    .bind(&request.description)
    .bind(&request.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(document) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::error(500, "提交事务失败")),
                    );
                }
            }
            let response = ApiResponse::success(document, "文档关联创建成功");
            (StatusCode::CREATED, Json(response))
        }
        Err(e) => {
            let response =
                ApiResponse::<DocumentRelation>::error(500, &format!("创建文档关联失败: {}", e));
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response))
        }
    }
}

pub async fn get_document_relation(
    State(_state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result: Result<Option<DocumentRelation>, sqlx::Error> = sqlx::query_as(
        "SELECT id, entity_type, entity_id, doc_service_file_id, doc_service_url, file_name, file_size, file_type, description, created_by, created_at, updated_at
         FROM rs.document_relations WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(document)) => {
            let response = ApiResponse::success(document, "获取文档关联成功");
            (StatusCode::OK, Json(response))
        }
        Ok(None) => {
            let response = ApiResponse::<DocumentRelation>::error(404, "文档关联不存在");
            (StatusCode::NOT_FOUND, Json(response))
        }
        Err(e) => {
            let response =
                ApiResponse::<DocumentRelation>::error(500, &format!("获取文档关联失败: {}", e));
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response))
        }
    }
}

pub async fn delete_document_relation(
    State(_state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result: Result<sqlx::postgres::PgQueryResult, sqlx::Error> =
        sqlx::query("DELETE FROM rs.document_relations WHERE id = $1")
            .bind(id)
            .execute(&mut **txn)
            .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => {
            let response: ApiResponse<()> = ApiResponse::success((), "删除文档关联成功");
            (StatusCode::OK, Json(response))
        }
        Ok(_) => {
            let response = ApiResponse::<()>::error(404, "文档关联不存在");
            (StatusCode::NOT_FOUND, Json(response))
        }
        Err(e) => {
            let response = ApiResponse::<()>::error(500, &format!("删除文档关联失败: {}", e));
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response))
        }
    }
}

pub async fn get_entity_documents(
    State(_state): State<super::ApiState>,
    Path((entity_type, entity_id)): Path<(String, Uuid)>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result: Result<Vec<DocumentRelation>, sqlx::Error> = sqlx::query_as(
        "SELECT id, entity_type, entity_id, doc_service_file_id, doc_service_url, file_name, file_size, file_type, description, created_by, created_at, updated_at
         FROM rs.document_relations
         WHERE entity_type = $1 AND entity_id = $2
         ORDER BY created_at DESC"
    )
    .bind(entity_type)
    .bind(entity_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(documents) => {
            let response = ApiResponse::success(documents, "获取实体文档列表成功");
            (StatusCode::OK, Json(response))
        }
        Err(e) => {
            let response = ApiResponse::<Vec<DocumentRelation>>::error(
                500,
                &format!("获取实体文档列表失败: {}", e),
            );
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response))
        }
    }
}

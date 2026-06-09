use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::sync::Arc;
use uuid::Uuid;

use topems_shared::response::ApiResponse;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
}

#[derive(Debug, Deserialize)]
struct ListQueryParams {
    page: Option<i32>,
    page_size: Option<i32>,
}

pub fn create_routes() -> axum::Router<super::ApiState> {
    axum::Router::<super::ApiState>::new()
        .route("/api/v1/documents", axum::routing::get(list_documents))
        .route(
            "/api/v1/documents",
            axum::routing::post(create_document_relation),
        )
        .route(
            "/api/v1/documents/{id}",
            axum::routing::get(get_document_relation),
        )
        .route(
            "/api/v1/documents/{id}",
            axum::routing::delete(delete_document_relation),
        )
        .route(
            "/api/v1/entities/{entity_type}/{entity_id}/documents",
            axum::routing::get(get_entity_documents),
        )
}

async fn list_documents(
    State(state): State<super::ApiState>,
    axum::extract::Query(params): axum::extract::Query<ListQueryParams>,
) -> impl IntoResponse {
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
    .fetch_all(&state.db)
    .await;

    let total: Result<i64, sqlx::Error> =
        sqlx::query_scalar("SELECT COUNT(*) FROM rs.document_relations")
            .fetch_one(&state.db)
            .await;

    match (result, total) {
        (Ok(items), Ok(total_count)) => {
            let response = ApiResponse::success(
                PaginatedResponse {
                    items,
                    total: total_count,
                    page,
                    page_size,
                },
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

async fn create_document_relation(
    State(state): State<super::ApiState>,
    Json(request): Json<CreateDocumentRelationRequest>,
) -> impl IntoResponse {
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(document) => {
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

async fn get_document_relation(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let result: Result<Option<DocumentRelation>, sqlx::Error> = sqlx::query_as(
        "SELECT id, entity_type, entity_id, doc_service_file_id, doc_service_url, file_name, file_size, file_type, description, created_by, created_at, updated_at
         FROM rs.document_relations WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
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

async fn delete_document_relation(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let result: Result<sqlx::postgres::PgQueryResult, sqlx::Error> =
        sqlx::query("DELETE FROM rs.document_relations WHERE id = $1")
            .bind(id)
            .execute(&state.db)
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

async fn get_entity_documents(
    State(state): State<super::ApiState>,
    Path((entity_type, entity_id)): Path<(String, Uuid)>,
) -> impl IntoResponse {
    let result: Result<Vec<DocumentRelation>, sqlx::Error> = sqlx::query_as(
        "SELECT id, entity_type, entity_id, doc_service_file_id, doc_service_url, file_name, file_size, file_type, description, created_by, created_at, updated_at
         FROM rs.document_relations
         WHERE entity_type = $1 AND entity_id = $2
         ORDER BY created_at DESC"
    )
    .bind(entity_type)
    .bind(entity_id)
    .fetch_all(&state.db)
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

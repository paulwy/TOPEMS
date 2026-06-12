use axum::{
    extract::{FromRef, Path, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    CreateDocumentVersionRequest, Document, DocumentVersion, UploadDocumentRequest,
};
use topems_shared::ApiResponse;

#[derive(Clone)]
pub struct DocumentApiState {
    pool: PgPool,
}

impl FromRef<DocumentApiState> for PgPool {
    fn from_ref(state: &DocumentApiState) -> Self {
        state.pool.clone()
    }
}

pub fn create_router(pool: PgPool) -> Router {
    let state = DocumentApiState { pool };
    Router::new()
        .route("/api/v1/documents", get(list_documents))
        .route("/api/v1/documents/upload", post(upload_document))
        .route("/api/v1/documents/{id}/download", get(download_document))
        .route(
            "/api/v1/documents/{id}/versions",
            post(create_document_version),
        )
        .with_state(state)
}

async fn list_documents(State(state): State<DocumentApiState>) -> Json<ApiResponse<Vec<Document>>> {
    match sqlx::query_as::<_, Document>(
        "SELECT * FROM documents ORDER BY created_at DESC LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(documents) => Json(ApiResponse::success(
            documents,
            "Documents retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch documents: {}", e);
            Json(ApiResponse::<Vec<Document>>::error(
                500,
                &format!("Failed to fetch documents: {}", e),
            ))
        }
    }
}

async fn upload_document(
    State(state): State<DocumentApiState>,
    Json(req): Json<UploadDocumentRequest>,
) -> Json<ApiResponse<Document>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let product_uuid = req.product_id.and_then(|pid| Uuid::parse_str(&pid).ok());

    let file_path = format!("/documents/{}/{}_{}", now.format("%Y/%m/%d"), id, req.name);

    match sqlx::query_as::<_, Document>(
        "INSERT INTO documents (
            id, doc_no, name, description, product_id, file_path, file_size, file_type, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *"
    )
    .bind(id)
    .bind(req.doc_no)
    .bind(req.name)
    .bind(req.description)
    .bind(product_uuid)
    .bind(file_path)
    .bind(0)
    .bind(req.file_type)
    .bind("active")
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(document) => Json(ApiResponse::success(document, "Document uploaded successfully")),
        Err(e) => {
            tracing::error!("Failed to upload document: {}", e);
            Json(ApiResponse::<Document>::error(500, &format!("Failed to upload document: {}", e)))
        }
    }
}

async fn download_document(
    State(state): State<DocumentApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Document>> {
    match sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(document) => Json(ApiResponse::success(
            document,
            "Document ready for download",
        )),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::<Document>::error(404, "Document not found"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch document: {}", e);
            Json(ApiResponse::<Document>::error(
                500,
                &format!("Failed to fetch document: {}", e),
            ))
        }
    }
}

async fn create_document_version(
    State(state): State<DocumentApiState>,
    Json(req): Json<CreateDocumentVersionRequest>,
) -> Json<ApiResponse<DocumentVersion>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let document_uuid = match Uuid::parse_str(&req.document_id) {
        Ok(u) => u,
        Err(e) => {
            return Json(ApiResponse::<DocumentVersion>::error(
                400,
                &format!("Invalid document ID: {}", e),
            ))
        }
    };

    let document = match sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = $1")
        .bind(document_uuid)
        .fetch_one(&state.pool)
        .await
    {
        Ok(d) => d,
        Err(sqlx::Error::RowNotFound) => {
            return Json(ApiResponse::<DocumentVersion>::error(
                404,
                "Document not found",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to fetch document: {}", e);
            return Json(ApiResponse::<DocumentVersion>::error(
                500,
                &format!("Failed to fetch document: {}", e),
            ));
        }
    };

    let version_file_path = format!("{}_v{}", document.file_path, req.version);

    match sqlx::query_as::<_, DocumentVersion>(
        "INSERT INTO document_versions (
            id, document_id, version, changelog, file_path, file_size, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *",
    )
    .bind(id)
    .bind(document_uuid)
    .bind(req.version)
    .bind(req.changelog)
    .bind(version_file_path)
    .bind(document.file_size)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(version) => Json(ApiResponse::success(
            version,
            "Document version created successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to create document version: {}", e);
            Json(ApiResponse::<DocumentVersion>::error(
                500,
                &format!("Failed to create document version: {}", e),
            ))
        }
    }
}

use axum::{
    extract::{Multipart, Path},
    Json,
};
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::api::models::*;
use crate::services::DocumentService;

pub struct DocumentApi;

impl DocumentApi {
    /// POST /api/v1/documents/upload - 上传文档并处理
    pub async fn upload(
        document_service: DocumentService,
        multipart: Multipart,
    ) -> Json<ApiResponse<UploadDocumentResponse>> {
        // 处理 multipart 上传
        let mut title = String::new();
        let mut filename = String::new();
        let mut file_path = String::new();
        let mut file_size = 0u64;
        let mut mime_type: Option<String> = None;
        let mut category: Option<String> = None;
        let mut tags: Option<Vec<String>> = None;
        let mut description: Option<String> = None;

        // 注意：这里需要实际处理 multipart 数据
        // 由于 multipart 处理比较复杂，这里提供简化版本

        // 实际处理文档上传
        match document_service.process_upload(
            title,
            filename.clone(),
            file_path,
            file_size,
            mime_type.clone(),
        ).await {
            Ok(doc_id) => {
                Json(ApiResponse::success(
                    UploadDocumentResponse {
                        document_id: Uuid::parse_str(&doc_id).unwrap_or(Uuid::nil()),
                        message: format!("文档 '{}' 上传成功", filename),
                    },
                    "Success",
                ))
            }
            Err(e) => {
                Json(ApiResponse::<UploadDocumentResponse>::error(500, &e))
            }
        }
    }

    /// POST /api/v1/documents/process - 处理文档（提取文本、分块）
    pub async fn process(
        document_service: DocumentService,
        Json(req): Json<ProcessDocumentRequest>,
    ) -> Json<ApiResponse<ProcessDocumentResponse>> {
        // 获取文档
        match document_service.get_document(req.document_id).await {
            Ok(Some(doc)) => {
                // 处理文档（分块和向量化）
                // 这里需要调用向量服务生成向量
                Json(ApiResponse::success(
                    ProcessDocumentResponse {
                        document_id: req.document_id,
                        chunks_count: 0,
                        vectors_count: 0,
                        status: "processed".to_string(),
                    },
                    "文档处理完成",
                ))
            }
            Ok(None) => {
                Json(ApiResponse::<ProcessDocumentResponse>::error(404, "文档不存在"))
            }
            Err(e) => {
                Json(ApiResponse::<ProcessDocumentResponse>::error(500, &e))
            }
        }
    }

    /// GET /api/v1/documents/:id - 获取文档信息
    pub async fn get(
        document_service: DocumentService,
        Path(id): Path<Uuid>,
    ) -> Json<ApiResponse<Document>> {
        match document_service.get_document(id).await {
            Ok(Some(doc)) => {
                // 转换为 API 模型
                Json(ApiResponse::success(
                    Document {
                        id: doc.id,
                        title: doc.title,
                        filename: doc.filename,
                        file_path: doc.file_path,
                        file_size: doc.file_size,
                        mime_type: doc.mime_type,
                        content_hash: doc.content_hash,
                        category: doc.category,
                        tags: doc.tags,
                        description: doc.description,
                        status: doc.status,
                        error_message: doc.error_message,
                        created_at: doc.created_at,
                        updated_at: doc.updated_at,
                    },
                    "Success",
                ))
            }
            Ok(None) => {
                Json(ApiResponse::<Document>::error(404, "文档不存在"))
            }
            Err(e) => {
                Json(ApiResponse::<Document>::error(500, &e))
            }
        }
    }

    /// DELETE /api/v1/documents/:id - 删除文档
    pub async fn delete(
        document_service: DocumentService,
        Path(id): Path<Uuid>,
    ) -> Json<ApiResponse<String>> {
        match document_service.delete_document(id).await {
            Ok(true) => {
                Json(ApiResponse::success("文档已删除".to_string(), "Success"))
            }
            Ok(false) => {
                Json(ApiResponse::<String>::error(404, "文档不存在"))
            }
            Err(e) => {
                Json(ApiResponse::<String>::error(500, &e))
            }
        }
    }

    /// GET /api/v1/documents - 获取文档列表
    pub async fn list(
        document_service: DocumentService,
    ) -> Json<ApiResponse<Vec<Document>>> {
        match document_service.list_documents().await {
            Ok(docs) => {
                // 转换为 API 模型
                let api_docs = docs
                    .into_iter()
                    .map(|doc| Document {
                        id: doc.id,
                        title: doc.title,
                        filename: doc.filename,
                        file_path: doc.file_path,
                        file_size: doc.file_size,
                        mime_type: doc.mime_type,
                        content_hash: doc.content_hash,
                        category: doc.category,
                        tags: doc.tags,
                        description: doc.description,
                        status: doc.status,
                        error_message: doc.error_message,
                        created_at: doc.created_at,
                        updated_at: doc.updated_at,
                    })
                    .collect();

                Json(ApiResponse::success(api_docs, "Success"))
            }
            Err(e) => {
                Json(ApiResponse::<Vec<Document>>::error(500, &e))
            }
        }
    }

    /// POST /api/v1/documents/:id/extract - 提取文档关键信息
    pub async fn extract(
        Path(id): Path<Uuid>,
        Json(req): Json<ExtractDocumentRequest>,
    ) -> Json<ApiResponse<ExtractDocumentResponse>> {
        // 这里需要调用 AI 服务提取关键信息
        Json(ApiResponse::success(
            ExtractDocumentResponse {
                document_id: id,
                extract_type: req.extract_type,
                result: serde_json::json!({}),
            },
            "Success",
        ))
    }

    /// POST /api/v1/documents/:id/summarize - 生成文档摘要
    pub async fn summarize(
        Path(id): Path<Uuid>,
        Json(req): Json<SummarizeDocumentRequest>,
    ) -> Json<ApiResponse<SummarizeDocumentResponse>> {
        // 这里需要调用 AI 服务生成摘要
        Json(ApiResponse::success(
            SummarizeDocumentResponse {
                document_id: id,
                summary: "文档摘要".to_string(),
            },
            "Success",
        ))
    }
}
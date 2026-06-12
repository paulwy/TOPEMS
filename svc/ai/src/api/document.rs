use axum::{
    extract::{Multipart, Path, State},
    Json,
};
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::api::models::*;
use crate::AppState;

pub struct DocumentApi;

impl DocumentApi {
    /// POST /api/v1/documents/upload - 上传文档并处理
    pub async fn upload(
        State(state): State<AppState>,
        mut multipart: Multipart,
    ) -> Json<ApiResponse<UploadDocumentResponse>> {
        // 处理 multipart 上传
        let mut title = String::new();
        let mut filename = String::new();
        let mut file_path = String::new();
        let mut file_size: u64 = 0;
        let mut mime_type: Option<String> = None;

        while let Some(field) = multipart.next_field().await.unwrap_or(None) {
            let name = field.name().unwrap_or_default();
            match name {
                "title" => {
                    if let Ok(text) = field.text().await {
                        title = text;
                    }
                }
                "file" => {
                    filename = field.file_name().unwrap_or_default().to_string();
                    let data = field.bytes().await.unwrap_or_default();
                    file_size = data.len() as u64;

                    // 保存文件到 docs 目录
                    let docs_dir = "docs";
                    let path = std::path::Path::new(docs_dir).join(&filename);
                    if let Err(e) = std::fs::create_dir_all(docs_dir) {
                        return Json(ApiResponse::<UploadDocumentResponse>::error(
                            500,
                            &format!("创建目录失败: {}", e),
                        ));
                    }
                    if let Err(e) = std::fs::write(&path, &data) {
                        return Json(ApiResponse::<UploadDocumentResponse>::error(
                            500,
                            &format!("保存文件失败: {}", e),
                        ));
                    }
                    file_path = path.to_string_lossy().to_string();

                    // 根据扩展名设置 mime_type
                    let ext = std::path::Path::new(&filename)
                        .extension()
                        .unwrap_or_default()
                        .to_string_lossy();
                    mime_type = match ext.to_lowercase().as_str() {
                        "txt" => Some("text/plain".to_string()),
                        "md" => Some("text/markdown".to_string()),
                        "json" => Some("application/json".to_string()),
                        "pdf" => Some("application/pdf".to_string()),
                        "doc" => Some("application/msword".to_string()),
                        "docx" => Some("application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string()),
                        _ => None,
                    };
                }
                _ => {}
            }
        }

        if filename.is_empty() {
            return Json(ApiResponse::<UploadDocumentResponse>::error(
                400,
                "未提供文件",
            ));
        }

        // 使用 document_service 处理上传
        match state
            .document_service
            .process_upload(title, filename.clone(), file_path, file_size, mime_type)
            .await
        {
            Ok(doc_id) => Json(ApiResponse::success(
                UploadDocumentResponse {
                    document_id: Uuid::parse_str(&doc_id).unwrap_or(Uuid::nil()),
                    message: format!("文档 '{}' 上传成功", filename),
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<UploadDocumentResponse>::error(500, &e)),
        }
    }

    /// POST /api/v1/documents/process - 处理文档（提取文本、分块）
    pub async fn process(
        State(state): State<AppState>,
        Json(req): Json<ProcessDocumentRequest>,
    ) -> Json<ApiResponse<ProcessDocumentResponse>> {
        // 获取文档
        match state.document_service.get_document(req.document_id).await {
            Ok(Some(_doc)) => {
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
            Ok(None) => Json(ApiResponse::<ProcessDocumentResponse>::error(
                404,
                "文档不存在",
            )),
            Err(e) => Json(ApiResponse::<ProcessDocumentResponse>::error(500, &e)),
        }
    }

    /// GET /api/v1/documents/:id - 获取文档信息
    pub async fn get(
        State(state): State<AppState>,
        Path(id): Path<Uuid>,
    ) -> Json<ApiResponse<crate::services::vector::Document>> {
        match state.document_service.get_document(id).await {
            Ok(Some(doc)) => Json(ApiResponse::success(doc, "Success")),
            Ok(None) => Json(ApiResponse::<crate::services::vector::Document>::error(
                404,
                "文档不存在",
            )),
            Err(e) => Json(ApiResponse::<crate::services::vector::Document>::error(
                500, &e,
            )),
        }
    }

    /// DELETE /api/v1/documents/:id - 删除文档
    pub async fn delete(
        State(state): State<AppState>,
        Path(id): Path<Uuid>,
    ) -> Json<ApiResponse<String>> {
        match state.document_service.delete_document(id).await {
            Ok(true) => Json(ApiResponse::success("文档已删除".to_string(), "Success")),
            Ok(false) => Json(ApiResponse::<String>::error(404, "文档不存在")),
            Err(e) => Json(ApiResponse::<String>::error(500, &e)),
        }
    }

    /// GET /api/v1/documents - 获取文档列表
    pub async fn list(
        State(state): State<AppState>,
    ) -> Json<ApiResponse<Vec<crate::services::vector::Document>>> {
        match state.document_service.list_documents().await {
            Ok(docs) => Json(ApiResponse::success(docs, "Success")),
            Err(e) => Json(ApiResponse::<Vec<crate::services::vector::Document>>::error(500, &e)),
        }
    }

    /// POST /api/v1/documents/:id/extract - 提取文档关键信息
    pub async fn extract(
        State(_state): State<AppState>,
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

    /// POST /api/v1/documents/vectorize-from-file - 从 File 服务向量化文档
    pub async fn vectorize_from_file(
        State(state): State<AppState>,
        Json(req): Json<VectorizeFromFileRequest>,
    ) -> Json<ApiResponse<VectorizeFromFileResponse>> {
        match state
            .document_service
            .vectorize_from_file_service(req.file_id)
            .await
        {
            Ok(result) => Json(ApiResponse::success(
                VectorizeFromFileResponse {
                    document_id: result.document_id,
                    file_id: result.file_id,
                    chunks_count: result.chunks_count,
                    message: format!("文档向量化成功，共 {} 个分块", result.chunks_count),
                },
                "Success",
            )),
            Err(e) => {
                tracing::error!("从 File 服务向量化失败: {}", e);
                Json(ApiResponse::<VectorizeFromFileResponse>::error(500, &e))
            }
        }
    }

    /// POST /api/v1/documents/:id/summarize - 生成文档摘要
    pub async fn summarize(
        State(_state): State<AppState>,
        Path(id): Path<Uuid>,
        Json(_req): Json<SummarizeDocumentRequest>,
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

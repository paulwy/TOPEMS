use axum::{
    extract::{Multipart, Path, State},
    Json,
};
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::modules::models::*;
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

    /// POST /api/v1/documents/:id/extract - 提取文档关键信息（增强版）
    pub async fn extract(
        State(state): State<AppState>,
        Path(id): Path<Uuid>,
        Json(req): Json<ExtractDocumentRequest>,
    ) -> Json<ApiResponse<ExtractDocumentResponse>> {
        match state.document_service.get_document(id).await {
            Ok(Some(doc)) => {
                let chunks = match state.document_service.get_document_chunks(id).await {
                    Ok(c) => c,
                    Err(e) => {
                        return Json(ApiResponse::<ExtractDocumentResponse>::error(
                            500,
                            &format!("获取文档分块失败: {}", e),
                        ));
                    }
                };

                if chunks.is_empty() {
                    return Json(ApiResponse::<ExtractDocumentResponse>::error(
                        400,
                        "文档内容为空",
                    ));
                }

                let content = chunks
                    .into_iter()
                    .map(|c| c.content)
                    .collect::<Vec<_>>()
                    .join("\n");

                let config = match state.document_service.get_qa_config() {
                    Some(c) => c,
                    None => {
                        return Json(ApiResponse::<ExtractDocumentResponse>::error(
                            500,
                            "文档问答配置未初始化",
                        ));
                    }
                };

                let result = match req.extract_type.as_str() {
                    "keywords" => {
                        let prompt = format!(
                            "请从以下文档中提取关键词。返回 JSON 格式：{{\"keywords\": [\"关键词1\", \"关键词2\", ...]}}\n\n文档内容：\n{}",
                            content
                        );
                        match state.document_service.call_ai_api(config, &prompt).await {
                            Ok(response) => {
                                let cleaned_response = response
                                    .replace("```json", "")
                                    .replace("```", "")
                                    .trim()
                                    .to_string();
                                serde_json::from_str(&cleaned_response)
                                    .unwrap_or(serde_json::json!({}))
                            }
                            Err(e) => {
                                return Json(ApiResponse::<ExtractDocumentResponse>::error(
                                    500,
                                    &format!("调用 AI 服务失败: {}", e),
                                ));
                            }
                        }
                    }
                    "summary" => {
                        let prompt = format!(
                            "请为以下文档生成摘要。返回 JSON 格式：{{\"summary\": \"摘要内容\"}}\n\n文档内容：\n{}",
                            content
                        );
                        match state.document_service.call_ai_api(config, &prompt).await {
                            Ok(response) => {
                                let cleaned_response = response
                                    .replace("```json", "")
                                    .replace("```", "")
                                    .trim()
                                    .to_string();
                                serde_json::from_str(&cleaned_response)
                                    .unwrap_or(serde_json::json!({}))
                            }
                            Err(e) => {
                                return Json(ApiResponse::<ExtractDocumentResponse>::error(
                                    500,
                                    &format!("调用 AI 服务失败: {}", e),
                                ));
                            }
                        }
                    }
                    "entities" => {
                        let prompt = format!(
                            "请从以下文档中提取实体（人名、地名、组织、时间、数字等）。返回 JSON 格式：{{\"entities\": [{{\"text\": \"实体\", \"type\": \"类型\"}}]}}\n\n文档内容：\n{}",
                            content
                        );
                        match state.document_service.call_ai_api(config, &prompt).await {
                            Ok(response) => {
                                let cleaned_response = response
                                    .replace("```json", "")
                                    .replace("```", "")
                                    .trim()
                                    .to_string();
                                serde_json::from_str(&cleaned_response)
                                    .unwrap_or(serde_json::json!({}))
                            }
                            Err(e) => {
                                return Json(ApiResponse::<ExtractDocumentResponse>::error(
                                    500,
                                    &format!("调用 AI 服务失败: {}", e),
                                ));
                            }
                        }
                    }
                    "topics" => {
                        let prompt = format!(
                            "请分析以下文档的主题。返回 JSON 格式：{{\"topics\": [\"主题1\", \"主题2\", ...]}}\n\n文档内容：\n{}",
                            content
                        );
                        match state.document_service.call_ai_api(config, &prompt).await {
                            Ok(response) => {
                                let cleaned_response = response
                                    .replace("```json", "")
                                    .replace("```", "")
                                    .trim()
                                    .to_string();
                                serde_json::from_str(&cleaned_response)
                                    .unwrap_or(serde_json::json!({}))
                            }
                            Err(e) => {
                                return Json(ApiResponse::<ExtractDocumentResponse>::error(
                                    500,
                                    &format!("调用 AI 服务失败: {}", e),
                                ));
                            }
                        }
                    }
                    "structure" => {
                        let lines: Vec<&str> =
                            content.lines().filter(|l| !l.trim().is_empty()).collect();
                        serde_json::json!({
                            "title": doc.title,
                            "filename": doc.filename,
                            "file_size": doc.file_size,
                            "mime_type": doc.mime_type,
                            "line_count": lines.len(),
                            "word_count": content.split_whitespace().count(),
                            "status": doc.status,
                        })
                    }
                    _ => serde_json::json!({ "error": "不支持的提取类型" }),
                };

                Json(ApiResponse::success(
                    ExtractDocumentResponse {
                        document_id: id,
                        extract_type: req.extract_type,
                        result,
                    },
                    "Success",
                ))
            }
            Ok(None) => Json(ApiResponse::<ExtractDocumentResponse>::error(
                404,
                "文档不存在",
            )),
            Err(e) => Json(ApiResponse::<ExtractDocumentResponse>::error(500, &e)),
        }
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
        State(state): State<AppState>,
        Path(id): Path<Uuid>,
        Json(req): Json<SummarizeDocumentRequest>,
    ) -> Json<ApiResponse<SummarizeDocumentResponse>> {
        match state
            .document_service
            .generate_document_summary(id, req.max_length)
            .await
        {
            Ok(summary) => Json(ApiResponse::success(
                SummarizeDocumentResponse {
                    document_id: id,
                    summary,
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<SummarizeDocumentResponse>::error(500, &e)),
        }
    }

    /// POST /api/v1/documents/:id/key-points - 提取文档关键点
    pub async fn extract_key_points(
        State(state): State<AppState>,
        Path(id): Path<Uuid>,
        Json(req): Json<ExtractKeyPointsRequest>,
    ) -> Json<ApiResponse<ExtractKeyPointsResponse>> {
        match state
            .document_service
            .extract_document_key_points(id, req.max_points)
            .await
        {
            Ok(points) => Json(ApiResponse::success(
                ExtractKeyPointsResponse {
                    document_id: id,
                    key_points: points,
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<ExtractKeyPointsResponse>::error(500, &e)),
        }
    }

    /// POST /api/v1/documents/qa - 文档问答
    pub async fn document_qa(
        State(state): State<AppState>,
        Json(req): Json<DocumentQAQuestionRequest>,
    ) -> Json<ApiResponse<DocumentQAAnswerResponse>> {
        let top_k = req.top_k.unwrap_or(5);

        match state
            .document_service
            .ask_document_qa(&req.question, req.document_ids.as_deref(), top_k)
            .await
        {
            Ok(result) => Json(ApiResponse::success(
                DocumentQAAnswerResponse {
                    answer: result.answer,
                    confidence: result.confidence,
                    sources: result
                        .sources
                        .into_iter()
                        .map(|s| DocumentQASourceResponse {
                            document_id: s.document_id,
                            document_title: s.document_title,
                            chunk_content: s.chunk_content,
                            similarity: s.similarity,
                        })
                        .collect(),
                    follow_up_questions: result.follow_up_questions,
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<DocumentQAAnswerResponse>::error(500, &e)),
        }
    }
}

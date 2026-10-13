use axum::{
    extract::{Extension, Multipart, Path, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::IntoResponse,
    Json,
};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::modules::models::*;
use crate::shared::AppState;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_event::event::commit_retry;

pub struct DocumentApi;

/// POST /api/documents/upload - 上传文档并处理
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/documents/upload",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
#[allow(clippy::as_conversions)]
pub async fn upload(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Json<ApiResponse<UploadDocumentResponse>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
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
                    let err_msg = format!("创建目录失败: {}", e);
                    if let Err(audit_err) = state
                        .audit
                        .log_document_operation(
                            "upload_document",
                            None,
                            user_id,
                            None,
                            "failed",
                            Some(&err_msg),
                        )
                        .await
                    {
                        tracing::warn!("ai audit failed: {audit_err}");
                    }
                    return Json(ApiResponse::<UploadDocumentResponse>::error(500, &err_msg));
                }
                if let Err(e) = std::fs::write(&path, &data) {
                    let err_msg = format!("保存文件失败: {}", e);
                    if let Err(audit_err) = state
                        .audit
                        .log_document_operation(
                            "upload_document",
                            None,
                            user_id,
                            None,
                            "failed",
                            Some(&err_msg),
                        )
                        .await
                    {
                        tracing::warn!("ai audit failed: {audit_err}");
                    }
                    return Json(ApiResponse::<UploadDocumentResponse>::error(500, &err_msg));
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
                    "docx" => Some(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            .to_string(),
                    ),
                    _ => None,
                };
            }
            _ => {}
        }
    }

    if filename.is_empty() {
        if let Err(e) = state
            .audit
            .log_document_operation(
                "upload_document",
                None,
                user_id,
                None,
                "failed",
                Some("未提供文件"),
            )
            .await
        {
            tracing::warn!("ai audit failed: {e}");
        }
        return Json(ApiResponse::<UploadDocumentResponse>::error(
            400,
            "未提供文件",
        ));
    }
    let details = Some(serde_json::json!({"filename": filename, "file_size": file_size}));

    // 使用 document_service 处理上传
    match state
        .document_service
        .process_upload(
            title,
            filename.clone(),
            file_path,
            file_size,
            mime_type.clone(),
            tenant_id,
        )
        .await
    {
        Ok(doc_id) => {
            let document_id = Uuid::parse_str(&doc_id).unwrap_or(Uuid::nil());
            if let Err(e) = state
                .audit
                .log_document_operation(
                    "upload_document",
                    Some(document_id),
                    user_id,
                    details.clone(),
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("ai audit failed: {e}");
            }

            // 发布 AiDocumentProcessed 事件（graceful fallback）
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let process_id = Uuid::new_v4();
                let document_name = filename.clone();
                let process_type = mime_type.clone();
                let extracted_data = serde_json::json!({
                    "file_size": file_size,
                    "mime_type": mime_type.clone(),
                    "tenant_id": tenant_id,
                    "processed_by": claims.sub.clone(),
                });
                tokio::spawn(async move {
                    let payload = topems_shared_event::event::AiDocumentProcessedPayload {
                        process_id,
                        document_id: Some(document_id),
                        document_name: Some(document_name.clone()),
                        process_type,
                        extracted_data,
                        processed_at: Some(chrono::Utc::now()),
                    };
                    let et = topems_shared_event::event::EventType::AiDocumentProcessed;
                    if let Err(e) = publisher.publish_event(et, &payload).await {
                        tracing::warn!(
                            "[ai] AiDocumentProcessed 事件发布失败（graceful fallback）: {}，入重试队列",
                            e
                        );
                        // D6：发布失败入 Redis ZSET，由 main.rs 15s run_relay 重发（typed 通道直重发 payload）。
                        commit_retry::push_retry_typed("ai", et, &payload).await;
                    } else {
                        tracing::info!(
                            "[ai] AiDocumentProcessed 事件发布成功 - doc_id={}",
                            document_id
                        );
                    }
                });
            }

            Json(ApiResponse::success(
                UploadDocumentResponse {
                    document_id,
                    message: format!("文档 '{}' 上传成功", filename),
                },
                "Success",
            ))
        }
        Err(e) => {
            let err_msg = e.to_string();
            if let Err(audit_err) = state
                .audit
                .log_document_operation(
                    "upload_document",
                    None,
                    user_id,
                    details,
                    "failed",
                    Some(&err_msg),
                )
                .await
            {
                tracing::warn!("ai audit failed: {audit_err}");
            }
            Json(ApiResponse::<UploadDocumentResponse>::error(
                500,
                &e.to_string(),
            ))
        }
    }
}

/// POST /api/documents/process - 处理文档（提取文本、分块）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/documents/{id}/process",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ProcessDocumentRequest>,
) -> Json<ApiResponse<ProcessDocumentResponse>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    // 获取文档
    match state
        .document_service
        .get_document(req.document_id, tenant_id)
        .await
    {
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
        Err(e) => Json(ApiResponse::<ProcessDocumentResponse>::error(
            500,
            &e.to_string(),
        )),
    }
}

/// GET /api/documents/{id} - 获取文档信息
pub async fn get(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<crate::services::vector::Document>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match state.document_service.get_document(id, tenant_id).await {
        Ok(Some(doc)) => Json(ApiResponse::success(doc, "Success")),
        Ok(None) => Json(ApiResponse::<crate::services::vector::Document>::error(
            404,
            "文档不存在",
        )),
        Err(e) => Json(ApiResponse::<crate::services::vector::Document>::error(
            500,
            &e.to_string(),
        )),
    }
}

/// GET /api/documents/{id}/download - 下载原始文档文件（附件流）
///
/// 前端契约（2026-10-06）：downloadDocument。upload 把原始文件落盘 docs/<filename>
/// 并把路径记入 document 记录（file_path）。此处取记录 → 读本地文件 →
/// application/octet-stream + Content-Disposition attachment 附件响应。
/// 记录不存在 → 内层 404；记录存在但本地文件缺失 → 404「文件不存在」。
pub async fn download(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let doc = match state.document_service.get_document(id, tenant_id).await {
        Ok(Some(doc)) => doc,
        Ok(None) => {
            return Json(ApiResponse::<serde_json::Value>::error(404, "文档不存在")).into_response()
        }
        Err(e) => {
            return Json(ApiResponse::<serde_json::Value>::error(500, &e.to_string()))
                .into_response()
        }
    };

    // upload 落盘路径优先取记录中的 file_path；兜底 docs/<filename>
    let file_path = doc
        .file_path
        .clone()
        .unwrap_or_else(|| format!("docs/{}", doc.filename));
    let bytes = match std::fs::read(&file_path) {
        Ok(b) => b,
        Err(_) => {
            return Json(ApiResponse::<serde_json::Value>::error(404, "文件不存在")).into_response()
        }
    };

    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/octet-stream"),
    );
    // 文件名可能含非 ASCII/引号，构造失败时退化为固定名
    let disposition = format!("attachment; filename=\"{}\"", doc.filename);
    match HeaderValue::from_str(&disposition) {
        Ok(v) => {
            headers.insert(header::CONTENT_DISPOSITION, v);
        }
        Err(_) => {
            headers.insert(
                header::CONTENT_DISPOSITION,
                HeaderValue::from_static("attachment; filename=\"download\""),
            );
        }
    }

    (StatusCode::OK, headers, bytes).into_response()
}

/// DELETE /api/documents/{id} - 删除文档
pub async fn delete(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    match state.document_service.delete_document(id, tenant_id).await {
        Ok(true) => {
            if let Err(e) = state
                .audit
                .log_document_operation("delete_document", Some(id), user_id, None, "success", None)
                .await
            {
                tracing::warn!("ai audit failed: {e}");
            }
            Json(ApiResponse::success("文档已删除".to_string(), "Success"))
        }
        Ok(false) => {
            if let Err(e) = state
                .audit
                .log_document_operation(
                    "delete_document",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some("文档不存在"),
                )
                .await
            {
                tracing::warn!("ai audit failed: {e}");
            }
            Json(ApiResponse::<String>::error(404, "文档不存在"))
        }
        Err(e) => {
            let err_msg = e.to_string();
            if let Err(audit_err) = state
                .audit
                .log_document_operation(
                    "delete_document",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some(&err_msg),
                )
                .await
            {
                tracing::warn!("ai audit failed: {audit_err}");
            }
            Json(ApiResponse::<String>::error(500, &e.to_string()))
        }
    }
}

/// GET /api/documents - 获取文档列表
pub async fn list(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<crate::services::vector::Document>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match state.document_service.list_documents(tenant_id).await {
        Ok(docs) => Json(ApiResponse::success(docs, "Success")),
        Err(e) => {
            Json(ApiResponse::<Vec<crate::services::vector::Document>>::error(500, &e.to_string()))
        }
    }
}

/// POST /api/documents - 创建文档（JSON 元数据）
pub async fn create(
    State(_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::debug!("Creating document: {:?}", req);
    Json(ApiResponse::success(req, "文档创建成功"))
}

/// PUT /api/documents/{id} - 更新文档元数据
pub async fn update(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::debug!("Updating document {}: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({ "id": id, "updated": req }),
        "文档更新成功",
    ))
}

/// POST /api/documents/{id}/extract - 提取文档关键信息（增强版）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/documents/{id}/extract",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn extract(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ExtractDocumentRequest>,
) -> Json<ApiResponse<ExtractDocumentResponse>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match state.document_service.get_document(id, tenant_id).await {
        Ok(Some(doc)) => {
            let chunks = match state
                .document_service
                .get_document_chunks(id, tenant_id)
                .await
            {
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
                            serde_json::from_str(&cleaned_response).unwrap_or(serde_json::json!({}))
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
                            serde_json::from_str(&cleaned_response).unwrap_or(serde_json::json!({}))
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
                            serde_json::from_str(&cleaned_response).unwrap_or(serde_json::json!({}))
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
                            serde_json::from_str(&cleaned_response).unwrap_or(serde_json::json!({}))
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
        Err(e) => Json(ApiResponse::<ExtractDocumentResponse>::error(
            500,
            &e.to_string(),
        )),
    }
}

/// POST /api/documents/vectorize-from-file - 从 File 服务向量化文档
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/documents/vectorize-from-file",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn vectorize_from_file(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<VectorizeFromFileRequest>,
) -> Json<ApiResponse<VectorizeFromFileResponse>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match state
        .document_service
        .vectorize_from_file_service(req.file_id, tenant_id)
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
            Json(ApiResponse::<VectorizeFromFileResponse>::error(
                500,
                &e.to_string(),
            ))
        }
    }
}

/// POST /api/documents/{id}/summarize - 生成文档摘要
pub async fn summarize(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<SummarizeDocumentRequest>,
) -> Json<ApiResponse<SummarizeDocumentResponse>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match state
        .document_service
        .generate_document_summary(id, req.max_length, tenant_id)
        .await
    {
        Ok(summary) => Json(ApiResponse::success(
            SummarizeDocumentResponse {
                document_id: id,
                summary,
            },
            "Success",
        )),
        Err(e) => Json(ApiResponse::<SummarizeDocumentResponse>::error(
            500,
            &e.to_string(),
        )),
    }
}

/// POST /api/documents/{id}/key-points - 提取文档关键点
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/documents/{id}/key-points",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn extract_key_points(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<ExtractKeyPointsRequest>,
) -> Json<ApiResponse<ExtractKeyPointsResponse>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    match state
        .document_service
        .extract_document_key_points(id, req.max_points, tenant_id)
        .await
    {
        Ok(points) => Json(ApiResponse::success(
            ExtractKeyPointsResponse {
                document_id: id,
                key_points: points,
            },
            "Success",
        )),
        Err(e) => {
            // 文档不存在 / 无内容（RowNotFound 语义）→ 内层 404，而非 500（web 契约收口）
            let msg = e.to_string();
            if msg.contains("文档内容为空") || msg.contains("文档不存在") {
                Json(ApiResponse::<ExtractKeyPointsResponse>::error(
                    404,
                    "文档不存在",
                ))
            } else {
                Json(ApiResponse::<ExtractKeyPointsResponse>::error(500, &msg))
            }
        }
    }
}

/// POST /api/documents/qa - 文档问答
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/documents/qa",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn document_qa(
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<DocumentQAQuestionRequest>,
) -> Json<ApiResponse<DocumentQAAnswerResponse>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let top_k = req.top_k.unwrap_or(5);

    match state
        .document_service
        .ask_document_qa(&req.question, req.document_ids.as_deref(), top_k, tenant_id)
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
        Err(e) => Json(ApiResponse::<DocumentQAAnswerResponse>::error(
            500,
            &e.to_string(),
        )),
    }
}

// ============ 前端契约收口（2026-10-06）：documents 轻量兜底端点 ============
// 这些端点前端已约定（translate / ocr / classify / entities），但 crate 内尚无真实
// LLM/OCR/分类上游实现。按契约策略：先校验文档存在性（不存在则内层 404），存在则
// 返回空结果占位并标注“待上游支持”，禁止裸 404。

/// 校验文档是否存在；不存在则提前返回内层 404 Json。
macro_rules! doc_not_found_or_ok {
    ($state:expr, $id:expr, $tenant:expr) => {
        match $state.document_service.get_document($id, $tenant).await {
            Ok(Some(_)) => {}
            Ok(None) => {
                return Json(ApiResponse::<serde_json::Value>::error(404, "文档不存在"));
            }
            Err(e) => {
                return Json(ApiResponse::<serde_json::Value>::error(500, &e.to_string()));
            }
        }
    };
}

/// POST /api/documents/{id}/translate - 文档翻译（待上游支持）
pub async fn translate(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    doc_not_found_or_ok!(state, id, tenant_id);
    Json(ApiResponse::success(
        serde_json::json!({
            "document_id": id,
            "translated_content": "",
            "target_language": req.get("target_language").and_then(|v| v.as_str()).unwrap_or(""),
            "source_language": req.get("source_language").and_then(|v| v.as_str()).unwrap_or(""),
            "_note": "待上游支持"
        }),
        "Success",
    ))
}

/// POST /api/documents/{id}/ocr - 文档 OCR（待上游支持）
pub async fn ocr(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    doc_not_found_or_ok!(state, id, tenant_id);
    Json(ApiResponse::success(
        serde_json::json!({
            "document_id": id,
            "text": "",
            "pages": 0,
            "confidence": 0.0,
            "_note": "待上游支持"
        }),
        "Success",
    ))
}

/// POST /api/documents/{id}/classify - 文档分类（待上游支持）
pub async fn classify(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    doc_not_found_or_ok!(state, id, tenant_id);
    Json(ApiResponse::success(
        serde_json::json!({
            "document_id": id,
            "category": "uncategorized",
            "confidence": 0.0,
            "all_categories": [],
            "_note": "待上游支持"
        }),
        "Success",
    ))
}

/// POST /api/documents/{id}/entities - 文档实体抽取（待上游支持）
pub async fn entities(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    doc_not_found_or_ok!(state, id, tenant_id);
    Json(ApiResponse::success(
        serde_json::json!({
            "document_id": id,
            "entities": [],
            "_note": "待上游支持"
        }),
        "Success",
    ))
}

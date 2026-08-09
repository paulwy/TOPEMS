use axum::{extract::Extension, extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::models::*;
use crate::shared::AppState;

pub fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .clone()
        .and_then(|id| Uuid::parse_str(&id).ok())
        .unwrap_or(Uuid::nil())
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AskStructuredRequest {
    pub question: String,
    pub document_ids: Option<Vec<Uuid>>,
    pub top_k: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AskStructuredResponse {
    pub answer: String,
    pub question_type: String,
    pub confidence: f64,
    pub sources: Vec<String>,
    pub follow_up_questions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AskWithConversationRequest {
    pub question: String,
    pub history: Vec<HistoryItem>,
    pub document_ids: Option<Vec<Uuid>>,
    pub top_k: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HistoryItem {
    pub question: String,
    pub answer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ClassifyRequest {
    pub question: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassifyResponse {
    pub question_type: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QaHistoryQuery {
    pub page: Option<usize>,
    pub page_size: Option<usize>,
    pub query: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BatchDeleteRequest {
    pub ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchDeleteResponse {
    pub deleted_count: i32,
    pub message: String,
}

pub struct QaApi;

impl QaApi {
    /// POST /api/qa/ask - 提问并获取答案
    pub async fn ask(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<AskRequest>,
    ) -> Json<ApiResponse<AskResponse>> {
        let tenant_id = get_tenant_id(&claims);
        let top_k = req.top_k.unwrap_or(5);

        // 先进行向量搜索获取上下文
        // 注意：这里需要生成查询向量
        let query_embedding: Vec<f32> = vec![0.0; 768]; // 示例向量

        let context_chunks = state
            .vector_service
            .search_similar(&query_embedding, top_k, tenant_id)
            .await
            .unwrap_or_default();

        // 构建上下文
        let context = if !context_chunks.is_empty() {
            Some(
                context_chunks
                    .iter()
                    .map(|chunk| chunk.content.as_str())
                    .collect::<Vec<_>>()
                    .join("\n\n"),
            )
        } else {
            None
        };

        // 调用 QA 服务
        match state
            .qa_service
            .ask(&req.question, context.as_deref(), top_k, tenant_id)
            .await
        {
            Ok((answer, sources, qa_id, confidence)) => Json(ApiResponse::success(
                AskResponse {
                    answer,
                    sources,
                    qa_id,
                    confidence,
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<AskResponse>::error(500, &e)),
        }
    }

    /// POST /api/qa/ask-with-context - 基于文档上下文提问
    pub async fn ask_with_context(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<AskWithContextRequest>,
    ) -> Json<ApiResponse<AskResponse>> {
        let tenant_id = get_tenant_id(&claims);
        let top_k = req.top_k.unwrap_or(5);

        // 获取指定文档的上下文
        let mut context_chunks: Vec<crate::services::vector::SearchResult> = vec![];
        for doc_id in &req.document_ids {
            if let Ok(chunks) = state
                .vector_service
                .get_document_chunks(*doc_id, tenant_id)
                .await
            {
                for chunk in chunks {
                    context_chunks.push(crate::services::vector::SearchResult {
                        document_id: chunk.document_id,
                        chunk_id: chunk.id,
                        content: chunk.content,
                        similarity: 1.0,
                        document_title: None,
                    });
                }
            }
        }

        // 限制数量
        context_chunks.truncate(top_k);

        // 调用 QA 服务
        match state
            .qa_service
            .ask_with_context(&req.question, &req.document_ids, &context_chunks, tenant_id)
            .await
        {
            Ok((answer, sources, qa_id, confidence)) => Json(ApiResponse::success(
                AskResponse {
                    answer,
                    sources,
                    qa_id,
                    confidence,
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<AskResponse>::error(500, &e)),
        }
    }

    /// POST /api/qa/ask-structured - 获取结构化回答
    pub async fn ask_structured(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<AskStructuredRequest>,
    ) -> Json<ApiResponse<AskStructuredResponse>> {
        let tenant_id = get_tenant_id(&claims);
        let top_k = req.top_k.unwrap_or(5);

        // 获取指定文档的上下文
        let mut context_chunks: Vec<crate::services::vector::SearchResult> = vec![];
        if let Some(doc_ids) = &req.document_ids {
            for doc_id in doc_ids {
                if let Ok(chunks) = state
                    .vector_service
                    .get_document_chunks(*doc_id, tenant_id)
                    .await
                {
                    for chunk in chunks {
                        context_chunks.push(crate::services::vector::SearchResult {
                            document_id: chunk.document_id,
                            chunk_id: chunk.id,
                            content: chunk.content,
                            similarity: 1.0,
                            document_title: None,
                        });
                    }
                }
            }
        }

        // 限制数量
        context_chunks.truncate(top_k);

        // 调用结构化问答服务
        match state
            .qa_service
            .ask_structured(&req.question, &context_chunks, tenant_id)
            .await
        {
            Ok(result) => Json(ApiResponse::success(
                AskStructuredResponse {
                    answer: result.answer,
                    question_type: format!("{:?}", result.question_type),
                    confidence: result.confidence,
                    sources: result.sources,
                    follow_up_questions: result.follow_up_questions,
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<AskStructuredResponse>::error(500, &e)),
        }
    }

    /// POST /api/qa/ask-conversation - 多轮对话
    pub async fn ask_conversation(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<AskWithConversationRequest>,
    ) -> Json<ApiResponse<AskResponse>> {
        let tenant_id = get_tenant_id(&claims);
        let top_k = req.top_k.unwrap_or(5);

        // 获取指定文档的上下文
        let mut context_chunks: Vec<crate::services::vector::SearchResult> = vec![];
        if let Some(doc_ids) = &req.document_ids {
            for doc_id in doc_ids {
                if let Ok(chunks) = state
                    .vector_service
                    .get_document_chunks(*doc_id, tenant_id)
                    .await
                {
                    for chunk in chunks {
                        context_chunks.push(crate::services::vector::SearchResult {
                            document_id: chunk.document_id,
                            chunk_id: chunk.id,
                            content: chunk.content,
                            similarity: 1.0,
                            document_title: None,
                        });
                    }
                }
            }
        }

        // 限制数量
        context_chunks.truncate(top_k);

        // 转换对话历史格式
        let history: Vec<(String, String)> = req
            .history
            .into_iter()
            .map(|item| (item.question, item.answer))
            .collect();

        // 调用多轮对话服务
        match state
            .qa_service
            .ask_with_conversation(&req.question, &history, &context_chunks, tenant_id)
            .await
        {
            Ok((answer, sources, qa_id, confidence)) => Json(ApiResponse::success(
                AskResponse {
                    answer,
                    sources,
                    qa_id,
                    confidence,
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<AskResponse>::error(500, &e)),
        }
    }

    /// POST /api/qa/classify - 分类问题类型
    pub async fn classify(
        State(state): State<AppState>,
        Json(req): Json<ClassifyRequest>,
    ) -> Json<ApiResponse<ClassifyResponse>> {
        match state.qa_service.classify_question(&req.question).await {
            Ok(question_type) => Json(ApiResponse::success(
                ClassifyResponse {
                    question_type: format!("{:?}", question_type),
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<ClassifyResponse>::error(500, &e)),
        }
    }

    /// GET /api/qa/history - 获取问答历史（支持分页和搜索）
    pub async fn history(
        State(state): State<AppState>,
        Query(params): Query<QaHistoryQuery>,
        Extension(claims): Extension<Claims>,
    ) -> Json<ApiResponse<QAHistoryResponse>> {
        let tenant_id = get_tenant_id(&claims);
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(20);
        let offset = (page - 1) * page_size;

        let (history, total) = if let Some(query) = params.query.as_deref() {
            match state
                .qa_service
                .search_qa_history(query, offset, page_size, tenant_id)
                .await
            {
                Ok(history) => match state
                    .qa_service
                    .search_qa_history_count(query, tenant_id)
                    .await
                {
                    Ok(total) => (history, total as i32),
                    Err(e) => return Json(ApiResponse::<QAHistoryResponse>::error(500, &e)),
                },
                Err(e) => return Json(ApiResponse::<QAHistoryResponse>::error(500, &e)),
            }
        } else {
            match state
                .qa_service
                .get_qa_history_paged(offset, page_size, tenant_id)
                .await
            {
                Ok(history) => match state.qa_service.get_qa_history_count(tenant_id).await {
                    Ok(total) => (history, total as i32),
                    Err(e) => return Json(ApiResponse::<QAHistoryResponse>::error(500, &e)),
                },
                Err(e) => return Json(ApiResponse::<QAHistoryResponse>::error(500, &e)),
            }
        };

        Json(ApiResponse::success(
            QAHistoryResponse { history, total },
            "Success",
        ))
    }

    /// DELETE /api/qa/history/{id} - 删除单条问答历史
    pub async fn delete_history(
        State(state): State<AppState>,
        Path(id): Path<Uuid>,
        Extension(claims): Extension<Claims>,
    ) -> Json<ApiResponse<String>> {
        let tenant_id = get_tenant_id(&claims);
        match state.qa_service.delete_qa_history(id, tenant_id).await {
            Ok(true) => Json(ApiResponse::success("删除成功".to_string(), "Success")),
            Ok(false) => Json(ApiResponse::<String>::error(404, "记录不存在")),
            Err(e) => Json(ApiResponse::<String>::error(500, &e)),
        }
    }

    /// POST /api/qa/history/batch-delete - 批量删除问答历史
    pub async fn batch_delete_history(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<BatchDeleteRequest>,
    ) -> Json<ApiResponse<BatchDeleteResponse>> {
        let tenant_id = get_tenant_id(&claims);
        match state
            .qa_service
            .batch_delete_qa_history(&req.ids, tenant_id)
            .await
        {
            Ok(count) => Json(ApiResponse::success(
                BatchDeleteResponse {
                    deleted_count: count as i32,
                    message: format!("成功删除 {} 条记录", count),
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<BatchDeleteResponse>::error(500, &e)),
        }
    }

    /// POST /api/qa/feedback - 提交答案反馈
    pub async fn feedback(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<FeedbackRequest>,
    ) -> Json<ApiResponse<FeedbackResponse>> {
        let tenant_id = get_tenant_id(&claims);
        match state
            .qa_service
            .submit_feedback(req.qa_id, &req.feedback, req.rating, tenant_id)
            .await
        {
            Ok(_) => Json(ApiResponse::success(
                FeedbackResponse {
                    qa_id: req.qa_id,
                    message: "反馈已提交".to_string(),
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<FeedbackResponse>::error(500, &e)),
        }
    }
}

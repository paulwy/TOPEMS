use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::api::models::*;
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AskWithConversationRequest {
    pub question: String,
    pub history: Vec<HistoryItem>,
    pub document_ids: Option<Vec<Uuid>>,
    pub top_k: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryItem {
    pub question: String,
    pub answer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassifyRequest {
    pub question: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassifyResponse {
    pub question_type: String,
}

pub struct QaApi;

impl QaApi {
    /// POST /api/v1/qa/ask - 提问并获取答案
    pub async fn ask(
        State(state): State<AppState>,
        Json(req): Json<AskRequest>,
    ) -> Json<ApiResponse<AskResponse>> {
        let top_k = req.top_k.unwrap_or(5);

        // 先进行向量搜索获取上下文
        // 注意：这里需要生成查询向量
        let query_embedding: Vec<f32> = vec![0.0; 768]; // 示例向量

        let context_chunks = state
            .vector_service
            .search_similar(&query_embedding, top_k)
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
            .ask(&req.question, context.as_deref(), top_k)
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

    /// POST /api/v1/qa/ask-with-context - 基于文档上下文提问
    pub async fn ask_with_context(
        State(state): State<AppState>,
        Json(req): Json<AskWithContextRequest>,
    ) -> Json<ApiResponse<AskResponse>> {
        let top_k = req.top_k.unwrap_or(5);

        // 获取指定文档的上下文
        let mut context_chunks: Vec<crate::services::vector::SearchResult> = vec![];
        for doc_id in &req.document_ids {
            if let Ok(chunks) = state.vector_service.get_document_chunks(*doc_id).await {
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
            .ask_with_context(&req.question, &req.document_ids, &context_chunks)
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

    /// POST /api/v1/qa/ask-structured - 获取结构化回答
    pub async fn ask_structured(
        State(state): State<AppState>,
        Json(req): Json<AskStructuredRequest>,
    ) -> Json<ApiResponse<AskStructuredResponse>> {
        let top_k = req.top_k.unwrap_or(5);

        // 获取指定文档的上下文
        let mut context_chunks: Vec<crate::services::vector::SearchResult> = vec![];
        if let Some(doc_ids) = &req.document_ids {
            for doc_id in doc_ids {
                if let Ok(chunks) = state.vector_service.get_document_chunks(*doc_id).await {
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
            .ask_structured(&req.question, &context_chunks)
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

    /// POST /api/v1/qa/ask-conversation - 多轮对话
    pub async fn ask_conversation(
        State(state): State<AppState>,
        Json(req): Json<AskWithConversationRequest>,
    ) -> Json<ApiResponse<AskResponse>> {
        let top_k = req.top_k.unwrap_or(5);

        // 获取指定文档的上下文
        let mut context_chunks: Vec<crate::services::vector::SearchResult> = vec![];
        if let Some(doc_ids) = &req.document_ids {
            for doc_id in doc_ids {
                if let Ok(chunks) = state.vector_service.get_document_chunks(*doc_id).await {
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
            .ask_with_conversation(&req.question, &history, &context_chunks)
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

    /// POST /api/v1/qa/classify - 分类问题类型
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

    /// GET /api/v1/qa/history - 获取问答历史
    pub async fn history(State(state): State<AppState>) -> Json<ApiResponse<QAHistoryResponse>> {
        match state.qa_service.get_qa_history(100).await {
            Ok(history) => {
                let total = history.len() as i32;
                Json(ApiResponse::success(
                    QAHistoryResponse { history, total },
                    "Success",
                ))
            }
            Err(e) => Json(ApiResponse::<QAHistoryResponse>::error(500, &e)),
        }
    }

    /// POST /api/v1/qa/feedback - 提交答案反馈
    pub async fn feedback(
        State(state): State<AppState>,
        Json(req): Json<FeedbackRequest>,
    ) -> Json<ApiResponse<FeedbackResponse>> {
        match state
            .qa_service
            .submit_feedback(req.qa_id, &req.feedback, req.rating)
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

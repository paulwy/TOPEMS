use axum::Json;
use topems_shared::ApiResponse;

use crate::api::models::*;
use crate::services::{QAService, VectorService};

pub struct QaApi;

impl QaApi {
    /// POST /api/v1/qa/ask - 提问并获取答案
    pub async fn ask(
        qa_service: QAService,
        vector_service: VectorService,
        Json(req): Json<AskRequest>,
    ) -> Json<ApiResponse<AskResponse>> {
        let top_k = req.top_k.unwrap_or(5);

        // 先进行向量搜索获取上下文
        // 注意：这里需要生成查询向量
        let query_embedding: Vec<f32> = vec![0.0; 768]; // 示例向量

        let context_chunks = match vector_service.search_similar(&query_embedding, top_k).await {
            Ok(results) => results,
            Err(_) => vec![],
        };

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
        match qa_service.ask(&req.question, context.as_deref(), top_k).await {
            Ok((answer, sources, qa_id, confidence)) => {
                Json(ApiResponse::success(
                    AskResponse {
                        answer,
                        sources,
                        qa_id,
                        confidence,
                    },
                    "Success",
                ))
            }
            Err(e) => {
                Json(ApiResponse::<AskResponse>::error(500, &e))
            }
        }
    }

    /// POST /api/v1/qa/ask-with-context - 基于文档上下文提问
    pub async fn ask_with_context(
        qa_service: QAService,
        vector_service: VectorService,
        Json(req): Json<AskWithContextRequest>,
    ) -> Json<ApiResponse<AskResponse>> {
        let top_k = req.top_k.unwrap_or(5);

        // 获取指定文档的上下文
        let mut context_chunks = vec![];
        for doc_id in &req.document_ids {
            if let Ok(chunks) = vector_service.get_document_chunks(*doc_id).await {
                for chunk in chunks {
                    context_chunks.push(SearchResult {
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
        match qa_service
            .ask_with_context(&req.question, &req.document_ids, &context_chunks)
            .await
        {
            Ok((answer, sources, qa_id, confidence)) => {
                Json(ApiResponse::success(
                    AskResponse {
                        answer,
                        sources,
                        qa_id,
                        confidence,
                    },
                    "Success",
                ))
            }
            Err(e) => {
                Json(ApiResponse::<AskResponse>::error(500, &e))
            }
        }
    }

    /// GET /api/v1/qa/history - 获取问答历史
    pub async fn history(qa_service: QAService) -> Json<ApiResponse<QAHistoryResponse>> {
        match qa_service.get_qa_history(100).await {
            Ok(history) => {
                let total = history.len() as i32;
                Json(ApiResponse::success(
                    QAHistoryResponse {
                        history,
                        total,
                    },
                    "Success",
                ))
            }
            Err(e) => {
                Json(ApiResponse::<QAHistoryResponse>::error(500, &e))
            }
        }
    }

    /// POST /api/v1/qa/feedback - 提交答案反馈
    pub async fn feedback(
        qa_service: QAService,
        Json(req): Json<FeedbackRequest>,
    ) -> Json<ApiResponse<FeedbackResponse>> {
        match qa_service.submit_feedback(req.qa_id, &req.feedback, req.rating).await {
            Ok(_) => {
                Json(ApiResponse::success(
                    FeedbackResponse {
                        qa_id: req.qa_id,
                        message: "反馈已提交".to_string(),
                    },
                    "Success",
                ))
            }
            Err(e) => {
                Json(ApiResponse::<FeedbackResponse>::error(500, &e))
            }
        }
    }
}
//! AI Module API Handlers

use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use std::time::Instant;
use topems_shared::ApiResponse;

use super::models::*;
use super::AIService;

/// 创建 AI 路由
pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        // 聊天
        .route("/api/core/ai/chat", post(chat))
        // 生成
        .route("/api/core/ai/generate", post(generate))
        // 摘要
        .route("/api/core/ai/summarize", post(summarize))
        // 模板
        .route("/api/core/ai/templates", get(list_templates))
        // 向量统计
        .route("/api/core/ai/vectors/stats", get(vector_stats))
        // 向量搜索
        .route("/api/core/ai/vectors/search", post(vector_search))
        // 清空向量
        .route("/api/core/ai/vectors/clear", post(clear_vectors))
        // 健康检查
        .route("/api/core/ai/health", get(ai_health))
}

/// POST /api/core/ai/chat - 智能对话
pub async fn chat(
    State(state): State<crate::AppState>,
    Json(req): Json<ChatRequest>,
) -> Json<ApiResponse<ChatResponse>> {
    let context = req
        .context
        .and_then(|c| c.get("context").and_then(|v| v.as_str()).map(|s| s.to_string()));

    match state.ai_service.chat(&req.query, context.as_deref()).await {
        Ok(response) => Json(ApiResponse::success(response, "Success")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

/// POST /api/core/ai/generate - 内容生成
pub async fn generate(
    State(state): State<crate::AppState>,
    Json(req): Json<GenerateRequest>,
) -> Json<ApiResponse<GenerateResponse>> {
    match state.ai_service.generate(&req.prompt).await {
        Ok(content) => Json(ApiResponse::success(
            GenerateResponse {
                content,
                format: req.output_format.unwrap_or_else(|| "text".to_string()),
            },
            "Success",
        )),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

/// POST /api/core/ai/summarize - 文本摘要
pub async fn summarize(
    State(state): State<crate::AppState>,
    Json(req): Json<SummarizeRequest>,
) -> Json<ApiResponse<SummarizeResponse>> {
    match state.ai_service.summarize(&req.text, req.max_length).await {
        Ok(summary) => Json(ApiResponse::success(SummarizeResponse { summary }, "Success")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

/// GET /api/core/ai/templates - 获取 AI 模板列表
pub async fn list_templates() -> Json<ApiResponse<Vec<AITemplate>>> {
    let templates = AIService::get_templates();
    Json(ApiResponse::success(templates, "Success"))
}

/// GET /api/core/ai/vectors/stats - 获取向量统计
pub async fn vector_stats(State(state): State<crate::AppState>) -> Json<ApiResponse<VectorStats>> {
    match state.ai_service.get_stats().await {
        Ok(stats) => Json(ApiResponse::success(stats, "Success")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// POST /api/core/ai/vectors/search - 向量搜索
pub async fn vector_search(
    State(state): State<crate::AppState>,
    Json(_req): Json<VectorSearchRequest>,
) -> Json<ApiResponse<VectorSearchResponse>> {
    let start = Instant::now();

    // 注意：实际应用中需要调用嵌入模型生成查询向量
    let query_embedding: Vec<f32> = vec![0.0; 768];

    match state.ai_service.vector_search(&query_embedding, _req.top_k.unwrap_or(10)).await {
        Ok(results) => {
            let query_time_ms = start.elapsed().as_millis() as u64;
            Json(ApiResponse::success(
                VectorSearchResponse {
                    results,
                    query_time_ms,
                },
                "Success",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// POST /api/core/ai/vectors/clear - 清空向量数据
pub async fn clear_vectors(State(state): State<crate::AppState>) -> Json<ApiResponse<String>> {
    match state.ai_service.clear_all().await {
        Ok(_) => Json(ApiResponse::success("向量数据已清空".to_string(), "Success")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// GET /api/core/ai/health - AI 服务健康检查
pub async fn ai_health(State(state): State<crate::AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let stats = state.ai_service.get_stats().await;

    let health = serde_json::json!({
        "status": if stats.is_ok() { "healthy" } else { "degraded" },
        "service": "ai",
        "config": {
            "model": state.ai_service.config.model,
            "base_url": state.ai_service.config.base_url,
        },
        "stats": stats.ok()
    });

    Json(ApiResponse::success(health, "AI service health check"))
}

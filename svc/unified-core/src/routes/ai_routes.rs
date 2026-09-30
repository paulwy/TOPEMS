//! AI 人工智能模块路由

use axum::{routing::get, Router};

use crate::modules::ai::handlers;
use crate::AppState;

/// AI 模块路由
pub fn ai_router() -> Router<AppState> {
    Router::new()
        // AI模型列表（真实数据库查询）
        .route("/api/ai/models", get(handlers::list_ai_models))
        // AI提示词模板列表（真实数据库查询）
        .route(
            "/api/ai/prompt-templates",
            get(handlers::list_ai_prompt_templates),
        )
        // AI文档列表（真实数据库查询）
        .route("/api/ai/documents", get(handlers::list_ai_documents))
        // AI问答历史列表（真实数据库查询）
        .route("/api/ai/qa-history", get(handlers::list_ai_qa_history))
}

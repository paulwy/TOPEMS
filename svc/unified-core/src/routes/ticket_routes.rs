//! Ticket 工单模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::ticket::handlers;
use crate::AppState;

/// Ticket 模块路由
pub fn ticket_router() -> Router<AppState> {
    Router::new()
        // 工单列表（真实数据库查询）
        .route("/api/ticket/tickets", get(handlers::list_tickets))
        // 工单评论列表（真实数据库查询）
        .route("/api/ticket/comments", get(handlers::list_ticket_comments))
        // SLA策略列表（真实数据库查询）
        .route("/api/ticket/sla-policies", get(handlers::list_ticket_sla_policies))
        // 知识库文章列表（真实数据库查询）
        .route("/api/ticket/knowledge-articles", get(handlers::list_knowledge_articles))
}

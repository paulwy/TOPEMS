//! Portal 门户模块路由

use axum::{routing::get, Router};

use crate::modules::portal::handlers;
use crate::AppState;

/// Portal 模块路由
pub fn portal_router() -> Router<AppState> {
    Router::new()
        // 公告列表（真实数据库查询）
        .route(
            "/api/portal/announcements",
            get(handlers::list_announcements),
        )
        // 常见问题列表（真实数据库查询）
        .route("/api/portal/faqs", get(handlers::list_faqs))
        // 待办事项列表（真实数据库查询）
        .route("/api/portal/todos", get(handlers::list_todos))
        // 指南列表（真实数据库查询）
        .route("/api/portal/guides", get(handlers::list_guides))
}

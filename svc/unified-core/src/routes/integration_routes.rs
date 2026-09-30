//! Integration 集成模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::integration::handlers;
use crate::AppState;

/// Integration 模块路由
pub fn integration_router() -> Router<AppState> {
    Router::new()
        // 异步任务列表（真实数据库查询）
        .route("/api/integration/async-tasks", get(handlers::list_async_tasks))
        // 集成事件列表（真实数据库查询）
        .route("/api/integration/events", get(handlers::list_integration_events))
        // ERP连接列表（真实数据库查询）
        .route("/api/integration/erp-connections", get(handlers::list_erp_connections))
        // ERP映射列表（真实数据库查询）
        .route("/api/integration/erp-mappings", get(handlers::list_erp_mappings))
}

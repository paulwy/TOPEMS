//! EHS 环境健康安全模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::ehs::handlers;
use crate::AppState;

/// EHS 模块路由
pub fn ehs_router() -> Router<AppState> {
    Router::new()
        // 事故列表（真实数据库查询）
        .route("/api/ehs/accidents", get(handlers::list_accidents))
        // 隐患列表（真实数据库查询）
        .route("/api/ehs/hazards", get(handlers::list_hazards))
}

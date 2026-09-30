//! RD 研发模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::rd::handlers;
use crate::AppState;

/// RD 模块路由
pub fn rd_router() -> Router<AppState> {
    Router::new()
        // Bug列表（真实数据库查询）
        .route("/api/rd/bugs", get(handlers::list_bugs))
        // 测试用例列表（真实数据库查询）
        .route("/api/rd/test-cases", get(handlers::list_test_cases))
        // 构建列表（真实数据库查询）
        .route("/api/rd/builds", get(handlers::list_builds))
        // 部署列表（真实数据库查询）
        .route("/api/rd/deploys", get(handlers::list_deploys))
}

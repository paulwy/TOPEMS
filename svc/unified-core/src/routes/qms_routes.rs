//! QMS 质量管理模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::qms::handlers;
use crate::AppState;

/// QMS 模块路由
pub fn qms_router() -> Router<AppState> {
    Router::new()
        // 检验项目列表（真实数据库查询）
        .route("/api/qms/inspection-items", get(handlers::list_inspection_items))
        // 质检单列表（真实数据库查询）
        .route("/api/qms/quality-inspections", get(handlers::list_quality_inspections))
        // 质量问题列表（真实数据库查询）
        .route("/api/qms/quality-issues", get(handlers::list_quality_issues))
}

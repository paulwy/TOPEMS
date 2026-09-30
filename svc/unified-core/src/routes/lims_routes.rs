//! LIMS 实验室信息管理系统模块路由

use axum::{routing::get, Router};

use crate::modules::lims::handlers;
use crate::AppState;

/// LIMS 模块路由
pub fn lims_router() -> Router<AppState> {
    Router::new()
        // 样本列表（真实数据库查询）
        .route("/api/lims/samples", get(handlers::list_samples))
        // 仪器列表（真实数据库查询）
        .route("/api/lims/instruments", get(handlers::list_instruments))
        // 检验任务列表（真实数据库查询）
        .route(
            "/api/lims/inspection-tasks",
            get(handlers::list_inspection_tasks),
        )
        // 检验记录列表（真实数据库查询）
        .route(
            "/api/lims/inspection-records",
            get(handlers::list_inspection_records),
        )
        // 试剂列表（真实数据库查询）
        .route("/api/lims/reagents", get(handlers::list_reagents))
}

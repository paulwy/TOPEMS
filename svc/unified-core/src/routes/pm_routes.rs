//! PM 项目管理模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::pm::handlers;
use crate::AppState;

/// PM 模块路由
pub fn pm_router() -> Router<AppState> {
    Router::new()
        // 项目列表（真实数据库查询）
        .route("/api/pm/projects", get(handlers::list_projects))
        // 任务列表（真实数据库查询）
        .route("/api/pm/tasks", get(handlers::list_tasks))
        // 项目成员列表（真实数据库查询）
        .route("/api/pm/project-members", get(handlers::list_project_members))
        // 项目资源列表（真实数据库查询）
        .route("/api/pm/project-resources", get(handlers::list_project_resources))
        // 项目风险列表（真实数据库查询）
        .route("/api/pm/project-risks", get(handlers::list_project_risks))
}

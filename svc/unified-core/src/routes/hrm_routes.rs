//! HRM 人力资源管理模块路由

use axum::{
    routing::get,
    Router,
};

use crate::modules::hrm::handlers;
use crate::AppState;

/// HRM 模块路由
pub fn hrm_router() -> Router<AppState> {
    Router::new()
        // 员工列表（真实数据库查询）
        .route("/api/hrm/employees", get(handlers::list_employees))
        // 部门列表（真实数据库查询）
        .route("/api/hrm/departments", get(handlers::list_departments))
        // 招聘职位列表（真实数据库查询）
        .route("/api/hrm/job-openings", get(handlers::list_job_openings))
        // 培训课程列表（真实数据库查询）
        .route("/api/hrm/training-courses", get(handlers::list_training_courses))
        // 考勤记录列表（真实数据库查询）
        .route("/api/hrm/attendance-records", get(handlers::list_attendance_records))
}

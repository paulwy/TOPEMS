//! Mobile 移动端模块路由

use axum::{routing::get, Router};

use crate::modules::mobile::handlers;
use crate::AppState;

/// Mobile 模块路由
pub fn mobile_router() -> Router<AppState> {
    Router::new()
        // 移动设备列表（真实数据库查询）
        .route("/api/mobile/devices", get(handlers::list_devices))
        // 移动任务列表（真实数据库查询）
        .route("/api/mobile/tasks", get(handlers::list_mobile_tasks))
        // OA公告列表（真实数据库查询）
        .route(
            "/api/mobile/oa-announcements",
            get(handlers::list_oa_announcements),
        )
        // 推送通知列表（真实数据库查询）
        .route(
            "/api/mobile/push-notifications",
            get(handlers::list_push_notifications),
        )
}

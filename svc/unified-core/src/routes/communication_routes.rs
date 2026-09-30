//! Communication 通讯模块路由

use axum::{routing::get, Router};

use crate::modules::communication::handlers;
use crate::AppState;

/// Communication 模块路由
pub fn communication_router() -> Router<AppState> {
    Router::new()
        // 通知列表（真实数据库查询）
        .route(
            "/api/communication/notifications",
            get(handlers::list_notifications),
        )
        // 通知模板列表（真实数据库查询）
        .route(
            "/api/communication/notification-templates",
            get(handlers::list_notification_templates),
        )
        // 邮件列表（真实数据库查询）
        .route("/api/communication/emails", get(handlers::list_emails))
        // 邮件模板列表（真实数据库查询）
        .route(
            "/api/communication/email-templates",
            get(handlers::list_email_templates),
        )
}

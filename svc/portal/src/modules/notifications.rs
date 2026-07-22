//! Notification module - BFF proxy to core/notification service
//!
//! Portal 不存储通知数据，所有通知请求代理到 unified-core 的 notification 服务。
//! 这里做数据格式适配，保持 Portal API 向后兼容。

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use topems_shared::ApiResponse;

use crate::{models::Notification, shared::AppState, utils::user_context::extract_bearer_token};

fn format_service_name(notification_type: &str) -> String {
    match notification_type {
        "approval" => "审批中心".to_string(),
        "system" => "系统管理".to_string(),
        "info" => "系统通知".to_string(),
        "warning" => "告警中心".to_string(),
        "hr" => "人力资源".to_string(),
        "finance" => "财务管理".to_string(),
        _ => "系统通知".to_string(),
    }
}

pub async fn get_notifications(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<Notification>>> {
    let client = build_client(&state.notification_client, &headers);
    match client.list_notifications(1, 50, None).await {
        Ok(resp) => {
            let notifications: Vec<Notification> = resp
                .notifications
                .iter()
                .map(|n| Notification {
                    id: n.id.clone(),
                    title: n.title.clone(),
                    content: n.content.clone(),
                    service: n.notification_type.clone(),
                    service_name: format_service_name(&n.notification_type),
                    notification_type: n.notification_type.clone(),
                    read: n.is_read,
                    created_at: n.created_at,
                    link_url: n.link_url.clone(),
                })
                .collect();
            Json(ApiResponse::success(notifications, "通知列表获取成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch notifications: {}", e);
            Json(ApiResponse::error(500, "获取通知列表失败"))
        }
    }
}

pub async fn mark_notification_read(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let client = build_client(&state.notification_client, &headers);
    match client.mark_as_read(&id).await {
        Ok(_) => Json(ApiResponse::success(
            serde_json::json!({ "id": id, "read": true }),
            "通知已标记为已读",
        )),
        Err(e) => {
            tracing::error!("Failed to mark notification as read: {}", e);
            Json(ApiResponse::error(500, "标记通知已读失败"))
        }
    }
}

pub async fn mark_all_notifications_read(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let client = build_client(&state.notification_client, &headers);
    match client.mark_all_as_read().await {
        Ok(count) => Json(ApiResponse::success(
            serde_json::json!({ "count": count }),
            "所有通知已标记为已读",
        )),
        Err(e) => {
            tracing::error!("Failed to mark all notifications as read: {}", e);
            Json(ApiResponse::error(500, "标记全部已读失败"))
        }
    }
}

fn build_client(
    base: &topems_shared::NotificationSvcClient,
    headers: &HeaderMap,
) -> topems_shared::NotificationSvcClient {
    let client = base.clone();
    if let Some(token) = extract_bearer_token(headers) {
        client.with_auth_token(token)
    } else {
        client
    }
}

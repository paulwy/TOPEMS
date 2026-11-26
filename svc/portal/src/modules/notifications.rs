//! Notification module - BFF proxy to core/notification service
//!
//! Portal 不存储通知数据，所有通知请求代理到 unified-core 的 notification 服务。
//! 这里做数据格式适配，保持 Portal API 向后兼容。

use axum::{
    extract::{Path, State},
    http::HeaderMap,
};
use topems_shared_core::response::ApiResponse;
use topems_shared_service_client::service_client::{
    api::notification_api::NotificationApi, TypedServiceClient,
};

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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:notification:read"])),
    path = "/notifications",
    tag = "Portal",
    responses(
        (status = 200, description = "List of notifications", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_notifications(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResponse<Vec<Notification>> {
    let client = build_client(&state.notification_client, &headers);
    match client.list_notifications(1, 50, None).await {
        Ok(resp) => {
            let notifications: Vec<Notification> = resp
                .get("notifications")
                .and_then(|v| v.as_array())
                .unwrap_or(&vec![])
                .iter()
                .filter_map(|n| {
                    Some(Notification {
                        id: n.get("id")?.as_str()?.to_string(),
                        title: n.get("title")?.as_str()?.to_string(),
                        content: n.get("content")?.as_str()?.to_string(),
                        service: n.get("notification_type")?.as_str()?.to_string(),
                        service_name: format_service_name(n.get("notification_type")?.as_str()?),
                        notification_type: n.get("notification_type")?.as_str()?.to_string(),
                        read: n.get("is_read")?.as_bool()?,
                        created_at: chrono::DateTime::parse_from_rfc3339(
                            n.get("created_at")?.as_str()?,
                        )
                        .ok()?
                        .with_timezone(&chrono::Utc),
                        link_url: n
                            .get("link_url")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                    })
                })
                .collect();
            ApiResponse::success(notifications, "通知列表获取成功")
        }
        Err(e) => {
            tracing::error!("Failed to fetch notifications: {}", e);
            ApiResponse::server_error("获取通知列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:notification:write"])),
    path = "/notifications/{id}",
    tag = "Portal",
    responses(
        (status = 200, description = "Mark notification read", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn mark_notification_read(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> ApiResponse<serde_json::Value> {
    let client = build_client(&state.notification_client, &headers);
    match client.mark_as_read(&id).await {
        Ok(_) => ApiResponse::success(
            serde_json::json!({ "id": id, "read": true }),
            "通知已标记为已读",
        ),
        Err(e) => {
            tracing::error!("Failed to mark notification as read: {}", e);
            ApiResponse::server_error("标记通知已读失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["portal:notification:write"])),
    path = "/notifications/mark-all-read",
    tag = "Portal",
    responses(
        (status = 200, description = "Mark all notifications read", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn mark_all_notifications_read(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResponse<serde_json::Value> {
    let client = build_client(&state.notification_client, &headers);
    match client.mark_all_as_read().await {
        Ok(count) => ApiResponse::success(
            serde_json::json!({ "count": count }),
            "所有通知已标记为已读",
        ),
        Err(e) => {
            tracing::error!("Failed to mark all notifications as read: {}", e);
            ApiResponse::server_error("标记全部已读失败")
        }
    }
}

/// 用户 token 代理必须新建 client：base 上挂着 `with_service_token` 注入的
/// `x-system-channel: service_token`，只换 Authorization 会让下游以
/// "用户身份声明系统通道" 为由 403；新 client 还要把 `x-tenant-id` 透传，
/// 否则下游按租户头恢复 RLS 上下文时会 400「缺少租户上下文」。
fn build_client(
    base: &TypedServiceClient<NotificationApi>,
    headers: &HeaderMap,
) -> TypedServiceClient<NotificationApi> {
    match extract_bearer_token(headers) {
        Some(token) => {
            match TypedServiceClient::new(NotificationApi, base.base_url().to_string()) {
                Ok(mut c) => {
                    c.set_auth_token(token);
                    if let Some(t) = headers.get("x-tenant-id").and_then(|v| v.to_str().ok()) {
                        c.add_header("x-tenant-id", t);
                    }
                    c
                }
                Err(_) => base.clone(),
            }
        }
        None => base.clone(),
    }
}

use axum::{extract::Path, Json};
use topems_shared::ApiResponse;

use crate::{models::Notification, services::notification::NotificationService};

pub async fn get_notifications() -> Json<ApiResponse<Vec<Notification>>> {
    let service = NotificationService::new();
    let notifications = service.get_notifications();
    Json(ApiResponse::success(notifications, "通知列表获取成功"))
}

pub async fn mark_notification_read(
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = NotificationService::new();
    let result = service.mark_as_read(id);
    Json(ApiResponse::success(result, "通知已标记为已读"))
}

pub async fn mark_all_notifications_read() -> Json<ApiResponse<serde_json::Value>> {
    let service = NotificationService::new();
    let result = service.mark_all_as_read();
    Json(ApiResponse::success(result, "所有通知已标记为已读"))
}

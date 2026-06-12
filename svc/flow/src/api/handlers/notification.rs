use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::api::response::ApiResponse;
use crate::models::*;
use crate::state::AppState;

pub async fn get_notifications(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<Vec<Notification>>>) {
    match state.repo.get_notifications_by_user(user_id, 50, 0).await {
        Ok(notifications) => (StatusCode::OK, Json(ApiResponse::success(notifications))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn get_unread_count(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<i64>>) {
    match state.repo.get_unread_count(user_id).await {
        Ok(count) => (StatusCode::OK, Json(ApiResponse::success(count))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn mark_as_read(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<usize>>) {
    match state.repo.mark_notifications_as_read(user_id).await {
        Ok(count) => (
            StatusCode::OK,
            Json(ApiResponse::success_with_message(
                count,
                "Notifications marked as read".to_string(),
            )),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn create_notification(
    State(state): State<AppState>,
    Json(req): Json<CreateNotificationRequest>,
) -> (StatusCode, Json<ApiResponse<Notification>>) {
    match state.repo.create_notification(req).await {
        Ok(notification) => (
            StatusCode::CREATED,
            Json(ApiResponse::success_with_message(
                notification,
                "Notification created".to_string(),
            )),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

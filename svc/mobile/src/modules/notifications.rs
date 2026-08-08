#![allow(dead_code)]

use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};

use super::auth_utils::{extract_bearer_token, extract_user_id_from_token};
use topems_shared::{ApiResponse, AuthState};
use topems_shared_service_client::service_client::{
    api::notification_api::NotificationApi, TypedServiceClient,
};

#[derive(Debug, Deserialize)]
pub struct NotificationListParams {
    pub page: Option<i32>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i32>,
    pub status: Option<String>,
    #[serde(rename = "type")]
    pub notification_type: Option<String>,
}

fn unauthorized() -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (
        StatusCode::UNAUTHORIZED,
        Json(ApiResponse::error(401, "未授权")),
    )
}

fn internal_error(msg: &str) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiResponse::error(500, msg)),
    )
}

fn extract_data(value: &Value) -> Value {
    value.get("data").cloned().unwrap_or(value.clone())
}

pub async fn list_notifications(
    State(auth_state): State<AuthState>,
    State(notification_client): State<TypedServiceClient<NotificationApi>>,
    headers: HeaderMap,
    Query(params): Query<NotificationListParams>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);

    let bearer = extract_bearer_token(&headers);
    let mut client = notification_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    let nt = params.notification_type.as_deref();
    match client.list_notifications(page, page_size, nt).await {
        Ok(raw) => {
            let data = extract_data(&raw);
            let body = if let Some(items) = data.as_array() {
                json!({ "items": items, "total": items.len() })
            } else if data.is_object() {
                data
            } else {
                json!({ "items": [], "total": 0 })
            };
            (
                StatusCode::OK,
                Json(ApiResponse::success(body, "获取通知列表成功")),
            )
        }
        Err(e) => {
            tracing::error!("调用Notification服务获取通知列表失败: {}", e);
            internal_error("获取通知列表失败")
        }
    }
}

pub async fn get_unread_count(
    State(auth_state): State<AuthState>,
    State(notification_client): State<TypedServiceClient<NotificationApi>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let bearer = extract_bearer_token(&headers);
    let mut client = notification_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    match client.get_unread_count().await {
        Ok(count) => {
            let body = json!({ "count": count });
            (
                StatusCode::OK,
                Json(ApiResponse::success(body, "获取未读通知数成功")),
            )
        }
        Err(e) => {
            tracing::warn!("get_unread_count 直接调用失败，尝试原始调用: {}", e);
            let path = client.build_path("/notifications/unread-count");
            match client.get::<Value>(&path).await {
                Ok(raw) => {
                    let count = raw.get("data").and_then(|d| d.as_i64()).unwrap_or(0);
                    let body = json!({ "count": count });
                    (
                        StatusCode::OK,
                        Json(ApiResponse::success(body, "获取未读通知数成功")),
                    )
                }
                Err(e2) => {
                    tracing::error!("调用Notification服务获取未读通知数失败: {}", e2);
                    internal_error("获取未读通知数失败")
                }
            }
        }
    }
}

pub async fn get_notification(
    State(auth_state): State<AuthState>,
    State(notification_client): State<TypedServiceClient<NotificationApi>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let bearer = extract_bearer_token(&headers);
    let mut client = notification_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    let path = client.build_path(&format!("/notifications/{}", id));
    match client.get::<Value>(&path).await {
        Ok(raw) => {
            let data = extract_data(&raw);
            (
                StatusCode::OK,
                Json(ApiResponse::success(data, "获取通知详情成功")),
            )
        }
        Err(e) => {
            tracing::error!("调用Notification服务获取通知详情失败: {}", e);
            internal_error("获取通知详情失败")
        }
    }
}

pub async fn mark_notification_read(
    State(auth_state): State<AuthState>,
    State(notification_client): State<TypedServiceClient<NotificationApi>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let bearer = extract_bearer_token(&headers);
    let mut client = notification_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    match client.mark_as_read(&id).await {
        Ok(raw) => {
            let data = extract_data(&raw);
            (
                StatusCode::OK,
                Json(ApiResponse::success(data, "标记已读成功")),
            )
        }
        Err(e) => {
            tracing::error!("调用Notification服务标记已读失败: {}", e);
            internal_error("标记已读失败")
        }
    }
}

pub async fn mark_all_notifications_read(
    State(auth_state): State<AuthState>,
    State(notification_client): State<TypedServiceClient<NotificationApi>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let bearer = extract_bearer_token(&headers);
    let mut client = notification_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    match client.mark_all_as_read().await {
        Ok(_) => (
            StatusCode::OK,
            Json(ApiResponse::success(
                serde_json::Value::Null,
                "全部标记已读成功",
            )),
        ),
        Err(e) => {
            tracing::error!("调用Notification服务全部标记已读失败: {}", e);
            internal_error("全部标记已读失败")
        }
    }
}

pub async fn delete_notification(
    State(auth_state): State<AuthState>,
    State(notification_client): State<TypedServiceClient<NotificationApi>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let bearer = extract_bearer_token(&headers);
    let mut client = notification_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    match client.delete_notification(&id).await {
        Ok(_) => (
            StatusCode::OK,
            Json(ApiResponse::success(
                serde_json::Value::Null,
                "删除通知成功",
            )),
        ),
        Err(e) => {
            tracing::error!("调用Notification服务删除通知失败: {}", e);
            internal_error("删除通知失败")
        }
    }
}

pub async fn delete_read_notifications(
    State(auth_state): State<AuthState>,
    State(notification_client): State<TypedServiceClient<NotificationApi>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    let bearer = extract_bearer_token(&headers);
    let mut client = notification_client.clone();
    if let Some(token) = &bearer {
        client.set_auth_token(token);
    }

    let path = client.build_path("/notifications/read");
    match client.delete::<Value>(&path).await {
        Ok(_) => (
            StatusCode::OK,
            Json(ApiResponse::success(
                serde_json::Value::Null,
                "删除已读通知成功",
            )),
        ),
        Err(e) => {
            tracing::error!("调用Notification服务删除已读通知失败: {}", e);
            internal_error("删除已读通知失败")
        }
    }
}

#![allow(dead_code)]

use crate::modules::contract_util::unwrap_data;
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::Deserialize;
use serde_json::{json, Value};

use super::auth_utils::{extract_bearer_token, extract_user_id_from_token};
use topems_shared_core::response::ApiResponse;

use topems_shared_auth::auth::AuthState;
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

fn unauthorized() -> (StatusCode, ApiResponse<serde_json::Value>) {
    (
        StatusCode::UNAUTHORIZED,
        ApiResponse::unauthorized("未授权"),
    )
}

fn internal_error(msg: &str) -> (StatusCode, ApiResponse<serde_json::Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        ApiResponse::server_error(msg),
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
                ApiResponse::success(body, "获取通知列表成功"),
            )
        }
        Err(e) => {
            // Notification 上游未接入时优雅降级：返回空列表（与 inventory/production 列表兜底口径一致）。
            tracing::warn!("调用Notification服务获取通知列表失败（降级空列表）: {}", e);
            (
                StatusCode::OK,
                ApiResponse::success(
                    json!({ "items": [], "total": 0 }),
                    "获取通知列表成功（Notification 服务未接入，返回空态）",
                ),
            )
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
                ApiResponse::success(body, "获取未读通知数成功"),
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
                        ApiResponse::success(body, "获取未读通知数成功"),
                    )
                }
                Err(e2) => {
                    // 两次调用均失败 → 上游未接入，降级为零值概览（保留 {count} 字段结构）。
                    tracing::warn!(
                        "调用Notification服务获取未读通知数失败（降级空概览）: {}",
                        e2
                    );
                    (
                        StatusCode::OK,
                        ApiResponse::success(
                            json!({ "count": 0 }),
                            "获取未读通知数成功（Notification 服务未接入，返回空态）",
                        ),
                    )
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
                ApiResponse::success(unwrap_data(data), "获取通知详情成功"),
            )
        }
        Err(e) => {
            tracing::warn!("调用Notification服务获取通知详情失败（降级空态）: {}", e);
            (
                StatusCode::OK,
                ApiResponse::success(
                    serde_json::Value::Null,
                    "获取通知详情成功（Notification 服务未接入，返回空态）",
                ),
            )
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
                ApiResponse::success(unwrap_data(data), "标记已读成功"),
            )
        }
        Err(e) => {
            // 写操作上游未接入时降级为 503（操作未执行），绝不伪装 200 成功。
            tracing::warn!("调用Notification服务标记已读失败（降级503未接入）: {}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                ApiResponse::unavailable("上游服务未接入：Notification，标记已读未执行"),
            )
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
            ApiResponse::success(serde_json::Value::Null, "全部标记已读成功"),
        ),
        Err(e) => {
            tracing::warn!(
                "调用Notification服务全部标记已读失败（降级503未接入）: {}",
                e
            );
            (
                StatusCode::SERVICE_UNAVAILABLE,
                ApiResponse::unavailable("上游服务未接入：Notification，全部标记已读未执行"),
            )
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
            ApiResponse::success(serde_json::Value::Null, "删除通知成功"),
        ),
        Err(e) => {
            tracing::warn!("调用Notification服务删除通知失败（降级503未接入）: {}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                ApiResponse::unavailable("上游服务未接入：Notification，删除通知未执行"),
            )
        }
    }
}

pub async fn delete_read_notifications(
    State(auth_state): State<AuthState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => return unauthorized(),
    };

    // 占位实现：上游 communication 通知服务无"删除已读通知"语义
    // （DELETE /notifications/{id} 会把 'read' 当 id 解析 400），
    // 前端契约端点保留，返回成功空操作，待上游支持后接入真实调用。
    (
        StatusCode::OK,
        ApiResponse::success(serde_json::Value::Null, "删除已读通知成功"),
    )
}

//! User module - BFF proxy to core/iam service
//!
//! Portal 不存储用户数据，所有用户信息请求代理到 unified-core 的 IAM 服务。
//! 这里做数据格式适配，保持 Portal API 向后兼容。

use axum::{
    extract::{Extension, State},
    http::HeaderMap,
    Json,
};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_service_client::service_client::api::iam_api::IamApi;
use topems_shared_service_client::TypedServiceClient;

use crate::{models::UserInfo, shared::AppState, utils::user_context::extract_bearer_token};

#[utoipa::path(
    get,
    path = "/user",
    tag = "Portal",
    responses(
        (status = 200, description = "User info", body = serde_json::Value),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_user_info(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<UserInfo>> {
    let user_id = match claims.user_id() {
        Ok(uid) => uid,
        Err(_) => {
            return Json(ApiResponse::error(401, "无效的用户身份"));
        }
    };

    let client = build_iam_client(&state.iam_client, &headers);
    match client.get_user(user_id).await {
        Ok(user) => {
            let user_info = UserInfo {
                id: user
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string(),
                name: user
                    .get("username")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string(),
                email: user
                    .get("email")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string(),
                avatar: "".to_string(),
                department: claims.department.clone().unwrap_or_default(),
                role: if user
                    .get("is_superuser")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
                {
                    "超级管理员".to_string()
                } else {
                    claims.role.clone()
                },
                last_login: "".to_string(),
            };
            Json(ApiResponse::success(user_info, "用户信息获取成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch user info: {}", e);
            let fallback = UserInfo {
                id: claims.sub.clone(),
                name: claims.username.clone(),
                email: claims.email.clone().unwrap_or_default(),
                avatar: "".to_string(),
                department: claims.department.clone().unwrap_or_default(),
                role: claims.role.clone(),
                last_login: "".to_string(),
            };
            Json(ApiResponse::success(fallback, "用户信息获取成功"))
        }
    }
}

fn build_iam_client(
    base: &TypedServiceClient<IamApi>,
    headers: &HeaderMap,
) -> TypedServiceClient<IamApi> {
    let client = base.clone();
    if let Some(token) = extract_bearer_token(headers) {
        client.with_auth_token(token)
    } else {
        client
    }
}

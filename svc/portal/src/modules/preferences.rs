//! Portal 用户偏好代理接口（D2 U2 环3 决策 C）
//!
//! 偏好主数据已本地化到 unified-core IAM 域（`core.user_preferences`）。
//! 本接口不再直读/直写 `portal.user_preferences`，而是**只读代理 unified-core**：
//! 读走 unified-core `/users/me/preferences`，写也转发 unified-core——portal 不再持有偏好数据，
//! 即"不写回 unified-core 之外"。停掉 portal 不影响 unified-core 偏好接口（它已无对 portal 的运行时调用）。
//! 数据归属：unified-core IAM 域；portal 仅作 BFF 转发。

use topems_shared_core::TopemsError;
use axum::{
    extract::{Query, State},
    http::HeaderMap,
    Json,
};
use serde::Deserialize;
use topems_shared_core::response::{ ApiResponse};
use topems_shared_service_client::service_client::api::iam_api::IamApi;
use topems_shared_service_client::TypedServiceClient;

use crate::shared::AppState;

#[derive(Deserialize)]
pub struct PreferenceQuery {
    /// 兼容旧契约保留；实际目标用户由转发的 Bearer（claims.sub）决定。
    pub user_id: Option<String>,
}

fn build_iam_client(state: &AppState, headers: &HeaderMap) -> TypedServiceClient<IamApi> {
    let client = state.iam_client.clone();
    if let Some(token) = extract_bearer(headers) {
        client.with_auth_token(token)
    } else {
        client
    }
}

fn extract_bearer(headers: &HeaderMap) -> Option<String> {
    headers
        .get(axum::http::header::AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
        .map(|s| s.to_string())
}

/// GET /api/portal/preferences → 代理 unified-core 偏好读取（只读，不落 portal 本地库）。
pub async fn get_user_preferences(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(_query): Query<PreferenceQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let client = build_iam_client(&state, &headers);
    match client.get_user_preferences().await {
        Ok(prefs) => Json(ApiResponse::success(prefs, "获取用户偏好设置成功")),
        Err(e) => {
            tracing::warn!("proxy get preferences to IAM failed: {}", e);
            Json(ApiResponse::from(TopemsError::ServiceUnavailable("IAM 偏好服务暂不可用".to_string())))
        }
    }
}

/// PUT /api/portal/preferences → 代理转发到 unified-core（写只落 unified-core，不写 portal 本地库）。
pub async fn update_user_preferences(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(_query): Query<PreferenceQuery>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let client = build_iam_client(&state, &headers);
    match client.update_user_preferences(payload).await {
        Ok(prefs) => Json(ApiResponse::success(prefs, "保存用户偏好设置成功")),
        Err(e) => {
            tracing::warn!("proxy update preferences to IAM failed: {}", e);
            Json(ApiResponse::from(TopemsError::ServiceUnavailable("IAM 偏好服务暂不可用".to_string())))
        }
    }
}

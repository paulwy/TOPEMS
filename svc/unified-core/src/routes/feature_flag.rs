use axum::extract::{Path, State};
use axum::routing::{get, post, put};
use axum::{Json, Router};
use utoipa::ToSchema;

use crate::middleware::permission::require_permission;
use crate::AppState;
use topems_shared_core::feature_flag::{FeatureFlag, FeatureState};
use topems_shared_core::response::{api_error, api_success, ApiResponse};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct UpdateFeatureFlagRequest {
    pub enabled: bool,
}

#[utoipa::path(
    get,
    path = "/system/feature-flags",
    tag = "FeatureFlag",
    responses(
        (status = 200, description = "列出所有 Feature Flags")
    ),
    security(("BearerAuth" = []))
)]
async fn list_feature_flags(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<FeatureFlag>>> {
    let flags = state.feature_flag_service.list_all();
    Json(api_success(flags))
}

#[utoipa::path(
    get,
    path = "/system/feature-flags/{key}",
    tag = "FeatureFlag",
    params(
        ("key" = String, Path, description = "Feature Flag key")
    ),
    responses(
        (status = 200, description = "获取单个 Feature Flag"),
        (status = 404, description = "Flag 不存在")
    ),
    security(("BearerAuth" = []))
)]
async fn get_feature_flag(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Json<ApiResponse<FeatureFlag>> {
    let flags = state.feature_flag_service.list_all();
    match flags.into_iter().find(|f| f.key == key) {
        Some(flag) => Json(api_success(flag)),
        None => Json(api_error(404, &format!("Feature flag '{}' 不存在", key))),
    }
}

#[utoipa::path(
    put,
    path = "/system/feature-flags/{key}",
    tag = "FeatureFlag",
    params(
        ("key" = String, Path, description = "Feature Flag key")
    ),
    request_body = UpdateFeatureFlagRequest,
    responses(
        (status = 200, description = "更新 Feature Flag 状态"),
        (status = 404, description = "Flag 不存在")
    ),
    security(("BearerAuth" = []))
)]
async fn update_feature_flag(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Json(req): Json<UpdateFeatureFlagRequest>,
) -> Json<ApiResponse<FeatureFlag>> {
    let new_state = if req.enabled {
        FeatureState::Enabled
    } else {
        FeatureState::Disabled
    };

    let updated = state.feature_flag_service.update_state(&key, new_state);
    if !updated {
        return Json(api_error(404, &format!("Feature flag '{}' 不存在", key)));
    }

    let flags = state.feature_flag_service.list_all();
    match flags.into_iter().find(|f| f.key == key) {
        Some(flag) => Json(api_success(flag)),
        None => Json(api_error(500, "更新后查找失败")),
    }
}

#[utoipa::path(
    post,
    path = "/system/feature-flags/{key}/refresh",
    tag = "FeatureFlag",
    params(
        ("key" = String, Path, description = "Feature Flag key")
    ),
    responses(
        (status = 200, description = "刷新 Feature Flag")
    ),
    security(("BearerAuth" = []))
)]
async fn refresh_feature_flag(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let flags = state.feature_flag_service.list_all();
    let exists = flags.iter().any(|f| f.key == key);

    Json(api_success(serde_json::json!({
        "key": key,
        "refreshed": true,
        "existed": exists
    })))
}

pub fn feature_flag_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route("/system/feature-flags", get(list_feature_flags))
        .route("/system/feature-flags/{key}", get(get_feature_flag))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:read"),
        ));

    let write = Router::new()
        .route("/system/feature-flags/{key}", put(update_feature_flag))
        .route("/system/feature-flags/{key}/refresh", post(refresh_feature_flag))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:write"),
        ));

    read.merge(write)
}

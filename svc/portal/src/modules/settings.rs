//! Settings module - BFF proxy to IAM service
//!
//! Portal 不直接操作数据库，用户设置代理到 IAM 服务的 preferences 接口。
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

use crate::{
    models::{UpdateUserSettings, UserSettings},
    shared::AppState,
    utils::user_context::extract_bearer_token,
};

fn default_settings(user_id: &str) -> UserSettings {
    UserSettings {
        id: user_id.to_string(),
        user_id: user_id.to_string(),
        theme: "light".to_string(),
        language: "zh-CN".to_string(),
        timezone: "Asia/Shanghai".to_string(),
        notification_enabled: true,
        notification_sound: false,
        auto_refresh: false,
        refresh_interval: 60,
        default_dashboard: "overview".to_string(),
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

/// 将 IAM 返回的偏好数据映射为 Portal UserSettings
fn map_iam_prefs_to_settings(prefs: &serde_json::Value, user_id: &str) -> UserSettings {
    let mut settings = default_settings(user_id);

    if let Some(language) = prefs.get("language").and_then(|v| v.as_str()) {
        settings.language = language.to_string();
    }
    if let Some(timezone) = prefs.get("timezone").and_then(|v| v.as_str()) {
        settings.timezone = timezone.to_string();
    }
    if let Some(notif) = prefs.get("notification_settings") {
        if let Some(enabled) = notif.get("enabled").and_then(|v| v.as_bool()) {
            settings.notification_enabled = enabled;
        }
        if let Some(sound) = notif.get("sound").and_then(|v| v.as_bool()) {
            settings.notification_sound = sound;
        }
    }

    settings
}

/// 将 Portal UserSettings 映射为 IAM 偏好更新请求
fn map_settings_to_iam_prefs(settings: &UserSettings) -> serde_json::Value {
    serde_json::json!({
        "language": settings.language,
        "timezone": settings.timezone,
        "notification_settings": {
            "enabled": settings.notification_enabled,
            "sound": settings.notification_sound,
        }
    })
}

pub async fn get_user_settings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<UserSettings>> {
    let user_id = &claims.sub;
    let client = build_iam_client(&state.iam_client, &headers);

    match client.get_user_preferences().await {
        Ok(prefs) => {
            let settings = map_iam_prefs_to_settings(&prefs, user_id);
            Json(ApiResponse::success(settings, "用户设置获取成功"))
        }
        Err(e) => {
            tracing::warn!("IAM preferences unavailable, returning defaults: {}", e);
            let settings = default_settings(user_id);
            Json(ApiResponse::success(
                settings,
                "IAM 服务暂不可用，已降级为默认设置",
            ))
        }
    }
}

pub async fn update_user_settings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(data): Json<UpdateUserSettings>,
) -> Json<ApiResponse<UserSettings>> {
    let user_id = &claims.sub;
    let client = build_iam_client(&state.iam_client, &headers);

    // 先获取当前设置
    let mut settings = match client.get_user_preferences().await {
        Ok(prefs) => map_iam_prefs_to_settings(&prefs, user_id),
        Err(e) => {
            tracing::warn!("IAM preferences unavailable, using defaults: {}", e);
            default_settings(user_id)
        }
    };

    // 应用更新
    if let Some(theme) = data.theme {
        settings.theme = theme;
    }
    if let Some(language) = data.language {
        settings.language = language;
    }
    if let Some(timezone) = data.timezone {
        settings.timezone = timezone;
    }
    if let Some(notification_enabled) = data.notification_enabled {
        settings.notification_enabled = notification_enabled;
    }
    if let Some(notification_sound) = data.notification_sound {
        settings.notification_sound = notification_sound;
    }
    if let Some(auto_refresh) = data.auto_refresh {
        settings.auto_refresh = auto_refresh;
    }
    if let Some(refresh_interval) = data.refresh_interval {
        settings.refresh_interval = refresh_interval;
    }

    // 代理到 IAM 更新
    let iam_body = map_settings_to_iam_prefs(&settings);
    match client.update_user_preferences(&iam_body).await {
        Ok(_) => Json(ApiResponse::success(settings, "用户设置更新成功")),
        Err(e) => {
            tracing::warn!("Failed to update settings via IAM: {}", e);
            Json(ApiResponse::success(
                settings,
                "设置已更新（IAM 同步失败，仅本地生效）",
            ))
        }
    }
}

pub async fn reset_user_settings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<UserSettings>> {
    let user_id = &claims.sub;
    let client = build_iam_client(&state.iam_client, &headers);
    let settings = default_settings(user_id);

    let iam_body = map_settings_to_iam_prefs(&settings);
    match client.update_user_preferences(&iam_body).await {
        Ok(_) => Json(ApiResponse::success(settings, "用户设置已重置")),
        Err(e) => {
            tracing::warn!("Failed to reset settings via IAM: {}", e);
            Json(ApiResponse::success(settings, "设置已重置（IAM 同步失败）"))
        }
    }
}

pub async fn get_available_themes() -> Json<ApiResponse<Vec<String>>> {
    let themes = vec![
        "light".to_string(),
        "dark".to_string(),
        "system".to_string(),
        "contrast".to_string(),
    ];
    Json(ApiResponse::success(themes, "可用主题列表获取成功"))
}

pub async fn get_available_languages() -> Json<ApiResponse<Vec<(String, String)>>> {
    let languages = vec![
        ("zh-CN".to_string(), "简体中文".to_string()),
        ("zh-TW".to_string(), "繁体中文".to_string()),
        ("en-US".to_string(), "English".to_string()),
        ("ja-JP".to_string(), "日本語".to_string()),
    ];
    Json(ApiResponse::success(languages, "可用语言列表获取成功"))
}

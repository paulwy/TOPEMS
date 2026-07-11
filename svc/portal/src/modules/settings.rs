use axum::Json;
use topems_shared::ApiResponse;

use crate::{
    models::{UpdateUserSettings, UserSettings},
    services::settings::SettingsService,
};

pub async fn get_user_settings() -> Json<ApiResponse<UserSettings>> {
    let service = SettingsService::new();
    let settings = service.get_user_settings();
    Json(ApiResponse::success(settings, "用户设置获取成功"))
}

pub async fn update_user_settings(
    Json(data): Json<UpdateUserSettings>,
) -> Json<ApiResponse<UserSettings>> {
    let service = SettingsService::new();
    let settings = service.update_user_settings(data);
    Json(ApiResponse::success(settings, "用户设置更新成功"))
}

pub async fn reset_user_settings() -> Json<ApiResponse<UserSettings>> {
    let service = SettingsService::new();
    let settings = service.reset_user_settings();
    Json(ApiResponse::success(settings, "用户设置已重置"))
}

pub async fn get_available_themes() -> Json<ApiResponse<Vec<String>>> {
    let service = SettingsService::new();
    let themes = service.get_available_themes();
    Json(ApiResponse::success(themes, "可用主题列表获取成功"))
}

pub async fn get_available_languages() -> Json<ApiResponse<Vec<(String, String)>>> {
    let service = SettingsService::new();
    let languages = service.get_available_languages();
    Json(ApiResponse::success(languages, "可用语言列表获取成功"))
}

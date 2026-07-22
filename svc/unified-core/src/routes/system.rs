use axum::extract::State;
use axum::routing::{get, post, put};
use axum::{Json, Router};

use crate::middleware::permission::require_permission;
use crate::AppState;
use topems_shared::ApiResponse;

#[derive(serde::Serialize, serde::Deserialize)]
struct SystemConfig {
    site_name: String,
    site_url: String,
    logo_url: String,
    favicon_url: String,
    default_language: String,
    timezone: String,
    date_format: String,
    time_format: String,
    currency: String,
    decimal_places: i32,
    enable_registration: bool,
    enable_ldap: bool,
    enable_2fa: bool,
    session_timeout_minutes: i32,
    max_login_attempts: i32,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct CacheConfig {
    enabled: bool,
    provider: String,
    ttl_seconds: i32,
    max_size_mb: i32,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct LogConfig {
    level: String,
    format: String,
    max_file_size_mb: i32,
    max_files: i32,
    retention_days: i32,
    enable_console: bool,
    enable_file: bool,
    enable_syslog: bool,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct SystemParams {
    params: serde_json::Value,
}

async fn get_system_config(State(_state): State<AppState>) -> Json<ApiResponse<SystemConfig>> {
    let config = SystemConfig {
        site_name: "TOPEMS Unified Core".to_string(),
        site_url: "http://localhost:8000".to_string(),
        logo_url: "/logo.png".to_string(),
        favicon_url: "/favicon.ico".to_string(),
        default_language: "zh-CN".to_string(),
        timezone: "Asia/Shanghai".to_string(),
        date_format: "YYYY-MM-DD".to_string(),
        time_format: "HH:mm:ss".to_string(),
        currency: "CNY".to_string(),
        decimal_places: 2,
        enable_registration: false,
        enable_ldap: false,
        enable_2fa: true,
        session_timeout_minutes: 120,
        max_login_attempts: 5,
    };
    Json(ApiResponse::success(config, "获取系统配置成功"))
}

async fn update_system_config(
    State(_state): State<AppState>,
    Json(data): Json<SystemConfig>,
) -> Json<ApiResponse<SystemConfig>> {
    Json(ApiResponse::success(data, "更新系统配置成功"))
}

async fn get_cache_config(State(_state): State<AppState>) -> Json<ApiResponse<CacheConfig>> {
    let config = CacheConfig {
        enabled: false,
        provider: "redis".to_string(),
        ttl_seconds: 3600,
        max_size_mb: 256,
    };
    Json(ApiResponse::success(config, "获取缓存配置成功"))
}

async fn update_cache_config(
    State(_state): State<AppState>,
    Json(data): Json<CacheConfig>,
) -> Json<ApiResponse<CacheConfig>> {
    Json(ApiResponse::success(data, "更新缓存配置成功"))
}

async fn clear_cache(State(_state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "cleared": true, "message": "缓存已清除" }),
        "清除缓存成功",
    ))
}

async fn get_cache_stats(State(_state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "keys_count": 0, "memory_used_mb": 0, "hit_rate": 0 }),
        "获取缓存统计成功",
    ))
}

async fn get_log_config(State(_state): State<AppState>) -> Json<ApiResponse<LogConfig>> {
    let config = LogConfig {
        level: "info".to_string(),
        format: "json".to_string(),
        max_file_size_mb: 100,
        max_files: 10,
        retention_days: 30,
        enable_console: true,
        enable_file: true,
        enable_syslog: false,
    };
    Json(ApiResponse::success(config, "获取日志配置成功"))
}

async fn update_log_config(
    State(_state): State<AppState>,
    Json(data): Json<LogConfig>,
) -> Json<ApiResponse<LogConfig>> {
    Json(ApiResponse::success(data, "更新日志配置成功"))
}

async fn get_system_params(State(_state): State<AppState>) -> Json<ApiResponse<SystemParams>> {
    let params = SystemParams {
        params: serde_json::json!({}),
    };
    Json(ApiResponse::success(params, "获取系统参数成功"))
}

async fn update_system_params(
    State(_state): State<AppState>,
    Json(data): Json<SystemParams>,
) -> Json<ApiResponse<SystemParams>> {
    Json(ApiResponse::success(data, "更新系统参数成功"))
}

pub fn system_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route("/system/v1/config", get(get_system_config))
        .route("/system/v1/cache/config", get(get_cache_config))
        .route("/system/v1/cache/stats", get(get_cache_stats))
        .route("/system/v1/log/config", get(get_log_config))
        .route("/system/v1/params", get(get_system_params))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:read"),
        ));

    let write = Router::new()
        .route("/system/v1/config", put(update_system_config))
        .route("/system/v1/cache/config", put(update_cache_config))
        .route("/system/v1/cache/clear", post(clear_cache))
        .route("/system/v1/log/config", put(update_log_config))
        .route("/system/v1/params", put(update_system_params))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:write"),
        ));

    read.merge(write)
}

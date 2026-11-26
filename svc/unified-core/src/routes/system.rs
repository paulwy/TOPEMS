use axum::extract::State;
use axum::http::header;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post, put};
use axum::{Json, Router};

use crate::middleware::permission::require_permission;
use crate::AppState;
use topems_shared_core::response::ApiResponse;

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


/// 桩响应统一出口：这些 system 配置/缓存/日志/参数接口目前返回硬编码值，
/// 用 `X-Stub: true` 显形，冒烟会判为 SOFT（契约未实现），避免把假实现当成真接口。
fn stubbed<T: serde::Serialize>(data: T, message: &str) -> Response {
    let mut response = Json(ApiResponse::success(data, message)).into_response();
    response
        .headers_mut()
        .insert("X-Stub", header::HeaderValue::from_static("true"));
    response
}

async fn get_system_config(State(_state): State<AppState>) -> Response {
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
    stubbed(config, "获取系统配置成功")
}

async fn update_system_config(
    State(_state): State<AppState>,
    Json(data): Json<SystemConfig>,
) -> Response {
    stubbed(data, "更新系统配置成功")
}

async fn get_cache_config(State(_state): State<AppState>) -> Response {
    let config = CacheConfig {
        enabled: false,
        provider: "redis".to_string(),
        ttl_seconds: 3600,
        max_size_mb: 256,
    };
    stubbed(config, "获取缓存配置成功")
}

async fn update_cache_config(
    State(_state): State<AppState>,
    Json(data): Json<CacheConfig>,
) -> Response {
    stubbed(data, "更新缓存配置成功")
}

async fn clear_cache(State(_state): State<AppState>) -> Response {
    stubbed(
        serde_json::json!({ "cleared": true, "message": "缓存已清除" }),
        "清除缓存成功",
    )
}

async fn get_cache_stats(State(_state): State<AppState>) -> Response {
    stubbed(
        serde_json::json!({ "keys_count": 0, "memory_used_mb": 0, "hit_rate": 0 }),
        "获取缓存统计成功",
    )
}

async fn get_log_config(State(_state): State<AppState>) -> Response {
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
    stubbed(config, "获取日志配置成功")
}

async fn update_log_config(
    State(_state): State<AppState>,
    Json(data): Json<LogConfig>,
) -> Response {
    stubbed(data, "更新日志配置成功")
}

async fn get_system_params(State(_state): State<AppState>) -> Response {
    let params = SystemParams {
        params: serde_json::json!({}),
    };
    stubbed(params, "获取系统参数成功")
}

async fn update_system_params(
    State(_state): State<AppState>,
    Json(data): Json<SystemParams>,
) -> Response {
    stubbed(data, "更新系统参数成功")
}

pub fn system_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route("/system/v1/config", get(get_system_config))
        .route("/system/v1/cache/config", get(get_cache_config))
        .route("/system/v1/cache/stats", get(get_cache_stats))
        .route("/system/v1/log/config", get(get_log_config))
        .route("/system/v1/params", get(get_system_params))
        // 前端契约面为 /system/*（无 /v1 中缀）：同一 handler 额外挂载无 v1 路径，
        // 避免 /system/v1/* 与前端期望路径错位导致 404。
        .route("/system/config", get(get_system_config))
        .route("/system/cache/config", get(get_cache_config))
        .route("/system/cache/stats", get(get_cache_stats))
        .route("/system/log/config", get(get_log_config))
        .route("/system/params", get(get_system_params))
        .route(
            "/system/audit-logs",
            get(crate::modules::system_audit::list_audit_logs),
        )
        .route(
            "/system/audit-logs/stats",
            get(crate::modules::system_audit::get_audit_stats),
        )
        .route(
            "/system/audit-logs/export",
            get(crate::modules::system_audit::export_audit_logs),
        )
        .route(
            "/system/audit-logs/{id}",
            get(crate::modules::system_audit::get_audit_log),
        )
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
        // 无 v1 中缀的写路径（对齐前端契约面）。
        .route("/system/config", put(update_system_config))
        .route("/system/cache/config", put(update_cache_config))
        .route("/system/cache/clear", post(clear_cache))
        .route("/system/log/config", put(update_log_config))
        .route("/system/params", put(update_system_params))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:write"),
        ));

    read.merge(write)
}

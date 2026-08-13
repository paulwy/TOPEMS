use axum::{
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, PgPool, Row};
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: Uuid,
    pub user_id: Uuid,
    pub device_id: String,
    pub device_name: String,
    pub device_type: String,
    pub os_type: String,
    pub os_version: String,
    pub app_version: String,
    pub push_token: Option<String>,
    pub is_active: bool,
    pub last_login_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Device {
    pub fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            device_id: row.try_get("device_id")?,
            device_name: row.try_get("device_name")?,
            device_type: row.try_get("device_type")?,
            os_type: row.try_get("os_type")?,
            os_version: row.try_get("os_version")?,
            app_version: row.try_get("app_version")?,
            push_token: row.try_get("push_token")?,
            is_active: row.try_get("is_active")?,
            last_login_at: row.try_get("last_login_at")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterDeviceRequest {
    pub device_id: String,
    pub device_name: String,
    pub device_type: String,
    pub os_type: String,
    pub os_version: String,
    pub app_version: String,
    pub push_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePushTokenRequest {
    pub device_id: String,
    pub push_token: String,
}

/// 根据电池电量与最后在线时间（秒级 Unix 时间戳）对设备状态进行分类。
/// - 电量 < 15% -> "critical_battery"
/// - 电量 < 30% -> "low_battery"
/// - 在线 (now - last_seen_secs <= 300) -> "online"
/// - 离线 (now - last_seen_secs <= 86400) -> "offline"
/// - 否则 -> "inactive"
pub fn classify_device_status(battery_pct: i32, last_seen_secs: i64, now: i64) -> &'static str {
    if battery_pct < 0 {
        return "unknown";
    }
    if battery_pct < 15 {
        return "critical_battery";
    }
    if battery_pct < 30 {
        return "low_battery";
    }
    let delta = now.saturating_sub(last_seen_secs);
    if delta < 0 {
        // 时钟回退或异常数据
        return "unknown";
    }
    if delta <= 300 {
        "online"
    } else if delta <= 86_400 {
        "offline"
    } else {
        "inactive"
    }
}

/// 校验设备类型字符串是否合法。
pub fn is_valid_device_type(device_type: &str) -> bool {
    matches!(
        device_type,
        "ios" | "android" | "web" | "windows" | "macos" | "linux"
    )
}

/// 标准化 OS 类型字符串（小写化）。
pub fn normalize_os_type(os_type: &str) -> String {
    let lower = os_type.to_lowercase();
    match lower.as_str() {
        "ios" | "android" | "windows" | "macos" | "linux" | "harmony" => lower,
        "" => "unknown".to_string(),
        _ => "other".to_string(),
    }
}

pub async fn register_device(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<RegisterDeviceRequest>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let existing_device =
        match sqlx::query("SELECT id FROM devices WHERE user_id = $1 AND device_id = $2")
            .bind(user_id)
            .bind(&payload.device_id)
            .fetch_optional(&pool)
            .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("查询设备失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "内部服务器错误")),
                );
            }
        };

    if existing_device.is_some() {
        if let Err(e) = sqlx::query("UPDATE devices SET device_name = $1, device_type = $2, os_type = $3, os_version = $4, app_version = $5, push_token = $6, is_active = true, last_login_at = NOW(), updated_at = NOW() WHERE user_id = $7 AND device_id = $8")
            .bind(&payload.device_name)
            .bind(&payload.device_type)
            .bind(&payload.os_type)
            .bind(&payload.os_version)
            .bind(&payload.app_version)
            .bind(&payload.push_token)
            .bind(user_id)
            .bind(&payload.device_id)
            .execute(&pool)
            .await
        {
            tracing::error!("更新设备信息失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "更新设备信息失败")));
        }
        return (
            StatusCode::OK,
            Json(ApiResponse::success((), "设备更新成功")),
        );
    }

    let device_id = Uuid::new_v4();
    if let Err(e) = sqlx::query("INSERT INTO devices (id, user_id, device_id, device_name, device_type, os_type, os_version, app_version, push_token, is_active, last_login_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())")
        .bind(device_id)
        .bind(user_id)
        .bind(&payload.device_id)
        .bind(&payload.device_name)
        .bind(&payload.device_type)
        .bind(&payload.os_type)
        .bind(&payload.os_version)
        .bind(&payload.app_version)
        .bind(&payload.push_token)
        .bind(true)
        .execute(&pool)
        .await
    {
        tracing::error!("创建设备失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "创建设备失败")));
    }

    (
        StatusCode::CREATED,
        Json(ApiResponse::success((), "设备注册成功")),
    )
}

pub async fn update_push_token(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<UpdatePushTokenRequest>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let result = sqlx::query("UPDATE devices SET push_token = $1, updated_at = NOW() WHERE user_id = $2 AND device_id = $3")
        .bind(&payload.push_token)
        .bind(user_id)
        .bind(&payload.device_id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) => {
            if r.rows_affected() > 0 {
                (
                    StatusCode::OK,
                    Json(ApiResponse::success((), "推送Token更新成功")),
                )
            } else {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::error(404, "设备不存在")),
                )
            }
        }
        Err(e) => {
            tracing::error!("更新推送Token失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "更新推送Token失败")),
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- classify_device_status ----

    #[test]
    fn test_classify_device_status_critical_battery() {
        assert_eq!(classify_device_status(5, 1000, 1000), "critical_battery");
        assert_eq!(classify_device_status(14, 1000, 1000), "critical_battery");
    }

    #[test]
    fn test_classify_device_status_low_battery() {
        assert_eq!(classify_device_status(15, 1000, 1000), "low_battery");
        assert_eq!(classify_device_status(29, 1000, 1000), "low_battery");
    }

    #[test]
    fn test_classify_device_status_online() {
        // now - last_seen = 100 <= 300
        assert_eq!(classify_device_status(80, 1000, 1100), "online");
        assert_eq!(classify_device_status(80, 1000, 1300), "online");
    }

    #[test]
    fn test_classify_device_status_offline() {
        // 300 < delta <= 86400
        assert_eq!(classify_device_status(80, 1000, 1400), "offline");
        assert_eq!(classify_device_status(80, 1000, 87_400), "offline");
    }

    #[test]
    fn test_classify_device_status_inactive() {
        // delta > 86400
        assert_eq!(classify_device_status(80, 0, 100_000), "inactive");
    }

    #[test]
    fn test_classify_device_status_negative_battery() {
        assert_eq!(classify_device_status(-1, 1000, 1000), "unknown");
        assert_eq!(classify_device_status(-100, 1000, 1000), "unknown");
    }

    #[test]
    fn test_classify_device_status_clock_skew() {
        // now < last_seen_secs (delta 负数)
        assert_eq!(classify_device_status(80, 2000, 1000), "unknown");
    }

    #[test]
    fn test_classify_device_status_full_battery() {
        assert_eq!(classify_device_status(100, 1000, 1100), "online");
    }

    // ---- is_valid_device_type ----

    #[test]
    fn test_is_valid_device_type_valid() {
        assert!(is_valid_device_type("ios"));
        assert!(is_valid_device_type("android"));
        assert!(is_valid_device_type("web"));
        assert!(is_valid_device_type("windows"));
        assert!(is_valid_device_type("macos"));
        assert!(is_valid_device_type("linux"));
    }

    #[test]
    fn test_is_valid_device_type_invalid() {
        assert!(!is_valid_device_type(""));
        assert!(!is_valid_device_type("IOS"));
        assert!(!is_valid_device_type("harmony"));
        assert!(!is_valid_device_type("unknown"));
    }

    // ---- normalize_os_type ----

    #[test]
    fn test_normalize_os_type_known_lowercased() {
        assert_eq!(normalize_os_type("ios"), "ios");
        assert_eq!(normalize_os_type("android"), "android");
        assert_eq!(normalize_os_type("windows"), "windows");
        assert_eq!(normalize_os_type("macos"), "macos");
        assert_eq!(normalize_os_type("linux"), "linux");
        assert_eq!(normalize_os_type("harmony"), "harmony");
    }

    #[test]
    fn test_normalize_os_type_uppercase_input() {
        assert_eq!(normalize_os_type("IOS"), "ios");
        assert_eq!(normalize_os_type("Android"), "android");
        assert_eq!(normalize_os_type("WINDOWS"), "windows");
    }

    #[test]
    fn test_normalize_os_type_empty() {
        assert_eq!(normalize_os_type(""), "unknown");
    }

    #[test]
    fn test_normalize_os_type_unknown_value() {
        assert_eq!(normalize_os_type("freebsd"), "other");
        assert_eq!(normalize_os_type("ms-dos"), "other");
    }
}

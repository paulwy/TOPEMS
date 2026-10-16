use axum::{
    extract::{Extension, Json, Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, PgPool, Row};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::auth_utils::{extract_bearer_token, extract_user_id_from_token};
use topems_shared_auth::auth::{verify_jwt_token, AuthState, Claims};
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:devices:write"])),
    path = "/devices/register",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "devices"
)]
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

    // 租户绑定复制 middleware 超管豁免语义（同 offline_sync）：超管绑 None（SQL NULL），
    // 普通用户绑 claims.tenant_id；nil/随机 uuid 在 nil 上下文会被 RLS 拒绝。
    let tenant_id: Option<Uuid> = extract_bearer_token(&headers)
        .and_then(|t| verify_jwt_token(&t, &auth_state.jwt_secret).ok())
        .and_then(|c| {
            if c.is_superuser {
                None
            } else {
                c.tenant_id.and_then(|t| Uuid::parse_str(&t).ok())
            }
        });

    let existing_device = match sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT id FROM mobile.devices WHERE user_id::text = $1 AND device_id = $2"
    ))
    .bind(user_id.to_string())
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
        if let Err(e) = sqlx::query(only_own_schema_query!("mobile", "UPDATE mobile.devices SET device_name = $1, device_type = $2, os_type = $3, os_version = $4, app_version = $5, push_token = $6, is_active = true, last_login_at = NOW(), updated_at = NOW() WHERE user_id = $7 AND device_id = $8 AND ($9::uuid IS NULL OR tenant_id = $9::uuid)"))
            .bind(&payload.device_name)
            .bind(&payload.device_type)
            .bind(&payload.os_type)
            .bind(&payload.os_version)
            .bind(&payload.app_version)
            .bind(&payload.push_token)
            .bind(user_id)
            .bind(&payload.device_id)
            .bind(tenant_id)
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
    if let Err(e) = sqlx::query(only_own_schema_query!("mobile", "INSERT INTO mobile.devices (id, user_id, device_id, device_name, device_type, os_type, os_version, app_version, push_token, is_active, last_login_at, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)"))
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
        .bind(tenant_id)
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mobile:devices:write"])),
    path = "/devices/token",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "devices"
)]
pub async fn update_push_token(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
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
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let result = sqlx::query(only_own_schema_query!("mobile", "UPDATE mobile.devices SET push_token = $1, updated_at = NOW() WHERE user_id = $2 AND device_id = $3 AND ($4::uuid IS NULL OR tenant_id = $4::uuid)"))
        .bind(&payload.push_token)
        .bind(user_id)
        .bind(&payload.device_id)
        .bind(tenant_filter)
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

/// 我的设备列表（前端 GET /device → mobile.devices）
pub async fn list_my_devices(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let devices: Vec<Device> = match sqlx::query(only_own_schema_query!("mobile", "SELECT id, user_id, device_id, device_name, device_type, os_type, os_version, app_version, push_token, is_active, last_login_at, created_at, updated_at FROM mobile.devices WHERE user_id::text = $1 ORDER BY created_at DESC"))
        .bind(user_id.to_string())
        .fetch_all(&pool)
        .await
    {
        Ok(rows) => rows
            .iter()
            .filter_map(|row| Device::from_row(row).ok())
            .collect(),
        Err(e) => {
            tracing::error!("查询设备列表失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "查询设备列表失败")),
            );
        }
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(
            serde_json::json!({ "items": devices, "total": devices.len() }),
            "获取设备列表成功",
        )),
    )
}

// ===== 死代码端点轻量兜底（2026-10-05，页面未调用，占位实现防 404）=====

/// 设备详情（前端 GET /device/{id} → mobile.devices 按 id 查询）
pub async fn get_device_by_id(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let device = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT id, user_id, device_id, device_name, device_type, os_type, os_version, app_version, push_token, is_active, last_login_at, created_at, updated_at FROM mobile.devices WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match device {
        Ok(Some(row)) => match Device::from_row(&row) {
            Ok(d) => (
                StatusCode::OK,
                Json(ApiResponse::success(d, "获取设备详情成功")),
            ),
            Err(e) => {
                tracing::error!("解析设备详情失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "解析设备详情失败")),
                )
            }
        },
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "设备不存在")),
        ),
        Err(e) => {
            tracing::error!("查询设备详情失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "查询设备详情失败")),
            )
        }
    }
}

/// 更新设备（前端 PUT /device/{id} → 更新 app_version/os_version/is_active 等）
pub async fn update_device(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let app_version = payload.get("appVersion").and_then(|v| v.as_str());
    let os_version = payload.get("osVersion").and_then(|v| v.as_str());
    let is_active = payload.get("isActive").and_then(|v| v.as_bool());

    let result = sqlx::query(
        only_own_schema_query!(
            "mobile",
            "UPDATE mobile.devices SET app_version = COALESCE($2, app_version), os_version = COALESCE($3, os_version), is_active = COALESCE($4, is_active), updated_at = NOW() WHERE id = $1 AND ($5::uuid IS NULL OR tenant_id = $5::uuid)"
        ),
    )
    .bind(id)
    .bind(app_version)
    .bind(os_version)
    .bind(is_active)
    .bind(tenant_filter)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            Json(ApiResponse::success((), "更新设备成功")),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "设备不存在")),
        ),
        Err(e) => {
            tracing::error!("更新设备失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "更新设备失败")),
            )
        }
    }
}

/// 注销设备（前端 DELETE /device/{id}）
pub async fn unregister_device(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let result = sqlx::query(only_own_schema_query!(
        "mobile",
        "DELETE FROM mobile.devices WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"
    ))
    .bind(id)
    .bind(tenant_filter)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            (StatusCode::OK, Json(ApiResponse::success((), "设备已注销")))
        }
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "设备不存在")),
        ),
        Err(e) => {
            tracing::error!("注销设备失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "注销设备失败")),
            )
        }
    }
}

/// 激活设备（前端 POST /device/{id}/activate）
pub async fn activate_device(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let result = sqlx::query(only_own_schema_query!(
        "mobile",
        "UPDATE mobile.devices SET is_active = true, updated_at = NOW() WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"
    ))
    .bind(id)
    .bind(tenant_filter)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            (StatusCode::OK, Json(ApiResponse::success((), "设备已激活")))
        }
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "设备不存在")),
        ),
        Err(e) => {
            tracing::error!("激活设备失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "激活设备失败")),
            )
        }
    }
}

/// 停用设备（前端 POST /device/{id}/disable）
pub async fn disable_device(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let result = sqlx::query(only_own_schema_query!(
        "mobile",
        "UPDATE mobile.devices SET is_active = false, updated_at = NOW() WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"
    ))
    .bind(id)
    .bind(tenant_filter)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            (StatusCode::OK, Json(ApiResponse::success((), "设备已停用")))
        }
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "设备不存在")),
        ),
        Err(e) => {
            tracing::error!("停用设备失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "停用设备失败")),
            )
        }
    }
}

/// 推送测试（前端 POST /device/{id}/test-push → 占位兜底，真实推送需推送网关）
pub async fn test_push_device(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(_payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let _exists = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT 1 FROM mobile.devices WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await;

    (
        StatusCode::OK,
        Json(ApiResponse::success(
            serde_json::json!({ "success": true }),
            "测试推送已发送（占位实现，待推送网关接入）",
        )),
    )
}

/// 设备统计（前端 GET /device/stats → mobile.devices 聚合）
pub async fn get_device_stats(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let total = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*)::bigint as count FROM mobile.devices WHERE user_id::text = $1"
    ))
    .bind(user_id.to_string())
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let active = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*)::bigint as count FROM mobile.devices WHERE user_id::text = $1 AND is_active = true"
    ))
    .bind(user_id.to_string())
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    (
        StatusCode::OK,
        Json(ApiResponse::success(
            serde_json::json!({ "total": total, "active": active, "inactive": total - active }),
            "获取设备统计成功",
        )),
    )
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

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
use topems_shared::{ApiResponse, AuthState};

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

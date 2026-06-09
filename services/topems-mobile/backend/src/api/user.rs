use axum::{
    extract::{State, Json, Multipart},
    http::{StatusCode, HeaderMap},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row, postgres::PgRow};
use uuid::Uuid;
use std::fs;
use std::path::Path;

use topems_shared::{ApiResponse, AuthState};
use super::auth_utils::extract_user_id_from_token;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: Uuid,
    pub username: String,
    pub nickname: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl UserProfile {
    pub fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            username: row.try_get("username")?,
            nickname: row.try_get("nickname")?,
            phone: row.try_get("phone")?,
            email: row.try_get("email")?,
            avatar_url: row.try_get("avatar_url")?,
            department: row.try_get("department")?,
            position: row.try_get("position")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProfileRequest {
    pub nickname: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub department: Option<String>,
    pub position: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub id: Uuid,
    pub user_id: Uuid,
    pub language: String,
    pub theme: String,
    pub notification_enabled: bool,
    pub sound_enabled: bool,
    pub auto_sync: bool,
    pub sync_interval: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl UserSettings {
    pub fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            language: row.try_get("language")?,
            theme: row.try_get("theme")?,
            notification_enabled: row.try_get("notification_enabled")?,
            sound_enabled: row.try_get("sound_enabled")?,
            auto_sync: row.try_get("auto_sync")?,
            sync_interval: row.try_get("sync_interval")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

pub async fn get_profile(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::error(400, "无效的用户ID")));
        }
    };

    let profile = match sqlx::query("SELECT id, username, nickname, phone, email, avatar_url, department, position, created_at, updated_at FROM mobile_users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => match UserProfile::from_row(&row) {
            Ok(p) => p,
            Err(e) => {
                tracing::error!("解析用户信息失败: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "内部服务器错误")));
            }
        },
        Ok(None) => {
            return (StatusCode::NOT_FOUND, Json(ApiResponse::error(404, "用户不存在")));
        }
        Err(e) => {
            tracing::error!("查询用户信息失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "内部服务器错误")));
        }
    };

    (StatusCode::OK, Json(ApiResponse::success(profile, "获取用户信息成功")))
}

pub async fn update_profile(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<UpdateProfileRequest>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::error(400, "无效的用户ID")));
        }
    };

    let result = sqlx::query("UPDATE mobile_users SET nickname = COALESCE($1, nickname), phone = COALESCE($2, phone), email = COALESCE($3, email), department = COALESCE($4, department), position = COALESCE($5, position), updated_at = NOW() WHERE id = $6")
        .bind(payload.nickname)
        .bind(payload.phone)
        .bind(payload.email)
        .bind(payload.department)
        .bind(payload.position)
        .bind(user_id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => (StatusCode::OK, Json(ApiResponse::success((), "更新用户信息成功"))),
        Ok(_) => (StatusCode::NOT_FOUND, Json(ApiResponse::error(404, "用户不存在"))),
        Err(e) => {
            tracing::error!("更新用户信息失败: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "内部服务器错误")))
        }
    }
}

pub async fn upload_avatar(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::error(400, "无效的用户ID")));
        }
    };

    let mut avatar_path = None;

    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.name().unwrap_or("");
        if name == "avatar" {
            let file_name = format!("{}_{}", Uuid::new_v4(), "avatar.jpg");
            let path = Path::new("./uploads").join(&file_name);
            
            if let Err(e) = fs::create_dir_all("./uploads") {
                tracing::error!("创建上传目录失败: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "创建上传目录失败")));
            }

            let bytes = field.bytes().await.unwrap();
            if let Err(e) = fs::write(&path, bytes) {
                tracing::error!("保存头像失败: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "保存头像失败")));
            }

            avatar_path = Some(format!("/uploads/{}", file_name));
        }
    }

    let avatar_url = match avatar_path {
        Some(p) => p,
        None => {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::error(400, "缺少头像文件")));
        }
    };

    let result = sqlx::query("UPDATE mobile_users SET avatar_url = $1, updated_at = NOW() WHERE id = $2")
        .bind(&avatar_url)
        .bind(user_id)
        .execute(&pool)
        .await;

    match result {
        Ok(_) => (StatusCode::OK, Json(ApiResponse::success(avatar_url, "上传头像成功"))),
        Err(e) => {
            tracing::error!("更新头像URL失败: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "更新头像URL失败")))
        }
    }
}
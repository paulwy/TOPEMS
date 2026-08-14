use axum::{
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, PgPool, Row};
use std::fs;
use std::path::Path;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

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

    (
        StatusCode::OK,
        Json(ApiResponse::success(profile, "获取用户信息成功")),
    )
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
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            Json(ApiResponse::success((), "更新用户信息成功")),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "用户不存在")),
        ),
        Err(e) => {
            tracing::error!("更新用户信息失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "内部服务器错误")),
            )
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UploadAvatarRequest {
    pub avatar_base64: String,
}

pub async fn upload_avatar(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<UploadAvatarRequest>,
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

    let raw_bytes = match base64_decode(&payload.avatar_base64) {
        Ok(b) if !b.is_empty() => b,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "缺少头像文件")),
            )
        }
    };

    let file_name = format!("{}_{}", Uuid::new_v4(), "avatar.jpg");
    let path = Path::new("./uploads").join(&file_name);

    if let Err(e) = fs::create_dir_all("./uploads") {
        tracing::error!("创建上传目录失败: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(500, "创建上传目录失败")),
        );
    }

    if let Err(e) = fs::write(&path, &raw_bytes) {
        tracing::error!("保存头像失败: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(500, "保存头像失败")),
        );
    }

    let avatar_url = format!("/uploads/{}", file_name);

    let result =
        sqlx::query("UPDATE mobile_users SET avatar_url = $1, updated_at = NOW() WHERE id = $2")
            .bind(&avatar_url)
            .bind(user_id)
            .execute(&pool)
            .await;

    match result {
        Ok(_) => (
            StatusCode::OK,
            Json(ApiResponse::success(avatar_url, "上传头像成功")),
        ),
        Err(e) => {
            tracing::error!("更新头像URL失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "更新头像URL失败")),
            )
        }
    }
}

fn base64_decode(s: &str) -> Result<Vec<u8>, ()> {
    // 简单 base64 解码实现，避免额外依赖
    use std::collections::HashMap;
    let chars: Vec<char> = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
        .chars()
        .collect();
    let map: HashMap<char, u8> = chars
        .iter()
        .enumerate()
        .map(|(i, c)| (*c, i as u8))
        .collect();

    let cleaned: String = s
        .chars()
        .filter(|c| c != &'=' && c != &'\n' && c != &'\r' && c != &' ')
        .collect();
    let mut out = Vec::new();
    let bytes: Vec<char> = cleaned.chars().collect();
    for i in (0..bytes.len()).step_by(4) {
        let n1 = bytes.get(i).and_then(|c| map.get(c)).copied().unwrap_or(0);
        let n2 = bytes
            .get(i + 1)
            .and_then(|c| map.get(c))
            .copied()
            .unwrap_or(0);
        let n3 = bytes
            .get(i + 2)
            .and_then(|c| map.get(c))
            .copied()
            .unwrap_or(0);
        let n4 = bytes
            .get(i + 3)
            .and_then(|c| map.get(c))
            .copied()
            .unwrap_or(0);
        out.push((n1 << 2) | (n2 >> 4));
        if i + 2 < bytes.len() {
            out.push(((n2 & 0x0F) << 4) | (n3 >> 2));
        }
        if i + 3 < bytes.len() {
            out.push(((n3 & 0x03) << 6) | n4);
        }
    }
    Ok(out)
}


#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
// roundtrip verified by JSON comparison
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn user_profile_roundtrip() {
        use chrono::Utc;
        roundtrip(&UserProfile {
            id: uuid::Uuid::new_v4(),
            username: "alice".into(),
            nickname: Some("Alice".into()),
            phone: None,
            email: Some("a@b.com".into()),
            avatar_url: None,
            department: None,
            position: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
    }

    #[test]
    fn update_profile_request_roundtrip() {
        roundtrip(&UpdateProfileRequest {
            nickname: Some("A".into()),
            phone: None,
            email: None,
            department: None,
            position: None,
        });
    }

    #[test]
    fn user_settings_roundtrip() {
        use chrono::Utc;
        roundtrip(&UserSettings {
            id: uuid::Uuid::new_v4(),
            user_id: uuid::Uuid::new_v4(),
            language: "zh".into(),
            theme: "light".into(),
            notification_enabled: true,
            sound_enabled: true,
            auto_sync: true,
            sync_interval: 15,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
    }

    #[test]
    fn upload_avatar_request_roundtrip() {
        roundtrip(&UploadAvatarRequest {
            avatar_base64: "aGVsbG8=".into(),
        });
    }

}

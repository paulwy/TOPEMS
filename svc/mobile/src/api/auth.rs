#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(dead_code)]

use axum::{
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use topems_shared::{generate_jwt_token, generate_refresh_token, ApiResponse, AuthState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
    pub device_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub token_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyCodeRequest {
    pub phone: String,
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RefreshTokenRecord {
    pub id: Uuid,
    pub user_id: String,
    pub refresh_token: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

impl RefreshTokenRecord {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            refresh_token: row.try_get("refresh_token")?,
            expires_at: row.try_get("expires_at")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct MobileUserRow {
    id: Uuid,
    username: String,
    password_hash: String,
}

pub async fn login(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let user = match sqlx::query_as::<_, MobileUserRow>(
        "SELECT id, username, password_hash FROM mobile_users WHERE username = $1",
    )
    .bind(&payload.username)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(u)) => u,
        Ok(None) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "用户名或密码错误")),
            );
        }
        Err(e) => {
            tracing::error!("查询用户失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "内部服务器错误")),
            );
        }
    };

    if !verify_password(&payload.password, &user.password_hash) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(ApiResponse::error(401, "用户名或密码错误")),
        );
    }

    let jwt_expire_minutes = auth_state.token_expiry_hours * 60;
    let access_token = generate_jwt_token(
        &user.id.to_string(),
        &auth_state.jwt_secret,
        jwt_expire_minutes,
    );
    let refresh_token = generate_refresh_token();
    let expires_in = jwt_expire_minutes * 60;

    let expires_at = Utc::now() + Duration::days(7);
    if let Err(e) = sqlx::query(
        "INSERT INTO refresh_tokens (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)",
    )
    .bind(user.id)
    .bind(&refresh_token)
    .bind(expires_at)
    .execute(&pool)
    .await
    {
        tracing::error!("保存refresh token失败: {}", e);
    }

    let response = LoginResponse {
        access_token,
        refresh_token,
        expires_in,
        token_type: "Bearer".to_string(),
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "登录成功")),
    )
}

pub async fn logout(headers: HeaderMap, State(pool): State<PgPool>) -> impl IntoResponse {
    let auth_header = match headers.get("Authorization") {
        Some(h) => h,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "缺少Authorization头")),
            );
        }
    };

    let token_str = match auth_header.to_str() {
        Ok(s) if s.starts_with("Bearer ") => &s[7..],
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的Authorization格式")),
            );
        }
    };

    if let Err(e) = sqlx::query("DELETE FROM refresh_tokens WHERE refresh_token = $1")
        .bind(token_str)
        .execute(&pool)
        .await
    {
        tracing::error!("登出失败: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(500, "登出失败")),
        );
    }

    (StatusCode::OK, Json(ApiResponse::success((), "登出成功")))
}

pub async fn refresh_token(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<RefreshRequest>,
) -> impl IntoResponse {
    let record = match sqlx::query_as::<_, RefreshTokenRecord>(
        "SELECT id, user_id, refresh_token, expires_at, created_at FROM refresh_tokens WHERE refresh_token = $1"
    )
    .bind(&payload.refresh_token)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "无效的refresh token")));
        }
        Err(e) => {
            tracing::error!("查询refresh token失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "内部服务器错误")));
        }
    };

    if record.expires_at < Utc::now() {
        return (
            StatusCode::UNAUTHORIZED,
            Json(ApiResponse::error(401, "refresh token已过期")),
        );
    }

    let jwt_expire_minutes = auth_state.token_expiry_hours * 60;
    let access_token =
        generate_jwt_token(&record.user_id, &auth_state.jwt_secret, jwt_expire_minutes);
    let new_refresh_token = generate_refresh_token();
    let expires_in = jwt_expire_minutes * 60;

    let expires_at = Utc::now() + Duration::days(7);
    if let Err(e) =
        sqlx::query("UPDATE refresh_tokens SET refresh_token = $1, expires_at = $2 WHERE id = $3")
            .bind(&new_refresh_token)
            .bind(expires_at)
            .bind(record.id)
            .execute(&pool)
            .await
    {
        tracing::error!("更新refresh token失败: {}", e);
    }

    let response = LoginResponse {
        access_token,
        refresh_token: new_refresh_token,
        expires_in,
        token_type: "Bearer".to_string(),
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "Token刷新成功")),
    )
}

pub async fn verify_code(Json(payload): Json<VerifyCodeRequest>) -> impl IntoResponse {
    if payload.code == "1234" {
        (
            StatusCode::OK,
            Json(ApiResponse::success(true, "验证码验证成功")),
        )
    } else {
        (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error(400, "验证码错误")),
        )
    }
}

fn verify_password(password: &str, password_hash: &str) -> bool {
    bcrypt::verify(password, password_hash).unwrap_or(false)
}

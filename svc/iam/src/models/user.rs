use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub full_name: Option<String>,
    pub role: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
    pub is_superuser: bool,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub role: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub avatar_url: Option<String>,
    pub created_at: String,
    pub is_active: bool,
    pub is_superuser: bool,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub full_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: usize,
    pub user: UserInfo,
}

#[derive(Debug, Serialize)]
pub struct RefreshTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: usize,
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub full_name: Option<String>,
    pub email: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAvatarRequest {
    pub avatar_url: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePreferencesRequest {
    pub notification_settings: Option<serde_json::Value>,
    pub shortcuts: Option<serde_json::Value>,
    pub language: Option<String>,
    pub timezone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct SetNewPasswordRequest {
    pub token: String,
    pub new_password: String,
}

#[derive(Debug, Serialize)]
pub struct ListUsersResponse {
    pub users: Vec<UserInfo>,
    pub total: usize,
}

impl From<User> for UserInfo {
    fn from(user: User) -> Self {
        UserInfo {
            id: user.id.to_string(),
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            roles: user.roles,
            permissions: user.permissions,
            avatar_url: user.avatar_url,
            created_at: user.created_at.to_rfc3339(),
            is_active: user.is_active,
            is_superuser: user.is_superuser,
        }
    }
}
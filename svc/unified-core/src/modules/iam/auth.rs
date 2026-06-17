use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use topems_shared::{generate_jwt_token, generate_refresh_token};

#[derive(Debug, Clone, Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct UserRow {
    id: Uuid,
    username: String,
    password_hash: String,
    email: String,
    full_name: Option<String>,
    status: String,
    is_superuser: bool,
}

#[derive(Debug, Clone, Serialize)]
struct LoginResponseData {
    access_token: String,
    refresh_token: String,
    token_type: String,
    expires_in: i64,
    user: UserInfo,
}

#[derive(Debug, Clone, Serialize)]
struct UserInfo {
    id: String,
    username: String,
    email: String,
    full_name: Option<String>,
    is_active: bool,
    is_superuser: bool,
    created_at: Option<String>,
    roles: Vec<String>,
    permissions: Vec<String>,
}

pub async fn login(
    State(state): State<crate::AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let username = payload.get("username").and_then(|v| v.as_str()).unwrap_or("");
    let password = payload.get("password").and_then(|v| v.as_str()).unwrap_or("");

    tracing::info!("IAM auth login called with username: {}", username);

    let user = match sqlx::query_as::<_, UserRow>(
        "SELECT id, username, password_hash, email, full_name, status, is_superuser FROM core_users WHERE username = $1",
    )
    .bind(username)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(u)) => u,
        Ok(None) => {
            tracing::warn!("Login failed: user not found - {}", username);
            return Json(serde_json::json!({
                "success": false,
                "message": "用户名或密码错误",
                "data": null,
                "code": 401
            }));
        }
        Err(e) => {
            tracing::error!("查询用户失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    if user.status != "active" {
        tracing::warn!("Login failed: user is not active - {}", username);
        return Json(serde_json::json!({
            "success": false,
            "message": "用户账号已被禁用",
            "data": null,
            "code": 401
        }));
    }

    if !verify_password(password, &user.password_hash) {
        tracing::warn!("Login failed: invalid password for user - {}", username);
        return Json(serde_json::json!({
            "success": false,
            "message": "用户名或密码错误",
            "data": null,
            "code": 401
        }));
    }

    let jwt_expire_minutes = state.auth_state.token_expiry_hours * 60;
    let access_token = generate_jwt_token(
        &user.id.to_string(),
        &state.auth_state.jwt_secret,
        jwt_expire_minutes,
    );
    let refresh_token = generate_refresh_token();
    let expires_in = jwt_expire_minutes * 60;

    let roles = if user.is_superuser {
        vec!["admin".to_string(), "user".to_string()]
    } else {
        vec!["user".to_string()]
    };

    let permissions = if user.is_superuser {
        topems_shared::auth::get_permissions()
            .iter()
            .map(|p| p.id.clone())
            .collect()
    } else {
        vec![
            "iam:users_read".to_string(),
            "iam:roles_read".to_string(),
            "iam:permissions_read".to_string(),
            "iam:audit_read".to_string(),
            "iam:system_read".to_string(),
            "iam:dictionaries_read".to_string(),
            "iam:plugins_read".to_string(),
        ]
    };

    let response_data = LoginResponseData {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in,
        user: UserInfo {
            id: user.id.to_string(),
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            is_active: user.status == "active",
            is_superuser: user.is_superuser,
            created_at: None,
            roles,
            permissions,
        },
    };

    tracing::info!("Login successful for user: {}", username);

    Json(serde_json::json!({
        "success": true,
        "message": "登录成功",
        "data": response_data,
        "code": 0
    }))
}

pub async fn register(
    State(_state): State<crate::AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM auth register called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "register success",
        "data": null
    }))
}

pub async fn refresh_token(
    State(_state): State<crate::AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM auth refresh_token called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "refresh_token success",
        "data": null
    }))
}

fn verify_password(password: &str, password_hash: &str) -> bool {
    bcrypt::verify(password, password_hash).unwrap_or(false)
}
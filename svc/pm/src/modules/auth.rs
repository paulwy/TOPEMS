use axum::{extract::Json, routing::post, Router};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

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

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct AuthTokens {
    pub access_token: String,
    pub refresh_token: String,
}

async fn login(Json(req): Json<LoginRequest>) -> Json<ApiResponse<AuthTokens>> {
    // 从环境变量读取管理员凭据；未配置时拒绝登录并记录警告
    let admin_user = std::env::var("PM_ADMIN_USERNAME").unwrap_or_else(|_| {
        tracing::warn!("PM_ADMIN_USERNAME 未配置，登录功能不可用");
        String::new()
    });
    let admin_password_hash = std::env::var("PM_ADMIN_PASSWORD_HASH").unwrap_or_else(|_| {
        tracing::warn!("PM_ADMIN_PASSWORD_HASH 未配置，登录功能不可用");
        String::new()
    });

    let password_valid = !admin_user.is_empty()
        && !admin_password_hash.is_empty()
        && req.username == admin_user
        && bcrypt::verify(&req.password, &admin_password_hash).unwrap_or_else(|e| {
            tracing::error!("密码哈希验证失败: {}", e);
            false
        });

    if password_valid {
        Json(ApiResponse::success(
            AuthTokens {
                access_token: "test-token-12345".to_string(),
                refresh_token: "refresh-token-12345".to_string(),
            },
            "登录成功",
        ))
    } else {
        Json(ApiResponse::error(401, "用户名或密码错误"))
    }
}

async fn register(Json(_req): Json<RegisterRequest>) -> Json<ApiResponse<AuthTokens>> {
    Json(ApiResponse::success(
        AuthTokens {
            access_token: "test-token-12345".to_string(),
            refresh_token: "refresh-token-12345".to_string(),
        },
        "注册成功",
    ))
}

async fn refresh(Json(req): Json<RefreshRequest>) -> Json<ApiResponse<AuthTokens>> {
    if req.token.starts_with("refresh-token-") {
        Json(ApiResponse::success(
            AuthTokens {
                access_token: "new-test-token-67890".to_string(),
                refresh_token: "new-refresh-token-67890".to_string(),
            },
            "令牌刷新成功",
        ))
    } else {
        Json(ApiResponse::error(401, "无效的刷新令牌"))
    }
}

pub fn create_routes() -> Router {
    Router::new()
        .route("/api/auth/login", post(login))
        .route("/api/auth/register", post(register))
        .route("/api/auth/refresh", post(refresh))
}

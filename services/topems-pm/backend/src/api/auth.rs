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
    if req.username == "admin" && req.password == "password" {
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

async fn register(Json(req): Json<RegisterRequest>) -> Json<ApiResponse<AuthTokens>> {
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
        .route("/api/v1/auth/login", post(login))
        .route("/api/v1/auth/register", post(register))
        .route("/api/v1/auth/refresh", post(refresh))
}

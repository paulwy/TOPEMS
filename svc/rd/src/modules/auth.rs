use axum::{
    extract::State,
    http::{header, HeaderMap},
    routing::post,
    Json, Router,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::User;
use crate::modules::ApiState;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: User,
}

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

pub fn create_routes() -> Router<super::ApiState> {
    Router::new()
        .route("/auth/login", post(login))
        .route("/auth/refresh", post(refresh_token))
        .route("/auth/logout", post(logout))
}

#[utoipa::path(
    post,
    path = "/auth/login",
    tag = "auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = ApiResponse<LoginResponse>),
        (status = 401, description = "Invalid credentials"),
        (status = 500, description = "Internal server error")
    )
)]
async fn login(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<LoginRequest>,
) -> Json<ApiResponse<LoginResponse>> {
    let result = sqlx::query_as::<_, User>(
        r#"
        SELECT id, username, email, name, is_superuser, roles, permissions, created_at, updated_at
        FROM rs.users
        WHERE username = $1 OR email = $1
        "#,
    )
    .bind(&req.username)
    .fetch_optional(&state.db)
    .await;

    let user = match result {
        Ok(Some(u)) => u,
        Ok(None) => {
            return Json(ApiResponse::error(401, "用户名或密码错误"));
        }
        Err(e) => {
            tracing::error!("查询用户失败: {}", e);
            return Json(ApiResponse::error(500, "登录失败"));
        }
    };

    let password_hash =
        sqlx::query_scalar::<_, String>("SELECT password_hash FROM rs.users WHERE id = $1")
            .bind(user.id)
            .fetch_optional(&state.db)
            .await;

    let password_hash = match password_hash {
        Ok(Some(h)) => h,
        _ => {
            return Json(ApiResponse::error(401, "用户名或密码错误"));
        }
    };

    if !bcrypt::verify(&req.password, &password_hash).unwrap_or(false) {
        return Json(ApiResponse::error(401, "用户名或密码错误"));
    }

    let now = Utc::now();
    let expiry = now + Duration::hours(state.auth_state.token_expiry_hours);

    let claims = Claims {
        sub: user.id.to_string(),
        username: user.username.clone(),
        role: "user".to_string(),
        email: user.email.clone(),
        roles: user.roles.clone(),
        permissions: user.permissions.clone(),
        is_superuser: user.is_superuser,
        exp: expiry.timestamp() as usize,
        iat: now.timestamp() as usize,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
    };

    let access_token = match claims.encode(&state.auth_state.jwt_secret) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("生成访问令牌失败: {}", e);
            return Json(ApiResponse::error(500, "登录失败"));
        }
    };

    let refresh_token = Uuid::new_v4().to_string();

    let refresh_result = sqlx::query(
        r#"
        INSERT INTO rs.refresh_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3
        "#,
    )
    .bind(user.id)
    .bind(&refresh_token)
    .bind(now + Duration::days(7))
    .execute(&state.db)
    .await;

    if let Err(e) = refresh_result {
        tracing::error!("保存刷新令牌失败: {}", e);
    }

    let user_id = user.id;
    let response = LoginResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: Duration::hours(state.auth_state.token_expiry_hours).num_seconds(),
        user,
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = serde_json::to_value(&response).ok();

    crate::modules::audit::log_audit_event(
        &state.db,
        "login".to_string(),
        "auth".to_string(),
        Some(user_id),
        None,
        None,
        None,
        request_data,
        response_data,
        "success".to_string(),
        None,
        &headers,
    )
    .await;

    Json(ApiResponse::success(response, "登录成功"))
}

#[utoipa::path(
    post,
    path = "/auth/refresh",
    tag = "auth",
    request_body = RefreshRequest,
    responses(
        (status = 200, description = "Token refreshed successfully", body = ApiResponse<TokenResponse>),
        (status = 401, description = "Invalid refresh token"),
        (status = 500, description = "Internal server error")
    )
)]
async fn refresh_token(
    State(state): State<ApiState>,
    _headers: HeaderMap,
    Json(req): Json<RefreshRequest>,
) -> Json<ApiResponse<TokenResponse>> {
    let result = sqlx::query(
        r#"SELECT user_id FROM rs.refresh_tokens WHERE token = $1 AND expires_at > NOW()"#,
    )
    .bind(req.refresh_token)
    .fetch_optional(&state.db)
    .await;

    let row = match result {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Json(ApiResponse::error(401, "无效的刷新令牌"));
        }
        Err(e) => {
            tracing::error!("查询刷新令牌失败: {}", e);
            return Json(ApiResponse::error(500, "刷新令牌失败"));
        }
    };

    let user_id: Uuid = match row.try_get("user_id") {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("解析用户ID失败: {}", e);
            return Json(ApiResponse::error(500, "刷新令牌失败"));
        }
    };

    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, username, email, name, is_superuser, roles, permissions, created_at, updated_at
        FROM rs.users WHERE id = $1
        "#,
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await;

    let user = match user {
        Ok(Some(u)) => u,
        _ => {
            return Json(ApiResponse::error(401, "用户不存在"));
        }
    };

    let now = Utc::now();
    let expiry = now + Duration::hours(state.auth_state.token_expiry_hours);

    let claims = Claims {
        sub: user.id.to_string(),
        username: user.username.clone(),
        role: "user".to_string(),
        email: user.email.clone(),
        roles: user.roles.clone(),
        permissions: user.permissions.clone(),
        is_superuser: user.is_superuser,
        exp: expiry.timestamp() as usize,
        iat: now.timestamp() as usize,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
    };

    let access_token = match claims.encode(&state.auth_state.jwt_secret) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("生成访问令牌失败: {}", e);
            return Json(ApiResponse::error(500, "刷新令牌失败"));
        }
    };

    let response = TokenResponse {
        access_token,
        token_type: "Bearer".to_string(),
        expires_in: Duration::hours(state.auth_state.token_expiry_hours).num_seconds(),
    };

    Json(ApiResponse::success(response, "令牌刷新成功"))
}

#[utoipa::path(
    post,
    path = "/auth/logout",
    tag = "auth",
    responses(
        (status = 200, description = "Logout successful"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn logout(State(state): State<ApiState>, headers: HeaderMap) -> Json<ApiResponse<String>> {
    let auth_header = headers
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => {
            return Json(ApiResponse::error(401, "未授权"));
        }
    };

    let decoded = match decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.auth_state.jwt_secret.as_ref()),
        &Validation::new(Algorithm::HS256),
    ) {
        Ok(d) => d,
        Err(_) => {
            return Json(ApiResponse::error(401, "无效的令牌"));
        }
    };

    let user_id = match Uuid::parse_str(&decoded.claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return Json(ApiResponse::error(401, "无效的用户ID"));
        }
    };

    let result = sqlx::query("DELETE FROM rs.refresh_tokens WHERE user_id = $1")
        .bind(user_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(_) => {
            let request_data = serde_json::json!({ "user_id": user_id });
            let response_data = serde_json::json!({ "rows_affected": 1 });

            crate::modules::audit::log_audit_event(
                &state.db,
                "logout".to_string(),
                "auth".to_string(),
                Some(user_id),
                None,
                None,
                None,
                Some(request_data),
                Some(response_data),
                "success".to_string(),
                None,
                &headers,
            )
            .await;

            Json(ApiResponse::success("".to_string(), "登出成功"))
        }
        Err(e) => {
            tracing::error!("登出失败: {}", e);
            Json(ApiResponse::error(500, "登出失败"))
        }
    }
}

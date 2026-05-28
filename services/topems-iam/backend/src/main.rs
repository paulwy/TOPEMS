mod models;
mod errors;
mod services;
mod db;
mod middleware;

use axum::{
    body::Body,
    extract::{FromRequestParts, Path, Query, Request, State},
    http::{request::Parts, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::{get, post, put, delete},
    Json, Router,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use regex::Regex;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

use services::SecurityService;
use models::{ListAccessLogsResponse, AccessLog};

// JWT Claims
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Claims {
    sub: String,       // Subject: user id
    username: String,  // Username
    role: String,      // User role
    exp: usize,        // Expiration time
    iat: usize,        // Issued at time
}

// User model
#[derive(Debug, Clone, Serialize, Deserialize)]
struct User {
    id: String,
    username: String,
    email: String,
    password_hash: String,
    full_name: Option<String>,
    role: String,
    created_at: String,
    updated_at: String,
    is_active: bool,
    is_superuser: bool,
}



// App state
#[derive(Debug, Clone)]
struct RateLimitEntry {
    count: u32,
    reset_time: i64,
}

#[derive(Clone)]
struct AppState {
    db: PgPool,
    jwt_secret: String,
    security_service: Arc<SecurityService>,
    rate_limit_store: Arc<RwLock<HashMap<String, RateLimitEntry>>>,
}

#[derive(Debug, Serialize, Deserialize)]
enum ErrorCode {
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404,
    BadRequest = 400,
    Conflict = 409,
    InternalServerError = 500,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ErrorDetail {
    code: i32,
    message: String,
    error_type: String,
    request_id: Option<String>,
}

// Api response
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
    pub error: Option<ErrorDetail>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            error: None,
        }
    }

    pub fn error(code: i32, message: &str) -> Self {
        let error_type = match code {
            400 => "BadRequest",
            401 => "Unauthorized",
            403 => "Forbidden",
            404 => "NotFound",
            409 => "Conflict",
            _ => "InternalServerError",
        };
        
        ApiResponse {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            error: Some(ErrorDetail {
                code,
                message: message.to_string(),
                error_type: error_type.to_string(),
                request_id: None,
            }),
        }
    }

    pub fn error_with_request_id(code: i32, message: &str, request_id: &str) -> Self {
        let error_type = match code {
            400 => "BadRequest",
            401 => "Unauthorized",
            403 => "Forbidden",
            404 => "NotFound",
            409 => "Conflict",
            _ => "InternalServerError",
        };
        
        ApiResponse {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            error: Some(ErrorDetail {
                code,
                message: message.to_string(),
                error_type: error_type.to_string(),
                request_id: Some(request_id.to_string()),
            }),
        }
    }

    pub fn ok(message: &str) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            error: None,
        }
    }
}

// Request/Response models
#[derive(Debug, Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct RegisterRequest {
    username: String,
    email: String,
    password: String,
    full_name: Option<String>,
}

#[derive(Debug, Serialize)]
struct LoginResponse {
    access_token: String,
    refresh_token: String,
    token_type: String,
    expires_in: usize,
    user: UserInfo,
    must_change_password: bool,
}

#[derive(Debug, Serialize, Clone)]
struct UserInfo {
    id: String,
    username: String,
    email: String,
    full_name: Option<String>,
    role: String,
    roles: Vec<String>,
    permissions: Vec<String>,
    created_at: String,
    is_active: bool,
    is_superuser: bool,
}

#[derive(Debug, Deserialize)]
struct CreateRoleRequest {
    name: String,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreatePermissionRequest {
    name: String,
    resource: String,
    action: String,
    description: Option<String>,
}

#[derive(Debug, Serialize)]
struct RoleInfo {
    id: String,
    name: String,
    description: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct UserWithPermissions {
    user: UserInfo,
    roles: Vec<RoleInfo>,
    permissions: Vec<PermissionInfo>,
}

#[derive(Debug, Serialize)]
struct PermissionInfo {
    id: String,
    name: String,
    resource: String,
    action: String,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RefreshTokenRequest {
    refresh_token: String,
}

#[derive(Debug, Serialize)]
struct RefreshTokenResponse {
    access_token: String,
    token_type: String,
    expires_in: usize,
}

#[derive(Debug, Serialize)]
struct ListUsersResponse {
    users: Vec<UserInfo>,
    total: usize,
}

#[derive(Debug, Deserialize)]
struct UpdateUserRequest {
    full_name: Option<String>,
    email: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChangePasswordRequest {
    current_password: String,
    new_password: String,
}

#[derive(Debug, Deserialize)]
struct AdminResetPasswordRequest {
    new_password: String,
}

#[derive(Debug, Deserialize)]
struct ForgotPasswordRequest {
    email: String,
}

#[derive(Debug, Deserialize)]
struct ResetPasswordRequest {
    token: String,
    new_password: String,
}

// Custom extractor for claims
struct AuthenticatedUser(Claims);

impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts.extensions.get::<Claims>()
            .cloned()
            .map(AuthenticatedUser)
            .ok_or_else(|| {
                let response = Json(ApiResponse::<()>::error(401, "请先登录"));
                (StatusCode::UNAUTHORIZED, response).into_response()
            })
    }
}

// Helper functions
fn validate_password(password: &str) -> Result<(), String> {
    if password.len() < 6 {
        return Err("密码长度至少为6位".to_string());
    }
    
    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_number = password.chars().any(|c| c.is_numeric());
    
    if !has_uppercase || !has_lowercase || !has_number {
        return Err("密码需要包含至少一个大写字母、一个小写字母和一个数字".to_string());
    }
    
    Ok(())
}

fn validate_email(email: &str) -> Result<(), String> {
    let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    if !email_regex.is_match(email) {
        return Err("请输入有效的邮箱地址".to_string());
    }
    Ok(())
}

fn validate_username(username: &str) -> Result<(), String> {
    if username.len() < 2 {
        return Err("用户名长度至少为2位".to_string());
    }
    if username.len() > 50 {
        return Err("用户名长度不能超过50位".to_string());
    }
    
    // 只禁止控制字符和空格，允许其他字符
    for c in username.chars() {
        if c.is_control() || c.is_whitespace() {
            return Err("用户名不能包含控制字符或空格".to_string());
        }
    }
    
    Ok(())
}

fn generate_token(user: &User, secret: &str, expires_in_hours: i64) -> Result<String, String> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(expires_in_hours))
        .expect("valid timestamp")
        .timestamp() as usize;
    
    let claims = Claims {
        sub: user.id.clone(),
        username: user.username.clone(),
        role: user.role.clone(),
        exp: expiration,
        iat: Utc::now().timestamp() as usize,
    };
    
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    ).map_err(|e| format!("生成token失败: {}", e))
}

fn verify_token(token: &str, secret: &str) -> Result<Claims, String> {
    let validation = Validation::default();
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &validation,
    )
    .map(|data| data.claims)
    .map_err(|e| format!("Token验证失败: {}", e))
}

// JWT auth middleware
async fn auth_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Response {
    let auth_header = req.headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());
    
    match auth_header {
        Some(header) if header.starts_with("Bearer ") => {
            let token = &header[7..];
            match verify_token(token, &state.jwt_secret) {
                Ok(claims) => {
                    req.extensions_mut().insert(claims);
                    next.run(req).await
                }
                Err(e) => {
                    tracing::warn!("Token验证失败: {}", e);
                    let response = Json(ApiResponse::<()>::error(401, "认证失效，请重新登录"));
                    (StatusCode::UNAUTHORIZED, response).into_response()
                }
            }
        }
        _ => {
            let response = Json(ApiResponse::<()>::error(401, "请先登录"));
            (StatusCode::UNAUTHORIZED, response).into_response()
        }
    }
}

// Handlers
async fn home() -> &'static str {
    "TOPEMS-IAM 身份认证服务 API\n\n健康检查: GET /health\n\n认证接口:\n- POST /api/v1/auth/login (登录)\n- POST /api/v1/auth/register (注册)\n- POST /api/v1/auth/refresh (刷新token)\n\n用户接口 (需要认证):\n- GET /api/v1/users/me (获取当前用户)\n- PUT /api/v1/users/me (更新当前用户)\n- POST /api/v1/users/me/password (修改密码)\n- GET /api/v1/users (获取用户列表 - 仅管理员)\n- GET /api/v1/users/:id (获取特定用户)\n- GET /api/v1/users/:user_id/roles (获取用户角色)\n- POST /api/v1/users/:user_id/roles/:role_id (为用户添加角色 - 仅管理员)\n- DELETE /api/v1/users/:user_id/roles/:role_id (移除用户角色 - 仅管理员)\n\n角色接口 (需要认证):\n- GET /api/v1/roles (获取角色列表)\n- POST /api/v1/roles (创建角色 - 仅管理员)\n- GET /api/v1/roles/:id (获取特定角色)\n- DELETE /api/v1/roles/:id (删除角色 - 仅管理员)\n- GET /api/v1/roles/:role_id/permissions (获取角色权限)\n- POST /api/v1/roles/:role_id/permissions/:permission_id (为角色添加权限 - 仅管理员)\n- DELETE /api/v1/roles/:role_id/permissions/:permission_id (移除角色权限 - 仅管理员)\n\n权限接口 (需要认证):\n- GET /api/v1/permissions (获取权限列表)\n- POST /api/v1/permissions (创建权限 - 仅管理员)\n- DELETE /api/v1/permissions/:id (删除权限 - 仅管理员)\n\n测试账号:\n- admin / admin123 (管理员)\n- user / user123 (普通用户)\n- guest / guest123 (访客)"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("TOPEMS-IAM is running!".to_string(), "OK"))
}

async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Json<ApiResponse<LoginResponse>> {
    let policy = state.security_service.policy();
    
    let result = sqlx::query_as::<_, (uuid::Uuid, String, String, Option<String>, String, bool, bool, chrono::DateTime<Utc>, chrono::DateTime<Utc>, Option<bool>, Option<chrono::DateTime<Utc>>, Option<i32>, Option<bool>, Option<chrono::DateTime<Utc>>)>(
        "SELECT id, username, email, full_name, password_hash, is_active, is_superuser, created_at, updated_at, account_locked, account_locked_until, failed_login_count, must_change_password, password_expires_at FROM iam.users WHERE username = $1"
    )
    .bind(&req.username)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(user)) => {
            if !user.5 {
                let _ = state.security_service.log_access(
                    Some(user.0),
                    &user.1,
                    "login",
                    "auth",
                    None,
                    None,
                    None,
                    false,
                    Some("账号已被禁用")
                ).await;
                return Json(ApiResponse::error(403, "该账号已被禁用"));
            }
            
            let is_locked = if user.9.unwrap_or(false) {
                if let Some(locked_until) = user.10 {
                    if locked_until > Utc::now() {
                        true
                    } else {
                        let _ = state.security_service.unlock_user(user.0).await;
                        false
                    }
                } else {
                    true
                }
            } else {
                false
            };
            
            if is_locked {
                let _ = state.security_service.log_access(
                    Some(user.0),
                    &user.1,
                    "login",
                    "auth",
                    None,
                    None,
                    None,
                    false,
                    Some("账号已被锁定")
                ).await;
                return Json(ApiResponse::error(403, "该账号已被锁定，请稍后再试"));
            }
            
            let password_verified = bcrypt::verify(&req.password, &user.4).unwrap_or(false);
            
            if password_verified {
                let _ = state.security_service.reset_failed_login(user.0).await;
                let _ = state.security_service.record_login_attempt(
                    &user.1,
                    None,
                    None,
                    true,
                    None
                ).await;
                let _ = state.security_service.log_access(
                    Some(user.0),
                    &user.1,
                    "login",
                    "auth",
                    None,
                    None,
                    None,
                    true,
                    None
                ).await;
                
                let must_change_password = user.12.unwrap_or(false) || 
                    user.13.map(|expires_at| expires_at <= Utc::now()).unwrap_or(false);
                
                let (user_roles, user_permissions) = get_user_roles_and_permissions(&state.db, &user.0.to_string()).await;
                let primary_role = user_roles.first().cloned().unwrap_or_else(|| "user".to_string());
                
                let user_info = UserInfo {
                    id: user.0.to_string(),
                    username: user.1.clone(),
                    email: user.2.clone(),
                    full_name: user.3.clone(),
                    role: primary_role.clone(),
                    roles: user_roles,
                    permissions: user_permissions,
                    created_at: user.7.to_rfc3339(),
                    is_active: user.5,
                    is_superuser: user.6,
                };
                
                let user_for_token = User {
                    id: user.0.to_string(),
                    username: user.1.clone(),
                    email: user.2.clone(),
                    password_hash: user.4.clone(),
                    full_name: user.3.clone(),
                    role: primary_role,
                    created_at: user.7.to_rfc3339(),
                    updated_at: user.8.to_rfc3339(),
                    is_active: user.5,
                    is_superuser: user.6,
                };
                
                let access_token = generate_token(&user_for_token, &state.jwt_secret, 1).unwrap();
                let refresh_token = generate_token(&user_for_token, &state.jwt_secret, 168).unwrap();
                
                let resp = LoginResponse {
                    access_token,
                    refresh_token,
                    token_type: "Bearer".to_string(),
                    expires_in: 3600,
                    user: user_info,
                    must_change_password,
                };
                
                let message = if must_change_password {
                    "登录成功，请尽快修改密码"
                } else {
                    &format!("欢迎回来，{}！", user.3.as_ref().unwrap_or(&user.1))
                };
                
                tracing::info!("✅ 用户登录成功: {}", user.1);
                Json(ApiResponse::success(resp, message))
            } else {
                let current_failed = user.11.unwrap_or(0) + 1;
                let _ = state.security_service.increment_failed_login(user.0).await;
                let _ = state.security_service.record_login_attempt(
                    &user.1,
                    None,
                    None,
                    false,
                    Some("密码错误")
                ).await;
                let _ = state.security_service.log_access(
                    Some(user.0),
                    &user.1,
                    "login_failed",
                    "auth",
                    None,
                    None,
                    None,
                    false,
                    Some("密码错误")
                ).await;
                
                if current_failed >= policy.max_failed_attempts as i32 {
                    let _ = state.security_service.lock_user(user.0, Some("多次登录失败")).await;
                    tracing::warn!("🔒 账号因多次登录失败被锁定: {}", req.username);
                    return Json(ApiResponse::error(403, &format!("密码错误次数过多，账号已锁定{}分钟", policy.lockout_minutes)));
                }
                
                tracing::warn!("❌ 密码错误: {} (失败次数: {}/{})", req.username, current_failed, policy.max_failed_attempts);
                Json(ApiResponse::error(401, &format!("密码错误（还剩{}次机会）", policy.max_failed_attempts as i32 - current_failed)))
            }
        }
        Ok(None) => {
            let _ = state.security_service.record_login_attempt(
                &req.username,
                None,
                None,
                false,
                Some("用户不存在")
            ).await;
            let _ = state.security_service.log_access(
                None,
                &req.username,
                "login_failed",
                "auth",
                None,
                None,
                None,
                false,
                Some("用户不存在")
            ).await;
            tracing::warn!("❌ 用户不存在: {}", req.username);
            Json(ApiResponse::error(404, "用户不存在"))
        }
        Err(e) => {
            tracing::error!("❌ 数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn get_user_roles_and_permissions(db: &PgPool, user_id: &str) -> (Vec<String>, Vec<String>) {
    let user_uuid = uuid::Uuid::parse_str(user_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let roles_result = sqlx::query_as::<_, (String,)>(
        "SELECT r.id::text FROM iam.roles r 
         INNER JOIN iam.user_roles ur ON r.id = ur.role_id 
         WHERE ur.user_id = $1"
    )
    .bind(user_uuid)
    .fetch_all(db)
    .await;

    let permissions_result = sqlx::query_as::<_, (String,)>(
        "SELECT DISTINCT p.id::text FROM iam.permissions p
         INNER JOIN iam.role_permissions rp ON p.id = rp.permission_id
         INNER JOIN iam.user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1"
    )
    .bind(user_uuid)
    .fetch_all(db)
    .await;

    let roles = match roles_result {
        Ok(rows) => rows.into_iter().map(|(r,)| r).collect(),
        Err(_) => Vec::new()
    };

    let permissions = match permissions_result {
        Ok(rows) => rows.into_iter().map(|(p,)| p).collect(),
        Err(_) => Vec::new()
    };
    
    (roles, permissions)
}

async fn build_user_info(
    db: &PgPool,
    user_id: &str,
    username: &str,
    email: &str,
    full_name: Option<String>,
    is_active: bool,
    is_superuser: bool,
    created_at: chrono::DateTime<Utc>,
) -> UserInfo {
    let (roles, permissions) = get_user_roles_and_permissions(db, user_id).await;
    let primary_role = roles.first().cloned().unwrap_or_else(|| "user".to_string());
    
    UserInfo {
        id: user_id.to_string(),
        username: username.to_string(),
        email: email.to_string(),
        full_name,
        role: primary_role,
        roles,
        permissions,
        created_at: created_at.to_rfc3339(),
        is_active,
        is_superuser,
    }
}

fn build_user_for_token(
    user_id: &str,
    username: &str,
    email: &str,
    password_hash: &str,
    full_name: Option<String>,
    role: &str,
    created_at: &str,
    updated_at: &str,
    is_active: bool,
    is_superuser: bool,
) -> User {
    User {
        id: user_id.to_string(),
        username: username.to_string(),
        email: email.to_string(),
        password_hash: password_hash.to_string(),
        full_name,
        role: role.to_string(),
        created_at: created_at.to_string(),
        updated_at: updated_at.to_string(),
        is_active,
        is_superuser,
    }
}

async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Json<ApiResponse<LoginResponse>> {
    if let Err(msg) = validate_username(&req.username) {
        tracing::warn!("❌ 用户名验证失败: {}", msg);
        return Json(ApiResponse::error(400, &msg));
    }
    
    if let Err(msg) = validate_email(&req.email) {
        tracing::warn!("❌ 邮箱验证失败: {}", msg);
        return Json(ApiResponse::error(400, &msg));
    }
    
    if let Err(msg) = state.security_service.validate_password(&req.password) {
        tracing::warn!("❌ 密码验证失败: {}", msg);
        return Json(ApiResponse::error(400, &msg));
    }
    
    let policy = state.security_service.policy();
    let password_hash = bcrypt::hash(&req.password, bcrypt::DEFAULT_COST).unwrap();
    
    let result = sqlx::query(
        r#"
        INSERT INTO iam.users (username, email, password_hash, full_name, is_active, is_superuser, password_changed_at, password_expires_at)
        VALUES ($1, $2, $3, $4, true, false, NOW(), $5)
        ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
        RETURNING id, username, email, full_name, is_active, is_superuser, created_at
        "#
    )
    .bind(&req.username)
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&req.full_name)
    .bind(&(Utc::now() + Duration::days(policy.expire_days as i64)))
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(user)) => {
            let user_id = user.get::<uuid::Uuid, _>("id");
            tracing::info!("🆕 用户注册成功: {}", user.get::<String, _>("username"));
            
            let _ = state.security_service.save_password_history(user_id, &password_hash).await;
            let _ = state.security_service.log_access(
                Some(user_id),
                &user.get::<String, _>("username"),
                "register",
                "user",
                Some(&user_id.to_string()),
                None,
                None,
                true,
                None
            ).await;
            
            let (user_roles, user_permissions) = get_user_roles_and_permissions(&state.db, &user_id.to_string()).await;
            let primary_role = user_roles.first().cloned().unwrap_or_else(|| "user".to_string());
            
            let user_info = UserInfo {
                id: user_id.to_string(),
                username: user.get::<String, _>("username"),
                email: user.get::<String, _>("email"),
                full_name: user.get::<Option<String>, _>("full_name"),
                role: primary_role.clone(),
                roles: user_roles,
                permissions: user_permissions,
                created_at: user.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                is_active: user.get::<bool, _>("is_active"),
                is_superuser: user.get::<bool, _>("is_superuser"),
            };
            
            let new_user = User {
                id: user_info.id.clone(),
                username: user_info.username.clone(),
                email: user_info.email.clone(),
                password_hash,
                full_name: user_info.full_name.clone(),
                role: primary_role,
                created_at: user_info.created_at.clone(),
                updated_at: Utc::now().to_rfc3339(),
                is_active: user_info.is_active,
                is_superuser: user_info.is_superuser,
            };
            
            let access_token = generate_token(&new_user, &state.jwt_secret, 1).unwrap();
            let refresh_token = generate_token(&new_user, &state.jwt_secret, 168).unwrap();
            
            let resp = LoginResponse {
                access_token,
                refresh_token,
                token_type: "Bearer".to_string(),
                expires_in: 3600,
                user: user_info,
                must_change_password: true,
            };
            
            Json(ApiResponse::success(resp, "注册成功！"))
        }
        Ok(None) => {
            Json(ApiResponse::error(409, "用户名或邮箱已存在"))
        }
        Err(e) => {
            tracing::error!("❌ 数据库插入错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn refresh_token(
    State(state): State<AppState>,
    Json(req): Json<RefreshTokenRequest>,
) -> Json<ApiResponse<RefreshTokenResponse>> {
    match verify_token(&req.refresh_token, &state.jwt_secret) {
        Ok(claims) => {
            let result = sqlx::query_as::<_, (uuid::Uuid, String, String, Option<String>, String, bool, bool, chrono::DateTime<Utc>, chrono::DateTime<Utc>)>(
                "SELECT id, username, email, full_name, password_hash, is_active, is_superuser, created_at, updated_at FROM iam.users WHERE id = $1"
            )
            .bind(&claims.sub)
            .fetch_optional(&state.db)
            .await;

            match result {
                Ok(Some(user)) => {
                    if !user.5 {
                        return Json(ApiResponse::error(403, "该账号已被禁用"));
                    }
                    
                    let (user_roles, _) = get_user_roles_and_permissions(&state.db, &user.0.to_string()).await;
                    let primary_role = user_roles.first().cloned().unwrap_or_else(|| "user".to_string());
                    
                    let user_for_token = User {
                        id: user.0.to_string(),
                        username: user.1.clone(),
                        email: user.2.clone(),
                        password_hash: user.4.clone(),
                        full_name: user.3.clone(),
                        role: primary_role,
                        created_at: user.7.to_rfc3339(),
                        updated_at: user.8.to_rfc3339(),
                        is_active: user.5,
                        is_superuser: user.6,
                    };
                    
                    let access_token = generate_token(&user_for_token, &state.jwt_secret, 1).unwrap();
                    
                    let resp = RefreshTokenResponse {
                        access_token,
                        token_type: "Bearer".to_string(),
                        expires_in: 3600,
                    };
                    
                    Json(ApiResponse::success(resp, "Token刷新成功"))
                }
                Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
                Err(e) => {
                    tracing::error!("数据库查询错误: {}", e);
                    Json(ApiResponse::error(500, "服务器内部错误"))
                }
            }
        }
        Err(e) => {
            tracing::warn!("刷新token失败: {}", e);
            Json(ApiResponse::error(401, "Refresh token 已失效"))
        }
    }
}

async fn get_current_user(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<UserInfo>> {
    let user_uuid = uuid::Uuid::parse_str(&claims.sub).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let result = sqlx::query_as::<_, (uuid::Uuid, String, String, Option<String>, bool, bool, chrono::DateTime<Utc>)>(
        "SELECT id, username, email, full_name, is_active, is_superuser, created_at FROM iam.users WHERE id = $1"
    )
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(user)) => {
            let (roles, permissions) = get_user_roles_and_permissions(&state.db, &user.0.to_string()).await;
            let primary_role = roles.first().cloned().unwrap_or_else(|| "user".to_string());
            
            let user_info = UserInfo {
                id: user.0.to_string(),
                username: user.1.clone(),
                email: user.2.clone(),
                full_name: user.3.clone(),
                role: primary_role,
                roles,
                permissions,
                created_at: user.6.to_rfc3339(),
                is_active: user.4,
                is_superuser: user.5,
            };
            
            Json(ApiResponse::success(user_info, "Success"))
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn get_my_permissions(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<UserWithPermissions>> {
    let user_uuid = uuid::Uuid::parse_str(&claims.sub).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let user_result = sqlx::query_as::<_, (uuid::Uuid, String, String, Option<String>, bool, bool, chrono::DateTime<Utc>)>(
        "SELECT id, username, email, full_name, is_active, is_superuser, created_at FROM iam.users WHERE id = $1"
    )
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await;

    match user_result {
        Ok(Some(user)) => {
            let (role_ids, permission_ids) = get_user_roles_and_permissions(&state.db, &user.0.to_string()).await;
            
            let roles_result = sqlx::query_as::<_, (uuid::Uuid, String, Option<String>, chrono::DateTime<Utc>)>(
                "SELECT id, name, description, created_at FROM iam.roles WHERE id = ANY($1)"
            )
            .bind(&role_ids)
            .fetch_all(&state.db)
            .await;
            
            let permissions_result = sqlx::query_as::<_, (uuid::Uuid, String, String, String, Option<String>)>(
                "SELECT id, name, resource, action, description FROM iam.permissions WHERE id = ANY($1)"
            )
            .bind(&permission_ids)
            .fetch_all(&state.db)
            .await;

            let roles: Vec<RoleInfo> = match roles_result {
                Ok(rows) => rows.into_iter().map(|r| RoleInfo {
                    id: r.0.to_string(),
                    name: r.1,
                    description: r.2,
                    created_at: r.3.to_rfc3339(),
                }).collect(),
                Err(_) => Vec::new()
            };

            let permissions: Vec<PermissionInfo> = match permissions_result {
                Ok(rows) => rows.into_iter().map(|p| PermissionInfo {
                    id: p.0.to_string(),
                    name: p.1,
                    resource: p.2,
                    action: p.3,
                    description: p.4,
                }).collect(),
                Err(_) => Vec::new()
            };

            let user_info = UserInfo {
                id: user.0.to_string(),
                username: user.1.clone(),
                email: user.2.clone(),
                full_name: user.3.clone(),
                role: roles.first().map(|r| r.name.clone()).unwrap_or_else(|| "user".to_string()),
                roles: role_ids,
                permissions: permission_ids,
                created_at: user.6.to_rfc3339(),
                is_active: user.4,
                is_superuser: user.5,
            };

            let response = UserWithPermissions {
                user: user_info,
                roles,
                permissions,
            };

            Json(ApiResponse::success(response, "Success"))
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

#[derive(Debug, Deserialize)]
struct CheckPermissionRequest {
    permission: String,
}

#[derive(Debug, Serialize)]
struct CheckPermissionResponse {
    allowed: bool,
    permission: String,
    user_id: String,
    username: String,
}

async fn check_permission(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(req): Json<CheckPermissionRequest>,
) -> Json<ApiResponse<CheckPermissionResponse>> {
    let user_uuid = uuid::Uuid::parse_str(&claims.sub).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let user_result = sqlx::query_as::<_, (String, bool)>(
        "SELECT username, is_superuser FROM iam.users WHERE id = $1"
    )
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await;

    match user_result {
        Ok(Some((username, is_superuser))) => {
            if is_superuser {
                let response = CheckPermissionResponse {
                    allowed: true,
                    permission: req.permission,
                    user_id: claims.sub.clone(),
                    username,
                };
                return Json(ApiResponse::success(response, "Success"));
            }
            
            let (_, permissions) = get_user_roles_and_permissions(&state.db, &claims.sub).await;
            
            let allowed = permissions.contains(&req.permission) || 
                         permissions.contains(&req.permission.replace(":", "_"));

            let response = CheckPermissionResponse {
                allowed,
                permission: req.permission,
                user_id: claims.sub,
                username,
            };

            Json(ApiResponse::success(response, "Success"))
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn update_current_user(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(update_req): Json<UpdateUserRequest>,
) -> Json<ApiResponse<UserInfo>> {
    if let Some(email) = &update_req.email {
        if let Err(msg) = validate_email(email) {
            return Json(ApiResponse::error(400, &msg));
        }
        
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM iam.users WHERE email = $1 AND id != $2)"
        )
        .bind(email)
        .bind(&claims.sub)
        .fetch_one(&state.db)
        .await
        .unwrap_or(false);
        
        if exists {
            return Json(ApiResponse::error(409, "邮箱已被其他用户使用"));
        }
    }
    
    let result = sqlx::query(
        "UPDATE iam.users SET email = COALESCE($1, email), full_name = COALESCE($2, full_name), updated_at = NOW() WHERE id = $3 RETURNING id, username, email, full_name, is_active, is_superuser, created_at"
    )
    .bind(&update_req.email)
    .bind(&update_req.full_name)
    .bind(&claims.sub)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(user)) => {
            let (roles, permissions) = get_user_roles_and_permissions(&state.db, &user.get::<String, _>("id")).await;
            let primary_role = roles.first().cloned().unwrap_or_else(|| "user".to_string());
            
            let user_info = UserInfo {
                id: user.get::<String, _>("id"),
                username: user.get::<String, _>("username"),
                email: user.get::<String, _>("email"),
                full_name: user.get::<Option<String>, _>("full_name"),
                role: primary_role,
                roles,
                permissions,
                created_at: user.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                is_active: user.get::<bool, _>("is_active"),
                is_superuser: user.get::<bool, _>("is_superuser"),
            };
            
            tracing::info!("✏️ 用户信息更新成功: {}", user_info.username);
            
            Json(ApiResponse::success(user_info, "用户信息更新成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库更新错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn change_password(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(change_req): Json<ChangePasswordRequest>,
) -> Json<ApiResponse<()>> {
    let policy = state.security_service.policy();
    let user_uuid = match Uuid::parse_str(&claims.sub) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };

    let result = sqlx::query_scalar::<_, String>(
        "SELECT password_hash FROM iam.users WHERE id = $1"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(password_hash)) => {
            if !bcrypt::verify(&change_req.current_password, &password_hash).unwrap_or(false) {
                let _ = state.security_service.log_access(
                    Some(user_uuid),
                    &claims.username,
                    "change_password_failed",
                    "user",
                    None,
                    None,
                    None,
                    false,
                    Some("当前密码不正确")
                ).await;
                return Json(ApiResponse::error(401, "当前密码不正确"));
            }
            
            if let Err(msg) = state.security_service.validate_password(&change_req.new_password) {
                let _ = state.security_service.log_access(
                    Some(user_uuid),
                    &claims.username,
                    "change_password_failed",
                    "user",
                    None,
                    None,
                    None,
                    false,
                    Some(&msg)
                ).await;
                return Json(ApiResponse::error(400, &msg));
            }
            
            match state.security_service.check_password_history(user_uuid, &change_req.new_password).await {
                Ok(true) => {
                    let msg = format!("密码不能与最近{}个密码重复", policy.max_history_count);
                    let _ = state.security_service.log_access(
                        Some(user_uuid),
                        &claims.username,
                        "change_password_failed",
                        "user",
                        None,
                        None,
                        None,
                        false,
                        Some(&msg)
                    ).await;
                    return Json(ApiResponse::error(400, &msg));
                }
                Err(e) => {
                    tracing::error!("检查密码历史失败: {}", e);
                }
                _ => {}
            }
            
            let new_password_hash = bcrypt::hash(&change_req.new_password, bcrypt::DEFAULT_COST).unwrap();
            
            let update_result = sqlx::query(
                "UPDATE iam.users SET password_hash = $1, password_changed_at = NOW(), password_expires_at = $2, must_change_password = false, updated_at = NOW() WHERE id = $3"
            )
            .bind(&new_password_hash)
            .bind(&(Utc::now() + Duration::days(policy.expire_days as i64)))
            .bind(&claims.sub)
            .execute(&state.db)
            .await;

            match update_result {
                Ok(_) => {
                    let _ = state.security_service.save_password_history(user_uuid, &new_password_hash).await;
                    let _ = state.security_service.log_access(
                        Some(user_uuid),
                        &claims.username,
                        "change_password",
                        "user",
                        None,
                        None,
                        None,
                        true,
                        None
                    ).await;
                    tracing::info!("🔑 用户密码修改成功: {}", claims.username);
                    Json(ApiResponse::ok("密码修改成功"))
                }
                Err(e) => {
                    tracing::error!("数据库更新错误: {}", e);
                    Json(ApiResponse::error(500, "服务器内部错误"))
                }
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn list_users(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<ListUsersResponse>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "仅管理员可访问"));
    }
    
    let users = sqlx::query_as::<_, (uuid::Uuid, String, String, Option<String>, bool, bool, chrono::DateTime<Utc>)>(
        "SELECT id, username, email, full_name, is_active, is_superuser, created_at FROM iam.users ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await;

    match users {
        Ok(users) => {
            let total = users.len();
            let mut user_info_list = Vec::new();
            for user in users {
                let (roles, permissions) = get_user_roles_and_permissions(&state.db, &user.0.to_string()).await;
                let primary_role = roles.first().cloned().unwrap_or_else(|| "user".to_string());
                
                let user_info = UserInfo {
                    id: user.0.to_string(),
                    username: user.1.clone(),
                    email: user.2.clone(),
                    full_name: user.3.clone(),
                    role: primary_role,
                    roles,
                    permissions,
                    created_at: user.6.to_rfc3339(),
                    is_active: user.4,
                    is_superuser: user.5,
                };
                user_info_list.push(user_info);
            }
            Json(ApiResponse::success(ListUsersResponse {
                users: user_info_list,
                total,
            }, "Success"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn get_user(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<UserInfo>> {
    if claims.role != "admin" && claims.sub != user_id {
        return Json(ApiResponse::error(403, "无权限访问该用户"));
    }
    
    let user_uuid = uuid::Uuid::parse_str(&user_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let result = sqlx::query_as::<_, (uuid::Uuid, String, String, Option<String>, bool, bool, chrono::DateTime<Utc>)>(
        "SELECT id, username, email, full_name, is_active, is_superuser, created_at FROM iam.users WHERE id = $1"
    )
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(user)) => {
            let (roles, permissions) = get_user_roles_and_permissions(&state.db, &user.0.to_string()).await;
            let primary_role = roles.first().cloned().unwrap_or_else(|| "user".to_string());
            
            let user_info = UserInfo {
                id: user.0.to_string(),
                username: user.1.clone(),
                email: user.2.clone(),
                full_name: user.3.clone(),
                role: primary_role,
                roles,
                permissions,
                created_at: user.6.to_rfc3339(),
                is_active: user.4,
                is_superuser: user.5,
            };
            
            Json(ApiResponse::success(user_info, "Success"))
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn create_user(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(req): Json<RegisterRequest>,
) -> Json<ApiResponse<UserInfo>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "仅管理员可创建用户"));
    }
    
    if let Err(msg) = validate_username(&req.username) {
        return Json(ApiResponse::error(400, &msg));
    }
    
    if let Err(msg) = validate_email(&req.email) {
        return Json(ApiResponse::error(400, &msg));
    }
    
    if let Err(msg) = state.security_service.validate_password(&req.password) {
        return Json(ApiResponse::error(400, &msg));
    }
    
    let policy = state.security_service.policy();
    let password_hash = bcrypt::hash(&req.password, bcrypt::DEFAULT_COST).unwrap();
    let new_user_id = uuid::Uuid::new_v4();
    
    let result = sqlx::query(
        "INSERT INTO iam.users (id, username, email, password_hash, full_name, is_active, is_superuser, password_changed_at, password_expires_at) 
         VALUES ($1, $2, $3, $4, $5, true, false, NOW(), $6) 
         RETURNING id, username, email, full_name, created_at"
    )
    .bind(new_user_id)
    .bind(&req.username)
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&req.full_name)
    .bind(&(Utc::now() + Duration::days(policy.expire_days as i64)))
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => {
            let user_id = row.get::<uuid::Uuid, _>("id").to_string();
            
            let _ = state.security_service.save_password_history(new_user_id, &password_hash).await;
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "create_user",
                "user",
                Some(&user_id),
                None,
                None,
                true,
                None
            ).await;
            
            let (roles, permissions) = get_user_roles_and_permissions(&state.db, &user_id).await;
            let primary_role = roles.first().cloned().unwrap_or_else(|| "user".to_string());
            
            let user_info = UserInfo {
                id: user_id,
                username: row.get("username"),
                email: row.get("email"),
                full_name: row.get("full_name"),
                role: primary_role,
                roles,
                permissions,
                created_at: row.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                is_active: true,
                is_superuser: false,
            };
            
            Json(ApiResponse::success(user_info, "用户创建成功"))
        }
        Ok(None) => Json(ApiResponse::error(500, "创建用户失败")),
        Err(e) => {
            tracing::error!("数据库插入错误: {}", e);
            if e.to_string().contains("duplicate") || e.to_string().contains("already exists") {
                Json(ApiResponse::error(409, "用户名或邮箱已存在"))
            } else {
                Json(ApiResponse::error(500, "服务器内部错误"))
            }
        }
    }
}

async fn update_user(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(req): Json<UpdateUserRequest>,
) -> Json<ApiResponse<UserInfo>> {
    if claims.role != "admin" && claims.sub != user_id {
        return Json(ApiResponse::error(403, "无权限修改该用户"));
    }
    
    let user_uuid = uuid::Uuid::parse_str(&user_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let result = sqlx::query(
        "UPDATE iam.users 
         SET full_name = COALESCE($1, full_name), 
             email = COALESCE($2, email),
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, username, email, full_name, is_active, is_superuser, created_at"
    )
    .bind(&req.full_name)
    .bind(&req.email)
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => {
            let user_id_clone = user_id.clone();
            let (roles, permissions) = get_user_roles_and_permissions(&state.db, &user_id).await;
            let primary_role = roles.first().cloned().unwrap_or_else(|| "user".to_string());
            
            let user_info = UserInfo {
                id: user_id,
                username: row.get("username"),
                email: row.get("email"),
                full_name: row.get("full_name"),
                role: primary_role,
                roles,
                permissions,
                created_at: row.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                is_active: row.get("is_active"),
                is_superuser: row.get("is_superuser"),
            };
            
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "update_user",
                "user",
                Some(&user_id_clone),
                None,
                None,
                true,
                None
            ).await;
            
            Json(ApiResponse::success(user_info, "用户更新成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库更新错误: {}", e);
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "update_user_failed",
                "user",
                Some(&user_id),
                None,
                None,
                false,
                Some(&e.to_string())
            ).await;
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn delete_user(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "仅管理员可删除用户"));
    }
    
    // 防止删除自己
    if claims.sub == user_id {
        return Json(ApiResponse::error(400, "不能删除自己"));
    }
    
    let user_uuid = uuid::Uuid::parse_str(&user_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let result = sqlx::query("DELETE FROM iam.users WHERE id = $1")
        .bind(user_uuid)
        .execute(&state.db)
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                let _ = state.security_service.log_access(
                    Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                    &claims.username,
                    "delete_user",
                    "user",
                    Some(&user_id),
                    None,
                    None,
                    true,
                    None
                ).await;
                Json(ApiResponse::success(String::new(), "用户删除成功"))
            } else {
                Json(ApiResponse::error(404, "用户不存在"))
            }
        }
        Err(e) => {
            tracing::error!("数据库删除错误: {}", e);
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "delete_user",
                "user",
                Some(&user_id),
                None,
                None,
                false,
                Some(&e.to_string())
            ).await;
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

// 用户角色管理
async fn get_user_roles(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<Vec<RoleInfo>>> {
    if claims.role != "admin" && claims.sub != user_id {
        return Json(ApiResponse::error(403, "无权限访问"));
    }
    
    let user_uuid = uuid::Uuid::parse_str(&user_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let roles = sqlx::query_as::<_, (uuid::Uuid, String, Option<String>, chrono::DateTime<Utc>)>(
        "SELECT r.id, r.name, r.description, r.created_at FROM iam.roles r 
         INNER JOIN iam.user_roles ur ON r.id = ur.role_id 
         WHERE ur.user_id = $1"
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await;

    match roles {
        Ok(roles) => {
            let role_infos: Vec<RoleInfo> = roles
                .into_iter()
                .map(|r| RoleInfo {
                    id: r.0.to_string(),
                    name: r.1,
                    description: r.2,
                    created_at: r.3.to_rfc3339(),
                })
                .collect();
            Json(ApiResponse::success(role_infos, "Success"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn add_user_role(
    State(state): State<AppState>,
    Path((user_id, role_id)): Path<(String, String)>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let user_uuid = uuid::Uuid::parse_str(&user_id).unwrap_or_else(|_| uuid::Uuid::nil());
    let role_uuid = uuid::Uuid::parse_str(&role_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM iam.user_roles WHERE user_id = $1 AND role_id = $2)"
    )
    .bind(user_uuid)
    .bind(role_uuid)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);
    
    if exists {
        return Json(ApiResponse::error(409, "用户已拥有该角色"));
    }
    
    let result = sqlx::query(
        "INSERT INTO iam.user_roles (user_id, role_id) VALUES ($1, $2)"
    )
    .bind(user_uuid)
    .bind(role_uuid)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => {
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "assign_role_to_user",
                "user_role",
                Some(&user_id),
                None,
                None,
                true,
                None
            ).await;
            Json(ApiResponse::success(String::new(), "添加角色成功"))
        }
        Err(e) => {
            tracing::error!("数据库插入错误: {}", e);
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "assign_role_to_user_failed",
                "user_role",
                Some(&user_id),
                None,
                None,
                false,
                Some(&e.to_string())
            ).await;
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn remove_user_role(
    State(state): State<AppState>,
    Path((user_id, role_id)): Path<(String, String)>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let user_uuid = uuid::Uuid::parse_str(&user_id).unwrap_or_else(|_| uuid::Uuid::nil());
    let role_uuid = uuid::Uuid::parse_str(&role_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let result = sqlx::query(
        "DELETE FROM iam.user_roles WHERE user_id = $1 AND role_id = $2"
    )
    .bind(user_uuid)
    .bind(role_uuid)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                let _ = state.security_service.log_access(
                    Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                    &claims.username,
                    "unassign_role_from_user",
                    "user_role",
                    Some(&user_id),
                    None,
                    None,
                    true,
                    None
                ).await;
                Json(ApiResponse::success(String::new(), "移除角色成功"))
            } else {
                Json(ApiResponse::error(404, "角色不存在"))
            }
        }
        Err(e) => {
            tracing::error!("数据库删除错误: {}", e);
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "unassign_role_from_user_failed",
                "user_role",
                Some(&user_id),
                None,
                None,
                false,
                Some(&e.to_string())
            ).await;
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

// 角色管理
async fn list_roles(
    State(state): State<AppState>,
    AuthenticatedUser(_): AuthenticatedUser,
) -> Json<ApiResponse<Vec<RoleInfo>>> {
    let roles = sqlx::query_as::<_, (uuid::Uuid, String, Option<String>, chrono::DateTime<Utc>)>(
        "SELECT id, name, description, created_at FROM iam.roles ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await;

    match roles {
        Ok(roles) => {
            let role_infos: Vec<RoleInfo> = roles
                .into_iter()
                .map(|r| RoleInfo {
                    id: r.0.to_string(),
                    name: r.1,
                    description: r.2,
                    created_at: r.3.to_rfc3339(),
                })
                .collect();
            Json(ApiResponse::success(role_infos, "Success"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn create_role(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(req): Json<CreateRoleRequest>,
) -> Json<ApiResponse<RoleInfo>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let new_role_id = uuid::Uuid::new_v4();
    
    let result = sqlx::query(
        "INSERT INTO iam.roles (id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description, created_at"
    )
    .bind(new_role_id)
    .bind(&req.name)
    .bind(&req.description)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(role)) => {
            let role_id_str = role.get::<uuid::Uuid, _>("id").to_string();
            let role_info = RoleInfo {
                id: role_id_str.clone(),
                name: role.get::<String, _>("name"),
                description: role.get::<Option<String>, _>("description"),
                created_at: role.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
            };
            
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "create_role",
                "role",
                Some(&role_id_str),
                None,
                None,
                true,
                None
            ).await;
            
            Json(ApiResponse::success(role_info, "创建角色成功"))
        }
        Ok(None) => Json(ApiResponse::error(500, "创建角色失败")),
        Err(e) => {
            tracing::error!("数据库插入错误: {}", e);
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "create_role_failed",
                "role",
                None,
                None,
                None,
                false,
                Some(&e.to_string())
            ).await;
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn get_role(
    State(state): State<AppState>,
    Path(role_id): Path<String>,
    AuthenticatedUser(_): AuthenticatedUser,
) -> Json<ApiResponse<RoleInfo>> {
    let role_uuid = uuid::Uuid::parse_str(&role_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let result = sqlx::query_as::<_, (uuid::Uuid, String, Option<String>, chrono::DateTime<Utc>)>(
        "SELECT id, name, description, created_at FROM iam.roles WHERE id = $1"
    )
    .bind(role_uuid)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(role)) => {
            let role_info = RoleInfo {
                id: role.0.to_string(),
                name: role.1,
                description: role.2,
                created_at: role.3.to_rfc3339(),
            };
            Json(ApiResponse::success(role_info, "Success"))
        }
        Ok(None) => Json(ApiResponse::error(404, "角色不存在")),
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn delete_role(
    State(state): State<AppState>,
    Path(role_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let role_uuid = uuid::Uuid::parse_str(&role_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let result = sqlx::query(
        "DELETE FROM iam.roles WHERE id = $1"
    )
    .bind(role_uuid)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                let _ = state.security_service.log_access(
                    Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                    &claims.username,
                    "delete_role",
                    "role",
                    Some(&role_id),
                    None,
                    None,
                    true,
                    None
                ).await;
                Json(ApiResponse::success(String::new(), "删除角色成功"))
            } else {
                Json(ApiResponse::error(404, "角色不存在"))
            }
        }
        Err(e) => {
            tracing::error!("数据库删除错误: {}", e);
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "delete_role_failed",
                "role",
                Some(&role_id),
                None,
                None,
                false,
                Some(&e.to_string())
            ).await;
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

// 角色权限管理
async fn get_role_permissions(
    State(state): State<AppState>,
    Path(role_id): Path<String>,
    AuthenticatedUser(_): AuthenticatedUser,
) -> Json<ApiResponse<Vec<PermissionInfo>>> {
    let role_uuid = uuid::Uuid::parse_str(&role_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let permissions = sqlx::query_as::<_, (uuid::Uuid, String, String, String, Option<String>)>(
        "SELECT p.id, p.name, p.resource, p.action, p.description FROM iam.permissions p 
         INNER JOIN iam.role_permissions rp ON p.id = rp.permission_id 
         WHERE rp.role_id = $1"
    )
    .bind(role_uuid)
    .fetch_all(&state.db)
    .await;

    match permissions {
        Ok(permissions) => {
            let perm_infos: Vec<PermissionInfo> = permissions
                .into_iter()
                .map(|p| PermissionInfo {
                    id: p.0.to_string(),
                    name: p.1,
                    resource: p.2,
                    action: p.3,
                    description: p.4,
                })
                .collect();
            Json(ApiResponse::success(perm_infos, "Success"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn add_role_permission(
    State(state): State<AppState>,
    Path((role_id, permission_id)): Path<(String, String)>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let role_uuid = uuid::Uuid::parse_str(&role_id).unwrap_or_else(|_| uuid::Uuid::nil());
    let permission_uuid = uuid::Uuid::parse_str(&permission_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM iam.role_permissions WHERE role_id = $1 AND permission_id = $2)"
    )
    .bind(role_uuid)
    .bind(permission_uuid)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);
    
    if exists {
        return Json(ApiResponse::error(409, "角色已拥有该权限"));
    }
    
    let result = sqlx::query(
        "INSERT INTO iam.role_permissions (role_id, permission_id) VALUES ($1, $2)"
    )
    .bind(role_uuid)
    .bind(permission_uuid)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => {
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "assign_permission_to_role",
                "role_permission",
                Some(&role_id),
                None,
                None,
                true,
                None
            ).await;
            Json(ApiResponse::success(String::new(), "添加权限成功"))
        }
        Err(e) => {
            tracing::error!("数据库插入错误: {}", e);
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "assign_permission_to_role_failed",
                "role_permission",
                Some(&role_id),
                None,
                None,
                false,
                Some(&e.to_string())
            ).await;
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn remove_role_permission(
    State(state): State<AppState>,
    Path((role_id, permission_id)): Path<(String, String)>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let role_uuid = uuid::Uuid::parse_str(&role_id).unwrap_or_else(|_| uuid::Uuid::nil());
    let permission_uuid = uuid::Uuid::parse_str(&permission_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let result = sqlx::query(
        "DELETE FROM iam.role_permissions WHERE role_id = $1 AND permission_id = $2"
    )
    .bind(role_uuid)
    .bind(permission_uuid)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                let _ = state.security_service.log_access(
                    Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                    &claims.username,
                    "unassign_permission_from_role",
                    "role_permission",
                    Some(&role_id),
                    None,
                    None,
                    true,
                    None
                ).await;
                Json(ApiResponse::success(String::new(), "移除权限成功"))
            } else {
                Json(ApiResponse::error(404, "权限不存在"))
            }
        }
        Err(e) => {
            tracing::error!("数据库删除错误: {}", e);
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "unassign_permission_from_role_failed",
                "role_permission",
                Some(&role_id),
                None,
                None,
                false,
                Some(&e.to_string())
            ).await;
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

// 权限管理
async fn list_permissions(
    State(state): State<AppState>,
    AuthenticatedUser(_): AuthenticatedUser,
) -> Json<ApiResponse<Vec<PermissionInfo>>> {
    let permissions = sqlx::query_as::<_, (uuid::Uuid, String, String, String, Option<String>)>(
        "SELECT id, name, resource, action, description FROM iam.permissions ORDER BY resource, action"
    )
    .fetch_all(&state.db)
    .await;

    match permissions {
        Ok(permissions) => {
            let perm_infos: Vec<PermissionInfo> = permissions
                .into_iter()
                .map(|p| PermissionInfo {
                    id: p.0.to_string(),
                    name: p.1,
                    resource: p.2,
                    action: p.3,
                    description: p.4,
                })
                .collect();
            Json(ApiResponse::success(perm_infos, "Success"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn create_permission(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(req): Json<CreatePermissionRequest>,
) -> Json<ApiResponse<PermissionInfo>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let new_permission_id = uuid::Uuid::new_v4();
    
    let result = sqlx::query(
        "INSERT INTO iam.permissions (id, name, resource, action, description) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, resource, action, description"
    )
    .bind(new_permission_id)
    .bind(&req.name)
    .bind(&req.resource)
    .bind(&req.action)
    .bind(&req.description)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(perm)) => {
            let perm_id_str = perm.get::<uuid::Uuid, _>("id").to_string();
            let perm_info = PermissionInfo {
                id: perm_id_str.clone(),
                name: perm.get::<String, _>("name"),
                resource: perm.get::<String, _>("resource"),
                action: perm.get::<String, _>("action"),
                description: perm.get::<Option<String>, _>("description"),
            };
            
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "create_permission",
                "permission",
                Some(&perm_id_str),
                None,
                None,
                true,
                None
            ).await;
            
            Json(ApiResponse::success(perm_info, "创建权限成功"))
        }
        Ok(None) => Json(ApiResponse::error(500, "创建权限失败")),
        Err(e) => {
            tracing::error!("数据库插入错误: {}", e);
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "create_permission_failed",
                "permission",
                None,
                None,
                None,
                false,
                Some(&e.to_string())
            ).await;
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn delete_permission(
    State(state): State<AppState>,
    Path(permission_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let permission_uuid = uuid::Uuid::parse_str(&permission_id).unwrap_or_else(|_| uuid::Uuid::nil());
    
    let result = sqlx::query(
        "DELETE FROM iam.permissions WHERE id = $1"
    )
    .bind(permission_uuid)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                let _ = state.security_service.log_access(
                    Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                    &claims.username,
                    "delete_permission",
                    "permission",
                    Some(&permission_id),
                    None,
                    None,
                    true,
                    None
                ).await;
                Json(ApiResponse::success(String::new(), "删除权限成功"))
            } else {
                Json(ApiResponse::error(404, "权限不存在"))
            }
        }
        Err(e) => {
            tracing::error!("数据库删除错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

#[derive(Debug, Deserialize)]
struct ListAccessLogsQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    user_id: Option<String>,
    action: Option<String>,
    resource: Option<String>,
    success: Option<bool>,
    start_date: Option<String>,
    end_date: Option<String>,
}

async fn list_access_logs(
    State(state): State<AppState>,
    Query(query): Query<ListAccessLogsQuery>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<ListAccessLogsResponse>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "仅管理员可查看审计日志"));
    }
    
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    
    let logs_query = sqlx::query_as::<_, AccessLog>(
        r#"
        SELECT id, user_id, username, action, resource, resource_id, ip_address, user_agent, success, error_message, created_at
        FROM iam.access_logs
        WHERE ($1::text IS NULL OR user_id::text = $1)
          AND ($2::text IS NULL OR action = $2)
          AND ($3::text IS NULL OR resource = $3)
          AND ($4::boolean IS NULL OR success = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#
    )
    .bind(&query.user_id)
    .bind(&query.action)
    .bind(&query.resource)
    .bind(query.success)
    .bind(page_size)
    .bind((page - 1) * page_size)
    .fetch_all(&state.db)
    .await;

    let count_query = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM iam.access_logs
        WHERE ($1::text IS NULL OR user_id::text = $1)
          AND ($2::text IS NULL OR action = $2)
          AND ($3::text IS NULL OR resource = $3)
          AND ($4::boolean IS NULL OR success = $4)
        "#
    )
    .bind(&query.user_id)
    .bind(&query.action)
    .bind(&query.resource)
    .bind(query.success)
    .fetch_one(&state.db)
    .await;

    match (logs_query, count_query) {
        (Ok(logs), Ok(total)) => {
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "view_access_logs",
                "audit",
                None,
                None,
                None,
                true,
                None
            ).await;
            Json(ApiResponse::success(ListAccessLogsResponse {
                logs,
                total,
                page,
                page_size,
            }, "获取审计日志成功"))
        }
        (Err(e), _) => {
            tracing::error!("查询审计日志失败: {}", e);
            Json(ApiResponse::error(500, "查询审计日志失败"))
        }
        (_, Err(e)) => {
            tracing::error!("统计审计日志失败: {}", e);
            Json(ApiResponse::error(500, "查询审计日志失败"))
        }
    }
}

async fn get_password_policy(
    State(state): State<AppState>,
    AuthenticatedUser(_): AuthenticatedUser,
) -> Json<ApiResponse<models::PasswordPolicy>> {
    Json(ApiResponse::success(state.security_service.policy().clone(), "获取密码策略成功"))
}

async fn unlock_user(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "仅管理员可解锁用户"));
    }
    
    let user_uuid = match uuid::Uuid::parse_str(&user_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };
    
    match state.security_service.unlock_user(user_uuid).await {
        Ok(_) => {
            let _ = state.security_service.log_access(
                Some(uuid::Uuid::parse_str(&claims.sub).unwrap_or(uuid::Uuid::nil())),
                &claims.username,
                "unlock_user",
                "user",
                Some(&user_id),
                None,
                None,
                true,
                None
            ).await;
            Json(ApiResponse::success(String::new(), "用户解锁成功"))
        }
        Err(e) => {
            tracing::error!("解锁用户失败: {}", e);
            Json(ApiResponse::error(500, "解锁用户失败"))
        }
    }
}

async fn admin_reset_user_password(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(req): Json<AdminResetPasswordRequest>,
) -> Json<ApiResponse<()>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "仅管理员可重置用户密码"));
    }
    
    let policy = state.security_service.policy();
    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };
    
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM iam.users WHERE id = $1)"
    )
    .bind(user_uuid)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);
    
    if !exists {
        return Json(ApiResponse::error(404, "用户不存在"));
    }
    
    if let Err(msg) = state.security_service.validate_password(&req.new_password) {
        return Json(ApiResponse::error(400, &msg));
    }
    
    let new_password_hash = bcrypt::hash(&req.new_password, bcrypt::DEFAULT_COST).unwrap();
    
    let update_result = sqlx::query(
        "UPDATE iam.users SET password_hash = $1, password_changed_at = NOW(), password_expires_at = $2, must_change_password = true, updated_at = NOW() WHERE id = $3"
    )
    .bind(&new_password_hash)
    .bind(&(Utc::now() + Duration::days(policy.expire_days as i64)))
    .bind(user_uuid)
    .execute(&state.db)
    .await;

    match update_result {
        Ok(_) => {
            let _ = state.security_service.save_password_history(user_uuid, &new_password_hash).await;
            let _ = state.security_service.log_access(
                Some(Uuid::parse_str(&claims.sub).unwrap_or(Uuid::nil())),
                &claims.username,
                "admin_reset_password",
                "user",
                Some(&user_id),
                None,
                None,
                true,
                None
            ).await;
            tracing::info!("🔑 管理员重置用户密码成功: {}", user_id);
            Json(ApiResponse::ok("密码重置成功，请通知用户首次登录时修改密码"))
        }
        Err(e) => {
            tracing::error!("数据库更新错误: {}", e);
            let _ = state.security_service.log_access(
                Some(Uuid::parse_str(&claims.sub).unwrap_or(Uuid::nil())),
                &claims.username,
                "admin_reset_password_failed",
                "user",
                Some(&user_id),
                None,
                None,
                false,
                Some(&e.to_string())
            ).await;
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn forgot_password(
    State(state): State<AppState>,
    Json(req): Json<ForgotPasswordRequest>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query_as::<_, (uuid::Uuid, String, String, Option<String>)>(
        "SELECT id, username, email, full_name FROM iam.users WHERE email = $1"
    )
    .bind(&req.email)
    .fetch_optional(&state.db)
    .await;
    
    match result {
        Ok(Some(user)) => {
            let token = generate_reset_token();
            let expires_at = Utc::now() + Duration::hours(1);
            
            let insert_result = sqlx::query(
                "INSERT INTO iam.password_reset_tokens (id, user_id, token, expires_at) 
                 VALUES ($1, $2, $3, $4)"
            )
            .bind(Uuid::new_v4())
            .bind(user.0)
            .bind(&token)
            .bind(expires_at)
            .execute(&state.db)
            .await;
            
            match insert_result {
                Ok(_) => {
                    tracing::info!("📧 密码重置令牌已创建: {}", user.2);
                    let _ = state.security_service.log_access(
                        Some(user.0),
                        &user.1,
                        "forgot_password",
                        "auth",
                        None,
                        None,
                        None,
                        true,
                        None
                    ).await;
                    Json(ApiResponse::success(
                        token.clone(),
                        &format!("密码重置令牌已生成，请在1小时内使用。令牌: {}", token)
                    ))
                }
                Err(e) => {
                    tracing::error!("创建密码重置令牌失败: {}", e);
                    Json(ApiResponse::error(500, "服务器内部错误"))
                }
            }
        }
        Ok(None) => {
            tracing::warn!("❌ 忘记密码 - 邮箱不存在: {}", req.email);
            Json(ApiResponse::success(
                String::new(),
                "如果该邮箱已注册，密码重置链接将发送到您的邮箱"
            ))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn reset_password(
    State(state): State<AppState>,
    Json(req): Json<ResetPasswordRequest>,
) -> Json<ApiResponse<()>> {
    let policy = state.security_service.policy();
    
    let token_result = sqlx::query_as::<_, (uuid::Uuid, uuid::Uuid, String, chrono::DateTime<Utc>, bool, Option<chrono::DateTime<Utc>>)>(
        "SELECT id, user_id, token, expires_at, used, used_at FROM iam.password_reset_tokens 
         WHERE token = $1 AND used = false ORDER BY created_at DESC LIMIT 1"
    )
    .bind(&req.token)
    .fetch_optional(&state.db)
    .await;
    
    match token_result {
        Ok(Some(token_row)) => {
            let token_id = token_row.0;
            let user_id = token_row.1;
            let expires_at = token_row.3;
            
            if expires_at < Utc::now() {
                return Json(ApiResponse::error(400, "密码重置令牌已过期"));
            }
            
            if let Err(msg) = state.security_service.validate_password(&req.new_password) {
                return Json(ApiResponse::error(400, &msg));
            }
            
            match state.security_service.check_password_history(user_id, &req.new_password).await {
                Ok(true) => {
                    let msg = format!("密码不能与最近{}个密码重复", policy.max_history_count);
                    return Json(ApiResponse::error(400, &msg));
                }
                _ => {}
            }
            
            let new_password_hash = bcrypt::hash(&req.new_password, bcrypt::DEFAULT_COST).unwrap();
            
            let update_result = sqlx::query(
                "UPDATE iam.users SET password_hash = $1, password_changed_at = NOW(), password_expires_at = $2, must_change_password = false, updated_at = NOW() WHERE id = $3"
            )
            .bind(&new_password_hash)
            .bind(&(Utc::now() + Duration::days(policy.expire_days as i64)))
            .bind(user_id)
            .execute(&state.db)
            .await;
            
            if update_result.is_err() {
                return Json(ApiResponse::error(500, "服务器内部错误"));
            }
            
            let mark_used_result = sqlx::query(
                "UPDATE iam.password_reset_tokens SET used = true, used_at = NOW() WHERE id = $1"
            )
            .bind(token_id)
            .execute(&state.db)
            .await;
            
            if mark_used_result.is_err() {
                return Json(ApiResponse::error(500, "服务器内部错误"));
            }
            
            let _ = state.security_service.save_password_history(user_id, &new_password_hash).await;
            
            let user_result = sqlx::query_as::<_, (String,)>(
                "SELECT username FROM iam.users WHERE id = $1"
            )
            .bind(user_id)
            .fetch_optional(&state.db)
            .await;
            
            let username = user_result.ok().flatten().map(|u| u.0).unwrap_or_default();
            
            let _ = state.security_service.log_access(
                Some(user_id),
                &username,
                "reset_password",
                "auth",
                None,
                None,
                None,
                true,
                None
            ).await;
            
            tracing::info!("🔑 用户通过令牌重置密码成功: {}", user_id);
            Json(ApiResponse::ok("密码重置成功"))
        }
        Ok(None) => {
            tracing::warn!("❌ 无效的密码重置令牌");
            Json(ApiResponse::error(400, "无效的密码重置令牌"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

fn generate_reset_token() -> String {
    use rand::{Rng, thread_rng};
    use rand::distributions::Alphanumeric;
    
    thread_rng()
        .sample_iter(&Alphanumeric)
        .take(64)
        .map(char::from)
        .collect()
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_iam=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-IAM 身份认证服务启动中...");
    dotenv::dotenv().ok();

    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "CHANGE_ME_IN_PRODUCTION".to_string());
    
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());
    
    tracing::info!("📦 正在连接数据库...");
    
    let pool = match PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
    {
        Ok(pool) => {
            tracing::info!("✅ 数据库连接成功");
            pool
        }
        Err(e) => {
            tracing::error!("❌ 数据库连接失败: {}", e);
            return;
        }
    };
    
    tracing::info!("📋 测试账号：admin/admin123 | user/user123 | guest/guest123");
    
    let security_service = Arc::new(SecurityService::new(pool.clone()));
    
    let state = AppState {
        db: pool,
        jwt_secret,
        security_service: security_service.clone(),
        rate_limit_store: Arc::new(RwLock::new(HashMap::new())),
    };

    let cors = CorsLayer::permissive();

    let auth_routes = Router::new()
        .route("/login", post(login))
        .route("/register", post(register))
        .route("/refresh", post(refresh_token))
        .route("/forgot-password", post(forgot_password))
        .route("/reset-password", post(reset_password));
    
    let user_routes = Router::new()
        .route("/me", get(get_current_user))
        .route("/me", put(update_current_user))
        .route("/me/password", post(change_password))
        .route("/me/permissions", get(get_my_permissions))
        .route("/me/permissions/check", post(check_permission))
        .route("/", get(list_users))
        .route("/", post(create_user))
        .route("/:user_id", get(get_user))
        .route("/:user_id", put(update_user))
        .route("/:user_id", delete(delete_user))
        .route("/:user_id/roles", get(get_user_roles))
        .route("/:user_id/roles/:role_id", post(add_user_role))
        .route("/:user_id/roles/:role_id", delete(remove_user_role))
        .route("/:user_id/unlock", post(unlock_user))
        .route("/:user_id/reset-password", post(admin_reset_user_password));
    
    let role_routes = Router::new()
        .route("/", get(list_roles))
        .route("/", post(create_role))
        .route("/:role_id", get(get_role))
        .route("/:role_id", delete(delete_role))
        .route("/:role_id/permissions", get(get_role_permissions))
        .route("/:role_id/permissions/:permission_id", post(add_role_permission))
        .route("/:role_id/permissions/:permission_id", delete(remove_role_permission));
    
    let permission_routes = Router::new()
        .route("/", get(list_permissions))
        .route("/", post(create_permission))
        .route("/:permission_id", delete(delete_permission));
    
    let security_routes = Router::new()
        .route("/access-logs", get(list_access_logs))
        .route("/password-policy", get(get_password_policy));
    
    let protected_routes = Router::new()
        .nest("/users", user_routes)
        .nest("/roles", role_routes)
        .nest("/permissions", permission_routes)
        .nest("/security", security_routes)
        .layer(axum::middleware::from_fn(middleware::auth_middleware));

    async fn rate_limit_middleware(
        State(state): State<AppState>,
        req: Request<Body>,
        next: Next,
    ) -> Response<Body> {
        let client_ip = req.headers()
            .get("X-Forwarded-For")
            .and_then(|h| h.to_str().ok())
            .or_else(|| req.headers()
                .get("X-Real-IP")
                .and_then(|h| h.to_str().ok()))
            .unwrap_or("unknown");

        let now = Utc::now().timestamp();
        let window = 60;
        let max_requests = 10;

        let mut store = state.rate_limit_store.write().await;
        let entry = store.entry(client_ip.to_string()).or_insert(RateLimitEntry {
            count: 0,
            reset_time: now + window,
        });

        if now >= entry.reset_time {
            entry.count = 1;
            entry.reset_time = now + window;
        } else {
            if entry.count >= max_requests {
                let retry_after = entry.reset_time - now;
                tracing::warn!("Rate limit exceeded for IP: {}", client_ip);
                return (
                    axum::http::StatusCode::TOO_MANY_REQUESTS,
                    Json(ApiResponse::<()>::error(429, &format!("请求过于频繁，请{}秒后重试", retry_after)))
                ).into_response();
            }
            entry.count += 1;
        }

        next.run(req).await
    }

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .nest("/api/v1/auth", auth_routes.layer(axum::middleware::from_fn_with_state(state.clone(), rate_limit_middleware)))
        .nest("/api/v1", protected_routes)
        .with_state(state)
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http());

    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8002".to_string())
        .parse()
        .unwrap_or(8002);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS-IAM 服务运行在 http://{}", addr);
    
    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
